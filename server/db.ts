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
    if (!obj || typeof obj !== 'object') return;
    if ('rows' in obj && obj.rows === null) obj.rows = [];
    if ('fields' in obj && obj.fields === null) obj.fields = [];
    if (Array.isArray(obj.fields) && Array.isArray(obj.rows)) {
      const boolCols: number[] = [];
      const boolArrayCols: number[] = [];
      obj.fields.forEach((f: any, i: number) => {
        if (f && f.dataTypeID === 16) boolCols.push(i);
        if (f && f.dataTypeID === 1000) boolArrayCols.push(i);
      });
      if (boolCols.length || boolArrayCols.length) {
        const rowsAsArrays = obj.rows.length > 0 && Array.isArray(obj.rows[0]);
        for (const row of obj.rows) {
          if (rowsAsArrays) {
            for (const i of boolCols) {
              if (typeof row[i] === 'boolean') row[i] = row[i] ? 't' : 'f';
            }
            for (const i of boolArrayCols) {
              if (Array.isArray(row[i])) {
                row[i] = '{' + row[i].map((v: any) => v === null ? 'NULL' : (v ? 't' : 'f')).join(',') + '}';
              }
            }
          } else {
            for (const i of boolCols) {
              const name = obj.fields[i].name;
              if (typeof row[name] === 'boolean') row[name] = row[name] ? 't' : 'f';
            }
            for (const i of boolArrayCols) {
              const name = obj.fields[i].name;
              if (Array.isArray(row[name])) {
                row[name] = '{' + row[name].map((v: any) => v === null ? 'NULL' : (v ? 't' : 'f')).join(',') + '}';
              }
            }
          }
        }
      }
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
