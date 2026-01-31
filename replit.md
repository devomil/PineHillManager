# Pine Hill Farm Employee Management System

## Overview
The Pine Hill Farm Employee Management System is a comprehensive platform designed to streamline operations for employees, managers, and administrators. It provides role-based access for time tracking, scheduling, communication, support ticket management, and robust accounting. The system aims to be an all-in-one solution for farm management, enhancing efficiency and oversight across all departments by integrating essential business tools. The project has an ambitious goal of revolutionizing farm operations through advanced AI and automation.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The frontend uses React 18 with TypeScript and Vite, styled with Tailwind CSS and Radix UI for accessible components, using Poppins font throughout for consistent branding. The design features a modern, responsive sidebar navigation for admin/manager users (collapsible desktop, mobile hamburger menu) and a clear, multi-role dashboard experience for Admin, Manager, and Employee users.

### Technical Implementations
-   **Frontend**: React 18, TypeScript, Vite, Radix UI, Tailwind CSS, TanStack Query, Wouter.
-   **Backend**: Express.js, TypeScript, PostgreSQL with Drizzle ORM, bcrypt, session-based authentication.
-   **Database**: PostgreSQL hosted on Neon Database.
-   **Data Storage**: Replit Object Storage (Google Cloud Storage) for announcement images with presigned URL uploads.
-   **Communication**: Mobile-first SMS integration via Twilio API, SendGrid for email, and WebSockets for real-time features.
-   **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
-   **Time Management**: Includes clock in/out, break tracking, multi-location scheduling, time off requests, manual entry, "Scheduled vs Actual Hours" reporting, a drag-and-drop scheduling interface, PDF schedule generation, and a shift swap system with SMS notifications.
-   **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive responses and real-time integration via WebSockets. Support ticket system with SMS notifications.
-   **Document Management**: Role-based access, upload, categorization, permissions, and audit trails.
-   **Inventory Management**: Integrates Clover POS and Thrive for a unified dashboard, real-time sync, profitability analytics, and enhanced CSV import.
-   **Order Management**: Comprehensive order processing with real-time analytics, payment tracking, and performance insights. Includes automated marketplace order sync from BigCommerce and Amazon Seller Central using SP-API.
-   **Accounting**: Integrates Clover POS, Amazon Store, HSA, and Thrive inventory for real-time revenue dashboards, multi-location analytics, COGS calculations, discount/refund reporting, automated Chart of Accounts, and QuickBooks Online integration.
-   **Employee Purchase Portal**: Allows employees to scan and purchase inventory items using a monthly allowance, with real-time balance tracking, purchase history, role-based pricing, Clover payment integration, and automatic inventory deduction.
-   **Task Management System**: Role-based task creation, priority/due dates, assignees, checklists, status tracking, and comments.
-   **Training & Learning System**: Personalized learning paths, progress tracking, skill assessment, and AI-powered content generation.
-   **Goals Management System**: Supports personal, team, and company BHAGs with role-based permissions, an Idea Board, status tracking, and target dates.
-   **Purchasing & Vendor Management**: Admin/manager-only access for vendor profiles, purchase order creation with multi-line items, approval workflows, audit trails, and reporting.
-   **Homer AI Business Intelligence**: Voice-enabled AI assistant for admin/manager users. Features natural language queries about revenue, profitability, and forecasts. Uses Claude Sonnet 4 for intelligent analysis and ElevenLabs for voice responses.
-   **AI Video Production System**: Marketing page feature for creating promotional videos, including AI visual directions, brand asset management, a quality evaluation system, and server-side video rendering. It integrates various AI models for image and video generation (fal.ai, Runway Gen-4, Hugging Face, Stability AI, LegNext.ai, PiAPI) and uses Claude Vision for scene analysis and smart text overlay. A robust Workflow Orchestration System manages the entire video production pipeline based on scene requirements and quality tiers, incorporating cinematic post-processing effects and premium transitions.

### System Design Choices
The system maintains a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is optimized for clarity and performance through efficient database queries and consistent timezone handling. The architecture supports multi-merchant configurations and department-specific page access. Key optimizations include real-time API data fetching, React Query caching, and self-contained component design.

## External Dependencies

-   **Email Service**: SendGrid
-   **Database Hosting**: Neon Database
-   **ORM**: Drizzle
-   **UI Components**: Radix UI
-   **Styling**: Tailwind CSS
-   **Accounting Integrations**: QuickBooks, Clover POS, Amazon Store API, HSA Providers, Thrive Inventory, BigCommerce
-   **Content Generation**: Hugging Face API
-   **SMS Service**: Twilio API
-   **AI Video Production**: fal.ai (LongCat-Video, Wan 2.2, FLUX models), ElevenLabs (voiceover), Pexels/Pixabay/Unsplash (stock media), Runway Gen-4, Stability AI, Anthropic (Claude for visual directions and context), AWS (for Remotion Lambda), LegNext.ai, PiAPI (Veo 3.1, Kling, Luma I2V).

## Video Production Pipeline - Technical Details

### Phase 18G: Premium Transitions (January 2026)
Premium cinematic transitions for video production:

**Components (remotion/components/transitions/):**
- `LightLeak.tsx`: Warm/golden/cool light leak effects with animated multi-layer gradients
- `FilmBurn.tsx`: Vintage film burn effects with organic animated shapes
- `WhipPan.tsx`: Dynamic motion blur transitions with directional movement
- `ElegantDissolve.tsx`: Smooth dissolves with exponential easing and subtle scale effects
- `TransitionManager.tsx`: Central manager that handles all transition types

**Transition Types:** cut, fade, dissolve, elegant-dissolve, light-leak, light-leak-golden, light-leak-warm, film-burn, film-burn-classic, whip-pan, whip-pan-left, whip-pan-up, whip-pan-down

**Visual Style Mapping (server/config/visual-style-transitions.ts):**
- hero/cinematic/premium/luxury → light-leak-golden
- lifestyle → elegant-dissolve
- product → fade
- educational/training → dissolve
- social/energetic → whip-pan
- documentary → film-burn

### Phase 18H: Broadcast Composition Wrapper (January 2026)
Broadcast-quality composition wrapper:

**Files:**
- `remotion/BroadcastVideoComposition.tsx`: Wraps UniversalVideoComposition with FilmTreatment
- `server/utils/composition-selector.ts`: Utility for selecting composition based on render preset

**Compositions (registered in remotion/Root.tsx):**
- `BroadcastVideoComposition`: Primary 1920x1080@30fps production composition
- `PreviewComposition`: Fast preview 854x480@24fps with reduced effects
- `SocialVerticalComposition`: Vertical 1080x1920@30fps for TikTok/Reels

**Render Presets:**
- `preview`: Fast render, reduced quality (CRF 28)
- `broadcast-1080p`: Standard production (CRF 18)
- `social-vertical`: Vertical format (CRF 20)
- `premium-4k`: Ultra HD 3840x2160 (CRF 16)