# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is an all-in-one platform designed to optimize operations for employees, managers, and administrators. It provides role-based access for time tracking, scheduling, communication, support ticket management, and comprehensive accounting. The system aims to integrate essential business tools to enhance efficiency and oversight across all farm departments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript and Vite. Radix UI provides accessible components, styled with Tailwind CSS, ensuring a consistent look with the Great Vibes font. The design features a clear, multi-role dashboard for Admin, Manager, and Employee users, with a modern, responsive sidebar navigation for admin/manager users.

### Technical Implementations
-   **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query, Wouter.
-   **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt, session-based authentication.
-   **Database**: PostgreSQL hosted on Neon Database, Drizzle ORM.
-   **Data Storage**: Replit Object Storage (Google Cloud Storage) for announcement images, local file system for other documents.
-   **Communication**: Mobile-first SMS via Twilio API, SendGrid for email, WebSocket for real-time features.
-   **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
-   **Time Management**: Clock in/out with break tracking, multi-location scheduling, time off requests with role-based privacy, manual time entry, and Scheduled vs Actual Hours reporting. Includes a drag-and-drop scheduling interface and a comprehensive shift swap marketplace with SMS notifications.
-   **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive responses and TCPA-compliant consent tracking via Twilio, with real-time WebSocket integration.
-   **Document Management**: Role-based file sharing.
-   **Inventory Management**: Dedicated `/inventory` page with dual-system tracking (Clover POS and Thrive), unified dashboard, real-time sync status, profitability analytics, manual matching, discrepancy resolution, and enhanced CSV import. Includes vendor analytics for negotiation insights.
-   **Order Management**: Dedicated `/orders` page for comprehensive order processing with real-time analytics and payment tracking. Performance optimized with optional COGS calculation.
-   **Accounting**: Comprehensive financial management with live integrations for Clover POS, Amazon Store, HSA, and Thrive inventory. Features real-time revenue dashboards, multi-location analytics, accurate COGS, critical discount/refund reporting, automated Chart of Accounts, QuickBooks Online integration, and monthly business intelligence dashboard. Includes COGS tracking improvements and a cached financial reports system for historical data.
-   **Video Generation**: Professional video engine built with native Canvas API for animated explainer videos.
-   **Employee Purchase Portal**: Dedicated `/employee-purchases` page for employees to purchase inventory items using their allowance, with real-time balance tracking and purchase history. Features role-based pricing, enhanced shopping cart, Clover payment integration, and automatic inventory deduction.
-   **Task Management System**: Comprehensive task management with role-based access, task creation, checklists, status tracking, comments, filtering, and dashboard integration.
-   **Goals Collaboration System**: Padlet-style collaborative goals board at `/goals` for leadership to brainstorm and manage goals.
-   **Training & Learning System**: Comprehensive employee training platform with personalized learning paths, progress tracking, skill assessment, and AI-powered content generation for lessons.

### System Design Choices
The system maintains a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is optimized for clarity and performance through efficient database queries and consistent timezone handling. The architecture supports multi-merchant configurations and department-specific access, with all endpoints requiring proper authentication.

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