# Phase 10A: Claude Vision Integration Verification

## Objective

Verify that Claude Vision scene analysis is actually being called after asset generation, and fix any disconnection issues.

## Current Problem

Quality scores are displayed (Q: 90, Q: 91, Q: 93) but the content clearly doesn't match the visual direction. This indicates either:
1. Claude Vision is not being called at all
2. Analysis results are being ignored
3. Scores are hardcoded/placeholder values

## Diagnostic Steps

### Step 1: Check if ANTHROPIC_API_KEY is Set

```typescript
// Add to server startup or a diagnostic endpoint
console.log('[DIAGNOSTIC] ANTHROPIC_API_KEY configured:', !!process.env.ANTHROPIC_API_KEY);
console.log('[DIAGNOSTIC] Key prefix:', process.env.ANTHROPIC_API_KEY?.substring(0, 10) + '...');
```

### Step 2: Add Logging to Scene Analysis Service

Update `server/services/scene-analysis-service.ts`:

```typescript
// At the start of analyzeScene method
async analyzeScene(
  imageBase64: string,
  context: SceneContext
): Promise<SceneAnalysisResult> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('[SceneAnalysis] STARTING ANALYSIS');
  console.log('[SceneAnalysis] Scene Index:', context.sceneIndex);
  console.log('[SceneAnalysis] Scene Type:', context.sceneType);
  console.log('[SceneAnalysis] Narration:', context.narration?.substring(0, 100));
  console.log('[SceneAnalysis] Visual Direction:', context.visualDirection?.substring(0, 100));
  console.log('[SceneAnalysis] Image size:', imageBase64.length, 'bytes');
  console.log('═══════════════════════════════════════════════════════════');
  
  try {
    // ... existing Claude API call ...
    
    console.log('[SceneAnalysis] API Response received');
    console.log('[SceneAnalysis] Overall Score:', result.overallScore);
    console.log('[SceneAnalysis] Recommendation:', result.recommendation);
    console.log('[SceneAnalysis] Issues:', JSON.stringify(result.issues));
    
    return result;
  } catch (error) {
    console.error('[SceneAnalysis] ERROR:', error);
    throw error;
  }
}
```

### Step 3: Verify Analysis is Called After Asset Generation

Find where assets are generated and ensure analysis is called:

```typescript
// In asset generation handler (e.g., server/services/asset-generation-service.ts)

async generateSceneAsset(scene: Scene, project: Project): Promise<void> {
  console.log('[AssetGen] Generating asset for scene', scene.sceneIndex);
  
  // Generate image/video
  const assetUrl = await this.generateWithProvider(scene, project);
  console.log('[AssetGen] Asset generated:', assetUrl);
  
  // THIS IS THE CRITICAL PART - IS THIS BEING CALLED?
  console.log('[AssetGen] Starting scene analysis...');
  
  // Fetch the generated image for analysis
  const imageBase64 = await this.fetchAsBase64(assetUrl);
  
  // Call scene analysis
  const analysisResult = await sceneAnalysisService.analyzeScene(imageBase64, {
    sceneIndex: scene.sceneIndex,
    sceneType: scene.type,
    narration: scene.narration,
    visualDirection: scene.visualDirection,
    expectedContentType: scene.contentType,
    totalScenes: project.scenes.length,
  });
  
  console.log('[AssetGen] Analysis complete. Score:', analysisResult.overallScore);
  
  // Save analysis result to scene
  await this.updateScene(scene.id, {
    assetUrl,
    analysisResult,
    qualityScore: analysisResult.overallScore,
    qualityStatus: analysisResult.recommendation,
  });
  
  console.log('[AssetGen] Scene updated with analysis result');
}
```

### Step 4: Check Database Schema

Ensure the scenes table has columns for analysis results:

```sql
-- Check if these columns exist
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS analysis_result JSONB;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS quality_score INTEGER;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS quality_status TEXT;
ALTER TABLE scenes ADD COLUMN IF NOT EXISTS user_approved BOOLEAN DEFAULT FALSE;
```

### Step 5: Verify API Endpoint Returns Real Data

Check `GET /api/projects/:id/quality-report`:

```typescript
// server/routes/quality-routes.ts

router.get('/api/projects/:id/quality-report', async (req, res) => {
  const projectId = parseInt(req.params.id);
  
  console.log('[QualityReport] Fetching report for project', projectId);
  
  const project = await getProjectWithScenes(projectId);
  
  // Log what we have
  for (const scene of project.scenes) {
    console.log(`[QualityReport] Scene ${scene.sceneIndex}:`, {
      hasAnalysisResult: !!scene.analysisResult,
      qualityScore: scene.qualityScore,
      qualityStatus: scene.qualityStatus,
    });
  }
  
  // Check if ANY scene has real analysis data
  const scenesWithAnalysis = project.scenes.filter(s => s.analysisResult);
  console.log('[QualityReport] Scenes with analysis:', scenesWithAnalysis.length, '/', project.scenes.length);
  
  if (scenesWithAnalysis.length === 0) {
    console.warn('[QualityReport] WARNING: No scenes have analysis results!');
    console.warn('[QualityReport] This means Claude Vision is NOT being called');
  }
  
  // Generate report from real data
  const analyses = project.scenes
    .filter(s => s.analysisResult)
    .map(s => s.analysisResult);
  
  const report = qualityGateService.generateReport(
    projectId,
    analyses,
    new Map(project.scenes.filter(s => s.userApproved).map(s => [s.sceneIndex, true]))
  );
  
  console.log('[QualityReport] Generated report:', {
    overallScore: report.overallScore,
    approved: report.approvedCount,
    needsReview: report.needsReviewCount,
    rejected: report.rejectedCount,
  });
  
  res.json(report);
});
```

## Finding the Disconnect

### Scenario A: Analysis Service Exists But Not Called

**Symptom:** No "[SceneAnalysis]" logs appear during asset generation

**Fix:** Add the analysis call to the asset generation completion handler:

```typescript
// Find the asset generation completion point and add:
import { sceneAnalysisService } from './scene-analysis-service';

// After asset is generated and saved:
const analysisResult = await sceneAnalysisService.analyzeScene(...);
await updateSceneWithAnalysis(sceneId, analysisResult);
```

### Scenario B: Analysis Runs But Results Not Saved

**Symptom:** "[SceneAnalysis]" logs show but database has no analysis_result

**Fix:** Ensure the update query saves the result:

```typescript
await db.update(scenes)
  .set({
    analysisResult: analysisResult,  // Must be JSONB column
    qualityScore: analysisResult.overallScore,
    qualityStatus: analysisResult.recommendation,
  })
  .where(eq(scenes.id, sceneId));
```

### Scenario C: Analysis Saved But UI Shows Fake Data

**Symptom:** Database has analysis but UI shows different scores

**Fix:** Check the API response and frontend fetch:

```typescript
// Ensure API returns actual database values
const scene = await db.select().from(scenes).where(eq(scenes.id, sceneId));
console.log('[API] Returning scene with score:', scene.qualityScore);

// Ensure frontend uses actual values
const score = scene.analysisResult?.overallScore || scene.qualityScore;
// NOT: const score = Math.floor(Math.random() * 20) + 80; // WRONG!
```

### Scenario D: Scores Are Hardcoded

**Symptom:** All scores are suspiciously similar (90, 91, 93, 90, 92...)

**Fix:** Search codebase for hardcoded values:

```bash
# Search for hardcoded scores
grep -r "qualityScore.*=" --include="*.ts" --include="*.tsx"
grep -r "overallScore.*=" --include="*.ts" --include="*.tsx"
grep -r "Math.random" --include="*.ts" --include="*.tsx"
grep -r "score.*90" --include="*.ts" --include="*.tsx"
```

## Verification Test

After fixes, test with a scene that should clearly fail:

1. Create a scene with visual direction: "Red apple on white background"
2. Manually set the image to something completely different (e.g., a car)
3. Trigger analysis
4. **Expected:** Score < 50, status "rejected", issue "Content does not match visual direction"
5. **If score is 90+:** Analysis is still not working correctly

## Verification Checklist

- [ ] ANTHROPIC_API_KEY is configured and valid
- [ ] sceneAnalysisService.analyzeScene() is being called after asset generation
- [ ] Claude API is actually being called (check logs for API request)
- [ ] Analysis results are saved to database
- [ ] API endpoint returns real analysis data from database
- [ ] UI displays actual scores from API (not hardcoded)
- [ ] Test with mismatched content returns low score

## Next Phase

Once Claude Vision is verified as connected and running, proceed to **Phase 10B: Content Match Validation** to ensure the analysis actually checks if content matches the visual direction.
