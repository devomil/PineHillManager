# Phase 10C: Real Quality Scoring

## Objective

Ensure all quality scores displayed in the UI come from actual Claude Vision analysis, not hardcoded or placeholder values. Remove any fake scoring logic.

## Current Problem

Scores shown in UI (Q: 90, Q: 91, Q: 93) are suspiciously consistent and don't reflect actual content quality. This suggests:
1. Scores are being generated randomly
2. Scores are hardcoded during development
3. Real analysis scores are being overwritten

## Finding Fake Scores

### Step 1: Search for Hardcoded Values

```bash
# Run these searches in the project directory
grep -rn "qualityScore.*=" --include="*.ts" --include="*.tsx"
grep -rn "overallScore.*=" --include="*.ts" --include="*.tsx"
grep -rn "Math.random" --include="*.ts" --include="*.tsx"
grep -rn "Math.floor.*random" --include="*.ts" --include="*.tsx"
grep -rn "score:.*[89][0-9]" --include="*.ts" --include="*.tsx"
grep -rn "|| 90" --include="*.ts" --include="*.tsx"
grep -rn "|| 85" --include="*.ts" --include="*.tsx"
grep -rn "defaultScore" --include="*.ts" --include="*.tsx"
```

### Step 2: Common Fake Score Patterns

Look for and REMOVE these patterns:

```typescript
// WRONG: Random scores
const score = Math.floor(Math.random() * 15) + 85;

// WRONG: Hardcoded default
const score = scene.qualityScore || 90;

// WRONG: Fake generation based on scene index
const score = 85 + (sceneIndex % 10);

// WRONG: Always passing
const recommendation = 'approved';

// WRONG: Placeholder during development
// TODO: Replace with real analysis
const analysisResult = {
  overallScore: 90,
  recommendation: 'approved',
  issues: [],
};
```

### Step 3: Verify Score Source

The ONLY valid source for quality scores is Claude Vision analysis:

```typescript
// CORRECT: Score comes from actual analysis
const analysisResult = await sceneAnalysisService.analyzeScene(imageBase64, context);
const score = analysisResult.overallScore; // This is the ONLY valid source

// Store in database
await db.update(scenes).set({
  qualityScore: analysisResult.overallScore,
  analysisResult: analysisResult,
}).where(eq(scenes.id, sceneId));

// Retrieve from database
const scene = await db.select().from(scenes).where(eq(scenes.id, sceneId));
const displayScore = scene.qualityScore; // Must match what was stored
```

## Fix: Remove All Fake Scoring

### In Scene Card Component

```tsx
// BEFORE (possibly fake):
const score = scene.qualityScore || scene.analysisResult?.overallScore || 90;

// AFTER (real only):
const score = scene.analysisResult?.overallScore;
const hasRealScore = score !== undefined && score !== null;

// Only show score if we have real analysis
{hasRealScore ? (
  <Badge className={getScoreBadgeClass(score)}>{score}</Badge>
) : (
  <Badge className="bg-gray-100 text-gray-500">Pending</Badge>
)}
```

### In Quality Report Generation

```typescript
// BEFORE (possibly fake):
generateReport(projectId, scenes) {
  const sceneStatuses = scenes.map(scene => ({
    sceneIndex: scene.sceneIndex,
    score: scene.qualityScore || 85, // FAKE DEFAULT!
    status: scene.qualityScore >= 85 ? 'approved' : 'needs_review',
  }));
}

// AFTER (real only):
generateReport(projectId, scenes) {
  const sceneStatuses = scenes.map(scene => {
    // Only include scenes that have been analyzed
    if (!scene.analysisResult) {
      return {
        sceneIndex: scene.sceneIndex,
        score: null,
        status: 'pending',
        hasRealAnalysis: false,
      };
    }
    
    return {
      sceneIndex: scene.sceneIndex,
      score: scene.analysisResult.overallScore,
      status: scene.analysisResult.recommendation,
      issues: scene.analysisResult.issues,
      hasRealAnalysis: true,
    };
  });
  
  // Log warning if scenes lack analysis
  const pendingCount = sceneStatuses.filter(s => !s.hasRealAnalysis).length;
  if (pendingCount > 0) {
    console.warn(`[QualityReport] WARNING: ${pendingCount} scenes have no real analysis!`);
  }
}
```

### In API Response

```typescript
// Ensure API returns what's actually in database
router.get('/api/scenes/:id', async (req, res) => {
  const scene = await getScene(req.params.id);
  
  // Log what we're returning
  console.log('[API] Scene quality data:', {
    hasAnalysisResult: !!scene.analysisResult,
    analysisScore: scene.analysisResult?.overallScore,
    storedScore: scene.qualityScore,
  });
  
  // Return actual data, not fabricated
  res.json({
    ...scene,
    // Don't add fake defaults here!
  });
});
```

## Validation: Score Integrity Check

Add a diagnostic endpoint to verify score integrity:

```typescript
router.get('/api/debug/score-integrity', async (req, res) => {
  const scenes = await db.select().from(scenes);
  
  const report = {
    totalScenes: scenes.length,
    withAnalysis: 0,
    withoutAnalysis: 0,
    scoreMismatches: [],
    suspiciousScores: [],
  };
  
  for (const scene of scenes) {
    if (scene.analysisResult) {
      report.withAnalysis++;
      
      // Check if stored score matches analysis score
      if (scene.qualityScore !== scene.analysisResult.overallScore) {
        report.scoreMismatches.push({
          sceneId: scene.id,
          storedScore: scene.qualityScore,
          analysisScore: scene.analysisResult.overallScore,
        });
      }
    } else {
      report.withoutAnalysis++;
      
      // Scene has score but no analysis = suspicious
      if (scene.qualityScore) {
        report.suspiciousScores.push({
          sceneId: scene.id,
          score: scene.qualityScore,
          reason: 'Has score but no analysisResult',
        });
      }
    }
  }
  
  // Check for suspiciously uniform scores
  const scores = scenes.filter(s => s.qualityScore).map(s => s.qualityScore);
  const uniqueScores = new Set(scores);
  if (scores.length > 5 && uniqueScores.size < 5) {
    report.warning = 'Scores are suspiciously uniform - may be fake';
  }
  
  res.json(report);
});
```

## Expected Score Distribution

Real Claude Vision analysis produces varied scores:

```
REAL DISTRIBUTION (Expected):
Scene 1:  94  - Excellent match
Scene 2:  87  - Good match
Scene 3:  72  - Minor issues
Scene 4:  45  - Content mismatch (needs regen)
Scene 5:  91  - Excellent
Scene 6:  68  - Needs review
Scene 7:  83  - Good
Scene 8:  56  - Major issues
...

FAKE DISTRIBUTION (Current Problem):
Scene 1:  90
Scene 2:  91
Scene 3:  93
Scene 4:  90
Scene 5:  92
Scene 6:  91
Scene 7:  90
Scene 8:  93
... (all suspiciously in 90-93 range)
```

## UI Updates for Pending Analysis

Show clear state when analysis hasn't run:

```tsx
// Scene card status display
const SceneStatus: React.FC<{ scene: Scene }> = ({ scene }) => {
  if (!scene.analysisResult) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <Clock className="h-4 w-4" />
        <span className="text-xs">Analysis pending</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <Badge className={getScoreBadgeClass(scene.analysisResult.overallScore)}>
        Q: {scene.analysisResult.overallScore}
      </Badge>
      <StatusIcon status={scene.analysisResult.recommendation} />
    </div>
  );
};
```

## Verification Checklist

- [ ] Searched codebase for hardcoded scores
- [ ] Removed all Math.random score generation
- [ ] Removed all "|| 90" default fallbacks
- [ ] Removed all placeholder analysis results
- [ ] API returns only real database values
- [ ] UI shows "Pending" for unanalyzed scenes
- [ ] Score integrity check passes
- [ ] Score distribution is varied (not all 90-93)
- [ ] Scenes with content mismatch have low scores

## Next Phase

Once real scoring is verified, proceed to **Phase 10D: QA Gate Enforcement** to ensure rendering is blocked until all scenes pass quality checks.
