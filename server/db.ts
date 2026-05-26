import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const baseFetch: typeof fetch = (...args) => fetch(...args);

const patchedFetch: typeof fetch = async (input, init) => {
  const response = await baseFetch(input, init);
  if (!response.ok) return response;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return response;
  const text = await response.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    return new Response(text, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  }
  const normalize = (obj: any) => {
    if (obj && typeof obj === 'object' && 'rows' in obj && obj.rows === null) {
      obj.rows = [];
    }
    if (obj && typeof obj === 'object' && 'fields' in obj && obj.fields === null) {
      obj.fields = [];
    }
  };
  if (Array.isArray(body?.results)) {
    body.results.forEach(normalize);
  } else {
    normalize(body);
  }
  return new Response(JSON.stringify(body), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};

neonConfig.fetchFunction = patchedFetch as any;

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
