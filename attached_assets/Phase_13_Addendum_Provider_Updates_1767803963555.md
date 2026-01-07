# Phase 13 Addendum: Provider Registry Updates

## Purpose

This addendum updates the Phase 13 Provider Intelligence system with newly identified providers that were missing from the initial implementation. These providers add critical capabilities including **native audio generation**, **motion control/transfer**, and **improved model versions**.

---

## New Providers to Add

### Priority 1: Kling 2.6 Family (Critical - Native Audio)

The Kling 2.6 family introduces **native audio generation** - a major breakthrough that eliminates the need for separate audio sync.

```typescript
// Add to server/config/video-providers.ts

'kling-2.6': {
  id: 'kling-2.6',
  name: 'Kling 2.6',
  version: '2.6',
  capabilities: {
    imageToVideo: true,
    textToVideo: true,
    imageToImage: false,
    maxResolution: '1080p',
    maxFps: 30,
    maxDuration: 10,
    strengths: [
      'human-faces', 
      'human-motion', 
      'cinematic', 
      'product-shots', 
      'camera-movement',
      'nature-scenes',
    ],
    weaknesses: ['text-in-video'],
    motionQuality: 'cinematic',
    temporalConsistency: 'high',
    nativeAudio: true,  // ⭐ KEY DIFFERENTIATOR
    lipSync: true,
    effectsPresets: [],
  },
  costPer10Seconds: 0.39, // $0.195/5s standard
  apiProvider: 'piapi',
  modelId: 'kling-v2.6',
},

'kling-2.6-pro': {
  id: 'kling-2.6-pro',
  name: 'Kling 2.6 Pro',
  version: '2.6-pro',
  capabilities: {
    imageToVideo: true,
    textToVideo: true,
    imageToImage: false,
    maxResolution: '1080p',
    maxFps: 30,
    maxDuration: 10,
    strengths: [
      'human-faces', 
      'human-motion', 
      'cinematic', 
      'product-shots', 
      'camera-movement',
      'nature-scenes',
    ],
    weaknesses: ['text-in-video'],
    motionQuality: 'cinematic',
    temporalConsistency: 'high',
    nativeAudio: true,
    lipSync: true,
    effectsPresets: [],
  },
  costPer10Seconds: 0.66, // $0.33/5s pro mode
  apiProvider: 'piapi',
  modelId: 'kling-v2.6-pro',
},
```

#### Kling 2.6 Audio Capabilities

```typescript
// Add new type for audio capabilities
export interface AudioCapabilities {
  voiceGeneration: boolean;     // Natural voice in Chinese/English
  soundEffects: boolean;        // Action sound effects
  ambientSound: boolean;        // Environmental ambience
  audioVisualSync: boolean;     // Frame-level audio-visual alignment
  supportedLanguages?: string[];
}

// Add to Kling 2.6 provider config
audioCapabilities: {
  voiceGeneration: true,
  soundEffects: true,
  ambientSound: true,
  audioVisualSync: true,
  supportedLanguages: ['en', 'zh'],
},
```

---

### Priority 2: Kling 2.6 Motion Control (Motion Transfer)

Motion Control enables transferring motion from a reference video to any character image. This is transformative for:
- Virtual influencers with consistent brand identity
- Product demonstrations with precise hand movements
- Content localization (same motion, different characters)

```typescript
'kling-2.6-motion-control': {
  id: 'kling-2.6-motion-control',
  name: 'Kling 2.6 Motion Control',
  version: '2.6-mc',
  capabilities: {
    imageToVideo: true,
    textToVideo: false,      // Requires reference video
    imageToImage: false,
    videoToVideo: true,      // ⭐ NEW CAPABILITY TYPE
    maxResolution: '1080p',
    maxFps: 30,
    maxDuration: 30,         // Up to 30 seconds!
    strengths: [
      'human-motion',
      'human-faces',
      'hand-actions',        // Improved hand rendering
      'cinematic',
      'camera-movement',
    ],
    weaknesses: ['product-shots', 'nature-scenes'],
    motionQuality: 'cinematic',
    temporalConsistency: 'high',
    nativeAudio: true,
    lipSync: true,
    effectsPresets: [],
  },
  costPer10Seconds: 0.66,
  apiProvider: 'piapi',
  modelId: 'kling-v2.6-motion-control',
},

'kling-2.6-motion-control-pro': {
  id: 'kling-2.6-motion-control-pro',
  name: 'Kling 2.6 Motion Control Pro',
  version: '2.6-mc-pro',
  capabilities: {
    imageToVideo: true,
    textToVideo: false,
    imageToImage: false,
    videoToVideo: true,
    maxResolution: '1080p',
    maxFps: 30,
    maxDuration: 30,
    strengths: [
      'human-motion',
      'human-faces',
      'hand-actions',
      'cinematic',
      'camera-movement',
    ],
    weaknesses: ['product-shots'],
    motionQuality: 'cinematic',
    temporalConsistency: 'high',
    nativeAudio: true,
    lipSync: true,
    effectsPresets: [],
  },
  costPer10Seconds: 0.80,
  apiProvider: 'piapi',
  modelId: 'kling-v2.6-motion-control-pro',
},
```

#### Motion Control Capabilities Type

```typescript
// Add new type for motion control
export interface MotionControlCapabilities {
  motionTransfer: boolean;
  referenceVideoDuration: { min: number; max: number }; // seconds
  maxAnimatedElements: number;
  audioPreservation: boolean;
  orientationModes: ('video' | 'image')[];
  supportedActions: string[];
}

// Add to Motion Control provider configs
motionControlCapabilities: {
  motionTransfer: true,
  referenceVideoDuration: { min: 3, max: 30 },
  maxAnimatedElements: 6,
  audioPreservation: true,
  orientationModes: ['video', 'image'],
  supportedActions: [
    'dance',
    'martial-arts',
    'gestures',
    'facial-expressions',
    'full-body-motion',
    'hand-movements',
    'flips',
    'punches',
    'coordinated-dance-steps',
  ],
},
```

---

### Priority 3: Missing Kling Versions

```typescript
'kling-2.0': {
  id: 'kling-2.0',
  name: 'Kling 2.0',
  version: '2.0',
  capabilities: {
    imageToVideo: true,
    textToVideo: true,
    imageToImage: false,
    maxResolution: '1080p',
    maxFps: 30,
    maxDuration: 10,
    strengths: ['human-faces', 'human-motion', 'cinematic', 'camera-movement'],
    weaknesses: ['specific-actions', 'text-in-video'],
    motionQuality: 'excellent',
    temporalConsistency: 'high',
    nativeAudio: false,
    lipSync: false,
    effectsPresets: [],
  },
  costPer10Seconds: 0.52,
  apiProvider: 'piapi',
  modelId: 'kling-v2',
},

'kling-2.1': {
  id: 'kling-2.1',
  name: 'Kling 2.1',
  version: '2.1',
  capabilities: {
    imageToVideo: true,
    textToVideo: true,
    imageToImage: false,
    maxResolution: '1080p',
    maxFps: 30,
    maxDuration: 10,
    strengths: ['human-faces', 'human-motion', 'cinematic', 'product-shots'],
    weaknesses: ['specific-actions', 'text-in-video'],
    motionQuality: 'excellent',
    temporalConsistency: 'high',
    nativeAudio: false,
    lipSync: false,
    effectsPresets: [],
  },
  costPer10Seconds: 0.52,
  apiProvider: 'piapi',
  modelId: 'kling-v2.1',
},

'kling-2.1-master': {
  id: 'kling-2.1-master',
  name: 'Kling 2.1 Master',
  version: '2.1-master',
  capabilities: {
    imageToVideo: true,
    textToVideo: true,
    imageToImage: false,
    maxResolution: '1080p',
    maxFps: 30,
    maxDuration: 10,
    strengths: ['human-faces', 'human-motion', 'cinematic', 'product-shots'],
    weaknesses: ['text-in-video'],
    motionQuality: 'excellent',
    temporalConsistency: 'high',
    nativeAudio: false,
    lipSync: false,
    effectsPresets: [],
  },
  costPer10Seconds: 1.92, // $0.96/5s - Pro tier only
  apiProvider: 'piapi',
  modelId: 'kling-v2.1-master',
},

'kling-2.5': {
  id: 'kling-2.5',
  name: 'Kling 2.5',
  version: '2.5',
  capabilities: {
    imageToVideo: true,
    textToVideo: true,
    imageToImage: false,
    maxResolution: '1080p',
    maxFps: 30,
    maxDuration: 10,
    strengths: ['human-faces', 'human-motion', 'cinematic', 'product-shots', 'camera-movement'],
    weaknesses: ['text-in-video'],
    motionQuality: 'excellent',
    temporalConsistency: 'high', // Improved via reinforcement learning
    nativeAudio: false,
    lipSync: false,
    effectsPresets: [],
  },
  costPer10Seconds: 0.39, // $0.195/5s
  apiProvider: 'piapi',
  modelId: 'kling-v2.5',
},
```

---

## Updated Provider Type Definition

```typescript
// shared/types/video-providers.ts - Updated interface

export interface VideoProvider {
  id: string;
  name: string;
  version: string;
  
  capabilities: {
    // Generation modes
    imageToVideo: boolean;
    textToVideo: boolean;
    imageToImage: boolean;
    videoToVideo?: boolean;  // NEW: For motion control
    
    // Quality specs
    maxResolution: '720p' | '1080p' | '4k';
    maxFps: 24 | 30 | 48 | 60;
    maxDuration: number;
    
    // Strengths/weaknesses
    strengths: ProviderStrength[];
    weaknesses: ProviderWeakness[];
    
    // Motion quality
    motionQuality: 'basic' | 'good' | 'excellent' | 'cinematic';
    temporalConsistency: 'low' | 'medium' | 'high';
    
    // Audio capabilities (NEW)
    nativeAudio: boolean;
    lipSync: boolean;
    audioCapabilities?: AudioCapabilities;
    
    // Effects
    effectsPresets: string[];
    
    // Motion control (NEW)
    motionControlCapabilities?: MotionControlCapabilities;
  };
  
  costPer10Seconds: number;
  apiProvider: 'piapi' | 'runway' | 'direct';
  modelId: string;
  notes?: string;
}

// New capability types
export interface AudioCapabilities {
  voiceGeneration: boolean;
  soundEffects: boolean;
  ambientSound: boolean;
  audioVisualSync: boolean;
  supportedLanguages?: string[];
}

export interface MotionControlCapabilities {
  motionTransfer: boolean;
  referenceVideoDuration: { min: number; max: number };
  maxAnimatedElements: number;
  audioPreservation: boolean;
  orientationModes: ('video' | 'image')[];
  supportedActions: string[];
}

// Updated strength types
export type ProviderStrength = 
  | 'human-faces'
  | 'human-motion'
  | 'hand-actions'      // NEW
  | 'food-content'
  | 'product-shots'
  | 'nature-scenes'
  | 'cinematic'
  | 'stylized'
  | 'animated'
  | 'b-roll'
  | 'talking-heads'
  | 'text-rendering'
  | 'fast-motion'
  | 'slow-motion'
  | 'camera-movement'
  | 'motion-transfer';  // NEW
```

---

## Updated Provider Selection Logic

### Route to Kling 2.6 for Audio-Required Scenes

```typescript
// Update smart-provider-router.ts

function selectProvider(
  visualDirection: string,
  sceneRequirements: SceneRequirements
): string {
  
  // If scene requires audio, use Kling 2.6
  if (sceneRequirements.needsAudio || sceneRequirements.needsVoice) {
    if (sceneRequirements.qualityTier === 'premium') {
      return 'kling-2.6-pro';
    }
    return 'kling-2.6';
  }
  
  // If scene requires motion transfer from reference
  if (sceneRequirements.hasMotionReference) {
    if (sceneRequirements.qualityTier === 'premium') {
      return 'kling-2.6-motion-control-pro';
    }
    return 'kling-2.6-motion-control';
  }
  
  // ... existing routing logic
}
```

### Detect Audio Requirements

```typescript
// Add to scene analysis

function detectAudioRequirements(
  visualDirection: string,
  narration: string
): { needsAudio: boolean; needsVoice: boolean; audioType: string[] } {
  
  const lower = visualDirection.toLowerCase();
  const audioTypes: string[] = [];
  
  // Detect voice requirements
  const needsVoice = 
    lower.includes('speaking') ||
    lower.includes('talking') ||
    lower.includes('says') ||
    lower.includes('dialogue') ||
    lower.includes('conversation');
  
  if (needsVoice) audioTypes.push('voice');
  
  // Detect sound effect requirements
  const soundKeywords = [
    'splash', 'pour', 'sizzle', 'crunch', 'click',
    'footsteps', 'door', 'applause', 'music',
  ];
  
  for (const keyword of soundKeywords) {
    if (lower.includes(keyword)) {
      audioTypes.push('sound-effect');
      break;
    }
  }
  
  // Detect ambient requirements
  const ambientKeywords = [
    'outdoor', 'forest', 'ocean', 'city', 'cafe',
    'restaurant', 'office', 'nature',
  ];
  
  for (const keyword of ambientKeywords) {
    if (lower.includes(keyword)) {
      audioTypes.push('ambient');
      break;
    }
  }
  
  return {
    needsAudio: audioTypes.length > 0,
    needsVoice,
    audioType: audioTypes,
  };
}
```

---

## Complete Kling Provider Summary Table

| Provider ID | Name | Audio | Motion Control | Cost/10s | Best For |
|-------------|------|-------|----------------|----------|----------|
| `kling-1.5` | Kling 1.5 | ❌ | ❌ | $0.52 | Basic video |
| `kling-1.6` | Kling 1.6 | ❌ | ❌ | $0.52 | General video |
| `kling-2.0` | Kling 2.0 | ❌ | ❌ | $0.52 | Cinematic |
| `kling-2.1` | Kling 2.1 | ❌ | ❌ | $0.52 | Human faces |
| `kling-2.1-master` | Kling 2.1 Master | ❌ | ❌ | $1.92 | Premium quality |
| `kling-2.5` | Kling 2.5 | ❌ | ❌ | $0.39 | Temporal consistency |
| `kling-2.6` | **Kling 2.6** | ✅ | ❌ | $0.39 | **Audio-visual sync** |
| `kling-2.6-pro` | Kling 2.6 Pro | ✅ | ❌ | $0.66 | Premium audio |
| `kling-2.6-motion-control` | **Kling 2.6 MC** | ✅ | ✅ | $0.66 | **Motion transfer** |
| `kling-2.6-motion-control-pro` | Kling 2.6 MC Pro | ✅ | ✅ | $0.80 | Complex motion |
| `kling-effects` | Kling Effects | ❌ | ❌ | $0.50 | Preset effects |
| `kling-avatar` | Kling Avatar | ✅ | ❌ | $1.00 | Talking heads |

---

## UI Updates Required

### 1. Add Audio Toggle in Scene Editor

```tsx
// When Kling 2.6 is available, show audio options
{selectedProvider?.startsWith('kling-2.6') && (
  <div className="space-y-2">
    <Label>Audio Generation</Label>
    <div className="flex gap-2">
      <Toggle 
        pressed={enableAudio} 
        onPressedChange={setEnableAudio}
      >
        <Volume2 className="w-4 h-4 mr-1" />
        Enable Audio
      </Toggle>
      {enableAudio && (
        <Select value={audioType} onValueChange={setAudioType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Audio type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto-detect</SelectItem>
            <SelectItem value="voice">Voice/Dialogue</SelectItem>
            <SelectItem value="sfx">Sound Effects</SelectItem>
            <SelectItem value="ambient">Ambient Only</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  </div>
)}
```

### 2. Add Motion Control Reference Upload

```tsx
// When Motion Control provider is selected
{selectedProvider?.includes('motion-control') && (
  <div className="space-y-2">
    <Label>Motion Reference Video</Label>
    <div className="border-2 border-dashed rounded-lg p-4">
      <input
        type="file"
        accept="video/*"
        onChange={handleMotionReferenceUpload}
        className="hidden"
        id="motion-ref"
      />
      <label htmlFor="motion-ref" className="cursor-pointer">
        {motionReference ? (
          <video src={motionReference} className="w-full h-32 object-cover rounded" />
        ) : (
          <div className="flex flex-col items-center text-gray-500">
            <Video className="w-8 h-8 mb-2" />
            <span>Upload reference video (3-30s)</span>
          </div>
        )}
      </label>
    </div>
    <p className="text-xs text-gray-500">
      The character will perform the motion from this reference video
    </p>
  </div>
)}
```

### 3. Update Provider Selection UI

```tsx
// Show audio/motion badges on provider cards
<div className="provider-card">
  <span className="font-medium">{provider.name}</span>
  <div className="flex gap-1 mt-1">
    {provider.capabilities.nativeAudio && (
      <Badge variant="secondary" className="text-xs">
        <Volume2 className="w-3 h-3 mr-1" />
        Audio
      </Badge>
    )}
    {provider.capabilities.motionControlCapabilities && (
      <Badge variant="secondary" className="text-xs">
        <Move className="w-3 h-3 mr-1" />
        Motion Control
      </Badge>
    )}
  </div>
</div>
```

---

## Implementation Checklist

### Provider Registry Updates
- [ ] Add `kling-2.0` provider
- [ ] Add `kling-2.1` provider
- [ ] Add `kling-2.1-master` provider
- [ ] Add `kling-2.5` provider
- [ ] Add `kling-2.6` provider with audio capabilities
- [ ] Add `kling-2.6-pro` provider
- [ ] Add `kling-2.6-motion-control` provider
- [ ] Add `kling-2.6-motion-control-pro` provider
- [ ] Update TypeScript types for new capabilities
- [ ] Add `videoToVideo` capability flag
- [ ] Add `AudioCapabilities` interface
- [ ] Add `MotionControlCapabilities` interface

### Smart Routing Updates
- [ ] Add audio requirement detection
- [ ] Route to Kling 2.6 when audio needed
- [ ] Route to Motion Control when reference video provided
- [ ] Update provider scoring for new capabilities

### UI Updates
- [ ] Add audio toggle for Kling 2.6
- [ ] Add motion reference upload for Motion Control
- [ ] Show audio/motion badges on provider cards
- [ ] Filter providers by capability

### API Updates
- [ ] Support audio generation parameters in Kling 2.6 calls
- [ ] Support motion reference video upload
- [ ] Handle Motion Control API parameters

---

## PiAPI Model IDs Reference

For the Replit agent to implement API calls correctly:

| Provider | PiAPI Model ID | API Endpoint |
|----------|----------------|--------------|
| Kling 1.5 | `kling-v1.5` | `/kling/v1/videos` |
| Kling 1.6 | `kling-v1.6` | `/kling/v1/videos` |
| Kling 2.0 | `kling-v2` | `/kling/v1/videos` |
| Kling 2.1 | `kling-v2.1` | `/kling/v1/videos` |
| Kling 2.1 Master | `kling-v2.1-master` | `/kling/v1/videos` |
| Kling 2.5 | `kling-v2.5` | `/kling/v1/videos` |
| Kling 2.6 | `kling-v2.6` | `/kling/v1/videos` |
| Kling 2.6 Pro | `kling-v2.6-pro` | `/kling/v1/videos` |
| Kling 2.6 Motion Control | `kling-v2.6-motion-control` | `/kling/v1/motion-control` |
| Kling Effects | `kling-effects` | `/kling/v1/effects` |
| Kling Avatar | `kling-avatar` | `/kling/v1/avatar` |

---

## Notes for Implementation

1. **Kling 2.6 is the new default recommendation** for most video generation due to native audio
2. **Motion Control requires both image AND reference video** - update UI flow accordingly
3. **Audio generation adds minimal cost** but significant value - enable by default where appropriate
4. **Motion Control videos can be up to 30 seconds** - much longer than standard 10s limit
5. **Hand movements are significantly improved** in Kling 2.6 MC - consider for product demos
