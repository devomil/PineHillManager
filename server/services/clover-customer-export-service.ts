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

    if (loyaltyPoints !== null) {
      loyaltyLines.push(
        toCsvRow([
          merchantName,
          customer.id,
          firstName,
          lastName,
          primaryPhone,
          primaryEmail,
          loyaltyPoints,
        ])
      );
    }
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

  for (const cfg of activeConfigs) {
    const merchantName = cfg.merchantName || cfg.merchantId;
    const progress: MerchantProgress = {
      merchantId: cfg.merchantId,
      merchantName,
      customersFetched: 0,
      loyaltyFetched: 0,
      loyaltyErrors: 0,
      done: false,
    };
    job.merchants.push(progress);

    const integration = new CloverIntegration(cfg);

    // Pull all customers
    const customers = await integration.fetchAllCustomers((count) => {
      progress.customersFetched = count;
    });
    progress.customersFetched = customers.length;

    // Pull loyalty per customer (sequential, with light pacing)
    for (const customer of customers) {
      let points: number | null = null;
      loyaltyAttemptTotal++;
      try {
        const result = await integration.fetchCustomerLoyaltyPoints(customer.id);
        if (result.points !== null) {
          points = result.points;
          progress.loyaltyFetched++;
          loyaltySuccessTotal++;
        } else {
          progress.loyaltyErrors++;
          if (result.error && loyaltyErrorSamples.size < 3) {
            loyaltyErrorSamples.add(result.error);
          }
        }
      } catch (err) {
        progress.loyaltyErrors++;
        const msg = err instanceof Error ? err.message : String(err);
        if (loyaltyErrorSamples.size < 3) loyaltyErrorSamples.add(msg);
      }
      allRows.push({ merchantName, customer, loyaltyPoints: points });
      // Light pacing to respect Clover rate limits
      await new Promise((r) => setTimeout(r, 60));
    }
    progress.done = true;
  }

  // Build CSVs
  const { customersCsv, loyaltyCsv } = buildCsvs(allRows);
  job.customersCsv = customersCsv;
  job.loyaltyCsv = loyaltyCsv;
  job.totalCustomers = allRows.length;
  job.totalWithLoyalty = loyaltySuccessTotal;

  // Determine if loyalty endpoint is available at all
  if (loyaltyAttemptTotal > 0) {
    job.loyaltyEndpointAvailable = loyaltySuccessTotal > 0;
    if (loyaltySuccessTotal === 0) {
      job.loyaltyWarning =
        'Loyalty endpoint returned no balances for any customer. The Clover API token likely lacks the loyalty/rewards scope. ' +
        'Sample errors: ' + Array.from(loyaltyErrorSamples).join(' | ');
    } else if (loyaltySuccessTotal < loyaltyAttemptTotal) {
      job.loyaltyWarning =
        `Loyalty balances were returned for ${loyaltySuccessTotal} of ${loyaltyAttemptTotal} customers. ` +
        'Customers without a balance are likely not enrolled in the rewards program.';
    }
  }

  job.status = 'completed';
  job.finishedAt = new Date();
}
