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
- **Database**: PostgreSQL hosted on Neon Database, Drizzle ORM for type-safe operations and migrations. Sessions are PostgreSQL-backed with a 7-day expiration.
- **Data Storage**: Local file system for handling document uploads.
- **Communication**: Mobile-first SMS-integrated system with Twilio API, SendGrid for email notifications, WebSocket support, smart notification routing.
- **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
- **Time Management**: Clock in/out with break tracking, multi-location work scheduling, and time off request management.
- **Communication & Support**: Mobile-first SMS-integrated team messaging with complete interactive response and reaction system. Includes TCPA-compliant consent tracking, bulk consent management, full audit trails for consent history, interactive reaction system (thumbs-up, checkmark, X, question mark), SMS quick reactions via emoji/keyword detection, smart message threading, dual response system, complete API layer (CRUD), and real-time integration via WebSockets.
- **Document Management**: Role-based file sharing.
- **Inventory Management**: Dedicated `/inventory` page with comprehensive tracking, real-time stock levels, categories, and analytics across all locations. Includes inventory sync capabilities and role-based access controls.
- **Order Management**: Dedicated `/orders` page for comprehensive order processing with real-time analytics, payment tracking, and performance insights across all store locations.
- **Accounting**: Comprehensive financial management with live integrations for Clover POS, Amazon Store, HSA, and Thrive inventory. Features real-time revenue dashboards and multi-location analytics.
- **Video Generation**: A professional video engine built with native Canvas API for creating animated explainer videos, integrating multiple APIs for content generation, voiceover synthesis, and imagery.

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, and performance is considered through optimized database queries and consistent timezone handling (CST). The architecture supports multi-merchant configurations and department-specific page access.

**Performance Optimizations:**
- Real-time API data fetching and WebSocket connections for instant updates.
- Efficient React Query caching with targeted invalidation.
- Auto-fetching component architecture and modular page design.
- Component-level state management to reduce re-renders.

**Architecture Decisions:**
- **Self-Contained Component Design**: Components like `MessageReactions` auto-fetch data via API.
- **Targeted Cache Management**: React Query cache invalidation is optimized for specific IDs.
- **Real-time UI Feedback**: Immediate visual feedback for user actions.
- **Separated Page Architecture**: Dedicated pages for `inventory` and `orders`.
- **Department-Specific Access**: Role-based access controls for relevant systems.
- **Consistent Navigation**: Multiple navigation paths via headers, quick actions, and back buttons.
- **Authentication-First Design**: All endpoints require proper authentication.
- **Production Deployment Ready**: System optimized for deployment.

**Page Structure:**
- `/admin` - Main admin dashboard.
- `/inventory` - Inventory management.
- `/orders` - Order processing.
- `/accounting` - Financial management.
- `/communications` - SMS messaging and announcements.
- `/employees` - Staff management.
- `/shift-scheduling` - Work schedule management.

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