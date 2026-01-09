# Phase 14 Addendum C: Premium Quality-First Provider Strategy

## Purpose

This addendum implements a **"Quality First, Cost Second"** philosophy across all asset generation services. The goal is to generate broadcast-quality output on the first attempt, avoiding costly regeneration cycles.

## The Business Case

| Approach | Initial Cost | Regen Cost | Time | Total |
|----------|-------------|------------|------|-------|
| **Budget First** | $8 | $8 + $8 + $12 | 45 min | $36 + wasted time |
| **Quality First** | $25 | $0 (rarely needed) | 15 min | $25 + time saved |

**Conclusion:** Premium providers save money AND time by getting it right the first time.

---

## Quality Tier System

### Three Tiers

```typescript
// server/config/quality-tiers.ts

export type QualityTier = 'ultra' | 'premium' | 'standard';

export interface QualityTierConfig {
  tier: QualityTier;
  label: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  
  // Provider filters
  minMotionQuality: 'basic' | 'good' | 'excellent' | 'cinematic';
  minTemporalConsistency: 'low' | 'medium' | 'high';
  minResolution: '720p' | '1080p' | '4k';
  
  // Cost guidance
  maxCostMultiplier: number;
  
  // Preferred providers (in order)
  preferredVideoProviders: string[];
  preferredImageProviders: string[];
  preferredVoiceProviders: string[];
  preferredMusicProviders: string[];
  
  // Ultra-only features
  enableMultiPassGeneration?: boolean;  // Generate 3x, pick best
  enableAIUpscaling?: boolean;          // 4K upscale all outputs
  enableColorGrading?: boolean;         // AI color correction pass
  enableFrameInterpolation?: boolean;   // Smooth 60fps output
  enableAudioEnhancement?: boolean;     // AI audio cleanup
}

export const QUALITY_TIERS: Record<QualityTier, QualityTierConfig> = {
  
  // ═══════════════════════════════════════════════════════════════
  // ULTRA PREMIUM - Absolute best quality, no cost limits
  // ═══════════════════════════════════════════════════════════════
  ultra: {
    tier: 'ultra',
    label: 'Ultra Premium',
    description: 'Cinema-grade quality with multi-pass generation, 4K upscaling, and AI color grading',
    badge: 'Best Quality',
    badgeColor: 'bg-purple-100 text-purple-800',
    
    minMotionQuality: 'cinematic',
    minTemporalConsistency: 'high',
    minResolution: '1080p', // Will upscale to 4K
    maxCostMultiplier: 20,
    
    preferredVideoProviders: [
      // Tier 1: Absolute best
      'kling-2.6-mc-pro',     // $0.80/10s - Best motion control
      'veo-3.1',              // $0.75/10s - Cinematic master, 4K native
      'kling-2.6-pro',        // $0.66/10s - Best temporal + native audio
      'runway-gen3-turbo',    // $0.60/10s - Hollywood-grade motion
      
      // Tier 2: Excellent fallbacks
      'kling-2.6',            // $0.39/10s - Great value + audio
      'kling-2.6-mc',         // $0.66/10s - Motion control standard
    ],
    
    preferredImageProviders: [
      'midjourney-v6',        // $0.10/img - Best aesthetics
      'flux-1.1-pro',         // $0.05/img - Best photorealism
      'ideogram-v2',          // $0.08/img - Best for text-in-image
      'dall-e-3-hd',          // $0.08/img - Good for specific styles
    ],
    
    preferredVoiceProviders: [
      'elevenlabs-multilingual-v2',  // Most natural, highest quality
      'elevenlabs-turbo-v2.5',       // Fast backup
    ],
    
    preferredMusicProviders: [
      'udio-v1.5',            // Best composition quality
      'suno-v4',              // Great for specific styles
    ],
    
    // Ultra-exclusive features
    enableMultiPassGeneration: true,   // Generate 3 versions, AI picks best
    enableAIUpscaling: true,           // Topaz/Real-ESRGAN to 4K
    enableColorGrading: true,          // Cinematic color correction
    enableFrameInterpolation: true,    // Smooth to 60fps
    enableAudioEnhancement: true,      // AI audio cleanup & normalization
  },
  
  // ═══════════════════════════════════════════════════════════════
  // PREMIUM - Broadcast quality for TV, streaming, commercials
  // ═══════════════════════════════════════════════════════════════
  premium: {
    tier: 'premium',
    label: 'Premium',
    description: 'Broadcast quality for TV commercials, streaming ads, professional production',
    badge: 'Recommended',
    badgeColor: 'bg-amber-100 text-amber-800',
    
    minMotionQuality: 'cinematic',
    minTemporalConsistency: 'high',
    minResolution: '1080p',
    maxCostMultiplier: 10,
    
    preferredVideoProviders: [
      'veo-3.1',              // $0.75/10s - Cinematic, 4K capable
      'kling-2.6-pro',        // $0.66/10s - Best temporal + native audio
      'kling-2.6-mc-pro',     // $0.80/10s - Best for motion reference
      'runway-gen3-turbo',    // $0.60/10s - Hollywood-grade motion
      'kling-2.6',            // $0.39/10s - Great value + audio
      'kling-2.5',            // $0.39/10s - Best temporal consistency
      'luma-ray2',            // $0.40/10s - Excellent for products
    ],
    
    preferredImageProviders: [
      'flux-1.1-pro',         // Best photorealism
      'stable-diffusion-3',   // High quality, good for products
      'midjourney-v6',        // Artistic excellence
      'ideogram-v2',          // Best for text-in-image
    ],
    
    preferredVoiceProviders: [
      'elevenlabs-multilingual-v2',
      'elevenlabs-turbo-v2.5',
    ],
    
    preferredMusicProviders: [
      'udio-v1.5',
      'suno-v4',
    ],
    
    enableMultiPassGeneration: false,
    enableAIUpscaling: false,
    enableColorGrading: false,
    enableFrameInterpolation: false,
    enableAudioEnhancement: false,
  },
  
  // ═══════════════════════════════════════════════════════════════
  // STANDARD - Good quality for social media, internal content
  // ═══════════════════════════════════════════════════════════════
  standard: {
    tier: 'standard',
    label: 'Standard',
    description: 'Good quality for social media, internal videos, quick turnaround',
    
    minMotionQuality: 'good',
    minTemporalConsistency: 'medium',
    minResolution: '720p',
    maxCostMultiplier: 3,
    
    preferredVideoProviders: [
      'kling-2.6',            // $0.39/10s - Good value + audio
      'kling-2.5',            // $0.39/10s - Consistent
      'wan-2.6',              // $0.20/10s - Fast
      'hailuo-minimax',       // $0.20/10s - Decent quality
      'luma-dream-machine',   // $0.15/10s - Budget option
    ],
    
    preferredImageProviders: [
      'flux-schnell',         // Fast
      'stable-diffusion-3',   // Good quality
    ],
    
    preferredVoiceProviders: [
      'elevenlabs-turbo-v2.5',
    ],
    
    preferredMusicProviders: [
      'suno-v4',
    ],
    
    enableMultiPassGeneration: false,
    enableAIUpscaling: false,
    enableColorGrading: false,
    enableFrameInterpolation: false,
    enableAudioEnhancement: false,
  },
};

// Default quality tier for new projects
export const DEFAULT_QUALITY_TIER: QualityTier = 'premium';
```

---

## Generation Preview UI Update

Add a quality tier selector to the Generation Preview page, right above the cost estimate:

```tsx
// client/src/components/generation-preview/QualityTierSelector.tsx

import React from 'react';
import { Crown, Star, Zap, Check, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QualityTierSelectorProps {
  value: 'ultra' | 'premium' | 'standard';
  onChange: (value: 'ultra' | 'premium' | 'standard') => void;
  sceneDuration: number; // Total seconds
  sceneCount: number;
}

const TIERS = [
  {
    id: 'ultra' as const,
    label: 'Ultra Premium',
    shortLabel: 'Ultra',
    icon: Sparkles,
    color: 'purple',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    iconColor: 'text-purple-500',
    badge: 'Best Quality',
    features: [
      'Multi-pass generation (3x, picks best)',
      '4K AI upscaling',
      'Cinematic color grading',
      '60fps frame interpolation',
      'AI audio enhancement',
    ],
    providers: 'Veo 3.1, Kling 2.6 MC Pro, Midjourney',
    costMultiplier: 3.5, // vs standard
  },
  {
    id: 'premium' as const,
    label: 'Premium',
    shortLabel: 'Premium',
    icon: Crown,
    color: 'amber',
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    iconColor: 'text-amber-500',
    badge: 'Recommended',
    features: [
      'Top-tier AI providers',
      'Native audio generation',
      '1080p/4K output',
      'Cinematic motion quality',
    ],
    providers: 'Veo 3.1, Kling 2.6 Pro, Flux Pro',
    costMultiplier: 2.0,
  },
  {
    id: 'standard' as const,
    label: 'Standard',
    shortLabel: 'Standard',
    icon: Zap,
    color: 'gray',
    borderColor: 'border-gray-300',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-700',
    iconColor: 'text-gray-500',
    badge: null,
    features: [
      'Good quality providers',
      '720p/1080p output',
      'Faster generation',
    ],
    providers: 'Kling 2.6, Wan 2.6, Flux Schnell',
    costMultiplier: 1.0,
  },
];

// Base cost per 10s of video at standard tier
const BASE_COST_PER_10S = 0.25;

export const QualityTierSelector: React.FC<QualityTierSelectorProps> = ({
  value,
  onChange,
  sceneDuration,
  sceneCount,
}) => {
  
  // Calculate estimated cost for each tier
  const calculateCost = (multiplier: number) => {
    const videoSegments = Math.ceil(sceneDuration / 10);
    const baseCost = videoSegments * BASE_COST_PER_10S;
    const videoCost = baseCost * multiplier;
    
    // Add other costs (voice, music, images, QA)
    const otherCosts = sceneCount * 0.15 * multiplier;
    
    return videoCost + otherCosts;
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Quality Tier</h4>
        <span className="text-xs text-gray-500">Select before generating</span>
      </div>
      
      <div className="grid grid-cols-3 gap-2">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isSelected = value === tier.id;
          const estimatedCost = calculateCost(tier.costMultiplier);
          
          return (
            <button
              key={tier.id}
              onClick={() => onChange(tier.id)}
              className={cn(
                'relative p-3 rounded-lg border-2 text-left transition-all',
                isSelected
                  ? `${tier.borderColor} ${tier.bgColor}`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              )}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <div className={cn(
                  'absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center',
                  tier.id === 'ultra' ? 'bg-purple-500' : 
                  tier.id === 'premium' ? 'bg-amber-500' : 'bg-gray-500'
                )}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {/* Badge */}
              {tier.badge && (
                <Badge 
                  className={cn(
                    'absolute -top-2 left-2 text-[10px] px-1.5 py-0',
                    tier.id === 'ultra' ? 'bg-purple-100 text-purple-700' :
                    'bg-amber-100 text-amber-700'
                  )}
                >
                  {tier.badge}
                </Badge>
              )}
              
              {/* Content */}
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn('w-4 h-4', isSelected ? tier.iconColor : 'text-gray-400')} />
                <span className={cn(
                  'font-medium text-sm',
                  isSelected ? tier.textColor : 'text-gray-700'
                )}>
                  {tier.shortLabel}
                </span>
              </div>
              
              {/* Estimated cost */}
              <div className={cn(
                'text-lg font-bold',
                isSelected ? tier.textColor : 'text-gray-900'
              )}>
                ${estimatedCost.toFixed(2)}
              </div>
              
              {/* Providers preview */}
              <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">
                {tier.providers}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Selected tier details */}
      <div className={cn(
        'p-3 rounded-lg text-sm',
        value === 'ultra' ? 'bg-purple-50 border border-purple-200' :
        value === 'premium' ? 'bg-amber-50 border border-amber-200' :
        'bg-gray-50 border border-gray-200'
      )}>
        <div className="font-medium mb-2">
          {TIERS.find(t => t.id === value)?.label} includes:
        </div>
        <ul className="space-y-1">
          {TIERS.find(t => t.id === value)?.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-xs">
              <Check className={cn(
                'w-3 h-3',
                value === 'ultra' ? 'text-purple-500' :
                value === 'premium' ? 'text-amber-500' :
                'text-gray-500'
              )} />
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default QualityTierSelector;
```

### Updated Generation Preview Panel Layout

```tsx
// client/src/components/generation-preview/GenerationPreviewPanel.tsx

import { QualityTierSelector } from './QualityTierSelector';
import { useState } from 'react';

export const GenerationPreviewPanel: React.FC<Props> = ({ project, scenes }) => {
  // Quality tier state
  const [qualityTier, setQualityTier] = useState<'ultra' | 'premium' | 'standard'>(
    project.qualityTier || 'premium'
  );
  
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  
  // Calculate costs based on selected tier
  const costs = useMemo(() => calculateCosts(qualityTier, scenes), [qualityTier, scenes]);
  
  return (
    <div className="generation-preview-panel p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-blue-500" />
        <h2 className="text-lg font-semibold">Generation Preview</h2>
      </div>
      
      {/* Provider Cards Row */}
      <div className="grid grid-cols-4 gap-4">
        <ProviderCard type="video" tier={qualityTier} scenes={scenes} />
        <ProviderCard type="voiceover" tier={qualityTier} />
        <ProviderCard type="music" tier={qualityTier} />
        <ProviderCard type="soundfx" tier={qualityTier} />
      </div>
      
      {/* Image Generation */}
      <ImageGenerationCard tier={qualityTier} scenes={scenes} />
      
      {/* Intelligence */}
      <IntelligenceCard scenes={scenes} />
      
      {/* Quality Assurance */}
      <QualityAssuranceCard scenes={scenes} />
      
      {/* Scene Breakdown (collapsible) */}
      <SceneBreakdownCard scenes={scenes} />
      
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* QUALITY TIER SELECTOR - NEW SECTION */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="border-t pt-4">
        <QualityTierSelector
          value={qualityTier}
          onChange={setQualityTier}
          sceneDuration={totalDuration}
          sceneCount={scenes.length}
        />
      </div>
      
      {/* Cost & Time Estimates */}
      <div className="grid grid-cols-2 gap-4">
        <CostEstimateCard 
          qualityTier={qualityTier}
          scenes={scenes}
          costs={costs}
        />
        <TimeEstimateCard 
          qualityTier={qualityTier}
          sceneCount={scenes.length}
        />
      </div>
      
      {/* Warnings */}
      <WarningsSection scenes={scenes} />
      
      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={() => onGenerate(qualityTier)}
          className={cn(
            'gap-2',
            qualityTier === 'ultra' ? 'bg-purple-600 hover:bg-purple-700' :
            qualityTier === 'premium' ? 'bg-amber-600 hover:bg-amber-700' :
            'bg-blue-600 hover:bg-blue-700'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Generate Assets (${costs.total.toFixed(2)})
        </Button>
      </div>
    </div>
  );
};
```

---

## Updated Cost Calculation

```typescript
// client/src/lib/cost-calculator.ts

interface CostBreakdown {
  video: number;
  images: number;
  voiceover: number;
  music: number;
  soundfx: number;
  sceneAnalysis: number;
  qualityAssurance: number;
  
  // Ultra-only
  multiPassGeneration?: number;
  aiUpscaling?: number;
  colorGrading?: number;
  frameInterpolation?: number;
  audioEnhancement?: number;
  
  total: number;
}

const TIER_COSTS = {
  ultra: {
    videoPer10s: 0.80,      // Top-tier providers
    imagePer: 0.10,         // Midjourney
    voicePer30s: 0.35,      // ElevenLabs premium
    musicPer30s: 0.15,      // Udio
    soundfxPer: 0.08,       // Kling Sound
    sceneAnalysis: 0.02,    // Claude
    qa: 0.03,               // Claude Vision
    
    // Ultra extras
    multiPassMultiplier: 3, // Generate 3x
    upscalePer: 0.10,       // 4K upscale
    colorGradePer: 0.15,    // Color correction
    interpolatePer: 0.10,   // Frame interpolation
    audioEnhancePer: 0.05,  // Audio cleanup
  },
  premium: {
    videoPer10s: 0.65,      // Veo 3.1, Kling 2.6 Pro avg
    imagePer: 0.05,         // Flux Pro
    voicePer30s: 0.30,      // ElevenLabs
    musicPer30s: 0.12,      // Udio/Suno
    soundfxPer: 0.06,       // Kling Sound
    sceneAnalysis: 0.02,
    qa: 0.02,
  },
  standard: {
    videoPer10s: 0.30,      // Kling 2.6, Wan 2.6 avg
    imagePer: 0.03,         // Flux Schnell
    voicePer30s: 0.20,      // ElevenLabs Turbo
    musicPer30s: 0.08,      // Suno
    soundfxPer: 0.04,       // Basic
    sceneAnalysis: 0.01,
    qa: 0.01,
  },
};

export function calculateCosts(
  tier: 'ultra' | 'premium' | 'standard',
  scenes: Array<{ duration: number; hasImages?: boolean }>,
  voiceoverDuration: number = 0,
  musicDuration: number = 0,
  imageCount: number = 0
): CostBreakdown {
  
  const costs = TIER_COSTS[tier];
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const videoSegments = Math.ceil(totalDuration / 10);
  
  // Base costs
  let videoCost = videoSegments * costs.videoPer10s;
  const imageCost = imageCount * costs.imagePer;
  const voiceCost = Math.ceil(voiceoverDuration / 30) * costs.voicePer30s;
  const musicCost = Math.ceil(musicDuration / 30) * costs.musicPer30s;
  const soundfxCost = scenes.length * costs.soundfxPer;
  const analysisCost = scenes.length * costs.sceneAnalysis;
  const qaCost = scenes.length * costs.qa;
  
  const breakdown: CostBreakdown = {
    video: videoCost,
    images: imageCost,
    voiceover: voiceCost,
    music: musicCost,
    soundfx: soundfxCost,
    sceneAnalysis: analysisCost,
    qualityAssurance: qaCost,
    total: 0,
  };
  
  // Ultra tier extras
  if (tier === 'ultra') {
    const ultraCosts = costs as typeof TIER_COSTS.ultra;
    
    // Multi-pass: generate video 3x (already included in higher video cost)
    breakdown.multiPassGeneration = videoCost * (ultraCosts.multiPassMultiplier - 1);
    breakdown.video = videoCost * ultraCosts.multiPassMultiplier;
    
    // Post-processing per scene
    breakdown.aiUpscaling = scenes.length * ultraCosts.upscalePer;
    breakdown.colorGrading = scenes.length * ultraCosts.colorGradePer;
    breakdown.frameInterpolation = scenes.length * ultraCosts.interpolatePer;
    breakdown.audioEnhancement = scenes.length * ultraCosts.audioEnhancePer;
  }
  
  // Calculate total
  breakdown.total = Object.entries(breakdown)
    .filter(([key]) => key !== 'total')
    .reduce((sum, [, value]) => sum + (value || 0), 0);
  
  return breakdown;
}
```

---

## Cost Comparison Table

For an 8-scene, 44-second video (like in your screenshot):

| Component | Standard | Premium | Ultra |
|-----------|----------|---------|-------|
| Video (5 segments) | $1.50 | $3.25 | $12.00* |
| Images (8) | $0.24 | $0.40 | $0.80 |
| Voiceover (44s) | $0.40 | $0.60 | $0.70 |
| Music | $0.08 | $0.12 | $0.15 |
| Sound FX | $0.32 | $0.48 | $0.64 |
| Scene Analysis | $0.08 | $0.16 | $0.16 |
| QA | $0.08 | $0.16 | $0.24 |
| **Subtotal** | **$2.70** | **$5.17** | **$14.69** |
| 4K Upscaling | - | - | $0.80 |
| Color Grading | - | - | $1.20 |
| Frame Interpolation | - | - | $0.80 |
| Audio Enhancement | - | - | $0.40 |
| **Total** | **$2.70** | **$5.17** | **$17.89** |

*Ultra video includes 3x multi-pass generation

For longer videos:

| Video Length | Standard | Premium | Ultra |
|--------------|----------|---------|-------|
| 30s (6 scenes) | ~$2.50 | ~$5 | ~$15 |
| 60s (12 scenes) | ~$5 | ~$10 | ~$30 |
| 2 min (24 scenes) | ~$10 | ~$20 | ~$60 |

---

## Ultra Tier: Multi-Pass Generation

The key differentiator for Ultra tier is **multi-pass generation**:

```typescript
// server/services/multi-pass-video-generator.ts

interface MultiPassResult {
  winner: GeneratedVideo;
  alternatives: GeneratedVideo[];
  selectionReason: string;
}

class MultiPassVideoGenerator {
  
  /**
   * Generate multiple versions and select the best
   */
  async generateWithMultiPass(
    scene: Scene,
    provider: string,
    passes: number = 3
  ): Promise<MultiPassResult> {
    
    console.log(`[MultiPass] Generating ${passes} versions for scene ${scene.id}`);
    
    // Generate all passes in parallel
    const generations = await Promise.all(
      Array.from({ length: passes }, (_, i) => 
        this.generateSinglePass(scene, provider, i + 1)
      )
    );
    
    // Filter successful generations
    const successful = generations.filter(g => g.success);
    
    if (successful.length === 0) {
      throw new Error('All generation passes failed');
    }
    
    // Use Claude Vision to score and select best
    const scored = await this.scoreGenerations(successful, scene);
    
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    
    const winner = scored[0];
    
    console.log(`[MultiPass] Selected pass ${winner.passNumber} with score ${winner.score}`);
    console.log(`[MultiPass] Reason: ${winner.reason}`);
    
    return {
      winner: winner.video,
      alternatives: scored.slice(1).map(s => s.video),
      selectionReason: winner.reason,
    };
  }
  
  /**
   * Score generations using Claude Vision
   */
  private async scoreGenerations(
    generations: GeneratedVideo[],
    scene: Scene
  ): Promise<Array<{ video: GeneratedVideo; score: number; reason: string; passNumber: number }>> {
    
    const prompt = `You are evaluating ${generations.length} AI-generated video clips for the same scene.

Scene requirements:
- Visual Direction: ${scene.visualDirection}
- Content Type: ${scene.contentType}
- Duration: ${scene.duration}s

For each video, evaluate:
1. Motion quality and smoothness
2. Temporal consistency (no flickering/morphing)
3. How well it matches the visual direction
4. Overall aesthetic quality
5. Technical quality (no artifacts)

Score each from 0-100 and explain your choice for the winner.

Respond in JSON:
{
  "scores": [
    { "index": 0, "score": 85, "reason": "Best motion quality, natural movement" },
    { "index": 1, "score": 72, "reason": "Good but slight temporal inconsistency" },
    { "index": 2, "score": 68, "reason": "Artifacts visible in frames 15-20" }
  ],
  "winnerIndex": 0,
  "winnerReason": "Selected for superior motion quality and perfect temporal consistency"
}`;

    // Extract key frames from each video for comparison
    const frames = await Promise.all(
      generations.map(g => this.extractKeyFrames(g.videoUrl, 3))
    );
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          // Include frames from all generations
          ...frames.flatMap((frameSet, videoIndex) => 
            frameSet.map((frame, frameIndex) => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: 'image/jpeg', data: frame },
            }))
          ),
          { type: 'text', text: prompt },
        ],
      }],
    });
    
    const result = JSON.parse(response.content[0].text);
    
    return result.scores.map((s: any, i: number) => ({
      video: generations[i],
      score: s.score,
      reason: s.reason,
      passNumber: i + 1,
    }));
  }
}

export const multiPassVideoGenerator = new MultiPassVideoGenerator();
```

---

## Post-Processing Pipeline for Ultra Tier

```typescript
// server/services/ultra-post-processor.ts

interface PostProcessingConfig {
  enableUpscaling: boolean;
  enableColorGrading: boolean;
  enableFrameInterpolation: boolean;
  enableAudioEnhancement: boolean;
}

class UltraPostProcessor {
  
  async process(
    videoUrl: string,
    audioUrl: string,
    config: PostProcessingConfig
  ): Promise<{ videoUrl: string; audioUrl: string }> {
    
    let processedVideo = videoUrl;
    let processedAudio = audioUrl;
    
    // 1. Frame Interpolation (24fps → 60fps)
    if (config.enableFrameInterpolation) {
      console.log('[PostProcess] Applying frame interpolation...');
      processedVideo = await this.interpolateFrames(processedVideo, 60);
    }
    
    // 2. AI Upscaling (1080p → 4K)
    if (config.enableUpscaling) {
      console.log('[PostProcess] Applying 4K upscaling...');
      processedVideo = await this.upscaleTo4K(processedVideo);
    }
    
    // 3. Cinematic Color Grading
    if (config.enableColorGrading) {
      console.log('[PostProcess] Applying color grading...');
      processedVideo = await this.applyColorGrading(processedVideo);
    }
    
    // 4. Audio Enhancement
    if (config.enableAudioEnhancement) {
      console.log('[PostProcess] Enhancing audio...');
      processedAudio = await this.enhanceAudio(processedAudio);
    }
    
    return { videoUrl: processedVideo, audioUrl: processedAudio };
  }
  
  /**
   * Frame interpolation using AI (RIFE or similar)
   */
  private async interpolateFrames(videoUrl: string, targetFps: number): Promise<string> {
    // Call frame interpolation API (e.g., Replicate RIFE model)
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'rife-frame-interpolation-v4',
        input: {
          video: videoUrl,
          target_fps: targetFps,
        },
      }),
    });
    
    const result = await response.json();
    return result.output;
  }
  
  /**
   * AI Upscaling using Real-ESRGAN or Topaz
   */
  private async upscaleTo4K(videoUrl: string): Promise<string> {
    // Call upscaling API
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'real-esrgan-video-upscaling',
        input: {
          video: videoUrl,
          scale: 4, // 4x upscale
        },
      }),
    });
    
    const result = await response.json();
    return result.output;
  }
  
  /**
   * Cinematic color grading
   */
  private async applyColorGrading(videoUrl: string): Promise<string> {
    // Apply cinematic LUT or AI color grading
    // Could use FFmpeg with LUTs or AI-based service
    
    // For now, using a cinematic preset
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'video-color-grading',
        input: {
          video: videoUrl,
          style: 'cinematic-warm', // Pine Hill Farm brand style
          intensity: 0.7,
        },
      }),
    });
    
    const result = await response.json();
    return result.output;
  }
  
  /**
   * Audio enhancement (noise removal, normalization)
   */
  private async enhanceAudio(audioUrl: string): Promise<string> {
    // Use Adobe Podcast-style AI enhancement
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${process.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'audio-enhance',
        input: {
          audio: audioUrl,
          denoise: true,
          normalize: true,
          enhance_voice: true,
        },
      }),
    });
    
    const result = await response.json();
    return result.output;
  }
}

export const ultraPostProcessor = new UltraPostProcessor();
```

---

## Verification Checklist

### Quality Tier System
- [ ] Three tiers defined: Ultra, Premium, Standard
- [ ] Each tier has preferred providers list
- [ ] Ultra includes multi-pass + post-processing flags
- [ ] Default tier is Premium

### Generation Preview UI
- [ ] QualityTierSelector component created
- [ ] Selector placed above cost estimate
- [ ] Visual distinction between tiers (colors, badges)
- [ ] Features list shown for selected tier
- [ ] Cost updates dynamically when tier changes
- [ ] Generate button shows tier-appropriate color

### Cost Calculation
- [ ] Costs calculated per tier
- [ ] Ultra includes multi-pass multiplier
- [ ] Ultra includes post-processing costs
- [ ] Total displayed on Generate button

### Ultra Tier Features
- [ ] Multi-pass generation (3x, pick best)
- [ ] Claude Vision scoring for selection
- [ ] 4K AI upscaling pipeline
- [ ] Cinematic color grading
- [ ] 60fps frame interpolation
- [ ] AI audio enhancement

### Backend Integration
- [ ] Quality tier passed to generation services
- [ ] Provider routing uses tier preferences
- [ ] Post-processing triggered for Ultra
- [ ] Multi-pass enabled for Ultra

---

## Summary

This addendum adds a **Quality Tier Selector** directly to the Generation Preview page:

| Tier | Cost (44s video) | Key Features |
|------|------------------|--------------|
| **Ultra** | ~$18 | Multi-pass (3x), 4K upscale, color grade, 60fps |
| **Premium** | ~$5 | Top providers, native audio, 1080p/4K |
| **Standard** | ~$2.70 | Good quality, faster, budget-friendly |

The selector appears right before the "Generate Assets" button, giving users full control over quality vs. cost tradeoff at the moment of decision.

---

## Updated Provider Router

```typescript
// server/services/quality-aware-provider-router.ts

import { QUALITY_TIERS, QualityTier, QualityTierConfig } from '../config/quality-tiers';
import { VIDEO_PROVIDERS } from '../config/video-providers';
import { promptComplexityAnalyzer } from './prompt-complexity-analyzer';

interface RoutingRequest {
  visualDirection: string;
  sceneType: string;
  duration: number;
  aspectRatio: string;
  
  // Quality settings
  qualityTier: QualityTier;
  
  // Optional overrides
  preferredProvider?: string;
  requireAudio?: boolean;
  requireMotionControl?: boolean;
  hasReferenceImage?: boolean;
  hasReferenceVideo?: boolean;
}

interface RoutingResult {
  provider: string;
  providerName: string;
  estimatedCost: number;
  qualityScore: number;
  matchReasons: string[];
  alternatives: Array<{
    provider: string;
    cost: number;
    reason: string;
  }>;
}

class QualityAwareProviderRouter {
  
  /**
   * Route to best provider based on quality tier and content needs
   */
  route(request: RoutingRequest): RoutingResult {
    const tierConfig = QUALITY_TIERS[request.qualityTier];
    
    // Start with preferred providers for this tier
    let candidates = this.getPreferredProviders(tierConfig);
    
    // Filter by capability requirements
    candidates = this.filterByCapabilities(candidates, request);
    
    // Filter by quality minimums
    candidates = this.filterByQualityMinimums(candidates, tierConfig);
    
    // Score remaining candidates
    const scored = this.scoreProviders(candidates, request, tierConfig);
    
    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);
    
    if (scored.length === 0) {
      throw new Error('No suitable provider found for requirements');
    }
    
    const best = scored[0];
    const provider = VIDEO_PROVIDERS[best.providerId];
    
    return {
      provider: best.providerId,
      providerName: provider.name,
      estimatedCost: this.estimateCost(provider, request.duration),
      qualityScore: best.score,
      matchReasons: best.reasons,
      alternatives: scored.slice(1, 4).map(s => ({
        provider: s.providerId,
        cost: this.estimateCost(VIDEO_PROVIDERS[s.providerId], request.duration),
        reason: s.reasons[0] || 'Alternative option',
      })),
    };
  }
  
  /**
   * Get preferred providers from tier config
   */
  private getPreferredProviders(tierConfig: QualityTierConfig): string[] {
    return tierConfig.preferredVideoProviders.filter(id => VIDEO_PROVIDERS[id]);
  }
  
  /**
   * Filter by capability requirements
   */
  private filterByCapabilities(providerIds: string[], request: RoutingRequest): string[] {
    return providerIds.filter(id => {
      const provider = VIDEO_PROVIDERS[id];
      if (!provider) return false;
      
      const caps = provider.capabilities;
      
      // Audio requirement
      if (request.requireAudio && !caps.nativeAudio) {
        return false;
      }
      
      // Motion control requirement
      if (request.requireMotionControl) {
        if (!id.includes('motion-control')) {
          return false;
        }
      }
      
      // Reference image/video requirement
      if (request.hasReferenceImage && !caps.imageToVideo) {
        return false;
      }
      
      if (request.hasReferenceVideo) {
        // Only motion control providers support V2V
        if (!id.includes('motion-control')) {
          return false;
        }
      }
      
      // Duration check
      if (request.duration > caps.maxDuration) {
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * Filter by quality minimums from tier config
   */
  private filterByQualityMinimums(providerIds: string[], tierConfig: QualityTierConfig): string[] {
    const qualityOrder = ['basic', 'good', 'excellent', 'cinematic'];
    const consistencyOrder = ['low', 'medium', 'high'];
    const resolutionOrder = ['720p', '1080p', '4k'];
    
    const minQualityIndex = qualityOrder.indexOf(tierConfig.minMotionQuality);
    const minConsistencyIndex = consistencyOrder.indexOf(tierConfig.minTemporalConsistency);
    const minResolutionIndex = resolutionOrder.indexOf(tierConfig.minResolution);
    
    return providerIds.filter(id => {
      const provider = VIDEO_PROVIDERS[id];
      if (!provider) return false;
      
      const caps = provider.capabilities;
      
      const qualityIndex = qualityOrder.indexOf(caps.motionQuality);
      const consistencyIndex = consistencyOrder.indexOf(caps.temporalConsistency);
      const resolutionIndex = resolutionOrder.indexOf(caps.maxResolution);
      
      return (
        qualityIndex >= minQualityIndex &&
        consistencyIndex >= minConsistencyIndex &&
        resolutionIndex >= minResolutionIndex
      );
    });
  }
  
  /**
   * Score providers based on match quality
   */
  private scoreProviders(
    providerIds: string[],
    request: RoutingRequest,
    tierConfig: QualityTierConfig
  ): Array<{ providerId: string; score: number; reasons: string[] }> {
    
    // Analyze prompt complexity
    const complexity = promptComplexityAnalyzer.analyze(request.visualDirection);
    
    return providerIds.map(id => {
      const provider = VIDEO_PROVIDERS[id];
      const caps = provider.capabilities;
      const reasons: string[] = [];
      let score = 0;
      
      // === QUALITY SCORING (50% weight) ===
      
      // Motion quality bonus
      const qualityScores = { basic: 0, good: 25, excellent: 50, cinematic: 75 };
      score += qualityScores[caps.motionQuality] || 0;
      if (caps.motionQuality === 'cinematic') {
        reasons.push('Cinematic motion quality');
      }
      
      // Temporal consistency bonus
      const consistencyScores = { low: 0, medium: 15, high: 30 };
      score += consistencyScores[caps.temporalConsistency] || 0;
      
      // Resolution bonus
      const resolutionScores = { '720p': 0, '1080p': 10, '4k': 25 };
      score += resolutionScores[caps.maxResolution] || 0;
      
      // === CAPABILITY MATCH (30% weight) ===
      
      // Strength match
      const detectedNeeds = this.detectContentNeeds(request.visualDirection, request.sceneType);
      
      for (const need of detectedNeeds) {
        if (caps.strengths.includes(need)) {
          score += 20;
          reasons.push(`Strong at: ${need}`);
        }
      }
      
      // Weakness penalty
      for (const need of detectedNeeds) {
        if (caps.weaknesses.includes(need)) {
          score -= 30;
          reasons.push(`Weak at: ${need} (penalty)`);
        }
      }
      
      // Native audio bonus (huge for sync)
      if (caps.nativeAudio) {
        score += 25;
        reasons.push('Native audio generation');
      }
      
      // === TIER PREFERENCE (20% weight) ===
      
      // Position in preferred list
      const preferredIndex = tierConfig.preferredVideoProviders.indexOf(id);
      if (preferredIndex >= 0) {
        score += Math.max(0, 30 - (preferredIndex * 3)); // First = +30, Second = +27, etc.
        if (preferredIndex < 3) {
          reasons.push('Top tier preference');
        }
      }
      
      // === COMPLEXITY HANDLING ===
      
      // Penalize if prompt is complex and provider isn't premium
      if (complexity.level === 'complex' || complexity.level === 'impossible') {
        if (caps.motionQuality !== 'cinematic' && caps.motionQuality !== 'excellent') {
          score -= 20;
          reasons.push('Complex prompt may struggle');
        }
      }
      
      return { providerId: id, score, reasons };
    });
  }
  
  /**
   * Detect content needs from visual direction
   */
  private detectContentNeeds(visualDirection: string, sceneType: string): string[] {
    const needs: string[] = [];
    const lower = visualDirection.toLowerCase();
    
    // Human content
    if (/\b(person|woman|man|face|people|human)\b/.test(lower)) {
      needs.push('human-faces');
    }
    if (/\b(walking|running|moving|dancing|gesture)\b/.test(lower)) {
      needs.push('human-motion');
    }
    if (/\b(hand|hands|finger|grip|hold|pour|stretch)\b/.test(lower)) {
      needs.push('hand-actions');
    }
    if (/\b(talking|speaking|interview|testimonial)\b/.test(lower)) {
      needs.push('talking-heads');
    }
    
    // Product content
    if (/\b(product|bottle|package|supplement|item)\b/.test(lower)) {
      needs.push('product-shots');
    }
    
    // Nature/Environment
    if (/\b(nature|forest|ocean|sky|outdoor|landscape)\b/.test(lower)) {
      needs.push('nature-scenes');
    }
    
    // Style
    if (/\b(cinematic|dramatic|film|movie|epic)\b/.test(lower)) {
      needs.push('cinematic');
    }
    if (/\b(animated|cartoon|stylized|artistic)\b/.test(lower)) {
      needs.push('stylized');
    }
    
    // Food content (important for Pine Hill Farm)
    if (/\b(food|cooking|kitchen|ingredient|recipe|eating)\b/.test(lower)) {
      needs.push('food-content');
    }
    
    // Scene type hints
    if (sceneType === 'product-shot') needs.push('product-shots');
    if (sceneType === 'testimonial') needs.push('talking-heads');
    if (sceneType === 'b-roll') needs.push('nature-scenes');
    
    return [...new Set(needs)]; // Deduplicate
  }
  
  /**
   * Estimate cost for provider and duration
   */
  private estimateCost(provider: typeof VIDEO_PROVIDERS[string], durationSeconds: number): number {
    const segments = Math.ceil(durationSeconds / 10);
    return segments * provider.costPer10Seconds;
  }
}

export const qualityAwareProviderRouter = new QualityAwareProviderRouter();
```

---

## Project-Level Quality Settings

### Database Schema Addition

```sql
-- Add quality tier to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS quality_tier TEXT DEFAULT 'broadcast';

-- Add quality tier to individual scenes (override)
ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS quality_tier_override TEXT;
```

### Project Settings UI

```tsx
// client/src/components/project-settings/QualityTierSelector.tsx

import React from 'react';
import { Crown, Briefcase, Users, Zap } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface QualityTierSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const TIERS = [
  {
    id: 'broadcast',
    label: 'Broadcast Quality',
    description: 'TV commercials, streaming ads, professional production',
    icon: Crown,
    color: 'text-amber-500',
    badge: 'Recommended',
    badgeColor: 'bg-amber-100 text-amber-800',
    costNote: 'Premium providers ($0.60-$0.80/10s)',
  },
  {
    id: 'professional',
    label: 'Professional Quality',
    description: 'Marketing videos, corporate content, premium social',
    icon: Briefcase,
    color: 'text-blue-500',
    badge: null,
    costNote: 'High-quality providers ($0.39-$0.66/10s)',
  },
  {
    id: 'standard',
    label: 'Standard Quality',
    description: 'Organic social media, internal videos',
    icon: Users,
    color: 'text-green-500',
    badge: null,
    costNote: 'Balanced providers ($0.15-$0.40/10s)',
  },
  {
    id: 'draft',
    label: 'Draft Quality',
    description: 'Quick previews, iterations, testing',
    icon: Zap,
    color: 'text-gray-500',
    badge: null,
    costNote: 'Fastest/cheapest providers ($0.05-$0.20/10s)',
  },
];

export const QualityTierSelector: React.FC<QualityTierSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Quality Tier</h3>
        <p className="text-sm text-gray-500">
          Choose the quality level for all generated assets. Higher tiers use premium 
          AI providers for better results on the first attempt.
        </p>
      </div>
      
      <RadioGroup value={value} onValueChange={onChange} className="space-y-3">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isSelected = value === tier.id;
          
          return (
            <label
              key={tier.id}
              className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <RadioGroupItem value={tier.id} className="mt-1" />
              
              <Icon className={`w-6 h-6 ${tier.color} mt-0.5`} />
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{tier.label}</span>
                  {tier.badge && (
                    <Badge className={tier.badgeColor}>{tier.badge}</Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-0.5">{tier.description}</p>
                <p className="text-xs text-gray-400 mt-1">{tier.costNote}</p>
              </div>
            </label>
          );
        })}
      </RadioGroup>
      
      <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
        <strong>💡 Tip:</strong> We recommend <strong>Broadcast Quality</strong> for 
        Pine Hill Farm videos. Premium providers like Kling 2.6 Pro and Veo 3.1 
        produce dramatically better results, reducing regeneration needs and 
        saving time overall.
      </div>
    </div>
  );
};

export default QualityTierSelector;
```

---

## Generation Preview Cost Update

Update the Generation Preview to show costs based on quality tier:

```tsx
// client/src/components/generation-preview/CostEstimate.tsx

import React from 'react';
import { DollarSign, TrendingUp, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CostEstimateProps {
  qualityTier: string;
  scenes: Array<{
    duration: number;
    provider?: string;
  }>;
  voiceoverDuration: number;
  musicDuration: number;
  imageCount: number;
}

export const CostEstimate: React.FC<CostEstimateProps> = ({
  qualityTier,
  scenes,
  voiceoverDuration,
  musicDuration,
  imageCount,
}) => {
  // Calculate costs based on quality tier
  const tierCosts = {
    broadcast: {
      videoPer10s: 0.70,    // Average of top-tier providers
      imagePer: 0.05,
      voicePer30s: 0.30,
      musicPer30s: 0.10,
    },
    professional: {
      videoPer10s: 0.45,
      imagePer: 0.04,
      voicePer30s: 0.25,
      musicPer30s: 0.10,
    },
    standard: {
      videoPer10s: 0.25,
      imagePer: 0.03,
      voicePer30s: 0.20,
      musicPer30s: 0.08,
    },
    draft: {
      videoPer10s: 0.15,
      imagePer: 0.02,
      voicePer30s: 0.15,
      musicPer30s: 0.05,
    },
  };
  
  const costs = tierCosts[qualityTier as keyof typeof tierCosts] || tierCosts.broadcast;
  
  // Calculate totals
  const totalVideoDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const videoSegments = Math.ceil(totalVideoDuration / 10);
  
  const videoCost = videoSegments * costs.videoPer10s;
  const imageCost = imageCount * costs.imagePer;
  const voiceCost = Math.ceil(voiceoverDuration / 30) * costs.voicePer30s;
  const musicCost = Math.ceil(musicDuration / 30) * costs.musicPer30s;
  
  // Add QA and analysis costs (fixed)
  const qaCost = scenes.length * 0.02;      // Claude Vision per scene
  const analysisCost = scenes.length * 0.01; // Scene analysis
  
  const totalCost = videoCost + imageCost + voiceCost + musicCost + qaCost + analysisCost;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Estimated Cost
        </h4>
        <Tooltip>
          <TooltipTrigger>
            <Info className="w-4 h-4 text-gray-400" />
          </TooltipTrigger>
          <TooltipContent>
            Costs based on {qualityTier} quality tier providers
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="text-3xl font-bold text-green-600">
        ${totalCost.toFixed(2)}
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>Video generation ({videoSegments}x10s)</span>
          <span>${videoCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Image generation ({imageCount} images)</span>
          <span>${imageCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Voiceover ({Math.ceil(voiceoverDuration)}s)</span>
          <span>${voiceCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Music ({Math.ceil(musicDuration)}s)</span>
          <span>${musicCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Scene analysis</span>
          <span>${analysisCost.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Quality assurance</span>
          <span>${qaCost.toFixed(2)}</span>
        </div>
      </div>
      
      {qualityTier === 'broadcast' && (
        <div className="pt-2 border-t text-xs text-gray-500 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-green-500" />
          Premium providers reduce regeneration by ~70%
        </div>
      )}
    </div>
  );
};
```

---

## Apply Quality Tier to All Generation Services

### Video Generation

```typescript
// server/services/video-generation-service.ts

async generateVideo(scene: Scene, project: Project): Promise<GenerationResult> {
  // Get quality tier from project (or scene override)
  const qualityTier = scene.qualityTierOverride || project.qualityTier || 'broadcast';
  
  // Route to best provider for this tier
  const routing = qualityAwareProviderRouter.route({
    visualDirection: scene.visualDirection,
    sceneType: scene.contentType,
    duration: scene.duration,
    aspectRatio: project.aspectRatio,
    qualityTier,
    requireAudio: scene.requiresNativeAudio,
    hasReferenceImage: !!scene.referenceConfig?.sourceUrl,
  });
  
  console.log(`[VideoGen] Scene ${scene.id} routed to ${routing.provider} (${qualityTier} tier)`);
  console.log(`[VideoGen] Reasons: ${routing.matchReasons.join(', ')}`);
  console.log(`[VideoGen] Estimated cost: $${routing.estimatedCost.toFixed(2)}`);
  
  // Generate with selected provider
  return this.callProvider(routing.provider, scene);
}
```

### Image Generation

```typescript
// server/services/image-generation-service.ts

async generateImage(request: ImageRequest, project: Project): Promise<ImageResult> {
  const qualityTier = project.qualityTier || 'broadcast';
  const tierConfig = QUALITY_TIERS[qualityTier];
  
  // Select image provider from tier preferences
  const provider = tierConfig.preferredImageProviders[0]; // Top preference
  
  console.log(`[ImageGen] Using ${provider} for ${qualityTier} tier`);
  
  return this.callImageProvider(provider, request);
}
```

### Voiceover Generation

```typescript
// server/services/voiceover-service.ts

async generateVoiceover(script: string, voice: VoiceConfig, project: Project): Promise<AudioResult> {
  const qualityTier = project.qualityTier || 'broadcast';
  const tierConfig = QUALITY_TIERS[qualityTier];
  
  // Select voice provider from tier preferences
  const provider = tierConfig.preferredVoiceProviders[0];
  
  console.log(`[Voiceover] Using ${provider} for ${qualityTier} tier`);
  
  return this.callVoiceProvider(provider, script, voice);
}
```

### Music Generation

```typescript
// server/services/music-generation-service.ts

async generateMusic(mood: string, duration: number, project: Project): Promise<AudioResult> {
  const qualityTier = project.qualityTier || 'broadcast';
  const tierConfig = QUALITY_TIERS[qualityTier];
  
  // Select music provider from tier preferences
  const provider = tierConfig.preferredMusicProviders[0];
  
  console.log(`[Music] Using ${provider} for ${qualityTier} tier`);
  
  return this.callMusicProvider(provider, mood, duration);
}
```

---

## Summary: Provider Preferences by Tier

### Broadcast (Recommended for Pine Hill Farm)

| Asset Type | Provider | Cost | Why |
|------------|----------|------|-----|
| **Video** | Veo 3.1 / Kling 2.6 Pro | $0.66-$0.75/10s | Cinematic, 4K, native audio |
| **Images** | Flux 1.1 Pro | $0.05/img | Best photorealism |
| **Voice** | ElevenLabs Multilingual v2 | $0.30/30s | Most natural |
| **Music** | Udio v1.5 | $0.10/30s | Best composition |

### Estimated Cost for 30s Video (6 scenes)

| Tier | Video | Images | Voice | Music | QA | **Total** |
|------|-------|--------|-------|-------|-----|-----------|
| Broadcast | $4.20 | $0.30 | $0.30 | $0.10 | $0.18 | **$5.08** |
| Professional | $2.70 | $0.24 | $0.25 | $0.10 | $0.18 | **$3.47** |
| Standard | $1.50 | $0.18 | $0.20 | $0.08 | $0.18 | **$2.14** |
| Draft | $0.90 | $0.12 | $0.15 | $0.05 | $0.18 | **$1.40** |

**For a 60s video (12 scenes) at Broadcast tier: ~$10-12**
**For a 2-minute video (24 scenes) at Broadcast tier: ~$20-25**

---

## Verification Checklist

- [ ] Quality tier config created with 4 tiers
- [ ] Provider preferences defined per tier
- [ ] QualityAwareProviderRouter implemented
- [ ] Quality tier stored in project settings
- [ ] Quality tier selector UI added
- [ ] Generation preview shows tier-based cost
- [ ] Video generation uses quality tier routing
- [ ] Image generation uses quality tier preferences
- [ ] Voiceover uses quality tier preferences
- [ ] Music generation uses quality tier preferences
- [ ] Default tier is "broadcast" for new projects
- [ ] Scene-level tier override supported
