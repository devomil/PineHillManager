import { storage } from '../storage';
import { CloverIntegration } from '../integrations/clover';
import { randomUUID } from 'crypto';

export type ExportJobStatus = 'pending' | 'running' | 'completed' | 'failed';

interface MerchantProgress {
  merchantId: string;
  merchantName: string;
  customersFetched: number;
  loyaltyFetched: number;
  loyaltyErrors: number;
  loyaltySource: 'live' | 'reconstructed' | 'unavailable' | 'pending';
  ordersScanned: number;
  rewardOrders: number;
  done: boolean;
}

interface ExportJob {
  id: string;
  status: ExportJobStatus;
  startedAt: Date;
  finishedAt?: Date;
  error?: string;
  merchants: MerchantProgress[];
  customersCsv?: string;
  loyaltyCsv?: string;
  totalCustomers: number;
  totalWithLoyalty: number;
  loyaltyEndpointAvailable: boolean | null; // null = unknown, false = scope/endpoint missing
  loyaltyWarning?: string;
}

const exportJobs = new Map<string, ExportJob>();

export function getExportJob(id: string): ExportJob | undefined {
  return exportJobs.get(id);
}

export function listExportJobs(): ExportJob[] {
  return Array.from(exportJobs.values()).sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime()
  );
}

// Cleanup old jobs (>2h)
function pruneOldJobs() {
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  for (const [id, job] of exportJobs.entries()) {
    if (job.startedAt.getTime() < cutoff) exportJobs.delete(id);
  }
}

// CSV utilities
function csvEscape(value: any): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsvRow(values: any[]): string {
  return values.map(csvEscape).join(',');
}

// Format Clover phone (E.164 or 10-digit) into a readable string
function formatPhone(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 ${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

function formatBirthday(month?: number | null, day?: number | null): string {
  if (!month || !day) return '';
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${mm}/${dd}`;
}

function formatTimestamp(ms?: number | null): string {
  if (!ms) return '';
  try {
    return new Date(ms).toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function flattenAddress(addr: any): string {
  if (!addr) return '';
  const parts = [
    addr.address1,
    addr.address2,
    addr.address3,
    addr.city ? `${addr.city}${addr.state ? ', ' + addr.state : ''}${addr.zip ? ' ' + addr.zip : ''}` : addr.state,
    addr.country,
  ].filter((p) => p && String(p).trim().length > 0);
  return parts.join(', ');
}

// Build the two CSVs from the gathered data
function buildCsvs(rows: Array<{
  merchantName: string;
  customer: any;
  loyaltyPoints: number | null;
}>): { customersCsv: string; loyaltyCsv: string } {
  // Customers CSV — column set chosen to match what Square's customer importer accepts
  // (Square's "Reference ID" stores the Clover customer ID for cross-referencing.)
  const customerHeader = [
    'source_location',
    'first_name',
    'last_name',
    'company',
    'email',
    'phone',
    'address',
    'city',
    'state',
    'postal_code',
    'country',
    'birthday',
    'marketing_allowed',
    'note',
    'reference_id',
    'created_date',
  ];
  const loyaltyHeader = [
    'source_location',
    'reference_id',
    'first_name',
    'last_name',
    'phone',
    'email',
    'points_balance',
  ];

  const customerLines: string[] = [toCsvRow(customerHeader)];
  const loyaltyLines: string[] = [toCsvRow(loyaltyHeader)];

  for (const { merchantName, customer, loyaltyPoints } of rows) {
    const firstName = (customer.firstName ?? '').trim();
    const lastName = (customer.lastName ?? '').trim();

    const phones = customer.phoneNumbers?.elements ?? [];
    const emails = customer.emailAddresses?.elements ?? [];
    const addresses = customer.addresses?.elements ?? [];
    const meta = customer.metadata ?? {};

    const primaryPhone = formatPhone(phones[0]?.phoneNumber);
    const primaryEmail = emails[0]?.emailAddress ?? '';
    const primaryAddress = addresses[0] ?? null;

    customerLines.push(
      toCsvRow([
        merchantName,
        firstName,
        lastName,
        meta.businessName ?? '',
        primaryEmail,
        primaryPhone,
        [primaryAddress?.address1, primaryAddress?.address2, primaryAddress?.address3]
          .filter(Boolean)
          .join(' '),
        primaryAddress?.city ?? '',
        primaryAddress?.state ?? '',
        primaryAddress?.zip ?? '',
        primaryAddress?.country ?? '',
        formatBirthday(meta.dobMonth, meta.dobDay),
        customer.marketingAllowed ? 'YES' : 'NO',
        meta.note ?? customer.note ?? '',
        customer.id,
        formatTimestamp(customer.customerSince ?? customer.createdTime),
      ])
    );

    // Per requirements: one loyalty row per customer. Customers without a
    // resolved balance get 0 (Square's loyalty importer treats blank/0 as
    // "not enrolled / no balance").
    loyaltyLines.push(
      toCsvRow([
        merchantName,
        customer.id,
        firstName,
        lastName,
        primaryPhone,
        primaryEmail,
        loyaltyPoints ?? 0,
      ])
    );
  }

  return {
    customersCsv: customerLines.join('\n') + '\n',
    loyaltyCsv: loyaltyLines.join('\n') + '\n',
  };
}

// Kick off a new export job and start it in the background.
export function startExportJob(): ExportJob {
  pruneOldJobs();
  const job: ExportJob = {
    id: randomUUID(),
    status: 'pending',
    startedAt: new Date(),
    merchants: [],
    totalCustomers: 0,
    totalWithLoyalty: 0,
    loyaltyEndpointAvailable: null,
  };
  exportJobs.set(job.id, job);

  // Run async — don't await
  runExportJob(job).catch((err) => {
    job.status = 'failed';
    job.error = err instanceof Error ? err.message : String(err);
    job.finishedAt = new Date();
    console.error('[CloverExport] Job failed:', err);
  });

  return job;
}

async function runExportJob(job: ExportJob): Promise<void> {
  job.status = 'running';

  const configs = await storage.getAllCloverConfigs();
  const activeConfigs = configs.filter((c: any) => c.isActive);
  if (activeConfigs.length === 0) {
    throw new Error('No active Clover merchant configurations found.');
  }

  const allRows: Array<{
    merchantName: string;
    customer: any;
    loyaltyPoints: number | null;
  }> = [];

  let loyaltySuccessTotal = 0;
  let loyaltyAttemptTotal = 0;
  const loyaltyErrorSamples = new Set<string>();

  // Pine Hill's rewards program launched 2025-08-13 (config: programs prior
  // to this date didn't exist, so order history from this point onward fully
  // reconstructs the current balance).
  const PROGRAM_START_MS = Date.parse(
    process.env.CLOVER_REWARDS_PROGRAM_START ?? '2025-08-13T00:00:00Z'
  );
  // Default: 100 points = $5 reward (Clover's stock rewards menu).
  // Override via env if Pine Hill's redemption rate changes.
  const POINTS_PER_DOLLAR_REDEEMED = Number(
    process.env.CLOVER_REWARDS_POINTS_PER_DOLLAR_REDEEMED ?? '20'
  );

  for (const cfg of activeConfigs) {
    const merchantName = cfg.merchantName || cfg.merchantId;
    const progress: MerchantProgress = {
      merchantId: cfg.merchantId,
      merchantName,
      customersFetched: 0,
      loyaltyFetched: 0,
      loyaltyErrors: 0,
      loyaltySource: 'pending',
      ordersScanned: 0,
      rewardOrders: 0,
      done: false,
    };
    job.merchants.push(progress);

    const integration = new CloverIntegration(cfg);

    // Pull all customers
    const customers = await integration.fetchAllCustomers((count) => {
      progress.customersFetched = count;
    });
    progress.customersFetched = customers.length;

    // Step 1: Endpoint discovery. First probe the documented program /
    // loyalty / audience paths once per merchant with structured logging
    // (results show up in workflow logs prefixed [CloverLoyaltyDiscovery]),
    // then probe the per-customer loyalty endpoints for a small sample.
    // Live mode is only selected if at least one customer probe returns a
    // real numeric point balance — that is the only proof Clover's loyalty
    // surface is actually returning usable data for this merchant. Anything
    // else (405, 404, empty 200, network error) routes to reconstruction.
    const sampleCustomerId = customers[0]?.id ?? null;
    await integration.probeLoyaltyDiscoveryEndpoints(sampleCustomerId);

    const PROBE_SIZE = Math.min(3, customers.length);
    const livePoints = new Map<string, number>();
    let liveDataFound = false;
    for (let i = 0; i < PROBE_SIZE; i++) {
      loyaltyAttemptTotal++;
      try {
        const r = await integration.fetchCustomerLoyaltyPoints(customers[i].id);
        if (r.points !== null) {
          livePoints.set(customers[i].id, r.points);
          liveDataFound = true;
        } else if (r.error && loyaltyErrorSamples.size < 3) {
          loyaltyErrorSamples.add(r.error);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (loyaltyErrorSamples.size < 3) loyaltyErrorSamples.add(msg);
      }
    }

    let merchantPoints = new Map<string, number>();

    if (liveDataFound) {
      // Live endpoint works — pull every customer's balance with a small pool.
      progress.loyaltySource = 'live';
      const CONCURRENCY = 5;
      let nextIndex = 0;
      const worker = async () => {
        while (true) {
          const i = nextIndex++;
          if (i >= customers.length) return;
          const customer = customers[i];
          if (livePoints.has(customer.id)) {
            merchantPoints.set(customer.id, livePoints.get(customer.id)!);
            progress.loyaltyFetched++;
            loyaltySuccessTotal++;
            continue;
          }
          loyaltyAttemptTotal++;
          try {
            const r = await integration.fetchCustomerLoyaltyPoints(customer.id);
            if (r.points !== null) {
              merchantPoints.set(customer.id, r.points);
              progress.loyaltyFetched++;
              loyaltySuccessTotal++;
            } else {
              progress.loyaltyErrors++;
            }
          } catch {
            progress.loyaltyErrors++;
          }
        }
      };
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, customers.length) }, () => worker())
      );
    } else {
      // Live endpoint unavailable — reconstruct from order history. Pine Hill's
      // program started after the order sync window begins, so this is complete.
      console.log(
        `[CloverExport] Loyalty endpoint unavailable for ${merchantName} — reconstructing from orders since ${new Date(PROGRAM_START_MS).toISOString()}.`
      );
      try {
        const recon = await integration.reconstructLoyaltyBalancesFromOrders({
          sinceMs: PROGRAM_START_MS,
          pointsPerDollarRedeemed: POINTS_PER_DOLLAR_REDEEMED,
          onProgress: (n) => {
            progress.ordersScanned = n;
          },
        });
        merchantPoints = recon.balances;
        progress.ordersScanned = recon.ordersScanned;
        progress.rewardOrders = recon.rewardOrders;
        progress.loyaltySource = 'reconstructed';
        // Count customers that ended up with a positive balance
        for (const [, v] of merchantPoints) {
          if (v > 0) {
            progress.loyaltyFetched++;
            loyaltySuccessTotal++;
          }
        }
      } catch (err) {
        progress.loyaltySource = 'unavailable';
        const msg = err instanceof Error ? err.message : String(err);
        loyaltyErrorSamples.add(`reconstruction failed: ${msg}`);
        console.error(`[CloverExport] Reconstruction failed for ${merchantName}:`, err);
      }
    }

    for (const customer of customers) {
      const pts = merchantPoints.get(customer.id);
      allRows.push({
        merchantName,
        customer,
        loyaltyPoints: pts !== undefined ? pts : null,
      });
    }
    progress.done = true;
  }

  // Build CSVs
  const { customersCsv, loyaltyCsv } = buildCsvs(allRows);
  job.customersCsv = customersCsv;
  job.loyaltyCsv = loyaltyCsv;
  job.totalCustomers = allRows.length;
  job.totalWithLoyalty = loyaltySuccessTotal;

  // Build a per-merchant loyalty source summary
  const liveMerchants = job.merchants.filter((m) => m.loyaltySource === 'live');
  const reconMerchants = job.merchants.filter((m) => m.loyaltySource === 'reconstructed');
  const failedMerchants = job.merchants.filter((m) => m.loyaltySource === 'unavailable');

  job.loyaltyEndpointAvailable = liveMerchants.length > 0;

  const parts: string[] = [];
  if (liveMerchants.length > 0) {
    parts.push(
      `Live API balances pulled for: ${liveMerchants.map((m) => m.merchantName).join(', ')}.`
    );
  }
  if (reconMerchants.length > 0) {
    const totalOrders = reconMerchants.reduce((s, m) => s + m.ordersScanned, 0);
    parts.push(
      `Balances reconstructed from order history for: ${reconMerchants
        .map((m) => m.merchantName)
        .join(', ')} (${totalOrders.toLocaleString()} orders scanned, ` +
        `1 pt/$1 earned, ${POINTS_PER_DOLLAR_REDEEMED} pts/$1 redeemed via "Rewards" discounts). ` +
        `Spot-check 5–10 customers against Clover's web Customer Summary page; values within ±5 are expected variance.`
    );
  }
  if (failedMerchants.length > 0) {
    parts.push(
      `No loyalty data available for: ${failedMerchants
        .map((m) => m.merchantName)
        .join(', ')} — those rows export with 0 points.`
    );
  }
  if (parts.length > 0) job.loyaltyWarning = parts.join(' ');

  job.status = 'completed';
  job.finishedAt = new Date();
}
