# Phase 7C: Sound Design Correction

## Objective

Fix the sound effects provider from "Runway Sound" to "Kling Sound" and display proper sound effect assignments (ambient sounds, transition sounds) per scene in the UI.

## Current Problem

- Generation Preview shows "Runway Sound" but should show "Kling Sound"
- No visibility into what sound effects will be added per scene
- Sound design decisions not exposed in UI

## What This Phase Modifies

- `server/services/sound-design-service.ts` - Fix provider, add scene assignments
- `shared/provider-config.ts` - Verify Kling Sound config
- `client/src/components/generation-preview-panel.tsx` - Show sound details
- `client/src/components/scene-card.tsx` - Show sound assignments per scene

---

## Step 1: Update Sound Design Service

Update `server/services/sound-design-service.ts`:

```typescript
// server/services/sound-design-service.ts

import { SOUND_PROVIDERS } from '@shared/provider-config';

export interface SceneSoundDesign {
  sceneIndex: number;
  ambient: {
    type: string;
    description: string;
  } | null;
  transition: {
    type: string;
    duration: number;
    description: string;
  } | null;
  accents: string[];
}

export interface ProjectSoundDesign {
  voiceover: {
    provider: string;
    voice: string;
    totalDuration: number;
  };
  music: {
    provider: string;
    style: string;
    mood: string;
    duration: number;
  };
  soundEffects: {
    provider: string;  // Should be "Kling Sound"
    ambientCount: number;
    transitionCount: number;
    accentCount: number;
  };
  sceneDesigns: SceneSoundDesign[];
}

class SoundDesignService {
  
  // FIXED: Use Kling Sound instead of Runway Sound
  private readonly SFX_PROVIDER = SOUND_PROVIDERS.kling_sound;
  
  /**
   * Design sound for entire project
   */
  async designProjectSound(
    scenes: Array<{
      sceneIndex: number;
      sceneType: string;
      narration: string;
      duration: number;
      visualDirection: string;
    }>,
    options: {
      musicEnabled: boolean;
      musicMood: string;
      voiceId: string;
    }
  ): Promise<ProjectSoundDesign> {
    
    console.log(`[SoundDesign] Designing sound for ${scenes.length} scenes`);
    console.log(`[SoundDesign] Using ${this.SFX_PROVIDER.displayName} for sound effects`);
    
    // Design sound for each scene
    const sceneDesigns = scenes.map(scene => this.designSceneSound(scene, scenes));
    
    // Count totals
    const ambientCount = sceneDesigns.filter(s => s.ambient).length;
    const transitionCount = sceneDesigns.filter(s => s.transition).length;
    const accentCount = sceneDesigns.reduce((sum, s) => sum + s.accents.length, 0);
    
    const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    
    console.log(`[SoundDesign] Sound effects: ${ambientCount} ambient, ${transitionCount} transitions, ${accentCount} accents`);
    
    return {
      voiceover: {
        provider: SOUND_PROVIDERS.elevenlabs.displayName,
        voice: options.voiceId || 'Rachel',
        totalDuration,
      },
      music: {
        provider: options.musicEnabled ? SOUND_PROVIDERS.udio.displayName : 'Disabled',
        style: 'corporate ambient', // From visual style config
        mood: options.musicMood || 'uplifting',
        duration: totalDuration,
      },
      soundEffects: {
        provider: this.SFX_PROVIDER.displayName, // "Kling Sound"
        ambientCount,
        transitionCount,
        accentCount,
      },
      sceneDesigns,
    };
  }
  
  /**
   * Design sound for individual scene
   */
  private designSceneSound(
    scene: {
      sceneIndex: number;
      sceneType: string;
      narration: string;
      duration: number;
      visualDirection: string;
    },
    allScenes: Array<any>
  ): SceneSoundDesign {
    const design: SceneSoundDesign = {
      sceneIndex: scene.sceneIndex,
      ambient: null,
      transition: null,
      accents: [],
    };
    
    // Determine ambient sound based on visual direction
    design.ambient = this.selectAmbientSound(scene.visualDirection, scene.sceneType);
    
    // Determine transition sound (if not last scene)
    if (scene.sceneIndex < allScenes.length - 1) {
      design.transition = this.selectTransitionSound(
        scene.sceneType,
        allScenes[scene.sceneIndex + 1]?.sceneType
      );
    }
    
    // Determine accent sounds based on content
    design.accents = this.selectAccentSounds(scene.narration, scene.sceneType);
    
    return design;
  }
  
  /**
   * Select ambient sound based on visual direction
   */
  private selectAmbientSound(
    visualDirection: string,
    sceneType: string
  ): { type: string; description: string } | null {
    const lower = visualDirection.toLowerCase();
    
    // Kitchen/cooking scenes
    if (/kitchen|cooking|food|preparing/.test(lower)) {
      return {
        type: 'kitchen-ambient',
        description: 'Soft kitchen ambience, subtle cooking sounds',
      };
    }
    
    // Nature/outdoor scenes
    if (/garden|outdoor|nature|farm|field/.test(lower)) {
      return {
        type: 'nature-ambient',
        description: 'Birds chirping, gentle breeze, natural sounds',
      };
    }
    
    // Wellness/spa scenes
    if (/spa|wellness|calm|peaceful|meditation/.test(lower)) {
      return {
        type: 'wellness-ambient',
        description: 'Soft ambient tones, subtle water sounds',
      };
    }
    
    // Home/interior scenes
    if (/home|living|cozy|interior|room/.test(lower)) {
      return {
        type: 'home-ambient',
        description: 'Quiet home atmosphere, subtle room tone',
      };
    }
    
    // Default - subtle room tone
    return {
      type: 'room-tone',
      description: 'Clean, subtle background atmosphere',
    };
  }
  
  /**
   * Select transition sound between scenes
   */
  private selectTransitionSound(
    currentType: string,
    nextType: string
  ): { type: string; duration: number; description: string } {
    // Problem to solution - hopeful swell
    if (
      (currentType === 'problem' || currentType === 'agitation') &&
      (nextType === 'solution' || nextType === 'benefit')
    ) {
      return {
        type: 'hopeful-swell',
        duration: 0.8,
        description: 'Uplifting transition swell',
      };
    }
    
    // Hook to content - soft whoosh
    if (currentType === 'hook') {
      return {
        type: 'soft-whoosh',
        duration: 0.5,
        description: 'Gentle attention transition',
      };
    }
    
    // To CTA - building energy
    if (nextType === 'cta') {
      return {
        type: 'energy-build',
        duration: 1.0,
        description: 'Building energy toward call-to-action',
      };
    }
    
    // Default - soft dissolve
    return {
      type: 'soft-dissolve',
      duration: 0.6,
      description: 'Smooth audio transition',
    };
  }
  
  /**
   * Select accent sounds based on narration content
   */
  private selectAccentSounds(narration: string, sceneType: string): string[] {
    const accents: string[] = [];
    const lower = narration.toLowerCase();
    
    // Emphasis sounds for key points
    if (/important|crucial|key|remember/.test(lower)) {
      accents.push('subtle-emphasis');
    }
    
    // Notification sound for tips/strategies
    if (/strategy|tip|try this|here\'s/.test(lower)) {
      accents.push('soft-notification');
    }
    
    // Positive confirmation for benefits
    if (sceneType === 'benefit' || /success|result|transform/.test(lower)) {
      accents.push('positive-chime');
    }
    
    return accents;
  }
  
  /**
   * Generate sound effect using Kling Sound API
   */
  async generateSoundEffect(
    type: string,
    duration: number
  ): Promise<{ url: string; type: string }> {
    console.log(`[SoundDesign] Generating ${type} via ${this.SFX_PROVIDER.displayName}`);
    
    try {
      // Kling Sound API call
      const response = await fetch(process.env.KLING_SOUND_API_ENDPOINT || 'https://api.kling.ai/sound', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KLING_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          duration,
          format: 'mp3',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Kling Sound API error: ${response.status}`);
      }
      
      const result = await response.json();
      
      return {
        url: result.audio_url || result.url,
        type,
      };
      
    } catch (error: any) {
      console.error(`[SoundDesign] Kling Sound failed:`, error.message);
      throw error;
    }
  }
}

export const soundDesignService = new SoundDesignService();
```

---

## Step 2: Update Generation Preview Panel

Fix the Sound FX display in `generation-preview-panel.tsx`:

```tsx
{/* Sound FX - FIXED to show Kling Sound */}
<div className="bg-white rounded-lg p-3 border">
  <div className="flex items-center gap-2 text-gray-500 mb-2">
    <Volume2 className="h-4 w-4" />
    <span className="text-xs font-medium">Sound FX</span>
  </div>
  <div className="space-y-1">
    <p className="text-sm font-medium">Kling Sound</p>
    <div className="text-xs text-gray-500 space-y-0.5">
      <div className="flex justify-between">
        <span>Ambient sounds</span>
        <span>{estimate.soundDesign?.ambientCount || estimate.project.sceneCount}</span>
      </div>
      <div className="flex justify-between">
        <span>Transitions</span>
        <span>{estimate.soundDesign?.transitionCount || (estimate.project.sceneCount - 1)}</span>
      </div>
      {estimate.soundDesign?.accentCount > 0 && (
        <div className="flex justify-between">
          <span>Accent sounds</span>
          <span>{estimate.soundDesign.accentCount}</span>
        </div>
      )}
    </div>
  </div>
</div>
```

---

## Step 3: Update Scene Card with Sound Info

Add sound information to the scene card in expanded view:

```tsx
{/* Sound Design (in expanded view) */}
<div className="mt-3 pt-3 border-t border-gray-100">
  <label className="text-xs font-medium text-gray-500 block mb-2">
    Sound Design
  </label>
  <div className="flex flex-wrap gap-2">
    {scene.soundDesign?.ambient && (
      <Badge variant="outline" className="text-xs">
        🔊 {scene.soundDesign.ambient.type}
      </Badge>
    )}
    {scene.soundDesign?.transition && (
      <Badge variant="outline" className="text-xs">
        ↔️ {scene.soundDesign.transition.type} ({scene.soundDesign.transition.duration}s)
      </Badge>
    )}
    {scene.soundDesign?.accents?.map((accent, idx) => (
      <Badge key={idx} variant="outline" className="text-xs">
        ✨ {accent}
      </Badge>
    ))}
  </div>
</div>
```

---

## Step 4: Update Generation Estimate API

Add sound design to the estimate:

```typescript
import { soundDesignService } from './services/sound-design-service';

// In the estimate endpoint:
const soundDesign = await soundDesignService.designProjectSound(
  scenes.map((s: any, i: number) => ({
    sceneIndex: i,
    sceneType: s.type,
    narration: s.narration,
    duration: s.duration || 5,
    visualDirection: s.visualDirection || '',
  })),
  {
    musicEnabled: project.musicEnabled !== false,
    musicMood: project.musicMood || 'uplifting',
    voiceId: project.voiceId || 'Rachel',
  }
);

// Include in response
res.json({
  // ... existing fields
  providers: {
    video: providerCounts,
    voiceover: soundDesign.voiceover.provider,
    music: soundDesign.music.provider,
    soundFx: soundDesign.soundEffects.provider, // "Kling Sound"
    images: imageProviderCounts,
  },
  soundDesign: {
    voiceover: soundDesign.voiceover,
    music: soundDesign.music,
    ambientCount: soundDesign.soundEffects.ambientCount,
    transitionCount: soundDesign.soundEffects.transitionCount,
    accentCount: soundDesign.soundEffects.accentCount,
  },
  // Include per-scene sound design for scene cards
  sceneSound: soundDesign.sceneDesigns,
});
```

---

## Step 5: Verify Provider Config

Ensure `shared/provider-config.ts` has correct Kling Sound config:

```typescript
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
  
  // CORRECT - Kling Sound, NOT Runway Sound
  kling_sound: {
    id: 'kling_sound',
    name: 'Kling Sound',
    displayName: 'Kling Sound',
    type: 'sfx',
    costPerEffect: 0.01,
    capabilities: [
      'ambient',
      'transitions',
      'accents',
      'foley',
    ],
  },
};
```

---

## Verification Checklist

Before moving to Phase 7D, confirm:

- [ ] Sound design service uses "Kling Sound" (not "Runway Sound")
- [ ] Generation Preview shows "Kling Sound" for Sound FX
- [ ] Ambient sound count displayed
- [ ] Transition sound count displayed
- [ ] Scene cards show sound assignments in expanded view
- [ ] Sound types match scene content (kitchen ambient for kitchen scenes, etc.)
- [ ] Transition types vary based on scene progression

---

## Example Sound Design Output

```
[SoundDesign] Designing sound for 18 scenes
[SoundDesign] Using Kling Sound for sound effects
[SoundDesign] Sound effects: 18 ambient, 17 transitions, 8 accents

Scene 1: kitchen-ambient, soft-whoosh transition
Scene 2: kitchen-ambient, soft-dissolve transition
Scene 3: room-tone, hopeful-swell transition (problem → solution)
Scene 4: nature-ambient, soft-dissolve transition
...
Scene 18: wellness-ambient, no transition (last scene)
```

---

## Next Phase

Once Sound Design Correction is complete, proceed to **Phase 7D: Intelligence Features Display** to expose Claude Vision analysis, text placement, and transitions.
