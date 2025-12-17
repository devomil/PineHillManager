# Script-Based Long-Form Video Generation: Priority Instructions

## Executive Summary

The video production system has Phases 2, 3, and 4 implemented according to the checklist. However, **rendering is still failing** for videos. This document provides instructions to diagnose and fix the remaining issues, with a focus on enabling **script-based long-form video generation** for client-facing content.

### Real Script Analysis

The attached client script (`Real_Script.docx`) contains:
- **448 words** of narration
- **6 scenes** (Opening + Scenes 1-4 + Closing)
- **Estimated duration: ~180 seconds (3 minutes)** at 2.5 words/second

This is a **long-form video** that MUST use chunked rendering (threshold is 90 seconds).

---

## CRITICAL: Diagnose Current Render Failures

Before making changes, we need to understand WHY renders are failing. Please run these diagnostics:

### Step 1: Check Lambda Logs

```bash
# In the Replit shell, check recent Lambda errors
grep -i "error\|fail\|timeout" logs/*.log | tail -50

# Or check the server console for render-related errors
grep -i "render\|chunk\|lambda" logs/server.log | tail -100
```

### Step 2: Test Chunked Render Service

Create a test endpoint to verify the chunked render service works:

```typescript
// Add to server/routes/universal-video-routes.ts

router.get('/test-chunked-render', isAuthenticated, async (req: Request, res: Response) => {
  try {
    // Test that chunkedRenderService is properly initialized
    const testScenes = [
      { id: 'test1', duration: 30, narration: 'Test scene 1' },
      { id: 'test2', duration: 30, narration: 'Test scene 2' },
      { id: 'test3', duration: 30, narration: 'Test scene 3' },
      { id: 'test4', duration: 30, narration: 'Test scene 4' },
    ];
    
    const shouldChunk = chunkedRenderService.shouldUseChunkedRendering(testScenes, 90);
    const chunks = chunkedRenderService.calculateChunks(testScenes, 30, 120);
    
    res.json({
      success: true,
      shouldUseChunked: shouldChunk,
      totalDuration: 120,
      chunkCount: chunks.length,
      chunks: chunks.map(c => ({
        index: c.chunkIndex,
        scenes: c.scenes.length,
        startFrame: c.startFrame,
        endFrame: c.endFrame,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});
```

### Step 3: Verify FFmpeg Installation

```bash
# Check FFmpeg is available
which ffmpeg
ffmpeg -version

# If not installed, add to replit.nix:
# pkgs.ffmpeg
```

### Step 4: Check S3 Credentials

```bash
# Verify environment variables are set
echo "AWS Key ID present: ${REMOTION_AWS_ACCESS_KEY_ID:+yes}"
echo "AWS Secret present: ${REMOTION_AWS_SECRET_ACCESS_KEY:+yes}"
```

---

## Issue Analysis: Why Renders May Be Failing

Based on code review, here are the likely failure points:

### Issue 1: Chunked Rendering Background IIFE May Silently Fail

**Location:** `server/routes/universal-video-routes.ts` lines 593-627

**Problem:** The background IIFE for chunked rendering catches errors but may not properly persist them.

**Fix:**
```typescript
// In the chunked rendering branch, ensure errors are ALWAYS persisted
(async () => {
  try {
    const outputUrl = await chunkedRenderService.renderLongVideo(
      projectId,
      inputProps,
      compositionId,
      progressCallback
    );
    
    // ... success handling ...
  } catch (error: any) {
    console.error('[UniversalVideo] Chunked render failed:', error);
    
    // CRITICAL: Always update project status on failure
    try {
      const projectData = await getProjectFromDb(projectId);
      if (projectData) {
        projectData.status = 'error';
        projectData.progress.steps.rendering.status = 'error';
        projectData.progress.steps.rendering.message = error.message || 'Chunked render failed';
        projectData.progress.errors.push(`Chunked render failed: ${error.message}`);
        projectData.progress.serviceFailures.push({
          service: 'chunked-render',
          timestamp: new Date().toISOString(),
          error: error.message || 'Unknown error',
        });
        await saveProjectToDb(projectData, projectData.ownerId);
        console.log('[UniversalVideo] Error status persisted to database');
      }
    } catch (dbError) {
      console.error('[UniversalVideo] CRITICAL: Failed to persist error status:', dbError);
    }
  }
})();
```

### Issue 2: ChunkedRenderService renderLongVideo Returns String, Not Object

**Location:** `server/services/chunked-render-service.ts`

**Problem:** The `renderLongVideo` method should return the output URL but the code shows it might be returning an object.

**Current code expects:**
```typescript
const outputUrl = await chunkedRenderService.renderLongVideo(...);
```

**Verify the return type matches:**
```typescript
async renderLongVideo(
  projectId: string,
  inputProps: Record<string, any>,
  compositionId: string,
  onProgress?: (progress: ChunkedRenderProgress) => void
): Promise<string> {  // Should return string URL
  // ... implementation ...
  return finalUrl;  // Must return the S3 URL string
}
```

### Issue 3: Scene Duration Calculation for Script-Based Videos

**Problem:** Script-based videos may not be calculating scene durations correctly from narration.

**Location:** `server/services/universal-video-service.ts` - `parseScript` method

**The `parseScript` method calculates duration but it needs verification:**
```typescript
// Current calculation in parseScript
const baseDuration = (words / speakingRate) + bufferTime;

// Ensure this is applied correctly to each scene
```

---

## Priority Fix: Script Parsing Improvements

The `parseScript` method needs enhancement for better scene structure handling.

### Enhanced Script Parser

```typescript
async parseScript(input: ScriptVideoInput): Promise<Scene[]> {
  if (!this.anthropic) {
    throw new Error("Anthropic API not configured");
  }

  // Calculate expected duration from word count
  const totalWords = input.script.split(/\s+/).filter(Boolean).length;
  const expectedDuration = Math.ceil(totalWords / 2.5); // 2.5 words/second
  
  console.log(`[ParseScript] Input: ${totalWords} words, expected ${expectedDuration}s video`);

  const prompt = `Parse this video script into structured scenes for a ${expectedDuration}-second video:

"""
${input.script}
"""

IMPORTANT GUIDELINES:
1. Identify natural scene breaks (topic changes, new sections, "Scene X:" markers)
2. Each scene should be 15-45 seconds (37-112 words at 2.5 words/sec speaking rate)
3. DO NOT create scenes shorter than 10 seconds
4. DO NOT create scenes longer than 60 seconds - split them if needed
5. The total of all scene durations MUST equal approximately ${expectedDuration} seconds

Return JSON with this exact structure (no markdown, just pure JSON):
{
  "scenes": [
    {
      "type": "hook|intro|benefit|explanation|process|testimonial|brand|cta",
      "title": "Scene title or topic",
      "narration": "exact voiceover text for this scene - copy from script",
      "visualDirection": "specific description for AI image/video generation",
      "estimatedDuration": number (calculate from narration word count / 2.5)
    }
  ]
}

Scene Type Mapping:
- "Opening Scene" or "Hook" → type: "hook"
- "Scene X: TOPIC" patterns → use appropriate type based on content
- Introduction/overview → type: "intro"
- Benefits/advantages → type: "benefit"
- How it works/process → type: "process" or "explanation"
- Company/brand info → type: "brand"
- Call to action/closing → type: "cta"

CRITICAL: 
- Copy narration text EXACTLY from the script
- Sum of all estimatedDuration values should be ~${expectedDuration} seconds
- Visual directions should describe PEOPLE, SETTINGS, and EMOTIONS - not text or products`;

  try {
    const response = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const rawScenes = parsed.scenes || [];

    console.log(`[ParseScript] Parsed ${rawScenes.length} scenes`);

    // Process scenes with proper duration calculation
    const scenes = rawScenes.map((s: any, index: number) => {
      const narration = s.narration || '';
      const wordCount = narration.split(/\s+/).filter(Boolean).length;
      const calculatedDuration = Math.max(10, Math.ceil(wordCount / 2.5) + 1.5);
      
      console.log(`  Scene ${index}: "${s.title || s.type}" - ${wordCount} words → ${calculatedDuration}s`);
      
      return this.createSceneFromRaw({
        ...s,
        duration: s.estimatedDuration || calculatedDuration,
        textOverlays: s.keyPoints ? s.keyPoints.map((kp: string, i: number) => ({
          text: kp,
          style: i === 0 ? 'title' : 'subtitle',
          timing: { startAt: i * 3, duration: 4 }
        })) : [],
      }, index);
    });

    // Verify total duration
    const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
    console.log(`[ParseScript] Total duration: ${totalDuration}s (expected: ${expectedDuration}s)`);

    return scenes;
  } catch (error: any) {
    console.error("[UniversalVideoService] Script parsing failed:", error);
    throw error;
  }
}
```

---

## Priority Fix: Chunked Render Progress Visibility

The frontend needs to show chunked render progress. Update the UI:

### Add Chunked Render Status Display

```tsx
// In universal-video-producer.tsx, update the rendering status display

{project.status === 'rendering' && (
  <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
    <AlertTitle className="text-blue-800 dark:text-blue-200">
      Video is rendering
      {(project.progress as any).renderMethod === 'chunked' && ' (Chunked Mode)'}
    </AlertTitle>
    <AlertDescription className="text-blue-700 dark:text-blue-300">
      {(project.progress as any).renderMethod === 'chunked' ? (
        <>
          <p>Long-form video detected. Rendering in chunks for reliability.</p>
          <p className="mt-1">{project.progress.steps.rendering?.message || 'Processing...'}</p>
        </>
      ) : (
        <p>Your video is being rendered on AWS Lambda.</p>
      )}
      {project.progress.steps.rendering?.progress > 0 && (
        <div className="mt-2">
          <Progress value={project.progress.steps.rendering.progress} className="h-2" />
          <span className="text-sm mt-1 block">
            {Math.round(project.progress.steps.rendering.progress)}% complete
          </span>
        </div>
      )}
    </AlertDescription>
  </Alert>
)}
```

---

## Script-Based Video Workflow Test

### Test with the Real Script

1. **Create a new Script-Based project:**
   - Go to Universal Video Producer
   - Select "Script-Based" tab
   - Paste the following script:

```
Opening Scene: Have you been doing everything "right" but still struggling to lose weight? Counting calories, hitting the gym, but the scale won't budge? Here's what most people miss: your body can't heal what it's too busy defending against.

Scene 1: WHOLE BODY HEALING: True weight loss isn't just about calories in versus calories out. It's about whole body healing. When your body is overwhelmed by toxins, pathogens, and mold, it goes into survival mode. Your metabolism slows down. Inflammation increases. And your body literally holds onto weight as a protective mechanism.

Think of it like trying to renovate a house while it's on fire. First, you need to put out the fire.

Scene 2: THE DETOX CONNECTION: That's where detoxification comes in. Environmental toxins from our food, water, and air. Hidden pathogens that drain your energy. Mold exposure that disrupts your hormones. These aren't just "wellness buzzwords" -- they're real obstacles preventing your body from functioning optimally.

When your liver is overloaded with toxins, it can't efficiently metabolize fat. When chronic inflammation is present, your body resists insulin and stores excess glucose as fat. When your gut is compromised by pathogens, nutrient absorption suffers and cravings spiral out of control.

Scene 3: PARALLEL HEALING APPROACH: This is why parallel healing works. Instead of just restricting calories, we:

Support your body's natural detox pathways -- giving your liver, kidneys, and lymphatic system what they need to clear the backlog

Address the root causes -- identifying and eliminating toxin exposure, treating underlying infections, and removing mold from your environment

Make sustainable diet and lifestyle changes -- eating nutrient-dense foods that nourish rather than deplete, managing stress, prioritizing sleep, and moving in ways that support lymphatic drainage

When you heal the foundation, weight loss becomes a natural byproduct -- not a constant battle

Scene 4: The Pine Hill Approach: At Pine Hill Farm, our weight-loss approach is rooted in Whole Body Healing, helping you achieve long-lasting results without side effects while supporting your overall health along the way.

Here's what makes us different:

We use FDA-approved BioScan technology to identify underlying imbalances in your body -- no guessing, no one-size-fits-all protocols. This advanced scan determines which supplements are most compatible with your unique biology for optimal results.

We also include a Functional Lab Test to take a deeper look at your hormones, ensuring you receive the personalized support you need -- and only what your body truly requires.

Closing Scene: Your body wants to heal. It wants to release excess weight. But it needs the right environment and the right support to do so.

At Pine Hill Farm, we don't just help you lose weight -- we help you heal from the inside out.

Ready to start your whole body healing journey?
```

2. **Expected Results:**
   - Should parse into 6 scenes
   - Total duration ~180 seconds (3 minutes)
   - Should trigger chunked rendering (threshold: 90 seconds)
   - Each chunk should render separately
   - Final video should be concatenated

3. **Monitor the console for:**
   - `[ChunkedRender] Calculated X chunks for Y scenes`
   - `[ChunkedRender] Rendering chunk N...`
   - `[ChunkedRender] Chunk N complete`
   - `[ChunkedRender] Concatenating chunks...`
   - `[ChunkedRender] Final video uploaded`

---

## Debugging Checklist

If rendering still fails, check these in order:

### 1. Verify Chunked Rendering Is Triggered
```javascript
// Add logging at the start of the render route
console.log(`[Render] Total duration: ${totalDuration}s`);
console.log(`[Render] Should use chunked: ${useChunkedRendering}`);
console.log(`[Render] Threshold: 90s`);
```

### 2. Verify Lambda Function Exists
```bash
# Check AWS Lambda function
aws lambda get-function --function-name remotion-render-4-0-382-mem3008mb-disk10240mb-900sec --region us-east-1
```

### 3. Check S3 Bucket Permissions
```bash
# Verify bucket access
aws s3 ls s3://remotionlambda-useast1-refjo5giq5/
```

### 4. Test Single Chunk Render
Create a test that renders just ONE chunk to isolate the issue:

```typescript
// Test single chunk render
const testChunk = {
  chunkIndex: 0,
  startFrame: 0,
  endFrame: 900, // 30 seconds at 30fps
  scenes: [project.scenes[0]], // Just first scene
};

const result = await chunkedRenderService.renderChunk(
  testChunk,
  inputProps,
  'UniversalVideo'
);
console.log('Single chunk result:', result);
```

### 5. Check FFmpeg Concatenation
```bash
# Test FFmpeg directly
ffmpeg -f concat -safe 0 -i test_list.txt -c copy output.mp4
```

---

## Expected Behavior Summary

| Video Length | Render Method | Chunks | Expected Time |
|--------------|---------------|--------|---------------|
| < 90 seconds | Standard Lambda | 1 | 2-5 minutes |
| 90-180 seconds | Chunked | 2 | 4-8 minutes |
| 180-300 seconds | Chunked | 2-3 | 6-12 minutes |
| 300+ seconds | Chunked | 3+ | 10-20 minutes |

---

## Message for Replit Agent

> "Please diagnose and fix the video rendering issues with this priority:
>
> **1. FIRST - Add diagnostic logging:**
> - Add console.log statements at key points in the render flow
> - Log when chunked rendering is triggered vs standard
> - Log each chunk's start/completion
> - Log any errors with full stack traces
>
> **2. SECOND - Verify chunked render service:**
> - Ensure `renderLongVideo` returns the S3 URL string correctly
> - Ensure the background IIFE properly persists errors to the database
> - Verify FFmpeg is available and working
>
> **3. THIRD - Test with the real script:**
> - Use the Weight Loss script (448 words, ~180 seconds)
> - This should trigger chunked rendering
> - Monitor console for chunk progress
>
> **4. FOURTH - If chunks fail individually:**
> - Check Lambda timeout (should be 900 seconds)
> - Check memory allocation (should be 3008MB)
> - Check if assets are properly cached to S3 before render
>
> The goal is to get a 3-minute video rendering successfully. Please report back what you find in the logs."

---

## Quick Reference: Key Files

| File | Purpose |
|------|---------|
| `server/services/chunked-render-service.ts` | Chunked rendering logic |
| `server/services/universal-video-service.ts` | Asset generation, script parsing |
| `server/routes/universal-video-routes.ts` | API endpoints, render orchestration |
| `client/src/components/universal-video-producer.tsx` | Frontend UI |
| `remotion/UniversalVideoComposition.tsx` | Video composition for Lambda |

---

## Success Criteria

The implementation is successful when:

1. ✅ Script-based videos parse correctly into scenes
2. ✅ Videos >90 seconds trigger chunked rendering
3. ✅ Each chunk renders successfully on Lambda
4. ✅ Chunks are concatenated with FFmpeg
5. ✅ Final video is uploaded to S3
6. ✅ User can download the complete video
7. ✅ The Weight Loss script (~180 seconds) renders successfully
