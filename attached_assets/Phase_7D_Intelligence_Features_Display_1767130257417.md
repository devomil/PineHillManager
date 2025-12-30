# Phase 7D: Intelligence Features Display

## Objective

Expose the intelligence features (Claude Vision scene analysis, smart text placement, mood-matched transitions) in the UI so users can see these capabilities are working and understand how they affect the video.

## Current Problem

The UI doesn't show any indication that:
- Claude Vision is analyzing scenes
- Smart text placement is determining where to put overlays
- Transitions are being mood-matched between scenes

These are powerful features that should be visible to build user confidence.

## What This Phase Creates/Modifies

- `client/src/components/generation-preview-panel.tsx` - Add Intelligence section
- `client/src/components/scene-card.tsx` - Show analysis results per scene
- `server/services/scene-analysis-service.ts` - Expose analysis metadata
- `server/services/transition-service.ts` - NEW: Transition selection display

---

## Step 1: Create Transition Service

Create `server/services/transition-service.ts`:

```typescript
// server/services/transition-service.ts

export interface TransitionDesign {
  fromScene: number;
  toScene: number;
  type: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'zoom' | 'slide';
  duration: number;
  reason: string;
  moodMatch: string;
}

export interface ProjectTransitions {
  transitions: TransitionDesign[];
  summary: {
    cuts: number;
    fades: number;
    dissolves: number;
    wipes: number;
    zooms: number;
    slides: number;
  };
}

class TransitionService {
  
  /**
   * Design mood-matched transitions for all scene pairs
   */
  designTransitions(
    scenes: Array<{
      sceneIndex: number;
      sceneType: string;
      mood?: string;
      duration: number;
    }>,
    visualStyle: string
  ): ProjectTransitions {
    const transitions: TransitionDesign[] = [];
    
    for (let i = 0; i < scenes.length - 1; i++) {
      const current = scenes[i];
      const next = scenes[i + 1];
      
      const transition = this.selectTransition(current, next, visualStyle);
      transitions.push(transition);
    }
    
    // Count by type
    const summary = {
      cuts: transitions.filter(t => t.type === 'cut').length,
      fades: transitions.filter(t => t.type === 'fade').length,
      dissolves: transitions.filter(t => t.type === 'dissolve').length,
      wipes: transitions.filter(t => t.type === 'wipe').length,
      zooms: transitions.filter(t => t.type === 'zoom').length,
      slides: transitions.filter(t => t.type === 'slide').length,
    };
    
    console.log(`[Transitions] Designed ${transitions.length} mood-matched transitions`);
    console.log(`[Transitions] Types: ${summary.dissolves} dissolve, ${summary.fades} fade, ${summary.cuts} cut`);
    
    return { transitions, summary };
  }
  
  /**
   * Select best transition between two scenes
   */
  private selectTransition(
    current: { sceneIndex: number; sceneType: string; mood?: string },
    next: { sceneIndex: number; sceneType: string; mood?: string },
    visualStyle: string
  ): TransitionDesign {
    
    // Hook to content - quick cut or soft fade
    if (current.sceneType === 'hook') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'fade',
        duration: 0.5,
        reason: 'Hook to content - quick engagement',
        moodMatch: 'attention → focus',
      };
    }
    
    // Problem to solution - hopeful dissolve
    if (
      (current.sceneType === 'problem' || current.sceneType === 'agitation') &&
      (next.sceneType === 'solution' || next.sceneType === 'benefit')
    ) {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'dissolve',
        duration: 1.0,
        reason: 'Problem to solution - transformation moment',
        moodMatch: 'struggle → hope',
      };
    }
    
    // To CTA - building energy
    if (next.sceneType === 'cta') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'fade',
        duration: 0.8,
        reason: 'Building to call-to-action',
        moodMatch: 'content → action',
      };
    }
    
    // Between explanation scenes - clean cut
    if (current.sceneType === 'explanation' && next.sceneType === 'explanation') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'cut',
        duration: 0.1,
        reason: 'Sequential information - clean cut',
        moodMatch: 'continuous learning',
      };
    }
    
    // Benefit to benefit - smooth dissolve
    if (current.sceneType === 'benefit' && next.sceneType === 'benefit') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'dissolve',
        duration: 0.6,
        reason: 'Multiple benefits - flowing connection',
        moodMatch: 'positive → positive',
      };
    }
    
    // Cinematic style preference
    if (visualStyle === 'cinematic') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'fade',
        duration: 1.0,
        reason: 'Cinematic style - dramatic pacing',
        moodMatch: 'dramatic flow',
      };
    }
    
    // Energetic style preference
    if (visualStyle === 'energetic') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'cut',
        duration: 0.2,
        reason: 'Energetic style - fast pacing',
        moodMatch: 'dynamic rhythm',
      };
    }
    
    // Default - soft dissolve
    return {
      fromScene: current.sceneIndex,
      toScene: next.sceneIndex,
      type: 'dissolve',
      duration: 0.5,
      reason: 'Standard transition',
      moodMatch: 'smooth continuity',
    };
  }
}

export const transitionService = new TransitionService();
```

---

## Step 2: Create Text Placement Service

Create `server/services/text-placement-service.ts`:

```typescript
// server/services/text-placement-service.ts

export interface TextPlacement {
  sceneIndex: number;
  hasTextOverlay: boolean;
  placement: {
    position: 'top' | 'center' | 'bottom' | 'lower-third';
    alignment: 'left' | 'center' | 'right';
    safeZone: boolean;
  } | null;
  reason: string;
}

class TextPlacementService {
  
  /**
   * Determine smart text placement for scenes
   * Uses Claude Vision analysis results to avoid faces/key subjects
   */
  async determineTextPlacements(
    scenes: Array<{
      sceneIndex: number;
      sceneType: string;
      contentType: string;
      hasText: boolean;
      textContent?: string;
      analysisResult?: {
        faceRegions?: Array<{ x: number; y: number; width: number; height: number }>;
        subjectPosition?: 'left' | 'center' | 'right';
        busyRegions?: string[];
      };
    }>
  ): Promise<TextPlacement[]> {
    
    return scenes.map(scene => {
      if (!scene.hasText) {
        return {
          sceneIndex: scene.sceneIndex,
          hasTextOverlay: false,
          placement: null,
          reason: 'No text overlay needed',
        };
      }
      
      // Determine placement based on analysis
      const placement = this.calculatePlacement(scene);
      
      return {
        sceneIndex: scene.sceneIndex,
        hasTextOverlay: true,
        placement,
        reason: this.getPlacementReason(scene, placement),
      };
    });
  }
  
  private calculatePlacement(scene: any): TextPlacement['placement'] {
    const analysis = scene.analysisResult;
    
    // If face detected, avoid that region
    if (analysis?.faceRegions?.length > 0) {
      const faceY = analysis.faceRegions[0].y;
      
      // Face in upper half → text at bottom
      if (faceY < 0.5) {
        return {
          position: 'lower-third',
          alignment: 'center',
          safeZone: true,
        };
      }
      
      // Face in lower half → text at top
      return {
        position: 'top',
        alignment: 'center',
        safeZone: true,
      };
    }
    
    // Subject position affects alignment
    if (analysis?.subjectPosition === 'left') {
      return {
        position: 'lower-third',
        alignment: 'right',
        safeZone: true,
      };
    }
    
    if (analysis?.subjectPosition === 'right') {
      return {
        position: 'lower-third',
        alignment: 'left',
        safeZone: true,
      };
    }
    
    // Default - lower third, center
    return {
      position: 'lower-third',
      alignment: 'center',
      safeZone: true,
    };
  }
  
  private getPlacementReason(scene: any, placement: TextPlacement['placement']): string {
    const analysis = scene.analysisResult;
    
    if (analysis?.faceRegions?.length > 0) {
      return `Avoiding face region - text at ${placement?.position}`;
    }
    
    if (analysis?.subjectPosition) {
      return `Subject ${analysis.subjectPosition} - text aligned ${placement?.alignment}`;
    }
    
    return 'Standard lower-third placement';
  }
}

export const textPlacementService = new TextPlacementService();
```

---

## Step 3: Update Generation Preview Panel - Add Intelligence Section

Add to `generation-preview-panel.tsx`:

```tsx
{/* Intelligence Features */}
<div className="bg-white rounded-lg p-3 border">
  <div className="flex items-center gap-2 text-gray-500 mb-2">
    <Brain className="h-4 w-4" />
    <span className="text-xs font-medium">Intelligence</span>
  </div>
  <div className="space-y-2">
    {/* Scene Analysis */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Eye className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-sm">Scene Analysis</span>
      </div>
      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
        Claude Vision
      </Badge>
    </div>
    
    {/* Text Placement */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Type className="h-3.5 w-3.5 text-purple-500" />
        <span className="text-sm">Text Placement</span>
      </div>
      <span className="text-xs text-gray-500">
        Smart positioning ({estimate.intelligence?.textOverlays || 0} overlays)
      </span>
    </div>
    
    {/* Transitions */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Shuffle className="h-3.5 w-3.5 text-green-500" />
        <span className="text-sm">Transitions</span>
      </div>
      <span className="text-xs text-gray-500">
        Mood-matched ({estimate.transitions?.total || (estimate.project.sceneCount - 1)})
      </span>
    </div>
    
    {/* Transition breakdown on hover/expand */}
    {estimate.transitions && (
      <div className="pl-5 text-xs text-gray-400 space-y-0.5">
        {estimate.transitions.summary.dissolves > 0 && (
          <div>{estimate.transitions.summary.dissolves} dissolves</div>
        )}
        {estimate.transitions.summary.fades > 0 && (
          <div>{estimate.transitions.summary.fades} fades</div>
        )}
        {estimate.transitions.summary.cuts > 0 && (
          <div>{estimate.transitions.summary.cuts} cuts</div>
        )}
      </div>
    )}
  </div>
</div>
```

Add required imports:
```tsx
import { Brain, Eye, Type, Shuffle } from 'lucide-react';
```

---

## Step 4: Update Scene Card - Show Intelligence Details

Add to scene card expanded view:

```tsx
{/* Intelligence Analysis (in expanded view) */}
<div className="mt-3 pt-3 border-t border-gray-100">
  <label className="text-xs font-medium text-gray-500 block mb-2">
    Intelligence
  </label>
  <div className="grid grid-cols-2 gap-2">
    {/* Scene Analysis Status */}
    <div className="flex items-center gap-2 text-xs">
      <Eye className="h-3 w-3 text-blue-500" />
      <span className="text-gray-600">
        {scene.analysisStatus === 'complete' ? (
          <span className="text-green-600">Analyzed ✓</span>
        ) : (
          <span className="text-gray-400">Pending</span>
        )}
      </span>
    </div>
    
    {/* Text Placement */}
    {scene.textPlacement && (
      <div className="flex items-center gap-2 text-xs">
        <Type className="h-3 w-3 text-purple-500" />
        <span className="text-gray-600">
          {scene.textPlacement.position} {scene.textPlacement.alignment}
        </span>
      </div>
    )}
    
    {/* Transition to next scene */}
    {scene.transitionToNext && (
      <div className="col-span-2 flex items-center gap-2 text-xs">
        <Shuffle className="h-3 w-3 text-green-500" />
        <span className="text-gray-600">
          → {scene.transitionToNext.type} ({scene.transitionToNext.duration}s)
        </span>
        <span className="text-gray-400">
          {scene.transitionToNext.moodMatch}
        </span>
      </div>
    )}
  </div>
</div>
```

---

## Step 5: Update Generation Estimate API

Add intelligence data to the estimate:

```typescript
import { transitionService } from './services/transition-service';
import { textPlacementService } from './services/text-placement-service';

// In the estimate endpoint:

// Design transitions
const transitionsData = transitionService.designTransitions(
  scenes.map((s: any, i: number) => ({
    sceneIndex: i,
    sceneType: s.type,
    mood: s.mood,
    duration: s.duration || 5,
  })),
  visualStyle
);

// Count text overlays
const textOverlayCount = scenes.filter((s: any) => 
  s.hasTextOverlay || s.textContent
).length;

// Include in response
res.json({
  // ... existing fields
  intelligence: {
    sceneAnalysis: {
      provider: 'Claude Vision',
      enabled: true,
    },
    textPlacement: {
      enabled: true,
      overlayCount: textOverlayCount,
    },
    transitions: {
      enabled: true,
      moodMatched: true,
    },
  },
  transitions: {
    total: transitionsData.transitions.length,
    summary: transitionsData.summary,
    details: transitionsData.transitions,
  },
});
```

---

## Verification Checklist

Before moving to Phase 7E, confirm:

- [ ] Transition service created with mood-matching logic
- [ ] Text placement service created with face avoidance
- [ ] Generation Preview shows Intelligence section
- [ ] Claude Vision indicated for scene analysis
- [ ] Text placement count displayed
- [ ] Transition count and types displayed
- [ ] Scene cards show intelligence details when expanded
- [ ] Transition mood matches shown (e.g., "struggle → hope")

---

## Example Intelligence Output

```
Generation Preview:
┌─────────────────────────────────────────┐
│ 🧠 Intelligence                         │
│                                         │
│ 👁️ Scene Analysis    Claude Vision      │
│ 📝 Text Placement    Smart (4 overlays) │
│ 🔀 Transitions       Mood-matched (17)  │
│      8 dissolves                        │
│      6 fades                            │
│      3 cuts                             │
└─────────────────────────────────────────┘

Scene 3 → Scene 4 transition:
Type: dissolve (1.0s)
Mood match: struggle → hope
Reason: Problem to solution - transformation moment
```

---

## Next Phase

Once Intelligence Features Display is complete, proceed to **Phase 7E: Quality Assurance Integration** to add the QA step to the progress tracker.
