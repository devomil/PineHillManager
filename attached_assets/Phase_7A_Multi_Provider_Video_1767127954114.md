# Phase 7A: Multi-Provider Video Selection

## Objective

Implement intelligent video provider selection that assigns the best provider (Runway, Kling, Luma, or Hailuo) to each scene based on content type, scene type, and visual style. Display this in the UI so users can see and override provider assignments.

## Current Problem

The Generation Preview shows only "Runway Gen-3" for all 18 scenes, but the system should intelligently select from 4 providers based on scene content.

## What This Phase Creates/Modifies

- `shared/provider-config.ts` - NEW: Provider definitions and selection logic
- `server/services/video-provider-selector.ts` - NEW: Intelligent selection service
- `server/services/universal-video-service.ts` - Use provider selector
- `client/src/components/generation-preview-panel.tsx` - Show all providers
- `client/src/components/scene-card.tsx` - Show provider per scene

---

## Step 1: Create Provider Configuration

Create `shared/provider-config.ts`:

```typescript
// shared/provider-config.ts

export interface VideoProvider {
  id: string;
  name: string;
  displayName: string;
  costPerSecond: number;
  maxDuration: number;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  apiEndpoint: string;
}

export const VIDEO_PROVIDERS: Record<string, VideoProvider> = {
  runway: {
    id: 'runway',
    name: 'runway',
    displayName: 'Runway Gen-3',
    costPerSecond: 0.05,
    maxDuration: 10,
    strengths: [
      'Cinematic quality',
      'Dramatic lighting',
      'Smooth motion',
      'Professional grade',
    ],
    weaknesses: [
      'Higher cost',
      'Slower generation',
    ],
    bestFor: [
      'cinematic',
      'dramatic',
      'hero-shots',
      'product-premium',
      'emotional',
    ],
    apiEndpoint: '/api/runway/generate',
  },
  
  kling: {
    id: 'kling',
    name: 'kling',
    displayName: 'Kling 1.6',
    costPerSecond: 0.03,
    maxDuration: 10,
    strengths: [
      'Excellent human rendering',
      'Natural expressions',
      'Good motion physics',
      'Cost effective',
    ],
    weaknesses: [
      'Less cinematic than Runway',
    ],
    bestFor: [
      'person',
      'human-subject',
      'face-closeup',
      'conversation',
      'testimonial',
      'lifestyle',
    ],
    apiEndpoint: '/api/kling/generate',
  },
  
  luma: {
    id: 'luma',
    name: 'luma',
    displayName: 'Luma Dream Machine',
    costPerSecond: 0.04,
    maxDuration: 5,
    strengths: [
      'Smooth reveals',
      'Product animations',
      'Clean transitions',
      '3D-like quality',
    ],
    weaknesses: [
      'Shorter max duration',
      'Less natural for people',
    ],
    bestFor: [
      'product-reveal',
      'product-shot',
      'object-focus',
      'reveal-animation',
      'tech-demo',
    ],
    apiEndpoint: '/api/luma/generate',
  },
  
  hailuo: {
    id: 'hailuo',
    name: 'hailuo',
    displayName: 'Hailuo MiniMax',
    costPerSecond: 0.02,
    maxDuration: 6,
    strengths: [
      'Cost effective',
      'Good for B-roll',
      'Nature scenes',
      'Fast generation',
    ],
    weaknesses: [
      'Less detailed than premium',
      'Simpler motion',
    ],
    bestFor: [
      'broll',
      'b-roll',
      'nature',
      'landscape',
      'ambient',
      'background',
      'establishing',
    ],
    apiEndpoint: '/api/hailuo/generate',
  },
};

export const IMAGE_PROVIDERS = {
  flux: {
    id: 'flux',
    name: 'flux',
    displayName: 'Flux.1',
    costPerImage: 0.03,
    strengths: ['Product shots', 'Clean compositions', 'Commercial quality'],
    bestFor: ['product', 'food', 'object', 'still-life'],
  },
  
  falai: {
    id: 'falai',
    name: 'fal.ai',
    displayName: 'fal.ai',
    costPerImage: 0.02,
    strengths: ['Lifestyle images', 'Natural feel', 'People'],
    bestFor: ['lifestyle', 'person', 'scene', 'environment'],
  },
};

export const SOUND_PROVIDERS = {
  elevenlabs: {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    displayName: 'ElevenLabs',
    type: 'voiceover',
    costPerSecond: 0.015,
  },
  
  udio: {
    id: 'udio',
    name: 'Udio',
    displayName: 'Udio AI (via PiAPI)',
    type: 'music',
    costPerTrack: 0.10,
  },
  
  kling_sound: {
    id: 'kling_sound',
    name: 'Kling Sound',
    displayName: 'Kling Sound',
    type: 'sfx',
    costPerEffect: 0.01,
  },
};

// Helper to get provider by ID
export function getVideoProvider(id: string): VideoProvider | undefined {
  return VIDEO_PROVIDERS[id];
}

// Get all video providers as array
export function getAllVideoProviders(): VideoProvider[] {
  return Object.values(VIDEO_PROVIDERS);
}
```

---

## Step 2: Create Video Provider Selector Service

Create `server/services/video-provider-selector.ts`:

```typescript
// server/services/video-provider-selector.ts

import { VIDEO_PROVIDERS, VideoProvider } from '@shared/provider-config';
import { getVisualStyleConfig } from '@shared/visual-style-config';

export interface ProviderSelection {
  provider: VideoProvider;
  reason: string;
  confidence: number; // 0-100
  alternatives: string[];
}

export interface SceneForSelection {
  sceneIndex: number;
  sceneType: string;
  contentType: string;
  narration: string;
  visualDirection: string;
  duration: number;
}

class VideoProviderSelectorService {
  
  /**
   * Select the best video provider for a scene
   */
  selectProvider(
    scene: SceneForSelection,
    visualStyle: string
  ): ProviderSelection {
    const styleConfig = getVisualStyleConfig(visualStyle);
    const scores: Record<string, number> = {};
    const reasons: Record<string, string[]> = {};
    
    // Initialize scores
    Object.keys(VIDEO_PROVIDERS).forEach(id => {
      scores[id] = 50; // Base score
      reasons[id] = [];
    });
    
    // Score based on content type
    this.scoreByContentType(scene.contentType, scores, reasons);
    
    // Score based on scene type
    this.scoreBySceneType(scene.sceneType, scores, reasons);
    
    // Score based on visual direction keywords
    this.scoreByVisualDirection(scene.visualDirection, scores, reasons);
    
    // Score based on visual style preferences
    this.scoreByStylePreferences(styleConfig.preferredVideoProviders, scores, reasons);
    
    // Score based on duration constraints
    this.scoreByDuration(scene.duration, scores, reasons);
    
    // Find best provider
    const sortedProviders = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);
    
    const bestProviderId = sortedProviders[0][0];
    const bestScore = sortedProviders[0][1];
    const bestProvider = VIDEO_PROVIDERS[bestProviderId];
    
    return {
      provider: bestProvider,
      reason: reasons[bestProviderId].slice(0, 2).join('; ') || 'Default selection',
      confidence: Math.min(100, bestScore),
      alternatives: sortedProviders.slice(1, 3).map(([id]) => id),
    };
  }
  
  /**
   * Select providers for all scenes in a project
   */
  selectProvidersForProject(
    scenes: SceneForSelection[],
    visualStyle: string
  ): Map<number, ProviderSelection> {
    const selections = new Map<number, ProviderSelection>();
    
    scenes.forEach(scene => {
      const selection = this.selectProvider(scene, visualStyle);
      selections.set(scene.sceneIndex, selection);
    });
    
    // Log summary
    const providerCounts: Record<string, number> = {};
    selections.forEach(sel => {
      providerCounts[sel.provider.id] = (providerCounts[sel.provider.id] || 0) + 1;
    });
    
    console.log('[ProviderSelector] Selection summary:');
    Object.entries(providerCounts).forEach(([id, count]) => {
      console.log(`  ${VIDEO_PROVIDERS[id].displayName}: ${count} scenes`);
    });
    
    return selections;
  }
  
  private scoreByContentType(
    contentType: string,
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    switch (contentType) {
      case 'person':
        scores.kling += 30;
        reasons.kling.push('Best for human subjects');
        scores.runway += 15;
        break;
        
      case 'product':
        scores.luma += 30;
        reasons.luma.push('Excellent product reveals');
        scores.runway += 20;
        reasons.runway.push('Premium product quality');
        break;
        
      case 'nature':
        scores.hailuo += 25;
        reasons.hailuo.push('Cost-effective nature scenes');
        scores.runway += 20;
        reasons.runway.push('Cinematic landscapes');
        break;
        
      case 'abstract':
        scores.kling += 20;
        reasons.kling.push('Creative motion handling');
        scores.runway += 15;
        break;
        
      case 'lifestyle':
        scores.kling += 20;
        reasons.kling.push('Natural lifestyle rendering');
        scores.hailuo += 15;
        break;
    }
  }
  
  private scoreBySceneType(
    sceneType: string,
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    switch (sceneType) {
      case 'hook':
        scores.runway += 25;
        reasons.runway.push('Cinematic hook impact');
        break;
        
      case 'problem':
      case 'agitation':
        scores.kling += 20;
        reasons.kling.push('Authentic emotional expressions');
        break;
        
      case 'solution':
        scores.runway += 15;
        scores.kling += 15;
        break;
        
      case 'benefit':
        scores.kling += 20;
        reasons.kling.push('Lifestyle transformation scenes');
        break;
        
      case 'product':
        scores.luma += 30;
        reasons.luma.push('Product showcase specialty');
        break;
        
      case 'testimonial':
        scores.kling += 30;
        reasons.kling.push('Best for talking heads');
        break;
        
      case 'cta':
        scores.runway += 20;
        reasons.runway.push('Premium closing impact');
        break;
        
      case 'broll':
      case 'explanation':
        scores.hailuo += 20;
        reasons.hailuo.push('Cost-effective B-roll');
        break;
    }
  }
  
  private scoreByVisualDirection(
    visualDirection: string,
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    const lower = visualDirection.toLowerCase();
    
    // Cinematic keywords → Runway
    if (/cinematic|dramatic|epic|film|movie|golden hour/.test(lower)) {
      scores.runway += 20;
      reasons.runway.push('Cinematic visual direction');
    }
    
    // Human keywords → Kling
    if (/person|woman|man|face|expression|people|customer/.test(lower)) {
      scores.kling += 20;
      reasons.kling.push('Human subject in visual');
    }
    
    // Product keywords → Luma
    if (/product|bottle|package|reveal|showcase|display/.test(lower)) {
      scores.luma += 20;
      reasons.luma.push('Product focus in visual');
    }
    
    // Nature/ambient keywords → Hailuo
    if (/nature|landscape|outdoor|garden|field|ambient|background/.test(lower)) {
      scores.hailuo += 15;
      reasons.hailuo.push('Nature/ambient scene');
    }
  }
  
  private scoreByStylePreferences(
    preferredProviders: string[],
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    preferredProviders.forEach((provider, index) => {
      const bonus = 15 - (index * 5); // First preferred gets +15, second +10, etc.
      if (scores[provider] !== undefined && bonus > 0) {
        scores[provider] += bonus;
        reasons[provider].push('Style preference');
      }
    });
  }
  
  private scoreByDuration(
    duration: number,
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    // Penalize providers that can't handle the duration
    Object.entries(VIDEO_PROVIDERS).forEach(([id, provider]) => {
      if (duration > provider.maxDuration) {
        scores[id] -= 20;
        reasons[id].push(`Duration exceeds ${provider.maxDuration}s max`);
      }
    });
  }
  
  /**
   * Calculate total cost for provider selections
   */
  calculateTotalCost(
    selections: Map<number, ProviderSelection>,
    scenes: SceneForSelection[]
  ): { total: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let total = 0;
    
    selections.forEach((selection, sceneIndex) => {
      const scene = scenes.find(s => s.sceneIndex === sceneIndex);
      if (scene) {
        const cost = scene.duration * selection.provider.costPerSecond;
        breakdown[selection.provider.id] = (breakdown[selection.provider.id] || 0) + cost;
        total += cost;
      }
    });
    
    return { total, breakdown };
  }
}

export const videoProviderSelector = new VideoProviderSelectorService();
```

---

## Step 3: Update Generation Preview Panel

Update `client/src/components/generation-preview-panel.tsx` to show all providers:

### Update the provider display section:

```tsx
{/* Video Providers - Show breakdown by provider */}
<div className="bg-white rounded-lg p-3 border">
  <div className="flex items-center gap-2 text-gray-500 mb-2">
    <Video className="h-4 w-4" />
    <span className="text-xs font-medium">Video Generation</span>
  </div>
  <div className="space-y-1.5">
    {Object.entries(estimate.providers.video).map(([provider, count]) => (
      <div key={provider} className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={`text-xs ${PROVIDER_COLORS[provider] || 'bg-gray-100'}`}
          >
            {PROVIDER_NAMES[provider] || provider}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{count} scenes</span>
          <span className="text-xs text-gray-400">
            ${(count * 5 * (PROVIDER_COSTS[provider] || 0.03)).toFixed(2)}
          </span>
        </div>
      </div>
    ))}
  </div>
</div>
```

### Add provider constants:

```tsx
const PROVIDER_COLORS: Record<string, string> = {
  runway: 'bg-purple-100 text-purple-800',
  kling: 'bg-blue-100 text-blue-800',
  luma: 'bg-amber-100 text-amber-800',
  hailuo: 'bg-green-100 text-green-800',
};

const PROVIDER_NAMES: Record<string, string> = {
  runway: 'Runway Gen-3',
  kling: 'Kling 1.6',
  luma: 'Luma',
  hailuo: 'Hailuo MiniMax',
};

const PROVIDER_COSTS: Record<string, number> = {
  runway: 0.05,
  kling: 0.03,
  luma: 0.04,
  hailuo: 0.02,
};
```

---

## Step 4: Update Scene Card to Show Provider

Update `client/src/components/scene-card.tsx`:

### Add provider display:

```tsx
// In the scene card header, after duration
<div className="flex items-center gap-1">
  <Badge 
    variant="outline" 
    className={`text-xs ${PROVIDER_COLORS[scene.provider] || ''}`}
  >
    {PROVIDER_NAMES[scene.provider] || scene.provider}
  </Badge>
</div>
```

### Add provider selector in expanded view:

```tsx
{/* Provider Selection (in expanded view) */}
<div>
  <label className="text-xs font-medium text-gray-500 block mb-1">
    Video Provider
  </label>
  <div className="flex items-center gap-2">
    <select
      value={scene.provider || 'runway'}
      onChange={(e) => onUpdate(scene.id, { provider: e.target.value })}
      className="text-sm border rounded px-2 py-1"
      disabled={disabled}
    >
      <option value="runway">Runway Gen-3 (Cinematic)</option>
      <option value="kling">Kling 1.6 (Human Subjects)</option>
      <option value="luma">Luma (Product Reveals)</option>
      <option value="hailuo">Hailuo (B-roll)</option>
    </select>
    <span className="text-xs text-gray-400">
      {scene.providerReason || 'Auto-selected'}
    </span>
  </div>
</div>
```

---

## Step 5: Update Generation Estimate API

Update the `/api/video-projects/:id/generation-estimate` endpoint:

```typescript
import { videoProviderSelector } from './services/video-provider-selector';

// In the endpoint handler:
const scenesForSelection = scenes.map((scene: any, index: number) => ({
  sceneIndex: index,
  sceneType: scene.type,
  contentType: scene.contentType || 'lifestyle',
  narration: scene.narration,
  visualDirection: scene.visualDirection || '',
  duration: scene.duration || 5,
}));

// Get intelligent provider selections
const providerSelections = videoProviderSelector.selectProvidersForProject(
  scenesForSelection,
  visualStyle
);

// Build provider counts for display
const providerCounts: Record<string, number> = {};
providerSelections.forEach(selection => {
  const id = selection.provider.id;
  providerCounts[id] = (providerCounts[id] || 0) + 1;
});

// Calculate costs per provider
const { total: videoCost, breakdown: costBreakdown } = videoProviderSelector.calculateTotalCost(
  providerSelections,
  scenesForSelection
);

// Include in response
res.json({
  // ... other fields
  providers: {
    video: providerCounts,
    videoBreakdown: costBreakdown,
    // ... other providers
  },
  sceneProviders: Array.from(providerSelections.entries()).map(([index, sel]) => ({
    sceneIndex: index,
    provider: sel.provider.id,
    providerName: sel.provider.displayName,
    reason: sel.reason,
    confidence: sel.confidence,
    alternatives: sel.alternatives,
  })),
});
```

---

## Verification Checklist

Before moving to Phase 7B, confirm:

- [ ] Provider config file created with all 4 video providers
- [ ] Provider selector service implements intelligent selection
- [ ] Selection considers content type, scene type, visual direction
- [ ] Generation Preview shows all providers with scene counts
- [ ] Scene cards display assigned provider
- [ ] Provider can be manually overridden per scene
- [ ] Provider selection reason shown
- [ ] Cost calculation uses per-provider rates
- [ ] Console logs show selection summary

---

## Example Provider Selection Output

```
[ProviderSelector] Selection summary:
  Runway Gen-3: 4 scenes
  Kling 1.6: 8 scenes
  Luma: 2 scenes
  Hailuo MiniMax: 4 scenes

Scene 1 (hook, person): Kling 1.6 - "Best for human subjects; Authentic emotional expressions"
Scene 2 (problem, lifestyle): Kling 1.6 - "Natural lifestyle rendering"
Scene 3 (agitation, person): Kling 1.6 - "Best for human subjects"
Scene 4 (explanation, abstract): Hailuo MiniMax - "Cost-effective B-roll"
Scene 5 (product, product): Luma - "Excellent product reveals; Product showcase specialty"
...
```

---

## Next Phase

Once Multi-Provider Video Selection is working, proceed to **Phase 7B: Image Generation Pipeline** to add Flux.1 and fal.ai integration.
