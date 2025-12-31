# Phase 8F: Quality Assurance Dashboard

## Objective

Create a user-facing quality assurance dashboard that displays per-scene quality scores, enables scene approval/rejection, provides regeneration controls, and gates rendering until quality thresholds are met.

## Problems This Solves

1. **No quality visibility** - Users can't see quality scores before rendering
2. **No approval workflow** - Broken content goes straight to render
3. **Manual regeneration** - No easy way to fix individual scenes
4. **No threshold enforcement** - Low-quality videos get produced

## What This Phase Creates

- `client/src/components/qa-dashboard.tsx` - Main dashboard component
- `client/src/components/scene-quality-card.tsx` - Per-scene quality display
- `client/src/components/quality-gate-modal.tsx` - Pre-render approval modal
- `server/services/quality-gate-service.ts` - Threshold enforcement
- API endpoints for QA workflow

---

## Quality Gate Service

Create `server/services/quality-gate-service.ts`:

```typescript
// server/services/quality-gate-service.ts

import { SceneAnalysisResult } from './scene-analysis-service';

// ============================================
// TYPES
// ============================================

export interface QualityThresholds {
  minimumSceneScore: number;      // Default: 70
  minimumProjectScore: number;    // Default: 75
  maximumCriticalIssues: number;  // Default: 0
  maximumMajorIssues: number;     // Default: 3
  requireUserApproval: boolean;   // Default: true for scores 70-84
}

export interface SceneQualityStatus {
  sceneIndex: number;
  score: number;
  status: 'approved' | 'needs_review' | 'rejected' | 'pending';
  issues: Array<{
    severity: string;
    description: string;
  }>;
  userApproved: boolean;
  autoApproved: boolean;
  regenerationCount: number;
}

export interface ProjectQualityReport {
  projectId: number;
  overallScore: number;
  sceneStatuses: SceneQualityStatus[];
  
  // Summary counts
  approvedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  pendingCount: number;
  
  // Issue summary
  criticalIssueCount: number;
  majorIssueCount: number;
  minorIssueCount: number;
  
  // Gate status
  passesThreshold: boolean;
  canRender: boolean;
  blockingReasons: string[];
  
  // Timestamps
  lastAnalyzedAt: string;
  lastApprovedAt?: string;
}

// ============================================
// DEFAULT THRESHOLDS
// ============================================

const DEFAULT_THRESHOLDS: QualityThresholds = {
  minimumSceneScore: 70,
  minimumProjectScore: 75,
  maximumCriticalIssues: 0,
  maximumMajorIssues: 3,
  requireUserApproval: true,
};

// ============================================
// QUALITY GATE SERVICE
// ============================================

class QualityGateService {
  
  /**
   * Generate quality report for a project
   */
  generateReport(
    projectId: number,
    sceneAnalyses: SceneAnalysisResult[],
    userApprovals: Map<number, boolean>,
    thresholds: QualityThresholds = DEFAULT_THRESHOLDS
  ): ProjectQualityReport {
    
    // Build scene statuses
    const sceneStatuses: SceneQualityStatus[] = sceneAnalyses.map(analysis => {
      const userApproved = userApprovals.get(analysis.sceneIndex) || false;
      const autoApproved = analysis.overallScore >= 85;
      
      let status: SceneQualityStatus['status'] = 'pending';
      if (userApproved || autoApproved) {
        status = 'approved';
      } else if (analysis.recommendation === 'critical_fail') {
        status = 'rejected';
      } else if (analysis.overallScore < thresholds.minimumSceneScore) {
        status = 'rejected';
      } else {
        status = 'needs_review';
      }
      
      return {
        sceneIndex: analysis.sceneIndex,
        score: analysis.overallScore,
        status,
        issues: analysis.issues.map(i => ({
          severity: i.severity,
          description: i.description,
        })),
        userApproved,
        autoApproved,
        regenerationCount: 0, // Track from database
      };
    });
    
    // Calculate counts
    const approvedCount = sceneStatuses.filter(s => s.status === 'approved').length;
    const needsReviewCount = sceneStatuses.filter(s => s.status === 'needs_review').length;
    const rejectedCount = sceneStatuses.filter(s => s.status === 'rejected').length;
    const pendingCount = sceneStatuses.filter(s => s.status === 'pending').length;
    
    // Count issues
    let criticalCount = 0;
    let majorCount = 0;
    let minorCount = 0;
    
    for (const analysis of sceneAnalyses) {
      for (const issue of analysis.issues) {
        if (issue.severity === 'critical') criticalCount++;
        else if (issue.severity === 'major') majorCount++;
        else minorCount++;
      }
    }
    
    // Calculate overall score (average of scene scores)
    const overallScore = sceneStatuses.length > 0
      ? Math.round(sceneStatuses.reduce((sum, s) => sum + s.score, 0) / sceneStatuses.length)
      : 0;
    
    // Determine if passes threshold
    const blockingReasons: string[] = [];
    
    if (overallScore < thresholds.minimumProjectScore) {
      blockingReasons.push(`Overall score ${overallScore} below minimum ${thresholds.minimumProjectScore}`);
    }
    
    if (criticalCount > thresholds.maximumCriticalIssues) {
      blockingReasons.push(`${criticalCount} critical issues (max ${thresholds.maximumCriticalIssues})`);
    }
    
    if (majorCount > thresholds.maximumMajorIssues) {
      blockingReasons.push(`${majorCount} major issues (max ${thresholds.maximumMajorIssues})`);
    }
    
    if (rejectedCount > 0) {
      blockingReasons.push(`${rejectedCount} rejected scenes need regeneration`);
    }
    
    if (thresholds.requireUserApproval && needsReviewCount > 0) {
      blockingReasons.push(`${needsReviewCount} scenes need user review`);
    }
    
    const passesThreshold = blockingReasons.length === 0;
    const canRender = passesThreshold || 
      (blockingReasons.length === 1 && blockingReasons[0].includes('user review'));
    
    return {
      projectId,
      overallScore,
      sceneStatuses,
      approvedCount,
      needsReviewCount,
      rejectedCount,
      pendingCount,
      criticalIssueCount: criticalCount,
      majorIssueCount: majorCount,
      minorIssueCount: minorCount,
      passesThreshold,
      canRender,
      blockingReasons,
      lastAnalyzedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Check if project can proceed to rendering
   */
  canProceedToRender(report: ProjectQualityReport): { allowed: boolean; reason: string } {
    if (report.passesThreshold) {
      return { allowed: true, reason: 'All quality checks passed' };
    }
    
    if (report.canRender && report.needsReviewCount > 0) {
      return { 
        allowed: true, 
        reason: `${report.needsReviewCount} scenes pending review - user can override` 
      };
    }
    
    return {
      allowed: false,
      reason: report.blockingReasons.join('; '),
    };
  }
  
  /**
   * Apply user approval to a scene
   */
  approveScene(
    report: ProjectQualityReport,
    sceneIndex: number
  ): ProjectQualityReport {
    const updatedStatuses = report.sceneStatuses.map(s => {
      if (s.sceneIndex === sceneIndex) {
        return { ...s, status: 'approved' as const, userApproved: true };
      }
      return s;
    });
    
    // Recalculate counts
    const approvedCount = updatedStatuses.filter(s => s.status === 'approved').length;
    const needsReviewCount = updatedStatuses.filter(s => s.status === 'needs_review').length;
    
    // Update blocking reasons
    const blockingReasons = report.blockingReasons.filter(
      r => !r.includes('user review') || needsReviewCount > 0
    );
    
    return {
      ...report,
      sceneStatuses: updatedStatuses,
      approvedCount,
      needsReviewCount,
      blockingReasons,
      passesThreshold: blockingReasons.length === 0,
      canRender: blockingReasons.length === 0 || needsReviewCount === 0,
      lastApprovedAt: new Date().toISOString(),
    };
  }
  
  /**
   * Reject a scene (requires regeneration)
   */
  rejectScene(
    report: ProjectQualityReport,
    sceneIndex: number,
    reason: string
  ): ProjectQualityReport {
    const updatedStatuses = report.sceneStatuses.map(s => {
      if (s.sceneIndex === sceneIndex) {
        return { 
          ...s, 
          status: 'rejected' as const, 
          userApproved: false,
          issues: [...s.issues, { severity: 'major', description: `User rejected: ${reason}` }],
        };
      }
      return s;
    });
    
    const rejectedCount = updatedStatuses.filter(s => s.status === 'rejected').length;
    
    return {
      ...report,
      sceneStatuses: updatedStatuses,
      rejectedCount,
      blockingReasons: [...report.blockingReasons, `${rejectedCount} rejected scenes`],
      passesThreshold: false,
      canRender: false,
    };
  }
  
  /**
   * Approve all scenes that meet auto-approval threshold
   */
  autoApproveEligible(report: ProjectQualityReport): ProjectQualityReport {
    const updatedStatuses = report.sceneStatuses.map(s => {
      if (s.score >= 85 && s.status === 'needs_review') {
        return { ...s, status: 'approved' as const, autoApproved: true };
      }
      return s;
    });
    
    const approvedCount = updatedStatuses.filter(s => s.status === 'approved').length;
    const needsReviewCount = updatedStatuses.filter(s => s.status === 'needs_review').length;
    
    return {
      ...report,
      sceneStatuses: updatedStatuses,
      approvedCount,
      needsReviewCount,
    };
  }
}

export const qualityGateService = new QualityGateService();
```

---

## QA Dashboard Component

Create `client/src/components/qa-dashboard.tsx`:

```tsx
// client/src/components/qa-dashboard.tsx

import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  Eye,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SceneQualityCard } from './scene-quality-card';

interface ProjectQualityReport {
  projectId: number;
  overallScore: number;
  sceneStatuses: SceneQualityStatus[];
  approvedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  criticalIssueCount: number;
  majorIssueCount: number;
  passesThreshold: boolean;
  canRender: boolean;
  blockingReasons: string[];
}

interface SceneQualityStatus {
  sceneIndex: number;
  score: number;
  status: 'approved' | 'needs_review' | 'rejected' | 'pending';
  issues: Array<{ severity: string; description: string }>;
  userApproved: boolean;
}

interface QADashboardProps {
  report: ProjectQualityReport | null;
  isLoading: boolean;
  onRunAnalysis: () => void;
  onApproveScene: (sceneIndex: number) => void;
  onRejectScene: (sceneIndex: number, reason: string) => void;
  onRegenerateScene: (sceneIndex: number) => void;
  onApproveAll: () => void;
  onProceedToRender: () => void;
}

export const QADashboard: React.FC<QADashboardProps> = ({
  report,
  isLoading,
  onRunAnalysis,
  onApproveScene,
  onRejectScene,
  onRegenerateScene,
  onApproveAll,
  onProceedToRender,
}) => {
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());
  const [showAllScenes, setShowAllScenes] = useState(false);
  
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Running quality analysis...</p>
          <p className="text-sm text-gray-400 mt-2">This may take a few minutes</p>
        </CardContent>
      </Card>
    );
  }
  
  // No report yet
  if (!report) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Quality Assurance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Run automated quality analysis to check all scenes before rendering.
          </p>
          <Button onClick={onRunAnalysis} className="w-full">
            <Eye className="h-4 w-4 mr-2" />
            Analyze All Scenes
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  // Score color helper
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    if (score >= 50) return 'bg-orange-100';
    return 'bg-red-100';
  };
  
  // Filter scenes to show
  const scenesToShow = showAllScenes 
    ? report.sceneStatuses 
    : report.sceneStatuses.filter(s => s.status !== 'approved');
  
  return (
    <div className="space-y-4">
      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {report.passesThreshold ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : report.canRender ? (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Quality Report
            </div>
            <div className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`}>
              {report.overallScore}/100
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Progress bar */}
          <div className="mb-4">
            <Progress value={report.overallScore} className="h-3" />
          </div>
          
          {/* Status counts */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{report.approvedCount}</div>
              <div className="text-xs text-gray-600">Approved</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{report.needsReviewCount}</div>
              <div className="text-xs text-gray-600">Need Review</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{report.rejectedCount}</div>
              <div className="text-xs text-gray-600">Rejected</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {report.criticalIssueCount + report.majorIssueCount}
              </div>
              <div className="text-xs text-gray-600">Issues</div>
            </div>
          </div>
          
          {/* Blocking reasons */}
          {report.blockingReasons.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="font-medium text-red-800 mb-1">Blocking Issues:</div>
              <ul className="text-sm text-red-700 space-y-1">
                {report.blockingReasons.map((reason, i) => (
                  <li key={i}>• {reason}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Action buttons */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onRunAnalysis} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-Analyze
            </Button>
            {report.needsReviewCount > 0 && (
              <Button variant="outline" onClick={onApproveAll} className="flex-1">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve All ({report.needsReviewCount})
              </Button>
            )}
            <Button 
              onClick={onProceedToRender}
              disabled={!report.canRender}
              className="flex-1"
            >
              <Play className="h-4 w-4 mr-2" />
              {report.canRender ? 'Proceed to Render' : 'Fix Issues First'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Scene List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scene Quality ({report.sceneStatuses.length} scenes)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllScenes(!showAllScenes)}
            >
              {showAllScenes ? 'Show Issues Only' : 'Show All'}
              {showAllScenes ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scenesToShow.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>All scenes approved!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scenesToShow.map(scene => (
                <SceneQualityCard
                  key={scene.sceneIndex}
                  scene={scene}
                  isExpanded={expandedScenes.has(scene.sceneIndex)}
                  onToggleExpand={() => {
                    const newSet = new Set(expandedScenes);
                    if (newSet.has(scene.sceneIndex)) {
                      newSet.delete(scene.sceneIndex);
                    } else {
                      newSet.add(scene.sceneIndex);
                    }
                    setExpandedScenes(newSet);
                  }}
                  onApprove={() => onApproveScene(scene.sceneIndex)}
                  onReject={(reason) => onRejectScene(scene.sceneIndex, reason)}
                  onRegenerate={() => onRegenerateScene(scene.sceneIndex)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## Scene Quality Card Component

Create `client/src/components/scene-quality-card.tsx`:

```tsx
// client/src/components/scene-quality-card.tsx

import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface SceneQualityStatus {
  sceneIndex: number;
  score: number;
  status: 'approved' | 'needs_review' | 'rejected' | 'pending';
  issues: Array<{ severity: string; description: string }>;
  userApproved: boolean;
}

interface SceneQualityCardProps {
  scene: SceneQualityStatus;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRegenerate: () => void;
}

export const SceneQualityCard: React.FC<SceneQualityCardProps> = ({
  scene,
  isExpanded,
  onToggleExpand,
  onApprove,
  onReject,
  onRegenerate,
}) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  
  const getStatusIcon = () => {
    switch (scene.status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'needs_review':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-300" />;
    }
  };
  
  const getStatusBadge = () => {
    switch (scene.status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'needs_review':
        return <Badge className="bg-yellow-100 text-yellow-800">Needs Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Pending</Badge>;
    }
  };
  
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-100';
    if (score >= 70) return 'text-yellow-600 bg-yellow-100';
    if (score >= 50) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };
  
  const criticalIssues = scene.issues.filter(i => i.severity === 'critical');
  const majorIssues = scene.issues.filter(i => i.severity === 'major');
  
  return (
    <div className={`border rounded-lg ${scene.status === 'rejected' ? 'border-red-300 bg-red-50' : ''}`}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <span className="font-medium">Scene {scene.sceneIndex + 1}</span>
          {getStatusBadge()}
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full font-bold ${getScoreColor(scene.score)}`}>
            {scene.score}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3">
          {/* Issues */}
          {scene.issues.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Issues:</div>
              {criticalIssues.map((issue, i) => (
                <div key={`critical-${i}`} className="flex items-start gap-2 text-sm bg-red-100 p-2 rounded">
                  <Badge variant="destructive" className="text-xs shrink-0">Critical</Badge>
                  <span>{issue.description}</span>
                </div>
              ))}
              {majorIssues.map((issue, i) => (
                <div key={`major-${i}`} className="flex items-start gap-2 text-sm bg-yellow-100 p-2 rounded">
                  <Badge className="text-xs bg-yellow-200 text-yellow-800 shrink-0">Major</Badge>
                  <span>{issue.description}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {scene.status !== 'approved' && (
              <>
                <Button size="sm" variant="outline" onClick={onApprove}>
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                
                {!showRejectInput ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowRejectInput(true)}
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                ) : (
                  <div className="flex gap-2 flex-1">
                    <Input
                      placeholder="Reason for rejection"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="text-sm h-8"
                    />
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => {
                        onReject(rejectReason);
                        setShowRejectInput(false);
                        setRejectReason('');
                      }}
                    >
                      Confirm
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setShowRejectInput(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </>
            )}
            
            <Button size="sm" variant="outline" onClick={onRegenerate}>
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          </div>
          
          {scene.userApproved && (
            <div className="text-xs text-green-600">✓ Manually approved by user</div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## API Endpoints

```typescript
// server/routes/quality-routes.ts

import { qualityGateService } from '../services/quality-gate-service';
import { sceneAnalysisService } from '../services/scene-analysis-service';

// GET /api/projects/:id/quality-report
router.get('/api/projects/:id/quality-report', async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = await getProjectWithScenes(projectId);
  
  // Get stored analyses
  const analyses = project.scenes
    .filter(s => s.analysisResult)
    .map(s => s.analysisResult);
  
  // Get user approvals
  const approvals = new Map(
    project.scenes
      .filter(s => s.userApproved)
      .map(s => [s.sceneIndex, true])
  );
  
  const report = qualityGateService.generateReport(
    projectId,
    analyses,
    approvals
  );
  
  res.json(report);
});

// POST /api/projects/:id/analyze-all
router.post('/api/projects/:id/analyze-all', async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = await getProjectWithScenes(projectId);
  
  // Analyze each scene
  const analyses = [];
  for (const scene of project.scenes) {
    if (scene.imageUrl || scene.videoUrl) {
      const imageBase64 = await fetchAsBase64(scene.imageUrl || scene.videoUrl);
      const analysis = await sceneAnalysisService.analyzeScene(imageBase64, {
        sceneIndex: scene.sceneIndex,
        sceneType: scene.type,
        narration: scene.narration,
        visualDirection: scene.visualDirection,
        expectedContentType: scene.contentType,
        totalScenes: project.scenes.length,
      });
      
      analyses.push(analysis);
      
      // Save analysis to scene
      await updateScene(scene.id, { analysisResult: analysis });
    }
  }
  
  // Generate report
  const report = qualityGateService.generateReport(
    projectId,
    analyses,
    new Map()
  );
  
  res.json(report);
});

// POST /api/scenes/:id/approve
router.post('/api/scenes/:id/approve', async (req, res) => {
  const sceneId = parseInt(req.params.id);
  await updateScene(sceneId, { userApproved: true });
  res.json({ success: true });
});

// POST /api/scenes/:id/reject
router.post('/api/scenes/:id/reject', async (req, res) => {
  const sceneId = parseInt(req.params.id);
  const { reason } = req.body;
  
  await updateScene(sceneId, { 
    userApproved: false,
    rejectionReason: reason,
  });
  
  res.json({ success: true });
});

// POST /api/projects/:id/approve-all
router.post('/api/projects/:id/approve-all', async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = await getProjectWithScenes(projectId);
  
  // Approve all scenes that need review
  for (const scene of project.scenes) {
    if (scene.analysisResult?.recommendation === 'needs_review') {
      await updateScene(scene.id, { userApproved: true });
    }
  }
  
  res.json({ success: true });
});
```

---

## Verification Checklist

- [ ] Quality gate service created
- [ ] Threshold checking working
- [ ] Blocking reasons generated
- [ ] QA dashboard component created
- [ ] Overall score displayed
- [ ] Status counts displayed (approved/review/rejected)
- [ ] Scene quality cards working
- [ ] Approve/Reject buttons working
- [ ] Regenerate triggers auto-regeneration
- [ ] Approve All button working
- [ ] Render blocked until threshold met
- [ ] User can override and proceed

---

## Phase 8 Complete Summary

After implementing all Phase 8 sub-phases:

| Feature | Purpose |
|---------|---------|
| **8A Scene Analysis** | Claude Vision analyzes every generated asset |
| **8B Auto-Regeneration** | Failed scenes automatically retry with improved prompts |
| **8C Text Placement** | Smart positioning avoids faces/subjects |
| **8D Transitions** | Mood-matched transitions between scenes |
| **8E Brand Injection** | Logo intro, watermark, CTA outro |
| **8F QA Dashboard** | User approval workflow before render |

The system now produces consistently high-quality, brand-compliant videos with user oversight.
