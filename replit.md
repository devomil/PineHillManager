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
- **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive response, TCPA-compliant consent tracking, and real-time integration via WebSockets. SMS notifications include 2-3 sentence message previews and clickable links to https://PHFManager.co for viewing full messages.
- **Document Management**: Role-based file sharing.
- **Inventory Management**: Dedicated `/inventory` page with comprehensive dual-system tracking reconciling Clover POS (live inventory) and Thrive (vendor/cost data). Features include:
  - **Dual-System Dashboard**: Unified view showing sync status overview (synced items, discrepancies, unmatched items, missing vendor data) and profitability summary (average margin %, total inventory value, potential gross profit, top profitable items by margin).
  - **Sync Status Tab**: Real-time reconciliation tracking with visual indicators (✅ synced, ⚠️ discrepancy, ℹ️ unmatched). Displays matched items (Thrive ↔ Clover), unmatched Thrive items requiring manual matching, and Clover items missing vendor data. Filter by sync status (all/synced/discrepancy). 
  - **Profitability Analytics**: Item-level profitability analysis with margin %, markup %, unit profit, and gross profit calculations. Vendor-level analytics enhanced with average margin and markup percentages per vendor and location. Endpoints: `/api/accounting/inventory/profitability` (item-level), `/api/accounting/inventory/vendors` (vendor-level with profitability).
  - **Manual Matching Interface** (Admin-only): Comprehensive UI for linking unmatched Thrive items to Clover items. Features include: (1) "Match" button on unmatched items in Sync Status tab (visible only to admins), (2) Smart match suggestions dialog with multi-factor scoring algorithm (SKU exact match: 100, name exact: 80, partial name: 50, word overlap: 10/word, category: 20), (3) Visual score badges (green 80%+, yellow 50-79%, gray <50%), (4) Detailed item comparison showing SKU, location, category, and vendor data, (5) One-click match confirmation with automatic cache invalidation. Backend APIs: POST `/api/accounting/inventory/manual-match` to save matches, GET `/api/accounting/inventory/match-suggestions/:thriveItemId` to fetch scored suggestions. Storage interface methods: `getUnmatchedThriveItems()` (with conditional and() fix for Drizzle), `getUnmatchedThriveItemById()`, `updateUnmatchedThriveItem()`. Last implemented: October 10, 2025.
  - **CSV Import Enhancement**: Thrive CSV import now tracks sync status with fields: importSource, syncStatus, matchMethod, thriveQuantity, hasDiscrepancy, lastThriveImport. Unmatched items saved to unmatchedThriveItems table for reconciliation. Match methods: SKU+Location+Name, SKU+Location, Name+Location, SKU, Product+Location. Discrepancy detection when |Clover qty - Thrive qty| > 0.001.
  - **Core Stats**: Fully synced with Clover POS (5,981 items across 5 locations). Location tracking via `locationId` mapping. Out of 5,981 items, 143 have active stock (2.4%). Last import: October 10, 2025 (2,604 matched, 401 unmatched from 3,735 CSV rows).
- **Order Management**: Dedicated `/orders` page for comprehensive order processing with real-time analytics, payment tracking, and performance insights across all store locations. Critical performance optimization implemented: early date/location filtering before expensive financial calculations, reducing load times from 136+ seconds to 2-4 seconds (meeting 3-second SLA).
- **Accounting**: Comprehensive financial management with live integrations for Clover POS, Amazon Store, HSA, and Thrive inventory. Features real-time revenue dashboards, multi-location analytics, and fully operational COGS (Cost of Goods Sold) calculations with real-time cost tracking and gross profit analysis.
  - **🚨 CRITICAL: Discount Reporting (100% Accuracy Required)**: Discount calculation logic achieves exact match with Clover reports across all locations and date ranges. Implementation uses Clover's discount objects (both order-level and line-item level), calculates percentage discounts from pre-discount subtotal, and rounds each discount individually before summing. This logic is protected and requires authorization, regression testing, and validation before any modifications. Reports $0 for orders with no discount objects even if reconciliation shows difference (line items created at discounted price). Last validated: September 30, 2025. Location: `server/storage.ts` - `calculateOrderFinancialMetrics` method (lines 5567-5677).
  - **🚨 CRITICAL: Refund Tracking (Exact Match Required)**: Credit refund tracking matches Clover reports exactly across all date ranges. Clover's credit_refunds API endpoint has a critical limitation: it completely ignores createdTime.min/max parameters and returns ALL refunds regardless of date range. Implementation adds server-side date filtering (lines 7140-7156 in `server/routes.ts`) by checking each refund's createdTime against requested date range after fetching. Week definitions use Sunday-Saturday to align with Clover's reporting periods. Last validated: October 1, 2025. Verified: "Last Week" (Sept 21-27) shows 2 refunds totaling $262.96 matching Clover exactly.
  - **Amazon Product Fees & COGS**: Amazon order financials are calculated by fetching order items (SKU/ASIN) for each order during list transformation (`server/routes.ts` lines 6882-6944). System always requests FBA fees (`isAmazonFulfilled: true`) to provide consistent fee estimates across all products, even for MFN orders. Fee calculation hierarchy: SKU first → ASIN fallback if SKU returns $0. COGS matching uses hierarchy: SKU → ASIN → fuzzy name matching (Levenshtein ≤3) → 60% estimation fallback. Line items structure is built during transformation to enable COGS calculation. Amazon fees and COGS display correctly in Financial Analysis cards. Last implemented: October 2, 2025.
- **Video Generation**: A professional video engine built with native Canvas API for creating animated explainer videos, integrating multiple APIs for content generation, voiceover synthesis, and imagery.
- **Employee Purchase Portal**: Dedicated `/employee-purchases` page for employees to scan and purchase inventory items using their monthly employee purchase allowance. Features barcode/SKU/ASIN scanner input (compatible with USB barcode scanners), shopping cart with quantity management, real-time balance tracking, monthly allowance enforcement, and purchase history. Automatically displayed on employee dashboard when `employeePurchaseEnabled` benefit is activated. Last implemented: October 6, 2025.

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