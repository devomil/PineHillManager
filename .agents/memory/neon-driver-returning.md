---
name: Neon driver — INSERT...RETURNING returns empty rows
description: Why dev DB writes silently returned undefined and why server/db.ts uses the WebSocket Pool driver
---

# Use the Neon WebSocket Pool driver, not neon-http

`server/db.ts` must use `drizzle-orm/neon-serverless` with `Pool` + `ws`
(`neonConfig.webSocketConstructor = ws`), NOT `drizzle-orm/neon-http` (`neon(url)`).

**Why:** The dev database is an external Neon endpoint. Over the HTTP driver,
`INSERT/UPDATE ... RETURNING` came back with `rowCount=1` but **empty `rows` and
`fields`** — the row was written but the returned data was lost. So every drizzle
`.returning()` resolved to `undefined`, making `storage.create*()` return undefined
while the insert "succeeded". Routes then crashed reading `.id` / `.isPublished`
(surfaced as 500s on announcement create and `/api/communications/send`). The HTTP
driver also serialized a `null` timestamp param as `''` → Postgres `22007 invalid
input syntax for type timestamp`. SELECTs were unaffected, so reads always worked,
which made this look like a logic bug rather than a driver bug. Production
(Replit-managed Neon) returned RETURNING rows fine, so this was DEV-ONLY.

**How to apply:** The Pool driver speaks the native Postgres wire protocol, so
RETURNING rows come back and booleans/arrays/null-timestamps parse natively. After
switching, the old `patchedFetch` boolean/null response-rewrite hack in `server/db.ts`
was no longer needed and was removed. If you ever see inserts "work" but
`.returning()` give `undefined`, or a nullable timestamp insert throw 22007, suspect
the driver/endpoint, not the route. Sessions are independent (connect-pg-simple uses
its own pool from `DATABASE_URL`).
