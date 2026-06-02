import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// The Neon WebSocket (Pool) driver speaks the native Postgres wire protocol, so
// INSERT/UPDATE ... RETURNING reliably returns rows and column types (booleans,
// arrays, timestamps, null) are parsed correctly. The previous neon-http driver
// did not return RETURNING rows against some Neon endpoints and required manual
// boolean coercion, which caused inserts to appear to succeed while returning
// undefined.
neonConfig.webSocketConstructor = ws as any;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });

// Close the pool on shutdown so connections are released back to Neon promptly.
// Kept non-blocking so it never delays a process restart.
let poolClosed = false;
const closePool = () => {
  if (poolClosed) return;
  poolClosed = true;
  pool.end().catch(() => {});
};
process.once("SIGTERM", closePool);
process.once("SIGINT", closePool);
