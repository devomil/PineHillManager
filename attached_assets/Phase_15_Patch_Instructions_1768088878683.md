# Instructions for Replit Agent: Phase 15 Patch

## Context

Phase 15G was implemented to force video generation for Premium/Ultra tiers. However, testing shows that **only B-Roll scenes** are generating video, while other scenes still generate images. The enforcement appears to only work for **regeneration**, not **initial generation**.

## The Problem

When user clicks "Generate Assets" with Premium tier selected:
- **Expected:** ALL 8 scenes generate as video
- **Actual:** 1 video (B-Roll) + 7 images

The quality tier enforcement is not being applied during initial generation.

---

## Your Task

### Step 1: Find the Initial Generation Entry Point

Search for the function that executes when "Generate Assets" button is clicked. Look for:

```
Files to check:
- server/services/generation-service.ts
- server/services/asset-generation-service.ts
- server/services/universal-video-service.ts
- server/routes/generate.ts

Function names to look for:
- generateAllAssets
- startGeneration
- generateProjectAssets
- processAllScenes
- handleGenerateRequest
```

### Step 2: Add Debug Logging First

Before making changes, add logging to understand the current flow:

```typescript
// At the START of the generation function:
console.log(`[DEBUG] Generation started`);
console.log(`[DEBUG] Quality tier received: ${qualityTier}`);
console.log(`[DEBUG] Project ID: ${project.id}`);

// Before EACH scene is processed:
console.log(`[DEBUG] Processing scene ${scene.id}, type: ${scene.sceneType}`);
console.log(`[DEBUG] Will generate: ${willGenerateVideo ? 'VIDEO' : 'IMAGE'}`);

// When making PiAPI call:
console.log(`[DEBUG] PiAPI call - task_type: ${taskType}, model: ${model}`);
```

Run a test generation and share the console output so we can see where the issue is.

### Step 3: Apply the Quality Tier Check

Once you've found the initial generation entry point, ensure this check exists:

```typescript
// This MUST be at the start of the initial generation loop
const qualityTier = options.qualityTier || project.qualityTier || 'standard';
const forceVideo = qualityTier === 'premium' || qualityTier === 'ultra';

if (forceVideo) {
  console.log(`[Generation] Premium/Ultra tier - forcing video for ALL scenes`);
}

// For EACH scene:
for (const scene of scenes) {
  if (forceVideo) {
    // MUST generate video, not image
    await generateVideo(scene, qualityTier);
  } else {
    // Standard tier - can use image for some scene types
    await generateBasedOnSceneType(scene);
  }
}
```

### Step 4: Verify Quality Tier is Passed from Frontend

Check the API endpoint that receives the generation request:

```typescript
// In server/routes/generate.ts or similar

router.post('/start', async (req, res) => {
  const { projectId, qualityTier } = req.body;
  
  // Log what was received
  console.log(`[API] qualityTier from request body: ${qualityTier}`);
  
  // Ensure it's passed to generation service
  await generateAllAssets(project, scenes, { 
    qualityTier  // ← This MUST be here
  });
});
```

Check the frontend mutation hook:

```typescript
// In client/src/hooks/useGenerateAssets.ts or similar

body: JSON.stringify({
  projectId,
  qualityTier,  // ← This MUST be included in the request body
})
```

### Step 5: Check for Early Returns or Bypasses

Look for code that might bypass the quality tier check:

```typescript
// BAD PATTERNS to look for:

// 1. Scene type check that overrides quality tier
if (scene.type !== 'b-roll') {
  return generateImage(scene);  // ← This bypasses Premium enforcement!
}

// 2. Missing quality tier in function signature
async function generateScene(scene) {  // ← No qualityTier parameter!
  // Can't enforce Premium because it doesn't know the tier
}

// 3. Hardcoded fallback
const mediaType = 'image';  // ← Always image, ignores tier
```

---

## Verification Steps

After making changes, verify with these checks:

### Check 1: Console Logging
Generate assets and look for these logs:
```
[Generation] Quality tier: premium
[Generation] Premium/Ultra tier - forcing video for ALL scenes
[Scene 1] Generating VIDEO (premium tier enforced)
[Scene 2] Generating VIDEO (premium tier enforced)
...
[Scene 8] Generating VIDEO (premium tier enforced)
```

### Check 2: PiAPI Dashboard
After generation, check PiAPI task history:
- Should see 8 `video_generation` tasks
- Should NOT see `txt2img` tasks (except possibly for thumbnails)

### Check 3: UI Verification
- All 8 scenes should show video player controls
- No scenes should show static images with Ken Burns

---

## Questions to Answer

Please report back with answers to:

1. **Where is the initial generation function?**
   - File path:
   - Function name:

2. **Is qualityTier being passed from frontend?**
   - Check request body in Network tab
   - Value seen:

3. **Is qualityTier received by backend?**
   - Add console.log in API route
   - Value logged:

4. **Is qualityTier used in generation loop?**
   - Is there a forceVideo check?
   - Where does it branch to image vs video?

5. **What does PiAPI show after generation?**
   - Number of video_generation tasks:
   - Number of txt2img tasks:

---

## Reference Document

The full technical specification is in:
**Phase_15_Patch_Initial_Generation.md**

This contains:
- Complete code examples
- All logging statements needed
- Expected behavior at each step
- Common issues and fixes

---

## Priority

This is a **critical fix**. The Premium tier is a paid feature that promises broadcast-quality video. Currently it's delivering slideshow-quality images. This needs to be resolved before users pay for Premium and receive image-based content.
