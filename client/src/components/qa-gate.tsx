import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface QAResult {
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
  projectId: string;
  qaResult: QAResult | null;
  isRunning: boolean;
  onRunQA: () => void;
  onProceedToRender: () => void;
  onRegenerateScene: (sceneIndex: number) => void;
}

export function QAGate({
  qaResult,
  isRunning,
  onRunQA,
  onProceedToRender,
  onRegenerateScene,
}: QAGateProps) {
  if (!qaResult && !isRunning) {
    return (
      <Card data-testid="qa-gate-pending">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5" />
            Quality Assurance Gate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Run automated quality review before rendering. Claude Vision will analyze each scene for technical quality, brand compliance, and AI artifacts.
          </p>
          <Button onClick={onRunQA} className="w-full" data-testid="button-run-qa">
            <Eye className="h-4 w-4 mr-2" />
            Run Claude Vision QA Review
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isRunning) {
    return (
      <Card data-testid="qa-gate-running">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Running Quality Review...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Claude Vision is analyzing each scene for quality, brand compliance, and AI artifacts...
          </p>
        </CardContent>
      </Card>
    );
  }

  const criticalIssues = qaResult?.issues.filter(i => i.severity === 'critical') || [];
  const majorIssues = qaResult?.issues.filter(i => i.severity === 'major') || [];
  const canProceed = qaResult?.recommendation !== 'needs-fixes';

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return 'bg-green-50 dark:bg-green-900/20';
    if (score >= 70) return 'bg-yellow-50 dark:bg-yellow-900/20';
    return 'bg-red-50 dark:bg-red-900/20';
  };

  return (
    <Card data-testid="qa-gate-results">
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
          <div className={`text-3xl font-bold ${getScoreColor(qaResult?.overallScore || 0)}`} data-testid="qa-overall-score">
            {qaResult?.overallScore}/100
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className={`rounded-lg p-2 ${getScoreBg(qaResult?.technicalScore || 0)}`}>
            <div className="text-xs text-gray-500 dark:text-gray-400">Technical</div>
            <div className={`font-bold ${getScoreColor(qaResult?.technicalScore || 0)}`} data-testid="score-technical">
              {qaResult?.technicalScore}
            </div>
          </div>
          <div className={`rounded-lg p-2 ${getScoreBg(qaResult?.brandComplianceScore || 0)}`}>
            <div className="text-xs text-gray-500 dark:text-gray-400">Brand</div>
            <div className={`font-bold ${getScoreColor(qaResult?.brandComplianceScore || 0)}`} data-testid="score-brand">
              {qaResult?.brandComplianceScore}
            </div>
          </div>
          <div className={`rounded-lg p-2 ${getScoreBg(qaResult?.compositionScore || 0)}`}>
            <div className="text-xs text-gray-500 dark:text-gray-400">Composition</div>
            <div className={`font-bold ${getScoreColor(qaResult?.compositionScore || 0)}`} data-testid="score-composition">
              {qaResult?.compositionScore}
            </div>
          </div>
          <div className={`rounded-lg p-2 ${qaResult?.aiArtifactsClear ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <div className="text-xs text-gray-500 dark:text-gray-400">AI Artifacts</div>
            <div className={qaResult?.aiArtifactsClear ? 'text-green-600 dark:text-green-400 font-bold' : 'text-red-600 dark:text-red-400 font-bold'} data-testid="ai-artifacts-status">
              {qaResult?.aiArtifactsClear ? '✓ Clear' : '⚠ Found'}
            </div>
          </div>
        </div>

        {criticalIssues.length > 0 && (
          <div className="space-y-2" data-testid="critical-issues">
            <h4 className="font-medium text-sm text-red-600 dark:text-red-400">Critical Issues ({criticalIssues.length})</h4>
            {criticalIssues.map((issue, idx) => (
              <div key={idx} className="flex items-center justify-between bg-red-50 dark:bg-red-900/20 p-2 rounded text-sm">
                <span className="text-red-700 dark:text-red-300">Scene {issue.sceneIndex + 1}: {issue.description}</span>
                <Button size="sm" variant="outline" onClick={() => onRegenerateScene(issue.sceneIndex)} data-testid={`button-regenerate-${issue.sceneIndex}`}>
                  Regenerate
                </Button>
              </div>
            ))}
          </div>
        )}

        {majorIssues.length > 0 && (
          <div className="space-y-2" data-testid="major-issues">
            <h4 className="font-medium text-sm text-yellow-600 dark:text-yellow-400">Major Issues ({majorIssues.length})</h4>
            {majorIssues.map((issue, idx) => (
              <div key={idx} className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded text-sm">
                <span className="text-yellow-700 dark:text-yellow-300">Scene {issue.sceneIndex + 1}: {issue.description}</span>
                <Button size="sm" variant="outline" onClick={() => onRegenerateScene(issue.sceneIndex)} data-testid={`button-fix-${issue.sceneIndex}`}>
                  Fix
                </Button>
              </div>
            ))}
          </div>
        )}

        {qaResult?.recommendation === 'approved' && (
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg text-center">
            <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <p className="text-sm text-green-700 dark:text-green-300 font-medium">All quality checks passed!</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onRunQA} className="flex-1" data-testid="button-rerun-qa">
            <RefreshCw className="h-4 w-4 mr-2" />
            Re-run QA
          </Button>
          <Button 
            onClick={onProceedToRender} 
            disabled={!canProceed} 
            className="flex-1"
            data-testid="button-proceed-render"
          >
            {canProceed ? 'Proceed to Render' : 'Fix Issues First'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default QAGate;
