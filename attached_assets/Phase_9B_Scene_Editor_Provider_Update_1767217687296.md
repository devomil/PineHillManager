# Phase 9B: Scene Editor Provider Update

## Objective

Replace the outdated media source buttons (AI, Pexels, Unsplash) in the scene editor with the actual AI providers from our full-stack architecture (Runway, Kling, Luma, Hailuo for video; Flux.1, fal.ai for images). Show recommended providers based on scene content.

## Current State

```
Media Source Controls
┌─────────────────────────────────────────────────────────────┐
│ Custom prompt (optional)      [Image] [Video]               │
│                                                             │
│ IMAGE SOURCES      │ VIDEO SOURCES                          │
│ • AI               │ • AI                                   │
│ • Pexels           │ • Pexels                               │
│ • Unsplash         │ • Brand Media                          │
│ • Brand Media      │ • Asset Library                        │
│ • Asset Library    │                                        │
└─────────────────────────────────────────────────────────────┘
```

## Target State

```
Media Source Controls
┌─────────────────────────────────────────────────────────────┐
│ Custom prompt (optional)      [Image] [Video]               │
│                                                             │
│ IMAGE PROVIDERS              │ VIDEO PROVIDERS              │
│ ◉ Flux.1        ✨ Best for  │ ◉ Kling 1.6    ✨ Best for   │
│   Product shots, food        │   Human faces, lifestyle     │
│                              │                              │
│ ○ fal.ai                     │ ○ Runway Gen-3               │
│   Lifestyle, natural scenes  │   Cinematic, dramatic        │
│                              │                              │
│ ──────────────────           │ ○ Luma Dream Machine         │
│ ○ Brand Media                │   Product reveals, smooth    │
│ ○ Asset Library              │                              │
│                              │ ○ Hailuo MiniMax             │
│                              │   B-roll, nature scenes      │
│                              │                              │
│                              │ ──────────────────           │
│                              │ ○ Brand Media                │
│                              │ ○ Asset Library              │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### Create Provider Selector Component

Create `client/src/components/provider-selector.tsx`:

```tsx
import React from 'react';
import { Sparkles, Film, Image, Folder, Archive } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

// Provider definitions
const VIDEO_PROVIDERS = [
  {
    id: 'kling',
    name: 'Kling 1.6',
    description: 'Human faces, lifestyle scenes',
    bestFor: ['person', 'lifestyle', 'testimonial'],
    icon: '🎭',
    color: 'purple',
  },
  {
    id: 'runway',
    name: 'Runway Gen-3',
    description: 'Cinematic, dramatic shots',
    bestFor: ['cinematic', 'dramatic', 'hook'],
    icon: '🎬',
    color: 'blue',
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    description: 'Product reveals, smooth motion',
    bestFor: ['product', 'reveal', 'showcase'],
    icon: '✨',
    color: 'pink',
  },
  {
    id: 'hailuo',
    name: 'Hailuo MiniMax',
    description: 'B-roll, nature, backgrounds',
    bestFor: ['broll', 'nature', 'ambient', 'background'],
    icon: '🌿',
    color: 'teal',
  },
];

const IMAGE_PROVIDERS = [
  {
    id: 'flux',
    name: 'Flux.1',
    description: 'Product shots, food, objects',
    bestFor: ['product', 'food', 'object', 'still'],
    icon: '📸',
    color: 'orange',
  },
  {
    id: 'falai',
    name: 'fal.ai',
    description: 'Lifestyle, people, natural scenes',
    bestFor: ['lifestyle', 'person', 'nature', 'scene'],
    icon: '🎨',
    color: 'indigo',
  },
];

const OTHER_SOURCES = [
  {
    id: 'brand_media',
    name: 'Brand Media',
    description: 'Your uploaded brand assets',
    icon: <Folder className="h-4 w-4" />,
  },
  {
    id: 'asset_library',
    name: 'Asset Library',
    description: 'Previously generated assets',
    icon: <Archive className="h-4 w-4" />,
  },
];

interface ProviderSelectorProps {
  type: 'image' | 'video';
  selectedProvider: string;
  onSelectProvider: (provider: string) => void;
  recommendedProvider?: string;
  sceneContentType?: string;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  type,
  selectedProvider,
  onSelectProvider,
  recommendedProvider,
  sceneContentType,
}) => {
  const providers = type === 'video' ? VIDEO_PROVIDERS : IMAGE_PROVIDERS;
  
  // Determine recommended if not provided
  const recommended = recommendedProvider || determineRecommended(providers, sceneContentType);
  
  const colorClasses: Record<string, string> = {
    purple: 'border-purple-300 bg-purple-50',
    blue: 'border-blue-300 bg-blue-50',
    pink: 'border-pink-300 bg-pink-50',
    teal: 'border-teal-300 bg-teal-50',
    orange: 'border-orange-300 bg-orange-50',
    indigo: 'border-indigo-300 bg-indigo-50',
  };
  
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700">
        {type === 'video' ? 'VIDEO PROVIDERS' : 'IMAGE PROVIDERS'}
      </div>
      
      <RadioGroup value={selectedProvider} onValueChange={onSelectProvider}>
        {/* AI Providers */}
        {providers.map((provider) => {
          const isRecommended = provider.id === recommended;
          const isSelected = provider.id === selectedProvider;
          
          return (
            <div
              key={provider.id}
              className={`
                flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer
                transition-all duration-150
                ${isSelected ? colorClasses[provider.color] : 'border-gray-200 hover:border-gray-300'}
              `}
              onClick={() => onSelectProvider(provider.id)}
            >
              <RadioGroupItem value={provider.id} id={provider.id} className="mt-1" />
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{provider.icon}</span>
                  <Label htmlFor={provider.id} className="font-medium cursor-pointer">
                    {provider.name}
                  </Label>
                  {isRecommended && (
                    <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Best for this scene
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{provider.description}</p>
              </div>
            </div>
          );
        })}
        
        {/* Divider */}
        <div className="border-t my-2" />
        
        {/* Other Sources */}
        {OTHER_SOURCES.map((source) => (
          <div
            key={source.id}
            className={`
              flex items-start gap-3 p-3 rounded-lg border cursor-pointer
              ${selectedProvider === source.id ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:border-gray-300'}
            `}
            onClick={() => onSelectProvider(source.id)}
          >
            <RadioGroupItem value={source.id} id={source.id} className="mt-1" />
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {source.icon}
                <Label htmlFor={source.id} className="font-medium cursor-pointer">
                  {source.name}
                </Label>
              </div>
              <p className="text-xs text-gray-500 mt-1">{source.description}</p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

// Helper to determine recommended provider based on content type
function determineRecommended(providers: typeof VIDEO_PROVIDERS, contentType?: string): string {
  if (!contentType) return providers[0].id;
  
  for (const provider of providers) {
    if (provider.bestFor.some(type => contentType.toLowerCase().includes(type))) {
      return provider.id;
    }
  }
  
  return providers[0].id;
}

export { VIDEO_PROVIDERS, IMAGE_PROVIDERS };
```

---

### Update Scene Editor Modal

Modify `client/src/components/scene-editor-modal.tsx` to use the new provider selector:

```tsx
import React, { useState, useEffect } from 'react';
import { X, Image, Video } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProviderSelector } from './provider-selector';

interface SceneEditorModalProps {
  scene: {
    id: number;
    type: string;
    contentType: string;
    narration: string;
    visualDirection: string;
    imageUrl?: string;
    videoUrl?: string;
    provider?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: any) => void;
}

export const SceneEditorModal: React.FC<SceneEditorModalProps> = ({
  scene,
  isOpen,
  onClose,
  onSave,
}) => {
  const [mediaType, setMediaType] = useState<'image' | 'video'>('video');
  const [selectedProvider, setSelectedProvider] = useState(scene.provider || 'kling');
  const [customPrompt, setCustomPrompt] = useState('');
  const [narration, setNarration] = useState(scene.narration);
  const [visualDirection, setVisualDirection] = useState(scene.visualDirection);
  
  // Determine recommended provider based on scene content
  const getRecommendedProvider = () => {
    const content = `${scene.type} ${scene.contentType}`.toLowerCase();
    
    if (mediaType === 'video') {
      if (content.includes('person') || content.includes('testimonial') || content.includes('lifestyle')) {
        return 'kling';
      }
      if (content.includes('product') || content.includes('reveal')) {
        return 'luma';
      }
      if (content.includes('broll') || content.includes('nature')) {
        return 'hailuo';
      }
      if (content.includes('cinematic') || content.includes('dramatic') || content.includes('hook')) {
        return 'runway';
      }
      return 'kling'; // Default for video
    } else {
      if (content.includes('product') || content.includes('food') || content.includes('object')) {
        return 'flux';
      }
      return 'falai'; // Default for images
    }
  };
  
  const handleSave = () => {
    onSave({
      provider: selectedProvider,
      customPrompt,
      narration,
      visualDirection,
      mediaType,
    });
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Scene Content</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Preview & Controls */}
          <div className="space-y-4">
            {/* Media Preview */}
            <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
              {scene.videoUrl ? (
                <video 
                  src={scene.videoUrl} 
                  controls 
                  className="w-full h-full object-cover"
                />
              ) : scene.imageUrl ? (
                <img 
                  src={scene.imageUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No media generated
                </div>
              )}
            </div>
            
            {/* Media Type Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Generate as:</span>
              <Tabs value={mediaType} onValueChange={(v) => setMediaType(v as 'image' | 'video')}>
                <TabsList>
                  <TabsTrigger value="image" className="flex items-center gap-1">
                    <Image className="h-4 w-4" />
                    Image
                  </TabsTrigger>
                  <TabsTrigger value="video" className="flex items-center gap-1">
                    <Video className="h-4 w-4" />
                    Video
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Custom Prompt */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Custom Prompt (optional)
              </label>
              <Textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Override the visual direction with a custom prompt..."
                className="mt-1"
                rows={2}
              />
            </div>
            
            {/* Provider Selector - NEW */}
            <ProviderSelector
              type={mediaType}
              selectedProvider={selectedProvider}
              onSelectProvider={setSelectedProvider}
              recommendedProvider={getRecommendedProvider()}
              sceneContentType={scene.contentType}
            />
          </div>
          
          {/* Right Column - Narration & Visual Direction */}
          <div className="space-y-4">
            {/* Narration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Narration</label>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                {narration}
              </div>
            </div>
            
            {/* Visual Direction */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Visual Direction</label>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm">Ask Sizzle</Button>
                  <Button variant="ghost" size="sm">Edit</Button>
                </div>
              </div>
              <Textarea
                value={visualDirection}
                onChange={(e) => setVisualDirection(e.target.value)}
                className="text-sm"
                rows={4}
              />
            </div>
            
            {/* Provider Info */}
            <div className="p-3 bg-blue-50 rounded-lg">
              <div className="text-sm font-medium text-blue-800">
                Provider: {selectedProvider === 'kling' ? 'Kling 1.6' :
                          selectedProvider === 'runway' ? 'Runway Gen-3' :
                          selectedProvider === 'luma' ? 'Luma Dream Machine' :
                          selectedProvider === 'hailuo' ? 'Hailuo MiniMax' :
                          selectedProvider === 'flux' ? 'Flux.1' :
                          selectedProvider === 'falai' ? 'fal.ai' :
                          selectedProvider}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {selectedProvider === getRecommendedProvider() 
                  ? '✨ This is the recommended provider for this scene type'
                  : 'You can override the recommended provider if needed'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Footer Actions */}
        <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save & Regenerate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

## Provider Selection Logic

When a user selects a provider, ensure it's passed to the backend:

```typescript
// In the save handler or regenerate API call:
const handleRegenerateWithProvider = async (sceneId: number, provider: string, customPrompt?: string) => {
  await fetch(`/api/scenes/${sceneId}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      customPrompt,
    }),
  });
};
```

---

## Verification Checklist

- [ ] Old media sources removed (AI, Pexels, Unsplash)
- [ ] Video providers shown: Kling 1.6, Runway, Luma, Hailuo
- [ ] Image providers shown: Flux.1, fal.ai
- [ ] Brand Media and Asset Library still available
- [ ] Recommended provider highlighted with badge
- [ ] Provider descriptions visible
- [ ] Selection updates selected provider state
- [ ] Custom prompt field works
- [ ] Provider passed to regeneration API
- [ ] Scene editor modal properly styled

---

## Next Phase

Once Scene Editor is updated, proceed to **Phase 9C: Progress Tracker QA Step** to add the QA step to the pipeline visualization.
