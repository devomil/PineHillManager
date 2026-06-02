// Draft autosave race model for the Communications composer.
//
// Correctness under fast user actions (close, reopen, publish while a POST is in
// flight) is keyed to a **compose session token** (`composeSession`), NOT to
// boolean flags. Each save captures the session at start; when its persist
// resolves with a created id, the decision is:
//   - session still current        -> bind id (active compose).
//   - session in discardedSessions  -> DELETE the created row (orphan cleanup).
//   - else activeDraftId is null    -> ADOPT the id (a non-destructive close+reopen
//                                      carried content forward; prevents a duplicate).
//   - else                          -> keep it as its own separate draft.
//
// This module is intentionally framework-agnostic so it can be unit-tested
// without rendering React. See client/src/lib/__tests__/draft-autosave.test.ts.

export interface DraftAutosaveDeps<P> {
  // Build the current draft payload from the live form state.
  getPayload: () => P;
  // Whether the payload has any content worth persisting.
  hasContent: (payload: P) => boolean;
  // Persist the payload: PATCH when draftId is provided, otherwise POST.
  // Returns whether it succeeded and the resulting draft id.
  persist: (payload: P, draftId: number | null) => Promise<{ ok: boolean; id: number | null }>;
  // Delete a draft row (fire-and-forget orphan/discard cleanup).
  removeDraft: (id: number) => void;
  // Notify the host (e.g. React state) that the active draft id changed.
  onActiveDraftIdChange?: (id: number | null) => void;
}

export class DraftAutosaveController<P> {
  deps: DraftAutosaveDeps<P>;

  private composeSession = 0;
  // Compose sessions that were published/discarded. A save that resolves for one
  // of these (no matter how late) must delete the draft it created.
  private discardedSessions = new Set<number>();
  private inFlightSave: Promise<boolean> | null = null;
  private isSaving = false;
  private dirty = false;
  private activeDraftId: number | null = null;

  constructor(deps: DraftAutosaveDeps<P>) {
    this.deps = deps;
  }

  getActiveDraftId(): number | null {
    return this.activeDraftId;
  }

  getComposeSession(): number {
    return this.composeSession;
  }

  private setActiveDraftId(id: number | null) {
    this.activeDraftId = id;
    this.deps.onActiveDraftIdChange?.(id);
  }

  // Performs a single persist with last-write-wins semantics. If a save is already
  // in flight, mark the draft dirty so we re-save after it settles instead of
  // silently dropping the newest edits.
  async saveNow(): Promise<boolean> {
    const session = this.composeSession;
    // Never save for a compose that was already published/discarded.
    if (this.discardedSessions.has(session)) return false;
    const payload = this.deps.getPayload();
    if (!this.deps.hasContent(payload)) return false;
    if (this.isSaving) {
      this.dirty = true;
      return false;
    }
    this.isSaving = true;
    this.dirty = false;
    const { ok, id } = await this.deps.persist(payload, this.activeDraftId);
    if (ok && id) {
      if (this.composeSession === session) {
        // This compose is still active: bind the freshly-created id.
        this.setActiveDraftId(id);
      } else if (this.discardedSessions.has(session)) {
        // The compose was published/discarded while this save was in flight (it
        // resolved after the session was superseded). Delete the orphan draft.
        this.deps.removeDraft(id);
      } else if (this.activeDraftId === null) {
        // A non-destructive close+reopen superseded the session and carried this
        // content forward without yet creating or opening its own draft. Adopt the
        // created id so the reopened compose keeps editing this same row via PATCH
        // instead of creating a duplicate draft. (openDraft sets a non-null id, so
        // this never clobbers an explicitly-opened draft.)
        this.setActiveDraftId(id);
      }
      // else: a different draft is now active — keep this one as its own draft.
    }
    this.isSaving = false;
    if (this.dirty && this.composeSession === session) {
      return this.saveNow();
    }
    return ok;
  }

  // Wrapper that tracks the in-flight save promise so the close flow can await it
  // deterministically (no polling). If a save is already running, mark the draft
  // dirty so that save re-runs with the latest content, and return the same
  // in-flight promise — which resolves only after the dirty-chained re-save —
  // instead of starting a competing one.
  triggerSave(): Promise<boolean> {
    if (this.isSaving) {
      this.dirty = true;
      return this.inFlightSave ?? Promise.resolve(false);
    }
    const p = this.saveNow();
    this.inFlightSave = p;
    p.catch(() => {}).then(() => {
      if (this.inFlightSave === p) this.inFlightSave = null;
    });
    return p;
  }

  // Fresh compose: start a new session so any stray in-flight save from a previous
  // compose can't bind to this one.
  beginCompose(): void {
    this.composeSession += 1;
    this.dirty = false;
  }

  // Publish/discard: mark the current compose session as discarded and bump to a
  // new one. Any autosave POST for this session — in flight now or resolving
  // arbitrarily later — will see its session in discardedSessions and delete the
  // draft it created (saveNow), so no orphan can survive a publish.
  discardActive(): void {
    const session = this.composeSession;
    this.discardedSessions.add(session);
    this.dirty = false;
    this.composeSession += 1;
    const id = this.activeDraftId;
    this.setActiveDraftId(null);
    if (id) this.deps.removeDraft(id);
  }

  // Open an existing draft. New compose session so previous in-flight saves can't
  // bind to this draft; activeDraftId is non-null so the ADOPT branch in saveNow
  // never clobbers an explicitly-opened draft.
  openDraft(id: number): void {
    this.composeSession += 1;
    this.dirty = false;
    this.setActiveDraftId(id);
  }

  // Reset the active draft binding without discarding (used when the form is reset
  // after a clean close). Does not touch the compose session.
  resetActive(): void {
    this.dirty = false;
    this.setActiveDraftId(null);
  }

  // Non-destructive close: keep in-progress work as a draft instead of losing it.
  // Deterministically await the final save (in the same compose session so a new
  // draft is never duplicated) before resetting — but only if this compose wasn't
  // superseded by a quick reopen.
  async closeCompose(opts: {
    onSaved?: (ok: boolean) => void;
    onFinalize?: () => void;
  } = {}): Promise<void> {
    const mySession = this.composeSession;
    const payload = this.deps.getPayload();
    const hadContent = this.deps.hasContent(payload);
    if (hadContent) {
      // Deterministic, no polling: triggerSave() either starts a save or, if one
      // is already in flight, marks the draft dirty and returns that promise.
      // Awaiting it resolves only after the dirty-chained final re-save settles,
      // so the latest content is always persisted before we tear down.
      const ok = await this.triggerSave();
      // If the dialog was reopened (new session) while we awaited, leave the new
      // compose alone — don't toast or reset over it.
      if (this.composeSession !== mySession) return;
      opts.onSaved?.(ok);
    }
    if (this.composeSession !== mySession) return;
    // Invalidate the session so any stray late responses can't rebind, then reset.
    this.composeSession += 1;
    opts.onFinalize?.();
  }
}
