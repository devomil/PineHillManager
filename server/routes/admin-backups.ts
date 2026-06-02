import type { Express, RequestHandler } from "express";

type Deps = {
  isAuthenticated: RequestHandler;
};

// Strictly admin-only guard (`role === 'admin'`). The project-wide
// `requireAdmin` also permits managers; backups can expose full production
// data so we keep this restricted to true admins.
const requireStrictAdmin: RequestHandler = (req: any, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin role required' });
  }
  next();
};

// Registers the admin backup endpoints: list recent runs, trigger an ad-hoc
// run, and download a completed snapshot. The backup service is imported
// lazily so the (heavy) pg_dump/object-storage dependencies only load when an
// admin actually hits one of these routes.
export async function registerAdminBackupRoutes(app: Express, deps: Deps) {
  const { isAuthenticated } = deps;
  const { runBackup, listBackups, streamBackupToResponse, isBackupRunning } = await import('../services/backup-service');

  app.get('/api/admin/backups', isAuthenticated, requireStrictAdmin, async (_req, res) => {
    try {
      const rows = await listBackups(60);
      res.json(rows);
    } catch (err) {
      console.error('[Backups] List failed:', err);
      res.status(500).json({ message: err instanceof Error ? err.message : 'Failed to list backups' });
    }
  });

  app.post('/api/admin/backups/run', isAuthenticated, requireStrictAdmin, async (req, res) => {
    if (isBackupRunning()) {
      return res.status(409).json({ message: 'A backup is already running' });
    }
    const userId = (req as Express.Request & { user?: { id?: string } }).user?.id;
    res.json({ started: true });
    runBackup('manual', userId).catch((err) => {
      console.error('[Backups] Manual run failed:', err);
    });
  });

  app.get('/api/admin/backups/:id/download', isAuthenticated, requireStrictAdmin, async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid backup id' });
    try {
      await streamBackupToResponse(id, res);
    } catch (err) {
      console.error('[Backups] Download failed:', err);
      if (!res.headersSent) {
        res.status(500).json({ message: err instanceof Error ? err.message : 'Download failed' });
      }
    }
  });
}
