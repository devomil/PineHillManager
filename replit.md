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

**Publish flow (safe):** Replit's publish diff is the only supported path for production schema changes. Each publish builds the app, diffs `shared/schema.ts` against the live production schema, presents the SQL preview, and applies the migration only after explicit confirmation. Existing rows in protected tables (users, work_schedules, time_clock_entries, time_off_requests, shift_swap_requests, shift_coverage_requests, messages, channel_messages, announcements, support_tickets, responses, tasks, documents, notifications, goals, training_progress, lesson_progress, employee_invitations, password_reset_tokens, etc.) are preserved across publishes. Never bypass this by adding startup DDL, custom migration scripts, or `drizzle-kit push` against production.

**Backups:** A nightly `pg_dump` (excluding sessions) runs at 2:00 AM CT, gzips the output, and uploads it to Replit Object Storage at `<PRIVATE_OBJECT_DIR>/backups/prod/<timestamp>.sql.gz`. Each run is tracked in the `backup_runs` table. Backups older than 30 days are pruned automatically. Override the schedule with `BACKUP_HOUR_CT` (24h, default `2`).

**Admin Backups page (`/admin/backups`, admin role only):** Lists recent backup runs with status/size/duration, lets admins download any completed snapshot, and provides a "Run backup now" button for ad-hoc snapshots before risky publishes. A pre-publish checklist banner on the admin dashboard surfaces backup freshness so admins always see whether a recent snapshot exists before deploying.

**Recovery:** Download the most recent `.sql.gz` from `/admin/backups`, `gunzip` it, then load into a staging database (`psql $STAGING_DATABASE_URL < backup.sql`) to verify. Once verified, restore to production by coordinating with Replit support to swap or reload the managed database. Never restore directly to live production without staging verification.

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