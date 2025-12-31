# Phase 9C: Progress Tracker QA Step

## Objective

Add a QA (Quality Assurance) step to the progress tracker between Assembly and Rendering. This step shows the overall quality score and provides access to the QA Dashboard.

## Current State

```
[Script ✓]─[Voiceover ✓]─[Images ✓]─[Videos ✓]─[Music ✓]─[Assembly ●]─[Rendering]
```

7 steps, no QA visibility.

## Target State

```
[Script ✓]─[Voiceover ✓]─[Images ✓]─[Videos ✓]─[Music ✓]─[Assembly ✓]─[QA 87]─[Rendering]
                                                                         ↑
                                                           Click to open QA Dashboard
                                                           Green (≥85), Yellow (70-84), Red (<70)
```

8 steps, with QA score visible and clickable.

## Implementation

### Update Progress Tracker Component

Modify `client/src/components/progress-tracker.tsx`:

```tsx
import React from 'react';
import {
  FileText,
  Mic,
  Image,
  Video,
  Music,
  Layers,
  ShieldCheck,
  Play,
  CheckCircle,
  Circle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PipelineStep {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  // For QA step only:
  score?: number;
  onClick?: () => void;
}

interface ProgressTrackerProps {
  steps: PipelineStep[];
  qaScore?: number;
  qaStatus?: 'pending' | 'analyzing' | 'completed';
  onQAClick?: () => void;
}

// Default pipeline steps
const DEFAULT_STEPS: Omit<PipelineStep, 'status'>[] = [
  { id: 'script', label: 'Script', icon: FileText },
  { id: 'voiceover', label: 'Voiceover', icon: Mic },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'videos', label: 'Videos', icon: Video },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'assembly', label: 'Assembly', icon: Layers },
  { id: 'qa', label: 'QA', icon: ShieldCheck },        // NEW
  { id: 'rendering', label: 'Rendering', icon: Play },
];

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  steps,
  qaScore,
  qaStatus = 'pending',
  onQAClick,
}) => {
  
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-500 text-white';
    if (score >= 70) return 'bg-yellow-500 text-white';
    return 'bg-red-500 text-white';
  };
  
  const getScoreBorderColor = (score: number) => {
    if (score >= 85) return 'border-green-500';
    if (score >= 70) return 'border-yellow-500';
    return 'border-red-500';
  };
  
  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="relative">
        {/* Background Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
        
        {/* Progress Line */}
        <div 
          className="absolute top-5 left-0 h-0.5 bg-green-500 transition-all duration-500"
          style={{ 
            width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
          }}
        />
        
        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isQA = step.id === 'qa';
            const isCompleted = step.status === 'completed';
            const isInProgress = step.status === 'in_progress';
            const isPending = step.status === 'pending';
            const isError = step.status === 'error';
            
            return (
              <div 
                key={step.id}
                className={cn(
                  "flex flex-col items-center",
                  isQA && onQAClick && "cursor-pointer hover:opacity-80"
                )}
                onClick={isQA ? onQAClick : undefined}
              >
                {/* Icon Circle */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 bg-white z-10",
                  isCompleted && !isQA && "border-green-500 bg-green-500 text-white",
                  isInProgress && "border-blue-500 bg-blue-50",
                  isPending && "border-gray-300 bg-white text-gray-400",
                  isError && "border-red-500 bg-red-50 text-red-500",
                  // Special QA styling
                  isQA && qaStatus === 'completed' && qaScore !== undefined && getScoreBorderColor(qaScore),
                  isQA && qaStatus === 'completed' && qaScore !== undefined && getScoreColor(qaScore),
                  isQA && qaStatus === 'analyzing' && "border-blue-500 bg-blue-50",
                )}>
                  {/* Show score for completed QA step */}
                  {isQA && qaStatus === 'completed' && qaScore !== undefined ? (
                    <span className="text-xs font-bold">{qaScore}</span>
                  ) : isQA && qaStatus === 'analyzing' ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : isCompleted ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : isInProgress ? (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                </div>
                
                {/* Label */}
                <span className={cn(
                  "mt-2 text-xs font-medium",
                  isCompleted ? "text-green-600" : 
                  isInProgress ? "text-blue-600" : 
                  isError ? "text-red-600" :
                  "text-gray-500"
                )}>
                  {step.label}
                </span>
                
                {/* QA Tooltip */}
                {isQA && qaStatus === 'completed' && qaScore !== undefined && (
                  <span className="text-xs text-gray-400 mt-0.5">
                    {qaScore >= 85 ? 'Passed' : qaScore >= 70 ? 'Review' : 'Issues'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { DEFAULT_STEPS };
```

---

### Update Universal Video Producer

In `universal-video-producer.tsx`, integrate the QA step:

```tsx
import { ProgressTracker, DEFAULT_STEPS } from '@/components/progress-tracker';
import { QADashboard } from '@/components/qa-dashboard';

const UniversalVideoProducer: React.FC = () => {
  const [showQADashboard, setShowQADashboard] = useState(false);
  const [qaReport, setQAReport] = useState<QualityReport | null>(null);
  
  // Fetch QA report
  useEffect(() => {
    if (project?.id) {
      fetchQAReport(project.id).then(setQAReport);
    }
  }, [project?.id]);
  
  // Build steps with current status
  const pipelineSteps = DEFAULT_STEPS.map(step => {
    let status: 'pending' | 'in_progress' | 'completed' | 'error' = 'pending';
    
    // Determine status based on project state
    switch (step.id) {
      case 'script':
        status = project?.scriptParsed ? 'completed' : 
                 project?.parsingScript ? 'in_progress' : 'pending';
        break;
      case 'voiceover':
        status = project?.voiceoverGenerated ? 'completed' :
                 project?.generatingVoiceover ? 'in_progress' : 'pending';
        break;
      case 'images':
        status = project?.imagesGenerated ? 'completed' :
                 project?.generatingImages ? 'in_progress' : 'pending';
        break;
      case 'videos':
        status = project?.videosGenerated ? 'completed' :
                 project?.generatingVideos ? 'in_progress' : 'pending';
        break;
      case 'music':
        status = project?.musicGenerated ? 'completed' :
                 project?.generatingMusic ? 'in_progress' : 'pending';
        break;
      case 'assembly':
        status = project?.assembled ? 'completed' :
                 project?.assembling ? 'in_progress' : 'pending';
        break;
      case 'qa':
        status = qaReport ? 'completed' :
                 project?.analyzingQuality ? 'in_progress' : 'pending';
        break;
      case 'rendering':
        status = project?.rendered ? 'completed' :
                 project?.rendering ? 'in_progress' : 'pending';
        break;
    }
    
    return { ...step, status };
  });
  
  // Calculate QA score
  const qaScore = qaReport?.overallScore;
  const qaStatus = project?.analyzingQuality ? 'analyzing' : 
                   qaReport ? 'completed' : 'pending';
  
  return (
    <div>
      {/* Progress Tracker */}
      <div className="mb-6">
        <ProgressTracker
          steps={pipelineSteps}
          qaScore={qaScore}
          qaStatus={qaStatus}
          onQAClick={() => setShowQADashboard(true)}
        />
      </div>
      
      {/* Rest of the UI... */}
      
      {/* QA Dashboard Modal */}
      {showQADashboard && (
        <QADashboardModal
          isOpen={showQADashboard}
          onClose={() => setShowQADashboard(false)}
          report={qaReport}
          onApproveScene={handleApproveScene}
          onRejectScene={handleRejectScene}
          onRegenerateScene={handleRegenerateScene}
          onApproveAll={handleApproveAll}
          onReAnalyze={handleReAnalyze}
          onProceedToRender={handleProceedToRender}
        />
      )}
    </div>
  );
};
```

---

### QA Step Tooltip/Popover

Add a quick summary popover when hovering over the QA step:

```tsx
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';

// Wrap QA step in hover card
<HoverCard>
  <HoverCardTrigger asChild>
    <div className="flex flex-col items-center cursor-pointer" onClick={onQAClick}>
      {/* QA step content */}
    </div>
  </HoverCardTrigger>
  <HoverCardContent className="w-64">
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-medium">Quality Score</span>
        <span className={cn(
          "font-bold",
          qaScore >= 85 ? "text-green-600" :
          qaScore >= 70 ? "text-yellow-600" : "text-red-600"
        )}>
          {qaScore}/100
        </span>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <div className="flex justify-between">
          <span>Approved:</span>
          <span>{qaReport?.approvedCount || 0} scenes</span>
        </div>
        <div className="flex justify-between">
          <span>Needs Review:</span>
          <span className="text-yellow-600">{qaReport?.needsReviewCount || 0} scenes</span>
        </div>
        <div className="flex justify-between">
          <span>Rejected:</span>
          <span className="text-red-600">{qaReport?.rejectedCount || 0} scenes</span>
        </div>
      </div>
      <div className="text-xs text-blue-600 mt-2">
        Click to open QA Dashboard
      </div>
    </div>
  </HoverCardContent>
</HoverCard>
```

---

## Visual States

### QA Step States

| State | Circle Color | Content | Label Below |
|-------|-------------|---------|-------------|
| Pending | Gray border | Shield icon | "QA" |
| Analyzing | Blue border, blue bg | Spinner | "QA" |
| Completed (≥85) | Green bg | Score number | "Passed" |
| Completed (70-84) | Yellow bg | Score number | "Review" |
| Completed (<70) | Red bg | Score number | "Issues" |

---

## Verification Checklist

- [ ] QA step appears between Assembly and Rendering
- [ ] QA step shows pending state initially (gray)
- [ ] QA step shows analyzing state with spinner
- [ ] QA step shows score when complete (87, etc.)
- [ ] Score is color-coded (green/yellow/red)
- [ ] Label shows "Passed", "Review", or "Issues"
- [ ] Clicking QA step opens QA Dashboard
- [ ] Hover shows quick summary popover
- [ ] Progress line extends through QA step correctly

---

## Next Phase

Once Progress Tracker is updated, proceed to **Phase 9D: QA Dashboard Implementation** to create the full quality review interface.
