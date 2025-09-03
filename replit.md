# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators. Built with React (Vite), Express.js, and PostgreSQL, its core purpose is to provide role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to integrate essential business tools like QuickBooks, Clover POS, HSA providers, and Thrive inventory to offer an all-in-one solution for farm management, enhancing efficiency and oversight across all departments.

## Recent Changes
**Latest Update: September 3, 2025**
- ✅ **Announcements Auto-Save Fix**: Resolved critical issue where announcements weren't saving to database automatically
- ✅ **Field Name Routing**: Fixed UI field name mismatch (`data.type` vs `data.messageType`) that caused wrong endpoint routing
- ✅ **SMS Threading Automation**: Announcements now automatically route to `/api/announcements` for proper database storage and SMS targeting
- ✅ **Database Persistence**: Eliminated need for manual database intervention - all announcements save automatically with `action: 'publish'`
- ✅ **Endpoint Segregation**: Clear separation between announcement creation (`/api/announcements`) and message creation (`/api/communications/send`)
- ✅ **Production Tested**: Confirmed working with live announcement creation, database storage, and SMS delivery

**Previous Update: September 2, 2025**
- ✅ **Accounting Dashboard Fix**: Resolved all Monthly Business Intelligence sections showing $0.00 instead of live financial data
- ✅ **Data Source Integration**: Fixed BI calculations to use working `monthlyCogsData` API instead of broken profitLoss endpoints
- ✅ **JavaScript Error Resolution**: Fixed "Cannot access before initialization" error that caused white screen crashes
- ✅ **Live Financial Metrics**: All dashboard sections now display consistent live revenue data ($2676.60 today, $4158.61 month-to-date)
- ✅ **API Performance**: All 6 location integrations confirmed working with 200 status codes and real transaction data
- ✅ **Production Deployment Ready**: System fully tested, restarted successfully, and ready for deployment

**Previous Update: August 30, 2025**
- ✅ **Modular Page Architecture**: Successfully separated combined inventory-orders page into dedicated `/inventory` and `/orders` pages for department-specific employee access
- ✅ **Enhanced Navigation System**: Added Inventory and Orders tabs to header navigation with proper routing and tab highlighting
- ✅ **Admin Quick Actions**: Created dedicated quick action cards for both Inventory Management and Order Management with working navigation
- ✅ **Role-Based Access Controls**: Implemented granular department-specific access for inventory and order management pages
- ✅ **Back Navigation**: Added "Back to Dashboard" buttons to both pages for seamless navigation flow
- ✅ **API Preservation**: Maintained all existing endpoints including inventory sync, order management, analytics, and webhooks

**Previous Updates: August 29, 2025**
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
- **Communication & Support**: **[PRODUCTION READY]** Mobile-first SMS-integrated team messaging with complete interactive response system. Features include:
  - **SMS Quick Reactions**: Emoji/keyword detection (✅👍❌❓ + "yes", "ok", "help", etc.) with 3-word smart classification
  - **Response Threading**: SMS responses automatically link to announcements with professional confirmation messages
  - **Dual Response System**: Separate storage for announcement reactions and text responses with proper UI display
  - **Complete API Layer**: Full CRUD operations for both message and announcement reactions
  - **Real-time Integration**: WebSocket updates, message scheduling, automation rules, smart targeting
  - **SMS Confirmation System**: Context-aware replies showing user names and announcement titles
- **Document Management**: Role-based file sharing.
- **Inventory Management**: **[PRODUCTION READY]** Dedicated `/inventory` page with comprehensive inventory tracking, real-time stock levels, categories, and analytics across all locations. Includes inventory sync capabilities and role-based access controls.
- **Order Management**: **[PRODUCTION READY]** Dedicated `/orders` page for comprehensive order processing with real-time analytics, payment tracking, and performance insights across all store locations.
- **Accounting**: **[PRODUCTION READY]** Comprehensive financial management with live integrations for Clover POS (5 locations), Amazon Store, HSA, and Thrive inventory. Real-time "Last 24 Hours" dashboard showing current revenue, multi-location revenue analytics, and extensive financial data tracking.
- **Video Generation**: A professional video engine built with native Canvas API for creating animated explainer videos, integrating multiple APIs for content generation, voiceover synthesis, and imagery.

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, and performance is considered through optimized database queries and consistent timezone handling (CST). The architecture supports multi-merchant configurations for integrations like Clover POS and department-specific page access for enhanced security and user experience.

**Performance Optimizations:**
- Real-time API data fetching for accurate business metrics
- WebSocket connections for instant messaging updates
- Efficient React Query caching with proper cache invalidation
- "Last 24 Hours" filtering for meaningful dashboard data
- Scheduled message processing with 30-second intervals
- Modular page architecture for improved load times and user experience

**Current System Status:**
- **Accounting Dashboard**: **[FULLY OPERATIONAL]** All Monthly Business Intelligence sections display live financial data correctly
- **Financial Data Integration**: All 6 location APIs working with real transaction data (Clover POS + Amazon Store)
- **Live Revenue Tracking**: Today $2676.60, Month-to-date $4158.61, all sections showing consistent data
- **JavaScript/React**: Fixed all initialization errors, clean console, no white screen crashes
- **SMS Response System**: Fully operational with emoji reactions, text responses, and UI display
- **Database Schema**: Complete with `announcement_reactions` table and proper relationships
- **API Coverage**: All endpoints implemented for announcement/message reactions and responses
- **Modular Page Structure**: Dedicated inventory and order management pages with role-based access
- **Navigation System**: Complete header navigation with tab highlighting and quick action cards
- **Production Build**: Successfully builds without errors, workflow restarted, ready for deployment

**Architecture Decisions:**
- **Separated Page Architecture**: Split combined inventory-orders functionality into dedicated `/inventory` and `/orders` pages
- **Department-Specific Access**: Role-based access controls allow employees to access only relevant systems (Inventory vs Orders departments)
- **Consistent Navigation**: Header tabs, quick actions, and back buttons provide multiple navigation paths
- **API Preservation**: All existing endpoints maintained for backward compatibility and integration support

**Page Structure:**
- `/admin` - Main admin dashboard with quick actions and overview
- `/inventory` - Dedicated inventory management with sync capabilities 
- `/orders` - Dedicated order processing and analytics
- `/accounting` - Financial management and integration dashboard
- `/communications` - SMS messaging and announcement system
- `/employees` - Staff management and permissions
- `/shift-scheduling` - Work schedule management

**Navigation Enhancements (August 30, 2025):**
- Header tab navigation with proper highlighting for Inventory and Orders
- Quick action cards for direct access to management systems
- Back to Dashboard buttons on all dedicated pages
- Mobile-responsive navigation with collapsible menu options

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