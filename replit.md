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
-   **Database**: PostgreSQL hosted on Neon Database, utilizing Drizzle ORM.
-   **Data Storage**: Replit Object Storage (Google Cloud Storage) for announcement images with presigned URL uploads.
-   **Communication**: Mobile-first SMS integration via Twilio API, SendGrid for email, and WebSockets for real-time features.
-   **Authentication**: Session-based, role-based access control (Admin, Manager, Employee), with employee invitation and password reset.

### Feature Specifications
-   **Time Management**: Includes clock in/out, break tracking, multi-location scheduling, time off requests, manual entry, "Scheduled vs Actual Hours" reporting, a drag-and-drop scheduling interface, PDF schedule generation, and a shift swap system with SMS notifications.
-   **Communication & Support**: Mobile-first SMS-integrated team messaging with interactive responses and real-time integration via WebSockets. Support ticket system with SMS notifications.
-   **Document Management**: Role-based access, upload, categorization, permissions, and audit trails.
-   **Inventory Management**: Integrates Clover POS and Thrive for a unified dashboard, real-time sync, profitability analytics, and enhanced CSV import.
-   **Order Management**: Comprehensive order processing with real-time analytics, payment tracking, and performance insights. Includes automated marketplace order sync from BigCommerce (every 15 minutes) and Amazon Seller Central (every 15 minutes) using SP-API with automatic token refresh.
-   **Accounting**: Integrates Clover POS, Amazon Store, HSA, and Thrive inventory for real-time revenue dashboards, multi-location analytics, COGS calculations, discount/refund reporting, automated Chart of Accounts, and QuickBooks Online integration. Features a cached financial reports system and a persistent job-based sync system for Clover historical data.
-   **Employee Purchase Portal**: Allows employees to scan and purchase inventory items using a monthly allowance, with real-time balance tracking, purchase history, role-based pricing, Clover payment integration, and automatic inventory deduction.
-   **Task Management System**: Role-based task creation, priority/due dates, assignees, checklists, status tracking, and comments.
-   **Training & Learning System**: Personalized learning paths, progress tracking, skill assessment, and AI-powered content generation.
-   **Goals Management System**: Supports personal, team, and company BHAGs with role-based permissions, an Idea Board, status tracking, and target dates.
-   **Purchasing & Vendor Management**: Admin/manager-only access for vendor profiles, purchase order creation with multi-line items, approval workflows, audit trails, and reporting. Integrates with the Chart of Accounts and features tab-based navigation for status filtering.
-   **Homer AI Business Intelligence**: Voice-enabled AI assistant for admin/manager users. Features natural language queries about revenue, profitability, and forecasts. Uses Claude Sonnet 4 for intelligent analysis and ElevenLabs for voice responses. Supports wake word activation ("Homer") via Web Speech API. Conversation history stored in `homer_conversations` table.
-   **AI Video Production System**: Marketing page feature for creating promotional videos, including a "Video Generation Priority Chain" (fal.ai, Runway Gen-4, Hugging Face, Stock B-roll) and "Image Generation Priority Chain" (fal.ai FLUX models, Stability AI, Hugging Face, Stock images). Features AI Visual Directions (Claude analysis, multiple alternatives, scene breakdown, user selection, constraint enforcement, approval workflow) and a Brand Assets Library for logo/watermark management. Includes a Quality Evaluation System with anatomical accuracy and defect detection, triggering auto-regeneration. Utilizes Remotion Lambda for server-side video rendering with multiple output formats. Video generation uses a persistent job queue system with background worker processing for asynchronous execution. The system integrates a `BrandAssetService` for smart resolution of brand assets from a database table. It includes a `brand-requirement-analyzer.ts` service to parse visual directions for brand asset requirements and a `brand-asset-matcher.ts` service to match these requirements against the Brand Media library. Product image generation uses Flux.1 via PiAPI. Scene analysis uses Claude Vision to analyze video frames and images for optimal composition and intelligent text placement. Smart Text Overlay Restoration detects and generates Remotion-compatible text overlays based on scene content. A `Brand Context Service` provides a centralized brand knowledge store and context formatters for AI injection, including a brand-aware script parsing service that injects Pine Hill Farm brand context into Claude Sonnet 4 for intelligent script analysis. An Image-to-Image Composition pipeline places real product photos into AI-generated backgrounds, and an Image-to-Video Pipeline animates composed product images into broadcast-quality video clips with cinematic motion. LegNext.ai integration provides multi-model image generation via their API. A Logo Composition System provides broadcast-quality logo placement using Remotion instead of AI generation for 100% accuracy, with services for logo asset selection from brand media library (primary, watermark, certification, partner types), placement calculation with safe zone margins, and Remotion props generation with animations (fade-in, slide-in, scale-up, pulse). A Workflow Orchestration System (Phase 14F) ties all Phase 14 components together into a unified pipeline that automatically routes scenes through the optimal workflow based on brand asset requirements. The orchestrator supports 6 workflow paths: standard (no brand assets), product-image (AI environment + composition), product-video (composition + I2V animation), logo-overlay-only (AI gen + logo), brand-asset-direct (location I2V), and product-hero (product photo I2V). Each scene is analyzed for brand requirements, matched against the Brand Media library, routed to the optimal path, and executed through the appropriate pipeline services. Phase 15G adds a Media Source Selector service (`media-source-selector.ts`) that forces T2V/I2V for Premium/Ultra quality tiers to ensure broadcast-quality motion instead of image slideshow effects, with `MediaTypeIndicator` and `QualityWarning` UI components for user feedback on generation types.

### System Design Choices
The system maintains a clear separation of concerns between frontend and backend. Authentication is session-based with robust password hashing. Data flow is optimized for clarity and performance through efficient database queries and consistent timezone handling. The architecture supports multi-merchant configurations and department-specific page access. Key optimizations include real-time API data fetching, React Query caching, and self-contained component design. All endpoints require proper authentication. Database migration follows a safe, incremental workflow. Automated inventory synchronization runs every 15 minutes.

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
-   **AI Video Production**: fal.ai (LongCat-Video, Wan 2.2, FLUX models), ElevenLabs (voiceover), Pexels/Pixabay/Unsplash (stock media), Runway Gen-4, Stability AI, Anthropic (Claude for visual directions), AWS (for Remotion Lambda), LegNext.ai, PiAPI (Veo 3.1, Kling, Luma I2V).

## Important Implementation Notes

### PiAPI Ephemeral Storage Upload (January 2026)
**CRITICAL**: The PiAPI upload endpoint at `https://upload.theapi.app/api/ephemeral_resource` expects **JSON with base64**, NOT multipart/form-data.

**Correct implementation:**
```typescript
const requestBody = {
  file_name: filename,    // NOT "filename"
  file_data: base64Data,  // NOT "file", raw base64 without data URI prefix
};

fetch('https://upload.theapi.app/api/ephemeral_resource', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  },
  body: JSON.stringify(requestBody),
});
```

**Common mistakes to avoid:**
- Using multipart/form-data (causes "No number after minus sign in JSON" error)
- Wrong parameter names: `file` instead of `file_data`, `filename` instead of `file_name`
- Including data URI prefix (`data:image/png;base64,`) - just send raw base64

### Phase 6R: Health-Focused Script Generation (January 2026)
The AI script generation now uses health-intelligent prompts with researched data:

**Key Services:**
- `health-script-context.ts`: Product knowledge base with FDA/FTC compliant claims, health statistics with sources, risk detection for risky claims
- `video-prompt-optimizer.ts`: Strips camera jargon (cinematic, 35mm, DOF), converts I2V prompts to motion-focused, applies emotional style hints

**Script Generation Improvements:**
- Automatic product type detection (immune, weight, sleep, joint, digestive support)
- Relevant health statistics injected into context
- Compliance warnings for potentially risky FDA/FTC claims
- Simple visual direction rules enforced (WHO doing WHAT, WHERE, with WHAT MOOD)

**Prompt Optimization:**
- Jargon patterns removed: cinematic, 35mm, shallow DOF, golden hour, film grain, etc.
- I2V prompts focus on motion/action, not scene description
- Provider-specific adjustments (Luma gets motion hints, Hailuo gets shortened prompts)
- Quality scoring with warnings for prompts under 70 score

**Good Prompt Example:**
```
"A woman in her 40s taking supplements with morning coffee in a sunny kitchen"
```

**Bad Prompt Example (automatically cleaned):**
```
"Cinematic shot with golden hour lighting, shallow depth of field, 35mm lens..."
```

### Phase 18F: Film Treatment Post-Processing (January 2026)
The video composition now includes cinematic post-processing effects via the `FilmTreatment` component system:

**Components (remotion/components/post-processing/):**
- `ColorGrading.tsx`: CSS filter-based color grading with 6 presets and intensity-based scaling
- `FilmGrain.tsx`: Animated noise overlay using SVG turbulence
- `Vignette.tsx`: Radial gradient edge darkening
- `Letterbox.tsx`: Cinematic aspect ratio bars (2.35:1, 2.39:1, 1.85:1)
- `FilmTreatment.tsx`: Wrapper component with preset configurations

**Color Grade Presets:**
- `warm-cinematic`: Orange/amber tones, high contrast (hero, cinematic styles)
- `cool-corporate`: Blue tones, neutral saturation (product, professional styles)
- `vibrant-lifestyle`: Saturated, bright (social, energetic styles)
- `moody-dramatic`: Desaturated, high contrast (documentary styles)
- `natural-organic`: Subtle warmth, minimal grading (lifestyle, educational styles)
- `luxury-elegant`: Muted saturation, subtle sepia (premium, luxury styles)

**Route Integration:**
- `filmTreatmentSettingsSchema` validates API requests
- Visual style auto-maps to appropriate preset (e.g., 'hero'→'warm-cinematic')
- Explicit `enabled: false` disables all film treatment effects

**Key Implementation Detail:**
ColorGrading uses CSS filter scaling (not opacity) to adjust intensity. Filter values are scaled toward neutral (1.0 for contrast/brightness, 0 for sepia/hue-rotate) based on intensity parameter.