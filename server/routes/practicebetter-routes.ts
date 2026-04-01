import { Router, Request, Response as ExpressResponse } from 'express';
import { isAuthenticated, requireRole } from '../auth';

const router = Router();
const PB_BASE_URL = 'https://api.practicebetter.io';

function getApiToken(): string {
  const token = process.env.PRACTICEBETTER_ID;
  if (!token) throw new Error('PRACTICEBETTER_ID environment variable is not configured');
  return token;
}

async function pbFetch(path: string, options: RequestInit = {}): Promise<globalThis.Response> {
  const token = getApiToken();
  return fetch(`${PB_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token,
      ...(options.headers ?? {}),
    },
  });
}

function buildQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

const protect = [isAuthenticated, requireRole(['admin', 'manager'])];

// ── Client Records ────────────────────────────────────────────────────────────

router.get('/client-records', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id, client, details, search } = req.query as Record<string, string>;
    const qs = buildQuery({ after_id, before_id, client, details, search });
    const pbRes = await pbFetch(`/consultant/records${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] client-records error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/client-records/:recordId', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch(`/consultant/records/${req.params.recordId}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] client-record get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Medical History ───────────────────────────────────────────────────────────

// List endpoint — returns the client record list (PB has no list endpoint for history without a recordId)
router.get('/medical-history', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id, details } = req.query as Record<string, string>;
    const qs = buildQuery({ after_id, before_id, details });
    const pbRes = await pbFetch(`/consultant/records${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] medical-history list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/medical-history/:recordId', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch(`/consultant/medicalhistory/${req.params.recordId}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] medical-history get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/medical-history/:recordId', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch(`/consultant/medicalhistory/${req.params.recordId}`, {
      method: 'PUT',
      body: JSON.stringify(req.body),
    });
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] medical-history update error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/medical-history/:recordId', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch(`/consultant/medicalhistory/${req.params.recordId}`, {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] medical-history create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Health Products ───────────────────────────────────────────────────────────

// Generic endpoint — accepts recordId as query param for flexibility
router.get('/medical-history/health-products', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { recordId } = req.query as Record<string, string>;
    if (!recordId) return res.status(400).json({ error: 'recordId query param required' });
    const pbRes = await pbFetch(`/consultant/medicalhistory/${recordId}/healthproducts`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] health-products error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Record-specific endpoint
router.get('/medical-history/:recordId/health-products', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch(`/consultant/medicalhistory/${req.params.recordId}/healthproducts`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] health-products (by id) error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Availability & Sessions ───────────────────────────────────────────────────

router.get('/availability/slots', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { as_consultant, day, location, serviceId } = req.query as Record<string, string>;
    const pkg = req.query['package'] as string | undefined;
    const qs = buildQuery({ as_consultant, day, location, serviceId, package: pkg });
    const pbRes = await pbFetch(`/consultant/availability/slots${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] availability slots error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/sessions', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id, consultants, date_eq, date_gte, date_lte } = req.query as Record<string, string>;
    const qs = buildQuery({ after_id, before_id, consultants, date_eq, date_gte, date_lte });
    const pbRes = await pbFetch(`/consultant/sessions${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] sessions list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/sessions', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch('/consultant/sessions', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.status(201).json(data);
  } catch (err: any) {
    console.error('[PB] session create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Invoices ──────────────────────────────────────────────────────────────────

router.get('/invoices', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id, consultants, invoicedate_eq, invoicedate_gte, invoicedate_lte } = req.query as Record<string, string>;
    const qs = buildQuery({ after_id, before_id, consultants, invoicedate_eq, invoicedate_gte, invoicedate_lte });
    const pbRes = await pbFetch(`/consultant/payments/invoices${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] invoices list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/invoices/:invoiceId', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch(`/consultant/payments/invoices/${req.params.invoiceId}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] invoice get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
