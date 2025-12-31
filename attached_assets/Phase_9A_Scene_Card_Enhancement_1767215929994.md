# Phase 9A: Scene Card Enhancement

## Objective

Update scene cards in the Scenes Preview section to display quality scores, status indicators, provider badges, and action buttons. Users need to see at a glance which scenes are approved, which need review, and which provider generated each scene.

## Current State

```
┌─────────────────────────────────────────┐
│ ⋮⋮ [thumbnail] Solution | 18s | 🏠      │ ▼
│    Strategy Four: Practice Mindful...   │
└─────────────────────────────────────────┘
```

Shows only: scene type badge, duration, home icon, narration preview.

## Target State

```
┌──────────────────────────────────────────────────────────────────┐
│ ⋮⋮ [thumbnail] Solution | 18s | 🏠 | Kling 1.6      89 ✓       │ ▼
│    Strategy Four: Practice Mindful Eating. Slow down...         │
│    ┌─────────┐ ┌─────────┐ ┌──────────────┐                     │
│    │ Approve │ │ Reject  │ │ Regenerate ↻ │     needs review ⚠  │
│    └─────────┘ └─────────┘ └──────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

Shows: scene type, duration, home icon, **provider badge**, **quality score**, **status**, **action buttons**.

## Implementation

### Update Scene Card Component

Modify `client/src/components/scene-card.tsx`:

```tsx
import React, { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  GripVertical,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface SceneCardProps {
  scene: {
    id: number;
    sceneIndex: number;
    type: string;
    duration: number;
    narration: string;
    thumbnailUrl?: string;
    imageUrl?: string;
    videoUrl?: string;
    provider?: string;
    analysisResult?: {
      overallScore: number;
      recommendation: 'approved' | 'needs_review' | 'rejected' | 'critical_fail';
      issues: Array<{ severity: string; description: string }>;
    };
    userApproved?: boolean;
    regenerationCount?: number;
  };
  isExpanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRegenerate: () => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  isExpanded,
  onToggleExpand,
  onApprove,
  onReject,
  onRegenerate,
}) => {
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // Quality score helpers
  const score = scene.analysisResult?.overallScore;
  const recommendation = scene.analysisResult?.recommendation;
  const issues = scene.analysisResult?.issues || [];
  
  const getScoreColor = (s: number) => {
    if (s >= 85) return 'bg-green-100 text-green-700';
    if (s >= 70) return 'bg-yellow-100 text-yellow-700';
    if (s >= 50) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };
  
  const getStatusIcon = () => {
    if (scene.userApproved || recommendation === 'approved') {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    if (recommendation === 'needs_review') {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    }
    if (recommendation === 'rejected' || recommendation === 'critical_fail') {
      return <XCircle className="h-4 w-4 text-red-600" />;
    }
    return null;
  };
  
  const getStatusText = () => {
    if (scene.userApproved) return 'manually approved';
    if (recommendation === 'approved') return 'auto-approved';
    if (recommendation === 'needs_review') return 'needs review';
    if (recommendation === 'rejected' || recommendation === 'critical_fail') return 'rejected';
    return 'pending';
  };
  
  const getProviderBadge = () => {
    const provider = scene.provider;
    if (!provider) return null;
    
    const providerStyles: Record<string, string> = {
      'kling': 'bg-purple-100 text-purple-700',
      'runway': 'bg-blue-100 text-blue-700',
      'luma': 'bg-pink-100 text-pink-700',
      'hailuo': 'bg-teal-100 text-teal-700',
      'flux': 'bg-orange-100 text-orange-700',
      'falai': 'bg-indigo-100 text-indigo-700',
    };
    
    const providerNames: Record<string, string> = {
      'kling': 'Kling 1.6',
      'runway': 'Runway',
      'luma': 'Luma',
      'hailuo': 'Hailuo',
      'flux': 'Flux.1',
      'falai': 'fal.ai',
    };
    
    const style = providerStyles[provider] || 'bg-gray-100 text-gray-700';
    const name = providerNames[provider] || provider;
    
    return (
      <Badge className={`text-xs ${style}`}>
        {name}
      </Badge>
    );
  };
  
  const needsAction = recommendation === 'needs_review' && !scene.userApproved;
  const isRejected = recommendation === 'rejected' || recommendation === 'critical_fail';
  
  return (
    <div className={`
      border rounded-lg overflow-hidden
      ${isRejected ? 'border-red-300 bg-red-50' : ''}
      ${needsAction ? 'border-yellow-300 bg-yellow-50' : ''}
    `}>
      {/* Main Row */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
      >
        {/* Drag Handle */}
        <div className="text-gray-400">
          <GripVertical className="h-5 w-5" />
        </div>
        
        {/* Thumbnail */}
        <div className="w-24 h-14 bg-gray-200 rounded overflow-hidden flex-shrink-0">
          {(scene.thumbnailUrl || scene.imageUrl) && (
            <img 
              src={scene.thumbnailUrl || scene.imageUrl} 
              alt="" 
              className="w-full h-full object-cover"
            />
          )}
        </div>
        
        {/* Scene Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Scene Type Badge */}
            <Badge variant="outline" className="text-xs capitalize">
              {scene.type}
            </Badge>
            
            {/* Duration */}
            <span className="text-xs text-gray-500">{scene.duration}s</span>
            
            {/* Home Icon (if applicable) */}
            <span className="text-gray-400">🏠</span>
            
            {/* Provider Badge - NEW */}
            {getProviderBadge()}
            
            {/* Regeneration Count */}
            {scene.regenerationCount && scene.regenerationCount > 0 && (
              <Badge variant="outline" className="text-xs text-gray-500">
                Regen #{scene.regenerationCount}
              </Badge>
            )}
          </div>
          
          {/* Narration Preview */}
          <p className="text-sm text-gray-600 truncate mt-1">
            {scene.narration}
          </p>
        </div>
        
        {/* Quality Score - NEW */}
        {score !== undefined && (
          <div className={`px-3 py-1 rounded-full font-bold text-sm ${getScoreColor(score)}`}>
            {score}
          </div>
        )}
        
        {/* Status Icon - NEW */}
        {getStatusIcon()}
        
        {/* Expand/Collapse */}
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t p-3 space-y-3 bg-white">
          {/* Status Banner */}
          {needsAction && (
            <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 p-2 rounded text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>This scene needs your review before rendering</span>
            </div>
          )}
          
          {isRejected && (
            <div className="flex items-center gap-2 bg-red-100 text-red-800 p-2 rounded text-sm">
              <XCircle className="h-4 w-4" />
              <span>This scene was rejected and must be regenerated</span>
            </div>
          )}
          
          {/* Issues List */}
          {issues.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">Issues detected:</div>
              {issues.slice(0, 3).map((issue, idx) => (
                <div 
                  key={idx}
                  className={`text-xs p-2 rounded ${
                    issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                    issue.severity === 'major' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-600'
                  }`}
                >
                  {issue.description}
                </div>
              ))}
            </div>
          )}
          
          {/* Action Buttons - NEW */}
          <div className="flex items-center gap-2 pt-2">
            {/* Approve Button */}
            {needsAction && (
              <Button 
                size="sm" 
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove();
                }}
              >
                <ThumbsUp className="h-3 w-3 mr-1" />
                Approve
              </Button>
            )}
            
            {/* Reject Button */}
            {needsAction && !showRejectInput && (
              <Button 
                size="sm" 
                variant="outline"
                className="text-red-600 border-red-300 hover:bg-red-50"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRejectInput(true);
                }}
              >
                <ThumbsDown className="h-3 w-3 mr-1" />
                Reject
              </Button>
            )}
            
            {/* Reject Input */}
            {showRejectInput && (
              <div className="flex gap-2 flex-1" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder="Reason for rejection"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="flex-1 text-sm border rounded px-2 py-1"
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
            
            {/* Regenerate Button */}
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
            
            {/* Status Text */}
            <span className="ml-auto text-xs text-gray-500">
              {getStatusText()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## Update Scenes Preview Container

The parent component that renders scene cards needs to pass the new props and handle actions:

```tsx
// In the scenes preview section of universal-video-producer.tsx

const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());

const handleApproveScene = async (sceneId: number) => {
  await fetch(`/api/scenes/${sceneId}/approve`, { method: 'POST' });
  // Refresh project data
  refetchProject();
};

const handleRejectScene = async (sceneId: number, reason: string) => {
  await fetch(`/api/scenes/${sceneId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  refetchProject();
};

const handleRegenerateScene = async (sceneId: number) => {
  await fetch(`/api/scenes/${sceneId}/regenerate`, { method: 'POST' });
  refetchProject();
};

// In render:
<div className="space-y-3">
  {project.scenes.map((scene) => (
    <SceneCard
      key={scene.id}
      scene={scene}
      isExpanded={expandedScenes.has(scene.id)}
      onToggleExpand={() => {
        const newSet = new Set(expandedScenes);
        if (newSet.has(scene.id)) {
          newSet.delete(scene.id);
        } else {
          newSet.add(scene.id);
        }
        setExpandedScenes(newSet);
      }}
      onApprove={() => handleApproveScene(scene.id)}
      onReject={(reason) => handleRejectScene(scene.id, reason)}
      onRegenerate={() => handleRegenerateScene(scene.id)}
    />
  ))}
</div>
```

---

## Filter Controls

Add filter controls above the scenes list to quickly find scenes needing attention:

```tsx
// Above scenes list
<div className="flex items-center gap-2 mb-4">
  <span className="text-sm text-gray-500">Filter:</span>
  <Button
    size="sm"
    variant={filter === 'all' ? 'default' : 'outline'}
    onClick={() => setFilter('all')}
  >
    All ({project.scenes.length})
  </Button>
  <Button
    size="sm"
    variant={filter === 'needs_review' ? 'default' : 'outline'}
    onClick={() => setFilter('needs_review')}
  >
    Needs Review ({scenesNeedingReview.length})
  </Button>
  <Button
    size="sm"
    variant={filter === 'rejected' ? 'default' : 'outline'}
    onClick={() => setFilter('rejected')}
  >
    Rejected ({rejectedScenes.length})
  </Button>
  <Button
    size="sm"
    variant={filter === 'approved' ? 'default' : 'outline'}
    onClick={() => setFilter('approved')}
  >
    Approved ({approvedScenes.length})
  </Button>
</div>
```

---

## Verification Checklist

- [ ] Scene cards show quality score (89, 94, etc.)
- [ ] Score is color-coded (green ≥85, yellow 70-84, red <70)
- [ ] Scene cards show provider badge (Kling 1.6, Flux.1, etc.)
- [ ] Scene cards show status icon (✓, ⚠, ❌)
- [ ] Scenes needing review have yellow background
- [ ] Rejected scenes have red background
- [ ] Approve button works and updates status
- [ ] Reject button shows input for reason
- [ ] Reject submission works and updates status
- [ ] Regenerate button triggers regeneration
- [ ] Regeneration count shown when > 0
- [ ] Issues displayed in expanded view
- [ ] Filter controls work correctly

---

## Next Phase

Once Scene Cards are enhanced, proceed to **Phase 9B: Scene Editor Provider Update** to replace the old media sources with the new AI providers.
