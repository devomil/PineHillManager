# Phase 5B: Visual Style Provider Mapping

## Objective

Connect the "Visual Style" dropdown to Phase 1B's intelligent provider selection system. Each visual style should influence which AI providers are preferred, what mood settings are used, and how prompts are enhanced.

## Prerequisites

- Phase 5A complete (Brand Settings Panel working)
- Phase 1B complete (multi-provider video service working)
- Visual Style dropdown exists in universal-video-producer.tsx

## What This Phase Creates/Modifies

- `shared/visual-style-config.ts` - NEW: Style configuration definitions
- `server/services/ai-video-service.ts` - Use style config for provider selection
- `client/src/components/universal-video-producer.tsx` - Enhanced style selector
- `client/src/components/music-style-selector.tsx` - NEW: Music style component

## What Success Looks Like

- "Cinematic" style prefers Runway, uses dramatic mood, longer transitions
- "Energetic" style prefers Kling/Hailuo, uses fast pacing
- "Professional" style uses balanced provider selection
- Music style automatically matches visual style

---

## Step 1: Create Visual Style Configuration

Create `shared/visual-style-config.ts`:

```typescript
// shared/visual-style-config.ts

export interface VisualStyleConfig {
  id: string;
  name: string;
  description: string;
  
  // Provider preferences (order matters - first is most preferred)
  preferredVideoProviders: string[];
  preferredImageProviders: string[];
  
  // Prompt enhancement settings
  promptModifiers: {
    mood: string;
    lighting: string;
    cameraWork: string;
    colorGrade: string;
    pacing: string;
  };
  
  // Content type hints
  defaultContentTypes: {
    hook: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    problem: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    solution: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    benefit: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
    cta: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
  };
  
  // Music preferences
  musicStyle: {
    genre: string;
    mood: string;
    tempo: 'slow' | 'medium' | 'fast';
    energy: 'low' | 'medium' | 'high';
  };
  
  // Transition preferences
  transitions: {
    defaultType: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'zoom';
    defaultDuration: number; // seconds
    betweenSceneTypes?: Record<string, string>; // e.g., "problem-to-solution": "dissolve"
  };
  
  // Additional prompt text to append
  stylePromptSuffix: string;
  
  // Negative prompt additions
  negativePromptAdditions: string[];
}

export const VISUAL_STYLES: Record<string, VisualStyleConfig> = {
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Clean, corporate-friendly visuals with balanced composition',
    
    preferredVideoProviders: ['runway', 'kling', 'hailuo'],
    preferredImageProviders: ['ideogram', 'flux'],
    
    promptModifiers: {
      mood: 'professional, trustworthy, confident',
      lighting: 'soft professional lighting, well-lit',
      cameraWork: 'steady shots, smooth movements, eye-level angles',
      colorGrade: 'natural colors, balanced exposure',
      pacing: 'measured pacing, clear focus',
    },
    
    defaultContentTypes: {
      hook: 'person',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'lifestyle',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'corporate ambient',
      mood: 'uplifting, confident',
      tempo: 'medium',
      energy: 'medium',
    },
    
    transitions: {
      defaultType: 'dissolve',
      defaultDuration: 0.5,
    },
    
    stylePromptSuffix: 'professional quality, commercial grade, clean aesthetic',
    negativePromptAdditions: ['amateur', 'low budget', 'grainy'],
  },

  cinematic: {
    id: 'cinematic',
    name: 'Cinematic',
    description: 'Film-quality visuals with dramatic lighting and composition',
    
    preferredVideoProviders: ['runway', 'kling'], // Runway excels at cinematic
    preferredImageProviders: ['midjourney', 'flux'],
    
    promptModifiers: {
      mood: 'dramatic, emotional, impactful',
      lighting: 'cinematic lighting, dramatic shadows, golden hour',
      cameraWork: 'dynamic camera movements, depth of field, wide establishing shots',
      colorGrade: 'cinematic color grading, teal and orange, high contrast',
      pacing: 'deliberate pacing, dramatic pauses, building tension',
    },
    
    defaultContentTypes: {
      hook: 'nature',
      problem: 'person',
      solution: 'abstract',
      benefit: 'lifestyle',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'orchestral cinematic',
      mood: 'epic, emotional, inspiring',
      tempo: 'slow',
      energy: 'high',
    },
    
    transitions: {
      defaultType: 'fade',
      defaultDuration: 1.0,
      betweenSceneTypes: {
        'hook-to-problem': 'dissolve',
        'solution-to-benefit': 'fade',
      },
    },
    
    stylePromptSuffix: 'cinematic quality, film grain, anamorphic lens, 2.39:1 aspect feel, movie-like',
    negativePromptAdditions: ['flat lighting', 'static camera', 'boring composition'],
  },

  energetic: {
    id: 'energetic',
    name: 'Energetic',
    description: 'Fast-paced, vibrant visuals with dynamic movement',
    
    preferredVideoProviders: ['kling', 'hailuo', 'runway'], // Kling/Hailuo handle motion well
    preferredImageProviders: ['ideogram', 'flux'],
    
    promptModifiers: {
      mood: 'energetic, exciting, vibrant, dynamic',
      lighting: 'bright, high-key lighting, punchy colors',
      cameraWork: 'fast cuts, dynamic angles, tracking shots, movement',
      colorGrade: 'saturated colors, high vibrance, bold contrast',
      pacing: 'fast pacing, quick transitions, energetic rhythm',
    },
    
    defaultContentTypes: {
      hook: 'lifestyle',
      problem: 'person',
      solution: 'product',
      benefit: 'lifestyle',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'upbeat electronic pop',
      mood: 'energetic, motivating, exciting',
      tempo: 'fast',
      energy: 'high',
    },
    
    transitions: {
      defaultType: 'cut',
      defaultDuration: 0.3,
    },
    
    stylePromptSuffix: 'dynamic, vibrant, energetic motion, action-packed',
    negativePromptAdditions: ['static', 'boring', 'slow', 'dull'],
  },

  warm: {
    id: 'warm',
    name: 'Warm & Friendly',
    description: 'Inviting, approachable visuals with soft warm tones',
    
    preferredVideoProviders: ['runway', 'kling', 'hailuo'],
    preferredImageProviders: ['flux', 'ideogram'],
    
    promptModifiers: {
      mood: 'warm, friendly, inviting, approachable',
      lighting: 'warm golden lighting, soft diffused light, cozy atmosphere',
      cameraWork: 'gentle movements, intimate framing, close-ups',
      colorGrade: 'warm color temperature, soft highlights, golden tones',
      pacing: 'relaxed pacing, comfortable rhythm',
    },
    
    defaultContentTypes: {
      hook: 'person',
      problem: 'person',
      solution: 'lifestyle',
      benefit: 'lifestyle',
      cta: 'person',
    },
    
    musicStyle: {
      genre: 'acoustic folk',
      mood: 'warm, friendly, heartfelt',
      tempo: 'medium',
      energy: 'low',
    },
    
    transitions: {
      defaultType: 'dissolve',
      defaultDuration: 0.7,
    },
    
    stylePromptSuffix: 'warm and inviting, cozy atmosphere, friendly feel, approachable',
    negativePromptAdditions: ['cold', 'harsh', 'clinical', 'sterile'],
  },

  minimal: {
    id: 'minimal',
    name: 'Minimal & Modern',
    description: 'Clean, minimalist aesthetic with focus on simplicity',
    
    preferredVideoProviders: ['runway', 'kling'],
    preferredImageProviders: ['midjourney', 'flux'],
    
    promptModifiers: {
      mood: 'clean, minimal, modern, sophisticated',
      lighting: 'clean even lighting, no harsh shadows, bright',
      cameraWork: 'static or slow pan, centered composition, negative space',
      colorGrade: 'desaturated, monochromatic, clean whites',
      pacing: 'slow, deliberate, breathing room',
    },
    
    defaultContentTypes: {
      hook: 'abstract',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'abstract',
      cta: 'product',
    },
    
    musicStyle: {
      genre: 'minimal electronic ambient',
      mood: 'calm, clean, modern',
      tempo: 'slow',
      energy: 'low',
    },
    
    transitions: {
      defaultType: 'fade',
      defaultDuration: 0.8,
    },
    
    stylePromptSuffix: 'minimalist, clean background, negative space, modern design, simple',
    negativePromptAdditions: ['cluttered', 'busy', 'complex', 'messy'],
  },

  luxury: {
    id: 'luxury',
    name: 'Luxury & Premium',
    description: 'High-end, sophisticated visuals with rich details',
    
    preferredVideoProviders: ['runway'], // Runway best for premium quality
    preferredImageProviders: ['midjourney', 'flux'],
    
    promptModifiers: {
      mood: 'luxurious, premium, sophisticated, exclusive',
      lighting: 'dramatic accent lighting, rich shadows, spotlighting',
      cameraWork: 'elegant slow motion, smooth dolly shots, revealing angles',
      colorGrade: 'rich deep colors, gold accents, high contrast, moody',
      pacing: 'slow, luxurious, lingering shots',
    },
    
    defaultContentTypes: {
      hook: 'product',
      problem: 'lifestyle',
      solution: 'product',
      benefit: 'lifestyle',
      cta: 'product',
    },
    
    musicStyle: {
      genre: 'elegant orchestral',
      mood: 'sophisticated, luxurious, premium',
      tempo: 'slow',
      energy: 'medium',
    },
    
    transitions: {
      defaultType: 'fade',
      defaultDuration: 1.2,
    },
    
    stylePromptSuffix: 'luxury, premium quality, high-end, sophisticated, elegant, exclusive',
    negativePromptAdditions: ['cheap', 'budget', 'mass market', 'generic'],
  },
};

// Helper to get style config with fallback
export function getVisualStyleConfig(styleId: string): VisualStyleConfig {
  return VISUAL_STYLES[styleId] || VISUAL_STYLES.professional;
}

// Get all available styles for UI
export function getAvailableStyles(): Array<{ id: string; name: string; description: string }> {
  return Object.values(VISUAL_STYLES).map(style => ({
    id: style.id,
    name: style.name,
    description: style.description,
  }));
}
```

---

## Step 2: Update AI Video Service to Use Style Config

Update `server/services/ai-video-service.ts`:

### Add import:
```typescript
import { getVisualStyleConfig, VisualStyleConfig } from '@shared/visual-style-config';
```

### Update AIVideoOptions interface:
```typescript
export interface AIVideoOptions {
  prompt: string;
  duration: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  sceneType: string;
  narration?: string;
  mood?: string;
  contentType?: 'person' | 'product' | 'nature' | 'abstract' | 'lifestyle';
  negativePrompt?: string;
  visualStyle?: string;  // ADD THIS
}
```

### Update generateVideo to use style config:
```typescript
async generateVideo(options: AIVideoOptions): Promise<AIVideoResult> {
  // Get visual style configuration
  const styleConfig = getVisualStyleConfig(options.visualStyle || 'professional');
  
  // Determine content type from style config if not provided
  const contentType = options.contentType || 
    styleConfig.defaultContentTypes[options.sceneType as keyof typeof styleConfig.defaultContentTypes] ||
    'lifestyle';
  
  // Build enhanced prompt with style modifiers
  const styleEnhancedPrompt = this.applyStyleToPrompt(options.prompt, styleConfig);
  
  // Enhance prompt with brand context and style
  const enhanced = await promptEnhancementService.enhanceVideoPrompt(
    styleEnhancedPrompt,
    {
      sceneType: options.sceneType,
      narration: options.narration,
      mood: options.mood || styleConfig.promptModifiers.mood,
      contentType,
      excludeElements: styleConfig.negativePromptAdditions,
    }
  );
  
  // Select providers based on style preferences
  const providerOrder = this.selectProvidersForStyle(
    styleConfig.preferredVideoProviders,
    options.sceneType,
    contentType
  );
  
  console.log(`[AIVideo] Using style: ${styleConfig.name}`);
  console.log(`[AIVideo] Provider order: ${providerOrder.join(' → ')}`);
  
  // Continue with provider selection and generation...
  // Use providerOrder instead of default provider selection
}

/**
 * Apply visual style modifiers to the prompt
 */
private applyStyleToPrompt(prompt: string, style: VisualStyleConfig): string {
  const modifiers = style.promptModifiers;
  const parts = [
    prompt,
    modifiers.mood,
    modifiers.lighting,
    modifiers.cameraWork,
    modifiers.colorGrade,
    style.stylePromptSuffix,
  ];
  return parts.filter(p => p).join(', ');
}

/**
 * Select providers based on style preferences and scene requirements
 */
private selectProvidersForStyle(
  preferredProviders: string[],
  sceneType: string,
  contentType: string
): string[] {
  // Start with style-preferred providers
  const providers = [...preferredProviders];
  
  // Adjust for specific scene/content needs
  // e.g., if person content, prioritize providers good with people
  if (contentType === 'person') {
    // Runway and Kling handle people well
    const personProviders = ['runway', 'kling'];
    // Move person-friendly providers to front if not already
    personProviders.forEach(p => {
      const idx = providers.indexOf(p);
      if (idx > 0) {
        providers.splice(idx, 1);
        providers.unshift(p);
      }
    });
  }
  
  // For CTA scenes, prioritize most reliable provider
  if (sceneType === 'cta') {
    if (!providers.includes('runway')) {
      providers.unshift('runway');
    }
  }
  
  return providers;
}
```

---

## Step 3: Create Enhanced Style Selector Component

Update the style selector in `universal-video-producer.tsx`:

```tsx
import { getAvailableStyles } from '@shared/visual-style-config';

// In component:
const visualStyles = getAvailableStyles();

// Replace simple dropdown with enhanced selector:
<div className="space-y-2">
  <label className="text-sm font-medium">Visual Style</label>
  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
    {visualStyles.map((style) => (
      <button
        key={style.id}
        onClick={() => setVisualStyle(style.id)}
        className={`
          p-3 rounded-lg border text-left transition-all
          ${visualStyle === style.id 
            ? 'border-primary bg-primary/5 ring-1 ring-primary' 
            : 'border-gray-200 hover:border-gray-300'}
        `}
      >
        <p className="font-medium text-sm">{style.name}</p>
        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
          {style.description}
        </p>
      </button>
    ))}
  </div>
</div>
```

---

## Step 4: Create Music Style Selector Component

Create `client/src/components/music-style-selector.tsx`:

```tsx
import React from 'react';
import { Music, Volume2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { getVisualStyleConfig } from '@shared/visual-style-config';

interface MusicStyleSelectorProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  visualStyle: string;
  customMood?: string;
  onMoodChange?: (mood: string) => void;
}

const MUSIC_MOODS = [
  { id: 'uplifting', name: 'Uplifting', description: 'Positive, inspiring' },
  { id: 'calm', name: 'Calm', description: 'Relaxing, peaceful' },
  { id: 'energetic', name: 'Energetic', description: 'Dynamic, exciting' },
  { id: 'emotional', name: 'Emotional', description: 'Heartfelt, moving' },
  { id: 'corporate', name: 'Corporate', description: 'Professional, confident' },
  { id: 'epic', name: 'Epic', description: 'Cinematic, powerful' },
];

export const MusicStyleSelector: React.FC<MusicStyleSelectorProps> = ({
  enabled,
  onEnabledChange,
  visualStyle,
  customMood,
  onMoodChange,
}) => {
  const styleConfig = getVisualStyleConfig(visualStyle);
  const defaultMood = styleConfig.musicStyle.mood.split(',')[0].trim();
  const currentMood = customMood || defaultMood;

  return (
    <div className="space-y-3">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium">Background Music</span>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {/* Music Options (only show if enabled) */}
      {enabled && (
        <div className="pl-6 space-y-3">
          {/* Auto-matched indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Volume2 className="h-3 w-3" />
            <span>
              Auto-matched to "{styleConfig.name}" style: {styleConfig.musicStyle.genre}
            </span>
          </div>

          {/* Mood selector */}
          <div>
            <label className="text-xs text-gray-500 mb-2 block">Music Mood</label>
            <div className="flex flex-wrap gap-2">
              {MUSIC_MOODS.map((mood) => (
                <button
                  key={mood.id}
                  onClick={() => onMoodChange?.(mood.id)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs transition-all
                    ${currentMood === mood.id
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
                  `}
                >
                  {mood.name}
                </button>
              ))}
            </div>
          </div>

          {/* Preview info */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <p className="font-medium text-gray-700">Music Preview:</p>
            <p className="text-gray-500 mt-1">
              {styleConfig.musicStyle.genre} • {styleConfig.musicStyle.tempo} tempo • {styleConfig.musicStyle.energy} energy
            </p>
            <p className="text-gray-400 mt-1">
              Generated by Udio AI via PiAPI
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MusicStyleSelector;
```

---

## Step 5: Integrate Music Selector

In `universal-video-producer.tsx`:

```tsx
import { MusicStyleSelector } from './music-style-selector';

// Add state:
const [musicEnabled, setMusicEnabled] = useState(true);
const [musicMood, setMusicMood] = useState<string>('');

// In the UI, replace the simple Music toggle:
<MusicStyleSelector
  enabled={musicEnabled}
  onEnabledChange={setMusicEnabled}
  visualStyle={visualStyle}
  customMood={musicMood}
  onMoodChange={setMusicMood}
/>
```

---

## Step 6: Pass Style to Generation

Update the generate assets call:

```typescript
const handleGenerateAssets = async () => {
  await fetch(`/api/video-projects/${projectId}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      visualStyle,
      musicEnabled,
      musicMood: musicMood || undefined,
      brandSettings,
    }),
  });
};
```

---

## Verification Checklist

Before moving to Phase 5C, confirm:

- [ ] `visual-style-config.ts` created with all style definitions
- [ ] Style selector displays all styles with descriptions
- [ ] Selected style is highlighted correctly
- [ ] AI video service uses style's preferred providers
- [ ] Prompts include style modifiers (mood, lighting, etc.)
- [ ] Music selector shows auto-matched style info
- [ ] Music mood can be customized
- [ ] Console logs show which style and providers are being used
- [ ] Different styles produce visually different results

---

## Style Reference

| Style | Primary Providers | Mood | Music Genre | Transitions |
|-------|------------------|------|-------------|-------------|
| Professional | Runway, Kling | Professional, trustworthy | Corporate ambient | Dissolve 0.5s |
| Cinematic | Runway, Kling | Dramatic, emotional | Orchestral cinematic | Fade 1.0s |
| Energetic | Kling, Hailuo | Energetic, vibrant | Upbeat electronic | Cut 0.3s |
| Warm & Friendly | Runway, Kling | Warm, inviting | Acoustic folk | Dissolve 0.7s |
| Minimal | Runway, Kling | Clean, modern | Minimal electronic | Fade 0.8s |
| Luxury | Runway | Luxurious, sophisticated | Elegant orchestral | Fade 1.2s |

---

## Troubleshooting

### "Style not affecting provider selection"
- Check style ID matches config keys
- Verify style is passed to generateVideo options
- Check console for provider order logs

### "Music mood not matching style"
- Verify getVisualStyleConfig import path
- Check musicStyle object in style config

### "Prompts not including style modifiers"
- Check applyStyleToPrompt is being called
- Verify promptModifiers object exists in style

---

## Next Phase

Once Visual Style Provider Mapping is working, proceed to **Phase 5C: Scene-Level Controls** to add per-scene content type and visual direction.
