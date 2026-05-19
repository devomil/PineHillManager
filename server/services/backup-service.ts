import { spawn } from 'child_process';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';
import { PassThrough } from 'stream';
import { db } from '../db';
import { backupRuns } from '@shared/schema';
import { eq, lt, desc, and } from 'drizzle-orm';
import { objectStorageClient } from '../objectStorage';

export const PROTECTED_TABLES = [
  'users',
  'work_schedules',
  'time_clock_entries',
  'time_off_requests',
  'shift_swap_requests',
  'shift_coverage_requests',
  'messages',
  'channel_messages',
  'announcements',
  'announcement_reactions',
  'support_tickets',
  'responses',
  'tasks',
  'task_notes',
  'documents',
  'notifications',
  'goals',
  'company_monthly_goals',
  'training_progress',
  'lesson_progress',
  'employee_invitations',
  'password_reset_tokens',
  'backup_runs',
];
const RETENTION_DAYS = 30;

function getBackupBucketAndPrefix(): { bucketName: string; prefix: string } {
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!privateDir) {
    throw new Error('PRIVATE_OBJECT_DIR not set — object storage is required for backups.');
  }
  const trimmed = privateDir.startsWith('/') ? privateDir.slice(1) : privateDir;
  const parts = trimmed.split('/');
  const bucketName = parts[0];
  const dirPrefix = parts.slice(1).join('/');
  const prefix = `${dirPrefix ? dirPrefix + '/' : ''}backups/${process.env.NODE_ENV === 'production' ? 'prod' : 'dev'}`;
  return { bucketName, prefix };
}

function objectPathFromName(objectName: string): string {
  const { bucketName } = getBackupBucketAndPrefix();
  return `/${bucketName}/${objectName}`;
}

export interface BackupResult {
  id: number;
  status: 'completed' | 'failed';
  objectPath?: string;
  sizeBytes?: number;
  durationMs: number;
  error?: string;
}

let backupInFlight = false;

export function isBackupRunning(): boolean {
  return backupInFlight;
}

export async function runBackup(
  triggeredBy: 'scheduled' | 'manual',
  userId?: string
): Promise<BackupResult> {
  if (backupInFlight) {
    throw new Error('A backup is already running');
  }
  backupInFlight = true;
  const startMs = Date.now();
  const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

  const [run] = await db
    .insert(backupRuns)
    .values({
      status: 'running',
      triggeredBy,
      triggeredByUserId: userId,
      environment,
    })
    .returning();

  let bucketName = '';
  let objectName = '';
  let objectPath = '';
  let stderrBuf = '';
  let bytesWritten = 0;

  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('DATABASE_URL not set');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const cfg = getBackupBucketAndPrefix();
    bucketName = cfg.bucketName;
    objectName = `${cfg.prefix}/${timestamp}.sql.gz`;
    objectPath = `/${bucketName}/${objectName}`;

    const args = [
      '--format=plain',
      '--no-owner',
      '--no-privileges',
      '--no-comments',
      '--quote-all-identifiers',
    ];
    for (const t of PROTECTED_TABLES) {
      args.push(`-t`, `public.${t}`);
    }
    args.push(dbUrl);

    const proc = spawn('pg_dump', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
    });

    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);
    const uploadStream = file.createWriteStream({
      resumable: false,
      contentType: 'application/gzip',
      metadata: { contentType: 'application/gzip' },
    });

    const gzip = createGzip({ level: 6 });
    const counter = new PassThrough();
    counter.on('data', (chunk: Buffer) => {
      bytesWritten += chunk.length;
    });

    const procExit = new Promise<void>((resolve, reject) => {
      proc.on('error', reject);
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`pg_dump exited with code ${code}: ${stderrBuf.slice(0, 1000)}`));
      });
    });

    await Promise.all([
      pipeline(proc.stdout, gzip, counter, uploadStream),
      procExit,
    ]);

    const durationMs = Date.now() - startMs;
    await db.update(backupRuns).set({
      status: 'completed',
      finishedAt: new Date(),
      durationMs,
      objectPath,
      sizeBytes: bytesWritten,
      tableCount: PROTECTED_TABLES.length,
      tableList: PROTECTED_TABLES,
    }).where(eq(backupRuns.id, run.id));

    console.log(`[Backup] Completed run #${run.id} (${(bytesWritten / 1024 / 1024).toFixed(2)} MB in ${(durationMs / 1000).toFixed(1)}s) → ${objectPath}`);

    pruneOldBackups().catch((err) => console.error('[Backup] Prune failed:', err));

    return { id: run.id, status: 'completed', objectPath, sizeBytes: bytesWritten, durationMs };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Backup] Run #${run.id} failed:`, message);
    if (bucketName && objectName) {
      try {
        await objectStorageClient.bucket(bucketName).file(objectName).delete({ ignoreNotFound: true });
      } catch {}
    }
    await db.update(backupRuns).set({
      status: 'failed',
      finishedAt: new Date(),
      durationMs: Date.now() - startMs,
      error: message.slice(0, 2000),
    }).where(eq(backupRuns.id, run.id));
    return { id: run.id, status: 'failed', durationMs: Date.now() - startMs, error: message };
  } finally {
    backupInFlight = false;
  }
}

function parseAndValidateObjectPath(rawPath: string): { bucketName: string; objectName: string } | null {
  try {
    const { bucketName: expectedBucket, prefix } = getBackupBucketAndPrefix();
    const trimmed = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
    const parts = trimmed.split('/');
    const bucketName = parts[0];
    const objectName = parts.slice(1).join('/');
    if (bucketName !== expectedBucket) return null;
    if (!objectName.startsWith(`${prefix}/`)) return null;
    if (!objectName.endsWith('.sql.gz')) return null;
    return { bucketName, objectName };
  } catch {
    return null;
  }
}

export async function pruneOldBackups(): Promise<number> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const stale = await db
    .select()
    .from(backupRuns)
    .where(and(eq(backupRuns.status, 'completed'), lt(backupRuns.startedAt, cutoff)));

  let deleted = 0;
  for (const row of stale) {
    if (!row.objectPath) continue;
    const parsed = parseAndValidateObjectPath(row.objectPath);
    if (!parsed) {
      console.warn(`[Backup] Skipping prune of #${row.id} — objectPath outside expected bucket/prefix: ${row.objectPath}`);
      continue;
    }
    try {
      await objectStorageClient.bucket(parsed.bucketName).file(parsed.objectName).delete({ ignoreNotFound: true });
      await db.update(backupRuns).set({ status: 'pruned' }).where(eq(backupRuns.id, row.id));
      deleted++;
    } catch (err) {
      console.error(`[Backup] Failed to prune backup #${row.id}:`, err);
    }
  }
  if (deleted > 0) console.log(`[Backup] Pruned ${deleted} backup(s) older than ${RETENTION_DAYS} days`);
  return deleted;
}

export async function listBackups(limit = 60) {
  return await db
    .select()
    .from(backupRuns)
    .orderBy(desc(backupRuns.startedAt))
    .limit(limit);
}

export async function getBackup(id: number) {
  const [row] = await db.select().from(backupRuns).where(eq(backupRuns.id, id));
  return row ?? null;
}

export async function streamBackupToResponse(id: number, res: import('express').Response) {
  const row = await getBackup(id);
  if (!row || !row.objectPath || row.status !== 'completed') {
    res.status(404).json({ error: 'Backup not found or incomplete' });
    return;
  }
  const parsed = parseAndValidateObjectPath(row.objectPath);
  if (!parsed) {
    res.status(400).json({ error: 'Backup object path outside expected backup location' });
    return;
  }
  const { bucketName, objectName } = parsed;
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  const [exists] = await file.exists();
  if (!exists) {
    res.status(404).json({ error: 'Backup file missing from storage' });
    return;
  }
  const filename = objectName.split('/').pop() || `backup-${id}.sql.gz`;
  res.setHeader('Content-Type', 'application/gzip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  if (row.sizeBytes) res.setHeader('Content-Length', String(row.sizeBytes));
  file.createReadStream()
    .on('error', (err) => {
      console.error('[Backup] Stream error:', err);
      if (!res.headersSent) res.status(500).json({ error: 'Stream error' });
    })
    .pipe(res);
}

let schedulerStarted = false;
let isRunning = false;

export function startBackupScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const targetHourCT = parseInt(process.env.BACKUP_HOUR_CT || '2', 10);
  let lastRunDate = '';

  const tick = async () => {
    if (isRunning) return;
    const now = new Date();
    const ctHour = parseInt(now.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: 'America/Chicago' }));
    const ctDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
    if (ctHour === targetHourCT && ctDate !== lastRunDate) {
      lastRunDate = ctDate;
      isRunning = true;
      try {
        await runBackup('scheduled');
      } catch (err) {
        console.error('[Backup] Scheduled run failed:', err);
      } finally {
        isRunning = false;
      }
    }
  };

  setInterval(tick, 60 * 1000);
  console.log(`[Backup] Scheduler initialized (daily at ${targetHourCT}:00 CT, retention ${RETENTION_DAYS} days)`);
}
