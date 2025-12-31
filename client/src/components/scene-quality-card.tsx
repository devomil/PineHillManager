import { useState } from 'react';
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
  autoApproved?: boolean;
  regenerationCount?: number;
  thumbnailUrl?: string;
  narration?: string;
  provider?: string;
}

interface SceneQualityCardProps {
  scene: SceneQualityStatus;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRegenerate: () => void;
}

export function SceneQualityCard({
  scene,
  isExpanded,
  onToggleExpand,
  onApprove,
  onReject,
  onRegenerate,
}: SceneQualityCardProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  
  const getStatusIcon = () => {
    switch (scene.status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" data-testid="icon-approved" />;
      case 'needs_review':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" data-testid="icon-needs-review" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" data-testid="icon-rejected" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-300" data-testid="icon-pending" />;
    }
  };
  
  const getStatusBadge = () => {
    switch (scene.status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800" data-testid="badge-approved">Approved</Badge>;
      case 'needs_review':
        return <Badge className="bg-yellow-100 text-yellow-800" data-testid="badge-needs-review">Needs Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800" data-testid="badge-rejected">Rejected</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800" data-testid="badge-pending">Pending</Badge>;
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
  const minorIssues = scene.issues.filter(i => i.severity === 'minor');
  
  return (
    <div 
      className={`border rounded-lg ${scene.status === 'rejected' ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
      data-testid={`scene-card-${scene.sceneIndex}`}
    >
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
        data-testid={`scene-header-${scene.sceneIndex}`}
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          
          {/* Thumbnail */}
          {scene.thumbnailUrl ? (
            <div className="w-16 h-10 bg-gray-200 rounded overflow-hidden flex-shrink-0" data-testid={`thumbnail-${scene.sceneIndex}`}>
              <img src={scene.thumbnailUrl} alt={`Scene ${scene.sceneIndex + 1}`} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-10 bg-gradient-to-br from-gray-300 to-gray-400 rounded flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-medium">{scene.sceneIndex + 1}</span>
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">Scene {scene.sceneIndex + 1}</span>
              {getStatusBadge()}
              {scene.provider && (
                <Badge variant="outline" className="text-xs">{scene.provider}</Badge>
              )}
              {scene.regenerationCount && scene.regenerationCount > 0 && (
                <Badge variant="outline" className="text-xs text-gray-500">
                  Regen #{scene.regenerationCount}
                </Badge>
              )}
            </div>
            {scene.narration && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{scene.narration}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div 
            className={`px-3 py-1 rounded-full font-bold ${getScoreColor(scene.score)}`}
            data-testid={`score-${scene.sceneIndex}`}
          >
            {scene.score}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      {isExpanded && (
        <div className="border-t p-3 space-y-3" data-testid={`scene-details-${scene.sceneIndex}`}>
          {scene.issues.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-700">Issues ({scene.issues.length}):</div>
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
              {minorIssues.map((issue, i) => (
                <div key={`minor-${i}`} className="flex items-start gap-2 text-sm bg-gray-100 p-2 rounded">
                  <Badge className="text-xs bg-gray-200 text-gray-700 shrink-0">Minor</Badge>
                  <span>{issue.description}</span>
                </div>
              ))}
            </div>
          )}
          
          {scene.issues.length === 0 && (
            <div className="text-sm text-gray-500 italic">No issues detected</div>
          )}
          
          <div className="flex gap-2 pt-2 flex-wrap">
            {scene.status !== 'approved' && (
              <>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => { e.stopPropagation(); onApprove(); }}
                  data-testid={`btn-approve-${scene.sceneIndex}`}
                >
                  <ThumbsUp className="h-3 w-3 mr-1" />
                  Approve
                </Button>
                
                {!showRejectInput ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={(e) => { e.stopPropagation(); setShowRejectInput(true); }}
                    data-testid={`btn-reject-${scene.sceneIndex}`}
                  >
                    <ThumbsDown className="h-3 w-3 mr-1" />
                    Reject
                  </Button>
                ) : (
                  <div className="flex gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                    <Input
                      placeholder="Reason for rejection"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="text-sm h-8"
                      data-testid={`input-reject-reason-${scene.sceneIndex}`}
                    />
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => {
                        onReject(rejectReason || 'User rejected');
                        setShowRejectInput(false);
                        setRejectReason('');
                      }}
                      data-testid={`btn-confirm-reject-${scene.sceneIndex}`}
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
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={(e) => { e.stopPropagation(); onRegenerate(); }}
              data-testid={`btn-regenerate-${scene.sceneIndex}`}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Regenerate
            </Button>
          </div>
          
          {scene.userApproved && (
            <div className="text-xs text-green-600">✓ Manually approved by user</div>
          )}
          {scene.autoApproved && !scene.userApproved && (
            <div className="text-xs text-blue-600">✓ Auto-approved (score ≥ 85)</div>
          )}
        </div>
      )}
    </div>
  );
}
