# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators. It provides role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to be an all-in-one solution for farm management, enhancing efficiency and oversight across all departments by integrating essential business tools. The project has an ambitious goal of revolutionizing farm operations through advanced AI and automation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite, styled with Tailwind CSS and Radix UI for accessible components, ensuring a consistent brand with the Great Vibes font. The design features a modern, responsive sidebar navigation for admin/manager users (collapsible desktop, mobile hamburger menu) and a clear, multi-role dashboard experience for Admin, Manager, and Employee users.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query, Wouter.
- **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt, session-based authentication.
- **Database**: PostgreSQL hosted on Neon Database, utilizing Drizzle ORM for type-safe operations and migrations.
- **Data Storage**: Replit Object Storage (Google Cloud Storage) for announcement images with presigned URL uploads.
- **Communication**: Mobile-first SMS integration via Twilio API (TCPA-compliant consent), SendGrid for email, and WebSockets for real-time features.
- **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
- **Time Management**: Includes clock in/out, break tracking, multi-location scheduling, time off requests, manual entry, "Scheduled vs Actual Hours" reporting, a drag-and-drop scheduling interface, PDF schedule generation, and a shift swap system with SMS notifications.
- **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive responses and real-time integration via WebSockets.
- **Document Management**: Role-based access, upload, categorization, permissions, and audit trails.
- **Inventory Management**: Integrates Clover POS (live inventory) and Thrive (vendor/cost data) for a unified dashboard, real-time sync, profitability analytics, manual matching, and enhanced CSV import. Includes vendor analytics.
- **Order Management**: Comprehensive order processing with real-time analytics, payment tracking, and performance insights.
- **Accounting**: Integrates Clover POS, Amazon Store, HSA, and Thrive inventory for real-time revenue dashboards, multi-location analytics, COGS calculations, discount/refund reporting, automated Chart of Accounts, and QuickBooks Online integration. Features a cached financial reports system and a persistent job-based sync system for Clover historical data with crash recovery and exponential backoff.
- **Employee Purchase Portal**: Allows employees to scan and purchase inventory items using a monthly allowance, with real-time balance tracking, purchase history, role-based pricing, Clover payment integration, and automatic inventory deduction.
- **Task Management System**: Role-based task creation, priority/due dates, assignees, checklists, status tracking, and comments.
- **Training & Learning System**: Personalized learning paths, progress tracking, skill assessment, and AI-powered content generation.
- **Goals Management System**: Supports personal, team, and company BHAGs with role-based permissions, an Idea Board, status tracking, and target dates.
- **Purchasing & Vendor Management**: Admin/manager-only access for vendor profiles, purchase order creation with multi-line items, approval workflows, audit trails, and reporting. Integrates with the Chart of Accounts and features tab-based navigation for status filtering.
- **AI Video Production System**: Marketing page feature for creating promotional videos, including a "Video Generation Priority Chain" (fal.ai, Runway Gen-4, Hugging Face, Stock B-roll) and "Image Generation Priority Chain" (fal.ai FLUX models, Stability AI, Hugging Face, Stock images). Features AI Visual Directions (Claude analysis, multiple alternatives, scene breakdown, user selection, constraint enforcement, approval workflow) and a Brand Assets Library for logo/watermark management. Includes a Quality Evaluation System with anatomical accuracy and defect detection, triggering auto-regeneration. Utilizes Remotion Lambda for server-side video rendering with multiple output formats (16:9, 9:16, 1:1).

### System Design Choices
The system maintains a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is optimized for clarity and performance through efficient database queries and consistent timezone handling. The architecture supports multi-merchant configurations and department-specific page access. Key optimizations include real-time API data fetching, React Query caching, and self-contained component design. All endpoints require proper authentication. Database migration follows a safe, incremental workflow. Automated inventory synchronization runs every 15 minutes using the Clover POS bulk `/item_stocks` endpoint for efficiency.

## External Dependencies

-   **Email Service**: SendGrid
-   **Database Hosting**: Neon Database
-   **ORM**: Drizzle
-   **UI Components**: Radix UI
-   **Styling**: Tailwind CSS
-   **Fonts**: Great Vibes
-   **Development Tools**: TypeScript, Vite, React Query
-   **Accounting Integrations**: QuickBooks, Clover POS, Amazon Store API, HSA Providers, Thrive Inventory
-   **Content Generation**: Hugging Face API
-   **SMS Service**: Twilio API
-   **AI Video Production**: fal.ai (LongCat-Video, Wan 2.2, FLUX models), ElevenLabs (voiceover), Pexels/Pixabay/Unsplash (stock media), Runway Gen-4, Stability AI, Anthropic (Claude for visual directions), AWS (for Remotion Lambda).