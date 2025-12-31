import { FileText, Mic, ImageIcon, Video, Music, Layers, ShieldCheck, Play, CheckCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';

export interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  score?: number;
}

export interface QAReport {
  overallScore: number;
  approvedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
  totalScenes: number;
}

interface ProgressTrackerProps {
  steps: PipelineStep[];
  currentStepId?: string;
  qaScore?: number;
  qaStatus?: 'pending' | 'analyzing' | 'approved' | 'needs-review' | 'needs-fixes';
  qaReport?: QAReport;
  onQAClick?: () => void;
}

const PIPELINE_STEPS = [
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'voiceover', label: 'Voiceover', icon: Mic },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'assembly', label: 'Assembly', icon: Layers },
  { id: 'qa', label: 'QA', icon: ShieldCheck },
  { id: 'rendering', label: 'Rendering', icon: Play },
];

function getStepStatus(stepId: string, steps: PipelineStep[]): PipelineStep['status'] {
  const step = steps.find(s => s.id === stepId);
  return step?.status || 'pending';
}

function getStepScore(stepId: string, steps: PipelineStep[]): number | undefined {
  const step = steps.find(s => s.id === stepId);
  return step?.score;
}

function getScoreLabel(score: number): string {
  if (score >= 85) return 'Passed';
  if (score >= 70) return 'Review';
  return 'Issues';
}

function getScoreColors(score: number) {
  if (score >= 85) {
    return {
      bg: 'bg-green-500',
      text: 'text-white',
      border: 'border-green-500',
      labelColor: 'text-green-600 dark:text-green-400',
    };
  }
  if (score >= 70) {
    return {
      bg: 'bg-yellow-500',
      text: 'text-white',
      border: 'border-yellow-500',
      labelColor: 'text-yellow-600 dark:text-yellow-400',
    };
  }
  return {
    bg: 'bg-red-500',
    text: 'text-white',
    border: 'border-red-500',
    labelColor: 'text-red-600 dark:text-red-400',
  };
}

export function ProgressTracker({ steps, currentStepId, qaScore, qaStatus = 'pending', qaReport, onQAClick }: ProgressTrackerProps) {
  // Calculate progress line to extend through to the current/next actionable step
  // The line should extend to the step after the last completed one (the "current" step)
  let lastCompletedIndex = -1;
  let hasInProgress = false;
  
  for (let i = 0; i < PIPELINE_STEPS.length; i++) {
    const status = getStepStatus(PIPELINE_STEPS[i].id, steps);
    if (status === 'completed') {
      lastCompletedIndex = i;
    }
    if (status === 'in-progress') {
      hasInProgress = true;
      if (i > lastCompletedIndex) lastCompletedIndex = i;
    }
  }
  
  // Check QA analyzing state
  if (qaStatus === 'analyzing') {
    const qaIndex = PIPELINE_STEPS.findIndex(s => s.id === 'qa');
    if (qaIndex > lastCompletedIndex) {
      lastCompletedIndex = qaIndex;
    }
  }
  
  // The progress line extends through the current step (one beyond last completed if exists)
  // This ensures the line reaches the "current" step the user is on
  const targetIndex = hasInProgress || qaStatus === 'analyzing' 
    ? lastCompletedIndex 
    : Math.min(lastCompletedIndex + 1, PIPELINE_STEPS.length - 1);
  
  // Use intervals (length - 1) for flex justify-between alignment
  // Node 0 at 0%, Node 7 at 100%, so QA (node 6) at 6/7 ≈ 85.7%
  const progressPercent = lastCompletedIndex >= 0 
    ? (targetIndex / (PIPELINE_STEPS.length - 1)) * 100 
    : 0;

  return (
    <div className="w-full" data-testid="progress-tracker">
      {/* Progress Line Background */}
      <div className="relative">
        <div className="absolute top-4 md:top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700 z-0" />
        <div 
          className="absolute top-4 md:top-5 left-0 h-0.5 bg-green-500 transition-all duration-500 z-0"
          style={{ width: `${progressPercent}%` }}
        />
        
        <div className="relative flex items-start justify-between gap-1 md:gap-2">
          {PIPELINE_STEPS.map((pipelineStep, index) => {
            const Icon = pipelineStep.icon;
            const status = getStepStatus(pipelineStep.id, steps);
            const score = pipelineStep.id === 'qa' ? qaScore : getStepScore(pipelineStep.id, steps);
            const isCurrent = currentStepId === pipelineStep.id;
            const isQA = pipelineStep.id === 'qa';
            const isCompleted = status === 'completed';
            const isInProgress = status === 'in-progress';
            const isPending = status === 'pending';
            const isError = status === 'error';

            const statusColors = {
              pending: 'bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-300 dark:border-gray-600',
              'in-progress': 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-blue-500',
              completed: 'bg-green-500 text-white border-green-500',
              error: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 border-red-500',
            };

            // QA step content
            const renderQAStep = () => {
              const qaIsCompleted = isCompleted || (qaStatus !== 'pending' && qaStatus !== 'analyzing');
              const qaIsAnalyzing = qaStatus === 'analyzing' || isInProgress;
              const scoreColors = score !== undefined ? getScoreColors(score) : null;

              const stepContent = (
                <div 
                  className={cn(
                    "flex flex-col items-center flex-1",
                    onQAClick && "cursor-pointer hover:opacity-80 transition-opacity"
                  )}
                  onClick={onQAClick}
                  data-testid="step-qa"
                >
                  <div
                    className={cn(
                      'w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors border-2 bg-white dark:bg-gray-900 z-10',
                      qaIsAnalyzing && 'border-blue-500 bg-blue-50 dark:bg-blue-900',
                      isPending && !qaIsAnalyzing && 'border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800',
                      qaIsCompleted && scoreColors && `${scoreColors.border} ${scoreColors.bg}`,
                      isCurrent && 'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    {qaIsCompleted && score !== undefined ? (
                      <span className={cn("text-xs md:text-sm font-bold", scoreColors?.text)}>
                        {score}
                      </span>
                    ) : qaIsAnalyzing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <span className={cn(
                    'text-[10px] md:text-xs mt-1 text-center font-medium',
                    qaIsCompleted && scoreColors ? scoreColors.labelColor : 
                    qaIsAnalyzing ? 'text-blue-600 dark:text-blue-400' : 
                    'text-gray-500 dark:text-gray-400'
                  )}>
                    {pipelineStep.label}
                  </span>
                  {qaIsCompleted && score !== undefined && (
                    <span className={cn(
                      'text-[9px] md:text-[10px]',
                      scoreColors?.labelColor || 'text-gray-400'
                    )}>
                      {getScoreLabel(score)}
                    </span>
                  )}
                </div>
              );

              // Wrap with hover card if QA is completed
              if (qaIsCompleted && score !== undefined && qaReport) {
                return (
                  <HoverCard openDelay={200}>
                    <HoverCardTrigger asChild>
                      {stepContent}
                    </HoverCardTrigger>
                    <HoverCardContent className="w-64" side="bottom">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">Quality Score</span>
                          <span className={cn(
                            "font-bold text-lg",
                            score >= 85 ? "text-green-600 dark:text-green-400" :
                            score >= 70 ? "text-yellow-600 dark:text-yellow-400" : 
                            "text-red-600 dark:text-red-400"
                          )}>
                            {score}/100
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1.5">
                          <div className="flex justify-between">
                            <span>Approved:</span>
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {qaReport.approvedCount} scenes
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Needs Review:</span>
                            <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                              {qaReport.needsReviewCount} scenes
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rejected:</span>
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              {qaReport.rejectedCount} scenes
                            </span>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            Click to open QA Dashboard
                          </span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                );
              }

              return stepContent;
            };

            // Render QA step specially
            if (isQA) {
              return <div key={pipelineStep.id} className="flex-1">{renderQAStep()}</div>;
            }

            // Regular step rendering
            return (
              <div key={pipelineStep.id} className="flex flex-col items-center flex-1" data-testid={`step-${pipelineStep.id}`}>
                <div
                  className={cn(
                    'w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors border-2 z-10',
                    statusColors[status],
                    isCurrent && 'ring-2 ring-primary ring-offset-2'
                  )}
                >
                  {isInProgress ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                  ) : (
                    <Icon className="h-4 w-4 md:h-5 md:w-5" />
                  )}
                </div>
                <span className={cn(
                  'text-[10px] md:text-xs mt-1 text-center',
                  isCompleted ? 'text-green-600 dark:text-green-400 font-medium' : 
                  isInProgress ? 'text-blue-600 dark:text-blue-400' :
                  isError ? 'text-red-600 dark:text-red-400' :
                  'text-gray-500 dark:text-gray-400'
                )}>
                  {pipelineStep.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { PIPELINE_STEPS };
export default ProgressTracker;
