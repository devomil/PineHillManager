# Phase 9D: QA Dashboard Implementation

## Objective

Create a comprehensive Quality Assurance dashboard that displays all scene quality scores, enables batch and individual scene approval/rejection, and gates rendering until quality thresholds are met.

## What This Creates

A modal or dedicated page containing:
- Overall project quality score
- Scene-by-scene quality breakdown
- Approve/Reject/Regenerate controls
- Bulk actions (Approve All, Re-Analyze)
- Render gate with clear blocking reasons

## Implementation

### Create QA Dashboard Modal

Create `client/src/components/qa-dashboard-modal.tsx`:

```tsx
import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  Eye,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface SceneQualityStatus {
  sceneIndex: number;
  score: number;
  status: 'approved' | 'needs_review' | 'rejected' | 'pending';
  issues: Array<{ severity: string; description: string }>;
  userApproved: boolean;
  autoApproved: boolean;
  regenerationCount: number;
  thumbnailUrl?: string;
  narration?: string;
  provider?: string;
}

interface QualityReport {
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

interface QADashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: QualityReport | null;
  isLoading?: boolean;
  onApproveScene: (sceneIndex: number) => Promise<void>;
  onRejectScene: (sceneIndex: number, reason: string) => Promise<void>;
  onRegenerateScene: (sceneIndex: number) => Promise<void>;
  onApproveAll: () => Promise<void>;
  onReAnalyze: () => Promise<void>;
  onProceedToRender: () => void;
}

export const QADashboardModal: React.FC<QADashboardModalProps> = ({
  isOpen,
  onClose,
  report,
  isLoading = false,
  onApproveScene,
  onRejectScene,
  onRegenerateScene,
  onApproveAll,
  onReAnalyze,
  onProceedToRender,
}) => {
  const [filter, setFilter] = useState<'all' | 'needs_review' | 'rejected' | 'approved'>('all');
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());
  const [processingScenes, setProcessingScenes] = useState<Set<number>>(new Set());
  
  if (!report && !isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Quality Assurance</DialogTitle>
          </DialogHeader>
          <div className="text-center py-12">
            <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 mb-4">No quality analysis available yet.</p>
            <Button onClick={onReAnalyze}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Quality Analysis
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Quality Assurance</DialogTitle>
          </DialogHeader>
          <div className="text-center py-12">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
            <p className="text-gray-600">Analyzing scenes with Claude Vision...</p>
            <p className="text-sm text-gray-400 mt-2">This may take a few minutes</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
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
  
  // Filter scenes
  const filteredScenes = report!.sceneStatuses.filter(scene => {
    if (filter === 'all') return true;
    if (filter === 'needs_review') return scene.status === 'needs_review' && !scene.userApproved;
    if (filter === 'rejected') return scene.status === 'rejected';
    if (filter === 'approved') return scene.status === 'approved' || scene.userApproved;
    return true;
  });
  
  const handleApprove = async (sceneIndex: number) => {
    setProcessingScenes(prev => new Set(prev).add(sceneIndex));
    try {
      await onApproveScene(sceneIndex);
    } finally {
      setProcessingScenes(prev => {
        const newSet = new Set(prev);
        newSet.delete(sceneIndex);
        return newSet;
      });
    }
  };
  
  const handleReject = async (sceneIndex: number, reason: string) => {
    setProcessingScenes(prev => new Set(prev).add(sceneIndex));
    try {
      await onRejectScene(sceneIndex, reason);
    } finally {
      setProcessingScenes(prev => {
        const newSet = new Set(prev);
        newSet.delete(sceneIndex);
        return newSet;
      });
    }
  };
  
  const handleRegenerate = async (sceneIndex: number) => {
    setProcessingScenes(prev => new Set(prev).add(sceneIndex));
    try {
      await onRegenerateScene(sceneIndex);
    } finally {
      setProcessingScenes(prev => {
        const newSet = new Set(prev);
        newSet.delete(sceneIndex);
        return newSet;
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Quality Assurance Dashboard</span>
            <div className={cn(
              "text-3xl font-bold",
              getScoreColor(report!.overallScore)
            )}>
              {report!.overallScore}/100
            </div>
          </DialogTitle>
        </DialogHeader>
        
        {/* Summary Section */}
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Quality</span>
              <span className={getScoreColor(report!.overallScore)}>
                {report!.passesThreshold ? 'Passing' : 'Below Threshold'}
              </span>
            </div>
            <Progress value={report!.overallScore} className="h-3" />
          </div>
          
          {/* Status Cards */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{report!.approvedCount}</div>
              <div className="text-xs text-gray-600">Approved</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{report!.needsReviewCount}</div>
              <div className="text-xs text-gray-600">Need Review</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{report!.rejectedCount}</div>
              <div className="text-xs text-gray-600">Rejected</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {report!.criticalIssueCount + report!.majorIssueCount}
              </div>
              <div className="text-xs text-gray-600">Total Issues</div>
            </div>
          </div>
          
          {/* Blocking Reasons */}
          {report!.blockingReasons.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
                <XCircle className="h-4 w-4" />
                Blocking Issues
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {report!.blockingReasons.map((reason, i) => (
                  <li key={i}>• {reason}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Bulk Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReAnalyze}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Re-Analyze All
            </Button>
            {report!.needsReviewCount > 0 && (
              <Button variant="outline" size="sm" onClick={onApproveAll}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve All Pending ({report!.needsReviewCount})
              </Button>
            )}
          </div>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex gap-2 border-b pb-2">
          <Button
            variant={filter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All ({report!.sceneStatuses.length})
          </Button>
          <Button
            variant={filter === 'needs_review' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('needs_review')}
          >
            <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />
            Needs Review ({report!.needsReviewCount})
          </Button>
          <Button
            variant={filter === 'rejected' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('rejected')}
          >
            <XCircle className="h-3 w-3 mr-1 text-red-500" />
            Rejected ({report!.rejectedCount})
          </Button>
          <Button
            variant={filter === 'approved' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilter('approved')}
          >
            <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
            Approved ({report!.approvedCount})
          </Button>
        </div>
        
        {/* Scene List */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-2 py-2">
            {filteredScenes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No scenes match this filter
              </div>
            ) : (
              filteredScenes.map(scene => (
                <SceneQualityRow
                  key={scene.sceneIndex}
                  scene={scene}
                  isExpanded={expandedScenes.has(scene.sceneIndex)}
                  isProcessing={processingScenes.has(scene.sceneIndex)}
                  onToggleExpand={() => {
                    setExpandedScenes(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(scene.sceneIndex)) {
                        newSet.delete(scene.sceneIndex);
                      } else {
                        newSet.add(scene.sceneIndex);
                      }
                      return newSet;
                    });
                  }}
                  onApprove={() => handleApprove(scene.sceneIndex)}
                  onReject={(reason) => handleReject(scene.sceneIndex, reason)}
                  onRegenerate={() => handleRegenerate(scene.sceneIndex)}
                />
              ))
            )}
          </div>
        </ScrollArea>
        
        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={onProceedToRender}
            disabled={!report!.canRender}
            className={cn(
              report!.canRender ? 'bg-green-600 hover:bg-green-700' : ''
            )}
          >
            <Play className="h-4 w-4 mr-2" />
            {report!.canRender ? 'Proceed to Render' : 'Fix Issues to Render'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Scene Quality Row Component
interface SceneQualityRowProps {
  scene: SceneQualityStatus;
  isExpanded: boolean;
  isProcessing: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRegenerate: () => void;
}

const SceneQualityRow: React.FC<SceneQualityRowProps> = ({
  scene,
  isExpanded,
  isProcessing,
  onToggleExpand,
  onApprove,
  onReject,
  onRegenerate,
}) => {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const getStatusIcon = () => {
    if (scene.userApproved || scene.status === 'approved') {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (scene.status === 'needs_review') {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    if (scene.status === 'rejected') {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    return <Circle className="h-5 w-5 text-gray-300" />;
  };
  
  const getScoreBadgeClass = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-700';
    if (score >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };
  
  const needsAction = scene.status === 'needs_review' && !scene.userApproved;
  
  return (
    <div className={cn(
      "border rounded-lg overflow-hidden",
      scene.status === 'rejected' && "border-red-300 bg-red-50",
      needsAction && "border-yellow-300 bg-yellow-50"
    )}>
      {/* Main Row */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
      >
        {getStatusIcon()}
        
        {/* Thumbnail */}
        {scene.thumbnailUrl && (
          <div className="w-16 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0">
            <img src={scene.thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">Scene {scene.sceneIndex + 1}</span>
            {scene.provider && (
              <Badge variant="outline" className="text-xs">{scene.provider}</Badge>
            )}
            {scene.regenerationCount > 0 && (
              <Badge variant="outline" className="text-xs text-gray-500">
                Regen #{scene.regenerationCount}
              </Badge>
            )}
          </div>
          {scene.narration && (
            <p className="text-xs text-gray-500 truncate">{scene.narration}</p>
          )}
        </div>
        
        <Badge className={cn("text-sm font-bold", getScoreBadgeClass(scene.score))}>
          {scene.score}
        </Badge>
        
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3 bg-white">
          {/* Issues */}
          {scene.issues.length > 0 && (
            <div className="space-y-1">
              {scene.issues.map((issue, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "text-xs p-2 rounded",
                    issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    issue.severity === 'major' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  )}
                >
                  <Badge className="mr-2" variant={issue.severity === 'critical' ? 'destructive' : 'outline'}>
                    {issue.severity}
                  </Badge>
                  {issue.description}
                </div>
              ))}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2">
            {needsAction && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600"
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                  disabled={isProcessing}
                >
                  {isProcessing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ThumbsUp className="h-3 w-3 mr-1" />}
                  Approve
                </Button>
                
                {!showRejectInput && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                    onClick={(e) => { e.stopPropagation(); setShowRejectInput(true); }}
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                )}
              </>
            )}
            
            {showRejectInput && (
              <div className="flex gap-2 flex-1" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Reason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="flex-1 text-sm border rounded px-2"
                />
                <Button size="sm" variant="destructive" onClick={() => {
                  onReject(rejectReason);
                  setShowRejectInput(false);
                }}>
                  Confirm
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowRejectInput(false)}>
                  Cancel
                </Button>
              </div>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              disabled={isProcessing}
            >
              {isProcessing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Regenerate
            </Button>
          </div>
          
          {scene.userApproved && (
            <div className="text-xs text-green-600">✓ Manually approved by user</div>
          )}
          {scene.autoApproved && (
            <div className="text-xs text-green-600">✓ Auto-approved (score ≥ 85)</div>
          )}
        </div>
      )}
    </div>
  );
};

export default QADashboardModal;
```

---

## API Integration

The dashboard calls these existing endpoints:

```typescript
// Fetch quality report
const fetchQAReport = async (projectId: number) => {
  const response = await fetch(`/api/projects/${projectId}/quality-report`);
  return response.json();
};

// Approve scene
const approveScene = async (sceneId: number) => {
  await fetch(`/api/scenes/${sceneId}/approve`, { method: 'POST' });
};

// Reject scene
const rejectScene = async (sceneId: number, reason: string) => {
  await fetch(`/api/scenes/${sceneId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
};

// Regenerate scene
const regenerateScene = async (sceneId: number) => {
  await fetch(`/api/scenes/${sceneId}/regenerate`, { method: 'POST' });
};

// Approve all pending
const approveAll = async (projectId: number) => {
  await fetch(`/api/projects/${projectId}/approve-all`, { method: 'POST' });
};

// Re-analyze all
const reAnalyze = async (projectId: number) => {
  await fetch(`/api/projects/${projectId}/analyze-all`, { method: 'POST' });
};
```

---

## Verification Checklist

- [ ] QA Dashboard modal opens from progress tracker
- [ ] Overall score displayed prominently
- [ ] Scene counts shown (approved, needs review, rejected)
- [ ] Blocking reasons displayed when present
- [ ] Filter tabs work (All, Needs Review, Rejected, Approved)
- [ ] Scene rows show thumbnail, score, status
- [ ] Expanded view shows issues
- [ ] Approve button works
- [ ] Reject with reason works
- [ ] Regenerate button works
- [ ] Approve All bulk action works
- [ ] Re-Analyze bulk action works
- [ ] Proceed to Render disabled when blocking issues exist
- [ ] Proceed to Render enabled when quality passes

---

## Next Phase

Once QA Dashboard is implemented, proceed to **Phase 9E: Generation Preview Enhancement** to show all providers and counts in the preview panel.
