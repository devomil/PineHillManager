# Phase 5E: Quality Dashboard

## Objective

Create a Quality Dashboard component that displays quality evaluation scores, brand compliance results, and any issues detected after video generation. This helps users understand the quality of their generated video and take action on problems.

## Prerequisites

- Phase 5A-5D complete
- Phase 3 quality evaluation service working
- Phase 4F brand quality checks working
- Video generation completes and stores quality results

## What This Phase Creates

- `client/src/components/quality-dashboard.tsx` - NEW: Post-generation quality display
- API endpoint `GET /api/video-projects/:id/quality-report` - Quality results
- Integration with project dashboard

## What Success Looks Like

- Users see overall quality score after generation
- Breakdown shows composition, brand compliance, technical scores
- Issues are listed with severity and scene location
- Users can regenerate specific scenes or approve for rendering

---

## Step 1: Create Quality Report API Endpoint

Add to `server/routes.ts`:

```typescript
// GET /api/video-projects/:id/quality-report - Get quality evaluation results
router.get('/api/video-projects/:id/quality-report', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    // Get project
    const [project] = await db
      .select()
      .from(videoProjects)
      .where(eq(videoProjects.id, projectId));
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const scenes = project.scenes || [];
    const qualityResults = project.qualityResults || {};
    
    // Aggregate scene quality data
    const sceneQualities = scenes.map((scene: any, index: number) => {
      const sceneQuality = scene.qualityEvaluation || {};
      return {
        sceneIndex: index,
        sceneType: scene.type,
        overallScore: sceneQuality.overallScore || null,
        compositionScore: sceneQuality.compositionScore || null,
        brandComplianceScore: sceneQuality.brandComplianceScore || null,
        technicalScore: sceneQuality.technicalScore || null,
        issues: sceneQuality.issues || [],
        status: scene.status || 'pending',
        thumbnailUrl: scene.thumbnailUrl,
      };
    });
    
    // Calculate aggregate scores
    const completedScenes = sceneQualities.filter(s => s.overallScore !== null);
    
    const avgScore = (key: string) => {
      const values = completedScenes
        .map(s => s[key as keyof typeof s])
        .filter((v): v is number => typeof v === 'number');
      return values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null;
    };
    
    // Collect all issues
    const allIssues: any[] = [];
    sceneQualities.forEach(scene => {
      scene.issues.forEach((issue: any) => {
        allIssues.push({
          ...issue,
          sceneIndex: scene.sceneIndex,
          sceneType: scene.sceneType,
        });
      });
    });
    
    // Sort by severity
    const severityOrder = { critical: 0, major: 1, minor: 2 };
    allIssues.sort((a, b) => 
      (severityOrder[a.severity as keyof typeof severityOrder] || 2) - 
      (severityOrder[b.severity as keyof typeof severityOrder] || 2)
    );
    
    // Determine overall status
    const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
    const majorCount = allIssues.filter(i => i.severity === 'major').length;
    const overallScore = avgScore('overallScore');
    
    let recommendation: 'approved' | 'needs-fixes' | 'needs-review' | 'pending';
    if (completedScenes.length === 0) {
      recommendation = 'pending';
    } else if (criticalCount > 0) {
      recommendation = 'needs-fixes';
    } else if (majorCount > 2 || (overallScore !== null && overallScore < 70)) {
      recommendation = 'needs-review';
    } else {
      recommendation = 'approved';
    }
    
    res.json({
      projectId,
      projectTitle: project.title,
      status: project.status,
      generatedAt: project.generatedAt,
      
      scores: {
        overall: overallScore,
        composition: avgScore('compositionScore'),
        brandCompliance: avgScore('brandComplianceScore'),
        technical: avgScore('technicalScore'),
      },
      
      sceneQualities,
      
      issues: {
        total: allIssues.length,
        critical: criticalCount,
        major: majorCount,
        minor: allIssues.filter(i => i.severity === 'minor').length,
        list: allIssues,
      },
      
      recommendation,
      
      summary: generateQualitySummary(overallScore, criticalCount, majorCount, allIssues),
    });
    
  } catch (error: any) {
    console.error('[API] Quality report failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to generate human-readable summary
function generateQualitySummary(
  overallScore: number | null,
  criticalCount: number,
  majorCount: number,
  issues: any[]
): string {
  if (overallScore === null) {
    return 'Quality evaluation pending. Generate assets to see results.';
  }
  
  if (criticalCount > 0) {
    const aiTextIssues = issues.filter(i => i.type === 'ai-text-detected').length;
    if (aiTextIssues > 0) {
      return `${aiTextIssues} scene(s) contain AI-generated text artifacts. Regeneration recommended.`;
    }
    return `${criticalCount} critical issue(s) detected. Review and regenerate affected scenes.`;
  }
  
  if (overallScore >= 85) {
    return 'Excellent quality! Your video is ready for rendering.';
  }
  
  if (overallScore >= 70) {
    return 'Good quality with minor issues. Review before rendering.';
  }
  
  return 'Several issues detected. Consider regenerating problematic scenes.';
}
```

---

## Step 2: Create Quality Dashboard Component

Create `client/src/components/quality-dashboard.tsx`:

```tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Loader2,
  Play,
  Eye,
  BarChart3,
  Shield,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface QualityIssue {
  type: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  sceneIndex: number;
  sceneType: string;
  examples?: string[];
}

interface SceneQuality {
  sceneIndex: number;
  sceneType: string;
  overallScore: number | null;
  compositionScore: number | null;
  brandComplianceScore: number | null;
  technicalScore: number | null;
  issues: QualityIssue[];
  status: string;
  thumbnailUrl?: string;
}

interface QualityReport {
  projectId: number;
  projectTitle: string;
  status: string;
  generatedAt: string;
  scores: {
    overall: number | null;
    composition: number | null;
    brandCompliance: number | null;
    technical: number | null;
  };
  sceneQualities: SceneQuality[];
  issues: {
    total: number;
    critical: number;
    major: number;
    minor: number;
    list: QualityIssue[];
  };
  recommendation: 'approved' | 'needs-fixes' | 'needs-review' | 'pending';
  summary: string;
}

interface QualityDashboardProps {
  projectId: number;
  onRegenerateScene: (sceneIndex: number) => Promise<void>;
  onApproveAndRender: () => void;
}

const SEVERITY_CONFIG = {
  critical: {
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
  },
  major: {
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
  },
  minor: {
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
  },
};

const RECOMMENDATION_CONFIG = {
  approved: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    label: 'Ready to Render',
  },
  'needs-fixes': {
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    label: 'Needs Fixes',
  },
  'needs-review': {
    color: 'bg-yellow-100 text-yellow-800',
    icon: AlertTriangle,
    label: 'Needs Review',
  },
  pending: {
    color: 'bg-gray-100 text-gray-800',
    icon: Loader2,
    label: 'Pending',
  },
};

const ScoreBar: React.FC<{ label: string; score: number | null; icon: React.ReactNode }> = ({
  label,
  score,
  icon,
}) => {
  const getScoreColor = (s: number) => {
    if (s >= 85) return 'bg-green-500';
    if (s >= 70) return 'bg-yellow-500';
    if (s >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 text-gray-600">
          {icon}
          {label}
        </span>
        <span className="font-medium">
          {score !== null ? `${score}/100` : '—'}
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        {score !== null && (
          <div
            className={`h-full ${getScoreColor(score)} transition-all duration-500`}
            style={{ width: `${score}%` }}
          />
        )}
      </div>
    </div>
  );
};

export const QualityDashboard: React.FC<QualityDashboardProps> = ({
  projectId,
  onRegenerateScene,
  onApproveAndRender,
}) => {
  const [showAllIssues, setShowAllIssues] = useState(false);
  const [regeneratingScene, setRegeneratingScene] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const { data: report, isLoading, error } = useQuery<QualityReport>({
    queryKey: ['quality-report', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/video-projects/${projectId}/quality-report`);
      if (!response.ok) throw new Error('Failed to load quality report');
      return response.json();
    },
    refetchInterval: 10000, // Poll every 10 seconds during generation
  });

  const handleRegenerate = async (sceneIndex: number) => {
    setRegeneratingScene(sceneIndex);
    try {
      await onRegenerateScene(sceneIndex);
      queryClient.invalidateQueries({ queryKey: ['quality-report', projectId] });
    } finally {
      setRegeneratingScene(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading quality report...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !report) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load quality report</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const recConfig = RECOMMENDATION_CONFIG[report.recommendation];
  const RecIcon = recConfig.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Quality Report
          </CardTitle>
          <Badge className={recConfig.color}>
            <RecIcon className={`h-3 w-3 mr-1 ${report.recommendation === 'pending' ? 'animate-spin' : ''}`} />
            {recConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center py-4 bg-gray-50 rounded-lg">
          <div className="text-5xl font-bold mb-1">
            {report.scores.overall !== null ? report.scores.overall : '—'}
          </div>
          <div className="text-sm text-gray-500">Overall Quality Score</div>
          <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
            {report.summary}
          </p>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          <ScoreBar
            label="Composition"
            score={report.scores.composition}
            icon={<Eye className="h-4 w-4" />}
          />
          <ScoreBar
            label="Brand Compliance"
            score={report.scores.brandCompliance}
            icon={<Shield className="h-4 w-4" />}
          />
          <ScoreBar
            label="Technical Quality"
            score={report.scores.technical}
            icon={<Zap className="h-4 w-4" />}
          />
        </div>

        {/* Issues Summary */}
        {report.issues.total > 0 && (
          <Collapsible open={showAllIssues} onOpenChange={setShowAllIssues}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="font-medium">Issues Found</span>
                  <div className="flex gap-2">
                    {report.issues.critical > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {report.issues.critical} Critical
                      </Badge>
                    )}
                    {report.issues.major > 0 && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        {report.issues.major} Major
                      </Badge>
                    )}
                    {report.issues.minor > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                        {report.issues.minor} Minor
                      </Badge>
                    )}
                  </div>
                </div>
                {showAllIssues ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {report.issues.list.map((issue, idx) => {
                  const sevConfig = SEVERITY_CONFIG[issue.severity];
                  const SevIcon = sevConfig.icon;
                  
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${sevConfig.color}`}
                    >
                      <SevIcon className={`h-4 w-4 mt-0.5 ${sevConfig.iconColor}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            Scene {issue.sceneIndex + 1}
                          </Badge>
                          <span className="text-xs text-gray-500">{issue.sceneType}</span>
                        </div>
                        <p className="text-sm">{issue.description}</p>
                        {issue.examples && issue.examples.length > 0 && (
                          <p className="text-xs text-gray-600 mt-1">
                            Examples: {issue.examples.join(', ')}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRegenerate(issue.sceneIndex)}
                        disabled={regeneratingScene === issue.sceneIndex}
                      >
                        {regeneratingScene === issue.sceneIndex ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Scene-by-Scene Quality (Dialog) */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Eye className="h-4 w-4 mr-2" />
              View Scene Details
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Scene-by-Scene Quality</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-4">
              {report.sceneQualities.map((scene) => (
                <div
                  key={scene.sceneIndex}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {/* Thumbnail */}
                  <div className="h-16 w-24 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                    {scene.thumbnailUrl ? (
                      <img
                        src={scene.thumbnailUrl}
                        alt={`Scene ${scene.sceneIndex + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400">
                        <Play className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">Scene {scene.sceneIndex + 1}</span>
                      <Badge variant="secondary" className="text-xs">
                        {scene.sceneType}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Overall: {scene.overallScore ?? '—'}</span>
                      <span>Composition: {scene.compositionScore ?? '—'}</span>
                      <span>Brand: {scene.brandComplianceScore ?? '—'}</span>
                    </div>
                    {scene.issues.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {scene.issues.slice(0, 2).map((issue, idx) => (
                          <Badge
                            key={idx}
                            variant="outline"
                            className={`text-xs ${SEVERITY_CONFIG[issue.severity].color}`}
                          >
                            {issue.type}
                          </Badge>
                        ))}
                        {scene.issues.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{scene.issues.length - 2} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Score indicator */}
                  <div className="text-right">
                    {scene.overallScore !== null ? (
                      <div
                        className={`text-2xl font-bold ${
                          scene.overallScore >= 70 ? 'text-green-600' : 
                          scene.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'
                        }`}
                      >
                        {scene.overallScore}
                      </div>
                    ) : (
                      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    )}
                  </div>
                  
                  {/* Regenerate button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRegenerate(scene.sceneIndex)}
                    disabled={regeneratingScene === scene.sceneIndex}
                  >
                    {regeneratingScene === scene.sceneIndex ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['quality-report', projectId] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={onApproveAndRender}
            disabled={report.recommendation === 'pending' || report.issues.critical > 0}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {report.recommendation === 'approved' 
              ? 'Approve & Render' 
              : 'Render Anyway'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QualityDashboard;
```

---

## Step 3: Integrate into Project Dashboard

In `universal-video-producer.tsx`, add the Quality Dashboard after generation:

```tsx
import { QualityDashboard } from './quality-dashboard';

// Show Quality Dashboard when generation is complete
{project.status === 'generated' && (
  <QualityDashboard
    projectId={project.id}
    onRegenerateScene={handleRegenerateScene}
    onApproveAndRender={handleApproveAndRender}
  />
)}

// Add handlers:
const handleRegenerateScene = async (sceneIndex: number) => {
  await fetch(`/api/video-projects/${project.id}/regenerate-scene`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sceneIndex }),
  });
  // Refetch project to get updated status
  await refetchProject();
};

const handleApproveAndRender = async () => {
  await fetch(`/api/video-projects/${project.id}/render`, {
    method: 'POST',
  });
  // Navigate to rendering status or update UI
};
```

---

## Step 4: Store Quality Results During Generation

Update `server/services/universal-video-service.ts` to store quality results:

```typescript
// After quality evaluation in generateProjectAssets:
const qualityResult = await qualityEvaluationService.evaluateSceneComplete(
  frameBase64,
  {
    sceneIndex: i,
    sceneType: scene.type,
    narration: scene.narration,
    totalScenes: scenes.length,
    hasTextOverlay: !!scene.textOverlay,
  }
);

// Store in scene
scenes[i].qualityEvaluation = {
  overallScore: qualityResult.overallScore,
  compositionScore: qualityResult.compositionScore,
  brandComplianceScore: qualityResult.brandComplianceScore,
  issues: qualityResult.issues,
  evaluatedAt: new Date().toISOString(),
};

// Update project
await db
  .update(videoProjects)
  .set({ scenes })
  .where(eq(videoProjects.id, projectId));
```

---

## Verification Checklist

Before completing Phase 5, confirm:

- [ ] API endpoint returns quality data correctly
- [ ] Overall score displays prominently
- [ ] Score breakdown shows all three metrics
- [ ] Progress bars show correct colors for score ranges
- [ ] Issues are grouped by severity
- [ ] Collapsible issues section works
- [ ] Scene details dialog shows all scenes
- [ ] Regenerate buttons work for scenes
- [ ] Recommendation badge shows correct status
- [ ] Render button disabled when critical issues exist
- [ ] Polling updates during generation

---

## Score Thresholds

| Score Range | Color | Status |
|-------------|-------|--------|
| 85-100 | Green | Excellent |
| 70-84 | Yellow | Good |
| 50-69 | Orange | Needs Review |
| 0-49 | Red | Needs Fixes |

---

## Troubleshooting

### "Quality scores are null"
- Check quality evaluation is running
- Verify frames are being extracted
- Check for API key issues

### "Regenerate not working"
- Verify regenerate-scene endpoint exists
- Check scene index is correct
- Verify project ID is passed

### "Issues not showing"
- Check issues are stored in scene.qualityEvaluation
- Verify issue format matches interface
- Check collapsible state

---

## Phase 5 Complete

With Phase 5E complete, you now have:

1. **Brand Settings Panel** (5A) - Configure brand elements before generation
2. **Visual Style Provider Mapping** (5B) - Style affects provider selection
3. **Scene-Level Controls** (5C) - Content type and visual direction per scene
4. **Generation Preview** (5D) - See what will generate before starting
5. **Quality Dashboard** (5E) - View scores and issues after generation

**Expected User Flow:**
1. Create project → Configure brand settings and visual style
2. Review scenes → Adjust content types and visual direction
3. Click Generate → See preview with costs and providers
4. Confirm → Wait for generation
5. Review Quality → See scores, fix issues
6. Approve → Render final video
