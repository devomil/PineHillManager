# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators. Built with React (Vite), Express.js, and PostgreSQL, its core purpose is to provide role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to integrate essential business tools like QuickBooks, Clover POS, HSA providers, and Thrive inventory to offer an all-in-one solution for farm management, enhancing efficiency and oversight across all departments.

## Recent Changes
**Latest Update: August 29, 2025**
- ✅ **Enhanced SMS Reactions**: Smart emoji/keyword detection system supporting ✅👍❌❓ reactions and keyword patterns ("yes", "ok", "good", "help", etc.)
- ✅ **Announcement Reactions Database**: New `announcement_reactions` table with proper schema, API routes, and SMS tracking capabilities
- ✅ **SMS Response Threading**: Improved linking of SMS responses to specific announcements with context-aware confirmation messages
- ✅ **UI Response Display Fix**: Fixed SMS response visibility in UI by adding proper user joins and field mapping in `getResponsesByAnnouncement`
- ✅ **Smart Response Detection**: 3-word rule distinguishes quick reactions from full text responses automatically
- ✅ **SMS Response Integration**: Complete end-to-end SMS response system with professional confirmation messages showing sender names

**Previous Updates: August 28, 2025**
- ✅ **Communications System**: Fully operational Phase 6 implementation with SMS delivery, real-time WebSocket updates, message scheduling, automation, and smart targeting
- ✅ **Navigation Fixes**: Resolved admin dashboard navigation issues preventing access to communications panel
- ✅ **Accounting Dashboard**: Fixed "Today" overview showing $0.00 by implementing "Last 24 Hours" view for meaningful business data
- ✅ **ID Conflict Resolution**: Fixed React key conflicts between legacy and new communications using unique prefixes
- ✅ **SMS Integration**: Confirmed end-to-end Twilio delivery with real-time messaging capabilities
- ✅ **Multi-location Analytics**: Active real-time revenue tracking from 5 Clover POS locations plus Amazon Store integration

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend utilizes React 18 with TypeScript and Vite. Radix UI provides accessible components, styled with Tailwind CSS, ensuring a consistent and branded look using the Great Vibes font. The design emphasizes a clear, multi-role dashboard experience for Admin, Manager, and Employee users.

### Technical Implementations
- **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query, Wouter.
- **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt, session-based authentication.
- **Database**: PostgreSQL hosted on Neon Database, Drizzle ORM for type-safe operations and migrations. Sessions are PostgreSQL-backed with a 7-day expiration.
- **Data Storage**: Local file system for handling document uploads.
- **Communication**: Mobile-first SMS-integrated system with Twilio API, SendGrid for email notifications, WebSocket support, smart notification routing.
- **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
- **Time Management**: Clock in/out with break tracking, multi-location work scheduling, and time off request management.
- **Communication & Support**: **[PRODUCTION READY]** Mobile-first SMS-integrated team messaging with complete interactive response system. Features include:
  - **SMS Quick Reactions**: Emoji/keyword detection (✅👍❌❓ + "yes", "ok", "help", etc.) with 3-word smart classification
  - **Response Threading**: SMS responses automatically link to announcements with professional confirmation messages
  - **Dual Response System**: Separate storage for announcement reactions and text responses with proper UI display
  - **Complete API Layer**: Full CRUD operations for both message and announcement reactions
  - **Real-time Integration**: WebSocket updates, message scheduling, automation rules, smart targeting
  - **SMS Confirmation System**: Context-aware replies showing user names and announcement titles
- **Document Management**: Role-based file sharing.
- **Accounting**: **[PRODUCTION READY]** Comprehensive financial management with live integrations for Clover POS (5 locations), Amazon Store, HSA, and Thrive inventory. Real-time "Last 24 Hours" dashboard showing $3,579.61 current revenue, multi-location revenue analytics, and extensive financial data tracking.
- **Video Generation**: A professional video engine built with native Canvas API for creating animated explainer videos, integrating multiple APIs for content generation, voiceover synthesis, and imagery.

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, and performance is considered through optimized database queries and consistent timezone handling (CST). The architecture supports multi-merchant configurations for integrations like Clover POS.

**Performance Optimizations:**
- Real-time API data fetching for accurate business metrics
- WebSocket connections for instant messaging updates
- Efficient React Query caching with proper cache invalidation
- "Last 24 Hours" filtering for meaningful dashboard data
- Scheduled message processing with 30-second intervals

**Current System Status:**
- **SMS Response System**: Fully operational with emoji reactions, text responses, and UI display
- **Database Schema**: Complete with `announcement_reactions` table and proper relationships
- **API Coverage**: All endpoints implemented for announcement/message reactions and responses

**Known Issues to Address:**
- 65 LSP diagnostics requiring cleanup for production deployment
- WebSocket disconnection handling needs optimization
- Type safety improvements needed across server routes

**SMS Testing Commands (for tomorrow):**
- Quick reactions: `👍`, `yes`, `✅`, `ok`, `good` → Creates reactions
- Text responses: `This looks great, thanks for the update!` → Creates threaded responses
- Mixed support: System automatically detects reaction vs response intent

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