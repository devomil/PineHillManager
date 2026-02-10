# "Cannot GET /" Error — Root Cause Analysis & Fix Plan

## Problem Summary

The application preview intermittently shows a `Cannot GET /` error. The root cause is that when `NODE_ENV` is not explicitly set to `"development"`, the server falls into its production code path, which attempts to serve static files from `dist/public` — a directory that does not exist in the development environment.

---

## Research Findings

### Files Involved

| File | Role |
|------|------|
| `server/index.ts` (lines 180–197) | Main branching logic that decides whether to use Vite dev server or serve static files |
| `server/vite.ts` | Contains `setupVite()` (dev mode) and `serveStatic()` (production mode) |
| `vite.config.ts` | Vite build configuration; outputs to `dist/public` |
| `package.json` (scripts section) | Defines `dev` and `start` scripts with explicit `NODE_ENV` |
| `.replit` | Replit configuration; sets `NODE_ENV=development` under `[userenv.development]` |

### The Critical Code Path (`server/index.ts`, lines 180–197)

```typescript
if (process.env.NODE_ENV === "development") {
  // Uses Vite dev server with HMR — this is the correct path for development
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  const { setupVite } = await import("./vite");
  process.env.NODE_ENV = originalNodeEnv;
  await setupVite(app, server);
} else {
  // Tries to serve pre-built static files from dist/public — fails if not built
  app.use(express.static("dist/public"));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(process.cwd(), 'dist', 'public', 'index.html'));
  });
}
```

### Where NODE_ENV Is Set

1. **`package.json` dev script**: `"dev": "NODE_ENV=development tsx server/index.ts"` — explicitly sets it.
2. **`.replit` userenv**: `NODE_ENV = "development"` under `[userenv.development]`.
3. **Nowhere else** at runtime for the dev workflow.

### The `dist/public` Directory

- **Does not exist** in the current project. There is no `dist` directory at all.
- It would only exist after running `npm run build`, which is the production build step.
- The `.replit` deployment config correctly runs `npm run build` before `npm run start` for production.

### Other Files That Reference NODE_ENV

| File | Usage |
|------|-------|
| `server/replitAuth.ts` (line 41) | Sets secure cookie flag in production |
| `server/secure-logger.ts` (line 139) | Controls log verbosity |
| `server/utils/logger.ts` (line 17) | Sets log level |
| `server/integrations/quickbooks.ts` (line 68) | Controls QuickBooks environment |
| `server/services/video-project-worker.ts` (line 21) | Checks for dev mode |

### Additional Issue: Vite NODE_ENV Workaround

Lines 181–186 of `server/index.ts` temporarily set `NODE_ENV` to `"production"` while importing Vite to prevent the cartographer plugin from loading and breaking HMR. This is a fragile workaround — if the import of `./vite` triggers any side effects that read `NODE_ENV`, they will see the wrong value.

---

## Why the Error Occurs

The `Cannot GET /` error happens when:

1. `NODE_ENV` is **not** set to the exact string `"development"` at the time the branching logic on line 180 executes.
2. This causes the server to skip the Vite dev server setup entirely.
3. Instead, it tries to serve files from `dist/public`, which doesn't exist.
4. Express's `express.static()` finds nothing, and the `sendFile()` call for `index.html` also fails.
5. No middleware handles the `/` route, so Express returns its default `Cannot GET /`.

### Possible Triggers

- **Environment variable not propagated**: If the Replit environment doesn't inject `NODE_ENV` before the process starts, the `package.json` script prefix is the only source.
- **Process restart without script**: If the server process restarts outside of `npm run dev` (e.g., a file watcher or crash recovery that doesn't re-run the full script), `NODE_ENV` may not be set.
- **Race condition with the NODE_ENV workaround**: The temporary `NODE_ENV = "production"` swap on lines 182–186 could theoretically cause issues if async operations read it during that window.
- **Stale workflow state**: If the workflow configuration changes or the Replit runner caches an old environment.

---

## Fix Plan

### Option A: Make the Code Resilient (Recommended)

Change the branching logic in `server/index.ts` to default to Vite dev mode unless explicitly in production. This is the safest approach because it means the app works correctly even if `NODE_ENV` is unset.

**Change line 180 from:**
```typescript
if (process.env.NODE_ENV === "development") {
```

**To:**
```typescript
if (process.env.NODE_ENV !== "production") {
```

This way, if `NODE_ENV` is `undefined`, empty, or any value other than `"production"`, the app will use the Vite dev server instead of trying to serve from a non-existent `dist/public`.

### Option B: Ensure NODE_ENV Is Always Set (Belt-and-Suspenders)

Add a fallback at the top of `server/index.ts` (before any other code reads it):

```typescript
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}
```

### Option C: Combine Both (Most Robust)

Apply both Option A and Option B together. This provides:
- A sensible default if the variable is missing
- Resilient branching that doesn't break on unexpected values

---

## Risk Assessment

| Approach | Risk | Impact |
|----------|------|--------|
| Option A alone | Very low | Only changes behavior when NODE_ENV is unset or unexpected; production path still works when NODE_ENV=production |
| Option B alone | Low | Doesn't fix the root logic issue; if NODE_ENV gets set to something unexpected, the problem recurs |
| Option C (both) | Lowest | Covers all edge cases |

### No Negative Side Effects Expected

- Production deployments explicitly set `NODE_ENV=production` via the `.replit` deployment config (`"start": "NODE_ENV=production node dist/index.js"`).
- The change only affects the fallback behavior when `NODE_ENV` is missing or unexpected.
- All other files that read `NODE_ENV` (auth, logging, QuickBooks) compare against `"production"`, so they are unaffected by this change.

---

## Implementation Steps

1. Open `server/index.ts`
2. At the top of the file (after imports, before any code that reads `process.env.NODE_ENV`), add:
   ```typescript
   if (!process.env.NODE_ENV) {
     process.env.NODE_ENV = "development";
   }
   ```
3. Change line 180 from `if (process.env.NODE_ENV === "development")` to `if (process.env.NODE_ENV !== "production")`
4. Restart the application workflow
5. Verify the preview loads correctly
6. Test that API routes still work (e.g., `/api/employees`)
