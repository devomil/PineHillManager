import { useState } from 'react';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Play,
  Eye,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SceneQualityCard } from './scene-quality-card';

interface SceneQualityStatus {
  sceneIndex: number;
  score: number;
  status: 'approved' | 'needs_review' | 'rejected' | 'pending';
  issues: Array<{ severity: string; description: string }>;
  userApproved: boolean;
  autoApproved?: boolean;
  regenerationCount?: number;
}

interface ProjectQualityReport {
  projectId: string;
  overallScore: number;
  sceneStatuses: SceneQualityStatus[];
  approvedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  pendingCount: number;
  criticalIssueCount: number;
  majorIssueCount: number;
  minorIssueCount: number;
  passesThreshold: boolean;
  canRender: boolean;
  blockingReasons: string[];
  lastAnalyzedAt: string;
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

export function QADashboard({
  report,
  isLoading,
  onRunAnalysis,
  onApproveScene,
  onRejectScene,
  onRegenerateScene,
  onApproveAll,
  onProceedToRender,
}: QADashboardProps) {
  const [expandedScenes, setExpandedScenes] = useState<Set<number>>(new Set());
  const [showAllScenes, setShowAllScenes] = useState(false);
  
  if (isLoading) {
    return (
      <Card data-testid="qa-loading">
        <CardContent className="py-12 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Running quality analysis...</p>
          <p className="text-sm text-gray-400 mt-2">This may take a few minutes</p>
        </CardContent>
      </Card>
    );
  }
  
  if (!report) {
    return (
      <Card data-testid="qa-empty">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Quality Assurance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Run automated quality analysis to check all scenes before rendering.
          </p>
          <Button onClick={onRunAnalysis} className="w-full" data-testid="btn-analyze-all">
            <Eye className="h-4 w-4 mr-2" />
            Analyze All Scenes
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };
  
  const scenesToShow = showAllScenes 
    ? report.sceneStatuses 
    : report.sceneStatuses.filter(s => s.status !== 'approved');
  
  return (
    <div className="space-y-4" data-testid="qa-dashboard">
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
            <div className={`text-3xl font-bold ${getScoreColor(report.overallScore)}`} data-testid="overall-score">
              {report.overallScore}/100
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Progress value={report.overallScore} className="h-3" />
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-4" data-testid="status-counts">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600" data-testid="count-approved">
                {report.approvedCount}
              </div>
              <div className="text-xs text-gray-600">Approved</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600" data-testid="count-review">
                {report.needsReviewCount}
              </div>
              <div className="text-xs text-gray-600">Need Review</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600" data-testid="count-rejected">
                {report.rejectedCount}
              </div>
              <div className="text-xs text-gray-600">Rejected</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600" data-testid="count-issues">
                {report.criticalIssueCount + report.majorIssueCount}
              </div>
              <div className="text-xs text-gray-600">Issues</div>
            </div>
          </div>
          
          {report.blockingReasons.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4" data-testid="blocking-reasons">
              <div className="font-medium text-red-800 mb-1">Blocking Issues:</div>
              <ul className="text-sm text-red-700 space-y-1">
                {report.blockingReasons.map((reason, i) => (
                  <li key={i}>• {reason}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={onRunAnalysis} data-testid="btn-reanalyze">
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-Analyze
            </Button>
            {report.needsReviewCount > 0 && (
              <Button variant="outline" onClick={onApproveAll} data-testid="btn-approve-all">
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve All ({report.needsReviewCount})
              </Button>
            )}
            <Button 
              onClick={onProceedToRender}
              disabled={!report.canRender}
              className="flex-1"
              data-testid="btn-proceed-render"
            >
              <Play className="h-4 w-4 mr-2" />
              {report.canRender ? 'Proceed to Render' : 'Fix Issues First'}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scene Quality ({report.sceneStatuses.length} scenes)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllScenes(!showAllScenes)}
              data-testid="btn-toggle-scenes"
            >
              {showAllScenes ? 'Show Issues Only' : 'Show All'}
              {showAllScenes ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scenesToShow.length === 0 ? (
            <div className="text-center py-8 text-gray-500" data-testid="all-approved-message">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>All scenes approved!</p>
            </div>
          ) : (
            <div className="space-y-3" data-testid="scene-list">
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
      
      {report.lastAnalyzedAt && (
        <p className="text-xs text-gray-400 text-center" data-testid="last-analyzed">
          Last analyzed: {new Date(report.lastAnalyzedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
