# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators. Its core purpose is to provide role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to integrate essential business tools to offer an all-in-one solution for farm management, enhancing efficiency and oversight across all departments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript and Vite. Radix UI provides accessible components, styled with Tailwind CSS, ensuring a consistent and branded look using the Great Vibes font. The design emphasizes a clear, multi-role dashboard experience for Admin, Manager, and Employee users with dedicated page access. A modern, responsive sidebar navigation is implemented for admin/manager users, featuring collapsible desktop functionality and a mobile hamburger drawer menu.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query, Wouter.
- **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt, session-based authentication.
- **Database**: PostgreSQL hosted on Neon Database, Drizzle ORM for type-safe operations and migrations.
- **Data Storage**: Replit Object Storage (Google Cloud Storage) for announcement images with presigned URL uploads and ACL policies.
- **Communication**: Mobile-first SMS integration via Twilio API, SendGrid for email, WebSocket support for real-time features.
- **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
- **Time Management**: Clock in/out, break tracking, multi-location scheduling, time off requests, manual time entry, and comprehensive Scheduled vs Actual Hours reporting. Includes a modern drag-and-drop scheduling interface, PDF schedule generation, and a comprehensive shift swap system with SMS notifications.
- **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive responses and TCPA-compliant consent tracking via Twilio, with real-time integration via WebSockets.
- **Document Management**: Comprehensive document center with dual interfaces for role-based access, supporting upload, categorization, permissions, and audit trails.
- **Inventory Management**: Dedicated `/inventory` page with dual-system tracking reconciling Clover POS (live inventory) and Thrive (vendor/cost data). Features include a unified dashboard, real-time sync status, profitability analytics, manual matching interface, and enhanced CSV import. Includes vendor analytics for purchasing negotiations.
- **Order Management**: Dedicated `/orders` page for comprehensive order processing with real-time analytics, payment tracking, and performance insights, optimized for fast page loads.
- **Accounting**: Comprehensive financial management with live integrations for Clover POS, Amazon Store, HSA, and Thrive inventory. Features real-time revenue dashboards, multi-location analytics, accurate COGS calculations, discount/refund reporting, automated Chart of Accounts, and QuickBooks Online integration. Includes a cached financial reports system for optimized historical data retrieval.
- **Employee Purchase Portal**: Dedicated `/employee-purchases` page for employees to scan and purchase inventory items using a monthly allowance, with real-time balance tracking and purchase history. Features role-based pricing, an enhanced shopping cart, Clover payment integration, and automatic inventory deduction.
- **Task Management System**: Comprehensive task management system with role-based access, supporting task creation, priority/due dates, assignees, checklists, status tracking, and comments.
- **Training & Learning System**: Comprehensive employee training platform with personalized learning paths, progress tracking, skill assessment, and AI-powered content generation.
- **Goals Management System**: Dedicated `/goals` page with comprehensive goal setting and tracking across three levels: My Goals (personal), Team Goals, and Company BHAGs. Features include goal creation/editing/archiving with role-based permissions (admin/manager for team/company goals, all users for personal goals), an Idea Board for collaborative goal suggestions, status tracking (not started/in progress/completed), target dates, and detailed descriptions.

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, and performance is considered through optimized database queries and consistent timezone handling. The architecture supports multi-merchant configurations and department-specific page access. Key optimizations include real-time API data fetching, efficient React Query caching, and a self-contained component design. All endpoints require proper authentication. The database migration workflow emphasizes safety with detailed steps for planning, testing, and deployment, prioritizing small, incremental changes and thorough testing.

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