# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators. Built with React (Vite), Express.js, and PostgreSQL, its core purpose is to provide role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to integrate essential business tools like QuickBooks, Clover POS, HSA providers, and Thrive inventory to offer an all-in-one solution for farm management, enhancing efficiency and oversight across all departments.

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
- **Communication & Support**: Mobile-first SMS-integrated team messaging with complete interactive response and reaction system. Features include:
    - Interactive Reaction System: One-click thumbs-up, checkmark, X, and question mark reactions with immediate visual feedback and database persistence.
    - Auto-Fetching Components: MessageReactions component automatically loads existing reactions from API with real-time updates.
    - SMS Quick Reactions: Emoji/keyword detection (✅👍❌❓ + "yes", "ok", "help", etc.) with 3-word smart classification.
    - Response Threading: SMS responses automatically link to announcements with professional confirmation messages.
    - Dual Response System: Separate storage for announcement reactions and text responses with proper UI display.
    - Complete API Layer: Full CRUD operations for both message and announcement reactions via dedicated endpoints.
    - Real-time Integration: WebSocket updates, message scheduling, automation rules, smart targeting with instant cache invalidation.
    - SMS Confirmation System: Context-aware replies showing user names and announcement titles.
- **Document Management**: Role-based file sharing.
- **Inventory Management**: Dedicated `/inventory` page with comprehensive inventory tracking, real-time stock levels, categories, and analytics across all locations. Includes inventory sync capabilities and role-based access controls.
- **Order Management**: Dedicated `/orders` page for comprehensive order processing with real-time analytics, payment tracking, and performance insights across all store locations.
- **Accounting**: Comprehensive financial management with live integrations for Clover POS (5 locations), Amazon Store, HSA, and Thrive inventory. Real-time "Last 24 Hours" dashboard showing current revenue, multi-location revenue analytics, and extensive financial data tracking.
- **Video Generation**: A professional video engine built with native Canvas API for creating animated explainer videos, integrating multiple APIs for content generation, voiceover synthesis, and imagery.

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, and performance is considered through optimized database queries and consistent timezone handling (CST). The architecture supports multi-merchant configurations for integrations like Clover POS and department-specific page access for enhanced security and user experience.

**Performance Optimizations:**
- Real-time API data fetching for accurate business metrics.
- WebSocket connections for instant messaging updates.
- Efficient React Query caching with proper cache invalidation and immediate reaction updates.
- Auto-fetching component architecture eliminating prop-drilling and improving data consistency.
- Optimized reaction queries with targeted cache invalidation for specific announcement/message IDs.
- "Last 24 Hours" filtering for meaningful dashboard data.
- Scheduled message processing with 30-second intervals.
- Modular page architecture for improved load times and user experience.
- Component-level state management reducing unnecessary re-renders.

**Architecture Decisions:**
- **Self-Contained Component Design**: MessageReactions component redesigned to auto-fetch data via API instead of relying on props, improving maintainability and data consistency.
- **Targeted Cache Management**: React Query cache invalidation optimized for specific announcement/message IDs rather than broad invalidation patterns.
- **Real-time UI Feedback**: Immediate visual feedback for reactions while database operations complete in background.
- **Separated Page Architecture**: Split combined inventory-orders functionality into dedicated `/inventory` and `/orders` pages.
- **Department-Specific Access**: Role-based access controls allow employees to access only relevant systems (Inventory vs Orders departments).
- **Consistent Navigation**: Header tabs, quick actions, and back buttons provide multiple navigation paths.
- **API Preservation**: All existing endpoints maintained for backward compatibility and integration support.

**Page Structure:**
- `/admin` - Main admin dashboard with quick actions and overview.
- `/inventory` - Dedicated inventory management with sync capabilities.
- `/orders` - Dedicated order processing and analytics.
- `/accounting` - Financial management and integration dashboard.
- `/communications` - SMS messaging and announcement system.
- `/employees` - Staff management and permissions.
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