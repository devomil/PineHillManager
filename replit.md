# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators at Pine Hill Farm. Its core purpose is to provide role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to integrate essential business tools to offer an all-in-one solution for farm management, enhancing efficiency and oversight across all departments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite. Radix UI provides accessible components, styled with Tailwind CSS, ensuring a consistent and branded look using the Great Vibes font. The design emphasizes a clear, multi-role dashboard experience for Admin, Manager, and Employee users with dedicated page access. A modern, responsive sidebar navigation is implemented for admin/manager users, featuring collapsible desktop functionality and a mobile hamburger drawer menu.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query, Wouter.
- **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt, session-based authentication.
- **Database**: PostgreSQL hosted on Neon Database, Drizzle ORM for type-safe operations and migrations.
- **Data Storage**: Replit Object Storage (Google Cloud Storage) for announcement images with presigned URL uploads and ACL policies. Local file system for other document uploads.
- **Communication**: Mobile-first SMS integration via Twilio API, SendGrid for email, WebSocket support for real-time features.
- **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
- **Time Management**: Clock in/out with break tracking, multi-location scheduling, time off requests with role-based privacy protection (employees cannot view other employees' time off reasons; only managers and admins have access to request details), manual time entry capabilities for employees, and comprehensive Scheduled vs Actual Hours reporting for labor variance analysis and payroll expense tracking. PDF schedule generation features vibrant colored shift boxes matching the UI calendar design exactly, with adaptive font sizing, employee first names, dynamic cell height calculation for single-page output (4-6 week months), and full calendar weeks with padding days from previous/next months. All date calculations use UTC methods to prevent timezone-related calendar alignment issues. Employee upcoming shifts view uses local timezone parsing (parseLocalDate helper) to prevent date display discrepancies.
- **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive responses, TCPA-compliant consent tracking via Twilio, and real-time integration via WebSockets. Admin SMS management interface available in Employee Management > Edit Employee > Settings tab for managing employee SMS consent, notification preferences, and viewing consent history. New employees require manual SMS opt-in via admin interface.
- **Document Management**: Role-based file sharing.
- **Inventory Management**: Dedicated `/inventory` page with comprehensive dual-system tracking reconciling Clover POS (live inventory) and Thrive (vendor/cost data). Features include a unified dashboard, real-time sync status, profitability analytics with dual pricing systems, manual matching interface for unmatched items, discrepancy resolution workflow, and enhanced CSV import with sync status tracking.
- **Order Management**: Dedicated `/orders` page for comprehensive order processing with real-time analytics, payment tracking, and performance insights across all store locations, optimized for fast data retrieval.
- **Accounting**: Comprehensive financial management with live integrations for Clover POS, Amazon Store, HSA, and Thrive inventory. Features real-time revenue dashboards, multi-location analytics, accurate COGS calculations, critical discount and refund reporting with exact matching to Clover, and automated Chart of Accounts with standard accounts auto-populated on startup (1300-Inventory, 2100-Sales Tax Payable, 4100-Total Sales Revenue, 5000-COGS, 6700-Payroll Expense). Chart of Accounts automatically syncs daily at 12:01 AM CT with live Clover POS and Amazon sales data, updating each location's sales account balances with net revenue (gross sales minus refunds). Manual sync available via POST /api/accounting/accounts/sync. Includes accurate Profit & Loss statements pulling from standard accounts and live multi-location API data.
- **Video Generation**: A professional video engine built with native Canvas API for creating animated explainer videos.
- **Employee Purchase Portal**: Dedicated `/employee-purchases` page for employees to scan and purchase inventory items using their monthly allowance, with real-time balance tracking and purchase history. Pricing model by role: **Managers/Admins** - before cap: 100% discount (no charge until allowance used); after cap: COGS + markup % for out-of-pocket purchases. **Regular Employees** - before cap: full retail price charged against free monthly allowance; after cap: 25% off retail price for out-of-pocket purchases. **Balance Tracking**: Role-based calculation where managers/admins track COGS value (actual cost to company) while regular employees track retail value (charged against allowance). Admin reporting available at `/admin/employees/purchases` showing spending, allowances, and after-cap pricing by role across all employees. **Clover Payment Integration**: Secure credit card processing via Clover POS API for over-cap purchases using PCI-compliant iframe tokenization. Backend generates PAKMS public API key dynamically from OAuth token for frontend SDK initialization. Payment flow includes automatic cart calculation, Clover charge creation with card token, payment status tracking, and refund capabilities. Database tracks Clover payment IDs, card last 4 digits, payment method, and processing timestamps.
- **Task Management System**: Comprehensive task management system with role-based access at `/tasks`. Features include task creation with priority and due dates, assignee selection, step-by-step checklists, status tracking with automatic workflow, comments, filtering, and dashboard integration with progress indicators.
- **Training & Learning System**: Comprehensive employee training platform with personalized learning paths, progress tracking, and skill assessment. Features include training modules with lessons, quiz-based assessments, automated skill granting on completion, mandatory training tracking, overdue alerts, role-based module access, progress dashboards, and admin management interface for creating/editing courses at `/admin/training`. AI-powered content generation via Anthropic Claude creates properly formatted HTML lessons with semantic structure including headings, bullet lists, and Q&A pairs. Lessons display with academic formatting and proper spacing. The formatLessonContent() helper in training-module.tsx provides backward compatibility for plain text content but all new AI-generated content uses HTML directly for consistency.

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, and performance is considered through optimized database queries and consistent timezone handling (CST). The architecture supports multi-merchant configurations and department-specific page access. Key optimizations include real-time API data fetching, efficient React Query caching, and a self-contained component design where components auto-fetch data. All endpoints require proper authentication.

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