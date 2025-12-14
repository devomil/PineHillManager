# Video Production System: Implementation Checklist

## Overview

Implementation order (as specified in the guide):
1. **Phase 3 FIRST (Critical)** - Chunked rendering to solve timeout issues ✅ COMPLETE
2. **Phase 2** - Enhanced user controls (overlay, voiceover, music) ⬅️ NEXT
3. **Phase 4** - Polish & optimization features
4. **AWS Architecture** - Future migration path (longer-term)

---

## Prerequisites

- [x] Verify FFmpeg is available in `replit.nix`
- [x] Ensure `/tmp/video-chunks` directory can be created
- [x] Verify AWS S3 credentials are configured (`REMOTION_AWS_ACCESS_KEY_ID`, `REMOTION_AWS_SECRET_ACCESS_KEY`)

---

# PHASE 3: Chunked Rendering (CRITICAL - DO FIRST) ✅ COMPLETE

> This phase solves timeout issues by breaking long videos into 2-minute chunks that Lambda can handle.

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `server/services/chunked-render-service.ts` | **CREATED** | New service for chunked video rendering |
| `server/routes/universal-video-routes.ts` | **MODIFIED** | Added chunked rendering logic to render endpoint |
| `replit.nix` | **VERIFIED** | FFmpeg already available |

## 3.1 Chunked Render Service ✅ COMPLETE

**File:** `server/services/chunked-render-service.ts`

### Types Created
- [x] `ChunkConfig` interface
  - `chunkIndex: number`
  - `startFrame: number`
  - `endFrame: number`
  - `scenes: any[]`
  - `startTimeSeconds: number`
  - `endTimeSeconds: number`

- [x] `ChunkResult` interface
  - `chunkIndex: number`
  - `s3Url: string`
  - `localPath: string`
  - `success: boolean`
  - `error?: string`
  - `renderTimeMs?: number`

- [x] `ChunkedRenderProgress` interface
  - `phase: 'preparing' | 'rendering' | 'downloading' | 'concatenating' | 'uploading' | 'complete' | 'error'`
  - `totalChunks: number`
  - `completedChunks: number`
  - `currentChunk?: number`
  - `overallPercent: number`
  - `message: string`
  - `error?: string`

### ChunkedRenderService Class Methods ✅
- [x] Constructor with temp directory setup
- [x] `getS3Client()` - Lazy S3Client initialization (reads credentials on demand)
- [x] `calculateChunks(scenes, fps, maxChunkDurationSec)` - Calculate optimal chunk configuration with cumulative timing
- [x] `renderChunk(chunk, inputProps, compositionId)` - Render single chunk using Lambda
- [x] `downloadChunk(s3Url, chunkIndex)` - Download chunk from S3 to local temp storage
- [x] `concatenateChunks(chunkPaths, outputPath)` - Concatenate chunks using FFmpeg
- [x] `uploadFinalVideo(localPath, projectId)` - Upload final video to S3
- [x] `cleanupTempFiles(paths)` - Clean up temporary files
- [x] `renderLongVideo(projectId, inputProps, compositionId, onProgress)` - Main entry point
- [x] `shouldUseChunkedRendering(scenes, thresholdSeconds)` - Determine if chunked rendering needed

### Export ✅
- [x] Export `chunkedRenderService` singleton instance

### Key Implementation Details
- **Lazy S3 Initialization**: S3Client created on first use via `getS3Client()` to avoid startup credential issues
- **Cumulative Timing**: `calculateChunks()` tracks `globalFrame` and `globalTime` for proper audio sync
- **Error Handling**: Nested try-catch in background IIFE for robust error persistence
- **Chunk Size**: Default 120 seconds max per chunk, threshold 90 seconds to trigger chunked mode

---

## 3.2 Update Render Route ✅ COMPLETE

**File:** `server/routes/universal-video-routes.ts`

- [x] Import `chunkedRenderService` from chunked-render-service
- [x] Update `/api/universal-video/projects/:projectId/render` endpoint:
  - [x] Calculate total duration from scenes
  - [x] Call `shouldUseChunkedRendering()` with 90-second threshold
  - [x] If chunked: use `renderLongVideo()` with progress callback
  - [x] If standard: use existing Lambda render
  - [x] Update project status and progress during render
  - [x] Return render method (`chunked` or `standard`) in response
  - [x] **Non-blocking**: Response sent immediately, background IIFE handles rendering
  - [x] **Explicit return**: Handler exits after response to prevent double-response

### Key Implementation Details
- **Lines 561-641**: Chunked rendering branch
- **Line 583-588**: Immediate response to client
- **Lines 593-627**: Background IIFE for async rendering
- **Line 628**: Explicit `return` to exit handler

---

# PHASE 2: Enhanced User Controls ⬅️ NEXT PHASE

## 2.1 Product Overlay Editor

### Backend Updates

**File:** `server/services/universal-video-service.ts`

- [ ] Add `updateProductOverlay(project, sceneId, settings)` method
  - Settings: `position`, `scale`, `animation`, `enabled`
  - Position: `{ x: 'left' | 'center' | 'right', y: 'top' | 'center' | 'bottom' }`
  - Animation: `'fade' | 'zoom' | 'slide' | 'none'`
  - Default scale: 0.4

### API Endpoint

**File:** `server/routes/universal-video-routes.ts`

- [ ] Add `PATCH /api/universal-video/projects/:projectId/scenes/:sceneId/product-overlay`
  - Request body: `{ position, scale, animation, enabled }`
  - Call `updateProductOverlay()` on service
  - Save project after update
  - Return updated project

### Frontend Component

**File:** `client/src/components/universal-video-producer.tsx`

- [ ] Create `ProductOverlayEditor` component
  - Props: `scene`, `projectId`, `onUpdate`
  - State: `enabled`, `x`, `y`, `scale`, `animation`, `saving`
  - UI Elements:
    - [ ] Switch for "Show Product Overlay"
    - [ ] Select for Horizontal Position (left/center/right)
    - [ ] Select for Vertical Position (top/center/bottom)
    - [ ] Slider for Size (10%-80%)
    - [ ] Select for Animation (fade/zoom/slide/none)
    - [ ] Save button

---

## 2.2 Voiceover Regeneration

### Backend Method

**File:** `server/services/universal-video-service.ts`

- [ ] Add `regenerateVoiceover(project, options)` method
  - Options: `voiceId`, `sceneIds` (optional - regenerate all if not provided)
  - Collect narration text from scenes
  - Call existing `generateVoiceover()` method
  - Return: `{ success, newVoiceoverUrl, duration, error }`

### API Endpoint

**File:** `server/routes/universal-video-routes.ts`

- [ ] Add `POST /api/universal-video/projects/:projectId/regenerate-voiceover`
  - Request body: `{ voiceId, sceneIds }`
  - Call `regenerateVoiceover()` on service
  - Update project's `assets.voiceover.fullTrackUrl` and `duration`
  - Update `project.voiceId` if new voice selected
  - Save and return project

### Frontend Component

**File:** `client/src/components/universal-video-producer.tsx`

- [ ] Create voiceover regeneration UI
  - Voice selector dropdown
  - Scene selection (optional)
  - Regenerate button
  - Loading state

---

## 2.3 Music Controls

### Backend Methods

**File:** `server/services/universal-video-service.ts`

- [ ] Add `regenerateMusic(project, style)` method
  - Calculate total duration from scenes
  - Call existing `generateBackgroundMusic()` method
  - Return: `{ success, newMusicUrl, duration, error }`

- [ ] Add `updateMusicVolume(project, volume)` method
  - Clamp volume between 0 and 1
  - Update `project.assets.music.volume`

- [ ] Add `disableMusic(project)` method
  - Set `project.assets.music = { url: '', duration: 0, volume: 0 }`

### API Endpoints

**File:** `server/routes/universal-video-routes.ts`

- [ ] Add `POST /api/universal-video/projects/:projectId/regenerate-music`
  - Request body: `{ style }`

- [ ] Add `PATCH /api/universal-video/projects/:projectId/music-volume`
  - Request body: `{ volume }`

- [ ] Add `DELETE /api/universal-video/projects/:projectId/music`
  - Disable music for project

### Frontend Component

**File:** `client/src/components/universal-video-producer.tsx`

- [ ] Create music controls UI
  - Style selector (dropdown with music styles)
  - Volume slider (0-100%)
  - Regenerate button
  - Disable/Enable toggle
  - Loading states

---

# PHASE 4: Polish & Optimization

## 4.1 Undo/Redo System

### Type Updates

**File:** `shared/video-types.ts`

- [ ] Add `ProjectHistoryEntry` interface
  - `id: string`
  - `timestamp: string`
  - `action: string`
  - `previousState: Partial<VideoProject>`

- [ ] Add to `VideoProject` interface
  - `history?: ProjectHistoryEntry[]`
  - `historyIndex?: number`

### Backend Implementation

**File:** `server/routes/universal-video-routes.ts`

- [ ] Add history tracking to project mutations
- [ ] Implement undo endpoint
- [ ] Implement redo endpoint

### Frontend Implementation

**File:** `client/src/components/universal-video-producer.tsx`

- [ ] Add undo/redo buttons to UI
- [ ] Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)

---

## 4.2 Scene Reordering

### API Endpoint

**File:** `server/routes/universal-video-routes.ts`

- [ ] Add `PATCH /api/universal-video/projects/:projectId/reorder-scenes`
  - Request body: `{ sceneOrder }` (array of scene IDs in new order)
  - Reorder scenes array based on provided order
  - Update scene `order` property
  - Save and return project

### Frontend Implementation

**File:** `client/src/components/universal-video-producer.tsx`

- [ ] Add drag-and-drop scene reordering using `@dnd-kit`
  - Sortable list of scenes
  - Visual drag handles
  - Drop indicator
  - Auto-save on reorder

---

## 4.3 Preview Generation

### Backend Method

**File:** `server/services/universal-video-service.ts`

- [ ] Add `generatePreview(project)` method
  - Render at 480p, 15fps for fast preview
  - Use `previewMode: true` in render props
  - Return preview URL

### Frontend Implementation

**File:** `client/src/components/universal-video-producer.tsx`

- [ ] Add "Generate Preview" button
- [ ] Preview player component
- [ ] Loading state during preview generation

---

# AWS BEST-IN-CLASS ARCHITECTURE (Future)

> This is a longer-term migration path for production-scale video rendering.

## Migration Path

### Phase A: Chunked Lambda (Immediate) ✅ COMPLETE
- [x] Implement chunked rendering (Phase 3 above)
- Keeps current Lambda infrastructure
- Solves timeout issues for videos up to ~20 minutes

### Phase B: Add SQS + Step Functions (1-2 weeks)
- [ ] Set up Amazon SQS queue for job decoupling
- [ ] Create AWS Step Functions workflow
- [ ] Add retry logic and monitoring

### Phase C: Add Fargate for Rendering (2-3 weeks)
- [ ] Create Dockerfile for Remotion render container
- [ ] Set up ECS Fargate cluster
- [ ] Move Remotion render to containers
- [ ] Enable parallel chunk rendering

### Phase D: Add MediaConvert (Optional)
- [ ] Set up AWS MediaConvert
- [ ] Professional output encoding
- [ ] Multiple format support (MP4, HLS)

### Phase E: Add CloudFront CDN
- [ ] Set up CloudFront distribution
- [ ] Configure signed URLs
- [ ] Global edge caching

---

## Cost Comparison

| Architecture | 100 Videos/Month (60s each) | 1000 Videos/Month |
|--------------|----------------------------|-------------------|
| Current Lambda-only | ~$15-20 | ~$150-200 |
| Chunked Lambda | ~$20-30 | ~$200-300 |
| Fargate + Step Functions | ~$40-60 | ~$300-500 |
| Full AWS Pipeline | ~$60-100 | ~$400-700 |

---

## Final Review

- [x] All Phase 3 chunked rendering tasks complete
- [ ] All Phase 2 user control tasks complete
- [ ] All Phase 4 polish tasks complete
- [ ] Architect review of all changes
- [ ] End-to-end testing of video rendering pipeline

---

## Changelog

### 2024-12-14: Phase 3 Complete
**Files Created:**
- `server/services/chunked-render-service.ts` - Complete chunked rendering service

**Files Modified:**
- `server/routes/universal-video-routes.ts` - Added chunked rendering detection and background processing

**Key Features Implemented:**
- Lazy S3 client initialization for credential flexibility
- Cumulative timing tracking across chunks for proper audio sync
- Non-blocking render endpoint (immediate response, background processing)
- FFmpeg concatenation of rendered chunks
- Automatic cleanup of temp files
- Progress callbacks for UI updates
