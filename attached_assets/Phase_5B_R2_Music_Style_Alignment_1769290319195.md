# Phase 5B-R2: Music Style Alignment

## Objective

Align the Background Music system with the new 6-style visual system from Phase 5B-R. Music should auto-match to the selected visual style with intelligent defaults.

## Prerequisites

- Phase 5B-R complete (new 6-style visual system implemented)

## Current Problems

1. UI shows "Auto-matched to Professional style" - but "Professional" no longer exists
2. Mood buttons (Uplifting, Calm, Energetic, Emotional, Corporate, Epic) don't map to new styles
3. No clear relationship between visual style selection and music generation

## New Music Mapping

| Visual Style | Default Genre | Default Mood | Tempo | Energy |
|--------------|---------------|--------------|-------|--------|
| Hero (Cinematic) | orchestral cinematic | epic, emotional | slow | high |
| Lifestyle | acoustic folk indie | warm, hopeful | medium | medium |
| Product Showcase | minimal electronic | modern, clean | slow | low |
| Educational | light ambient | friendly, clear | medium | medium |
| Social (Energetic) | upbeat electronic pop | fun, trending | fast | high |
| Premium | elegant orchestral | sophisticated, refined | slow | medium |

---

## Step 1: Update Music Style Configuration

Add to `shared/visual-style-config.ts` (or create `shared/music-style-config.ts`):

```typescript
// Music style configuration aligned with visual styles

export interface MusicStyleConfig {
  genre: string;
  mood: string;
  tempo: 'slow' | 'medium' | 'fast';
  energy: 'low' | 'medium' | 'high';
  preferredProvider: string;
  promptKeywords: string[];
}

export const MUSIC_STYLES: Record<string, MusicStyleConfig> = {
  hero: {
    genre: 'orchestral cinematic',
    mood: 'epic, emotional, inspiring',
    tempo: 'slow',
    energy: 'high',
    preferredProvider: 'udio',
    promptKeywords: ['cinematic', 'orchestral', 'epic', 'dramatic', 'inspiring', 'film score', 'emotional crescendo'],
  },
  
  lifestyle: {
    genre: 'acoustic folk indie',
    mood: 'warm, hopeful, authentic',
    tempo: 'medium',
    energy: 'medium',
    preferredProvider: 'udio',
    promptKeywords: ['acoustic guitar', 'warm', 'organic', 'folk', 'indie', 'hopeful', 'authentic'],
  },
  
  product: {
    genre: 'minimal electronic ambient',
    mood: 'modern, clean, sophisticated',
    tempo: 'slow',
    energy: 'low',
    preferredProvider: 'udio',
    promptKeywords: ['minimal', 'electronic', 'ambient', 'clean', 'modern', 'subtle', 'sophisticated'],
  },
  
  educational: {
    genre: 'light ambient',
    mood: 'friendly, supportive, clear',
    tempo: 'medium',
    energy: 'medium',
    preferredProvider: 'udio',
    promptKeywords: ['friendly', 'light', 'positive', 'background', 'non-distracting', 'supportive'],
  },
  
  social: {
    genre: 'upbeat electronic pop',
    mood: 'energetic, fun, trending',
    tempo: 'fast',
    energy: 'high',
    preferredProvider: 'suno',
    promptKeywords: ['upbeat', 'energetic', 'pop', 'electronic', 'trending', 'TikTok', 'catchy', 'dynamic'],
  },
  
  premium: {
    genre: 'elegant orchestral ambient',
    mood: 'sophisticated, refined, luxurious',
    tempo: 'slow',
    energy: 'medium',
    preferredProvider: 'udio',
    promptKeywords: ['elegant', 'sophisticated', 'luxury', 'refined', 'orchestral', 'premium', 'tasteful'],
  },
};

/**
 * Get music style config for a visual style
 */
export function getMusicStyleForVisual(visualStyleId: string): MusicStyleConfig {
  return MUSIC_STYLES[visualStyleId] || MUSIC_STYLES.lifestyle;
}

/**
 * Build music generation prompt from style config
 */
export function buildMusicPrompt(styleId: string, durationSeconds: number): string {
  const config = getMusicStyleForVisual(styleId);
  
  return [
    config.genre,
    config.mood,
    `${config.tempo} tempo`,
    `${config.energy} energy`,
    `${durationSeconds} seconds`,
    'instrumental only',
    'no vocals',
    'broadcast quality',
    ...config.promptKeywords.slice(0, 3), // Top 3 keywords
  ].join(', ');
}
```

---

## Step 2: Update Music Mood Options

Replace the current mood buttons with style-aware options. The moods should be **modifiers** that adjust the base style, not replacements.

Update in `client/src/components/music-style-selector.tsx` (or wherever the music UI lives):

```tsx
// New mood modifiers that work WITH the visual style
const MOOD_MODIFIERS = [
  { id: 'default', label: 'Auto', description: 'Match visual style' },
  { id: 'uplifting', label: 'Uplifting', description: 'More hopeful, positive' },
  { id: 'calm', label: 'Calm', description: 'More relaxed, peaceful' },
  { id: 'intense', label: 'Intense', description: 'More dramatic, powerful' },
  { id: 'playful', label: 'Playful', description: 'More fun, lighthearted' },
];

interface MusicSelectorProps {
  visualStyle: string;
  selectedMood: string;
  onMoodChange: (mood: string) => void;
  selectedProvider: string;
  onProviderChange: (provider: string) => void;
}

export function MusicStyleSelector({
  visualStyle,
  selectedMood,
  onMoodChange,
  selectedProvider,
  onProviderChange,
}: MusicSelectorProps) {
  const musicStyle = getMusicStyleForVisual(visualStyle);
  const styleName = VISUAL_STYLES[visualStyle]?.name || 'Lifestyle';
  
  return (
    <div className="space-y-4">
      {/* Auto-match indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="text-lg">🎵</span>
        <span>
          Auto-matched to <strong>"{styleName}"</strong> style:{' '}
          <span className="text-primary-600">{musicStyle.genre}</span>
        </span>
      </div>
      
      {/* Mood modifier buttons */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mood Adjustment
        </label>
        <div className="flex flex-wrap gap-2">
          {MOOD_MODIFIERS.map((mood) => (
            <button
              key={mood.id}
              type="button"
              onClick={() => onMoodChange(mood.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedMood === mood.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title={mood.description}
            >
              {mood.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* Provider selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Music Generator
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {MUSIC_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              type="button"
              onClick={() => onProviderChange(provider.id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedProvider === provider.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-gray-900">{provider.name}</div>
              <div className="text-xs text-gray-500">{provider.description}</div>
              <div className="text-xs text-gray-400 mt-1">{provider.cost}</div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Preview */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-sm font-medium text-gray-700">Music Preview:</div>
        <div className="text-sm text-gray-600">
          {musicStyle.genre} • {musicStyle.tempo} tempo • {musicStyle.energy} energy
          {selectedMood !== 'default' && ` • ${selectedMood} mood`}
        </div>
        <div className="text-xs text-gray-400 mt-1">
          Generated by {selectedProvider === 'auto' ? musicStyle.preferredProvider : selectedProvider} via PiAPI
        </div>
      </div>
    </div>
  );
}

const MUSIC_PROVIDERS = [
  { id: 'auto', name: 'Auto', description: 'Best for style', cost: 'Varies' },
  { id: 'udio', name: 'Udio', description: 'Professional-grade, versatile', cost: '$0.05' },
  { id: 'suno', name: 'Suno V5', description: 'Adaptive, structured songs', cost: 'Variable' },
  { id: 'diffrhythm', name: 'DiffRhythm', description: 'Full songs with vocals, fast', cost: '$0.02' },
  { id: 'kling-sound', name: 'Kling Sound', description: 'Sound effects & ambient', cost: '$0.07' },
];
```

---

## Step 3: Update Music Generation Service

Update `server/services/music-service.ts` to use the new style mapping:

```typescript
import { getMusicStyleForVisual, buildMusicPrompt } from '@shared/visual-style-config';

interface MusicGenerationOptions {
  visualStyle: string;
  moodModifier?: string;
  durationSeconds: number;
  provider?: string;
}

export async function generateBackgroundMusic(options: MusicGenerationOptions): Promise<MusicResult> {
  const {
    visualStyle,
    moodModifier = 'default',
    durationSeconds,
    provider,
  } = options;
  
  // Get base music style from visual style
  const musicStyle = getMusicStyleForVisual(visualStyle);
  
  // Build prompt
  let prompt = buildMusicPrompt(visualStyle, durationSeconds);
  
  // Apply mood modifier if not default
  if (moodModifier !== 'default') {
    prompt = applyMoodModifier(prompt, moodModifier);
  }
  
  // Select provider
  const selectedProvider = provider === 'auto' ? musicStyle.preferredProvider : provider;
  
  console.log(`[Music] Generating for style "${visualStyle}" with provider "${selectedProvider}"`);
  console.log(`[Music] Prompt: ${prompt}`);
  
  // Generate with selected provider
  return await generateWithProvider(selectedProvider, prompt, durationSeconds);
}

function applyMoodModifier(basePrompt: string, modifier: string): string {
  const modifierKeywords: Record<string, string[]> = {
    uplifting: ['hopeful', 'positive', 'bright', 'optimistic'],
    calm: ['peaceful', 'relaxed', 'gentle', 'soothing'],
    intense: ['dramatic', 'powerful', 'bold', 'impactful'],
    playful: ['fun', 'lighthearted', 'bouncy', 'cheerful'],
  };
  
  const keywords = modifierKeywords[modifier] || [];
  if (keywords.length > 0) {
    return `${basePrompt}, ${keywords.join(', ')}`;
  }
  
  return basePrompt;
}
```

---

## Step 4: Update Generation Preview

In `client/src/components/generation-preview-panel.tsx`, update to show music style:

```tsx
{/* Music Preview Section */}
<div className="border-t pt-4">
  <h4 className="font-medium text-gray-900 mb-2">Background Music</h4>
  <div className="bg-gray-50 rounded-lg p-3">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium">{musicStyle.genre}</div>
        <div className="text-xs text-gray-500">
          {musicStyle.tempo} tempo • {musicStyle.energy} energy
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">{musicProvider}</div>
        <div className="text-xs text-gray-500">{musicCost}</div>
      </div>
    </div>
  </div>
</div>
```

---

## Verification Checklist

- [ ] Music style auto-matches to selected visual style
- [ ] "Professional" reference removed from UI
- [ ] Style name displays correctly (e.g., "Hero (Cinematic)")
- [ ] Genre/tempo/energy update when visual style changes
- [ ] Mood modifiers work as adjustments, not replacements
- [ ] Provider selection works with "Auto" option
- [ ] Music preview shows correct combined settings
- [ ] Generation uses correct provider based on style

---

## Style → Music Quick Reference

| Visual Style | Genre | Vibe | Best Provider |
|--------------|-------|------|---------------|
| Hero | Orchestral cinematic | Epic, sweeping | Udio |
| Lifestyle | Acoustic folk | Warm, authentic | Udio |
| Product | Minimal electronic | Clean, modern | Udio |
| Educational | Light ambient | Friendly, clear | Udio |
| Social | Upbeat electronic | Energetic, catchy | Suno |
| Premium | Elegant orchestral | Sophisticated | Udio |

---

## Testing

1. Select "Hero (Cinematic)" visual style → Music should show "orchestral cinematic"
2. Select "Social (Energetic)" visual style → Music should show "upbeat electronic pop"
3. Change mood to "Calm" → Preview should add calm keywords
4. Generate music → Verify prompt includes style keywords
5. Check provider selection defaults to style-recommended provider
