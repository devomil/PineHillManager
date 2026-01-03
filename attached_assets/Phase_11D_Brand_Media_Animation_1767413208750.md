# Phase 11D: Brand Media Animation

## Objective

When a user selects "Brand Media" or "Asset Library" as the source for a scene, the system needs to:
1. Display uploaded brand assets for selection
2. Apply animation to static images (Ken Burns, zoom, pan)
3. Handle video assets (trim, loop)
4. Integrate with the overlay system

## What is Brand Media?

**Brand Media** = User-uploaded assets specific to their brand:
- Logos (PNG, SVG)
- Product photos
- Location photos
- Team photos
- Existing marketing materials
- B-roll footage

**Asset Library** = Previously generated assets:
- AI-generated images from past projects
- Rendered video clips
- Favorited/saved assets

## Static Image Animation Options

Since video players expect motion, static images need animation. Options:

### 1. Ken Burns Effect
Classic documentary-style movement: slow zoom + pan
```
Start: Slightly zoomed out, centered
End: Zoomed in 10%, shifted to point of interest
Duration: Entire scene (typically 5-10 seconds)
```

### 2. Zoom In/Out
Simple slow zoom without pan
```
Zoom In: 100% → 110% over scene duration
Zoom Out: 110% → 100% over scene duration
```

### 3. Pan (Left/Right/Up/Down)
Slow lateral movement across image
```
Pan Left: Image moves right-to-left, revealing more of right side
Pan Right: Image moves left-to-right, revealing more of left side
```

### 4. Parallax
Multi-layer effect where foreground moves faster than background
(Requires image segmentation or layered assets)

### 5. Static
No animation - just display the image
(Useful for short scenes or specific artistic choices)

## Implementation

### Create Brand Media Selector Component

```tsx
// client/src/components/brand-media-selector.tsx

import React, { useState, useEffect } from 'react';
import { Upload, Folder, Star, Search, Filter, Play, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BrandAsset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  category: 'logo' | 'product' | 'location' | 'team' | 'broll' | 'other';
  thumbnail: string;
  duration?: number; // For videos
  uploadedAt: Date;
  isFavorite: boolean;
}

interface BrandMediaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: BrandAsset, animationSettings: AnimationSettings) => void;
  organizationId: number;
}

interface AnimationSettings {
  type: 'ken-burns' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'static';
  intensity: 'subtle' | 'medium' | 'dramatic';
  focusPoint?: { x: number; y: number }; // For Ken Burns
}

export const BrandMediaSelector: React.FC<BrandMediaSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  organizationId,
}) => {
  const [assets, setAssets] = useState<BrandAsset[]>([]);
  const [filter, setFilter] = useState<'all' | 'images' | 'videos'>('all');
  const [category, setCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<BrandAsset | null>(null);
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>({
    type: 'ken-burns',
    intensity: 'subtle',
  });
  
  useEffect(() => {
    fetchBrandAssets();
  }, [organizationId]);
  
  const fetchBrandAssets = async () => {
    const response = await fetch(`/api/organizations/${organizationId}/brand-assets`);
    const data = await response.json();
    setAssets(data);
  };
  
  const filteredAssets = assets.filter(asset => {
    if (filter === 'images' && asset.type !== 'image') return false;
    if (filter === 'videos' && asset.type !== 'video') return false;
    if (category !== 'all' && asset.category !== category) return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  
  const handleSelect = () => {
    if (selectedAsset) {
      onSelect(selectedAsset, animationSettings);
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Brand Media</DialogTitle>
        </DialogHeader>
        
        {/* Filters */}
        <div className="flex gap-3 py-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="images">Images Only</SelectItem>
              <SelectItem value="videos">Videos Only</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="logo">Logos</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="location">Locations</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="broll">B-Roll</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon">
            <Upload className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Asset Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-4 gap-4">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  className={`
                    relative aspect-video rounded-lg overflow-hidden cursor-pointer
                    border-2 transition-all
                    ${selectedAsset?.id === asset.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}
                  `}
                  onClick={() => setSelectedAsset(asset)}
                >
                  <img
                    src={asset.thumbnail}
                    alt={asset.name}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Type indicator */}
                  <div className="absolute top-2 left-2">
                    {asset.type === 'video' ? (
                      <div className="bg-black/60 rounded px-1.5 py-0.5 flex items-center gap-1">
                        <Play className="h-3 w-3 text-white" fill="white" />
                        <span className="text-xs text-white">{formatDuration(asset.duration)}</span>
                      </div>
                    ) : (
                      <div className="bg-black/60 rounded p-1">
                        <Image className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  {/* Favorite star */}
                  {asset.isFavorite && (
                    <div className="absolute top-2 right-2">
                      <Star className="h-4 w-4 text-yellow-400" fill="currentColor" />
                    </div>
                  )}
                  
                  {/* Name */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <span className="text-xs text-white truncate block">{asset.name}</span>
                  </div>
                </div>
              ))}
            </div>
            
            {filteredAssets.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                No assets found. Upload brand media to get started.
              </div>
            )}
          </div>
          
          {/* Animation Settings Panel */}
          {selectedAsset && selectedAsset.type === 'image' && (
            <div className="w-64 border-l p-4 space-y-4">
              <h4 className="font-medium">Animation Settings</h4>
              
              <div>
                <label className="text-sm text-gray-600 block mb-1">Animation Type</label>
                <Select
                  value={animationSettings.type}
                  onValueChange={(v) => setAnimationSettings({ ...animationSettings, type: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ken-burns">Ken Burns (Zoom + Pan)</SelectItem>
                    <SelectItem value="zoom-in">Slow Zoom In</SelectItem>
                    <SelectItem value="zoom-out">Slow Zoom Out</SelectItem>
                    <SelectItem value="pan-left">Pan Left</SelectItem>
                    <SelectItem value="pan-right">Pan Right</SelectItem>
                    <SelectItem value="static">Static (No Animation)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm text-gray-600 block mb-1">Intensity</label>
                <Select
                  value={animationSettings.intensity}
                  onValueChange={(v) => setAnimationSettings({ ...animationSettings, intensity: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subtle">Subtle</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="dramatic">Dramatic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Preview */}
              <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                <img
                  src={selectedAsset.thumbnail}
                  alt="Preview"
                  className={`w-full h-full object-cover ${getAnimationPreviewClass(animationSettings)}`}
                />
              </div>
              
              <p className="text-xs text-gray-500">
                {getAnimationDescription(animationSettings)}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {selectedAsset ? `Selected: ${selectedAsset.name}` : 'No asset selected'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSelect} disabled={!selectedAsset}>
              Use This Asset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getAnimationPreviewClass(settings: AnimationSettings): string {
  // CSS animation classes for preview
  const intensity = settings.intensity === 'subtle' ? 'slow' : settings.intensity === 'dramatic' ? 'fast' : 'normal';
  return `animate-${settings.type}-${intensity}`;
}

function getAnimationDescription(settings: AnimationSettings): string {
  const descriptions: Record<string, string> = {
    'ken-burns': 'Classic documentary-style slow zoom and pan movement',
    'zoom-in': 'Slowly zoom into the center of the image',
    'zoom-out': 'Start zoomed in and slowly pull back',
    'pan-left': 'Slowly move the view from right to left',
    'pan-right': 'Slowly move the view from left to right',
    'static': 'No movement - display image as-is',
  };
  return descriptions[settings.type] || '';
}
```

### Create Ken Burns Remotion Component

```tsx
// remotion/components/KenBurnsImage.tsx

import React from 'react';
import { Img, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

export interface KenBurnsProps {
  src: string;
  animation: 'ken-burns' | 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'static';
  intensity: 'subtle' | 'medium' | 'dramatic';
  focusPoint?: { x: number; y: number }; // 0-100 percentage
}

export const KenBurnsImage: React.FC<KenBurnsProps> = ({
  src,
  animation,
  intensity,
  focusPoint = { x: 50, y: 50 },
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  
  // Intensity multipliers
  const intensityMultiplier = {
    subtle: 0.5,
    medium: 1,
    dramatic: 1.5,
  }[intensity];
  
  // Calculate transform based on animation type
  let transform = '';
  let transformOrigin = 'center center';
  
  switch (animation) {
    case 'ken-burns': {
      // Zoom: 100% → 110%
      const scale = interpolate(
        frame,
        [0, durationInFrames],
        [1, 1 + 0.1 * intensityMultiplier]
      );
      // Pan: Slight movement toward focus point
      const translateX = interpolate(
        frame,
        [0, durationInFrames],
        [0, (focusPoint.x - 50) * 0.2 * intensityMultiplier]
      );
      const translateY = interpolate(
        frame,
        [0, durationInFrames],
        [0, (focusPoint.y - 50) * 0.2 * intensityMultiplier]
      );
      transform = `scale(${scale}) translate(${translateX}%, ${translateY}%)`;
      break;
    }
    
    case 'zoom-in': {
      const scale = interpolate(
        frame,
        [0, durationInFrames],
        [1, 1 + 0.15 * intensityMultiplier]
      );
      transform = `scale(${scale})`;
      transformOrigin = `${focusPoint.x}% ${focusPoint.y}%`;
      break;
    }
    
    case 'zoom-out': {
      const scale = interpolate(
        frame,
        [0, durationInFrames],
        [1 + 0.15 * intensityMultiplier, 1]
      );
      transform = `scale(${scale})`;
      transformOrigin = `${focusPoint.x}% ${focusPoint.y}%`;
      break;
    }
    
    case 'pan-left': {
      const translateX = interpolate(
        frame,
        [0, durationInFrames],
        [5 * intensityMultiplier, -5 * intensityMultiplier]
      );
      transform = `translateX(${translateX}%) scale(1.1)`;
      break;
    }
    
    case 'pan-right': {
      const translateX = interpolate(
        frame,
        [0, durationInFrames],
        [-5 * intensityMultiplier, 5 * intensityMultiplier]
      );
      transform = `translateX(${translateX}%) scale(1.1)`;
      break;
    }
    
    case 'static':
    default:
      transform = 'scale(1)';
      break;
  }
  
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform,
          transformOrigin,
        }}
      />
    </div>
  );
};
```

### Update Scene Composition to Use Brand Media

```typescript
// server/services/composition-service.ts

interface SceneCompositionData {
  mediaUrl: string;
  mediaType: 'image' | 'video';
  mediaSource: 'ai' | 'brand' | 'library';
  animationSettings?: AnimationSettings;
  // ... other fields
}

async function composeScene(scene: Scene): Promise<SceneCompositionData> {
  let compositionData: SceneCompositionData;
  
  if (scene.mediaSource === 'brand' || scene.mediaSource === 'library') {
    // Use brand/library asset with animation
    compositionData = {
      mediaUrl: scene.brandAssetUrl,
      mediaType: scene.brandAssetType,
      mediaSource: scene.mediaSource,
      animationSettings: scene.animationSettings || {
        type: 'ken-burns',
        intensity: 'subtle',
      },
    };
  } else {
    // AI-generated asset (no Ken Burns needed - videos have motion)
    compositionData = {
      mediaUrl: scene.videoUrl || scene.imageUrl,
      mediaType: scene.videoUrl ? 'video' : 'image',
      mediaSource: 'ai',
    };
  }
  
  return compositionData;
}
```

## Video Asset Handling

For video assets from Brand Media:

```typescript
// Handle video trimming/looping
interface VideoSettings {
  trimStart?: number; // Seconds to skip at start
  trimEnd?: number; // Seconds to cut from end
  loop: boolean; // Loop if shorter than scene duration
  playbackRate: number; // 0.5 = slow mo, 1.0 = normal, 2.0 = speed up
}
```

## Verification Checklist

- [ ] Brand Media selector modal opens from scene editor
- [ ] Can browse uploaded brand assets
- [ ] Can filter by type (image/video)
- [ ] Can filter by category
- [ ] Can search assets by name
- [ ] Can select an asset
- [ ] Animation settings appear for images
- [ ] Ken Burns preview shows in selector
- [ ] Selected asset with animation saves to scene
- [ ] KenBurnsImage component renders correctly
- [ ] Different animation types work (zoom, pan, static)
- [ ] Different intensities work (subtle, medium, dramatic)
- [ ] Video assets play correctly
- [ ] Scene composition uses brand media when selected

## Next Phase

Once Brand Media Animation is working, proceed to **Phase 11E: Asset Library Integration** to enable re-use of previously generated assets across projects.
