---
name: Communications draft autosave race model
description: How /communications draft autosave avoids orphan/duplicate/lost-edit races; the session-token invariant.
---

# Draft autosave races on /communications

Autosave in `client/src/pages/communications.tsx` persists in-progress announcements/group
messages as drafts. Correctness under fast user actions (close, reopen, publish while a
POST is in flight) is keyed to a **compose session token** (`composeSessionRef`), NOT to
boolean flags.

## The invariant
Every `saveDraftNow()` captures `session = composeSessionRef.current` at start. When its
POST resolves with a created id, the decision is:
- session still current → bind id (active compose).
- session in `discardedSessionsRef` (publish/discard added it) → DELETE the created row (orphan).
- else current bound id is null → ADOPT the id (a non-destructive close+reopen carried the
  content forward without its own draft; prevents a duplicate POST).
- else → keep it as its own separate draft.

**Why:** an earlier flag-based approach (`isPublishingRef`) had timing holes — a POST
resolving after the flag was reset left orphans, and close+reopen during an in-flight CREATE
produced duplicate draft rows. Tying the decision to the immutable per-save session token,
plus a set of discarded sessions, makes cleanup deterministic regardless of how late a POST
resolves. No timed/polling waits.

**How to apply:** if you touch this flow, never reintroduce a single boolean "publishing"
flag. Keep `triggerSave()`/in-flight-promise tracking for deterministic close (await the
in-flight promise, no polling), and keep the close-finalize reset guarded by `mySession ===
composeSession` so a quick reopen is never wiped. `openDraft` sets a non-null id so the
ADOPT branch never clobbers an explicitly-opened draft.

## Where it lives now
The race model is extracted into a framework-agnostic `DraftAutosaveController`
(`client/src/lib/draft-autosave.ts`); `communications.tsx` holds a single instance in a ref
and refreshes its `deps` (getPayload/hasContent/persist) each render so saves read the
latest form state. This exists so the races are unit-tested without rendering React.

**Tests:** `client/src/lib/__tests__/draft-autosave.test.ts` (vitest, run via the `test`
validation = `npx vitest run`). They use a controllable in-memory store that mirrors the
server CRUD (POST inserts a row immediately, response flushed on demand) to assert exact
row counts/content for: orphan-on-publish, no-duplicate on close+reopen, no-overwrite when
opening a draft mid-CREATE, and latest-content-on-close. If you change the controller, run
these — they are the regression guard for this invariant.
