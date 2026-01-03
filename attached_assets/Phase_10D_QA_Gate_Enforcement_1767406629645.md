# Phase 10D: QA Gate Enforcement

## Objective

Ensure the rendering process is BLOCKED when quality thresholds are not met. Currently, rendering proceeds despite scenes showing "needs review" or having quality issues.

## Current Problem

Looking at the screenshot:
- Progress shows QA step exists
- But "Retry Render" button is enabled
- 17 scenes show as "Approved (17)" 
- Yet content clearly has issues (wrong framing, missing text overlays)
- Rendering can proceed without actual QA validation

## Required Behavior

```
CAN RENDER:
✅ All scenes have score ≥ 70
✅ All scenes have status "approved" or user has clicked "approve"
✅ No critical issues unresolved
✅ QA report passesThreshold = true

CANNOT RENDER:
❌ ANY scene has score < 70 without user override
❌ ANY scene has status "needs_review" without user approval
❌ ANY scene has status "rejected"
❌ QA report passesThreshold = false
```

## Implementation

### Step 1: Strict Render Route Guard

Update `server/routes/render-routes.ts`:

```typescript
import { qualityGateService } from '../services/quality-gate-service';

router.post('/api/projects/:id/render', async (req, res) => {
  const projectId = parseInt(req.params.id);
  const { forceRender } = req.body; // Only for admin override
  
  console.log('[Render] Render requested for project', projectId);
  
  // Step 1: Get QA report
  const project = await getProjectWithScenes(projectId);
  const analyses = project.scenes
    .filter(s => s.analysisResult)
    .map(s => s.analysisResult);
  
  const userApprovals = new Map(
    project.scenes
      .filter(s => s.userApproved)
      .map(s => [s.sceneIndex, true])
  );
  
  const qaReport = qualityGateService.generateReport(projectId, analyses, userApprovals);
  
  console.log('[Render] QA Report:', {
    overallScore: qaReport.overallScore,
    passesThreshold: qaReport.passesThreshold,
    canRender: qaReport.canRender,
    blockingReasons: qaReport.blockingReasons,
  });
  
  // Step 2: Check for scenes without analysis
  const unanalyzedScenes = project.scenes.filter(s => !s.analysisResult);
  if (unanalyzedScenes.length > 0) {
    console.log('[Render] BLOCKED: Scenes without analysis:', unanalyzedScenes.map(s => s.sceneIndex));
    return res.status(400).json({
      error: 'Cannot render: Some scenes have not been analyzed',
      unanalyzedScenes: unanalyzedScenes.map(s => s.sceneIndex),
      action: 'Run quality analysis first',
    });
  }
  
  // Step 3: Check QA gate
  if (!qaReport.canRender && !forceRender) {
    console.log('[Render] BLOCKED by QA gate');
    return res.status(400).json({
      error: 'Cannot render: Quality gate not passed',
      qaReport: {
        overallScore: qaReport.overallScore,
        passesThreshold: qaReport.passesThreshold,
        blockingReasons: qaReport.blockingReasons,
        needsReviewCount: qaReport.needsReviewCount,
        rejectedCount: qaReport.rejectedCount,
      },
      action: 'Review and approve flagged scenes, or regenerate rejected scenes',
    });
  }
  
  // Step 4: Check for specific blocking conditions
  const rejectedScenes = qaReport.sceneStatuses.filter(s => s.status === 'rejected');
  if (rejectedScenes.length > 0) {
    console.log('[Render] BLOCKED: Rejected scenes:', rejectedScenes.map(s => s.sceneIndex));
    return res.status(400).json({
      error: 'Cannot render: Rejected scenes must be regenerated',
      rejectedScenes: rejectedScenes.map(s => ({
        sceneIndex: s.sceneIndex,
        score: s.score,
        issues: s.issues,
      })),
      action: 'Regenerate rejected scenes',
    });
  }
  
  const needsReviewScenes = qaReport.sceneStatuses.filter(
    s => s.status === 'needs_review' && !s.userApproved
  );
  if (needsReviewScenes.length > 0) {
    console.log('[Render] BLOCKED: Unapproved scenes:', needsReviewScenes.map(s => s.sceneIndex));
    return res.status(400).json({
      error: 'Cannot render: Scenes need review and approval',
      needsReviewScenes: needsReviewScenes.map(s => ({
        sceneIndex: s.sceneIndex,
        score: s.score,
        issues: s.issues,
      })),
      action: 'Approve or regenerate scenes needing review',
    });
  }
  
  // Step 5: All checks passed - proceed with render
  console.log('[Render] QA gate PASSED - proceeding with render');
  
  try {
    const renderJob = await startRenderJob(projectId);
    res.json({
      success: true,
      jobId: renderJob.id,
      message: 'Render started',
    });
  } catch (error) {
    console.error('[Render] Error starting render:', error);
    res.status(500).json({ error: 'Failed to start render' });
  }
});
```

### Step 2: Update Quality Gate Service

Ensure `qualityGateService.generateReport()` correctly calculates blocking:

```typescript
// server/services/quality-gate-service.ts

generateReport(
  projectId: number,
  analyses: SceneAnalysisResult[],
  userApprovals: Map<number, boolean>,
  thresholds: QualityThresholds = DEFAULT_THRESHOLDS
): ProjectQualityReport {
  
  const sceneStatuses: SceneQualityStatus[] = analyses.map(analysis => {
    const userApproved = userApprovals.get(analysis.sceneIndex) || false;
    const autoApproved = analysis.overallScore >= 85;
    
    // Determine status
    let status: 'approved' | 'needs_review' | 'rejected' | 'pending';
    
    if (analysis.overallScore < 50 || analysis.recommendation === 'critical_fail') {
      status = 'rejected'; // Cannot be overridden without regeneration
    } else if (userApproved || autoApproved) {
      status = 'approved';
    } else if (analysis.overallScore < thresholds.minimumSceneScore) {
      status = 'rejected';
    } else {
      status = 'needs_review';
    }
    
    return {
      sceneIndex: analysis.sceneIndex,
      score: analysis.overallScore,
      status,
      issues: analysis.issues,
      userApproved,
      autoApproved,
    };
  });
  
  // Calculate blocking reasons
  const blockingReasons: string[] = [];
  
  const rejectedCount = sceneStatuses.filter(s => s.status === 'rejected').length;
  const needsReviewCount = sceneStatuses.filter(s => s.status === 'needs_review').length;
  const approvedCount = sceneStatuses.filter(s => s.status === 'approved').length;
  
  // Critical issues block rendering
  const criticalIssues = analyses.flatMap(a => 
    a.issues.filter(i => i.severity === 'critical')
  );
  if (criticalIssues.length > 0) {
    blockingReasons.push(`${criticalIssues.length} critical issues must be resolved`);
  }
  
  // Rejected scenes block rendering
  if (rejectedCount > 0) {
    blockingReasons.push(`${rejectedCount} scene(s) rejected - must regenerate`);
  }
  
  // Scenes needing review block rendering (unless user approves)
  if (needsReviewCount > 0) {
    blockingReasons.push(`${needsReviewCount} scene(s) need review - approve or regenerate`);
  }
  
  // Calculate overall score
  const overallScore = sceneStatuses.length > 0
    ? Math.round(sceneStatuses.reduce((sum, s) => sum + s.score, 0) / sceneStatuses.length)
    : 0;
  
  // Below threshold blocks rendering
  if (overallScore < thresholds.minimumProjectScore) {
    blockingReasons.push(`Overall score ${overallScore} below minimum ${thresholds.minimumProjectScore}`);
  }
  
  const passesThreshold = blockingReasons.length === 0;
  const canRender = passesThreshold;
  
  return {
    projectId,
    overallScore,
    sceneStatuses,
    approvedCount,
    needsReviewCount,
    rejectedCount,
    criticalIssueCount: criticalIssues.length,
    passesThreshold,
    canRender,
    blockingReasons,
  };
}
```

### Step 3: Update UI Render Button

Disable render button and show clear reasons:

```tsx
// In universal-video-producer.tsx or render controls

const RenderControls: React.FC<{ qaReport: QualityReport | null }> = ({ qaReport }) => {
  const canRender = qaReport?.canRender ?? false;
  const blockingReasons = qaReport?.blockingReasons ?? [];
  
  return (
    <div className="space-y-2">
      <Button
        onClick={handleRender}
        disabled={!canRender}
        className={cn(
          "w-full",
          canRender ? "bg-green-600 hover:bg-green-700" : "bg-gray-400 cursor-not-allowed"
        )}
      >
        <Play className="h-4 w-4 mr-2" />
        {canRender ? 'Render Video' : 'Cannot Render'}
      </Button>
      
      {!canRender && blockingReasons.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <div className="text-sm font-medium text-red-800 mb-1">
            Rendering blocked:
          </div>
          <ul className="text-xs text-red-700 space-y-1">
            {blockingReasons.map((reason, i) => (
              <li key={i}>• {reason}</li>
            ))}
          </ul>
        </div>
      )}
      
      {!canRender && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowQADashboard(true)}
        >
          Review Issues in QA Dashboard
        </Button>
      )}
    </div>
  );
};
```

### Step 4: Add Force Render Warning (Admin Only)

If you need an escape hatch for emergencies:

```tsx
// Only show in development or for admins
{isDev && !canRender && (
  <Button
    variant="destructive"
    size="sm"
    onClick={() => {
      if (window.confirm(
        'WARNING: Rendering with quality issues may produce poor results. Are you sure?'
      )) {
        handleForceRender();
      }
    }}
  >
    Force Render (Dev Only)
  </Button>
)}
```

## User Flow for Blocked Render

```
User clicks "Render Video"
         ↓
Is QA gate passed? ──NO──→ Show blocking modal
         ↓                      ↓
        YES              "These issues block rendering:"
         ↓               • 2 scenes rejected
         ↓               • 3 scenes need review
         ↓                      ↓
    Start Render         [Open QA Dashboard]
         ↓                      ↓
    Show progress        User reviews/approves/regenerates
                               ↓
                         Return to render
```

## Verification Checklist

- [ ] Render route checks QA report before proceeding
- [ ] Render blocked if ANY scene has status "rejected"
- [ ] Render blocked if ANY scene needs review without approval
- [ ] Render blocked if critical issues exist
- [ ] Render blocked if overall score below threshold
- [ ] UI shows disabled render button when blocked
- [ ] UI shows clear blocking reasons
- [ ] User can access QA Dashboard from blocking message
- [ ] After approving all scenes, render becomes available
- [ ] After regenerating rejected scenes, render becomes available

## Test Scenarios

### Scenario 1: Rejected Scene Blocks Render
1. Scene has score 45 (content mismatch)
2. Click "Render Video"
3. **Expected:** Error "Cannot render: 1 scene(s) rejected - must regenerate"

### Scenario 2: Unapproved Review Scene Blocks Render
1. Scene has score 75 (needs review)
2. User has NOT clicked approve
3. Click "Render Video"
4. **Expected:** Error "Cannot render: 1 scene(s) need review"

### Scenario 3: Approved Review Scene Allows Render
1. Scene has score 75 (needs review)
2. User clicks "Approve" on scene
3. Click "Render Video"
4. **Expected:** Render starts successfully

### Scenario 4: All Auto-Approved Allows Render
1. All scenes have score ≥ 85
2. Click "Render Video"
3. **Expected:** Render starts (auto-approved, no user action needed)

## Next Phase

Once QA gate enforcement is working, proceed to **Phase 10E: Smart Text Placement Restoration** to ensure scenes requiring text overlays actually have text.
