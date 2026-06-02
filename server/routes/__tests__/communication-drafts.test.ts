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
