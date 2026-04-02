import { Router, Request, Response as ExpressResponse } from 'express';
import { isAuthenticated, requireRole } from '../auth';

const router = Router();
const PB_BASE_URL = 'https://api.practicebetter.io';

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getPBToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = process.env.PRACTICEBETTER_ID;
  const clientSecret = process.env.PRACTICEBETTER_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('PracticeBetter credentials not configured');
  }

  const res = await fetch(`${PB_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }).toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PracticeBetter auth failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { access_token: string; expires_in?: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) * 1000) - 60_000,
  };

  return cachedToken.token;
}

async function pbFetch(path: string, options: RequestInit = {}): Promise<globalThis.Response> {
  const token = await getPBToken();
  return fetch(`${PB_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
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
// All responses are passed through exactly as PracticeBetter sends them so that
// field names remain canonical and round-trip writes stay consistent.

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
    // Log first item shape so we can verify field names from the real API
    if (data?.items?.length > 0) {
      console.log('[PB] sessions sample item keys:', Object.keys(data.items[0]));
      console.log('[PB] sessions sample item:', JSON.stringify(data.items[0], null, 2));
    } else {
      console.log('[PB] sessions response shape:', JSON.stringify(data, null, 2));
    }
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

// ── Services ──────────────────────────────────────────────────────────────────

router.get('/services', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id } = req.query as Record<string, string>;
    const qs = buildQuery({ after_id, before_id });
    const pbRes = await pbFetch(`/consultant/services${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] services list error:', err.message);
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
