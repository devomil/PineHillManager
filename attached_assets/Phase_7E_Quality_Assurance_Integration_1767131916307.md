# Phase 7E: Quality Assurance Integration

## Objective

Add Quality Assurance as a visible step in the video production pipeline, showing Claude Vision automated review status and brand compliance scores before rendering.

## Current Problem

- QA step not visible in progress tracker
- No indication that Claude Vision reviews content before rendering
- Brand compliance status not shown before user approves render

## What This Phase Creates/Modifies

- `client/src/components/progress-tracker.tsx` - Add QA step
- `client/src/components/qa-gate.tsx` - NEW: QA gate component
- `client/src/components/generation-preview-panel.tsx` - Show QA info
- API endpoints for running and checking QA

---

## Step 1: Update Progress Tracker

Update `client/src/components/progress-tracker.tsx` to add QA step:

```tsx
const PIPELINE_STEPS = [
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'voiceover', label: 'Voiceover', icon: Mic },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'assembly', label: 'Assembly', icon: Layers },
  { id: 'qa', label: 'QA', icon: ShieldCheck },      // NEW
  { id: 'rendering', label: 'Rendering', icon: Play },
];
```

The QA step should display the overall score when complete and color-code based on pass/review/fix status.

---

## Step 2: Add QA Preview to Generation Preview Panel

Add to `generation-preview-panel.tsx`:

```tsx
{/* Quality Assurance */}
<div className="bg-white rounded-lg p-3 border">
  <div className="flex items-center gap-2 text-gray-500 mb-2">
    <ShieldCheck className="h-4 w-4" />
    <span className="text-xs font-medium">Quality Assurance</span>
  </div>
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Eye className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-sm">Automated Review</span>
      </div>
      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
        Claude Vision
      </Badge>
    </div>
    
    <div className="text-xs text-gray-500 pl-5 space-y-1">
      <div className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span>AI artifact detection (text, UI)</span>
      </div>
      <div className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span>Brand compliance scoring</span>
      </div>
      <div className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3 text-green-500" />
        <span>Technical quality check</span>
      </div>
    </div>
  </div>
</div>
```

---

## Step 3: Create QA Gate Component

Create `client/src/components/qa-gate.tsx`:

```tsx
import React from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Play,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QAResult {
  overallScore: number;
  technicalScore: number;
  brandComplianceScore: number;
  compositionScore: number;
  aiArtifactsClear: boolean;
  issues: Array<{
    sceneIndex: number;
    severity: 'critical' | 'major' | 'minor';
    description: string;
  }>;
  recommendation: 'approved' | 'needs-review' | 'needs-fixes';
}

interface QAGateProps {
  projectId: number;
  qaResult: QAResult | null;
  isRunning: boolean;
  onRunQA: () => void;
  onProceedToRender: () => void;
  onRegenerateScene: (sceneIndex: number) => void;
}

export const QAGate: React.FC<QAGateProps> = ({
  qaResult,
  isRunning,
  onRunQA,
  onProceedToRender,
  onRegenerateScene,
}) => {
  // Not yet run
  if (!qaResult && !isRunning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="h-5 w-5" />
            Quality Assurance Gate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Run automated quality review before rendering.
          </p>
          <Button onClick={onRunQA} className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            Run Claude Vision QA Review
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Running
  if (isRunning) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Running Quality Review...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            Claude Vision is analyzing each scene...
          </p>
        </CardContent>
      </Card>
    );
  }

  // Results
  const criticalIssues = qaResult?.issues.filter(i => i.severity === 'critical') || [];
  const canProceed = qaResult?.recommendation !== 'needs-fixes';

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {qaResult?.recommendation === 'approved' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : qaResult?.recommendation === 'needs-review' ? (
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
            ) : (
              <XCircle className="h-5 w-5 text-red-600" />
            )}
            QA Results
          </div>
          <span className={`text-3xl font-bold ${getScoreColor(qaResult?.overallScore || 0)}`}>
            {qaResult?.overallScore}/100
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Breakdown */}
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-500">Technical</div>
            <div className={`font-bold ${getScoreColor(qaResult?.technicalScore || 0)}`}>
              {qaResult?.technicalScore}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Brand</div>
            <div className={`font-bold ${getScoreColor(qaResult?.brandComplianceScore || 0)}`}>
              {qaResult?.brandComplianceScore}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Composition</div>
            <div className={`font-bold ${getScoreColor(qaResult?.compositionScore || 0)}`}>
              {qaResult?.compositionScore}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">AI Artifacts</div>
            <div className={qaResult?.aiArtifactsClear ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
              {qaResult?.aiArtifactsClear ? '✓ Clear' : '⚠ Found'}
            </div>
          </div>
        </div>

        {/* Issues */}
        {criticalIssues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm text-red-600">Critical Issues</h4>
            {criticalIssues.map((issue, idx) => (
              <div key={idx} className="flex items-center justify-between bg-red-50 p-2 rounded text-sm">
                <span>Scene {issue.sceneIndex + 1}: {issue.description}</span>
                <Button size="sm" variant="outline" onClick={() => onRegenerateScene(issue.sceneIndex)}>
                  Regenerate
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={onRunQA} className="flex-1">
            Re-run QA
          </Button>
          <Button onClick={onProceedToRender} disabled={!canProceed} className="flex-1">
            {canProceed ? 'Proceed to Render' : 'Fix Issues First'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Step 4: Add QA API Endpoints

```typescript
// POST /api/video-projects/:id/run-qa
router.post('/api/video-projects/:id/run-qa', async (req, res) => {
  const projectId = parseInt(req.params.id);
  
  // Get project and scenes
  const project = await getProject(projectId);
  const scenes = project.scenes || [];
  
  // Run QA on each scene
  const qaResults = [];
  for (const scene of scenes) {
    if (scene.videoUrl || scene.imageUrl) {
      const result = await qualityEvaluationService.evaluateSceneComprehensive(
        scene.videoUrl || scene.imageUrl,
        { sceneIndex: scene.sceneIndex, sceneType: scene.type, ... }
      );
      qaResults.push(result);
    }
  }
  
  // Generate report
  const report = await qualityEvaluationService.generateVideoQualityReport(qaResults);
  
  // Save to project
  await updateProject(projectId, { qaReport: report });
  
  res.json(report);
});
```

---

## Verification Checklist

Phase 7E is complete when:

- [ ] Progress tracker shows QA step
- [ ] QA step displays score when complete
- [ ] Generation Preview shows QA section
- [ ] QA Gate component works
- [ ] Run QA triggers Claude Vision analysis
- [ ] Results show score breakdown
- [ ] Critical issues block rendering
- [ ] Regenerate button works per scene

---

## Phase 7 Complete Summary

After all Phase 7 sub-phases:

| Feature | Status | Display |
|---------|--------|---------|
| Video Providers | ✅ | Runway, Kling, Luma, Hailuo per scene |
| Image Providers | ✅ | Flux.1, fal.ai per content type |
| Sound FX | ✅ | Kling Sound (fixed from Runway) |
| Intelligence | ✅ | Claude Vision, Text Placement, Transitions |
| QA Gate | ✅ | Claude Vision with brand compliance |

---

## Expected Final Generation Preview

```
┌─────────────────────────────────────────────────────────────┐
│ 🎬 Video Generation                                         │
│    Runway Gen-3 (4) │ Kling 1.6 (8) │ Luma (2) │ Hailuo (4)│
│                                                             │
│ 🖼️ Image Generation                                         │
│    Flux.1 (4 products) │ fal.ai (6 lifestyle)              │
│                                                             │
│ 🎤 Voiceover: ElevenLabs - Rachel                          │
│ 🎵 Music: Udio AI (via PiAPI) - Uplifting                  │
│ 🔊 Sound FX: Kling Sound - 18 ambient, 17 transitions      │
│                                                             │
│ 🧠 Intelligence                                             │
│    Scene Analysis: Claude Vision                           │
│    Text Placement: Smart positioning (4 overlays)          │
│    Transitions: Mood-matched (17)                          │
│                                                             │
│ ✅ Quality Assurance                                        │
│    Claude Vision automated review                          │
│    AI artifacts, brand compliance, technical quality       │
├─────────────────────────────────────────────────────────────┤
│ 💰 $17.54                              ⏱️ 9-14 min          │
└─────────────────────────────────────────────────────────────┘
```
