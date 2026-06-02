import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { RequestHandler } from 'express';
import express from 'express';
import request from 'supertest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@shared/schema';
import { communicationDrafts } from '@shared/schema';
import { registerCommunicationDraftRoutes } from '../communication-drafts';

// ---------------------------------------------------------------------------
// Server-side tests for the per-author communication draft endpoints. They run
// against a real in-memory Postgres (PGlite) wired to the same Drizzle schema
// the app uses, so the author-scoping `where` clauses in the real handlers are
// exercised end to end. A future change that drops the `authorId` filter would
// fail these tests.
// ---------------------------------------------------------------------------

const USER_A = 'user-a';
const USER_B = 'user-b';

let pg: PGlite;
let db: ReturnType<typeof drizzle>;
let app: express.Express;
// Mutable "logged-in" user that the fake auth middleware injects per request.
let currentUser: { id: string } | null = null;

const asUser = (id: string | null) => { currentUser = id ? { id } : null; };

beforeAll(async () => {
  pg = new PGlite();
  db = drizzle(pg, { schema });

  // Mirror the communication_drafts table from shared/schema.ts. The FK to
  // users is intentionally omitted so the table is self-contained for the test.
  await pg.exec(`
    CREATE TABLE communication_drafts (
      id SERIAL PRIMARY KEY,
      author_id VARCHAR NOT NULL,
      draft_type VARCHAR DEFAULT 'announcement',
      title VARCHAR,
      content TEXT,
      priority VARCHAR DEFAULT 'normal',
      target_audience VARCHAR DEFAULT 'all',
      target_employees TEXT[],
      sms_enabled BOOLEAN DEFAULT true,
      image_urls TEXT[],
      pdf_urls JSONB,
      created_at TIMESTAMP DEFAULT now(),
      updated_at TIMESTAMP DEFAULT now()
    );
  `);

  const isAuthenticated: RequestHandler = (req, res, next) => {
    if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });
    (req as any).user = currentUser;
    next();
  };

  app = express();
  app.use(express.json());
  registerCommunicationDraftRoutes(app, { db, isAuthenticated });
});

afterAll(async () => {
  await pg.close();
});

beforeEach(async () => {
  await db.delete(communicationDrafts);
  currentUser = null;
});

// Helper to insert a draft directly for a given owner.
async function seedDraft(authorId: string, fields: Partial<typeof communicationDrafts.$inferInsert> = {}) {
  const [row] = await db
    .insert(communicationDrafts)
    .values({ authorId, title: 'seed', content: 'seed body', updatedAt: new Date(), ...fields })
    .returning();
  return row;
}

describe('GET /api/communications/drafts', () => {
  it('returns only the logged-in user\'s drafts', async () => {
    await seedDraft(USER_A, { title: 'A1' });
    await seedDraft(USER_A, { title: 'A2' });
    await seedDraft(USER_B, { title: 'B1' });

    asUser(USER_A);
    const res = await request(app).get('/api/communications/drafts');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body.every((d: any) => d.authorId === USER_A)).toBe(true);
    const titles = res.body.map((d: any) => d.title).sort();
    expect(titles).toEqual(['A1', 'A2']);
  });

  it('does not leak another user\'s drafts', async () => {
    await seedDraft(USER_B, { title: 'B only' });

    asUser(USER_A);
    const res = await request(app).get('/api/communications/drafts');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('rejects unauthenticated requests', async () => {
    asUser(null);
    const res = await request(app).get('/api/communications/drafts');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/communications/drafts', () => {
  it('creates a draft owned by the logged-in user', async () => {
    asUser(USER_A);
    const res = await request(app)
      .post('/api/communications/drafts')
      .send({ title: 'New', content: 'Body' });

    expect(res.status).toBe(200);
    expect(res.body.authorId).toBe(USER_A);

    const rows = await db.select().from(communicationDrafts);
    expect(rows).toHaveLength(1);
    expect(rows[0].authorId).toBe(USER_A);
  });

  it('ignores any authorId supplied in the body', async () => {
    asUser(USER_A);
    const res = await request(app)
      .post('/api/communications/drafts')
      .send({ title: 'Spoof', content: 'Body', authorId: USER_B });

    expect(res.status).toBe(200);
    expect(res.body.authorId).toBe(USER_A);
  });
});

describe('PATCH /api/communications/drafts/:id', () => {
  it('lets the owner update their own draft', async () => {
    const draft = await seedDraft(USER_A, { content: 'original' });

    asUser(USER_A);
    const res = await request(app)
      .patch(`/api/communications/drafts/${draft.id}`)
      .send({ content: 'updated' });

    expect(res.status).toBe(200);
    expect(res.body.content).toBe('updated');

    const [row] = await db.select().from(communicationDrafts).where(eq(communicationDrafts.id, draft.id));
    expect(row.content).toBe('updated');
  });

  it('returns 404 and does not modify a draft owned by someone else', async () => {
    const draft = await seedDraft(USER_B, { content: 'b original' });

    asUser(USER_A);
    const res = await request(app)
      .patch(`/api/communications/drafts/${draft.id}`)
      .send({ content: 'hacked' });

    expect(res.status).toBe(404);

    const [row] = await db.select().from(communicationDrafts).where(eq(communicationDrafts.id, draft.id));
    expect(row.content).toBe('b original');
  });

  it('returns 400 for an invalid id', async () => {
    asUser(USER_A);
    const res = await request(app)
      .patch('/api/communications/drafts/not-a-number')
      .send({ content: 'x' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/communications/drafts/:id', () => {
  it('lets the owner delete their own draft', async () => {
    const draft = await seedDraft(USER_A);

    asUser(USER_A);
    const res = await request(app).delete(`/api/communications/drafts/${draft.id}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const rows = await db.select().from(communicationDrafts).where(eq(communicationDrafts.id, draft.id));
    expect(rows).toHaveLength(0);
  });

  it('returns 404 and does not delete a draft owned by someone else', async () => {
    const draft = await seedDraft(USER_B);

    asUser(USER_A);
    const res = await request(app).delete(`/api/communications/drafts/${draft.id}`);

    expect(res.status).toBe(404);

    const rows = await db.select().from(communicationDrafts).where(eq(communicationDrafts.id, draft.id));
    expect(rows).toHaveLength(1);
  });

  it('returns 400 for an invalid id', async () => {
    asUser(USER_A);
    const res = await request(app).delete('/api/communications/drafts/not-a-number');
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Autosave race behavior (server side of the compose-session model documented
// in .agents/memory/communications-draft-autosave.md). The race *logic* lives
// in the client controller, but it leans on two server guarantees:
//   1. once a draft id exists, every save PATCHes that id, so rapid successive
//      saves coalesce into ONE row (no duplicates/orphans) with the latest
//      content; and
//   2. a save that targets a draft which was already published/discarded can
//      neither resurrect that row nor touch a newer draft — i.e. a stale save
//      can't clobber a newer edit.
// These tests pin those guarantees so a future change (e.g. an upsert-style
// PATCH that recreates missing rows, or a create-on-every-save handler) fails
// loudly instead of silently losing or duplicating users' in-progress work.
// ---------------------------------------------------------------------------
describe('autosave race guarantees', () => {
  it('coalesces rapid successive saves in one session into a single row with the latest content', async () => {
    asUser(USER_A);

    // The controller POSTs exactly once to mint a draft id...
    const created = await request(app)
      .post('/api/communications/drafts')
      .send({ title: 'Memo', content: 'v1' });
    expect(created.status).toBe(200);
    const draftId = created.body.id;

    // ...then every subsequent autosave PATCHes that same id.
    for (const content of ['v2', 'v3', 'v4', 'final']) {
      const res = await request(app)
        .patch(`/api/communications/drafts/${draftId}`)
        .send({ content });
      expect(res.status).toBe(200);
    }

    // No duplicate/orphan rows were spawned, and the latest content won.
    const rows = await db.select().from(communicationDrafts);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(draftId);
    expect(rows[0].content).toBe('final');
  });

  it('deleting an orphaned draft removes only that row and leaves the active draft intact', async () => {
    asUser(USER_A);

    // A discarded compose session leaves an orphan draft behind...
    const orphan = await seedDraft(USER_A, { content: 'orphaned session' });
    // ...while the user keeps editing in a fresh session (a different row).
    const active = await seedDraft(USER_A, { content: 'active newer edit' });

    // The controller cleans up the orphan by its own id.
    const del = await request(app).delete(`/api/communications/drafts/${orphan.id}`);
    expect(del.status).toBe(200);

    const rows = await db.select().from(communicationDrafts);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(active.id);
    expect(rows[0].content).toBe('active newer edit');
  });

  it('a stale save after publish cannot resurrect the deleted draft or clobber a newer edit', async () => {
    asUser(USER_A);

    // Session 1: create a draft, then publish (which deletes it).
    const first = await request(app)
      .post('/api/communications/drafts')
      .send({ content: 'session 1 body' });
    const firstId = first.body.id;
    const published = await request(app).delete(`/api/communications/drafts/${firstId}`);
    expect(published.status).toBe(200);

    // Session 2: the user reopens compose and starts a NEW draft.
    const second = await request(app)
      .post('/api/communications/drafts')
      .send({ content: 'session 2 newer edit' });
    const secondId = second.body.id;
    expect(secondId).not.toBe(firstId);

    // A late autosave from session 1 (POST already resolved) lands now. It must
    // 404 against the deleted id rather than recreating a zombie row.
    const stale = await request(app)
      .patch(`/api/communications/drafts/${firstId}`)
      .send({ content: 'stale session 1 content' });
    expect(stale.status).toBe(404);

    // Only the newer draft survives, untouched by the stale save.
    const rows = await db.select().from(communicationDrafts);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(secondId);
    expect(rows[0].content).toBe('session 2 newer edit');
  });

  it('a stale save cannot recreate a draft once every session has been discarded', async () => {
    asUser(USER_A);

    const created = await request(app)
      .post('/api/communications/drafts')
      .send({ content: 'will be discarded' });
    const draftId = created.body.id;

    // Discard/publish removes the row entirely.
    await request(app).delete(`/api/communications/drafts/${draftId}`);

    // A trailing autosave must not bring it back.
    const stale = await request(app)
      .patch(`/api/communications/drafts/${draftId}`)
      .send({ content: 'ghost write' });
    expect(stale.status).toBe(404);

    const rows = await db.select().from(communicationDrafts);
    expect(rows).toHaveLength(0);
  });
});
