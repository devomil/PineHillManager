import { FileText, Mic, ImageIcon, Video, Music, Layers, ShieldCheck, Play, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface PipelineStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  score?: number;
}

interface ProgressTrackerProps {
  steps: PipelineStep[];
  currentStepId?: string;
  qaScore?: number;
  qaStatus?: 'approved' | 'needs-review' | 'needs-fixes';
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

export function ProgressTracker({ steps, currentStepId, qaScore, qaStatus }: ProgressTrackerProps) {
  return (
    <div className="w-full" data-testid="progress-tracker">
      <div className="flex items-center justify-between gap-1 md:gap-2">
        {PIPELINE_STEPS.map((pipelineStep, index) => {
          const Icon = pipelineStep.icon;
          const status = getStepStatus(pipelineStep.id, steps);
          const score = pipelineStep.id === 'qa' ? qaScore : getStepScore(pipelineStep.id, steps);
          const isCurrent = currentStepId === pipelineStep.id;
          const isQA = pipelineStep.id === 'qa';

          const statusColors = {
            pending: 'bg-gray-100 dark:bg-gray-800 text-gray-400',
            'in-progress': 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 animate-pulse',
            completed: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
            error: 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400',
          };

          const qaStatusColors = {
            approved: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
            'needs-review': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300',
            'needs-fixes': 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
          };

          return (
            <div key={pipelineStep.id} className="flex flex-col items-center flex-1" data-testid={`step-${pipelineStep.id}`}>
              <div
                className={cn(
                  'w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-colors',
                  isQA && qaStatus && status === 'completed' ? qaStatusColors[qaStatus] : statusColors[status],
                  isCurrent && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                {status === 'completed' && !isQA ? (
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                ) : (
                  <Icon className="h-4 w-4 md:h-5 md:w-5" />
                )}
              </div>
              <span className={cn(
                'text-[10px] md:text-xs mt-1 text-center',
                status === 'completed' ? 'text-green-600 dark:text-green-400 font-medium' : 'text-gray-500 dark:text-gray-400'
              )}>
                {pipelineStep.label}
              </span>
              {isQA && score !== undefined && status === 'completed' && (
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-[10px] mt-0.5',
                    score >= 85 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                    score >= 70 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  )}
                  data-testid="qa-score-badge"
                >
                  {score}/100
                </Badge>
              )}
              {index < PIPELINE_STEPS.length - 1 && (
                <div className="hidden md:block absolute h-0.5 bg-gray-200 dark:bg-gray-700 w-full -z-10" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressTracker;
