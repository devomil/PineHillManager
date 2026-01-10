# Phase 15F: Quality Tier Selector UI

## Objective

Add a Quality Tier selector (Ultra Premium / Premium / Standard) to the Generation Preview page. This allows users to choose between higher quality (more expensive) and standard quality (cheaper) providers before generating assets.

---

## Prerequisites

- None (this can be done in parallel with 15A-15E)
- Quality tier configuration from Phase 14 Addendum C

---

## Current Problem

The Generation Preview page shows:
- "Standard Quality" / "Standard Cost" labels
- "Higher Quality" / "2x Cost" for some workflows
- But NO way for users to actually SELECT a quality tier

---

## The Fix

Add a 3-option selector above the cost estimate:

```
┌─────────────────────────────────────────────────────────────┐
│ Quality Tier                                                │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│ │ ✨ Ultra    │ │ 👑 Premium  │ │ ⚡ Standard │            │
│ │   $17.89    │ │   $5.17  ✓  │ │   $2.70    │            │
│ │ Best Quality│ │ Recommended │ │            │            │
│ └─────────────┘ └─────────────┘ └─────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1: Quality Tier Configuration

Create or verify the configuration file:

```typescript
// shared/config/quality-tiers.ts

export type QualityTier = 'ultra' | 'premium' | 'standard';

export interface QualityTierDefinition {
  id: QualityTier;
  label: string;
  shortLabel: string;
  description: string;
  badge?: string;
  
  // Visual
  icon: string;
  color: string;
  
  // Cost multipliers
  videoCostMultiplier: number;
  imageCostMultiplier: number;
  
  // Features
  features: string[];
  
  // Provider preferences
  preferredVideoProviders: string[];
  preferredImageProviders: string[];
}

export const QUALITY_TIERS: Record<QualityTier, QualityTierDefinition> = {
  ultra: {
    id: 'ultra',
    label: 'Ultra Premium',
    shortLabel: 'Ultra',
    description: 'Cinema-grade quality with multi-pass generation and 4K upscaling',
    badge: 'Best Quality',
    icon: 'Sparkles',
    color: 'purple',
    videoCostMultiplier: 3.5,
    imageCostMultiplier: 2.5,
    features: [
      'Multi-pass generation (3x, picks best)',
      '4K AI upscaling',
      'Cinematic color grading',
      '60fps frame interpolation',
      'AI audio enhancement',
    ],
    preferredVideoProviders: [
      'kling-2.6-mc-pro',
      'veo-3.1',
      'kling-2.6-pro',
      'runway-gen3-turbo',
    ],
    preferredImageProviders: [
      'midjourney-v7',
      'midjourney-v6',
      'flux-1.1-pro',
    ],
  },
  
  premium: {
    id: 'premium',
    label: 'Premium',
    shortLabel: 'Premium',
    description: 'Broadcast quality for TV commercials and professional production',
    badge: 'Recommended',
    icon: 'Crown',
    color: 'amber',
    videoCostMultiplier: 2.0,
    imageCostMultiplier: 1.5,
    features: [
      'Top-tier AI providers',
      'Native audio generation',
      '1080p/4K output',
      'Cinematic motion quality',
    ],
    preferredVideoProviders: [
      'veo-3.1',
      'kling-2.6-pro',
      'kling-2.6',
      'runway-gen3-turbo',
    ],
    preferredImageProviders: [
      'flux-1.1-pro',
      'midjourney-v6',
      'gpt-image-1.5',
    ],
  },
  
  standard: {
    id: 'standard',
    label: 'Standard',
    shortLabel: 'Standard',
    description: 'Good quality for social media and internal content',
    icon: 'Zap',
    color: 'gray',
    videoCostMultiplier: 1.0,
    imageCostMultiplier: 1.0,
    features: [
      'Good quality providers',
      '720p/1080p output',
      'Faster generation',
    ],
    preferredVideoProviders: [
      'kling-2.6',
      'kling-2.5',
      'wan-2.6',
      'hailuo-minimax',
    ],
    preferredImageProviders: [
      'flux-schnell',
      'flux-1.1-pro',
    ],
  },
};

export const DEFAULT_QUALITY_TIER: QualityTier = 'premium';
```

---

## Step 2: Quality Tier Selector Component

```tsx
// client/src/components/generation-preview/QualityTierSelector.tsx

import React from 'react';
import { Sparkles, Crown, Zap, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { QUALITY_TIERS, QualityTier } from '@/shared/config/quality-tiers';

interface QualityTierSelectorProps {
  value: QualityTier;
  onChange: (value: QualityTier) => void;
  estimatedCosts: {
    ultra: number;
    premium: number;
    standard: number;
  };
}

const ICONS = {
  ultra: Sparkles,
  premium: Crown,
  standard: Zap,
};

const COLORS = {
  ultra: {
    border: 'border-purple-500',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    icon: 'text-purple-500',
    badge: 'bg-purple-100 text-purple-700',
  },
  premium: {
    border: 'border-amber-500',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: 'text-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  standard: {
    border: 'border-gray-300',
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    icon: 'text-gray-500',
    badge: 'bg-gray-100 text-gray-700',
  },
};

export function QualityTierSelector({
  value,
  onChange,
  estimatedCosts,
}: QualityTierSelectorProps) {
  const tiers: QualityTier[] = ['ultra', 'premium', 'standard'];
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Quality Tier</h4>
        <span className="text-xs text-gray-500">Select before generating</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {tiers.map((tierId) => {
          const tier = QUALITY_TIERS[tierId];
          const Icon = ICONS[tierId];
          const colors = COLORS[tierId];
          const isSelected = value === tierId;
          const cost = estimatedCosts[tierId];
          
          return (
            <button
              key={tierId}
              onClick={() => onChange(tierId)}
              className={cn(
                'relative p-3 rounded-lg border-2 text-left transition-all',
                isSelected
                  ? `${colors.border} ${colors.bg}`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className={cn(
                  'absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center',
                  tierId === 'ultra' ? 'bg-purple-500' :
                  tierId === 'premium' ? 'bg-amber-500' : 'bg-gray-500'
                )}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* Badge */}
              {tier.badge && (
                <Badge 
                  className={cn(
                    'absolute -top-2 left-2 text-[10px] px-1.5 py-0',
                    colors.badge
                  )}
                >
                  {tier.badge}
                </Badge>
              )}
              
              {/* Content */}
              <div className="flex items-center gap-2 mb-1 mt-1">
                <Icon className={cn(
                  'w-4 h-4',
                  isSelected ? colors.icon : 'text-gray-400'
                )} />
                <span className={cn(
                  'font-medium text-sm',
                  isSelected ? colors.text : 'text-gray-700'
                )}>
                  {tier.shortLabel}
                </span>
              </div>
              
              {/* Estimated cost */}
              <div className={cn(
                'text-lg font-bold',
                isSelected ? colors.text : 'text-gray-900'
              )}>
                ${cost.toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Selected tier details */}
      <div className={cn(
        'p-3 rounded-lg text-sm',
        COLORS[value].bg,
        `border ${COLORS[value].border.replace('border-', 'border-').replace('-500', '-200')}`
      )}>
        <div className="font-medium mb-2 flex items-center gap-2">
          {React.createElement(ICONS[value], { className: cn('w-4 h-4', COLORS[value].icon) })}
          {QUALITY_TIERS[value].label}
        </div>
        <p className="text-xs text-gray-600 mb-2">
          {QUALITY_TIERS[value].description}
        </p>
        <ul className="space-y-1">
          {QUALITY_TIERS[value].features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <Check className={cn('w-3 h-3', COLORS[value].icon)} />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default QualityTierSelector;
```

---

## Step 3: Cost Calculator

```typescript
// client/src/lib/cost-calculator.ts

import { QualityTier, QUALITY_TIERS } from '@/shared/config/quality-tiers';

interface Scene {
  duration: number;
  hasImages?: boolean;
}

interface CostBreakdown {
  video: number;
  images: number;
  voiceover: number;
  music: number;
  soundfx: number;
  analysis: number;
  qa: number;
  total: number;
}

// Base costs at standard tier
const BASE_COSTS = {
  videoPer10s: 0.30,
  imagePer: 0.03,
  voicePer30s: 0.20,
  musicPer30s: 0.08,
  soundfxPer: 0.04,
  analysisPer: 0.01,
  qaPer: 0.01,
};

export function calculateCosts(
  tier: QualityTier,
  scenes: Scene[],
  voiceoverDuration: number,
  musicDuration: number,
  imageCount: number
): CostBreakdown {
  const tierConfig = QUALITY_TIERS[tier];
  
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const videoSegments = Math.ceil(totalDuration / 10);
  
  const video = videoSegments * BASE_COSTS.videoPer10s * tierConfig.videoCostMultiplier;
  const images = imageCount * BASE_COSTS.imagePer * tierConfig.imageCostMultiplier;
  const voiceover = Math.ceil(voiceoverDuration / 30) * BASE_COSTS.voicePer30s;
  const music = Math.ceil(musicDuration / 30) * BASE_COSTS.musicPer30s;
  const soundfx = scenes.length * BASE_COSTS.soundfxPer;
  const analysis = scenes.length * BASE_COSTS.analysisPer;
  const qa = scenes.length * BASE_COSTS.qaPer;
  
  const total = video + images + voiceover + music + soundfx + analysis + qa;
  
  return {
    video,
    images,
    voiceover,
    music,
    soundfx,
    analysis,
    qa,
    total,
  };
}

export function calculateAllTierCosts(
  scenes: Scene[],
  voiceoverDuration: number,
  musicDuration: number,
  imageCount: number
): { ultra: number; premium: number; standard: number } {
  return {
    ultra: calculateCosts('ultra', scenes, voiceoverDuration, musicDuration, imageCount).total,
    premium: calculateCosts('premium', scenes, voiceoverDuration, musicDuration, imageCount).total,
    standard: calculateCosts('standard', scenes, voiceoverDuration, musicDuration, imageCount).total,
  };
}
```

---

## Step 4: Integrate into Generation Preview

```tsx
// client/src/components/generation-preview/GenerationPreviewPanel.tsx

import React, { useState, useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QualityTierSelector } from './QualityTierSelector';
import { calculateCosts, calculateAllTierCosts } from '@/lib/cost-calculator';
import { QualityTier, DEFAULT_QUALITY_TIER } from '@/shared/config/quality-tiers';
import { cn } from '@/lib/utils';

interface GenerationPreviewPanelProps {
  project: Project;
  scenes: Scene[];
  voiceoverDuration: number;
  musicDuration: number;
  imageCount: number;
  onGenerate: (qualityTier: QualityTier) => void;
  onCancel: () => void;
}

export function GenerationPreviewPanel({
  project,
  scenes,
  voiceoverDuration,
  musicDuration,
  imageCount,
  onGenerate,
  onCancel,
}: GenerationPreviewPanelProps) {
  // Quality tier state
  const [qualityTier, setQualityTier] = useState<QualityTier>(
    (project.qualityTier as QualityTier) || DEFAULT_QUALITY_TIER
  );
  
  // Calculate costs for all tiers
  const allTierCosts = useMemo(() => 
    calculateAllTierCosts(scenes, voiceoverDuration, musicDuration, imageCount),
    [scenes, voiceoverDuration, musicDuration, imageCount]
  );
  
  // Calculate detailed costs for selected tier
  const selectedCosts = useMemo(() =>
    calculateCosts(qualityTier, scenes, voiceoverDuration, musicDuration, imageCount),
    [qualityTier, scenes, voiceoverDuration, musicDuration, imageCount]
  );
  
  // Button color based on tier
  const buttonColors = {
    ultra: 'bg-purple-600 hover:bg-purple-700',
    premium: 'bg-amber-600 hover:bg-amber-700',
    standard: 'bg-blue-600 hover:bg-blue-700',
  };
  
  return (
    <div className="generation-preview-panel p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold">Generation Preview</h2>
      </div>
      
      {/* ... other sections (Video, Voiceover, Music, etc.) ... */}
      
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* QUALITY TIER SELECTOR */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="border-t pt-4">
        <QualityTierSelector
          value={qualityTier}
          onChange={setQualityTier}
          estimatedCosts={allTierCosts}
        />
      </div>
      
      {/* Cost Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        {/* Estimated Cost */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm text-gray-600 mb-2">Estimated Cost</h4>
          <div className="text-3xl font-bold text-gray-900">
            ${selectedCosts.total.toFixed(2)}
          </div>
          <div className="mt-2 space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Video generation</span>
              <span>${selectedCosts.video.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Image generation</span>
              <span>${selectedCosts.images.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Voiceover</span>
              <span>${selectedCosts.voiceover.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Music</span>
              <span>${selectedCosts.music.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sound FX</span>
              <span>${selectedCosts.soundfx.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Analysis & QA</span>
              <span>${(selectedCosts.analysis + selectedCosts.qa).toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Estimated Time */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm text-gray-600 mb-2">Estimated Time</h4>
          <div className="text-3xl font-bold text-gray-900">
            {qualityTier === 'ultra' ? '8-12' : qualityTier === 'premium' ? '4-6' : '2-4'} min
          </div>
          <div className="text-xs text-gray-500 mt-1">
            ~{qualityTier === 'ultra' ? '90' : qualityTier === 'premium' ? '45' : '30'}s per scene
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={() => onGenerate(qualityTier)}
          className={cn('gap-2', buttonColors[qualityTier])}
        >
          <Sparkles className="w-4 h-4" />
          Generate Assets (${selectedCosts.total.toFixed(2)})
        </Button>
      </div>
    </div>
  );
}
```

---

## Step 5: Pass Quality Tier to Generation

Update the generation API call to include the selected tier:

```typescript
// client/src/hooks/useGenerateAssets.ts

import { useMutation } from '@tanstack/react-query';
import { QualityTier } from '@/shared/config/quality-tiers';

interface GenerateAssetsRequest {
  projectId: string;
  qualityTier: QualityTier;
}

export function useGenerateAssets() {
  return useMutation({
    mutationFn: async ({ projectId, qualityTier }: GenerateAssetsRequest) => {
      const response = await fetch('/api/generate/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          qualityTier,  // <-- Pass to backend
        }),
      });
      
      if (!response.ok) {
        throw new Error('Generation failed');
      }
      
      return response.json();
    },
  });
}
```

---

## Step 6: Backend Uses Quality Tier

```typescript
// server/routes/generate.ts

router.post('/start', async (req, res) => {
  const { projectId, qualityTier } = req.body;
  
  // Validate quality tier
  if (!['ultra', 'premium', 'standard'].includes(qualityTier)) {
    return res.status(400).json({ error: 'Invalid quality tier' });
  }
  
  // Store on project for this generation
  await db
    .update(projects)
    .set({ currentQualityTier: qualityTier })
    .where(eq(projects.id, projectId));
  
  // Start generation job with quality tier
  const job = await startGenerationJob(projectId, qualityTier);
  
  res.json({ jobId: job.id, status: 'started' });
});
```

---

## Testing

### Test Case 1: Selector Display

1. Open Generation Preview page
2. Verify 3 tier options visible: Ultra, Premium, Standard
3. Verify Premium is selected by default (has checkmark)
4. Verify each shows different estimated cost

### Test Case 2: Tier Selection

1. Click "Ultra Premium"
2. Verify checkmark moves to Ultra
3. Verify cost estimate increases (should be ~3.5x standard)
4. Verify "Generate Assets" button shows updated cost
5. Verify button color changes to purple

### Test Case 3: Cost Calculation

For 8 scenes, 44s video:
- Standard: ~$2.70
- Premium: ~$5.00
- Ultra: ~$18.00

### Test Case 4: Generation Uses Tier

1. Select "Ultra Premium"
2. Click "Generate Assets"
3. Verify backend receives `qualityTier: 'ultra'`
4. Verify video generation uses Ultra-tier providers (Veo 3.1, Kling 2.6 Pro)

---

## Database Schema Update (Optional)

Store default quality tier on project:

```sql
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS default_quality_tier TEXT DEFAULT 'premium';

ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS current_quality_tier TEXT;
```

---

## Success Criteria

Phase 15F is complete when:

1. ✅ Quality Tier selector visible on Generation Preview
2. ✅ Three options: Ultra Premium, Premium, Standard
3. ✅ Premium selected by default
4. ✅ Cost estimate updates when tier changes
5. ✅ Features list shown for selected tier
6. ✅ Generate button shows updated cost
7. ✅ Generate button color matches tier
8. ✅ Selected tier is passed to backend
9. ✅ Backend uses tier for provider selection

---

## Phase 15 Complete!

After completing 15A-15F, verify all test cases from the Overview pass:

1. ✅ "consultation space" matches Interior photo, uses I2V
2. ✅ "BioScan equipment" matches BioScan photo, uses I2V
3. ✅ Products + Logo matched and used correctly
4. ✅ Farm field NOT used for interior scenes
5. ✅ Quality Tier selector works and affects generation
