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
    // Normalize slots to consistent { start_time, end_time } shape
    // PB may return various field name conventions
    const rawItems: any[] = Array.isArray(data) ? data : (data?.items ?? data?.slots ?? []);
    if (rawItems.length > 0) {
      console.log('[PB] availability slots sample keys:', Object.keys(rawItems[0]));
      console.log('[PB] availability slots sample item:', JSON.stringify(rawItems[0], null, 2));
    } else {
      console.log('[PB] availability slots raw response:', JSON.stringify(data, null, 2));
    }
    const normalized = rawItems.map((slot: any) => ({
      start_time:
        slot.start_time ?? slot.startTime ?? slot.startAt ??
        slot.start      ?? slot.dateTime  ?? slot.time    ??
        slot.begin      ?? slot.slotStart ?? slot.slot_start ??
        slot.StartTime  ?? slot.StartDate ?? null,
      end_time:
        slot.end_time   ?? slot.endTime   ?? slot.endAt   ??
        slot.end        ?? slot.endDateTime ?? slot.finish ??
        slot.slotEnd    ?? slot.slot_end  ??
        slot.EndTime    ?? slot.EndDate   ?? null,
      consultant_id:   slot.consultant_id   ?? slot.consultantId   ?? slot.consultant?.id   ?? undefined,
      consultant_name: slot.consultant_name ?? slot.consultantName ?? slot.consultant?.name ?? undefined,
      service_id:      slot.service_id      ?? slot.serviceId      ?? slot.service?.id      ?? undefined,
      duration:        slot.duration        ?? undefined,
      _raw: slot,
    }));
    res.json(normalized);
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

// ── Forms ─────────────────────────────────────────────────────────────────────

router.get('/forms', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id } = req.query as Record<string, string>;
    const qs = buildQuery({ after_id, before_id });
    const pbRes = await pbFetch(`/consultant/forms${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    const items = Array.isArray(data) ? data : (data.items ?? data.data ?? []);
    res.json({ count: items.length, hasMore: data.hasMore ?? data.has_more ?? false, items });
  } catch (err: any) {
    console.error('[PB] forms list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Form Requests ──────────────────────────────────────────────────────────────

// In-memory client record cache (cleared every 10 min to stay fresh)
const clientRecordCache: Record<string, { data: any; fetchedAt: number }> = {};
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const k of Object.keys(clientRecordCache)) {
    if (clientRecordCache[k].fetchedAt < cutoff) delete clientRecordCache[k];
  }
}, 5 * 60 * 1000);

async function batchFetchClientRecords(ids: string[]): Promise<Record<string, any>> {
  const clientMap: Record<string, any> = {};
  // Serve cached entries first
  const uncached = ids.filter(id => {
    if (clientRecordCache[id]) {
      clientMap[id] = clientRecordCache[id].data;
      return false;
    }
    return true;
  });

  // Fetch uncached IDs in chunks of 5 to avoid rate-limiting
  const CHUNK = 5;
  for (let i = 0; i < uncached.length; i += CHUNK) {
    const chunk = uncached.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(async (cid) => {
        try {
          const cr = await pbFetch(`/consultant/records/${cid}`);
          if (cr.ok) {
            const crData = await cr.json();
            clientMap[cid] = crData;
            clientRecordCache[cid] = { data: crData, fetchedAt: Date.now() };
          }
        } catch { /* skip on error */ }
      })
    );
    // Small pause between chunks to respect rate limits
    if (i + CHUNK < uncached.length) await new Promise(r => setTimeout(r, 80));
  }
  return clientMap;
}

router.get('/formrequests', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id, form_id, client_record_id } = req.query as Record<string, string>;
    // Default limit to 25 so enrichment stays fast; callers can override
    const limit = req.query.limit as string | undefined;
    const qs = buildQuery({ after_id, before_id, form_id, client_record_id, limit: limit ?? '25' });
    const pbRes = await pbFetch(`/consultant/formrequests${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    const items: any[] = Array.isArray(data) ? data : (data.items ?? data.data ?? []);

    // Collect unique client record IDs and batch-fetch with caching + rate-limit protection
    const clientIds = [...new Set(items.map((r: any) => r.clientRecord?.id).filter(Boolean))] as string[];
    const clientMap = await batchFetchClientRecords(clientIds);

    // Merge enriched client profile and derive status from booleans
    const enriched = items.map((r: any) => {
      const cid = r.clientRecord?.id;
      const fullClient = cid ? clientMap[cid] : null;
      const derivedStatus = r.completed ? 'completed' : r.started ? 'opened' : 'pending';
      return {
        ...r,
        clientRecord: fullClient ?? r.clientRecord,
        status: derivedStatus,
      };
    });

    res.json({ count: enriched.length, hasMore: data.hasMore ?? data.has_more ?? false, items: enriched });
  } catch (err: any) {
    console.error('[PB] formrequests list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/formrequests', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch('/consultant/formrequests', {
      method: 'POST',
      body: JSON.stringify(req.body),
    });
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] formrequests create error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/formrequests/:requestId', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch(`/consultant/formrequests/${req.params.requestId}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] formrequest get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────

router.get('/tasks', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id, status } = req.query as Record<string, string>;
    const qs = buildQuery({ after_id, before_id, status });
    const pbRes = await pbFetch(`/consultant/tasks${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    const items = Array.isArray(data) ? data : (data.items ?? data.data ?? []);
    res.json({ count: items.length, hasMore: data.hasMore ?? data.has_more ?? false, items });
  } catch (err: any) {
    console.error('[PB] tasks list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Programs & Courses ─────────────────────────────────────────────────────────

router.get('/programs', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id } = req.query as Record<string, string>;
    const qs = buildQuery({ after_id, before_id });
    const pbRes = await pbFetch(`/consultant/programs${qs}`);
    const data = await pbRes.json();
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    const items = Array.isArray(data) ? data : (data.items ?? data.data ?? []);
    res.json({ count: items.length, hasMore: data.hasMore ?? data.has_more ?? false, items });
  } catch (err: any) {
    console.error('[PB] programs list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Labs ───────────────────────────────────────────────────────────────────────

router.get('/labs', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { after_id, before_id, status, client_record_id } = req.query as Record<string, string>;
    const limit = req.query.limit as string | undefined;
    const qs = buildQuery({ after_id, before_id, status, client_record_id, limit: limit ?? '25' });
    const pbRes = await pbFetch(`/consultant/labrequests${qs}`);
    const text = await pbRes.text();
    let data: any;
    try { data = JSON.parse(text); } catch {
      console.error('[PB] labs non-JSON response:', text.slice(0, 200));
      return res.status(502).json({ error: 'PracticeBetter returned invalid JSON', raw: text.slice(0, 200) });
    }
    if (!pbRes.ok) return res.status(pbRes.status).json(data);

    const items: any[] = Array.isArray(data) ? data : (data.items ?? data.data ?? []);

    // Log first item shape so we can see real field names
    if (items.length > 0) {
      console.log('[PB] labrequests sample keys:', Object.keys(items[0]));
      console.log('[PB] labrequests sample item:', JSON.stringify(items[0], null, 2));
    }

    // Enrich with client names via batch fetch (same pattern as formrequests)
    const clientIds = [...new Set(items.map((r: any) => r.clientRecord?.id).filter(Boolean))] as string[];
    const clientMap = await batchFetchClientRecords(clientIds);

    const enriched = items.map((r: any) => {
      const cid = r.clientRecord?.id;
      const fullClient = cid ? clientMap[cid] : null;
      return { ...r, clientRecord: fullClient ?? r.clientRecord };
    });

    res.json({ count: data.count ?? enriched.length, hasMore: data.hasMore ?? data.has_more ?? false, items: enriched });
  } catch (err: any) {
    console.error('[PB] labs list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/labs/:labId', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const pbRes = await pbFetch(`/consultant/labrequests/${req.params.labId}`);
    const text = await pbRes.text();
    let data: any;
    try { data = JSON.parse(text); } catch {
      return res.status(502).json({ error: 'PracticeBetter returned invalid JSON' });
    }
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] lab get error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/labs/:labId/attachments/:itemId', ...protect, async (req: Request, res: ExpressResponse) => {
  try {
    const { alt } = req.query as Record<string, string>;

    if (alt === 'media') {
      // PracticeBetter redirects ?alt=media requests to a presigned S3 URL.
      // We MUST NOT forward the Authorization header to S3 — it will conflict
      // with the presigned signature and cause SignatureDoesNotMatch errors.
      // Strategy: call PB with redirect:'manual', grab the Location header,
      // then fetch the S3 URL directly with no auth header.
      const token = await getPBToken();
      const pbUrl = `${PB_BASE_URL}/consultant/labrequests/${req.params.labId}/attachments/${req.params.itemId}?alt=media`;

      const pbRes = await fetch(pbUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
        redirect: 'manual',
      });

      // Handle redirect to S3 presigned URL (301/302/303/307/308)
      const location = pbRes.headers.get('location');
      if ((pbRes.status >= 301 && pbRes.status <= 308) && location) {
        console.log('[PB] lab attachment redirect to S3, fetching without auth...');
        const s3Res = await fetch(location); // NO Authorization header — presigned URL auth only
        if (!s3Res.ok) {
          const errText = await s3Res.text();
          console.error('[PB] S3 fetch error:', errText.slice(0, 300));
          return res.status(502).json({ error: `S3 fetch failed (${s3Res.status})` });
        }
        const contentType = s3Res.headers.get('content-type') ?? 'application/octet-stream';
        const contentDisposition = s3Res.headers.get('content-disposition');
        res.setHeader('Content-Type', contentType);
        if (contentDisposition) res.setHeader('Content-Disposition', contentDisposition);
        const buffer = Buffer.from(await s3Res.arrayBuffer());
        return res.send(buffer);
      }

      // PB returned content directly (no redirect)
      if (!pbRes.ok) {
        const errText = await pbRes.text();
        return res.status(pbRes.status).json({ error: errText.slice(0, 200) });
      }
      const contentType = pbRes.headers.get('content-type') ?? 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      const buffer = Buffer.from(await pbRes.arrayBuffer());
      return res.send(buffer);
    }

    // Without alt=media: return JSON metadata for the attachment
    const pbRes = await pbFetch(`/consultant/labrequests/${req.params.labId}/attachments/${req.params.itemId}`);
    const text = await pbRes.text();
    let data: any;
    try { data = JSON.parse(text); } catch {
      return res.status(502).json({ error: 'PracticeBetter returned invalid JSON' });
    }
    if (!pbRes.ok) return res.status(pbRes.status).json(data);
    res.json(data);
  } catch (err: any) {
    console.error('[PB] lab attachment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

