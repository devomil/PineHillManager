import type { Express, RequestHandler } from "express";
import { and, desc, eq } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { communicationDrafts } from "@shared/schema";

type Deps = {
  db: PgDatabase<any, any, any>;
  isAuthenticated: RequestHandler;
};

// Registers the per-author communication draft (autosave) endpoints. Every
// read/update/delete is scoped to the logged-in author so one user can never
// see or mutate another user's drafts.
export function registerCommunicationDraftRoutes(app: Express, deps: Deps) {
  const { db, isAuthenticated } = deps;

  // List current user's drafts (most recently updated first)
  app.get('/api/communications/drafts', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const drafts = await db
        .select()
        .from(communicationDrafts)
        .where(eq(communicationDrafts.authorId, userId))
        .orderBy(desc(communicationDrafts.updatedAt));
      res.setHeader('Cache-Control', 'no-store');
      res.json(drafts);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      res.status(500).json({ error: 'Failed to fetch drafts' });
    }
  });

  // Create a new draft
  app.post('/api/communications/drafts', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { draftType, title, content, priority, targetAudience, targetEmployees, smsEnabled, imageUrls, pdfUrls } = req.body;
      const [draft] = await db
        .insert(communicationDrafts)
        .values({
          authorId: userId,
          draftType: draftType || 'announcement',
          title: title ?? '',
          content: content ?? '',
          priority: priority || 'normal',
          targetAudience: targetAudience || 'all',
          targetEmployees: Array.isArray(targetEmployees) ? targetEmployees : [],
          smsEnabled: smsEnabled === undefined ? true : !!smsEnabled,
          imageUrls: Array.isArray(imageUrls) ? imageUrls : [],
          pdfUrls: Array.isArray(pdfUrls) ? pdfUrls : [],
          updatedAt: new Date(),
        })
        .returning();
      res.json(draft);
    } catch (error) {
      console.error('Error creating draft:', error);
      res.status(500).json({ error: 'Failed to create draft' });
    }
  });

  // Update an existing draft (autosave). Only the owner may update.
  app.patch('/api/communications/drafts/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const draftId = parseInt(req.params.id);
      if (isNaN(draftId)) return res.status(400).json({ error: 'Invalid draft ID' });

      const { draftType, title, content, priority, targetAudience, targetEmployees, smsEnabled, imageUrls, pdfUrls } = req.body;
      const updates: any = { updatedAt: new Date() };
      if (draftType !== undefined) updates.draftType = draftType;
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (priority !== undefined) updates.priority = priority;
      if (targetAudience !== undefined) updates.targetAudience = targetAudience;
      if (targetEmployees !== undefined) updates.targetEmployees = Array.isArray(targetEmployees) ? targetEmployees : [];
      if (smsEnabled !== undefined) updates.smsEnabled = !!smsEnabled;
      if (imageUrls !== undefined) updates.imageUrls = Array.isArray(imageUrls) ? imageUrls : [];
      if (pdfUrls !== undefined) updates.pdfUrls = Array.isArray(pdfUrls) ? pdfUrls : [];

      const [updated] = await db
        .update(communicationDrafts)
        .set(updates)
        .where(and(eq(communicationDrafts.id, draftId), eq(communicationDrafts.authorId, userId)))
        .returning();
      if (!updated) return res.status(404).json({ error: 'Draft not found' });
      res.json(updated);
    } catch (error) {
      console.error('Error updating draft:', error);
      res.status(500).json({ error: 'Failed to update draft' });
    }
  });

  // Delete a draft (e.g. after publishing or discarding). Only the owner may delete.
  app.delete('/api/communications/drafts/:id', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const draftId = parseInt(req.params.id);
      if (isNaN(draftId)) return res.status(400).json({ error: 'Invalid draft ID' });

      const [deleted] = await db
        .delete(communicationDrafts)
        .where(and(eq(communicationDrafts.id, draftId), eq(communicationDrafts.authorId, userId)))
        .returning();
      if (!deleted) return res.status(404).json({ error: 'Draft not found' });
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting draft:', error);
      res.status(500).json({ error: 'Failed to delete draft' });
    }
  });
}
