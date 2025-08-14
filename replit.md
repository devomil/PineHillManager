# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive business management platform designed to streamline operations for employees, managers, and administrators. Built with React (Vite), Express.js, and PostgreSQL, its core purpose is to provide role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to integrate essential business tools like QuickBooks, Clover POS, HSA providers, and Thrive inventory to offer an all-in-one solution for farm management, enhancing efficiency and oversight across all departments.

## Recent Changes (August 14, 2025)
**Multi-Location Clover API Integration - CRITICAL FIX COMPLETED**
- RESOLVED: Multi-location sync API token issue where all locations were using same Lake Geneva token
- Updated database with unique API tokens for each location:
  * Lake Geneva Retail (MID: 2DWZED6B4ZVF1): Token ending in 365f
  * Watertown Retail (MID: QGFXZQXYG8M31): Token ending in 43d8  
  * Pinehillfarm.co Online (MID: 5H4F64FPMCQF1): Token ending in 0cb7
  * Lake Geneva - HSA (MID: WXJ9BYH2QT1S1): Token ending in 19cf
  * Watertown HSA (MID: SM917VYCVDZH1): Token ending in ed0f
- Verified sync now pulls real sales data: Revenue increased from $16.60 to $423.76 after Watertown's $362.70 integrated
- Enhanced API connection testing with detailed logging and diagnostic capabilities
- Multi-location analytics now properly display all active locations with authentic sales data

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript and Vite for rapid development. Radix UI provides accessible components, styled with Tailwind CSS, ensuring a consistent and branded look using the Great Vibes font. The design emphasizes a clear, multi-role dashboard experience for Admin, Manager, and Employee users.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query for server state, Wouter for routing.
- **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt for password hashing, session-based authentication.
- **Database**: PostgreSQL hosted on Neon Database, Drizzle ORM for type-safe operations and migrations. Sessions are PostgreSQL-backed with a 7-day expiration.
- **Data Storage**: Local file system for handling document uploads.
- **Communication**: SendGrid for email notifications, WebSocket support for real-time features.
- **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
- **Time Management**: Clock in/out with break tracking, multi-location work scheduling (Lake Geneva, Watertown), and time off request management.
- **Communication & Support**: Team messaging, company announcements, support ticket system with intelligent routing (HR issues to Jackie, Technical issues to Ryan) and email notifications.
- **Document Management**: Role-based file sharing.
- **Accounting**: Comprehensive financial management with integrations for QuickBooks, Clover POS, HSA, and Thrive inventory. This includes extensive database schema for financial data, API routes, and a dedicated accounting dashboard.
- **Video Generation**: A professional video engine built with native Canvas API for creating animated explainer videos, integrating multiple APIs:
  - Hugging Face API (meta-llama/Llama-2-7b-chat-hf) for enhanced content generation
  - ElevenLabs API for professional voiceover synthesis with pharmaceutical-quality voices
  - Unsplash API for premium medical imagery
  - Canvas-based animation engine producing 30fps, 900-frame professional marketing videos

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, from user authentication to time tracking and support ticket processes. Error handling is comprehensive, and performance is considered through optimized database queries and consistent timezone handling (CST). The architecture supports multi-merchant configurations for integrations like Clover POS.

## External Dependencies

-   **Email Service**: SendGrid (for support tickets and notifications).
-   **Database Hosting**: Neon Database (for PostgreSQL).
-   **ORM**: Drizzle (for PostgreSQL interactions).
-   **UI Components**: Radix UI.
-   **Styling**: Tailwind CSS.
-   **Fonts**: Great Vibes (from Google Fonts).
-   **Development Tools**: TypeScript, Vite, React Query.
-   **Accounting Integrations**: QuickBooks, Clover POS (production API with multiple merchant support, e.g., Lake Geneva Retail, Watertown Retail, Pinehillfarm.co Online), HSA Providers, Thrive Inventory.
-   **Content Generation**: Hugging Face API (for video content generation).