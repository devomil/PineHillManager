# Phase 9E: Generation Preview Enhancement

## Objective

Update the Generation Preview panel to show all AI providers with scene counts, sound design breakdown, intelligence features, and QA status.

## Current State

```
┌─────────────────────────────────────────┐
│ 🎬 19 video clips                       │
│ 🖼️ 19 images                            │
│ 🎤 Voiceover: Rachel                    │
│ 🎵 Background music                     │
└─────────────────────────────────────────┘
```

## Target State

```
┌─────────────────────────────────────────────────────────────┐
│ 🎬 VIDEO GENERATION                                         │
│    Kling 1.6 (16) │ Hailuo (3)                             │
│                                                             │
│ 🖼️ IMAGE GENERATION                                         │
│    Flux.1 (12) │ fal.ai (7)                                │
│                                                             │
│ 🎤 VOICEOVER                                                │
│    ElevenLabs - Rachel (Warm & calm)                       │
│                                                             │
│ 🎵 MUSIC                                                    │
│    Udio AI - Professional wellness                         │
│                                                             │
│ 🔊 SOUND DESIGN                                             │
│    19 ambient │ 18 transitions │ 15 accents                │
│                                                             │
│ 🧠 INTELLIGENCE                                             │
│    Claude Vision │ Smart Text │ Mood Transitions           │
│                                                             │
│ ✅ QA: 17 approved │ 2 need review │ 87/100                 │
├─────────────────────────────────────────────────────────────┤
│ 💰 $18.42                              ⏱️ 6:49              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### Create Generation Preview Panel Component

Create `client/src/components/generation-preview-panel.tsx`:

```tsx
import React from 'react';
import {
  Video,
  Image,
  Mic,
  Music,
  Volume2,
  Brain,
  ShieldCheck,
  DollarSign,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GenerationEstimate {
  videoProviders: Array<{ provider: string; count: number }>;
  imageProviders: Array<{ provider: string; count: number }>;
  voiceover: { provider: string; voice: string; style: string };
  music: { provider: string; style: string };
  soundDesign: { ambient: number; transitions: number; accents: number };
  intelligence: { sceneAnalysis: boolean; smartText: boolean; moodTransitions: boolean };
  qa: { approved: number; needsReview: number; rejected: number; score: number };
  estimatedCost: number;
  duration: string;
}

interface Props {
  estimate: GenerationEstimate | null;
  onOpenQADashboard?: () => void;
}

export const GenerationPreviewPanel: React.FC<Props> = ({ estimate, onOpenQADashboard }) => {
  if (!estimate) return null;

  const providerNames: Record<string, string> = {
    kling: 'Kling 1.6',
    runway: 'Runway',
    luma: 'Luma',
    hailuo: 'Hailuo',
    flux: 'Flux.1',
    falai: 'fal.ai',
  };

  const providerColors: Record<string, string> = {
    kling: 'bg-purple-100 text-purple-700',
    runway: 'bg-blue-100 text-blue-700',
    luma: 'bg-pink-100 text-pink-700',
    hailuo: 'bg-teal-100 text-teal-700',
    flux: 'bg-orange-100 text-orange-700',
    falai: 'bg-indigo-100 text-indigo-700',
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm">
      {/* Video Generation */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Video className="h-4 w-4" />
          VIDEO GENERATION
        </div>
        <div className="flex flex-wrap gap-2">
          {estimate.videoProviders.filter(p => p.count > 0).map(p => (
            <Badge key={p.provider} className={providerColors[p.provider] || 'bg-gray-100'}>
              {providerNames[p.provider] || p.provider} ({p.count})
            </Badge>
          ))}
        </div>
      </div>

      {/* Image Generation */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Image className="h-4 w-4" />
          IMAGE GENERATION
        </div>
        <div className="flex flex-wrap gap-2">
          {estimate.imageProviders.filter(p => p.count > 0).map(p => (
            <Badge key={p.provider} className={providerColors[p.provider] || 'bg-gray-100'}>
              {providerNames[p.provider] || p.provider} ({p.count})
            </Badge>
          ))}
        </div>
      </div>

      {/* Voiceover */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Mic className="h-4 w-4" />
          VOICEOVER
        </div>
        <div className="text-sm text-gray-600">
          {estimate.voiceover.provider} - {estimate.voiceover.voice}
          <span className="text-gray-400 ml-1">({estimate.voiceover.style})</span>
        </div>
      </div>

      {/* Music */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <Music className="h-4 w-4" />
          MUSIC
        </div>
        <div className="text-sm text-gray-600">
          {estimate.music.provider} - {estimate.music.style}
        </div>
      </div>

      {/* Sound Design */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Volume2 className="h-4 w-4" />
          SOUND DESIGN
        </div>
        <div className="flex gap-3 text-xs text-gray-600">
          <span>{estimate.soundDesign.ambient} ambient</span>
          <span>│</span>
          <span>{estimate.soundDesign.transitions} transitions</span>
          <span>│</span>
          <span>{estimate.soundDesign.accents} accents</span>
        </div>
      </div>

      {/* Intelligence */}
      <div className="p-3 border-b">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Brain className="h-4 w-4" />
          INTELLIGENCE
        </div>
        <div className="flex flex-wrap gap-2">
          {estimate.intelligence.sceneAnalysis && (
            <Badge variant="outline" className="text-xs">Claude Vision</Badge>
          )}
          {estimate.intelligence.smartText && (
            <Badge variant="outline" className="text-xs">Smart Text</Badge>
          )}
          {estimate.intelligence.moodTransitions && (
            <Badge variant="outline" className="text-xs">Mood Transitions</Badge>
          )}
        </div>
      </div>

      {/* QA Status */}
      <div 
        className="p-3 border-b cursor-pointer hover:bg-gray-50"
        onClick={onOpenQADashboard}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <ShieldCheck className="h-4 w-4" />
            QUALITY ASSURANCE
          </div>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="text-green-600">{estimate.qa.approved} approved</span>
          <span>│</span>
          <span className="text-yellow-600">{estimate.qa.needsReview} need review</span>
          <span>│</span>
          <span className={cn("font-bold", getScoreColor(estimate.qa.score))}>
            {estimate.qa.score}/100
          </span>
        </div>
      </div>

      {/* Footer - Cost & Duration */}
      <div className="p-3 bg-gray-50 flex justify-between items-center">
        <div className="flex items-center gap-1 text-sm">
          <DollarSign className="h-4 w-4 text-gray-400" />
          <span className="font-medium">${estimate.estimatedCost.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1 text-sm">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{estimate.duration}</span>
        </div>
      </div>
    </div>
  );
};
```

---

### Build Estimate from Project Data

```typescript
// Helper to build generation estimate from project
function buildGenerationEstimate(project: Project, qaReport: QualityReport | null): GenerationEstimate {
  // Count providers from scenes
  const videoProviderCounts: Record<string, number> = {};
  const imageProviderCounts: Record<string, number> = {};
  
  for (const scene of project.scenes) {
    if (scene.videoProvider) {
      videoProviderCounts[scene.videoProvider] = (videoProviderCounts[scene.videoProvider] || 0) + 1;
    }
    if (scene.imageProvider) {
      imageProviderCounts[scene.imageProvider] = (imageProviderCounts[scene.imageProvider] || 0) + 1;
    }
  }
  
  return {
    videoProviders: [
      { provider: 'kling', count: videoProviderCounts['kling'] || 0 },
      { provider: 'runway', count: videoProviderCounts['runway'] || 0 },
      { provider: 'luma', count: videoProviderCounts['luma'] || 0 },
      { provider: 'hailuo', count: videoProviderCounts['hailuo'] || 0 },
    ],
    imageProviders: [
      { provider: 'flux', count: imageProviderCounts['flux'] || 0 },
      { provider: 'falai', count: imageProviderCounts['falai'] || 0 },
    ],
    voiceover: {
      provider: 'ElevenLabs',
      voice: project.voiceSettings?.voice || 'Rachel',
      style: project.voiceSettings?.style || 'Warm & calm',
    },
    music: {
      provider: 'Udio AI',
      style: project.musicSettings?.style || 'Professional wellness',
    },
    soundDesign: {
      ambient: project.soundDesign?.ambientCount || 0,
      transitions: project.soundDesign?.transitionCount || 0,
      accents: project.soundDesign?.accentCount || 0,
    },
    intelligence: {
      sceneAnalysis: true,
      smartText: true,
      moodTransitions: true,
    },
    qa: {
      approved: qaReport?.approvedCount || 0,
      needsReview: qaReport?.needsReviewCount || 0,
      rejected: qaReport?.rejectedCount || 0,
      score: qaReport?.overallScore || 0,
    },
    estimatedCost: calculateEstimatedCost(project),
    duration: formatDuration(project.totalDuration || 0),
  };
}

function calculateEstimatedCost(project: Project): number {
  // Rough cost estimation based on providers
  let cost = 0;
  for (const scene of project.scenes) {
    if (scene.videoProvider === 'runway') cost += 0.50;
    else if (scene.videoProvider) cost += 0.25;
    if (scene.imageProvider) cost += 0.05;
  }
  cost += 5.00; // Voiceover base
  cost += 2.00; // Music
  return cost;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

---

### Integration in Main Component

```tsx
// In universal-video-producer.tsx
import { GenerationPreviewPanel } from '@/components/generation-preview-panel';

// Build estimate when project data changes
const generationEstimate = useMemo(() => {
  if (!project) return null;
  return buildGenerationEstimate(project, qaReport);
}, [project, qaReport]);

// In render
<div className="w-80">
  <GenerationPreviewPanel 
    estimate={generationEstimate}
    onOpenQADashboard={() => setShowQADashboard(true)}
  />
</div>
```

---

## Verification Checklist

- [ ] Video providers shown with counts (Kling 16, Hailuo 3, etc.)
- [ ] Image providers shown with counts (Flux.1 12, fal.ai 7)
- [ ] Voiceover shows provider, voice name, and style
- [ ] Music shows provider and style
- [ ] Sound design shows ambient, transitions, accents counts
- [ ] Intelligence badges shown (Claude Vision, Smart Text, Mood Transitions)
- [ ] QA section shows approved, needs review, and score
- [ ] Clicking QA section opens QA Dashboard
- [ ] Estimated cost displayed
- [ ] Duration displayed
- [ ] Panel updates when project data changes

---

## Phase 9 Complete Summary

| Sub-Phase | What It Does |
|-----------|--------------|
| **9A** | Scene cards show quality scores, status, provider badges, action buttons |
| **9B** | Scene editor shows real providers (Kling, Runway, Luma, Hailuo, Flux.1, fal.ai) |
| **9C** | Progress tracker has QA step with clickable score |
| **9D** | QA Dashboard for reviewing and approving all scenes |
| **9E** | Generation preview shows all providers, counts, and intelligence features |

After Phase 9, users have full visibility into:
- Which AI provider generates each scene
- Quality scores for every scene
- Ability to approve/reject/regenerate scenes
- Full breakdown of video, image, audio, and intelligence features
- QA gate before rendering
