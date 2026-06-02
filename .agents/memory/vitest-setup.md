---
name: Vitest setup & gotchas
description: How tests are discovered/run here, and the "Bus error" native-binary corruption trap.
---

# Running vitest in this repo

- The registered `test` validation runs `npx vitest run`. Tests live in `client/`
  and `server/` (e.g. `server/routes/__tests__/*.test.ts`).
- `vite.config.ts` sets `root: client`, so vitest discovery would be scoped to
  `client/` only. A root `vitest.config.ts` exists to widen `test.include` to
  client/server/shared and to redeclare the `@`, `@shared`, `@assets` aliases.
  **Why:** without it, server-side tests are silently never collected.
  **How to apply:** add new server tests under `server/**/*.test.ts`; they are
  picked up automatically. Do NOT try to fix discovery by editing `vite.config.ts`
  (forbidden) — adjust `vitest.config.ts` instead.

# "Bus error" from vitest = corrupted native binaries

- Symptom: `npx vitest run` prints only `Bus error` and crashes — even on a
  trivial `expect(1+1).toBe(2)` test, every pool (threads/forks).
- Root cause seen here: an interrupted npm install (ENOTEMPTY mid-rename)
  left **truncated `.node` native binaries** (e.g. vitest's nested
  `lightningcss-*` ~1.1MB instead of ~10MB; `@rolldown/binding-*` ~1.4MB instead
  of ~22MB). Loading a truncated native addon raises SIGBUS.
- It is NOT caused by PGlite/pg-mem — those were red herrings; the corruption
  predated them.
- Fix: clear the npm cache (`rm -rf ~/.npm/_cacache`), remove `node_modules`,
  then reinstall via the package manager (fresh download). Spot-check suspect
  native binaries by size: `find node_modules -name '*.node' -newermt <time>`.
  **How to apply:** if vitest "Bus error"s, suspect native binary corruption
  first — don't burn time on pool flags or test code.

# In-memory Postgres for route tests

- PGlite (`@electric-sql/pglite` + `drizzle-orm/pglite`) works under vitest once
  native deps are healthy and faithfully runs arrays/jsonb.
- `pg-mem` + `drizzle-orm/node-postgres` fails on array/jsonb columns with
  `getTypeParser is not supported` — prefer PGlite for drizzle pg-schema tests.
