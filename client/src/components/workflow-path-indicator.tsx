import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, Image, Video, Layers, Star, 
  ArrowRight, DollarSign, Zap, CheckCircle2, Loader2, AlertCircle, Play, SkipForward
} from "lucide-react";
import type { WorkflowPath, WorkflowDecision, WorkflowStep, StepStatus, WorkflowStepExecution } from "@shared/types/brand-workflow-types";

type QualityTier = 'ultra' | 'premium' | 'standard';

interface WorkflowPathIndicatorProps {
  decision: WorkflowDecision | null;
  isLoading?: boolean;
  compact?: boolean;
  projectQualityTier?: QualityTier;
  sceneQualityTier?: QualityTier | null;
  stepExecutions?: WorkflowStepExecution[];
  onStepExecute?: (stepName: string) => void;
  onRunFullPipeline?: () => void;
  isExecuting?: boolean;
}

const WORKFLOW_INFO: Record<WorkflowPath, {
  label: string;
  description: string;
  icon: typeof Sparkles;
  color: string;
  bgColor: string;
}> = {
  'standard': {
    label: 'Standard',
    description: 'AI generation without brand assets',
    icon: Sparkles,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  'product-image': {
    label: 'Product Image',
    description: 'AI environment + real product composition',
    icon: Image,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  'product-video': {
    label: 'Product Video',
    description: 'AI environment + product + animation',
    icon: Video,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  'logo-overlay-only': {
    label: 'Logo Overlay',
    description: 'AI generation + precise logo placement',
    icon: Layers,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  'brand-asset-direct': {
    label: 'Brand Asset',
    description: 'Using brand location asset directly',
    icon: Star,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  'product-hero': {
    label: 'Product Hero',
    description: 'Product photo animated as hero video',
    icon: Zap,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100',
  },
};

function getQualityLabel(impact: WorkflowDecision['qualityImpact'], projectTier?: QualityTier): { label: string; color: string } {
  if (projectTier) {
    switch (projectTier) {
      case 'ultra':
        return { label: 'Ultra Quality', color: 'text-purple-600' };
      case 'premium':
        return { label: 'Premium Quality', color: 'text-amber-600' };
      case 'standard':
        return { label: 'Standard Quality', color: 'text-gray-600' };
    }
  }
  switch (impact) {
    case 'higher':
      return { label: 'Higher Quality', color: 'text-green-600' };
    case 'lower':
      return { label: 'Lower Quality', color: 'text-orange-600' };
    default:
      return { label: 'Standard Quality', color: 'text-gray-600' };
  }
}

function getCostLabel(multiplier: number): { label: string; color: string } {
  if (multiplier <= 1) return { label: 'Standard Cost', color: 'text-gray-600' };
  if (multiplier <= 1.5) return { label: `${multiplier}x Cost`, color: 'text-amber-600' };
  return { label: `${multiplier}x Cost`, color: 'text-orange-600' };
}

function getStepStatusInfo(status: StepStatus): { icon: typeof CheckCircle2; color: string; bgColor: string } {
  switch (status) {
    case 'completed':
      return { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'running':
      return { icon: Loader2, color: 'text-blue-600', bgColor: 'bg-blue-100' };
    case 'failed':
      return { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-100' };
    case 'skipped':
      return { icon: SkipForward, color: 'text-gray-400', bgColor: 'bg-gray-100' };
    default:
      return { icon: Play, color: 'text-gray-500', bgColor: 'bg-gray-50' };
  }
}

export function WorkflowPathIndicator({ 
  decision, 
  isLoading, 
  compact = false, 
  projectQualityTier, 
  sceneQualityTier,
  stepExecutions = [],
  onStepExecute,
  onRunFullPipeline,
  isExecuting = false
}: WorkflowPathIndicatorProps) {
  if (isLoading) {
    return (
      <Card className="border-dashed animate-pulse">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-gray-200 rounded" />
            <div className="h-4 w-32 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!decision) {
    return null;
  }

  const info = WORKFLOW_INFO[decision.path];
  const Icon = info.icon;
  // Scene-level quality tier overrides project-level
  const effectiveQualityTier = sceneQualityTier || projectQualityTier;
  const qualityInfo = getQualityLabel(decision.qualityImpact, effectiveQualityTier);
  const costInfo = getCostLabel(decision.costMultiplier);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`${info.bgColor} ${info.color} border-0 cursor-help`}>
              <Icon className="w-3 h-3 mr-1" />
              {info.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium">{info.label} Workflow</p>
            <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
            <div className="flex gap-2 mt-2 text-xs">
              <span className={qualityInfo.color}>{qualityInfo.label}</span>
              <span className="text-muted-foreground">•</span>
              <span className={costInfo.color}>{costInfo.label}</span>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="border-l-4" style={{ borderLeftColor: `var(--${info.color.replace('text-', '')})` }}>
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${info.bgColor}`}>
              <Icon className={`w-5 h-5 ${info.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{info.label} Workflow</span>
                <Badge variant="outline" className="text-xs">
                  {Math.round(decision.confidence * 100)}% match
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{info.description}</p>
            </div>
          </div>
          
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className={`font-medium ${qualityInfo.color}`}>{qualityInfo.label}</div>
              <div className="text-xs text-muted-foreground">Quality</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${costInfo.color}`}>{costInfo.label}</div>
              <div className="text-xs text-muted-foreground">Cost</div>
            </div>
          </div>
        </div>

        {/* Simplified workflow display - no complex multi-step pipeline */}

        {decision.reasons.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <div className="text-xs text-muted-foreground">
              {decision.reasons.map((reason, i) => (
                <span key={i}>
                  {i > 0 && ' • '}
                  {reason}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function WorkflowPathBadge({ path }: { path: WorkflowPath }) {
  const info = WORKFLOW_INFO[path];
  const Icon = info.icon;
  
  return (
    <Badge variant="outline" className={`${info.bgColor} ${info.color} border-0`}>
      <Icon className="w-3 h-3 mr-1" />
      {info.label}
    </Badge>
  );
}
