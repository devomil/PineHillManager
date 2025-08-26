# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive business management platform designed to streamline operations for employees, managers, and administrators. Built with React (Vite), Express.js, and PostgreSQL, its core purpose is to provide role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to integrate essential business tools like QuickBooks, Clover POS, HSA providers, and Thrive inventory to offer an all-in-one solution for farm management, enhancing efficiency and oversight across all departments.

## Recent Changes (August 25, 2025)
**NEW FEATURE: Mobile-First SMS-Integrated Communication System - FULLY IMPLEMENTED**
- COMPLETED: Transform communication system into mobile-first SMS-integrated platform where ALL employees can send messages to multiple team members and channels
- ENHANCED: Granular audience selection on announcements including "all employees", "employees only", "Admins & Managers", and individual/multiple selection options
- INTEGRATED: Comprehensive SMS notification system with Twilio integration supporting emergency, schedule, announcement, and reminder message types
- IMPLEMENTED: Smart notification routing system that sends both app notifications and SMS based on user preferences and work status
- ADDED: SMS consent management with opt-in/opt-out functionality and notification type preferences per user
- ENHANCED: Form submission UX with JavaScript fetch, loading states, toast notifications, and auto-refresh functionality
- CONFIGURED: Twilio SMS service with proper Account SID configuration and API integration
- VERIFIED: SMS system architecture working correctly - form submission, backend processing, Twilio integration, and user notifications all functional
- STATUS: Communication platform ready for production use once Twilio toll-free number verification is completed

**COMPLETED: Twilio Phone Number Configuration**
- NEW VERIFIED NUMBER: (262) 475-1882 with Phone Number SID PN603db8021e24f632ba312f16b01f421b
- CAMPAIGN REGISTERED: Campaign ID CMaf4adaa9bc67599e84cbb3b5fcf02225 linked to messaging service MG25a60c13d4ab41dcffc061b5f4e1644d
- BRAND REGISTRATION: BN71d7ca29d3fd80b582865559183876c8 approved for SMS delivery
- STATUS: Ready for production SMS messaging with proper carrier compliance

**Previous: Complete Inventory Management System Integration - FULLY IMPLEMENTED**
- COMPLETED: Comprehensive inventory management system integrated into accounting dashboard with new "Inventory" tab
- INTEGRATED: Full Clover inventory API endpoints: `/items`, `/item_stocks`, `/categories`, and individual stock lookup
- ENHANCED: Multi-location inventory tracking across all 5 Clover merchant locations with real-time data
- IMPLEMENTED: Inventory overview dashboard with total items, valuation, low stock alerts, and out-of-stock warnings
- ADDED: Three comprehensive inventory tabs:
  * Items tab: Product catalog with pricing, stock counts, and multi-location tracking
  * Stock Levels tab: Real-time inventory quantities with stock status indicators across locations
  * Categories tab: Product organization and category management
- RESOLVED: React console warnings for duplicate keys with unique key generation system
- ENHANCED: Stock data enrichment with full item details for complete inventory visibility
- VERIFIED: Real-time inventory data successfully displaying across all active Clover locations
- STATUS: Complete inventory management system fully functional with authentic Clover API integration

**Previous: Complete Accounting Dashboard Timezone Bug Resolution - FULLY RESOLVED**
- RESOLVED: Critical timezone bug causing both Revenue Analytics and Overview tab to show $0.00 despite active sales
- ROOT CAUSE: Date range parsing created invalid filter `2025-08-19T00:00:00.000Z - 2025-08-19T00:00:00.000Z` (both start and end at midnight)
- SOLUTION: Fixed server-side date parsing to set end date to 23:59:59.999Z for inclusive day filtering across all accounting endpoints
- VERIFIED: Both Revenue Analytics and Overview tab now display real-time sales data showing $1,681.05 from today's sales
- TECHNICAL FIX: Applied timezone corrections to:
  * `/api/accounting/analytics/revenue-trends` endpoint
  * `/api/accounting/analytics/location-revenue-trends` endpoint  
  * `/api/accounting/analytics/profit-loss` endpoint (Overview tab)
- ENHANCED: Overview tab now uses live Clover API data instead of empty database records
- STATUS: Complete accounting dashboard fully functional with authentic multi-location Clover data integration

**Previous: Complete Order Management Date Filtering System - FULLY RESOLVED**
- RESOLVED: Complete timezone conversion bug in frontend using UTC date methods (.getUTCFullYear(), .getUTCMonth(), .getUTCDate())
- RESOLVED: Clover API date filtering limitation by implementing server-side post-response filtering using modifiedTime comparison
- VERIFIED: "Today" filter correctly shows only orders from August 18th, "Yesterday" shows only August 17th orders
- ENHANCED: Comprehensive debugging system tracks date conversion from DateRangePicker through API response
- TECHNICAL SOLUTION: Combined UTC frontend formatting + server-side timestamp filtering for 100% accuracy
- TESTED: Multi-location filtering works correctly across all 5 Clover merchant locations
- STATUS: Date filtering system now production-ready and fully functional

**Previous: Enhanced Date Range Analytics Implementation - COMPLETED**
- COMPLETED: Comprehensive DateRangePicker component with predefined ranges (Last 7 days, Last 30 days, This Quarter, etc.)
- ENHANCED: API endpoints `/api/accounting/analytics/revenue-trends` and `/api/accounting/analytics/location-revenue-trends` now support custom date range filtering
- VERIFIED: Date range functionality working correctly - API calls show proper date parameter passing (e.g., `startDate=2025-08-01&endDate=2025-08-31`)
- MAINTAINED: Backward compatibility with existing period/year filtering while adding custom date range capability
- TESTED: Date range picker successfully filters authentic Clover data across all 5 active merchant locations
- DATA ACCURACY: System now provides flexible date range analysis for comparing against Clover dashboard reports (e.g., Lake Geneva $19,603.20 for Aug 1-18)

**Previous Navigation Structure & JSX Architecture Fix - COMPLETED**
- RESOLVED: Critical JSX adjacency errors that were preventing application from running
- FIXED: Duplicate content sections that caused structural conflicts in accounting dashboard
- REPOSITIONED: Navigation tabs (Overview, Chart of Accounts, Transactions, Reports, Revenue Analytics, Integrations) now properly display at top of accounting dashboard
- ENHANCED: Content sections now appear immediately below navigation tabs instead of at bottom of page
- MAINTAINED: All multi-location Clover integration functionality with 5 active locations
- CONFIRMED: Revenue Analytics and all navigation sections working correctly with improved user experience

**Previous Revenue Analytics Dashboard Enhancement (August 18, 2025)**
- COMPLETED: Enhanced Revenue Analytics with comprehensive visual charts for monthly, quarterly, and annual tracking
- ADDED: /api/accounting/analytics/revenue-trends endpoint for historical data analysis across all periods
- ADDED: /api/accounting/analytics/location-revenue-trends for detailed multi-location comparison analytics
- BUILT: Interactive Revenue Analytics tab with Recharts visualizations displaying real revenue data
- INTEGRATED: HSA badge indicators and location-specific performance metrics throughout analytics

**Previous Multi-Location Clover API Integration (August 14, 2025)**
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
- **Communication**: Mobile-first SMS-integrated system with Twilio API, SendGrid for email notifications, WebSocket support for real-time features, smart notification routing.
- **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
- **Time Management**: Clock in/out with break tracking, multi-location work scheduling (Lake Geneva, Watertown), and time off request management.
- **Communication & Support**: Mobile-first SMS-integrated team messaging, company announcements with granular audience selection, support ticket system with intelligent routing (HR issues to Jackie, Technical issues to Ryan), SMS and email notifications with user preference management.
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
-   **SMS Service**: Twilio API (for SMS notifications and mobile-first communication).