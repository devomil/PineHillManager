# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators. It provides role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to be an all-in-one solution for farm management, enhancing efficiency and oversight across all departments by integrating essential business tools. The project has an ambitious goal of revolutionizing farm operations through advanced AI and automation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite, styled with Tailwind CSS and Radix UI for accessible components, using Poppins font throughout for consistent branding. The design features a modern, responsive sidebar navigation for admin/manager users (collapsible desktop, mobile hamburger menu) and a clear, multi-role dashboard experience for Admin, Manager, and Employee users.

### Technical Implementations
-   **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query, Wouter.
-   **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt, session-based authentication.
-   **Database**: PostgreSQL.
-   **Data Storage**: Replit Object Storage (Google Cloud Storage) for announcement images with presigned URL uploads.
-   **Communication**: Mobile-first SMS integration via Twilio API, SendGrid for email, and WebSockets for real-time features.
-   **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
-   **Time Management**: Includes clock in/out, break tracking, multi-location scheduling, time off requests, manual entry, "Scheduled vs Actual Hours" reporting, a drag-and-drop scheduling interface, PDF schedule generation, and a shift swap system with SMS notifications.
-   **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive responses and real-time integration via WebSockets. Support ticket system with SMS notifications. Per-user archive, edit/delete for admin/manager, and @mention system for tagging employees in response comments with in-app notification banner.
-   **Document Management**: Role-based access, upload, categorization, permissions, and audit trails.
-   **Inventory Management**: Integrates Clover POS and Thrive for a unified dashboard, real-time sync, profitability analytics, and enhanced CSV import.
-   **Order Management**: Comprehensive order processing with real-time analytics, payment tracking, and performance insights. Includes automated marketplace order sync from BigCommerce and Amazon Seller Central using SP-API.
-   **Accounting**: Integrates Clover POS, Amazon Store, HSA, and Thrive inventory for real-time revenue dashboards, multi-location analytics, COGS calculations, discount/refund reporting, automated Chart of Accounts, and QuickBooks Online integration.
-   **Employee Purchase Portal**: Allows employees to scan and purchase inventory items using a monthly allowance, with real-time balance tracking, purchase history, role-based pricing, Clover payment integration, and automatic inventory deduction.
-   **Task Management System**: Role-based task creation, priority/due dates, assignees, checklists, status tracking, and comments.
-   **Training & Learning System**: Personalized learning paths, progress tracking, skill assessment, and AI-powered content generation.
-   **Goals Management System**: Supports personal, team, and company BHAGs with role-based permissions, an Idea Board, status tracking, and target dates.
-   **Purchasing & Vendor Management**: Admin/manager-only access for vendor profiles, purchase order creation with multi-line items, approval workflows, audit trails, and reporting.
-   **Homer AI Business Intelligence**: Voice-enabled AI assistant for admin/manager users. Features natural language queries about revenue, profitability, and forecasts. Uses Claude Sonnet 4 for intelligent analysis and ElevenLabs for voice responses.
-   **AI Video Production System**: Marketing page feature for creating promotional videos, including AI visual directions, brand asset management, a quality evaluation system, and server-side video rendering. It integrates various AI models for image and video generation and uses Claude Vision for scene analysis and smart text overlay. A robust Workflow Orchestration System manages the entire video production pipeline based on scene requirements and quality tiers, incorporating cinematic post-processing effects and premium transitions. This system also supports quick video creation from document uploads, extracting content and converting it into video scripts.
-   **Clover → Square Customer & Loyalty Export**: Admin-only one-time migration tool (`/admin/clover-square-export`) that pulls all customers and current loyalty point balances from both Clover merchants (Watertown + Lake Geneva) and produces two CSVs formatted for Square's customer and loyalty importers. Combined CSV with `source_location` column, includes phone-only/email-only contacts, current balance only (no history), no cross-location dedup. Loyalty balances come from a 3-customer live-endpoint probe (all Clover loyalty paths return 405 currently) then fall back to **order-history reconstruction** since the program-start date `CLOVER_REWARDS_PROGRAM_START` (default `2025-08-13`): 1 pt earned per $1 pre-tax subtotal, redemptions detected by Clover discount lines named "Rewards" with negative `amount`, converted back to points at `CLOVER_REWARDS_POINTS_PER_DOLLAR_REDEEMED` (default 20, i.e. 100 pts = $5). Per-merchant `loyaltySource` (`live`/`reconstructed`/`unavailable`) shown in UI. In-memory async job tracker with progress polling. Routes: `server/routes.ts` (`/api/admin/clover-export/*`). Service: `server/services/clover-customer-export-service.ts`. Clover methods: `fetchAllCustomers()`, `fetchCustomerLoyaltyPoints()`, `reconstructLoyaltyBalancesFromOrders()` in `server/integrations/clover.ts`. Frontend: `client/src/pages/admin/clover-square-export.tsx`.
-   **S3 Render Asset Manager**: Admin-only S3 asset management (under Marketing Tools > Assets > S3 Render Assets). Upload, delete, and validate files in S3 categories: SFX, Music, Logos, Badges, Overlays, End Cards, Fonts. Uses presigned URL uploads. Pre-render SFX validation detects placeholder silent MP3 files and auto-disables broken sound effects. Routes: `server/routes/s3-asset-routes.ts`. Frontend: `client/src/components/s3-asset-manager.tsx`.

### System Design Choices
The system maintains a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is optimized for clarity and performance through efficient database queries and consistent timezone handling. The architecture supports multi-merchant configurations and department-specific page access. Key optimizations include real-time API data fetching, React Query caching, and self-contained component design. Video generation runs on a dedicated service (port 5001, `server/video-service.ts`) spawned as a detached process from the main server, ensuring main server restarts do not disrupt active renders. The main server (port 5000) proxies `/api/universal-video/*` requests to the video service via HTTP. Both share the same PostgreSQL session store for auth. Monotonic progress protection (`Math.max`) prevents progress regression during Lambda render monitoring.

## Production data & publishing

Production runs on Replit's managed PostgreSQL behind the autoscale deployment at https://phfmanager.co. Development uses an external Neon database via the `@neondatabase/serverless` HTTP driver. The two databases are independent — publishing does NOT copy dev data into production.

**Publish flow (safe):** Replit's publish diff is the only supported path for production schema changes. Each publish builds the app, diffs `shared/schema.ts` against the live production schema, presents the SQL preview, and applies the migration only after explicit confirmation. Existing rows in protected tables (defined as `PROTECTED_TABLES` in `server/services/backup-service.ts` — users, work_schedules, time_clock_entries, time_off_requests, shift_swap_requests, shift_coverage_requests, messages, channel_messages, announcements, announcement_reactions, support_tickets, responses, tasks, task_notes, documents, notifications, goals, company_monthly_goals, training_progress, lesson_progress, employee_invitations, password_reset_tokens, backup_runs) are preserved across publishes. Never bypass this by adding startup DDL, custom migration scripts, or `drizzle-kit push` against production.

**⚠️ Critical publish warnings:**
- **Never click "Overwrite data"** in the Publish dialog. That option wipes the production database and replaces it with dev data. Always choose the schema-only / migrate path.
- **Review column renames carefully.** When a column is renamed in `shared/schema.ts`, the publish SQL preview may show it as `DROP column + ADD new column` (which loses data) instead of `RENAME`. Confirm any rename in the preview maps to the existing column before applying.

**Backups:** A nightly `pg_dump` (excluding sessions) runs at 2:00 AM CT, gzips the output, and uploads it to Replit Object Storage at `<PRIVATE_OBJECT_DIR>/backups/prod/<timestamp>.sql.gz`. Each run is tracked in the `backup_runs` table. Backups older than 30 days are pruned automatically. Override the schedule with `BACKUP_HOUR_CT` (24h, default `2`).

**Admin Backups page (`/admin/backups`, admin role only):** Lists recent backup runs with status/size/duration, lets admins download any completed snapshot, and provides a "Run backup now" button for ad-hoc snapshots before risky publishes. A pre-publish checklist banner on the admin dashboard surfaces backup freshness so admins always see whether a recent snapshot exists before deploying.

**Recovery:** Download the most recent `.sql.gz` from `/admin/backups`, `gunzip` it, then load into a staging database (`psql $STAGING_DATABASE_URL < backup.sql`) to verify. Once verified, restore to production by coordinating with Replit support to swap or reload the managed database. Never restore directly to live production without staging verification.

**Restore drill (verified 2026-05-19):** End-to-end restore was rehearsed against a throwaway Neon staging database. Use this exact procedure before any real DR event so the runbook stays muscle-memory:

```bash
# 1. From /admin/backups, click "Download" on the most recent completed run.
#    The file is named like 2026-05-19T07-00-12-345Z.sql.gz.

# 2. Decompress locally.
gunzip 2026-05-19T07-00-12-345Z.sql.gz   # → 2026-05-19T07-00-12-345Z.sql

# 3. Provision a throwaway staging database (Neon branch, local docker, or
#    `createdb phf_restore_test` on a personal psql). Export its URL:
export STAGING_DATABASE_URL='postgres://…/phf_restore_test'

# 4. Restore. The dump is plain-text SQL with CREATE TABLE + COPY + ALTER TABLE
#    ADD CONSTRAINT for every table in BACKUP_TABLES (PROTECTED_TABLES plus the
#    FK-reference tables locations / training_modules / training_lessons /
#    chat_channels). --single-transaction makes the whole load atomic so a
#    single bad statement aborts cleanly instead of leaving half-applied data.
psql "$STAGING_DATABASE_URL" --single-transaction \
     --set ON_ERROR_STOP=on -f 2026-05-19T07-00-12-345Z.sql

# 5. Sanity-check row counts against prod. Run the same query on prod
#    (read-only) and on staging — the numbers should match within the window
#    between the backup and the prod query.
psql "$STAGING_DATABASE_URL" -c "
  SELECT 'users' AS t, count(*) FROM users
  UNION ALL SELECT 'work_schedules', count(*) FROM work_schedules
  UNION ALL SELECT 'time_clock_entries', count(*) FROM time_clock_entries
  UNION ALL SELECT 'messages', count(*) FROM messages
  UNION ALL SELECT 'channel_messages', count(*) FROM channel_messages
  UNION ALL SELECT 'announcements', count(*) FROM announcements
  UNION ALL SELECT 'tasks', count(*) FROM tasks
  UNION ALL SELECT 'documents', count(*) FROM documents
  UNION ALL SELECT 'notifications', count(*) FROM notifications;
"

# 6. Spot-check FKs to ensure the reference tables are populated correctly.
psql "$STAGING_DATABASE_URL" -c "
  SELECT count(*) FROM work_schedules ws
  LEFT JOIN locations l ON l.id = ws.location_id
  WHERE ws.location_id IS NOT NULL AND l.id IS NULL;   -- expect 0
"

# 7. Tear down the staging DB once verified.
```

**Drill outcome:** The restore succeeded inside a single transaction. Row counts on `users`, `work_schedules`, `time_clock_entries`, `messages`, `channel_messages`, `announcements`, `tasks`, `documents`, and `notifications` all matched the prod source. No missing extensions were required — `pg_dump` runs with `--no-owner --no-privileges --no-comments --quote-all-identifiers` and the schema does not depend on `pgcrypto`/`uuid-ossp`, so a vanilla Postgres 16 target works.

**Fix shipped from the drill:** The first pass failed at `ALTER TABLE work_schedules ADD CONSTRAINT … FOREIGN KEY (location_id) REFERENCES locations(id)` because `locations` was not in the dump. The same gap existed for `training_modules`, `training_lessons`, and `chat_channels`. `server/services/backup-service.ts` now exports `BACKUP_REFERENCE_TABLES` (the FK targets) and `BACKUP_TABLES = PROTECTED_TABLES + BACKUP_REFERENCE_TABLES`; the `pg_dump` invocation and `backup_runs.table_list` use `BACKUP_TABLES`. `PROTECTED_TABLES` is unchanged — it still drives the publish-time preservation contract — so this only widens the backup surface, not what the publish flow protects.

**When to re-run the drill:** at minimum once per quarter, and whenever a new table with FKs to non-protected tables is added to `PROTECTED_TABLES`. If a future drill surfaces another missing FK target, add it to `BACKUP_REFERENCE_TABLES` rather than `PROTECTED_TABLES`.

**Troubleshooting bad publishes:**
- *"column does not exist" / "relation does not exist" after publish in prod logs* — the migration was skipped or the schema diff didn't run. Open the Publish dialog and re-publish; verify the SQL preview applies the missing column. If the column exists in dev only and the publish preview wants to `ADD` it, that is correct — confirm to proceed.
- *Accidentally clicked "Overwrite data" and prod looks like dev* — production rows were replaced by dev data. Stop further publishes immediately, download the most recent `.sql.gz` from `/admin/backups` (taken before the publish), and follow the Recovery steps to restore. Contact Replit support to swap the managed database back.
- *Renamed a column and prod is missing the data* — the publish likely dropped the old column and added a new empty one. Restore from the latest backup, then add an explicit rename migration before re-publishing.
- *Backups page shows "No backups yet" or the latest is >36 hours old* — the nightly scheduler did not run. Click "Run backup now" before publishing; check server logs for `[Backup]` errors (commonly `PRIVATE_OBJECT_DIR not set` or `pg_dump` failures).

Implementation: `server/services/backup-service.ts` (pg_dump → gzip → Object Storage stream upload, retention pruning, daily scheduler), `server/routes.ts` (`GET /api/admin/backups`, `POST /api/admin/backups/run`, `GET /api/admin/backups/:id/download`), `client/src/pages/admin/backups.tsx`, `client/src/pages/admin-dashboard.tsx` `PrePublishBanner`, `shared/schema.ts` `backupRuns` table.

## External Dependencies

-   **Email Service**: SendGrid
-   **Database Hosting**: Neon Database
-   **ORM**: Drizzle
-   **UI Components**: Radix UI
-   **Styling**: Tailwind CSS
-   **Accounting Integrations**: QuickBooks, Clover POS, Amazon Store API, HSA Providers, Thrive Inventory, BigCommerce
-   **Content Generation**: Hugging Face API
-   **SMS Service**: Twilio API
-   **AI Video Production**: fal.ai (LongCat-Video, Wan 2.2, FLUX models), ElevenLabs (voiceover), Pexels/Pixabay/Unsplash (stock media), Runway Gen-4, Stability AI, Anthropic (Claude for visual directions and context), AWS (for Remotion Lambda), LegNext.ai, PiAPI (Veo 3.1, Kling, Luma I2V).