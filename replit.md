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
- **Time Management**: Clock in/out, break tracking, multi-location scheduling, time off requests, manual time entry, and comprehensive Scheduled vs Actual Hours reporting. Includes a modern drag-and-drop scheduling interface, PDF schedule generation, and a comprehensive shift swap system with SMS notifications. **Shift Swap Notifications**: When an employee creates a shift swap request, SMS notifications are automatically sent to both selected employees (potential coverage) and all managers/admins with a direct approval link, shift details, and urgency level.
- **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive responses and TCPA-compliant consent tracking via Twilio, with real-time integration via WebSockets.
- **Document Management**: Comprehensive document center with dual interfaces for role-based access, supporting upload, categorization, permissions, and audit trails.
- **Inventory Management**: Dedicated `/inventory` page with dual-system tracking reconciling Clover POS (live inventory) and Thrive (vendor/cost data). Features include a unified dashboard, real-time sync status, profitability analytics, manual matching interface, and enhanced CSV import. Includes vendor analytics for purchasing negotiations.
- **Order Management**: Dedicated `/orders` page for comprehensive order processing with real-time analytics, payment tracking, and performance insights, optimized for fast page loads.
- **Accounting**: Comprehensive financial management with live integrations for Clover POS, Amazon Store, HSA, and Thrive inventory. Features real-time revenue dashboards, multi-location analytics, accurate COGS calculations, discount/refund reporting, automated Chart of Accounts, and QuickBooks Online integration. Includes a cached financial reports system for optimized historical data retrieval. **Clover Historical Sync**: Persistent job-based sync system with database-backed progress tracking (`sync_jobs` and `sync_checkpoints` tables), automatic crash recovery via startup hooks, exponential backoff retry logic (max 5 attempts), and React Query-driven UI with localStorage persistence and real-time polling. Admin-only endpoints ensure secure operation.
- **Employee Purchase Portal**: Dedicated `/employee-purchases` page for employees to scan and purchase inventory items using a monthly allowance, with real-time balance tracking and purchase history. Features role-based pricing, an enhanced shopping cart, Clover payment integration, and automatic inventory deduction.
- **Task Management System**: Comprehensive task management system with role-based access, supporting task creation, priority/due dates, assignees, checklists, status tracking, and comments.
- **Training & Learning System**: Comprehensive employee training platform with personalized learning paths, progress tracking, skill assessment, and AI-powered content generation.
- **Goals Management System**: Dedicated `/goals` page with comprehensive goal setting and tracking across three levels: My Goals (personal), Team Goals, and Company BHAGs. Features include goal creation/editing/archiving with role-based permissions (admin/manager for team/company goals, all users for personal goals), an Idea Board for collaborative goal suggestions, status tracking (not started/in progress/completed), target dates, and detailed descriptions.
- **Purchasing & Vendor Management**: Dedicated `/purchasing` page (admin/manager only) with comprehensive vendor and purchase order management. Features include vendor profiles with payment terms, credit limits, and contact details; purchase order creation with multi-line item support; approval workflow with role-based permissions; audit trail via purchase order events; and reporting dashboard with vendor spend analytics, purchase frequency, and payment compliance. **Chart of Accounts Integration**: Purchase orders can be linked to expense accounts from the Chart of Accounts for enhanced financial tracking. **Tab-Based Navigation**: Status filtering via tabs (All, Draft, Pending Approval, Approved, Rejected) for better UX. **Enhanced Approved PO Display**: Approved purchase orders show PO number, vendor, product line descriptions, creator name, and approver name for quick reference. Backend includes 5 database tables with creator/approver name joins and 23 API endpoints with full CRUD operations and Zod validation.

### System Design Choices
The system follows a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is designed for clarity, and performance is considered through optimized database queries and consistent timezone handling. The architecture supports multi-merchant configurations and department-specific page access. Key optimizations include real-time API data fetching, efficient React Query caching, and a self-contained component design. All endpoints require proper authentication. The database migration workflow emphasizes safety with detailed steps for planning, testing, and deployment, prioritizing small, incremental changes and thorough testing. **Automated Inventory Synchronization**: The system runs automated inventory sync every 15 minutes via scheduler (`server/services/inventory-sync-scheduler.ts`), syncing product data, costs, and stock quantities from Clover POS using the bulk `/item_stocks` endpoint to avoid API limitations and ensure efficient data retrieval.

### Known Limitations & Solutions

**Clover API Stock Endpoint Limitation**:  
The Clover API's per-item stock endpoint (`/v3/merchants/{merchantId}/inventory/items/{itemId}/stock`) returns "405 Method Not Allowed" for GET requests, as Clover designates this endpoint for POST/PUT mutations only. **Solution**: The system uses the bulk `/item_stocks?limit=1000&expand=item` endpoint instead, which fetches stock data for all items in batches of up to 1,000 records. This approach is more efficient (fewer API calls, better rate limiting) and provides accurate cost and quantity data. The inventory sync process is decoupled: items and pricing sync successfully even if stock data is temporarily unavailable, with items flagged via `stockSyncStatus` for observability. Items without detailed stock records fall back to the `stockCount` field when available.

**Chart of Accounts Tax & COGS Limitation**:  
The Chart of Accounts currently shows $0 for "Sales Tax Payable" and minimal values for "Cost of Goods Sold" because these values aren't being fully populated during Clover order sync. The Clover API's `taxAmount` field returns null/0, and not all inventory items are linked during sync to calculate cost_basis. **Current Behavior**: Sales Tax Payable and COGS read from `pos_sales.tax_amount` and `pos_sale_items.cost_basis` which are mostly $0. **Workaround**: Accurate tax and COGS data is available in the Accounting Overview dashboard which calculates values on-the-fly from order details using `calculateOrderFinancialMetrics`. **Future Solution**: Update order sync process to calculate and persist tax amounts from payment data and improve inventory item linking for accurate COGS calculation during sync.

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
-   **AI Video Production**: fal.ai (LongCat-Video, Wan 2.2), ElevenLabs (voiceover), Pexels/Pixabay/Unsplash (stock media)

## AI Video Production System

The marketing page (`/marketing`) includes an AI-orchestrated video production system for creating TV-quality promotional videos.

### Video Generation Priority Chain
1. **fal.ai** (Primary - highest quality):
   - LongCat-Video (13.6B params, 720p@30fps, minutes-long videos)
   - LongCat-Video-Distilled (faster variant)
   - Wan 2.2 A14B (MoE architecture, cinematic quality)
   - Wan 2.2 5B (efficient, runs on consumer GPUs)
2. **Runway Gen-4** (if API key configured)
3. **Hugging Face** (ModelScope, Zeroscope text-to-video models)
4. **Stock B-roll** (Pexels, Pixabay fallback)

### Image Generation Priority Chain
1. **fal.ai** (Primary - FLUX models):
   - FLUX Pro 1.1 (highest quality)
   - FLUX Dev
   - FLUX Schnell (fastest)
2. **Stability AI** (if API key valid)
3. **Hugging Face** (SDXL via router.huggingface.co)
4. **Stock images** (Pexels, Unsplash, Pixabay)

### Visual Directions Workflow
After a script is entered or generated, users can click "Generate AI Visual Directions" to have Claude analyze the script and suggest specific visuals for each scene section (Hook, Problem, Solution, Social Proof, CTA). Features include:
- **AI Analysis**: Claude analyzes script structure and suggests appropriate visuals for each section
- **Scene Breakdown**: Each section shows the script excerpt, suggested visual direction, shot type, mood, and motion notes
- **Review Interface**: Users can review, edit, or regenerate suggestions before production starts
- **Approval Workflow**: Users must approve the visual plan before starting video production
- **API Endpoint**: `POST /api/videos/ai-producer/suggest-visuals`

### Quality Evaluation System
The Evaluate phase includes enhanced quality checks:
- **Anatomical Accuracy Detection**: AI-generated images with human figures are checked for anatomical accuracy (score 0-100)
- **Defect Detection**: Specific checks for bent limbs, extra appendages, distorted faces, unnatural proportions
- **Auto-Regeneration**: Images with anatomicalScore < 85 or detected defects trigger automatic regeneration
- **Overall Quality Threshold**: 70/100 minimum score for asset approval

### Required Environment Variables
- `FAL_KEY` - fal.ai API key for LongCat-Video, Wan 2.2, and FLUX models
- `ELEVENLABS_API_KEY` - ElevenLabs for voiceover generation
- `HUGGINGFACE_API_TOKEN` - Hugging Face for backup image/video generation
- `PEXELS_API_KEY`, `PIXABAY_API_KEY`, `UNSPLASH_ACCESS_KEY` - Stock media APIs
- `ANTHROPIC_API_KEY` - Anthropic Claude for script analysis and visual direction suggestions

### API Endpoint Changes
- Hugging Face now uses `router.huggingface.co` (deprecated: `api-inference.huggingface.co`)