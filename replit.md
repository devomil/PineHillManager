# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators. Its core purpose is to provide role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to integrate essential business tools to offer an all-in-one solution for farm management, enhancing efficiency and oversight across all departments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript and Vite. Radix UI provides accessible components, styled with Tailwind CSS, ensuring a consistent and branded look using the Great Vibes font. The design emphasizes a clear, multi-role dashboard experience for Admin, Manager, and Employee users with dedicated page access for department-specific operations.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query, Wouter.
- **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt, session-based authentication.
- **Database**: PostgreSQL hosted on Neon Database, Drizzle ORM for type-safe operations and migrations.
- **Data Storage**: Local file system for handling document uploads.
- **Communication**: Mobile-first SMS-integrated system with Twilio API, SendGrid for email notifications, WebSocket support, smart notification routing.
- **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
- **Time Management**: Clock in/out with break tracking, multi-location work scheduling, and time off request management.
- **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive response, TCPA-compliant consent tracking, and real-time integration via WebSockets.
- **Document Management**: Role-based file sharing.
- **Inventory Management**: Dedicated `/inventory` page with comprehensive tracking, real-time stock levels, categories, and analytics across all locations.
- **Order Management**: Dedicated `/orders` page for comprehensive order processing with real-time analytics, payment tracking, and performance insights across all store locations, with significant performance optimizations for loading times.
- **Accounting**: Comprehensive financial management with live integrations for Clover POS, Amazon Store, HSA, and Thrive inventory. Features real-time revenue dashboards, multi-location analytics, and fully operational COGS (Cost of Goods Sold) calculations with real-time cost tracking and gross profit analysis.
- **Video Generation**: A professional video engine built with native Canvas API for creating animated explainer videos, integrating multiple APIs for content generation, voiceover synthesis, and imagery.

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, and performance is considered through optimized database queries and consistent timezone handling (CST). The architecture supports multi-merchant configurations and department-specific page access. Key optimizations include real-time API data fetching, efficient React Query caching, and a self-contained component design where components auto-fetch data. All endpoints require proper authentication.

## External Dependencies

-   **Email Service**: SendGrid.
-   **Database Hosting**: Neon Database.
-   **ORM**: Drizzle.
-   **UI Components**: Radix UI.
-   **Styling**: Tailwind CSS.
-   **Fonts**: Great Vibes.
-   **Development Tools**: TypeScript, Vite, React Query.
-   **Accounting Integrations**: QuickBooks, Clover POS, Amazon Store API, HSA Providers, Thrive Inventory.
-   **Content Generation**: Hugging Face API.
-   **SMS Service**: Twilio API.