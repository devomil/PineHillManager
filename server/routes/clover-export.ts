import type { Express, RequestHandler } from "express";
import { startExportJob, getExportJob } from "../services/clover-customer-export-service";

type Deps = {
  isAuthenticated: RequestHandler;
};

// Strictly admin-only guard. The project-wide `requireAdmin` actually permits
// managers; this export contains all customer PII so we enforce a stricter
// `role === 'admin'` check.
const requireStrictAdmin: RequestHandler = (req: any, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin role required' });
  }
  next();
};

// Registers the one-time Clover → Square customer + loyalty export endpoints.
// These power the admin-only `/admin/clover-square-export` migration tool.
export function registerCloverExportRoutes(app: Express, deps: Deps) {
  const { isAuthenticated } = deps;

  app.post('/api/admin/clover-export/start', isAuthenticated, requireStrictAdmin, async (_req, res) => {
    try {
      const job = startExportJob();
      res.json({ jobId: job.id });
    } catch (err) {
      console.error('[CloverExport] Failed to start job:', err);
      res.status(500).json({ message: err instanceof Error ? err.message : 'Failed to start export' });
    }
  });

  app.get('/api/admin/clover-export/status/:jobId', isAuthenticated, requireStrictAdmin, (req, res) => {
    const job = getExportJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Export job not found' });
    res.json({
      id: job.id,
      status: job.status,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      error: job.error,
      merchants: job.merchants,
      totalCustomers: job.totalCustomers,
      totalWithLoyalty: job.totalWithLoyalty,
      loyaltyEndpointAvailable: job.loyaltyEndpointAvailable,
      loyaltyWarning: job.loyaltyWarning,
      hasCustomersCsv: !!job.customersCsv,
      hasLoyaltyCsv: !!job.loyaltyCsv,
    });
  });

  app.get('/api/admin/clover-export/download/:jobId/:type', isAuthenticated, requireStrictAdmin, (req, res) => {
    const job = getExportJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Export job not found' });
    if (job.status !== 'completed') {
      return res.status(409).json({ message: `Export is not yet complete (status: ${job.status})` });
    }
    const type = req.params.type;
    let csv: string | undefined;
    let filename = '';
    if (type === 'customers') {
      csv = job.customersCsv;
      filename = `clover-customers-${job.id.slice(0, 8)}.csv`;
    } else if (type === 'loyalty') {
      csv = job.loyaltyCsv;
      filename = `clover-loyalty-${job.id.slice(0, 8)}.csv`;
    } else {
      return res.status(400).json({ message: 'Type must be "customers" or "loyalty"' });
    }
    if (!csv) return res.status(404).json({ message: 'CSV not available' });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  });
}
