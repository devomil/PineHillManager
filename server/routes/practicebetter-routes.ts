import { Router, Request, Response } from 'express';
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

  const params = new URLSearchParams();
  params.set('grant_type', 'client_credentials');
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);

  const res = await fetch(`${PB_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PracticeBetter auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000,
  };

  return cachedToken.token;
}

async function pbFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getPBToken();
  return fetch(`${PB_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
}

function buildQuery(params: Record<string, any>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

const protect = [isAuthenticated, requireRole(['admin', 'manager'])];

// ── Client Records ────────────────────────────────────────────────────────────

router.get('/client-records', ...protect, async (req: Request, res: Response) => {
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

router.get('/client-records/:recordId', ...protect, async (req: Request, res: Response) => {
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

router.get('/medical-history/:recordId', ...protect, async (req: Request, res: Response) => {
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

router.put('/medical-history/:recordId', ...protect, async (req: Request, res: Response) => {
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

router.post('/medical-history/:recordId', ...protect, async (req: Request, res: Response) => {
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

router.get('/medical-history/:recordId/health-products', ...protect, async (req: Request, res: Response) => {
  try {
    const pbRes = await pbFetch(`/consultant/medicalhistory/${req.params.recordId}/healthproducts`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] health-products error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Availability & Sessions ───────────────────────────────────────────────────

router.get('/availability/slots', ...protect, async (req: Request, res: Response) => {
  try {
    const { as_consultant, day, location, serviceId, package: pkg } = req.query as Record<string, string>;
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

router.get('/sessions', ...protect, async (req: Request, res: Response) => {
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

router.post('/sessions', ...protect, async (req: Request, res: Response) => {
  try {
    const pbRes = await pbFetch('/consultant/sessions', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] session create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Invoices ──────────────────────────────────────────────────────────────────

router.get('/invoices', ...protect, async (req: Request, res: Response) => {
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

router.get('/invoices/:invoiceId', ...protect, async (req: Request, res: Response) => {
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
