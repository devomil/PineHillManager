import { describe, it, expect, beforeEach } from 'vitest';
import { DraftAutosaveController, type DraftAutosaveDeps } from '../draft-autosave';

// ---------------------------------------------------------------------------
// Faithful in-memory model of the server's /api/communications/drafts CRUD
// (server/routes.ts). POST inserts a row with an auto-increment id; PATCH
// updates an existing row by id; DELETE removes a row. Persist resolution is
// controllable so we can reproduce the close/reopen/publish races exactly:
// the row is created the moment the server "receives" the request (synchronous,
// mirroring the insert), but the client only learns the id when we flush the
// pending response.
// ---------------------------------------------------------------------------

type Payload = {
  title: string;
  content: string;
  imageUrls: string[];
  pdfUrls: string[];
};

type Row = Payload & { id: number };

class FakeBackend {
  rows = new Map<number, Row>();
  private nextId = 1;
  private pending: Array<() => void> = [];

  persist = (payload: Payload, draftId: number | null): Promise<{ ok: boolean; id: number | null }> => {
    let id: number;
    if (draftId) {
      // PATCH: update the existing row in place.
      const existing = this.rows.get(draftId);
      this.rows.set(draftId, { ...(existing ?? ({} as Row)), ...payload, id: draftId });
      id = draftId;
    } else {
      // POST: server inserts the row immediately and returns the new id.
      id = this.nextId++;
      this.rows.set(id, { ...payload, id });
    }
    return new Promise((resolve) => {
      this.pending.push(() => resolve({ ok: true, id }));
    });
  };

  removeDraft = (id: number): void => {
    // DELETE is fire-and-forget on the client; model it as eventually consistent
    // by removing the row synchronously when the controller asks.
    this.rows.delete(id);
  };

  get pendingCount(): number {
    return this.pending.length;
  }

  flushOldest(): void {
    const r = this.pending.shift();
    if (r) r();
  }

  get count(): number {
    return this.rows.size;
  }

  rowsByContent(content: string): Row[] {
    return [...this.rows.values()].filter((r) => r.content === content);
  }
}

// Drain all pending persist responses (including recursive dirty re-saves that
// enqueue new ones) until the tracked promise settles. No timers/polling in the
// controller — this just lets queued microtasks run between flushes.
async function drain(backend: FakeBackend, promise?: Promise<unknown>): Promise<void> {
  let done = promise === undefined;
  if (promise) promise.then(() => { done = true; }, () => { done = true; });
  for (let i = 0; i < 100; i++) {
    if (backend.pendingCount > 0) backend.flushOldest();
    // Two ticks per iteration so an awaited continuation that schedules another
    // persist has a chance to enqueue before the next flush.
    await Promise.resolve();
    await Promise.resolve();
    if (done && backend.pendingCount === 0) break;
  }
  if (promise) await promise;
}

describe('DraftAutosaveController draft autosave races', () => {
  let backend: FakeBackend;
  let form: Payload;
  let activeId: number | null;
  let controller: DraftAutosaveController<Payload>;

  const emptyPayload = (): Payload => ({ title: '', content: '', imageUrls: [], pdfUrls: [] });

  beforeEach(() => {
    backend = new FakeBackend();
    form = emptyPayload();
    activeId = null;
    const deps: DraftAutosaveDeps<Payload> = {
      getPayload: () => ({ ...form }),
      hasContent: (p) => !!(p.title?.trim() || p.content?.trim() || p.imageUrls.length || p.pdfUrls.length),
      persist: (payload, id) => backend.persist(payload, id),
      removeDraft: (id) => backend.removeDraft(id),
      onActiveDraftIdChange: (id) => { activeId = id; },
    };
    controller = new DraftAutosaveController<Payload>(deps);
  });

  // (a) publish/discard while a CREATE is in flight (resolving arbitrarily late)
  //     must leave no orphan draft row.
  it('publishing while a CREATE is in flight leaves no orphan draft (late resolution)', async () => {
    controller.beginCompose();
    form = { ...form, title: 'Spring hours', content: 'We open at 8am' };

    // Autosave fires a CREATE; the row is inserted server-side but the response
    // has not yet reached the client (id not bound).
    const save = controller.triggerSave();
    expect(backend.count).toBe(1);
    expect(controller.getActiveDraftId()).toBeNull();

    // User hits Publish -> discard the active compose while the POST is in flight.
    controller.discardActive();

    // The POST response arrives arbitrarily late.
    await drain(backend, save);

    expect(backend.count).toBe(0); // orphan was cleaned up
    expect(controller.getActiveDraftId()).toBeNull();
  });

  // (b) close + immediate reopen during an in-flight CREATE must produce exactly
  //     one draft row (no duplicate).
  it('close + immediate reopen during an in-flight CREATE yields exactly one draft', async () => {
    controller.beginCompose();
    form = { ...form, title: 'Team update', content: 'Meeting Friday' };

    // First autosave CREATE in flight.
    const firstSave = controller.triggerSave();
    expect(backend.count).toBe(1);
    expect(controller.getActiveDraftId()).toBeNull();

    // User closes the dialog while the CREATE is still in flight.
    const closing = controller.closeCompose({ onFinalize: () => controller.resetActive() });

    // ...and immediately reopens a fresh compose, carrying the same content forward.
    controller.beginCompose();

    // The original CREATE resolves now.
    await drain(backend, Promise.all([firstSave, closing]));

    // The reopened compose adopted the created row instead of creating a second one.
    expect(backend.count).toBe(1);
    expect(controller.getActiveDraftId()).toBe(1);

    // Editing + saving again in the reopened compose PATCHes the same row.
    form = { ...form, content: 'Meeting moved to Monday' };
    await drain(backend, controller.triggerSave());

    expect(backend.count).toBe(1);
    expect(backend.rows.get(1)?.content).toBe('Meeting moved to Monday');
  });

  // (c) opening an existing draft while a stale CREATE is in flight must not
  //     overwrite the opened draft.
  it('opening an existing draft while a stale CREATE is in flight does not overwrite it', async () => {
    // An existing draft already lives on the server (a high id that won't collide
    // with the auto-increment ids the CREATE path hands out).
    backend.rows.set(100, { id: 100, title: 'Existing', content: 'Existing body', imageUrls: [], pdfUrls: [] });

    controller.beginCompose();
    form = { ...form, title: 'Brand new', content: 'New body' };

    // A CREATE for the brand-new compose goes in flight.
    const staleSave = controller.triggerSave();
    expect(controller.getActiveDraftId()).toBeNull();

    // User opens the existing draft #100 while that CREATE is still in flight.
    controller.openDraft(100);
    expect(controller.getActiveDraftId()).toBe(100);

    // The stale CREATE resolves late.
    await drain(backend, staleSave);

    // The opened draft binding is untouched (NOT clobbered by the created id).
    expect(controller.getActiveDraftId()).toBe(100);
    // The opened draft's content is unchanged.
    expect(backend.rows.get(100)?.content).toBe('Existing body');
    // The stale CREATE survives as its own separate draft row (not deleted, not merged).
    expect(backend.count).toBe(2);
    expect(backend.rowsByContent('New body')).toHaveLength(1);
  });

  // (d) closing always persists the latest typed content, even when an earlier
  //     save (with stale content) was already in flight.
  it('closing persists the latest typed content after an in-flight save', async () => {
    controller.beginCompose();

    // User types, autosave CREATE goes out with the early content.
    form = { ...form, title: 'Note', content: 'first draft' };
    const inFlight = controller.triggerSave();
    expect(backend.count).toBe(1);

    // User keeps typing while the save is in flight.
    form = { ...form, content: 'final wording' };

    // User closes the dialog: close must persist the LATEST content.
    const closing = controller.closeCompose({ onFinalize: () => controller.resetActive() });

    await drain(backend, Promise.all([inFlight, closing]));

    expect(backend.count).toBe(1);
    expect(backend.rows.get(1)?.content).toBe('final wording');
    expect(controller.getActiveDraftId()).toBeNull(); // clean close reset the binding
  });

  // Extra guard: a plain close with content (no prior in-flight save) persists once.
  it('a clean close with content saves exactly one draft and resets', async () => {
    controller.beginCompose();
    form = { ...form, title: 'Quick note', content: 'body' };

    const closing = controller.closeCompose({ onFinalize: () => controller.resetActive() });
    await drain(backend, closing);

    expect(backend.count).toBe(1);
    expect(backend.rows.get(1)?.content).toBe('body');
    expect(controller.getActiveDraftId()).toBeNull();
  });

  // Extra guard: closing an empty compose saves nothing.
  it('closing an empty compose persists no draft', async () => {
    controller.beginCompose();
    const closing = controller.closeCompose({ onFinalize: () => controller.resetActive() });
    await drain(backend, closing);
    expect(backend.count).toBe(0);
  });
});
