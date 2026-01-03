# Phase 11C: Overlay UI Controls

## Objective

Add UI controls in the scene editor for:
- Adding/editing/removing text overlays
- Configuring logo appearance and position
- Toggle and configure watermark
- Preview overlays in real-time

## Current State

Scene editor has:
- Media preview
- Narration editor
- Visual direction editor
- Provider selection (Flux.1, fal.ai, Kling, etc.)
- "Show Product Overlay" toggle

Missing:
- Text overlay editor
- Logo configuration
- Watermark settings
- Overlay preview

## Target State

Add "Overlays" tab/section in scene editor with:
```
┌─────────────────────────────────────────────────────────────┐
│ OVERLAYS                                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ TEXT OVERLAYS                              [+ Add Text]     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ "Autoimmune"              Position: Bottom-Left    [✎][🗑]│ │
│ │ "Mold/Mycotoxins"         Position: Bottom-Left    [✎][🗑]│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ LOGO                                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [🖼️ PHF Logo]  Position: [▼ Center]  Size: [▼ Medium]   │ │
│ │ ☑ Show tagline "Cultivating Wellness"                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ WATERMARK                                           [ON/OFF]│
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Position: [▼ Bottom-Right]  Opacity: [====●===] 70%     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ LOWER THIRD (Names/Titles)                  [+ Add Person]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ No lower thirds for this scene                          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Implementation

### Create Overlay Editor Component

```tsx
// client/src/components/overlay-editor.tsx

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TextOverlay {
  id: string;
  text: string;
  position: 'top' | 'center' | 'bottom' | 'custom';
  customX?: number;
  customY?: number;
  fontSize: number;
  animation: 'fade' | 'slide-up' | 'pop' | 'typewriter';
}

interface LogoConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
  showTagline: boolean;
}

interface WatermarkConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
}

interface LowerThird {
  id: string;
  name: string;
  title: string;
  position: 'left' | 'right';
}

interface OverlayConfig {
  texts: TextOverlay[];
  logo: LogoConfig;
  watermark: WatermarkConfig;
  lowerThirds: LowerThird[];
}

interface OverlayEditorProps {
  config: OverlayConfig;
  onChange: (config: OverlayConfig) => void;
  extractedText?: string[]; // From AI prompt sanitization
  sceneType?: string;
}

export const OverlayEditor: React.FC<OverlayEditorProps> = ({
  config,
  onChange,
  extractedText = [],
  sceneType,
}) => {
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
  // Auto-suggest overlays based on extracted text
  const suggestedTexts = extractedText.filter(
    text => !config.texts.some(t => t.text === text)
  );
  
  const addTextOverlay = (text: string = 'New Text') => {
    const newText: TextOverlay = {
      id: `text-${Date.now()}`,
      text,
      position: 'bottom',
      fontSize: 32,
      animation: 'slide-up',
    };
    onChange({
      ...config,
      texts: [...config.texts, newText],
    });
  };
  
  const updateTextOverlay = (id: string, updates: Partial<TextOverlay>) => {
    onChange({
      ...config,
      texts: config.texts.map(t => t.id === id ? { ...t, ...updates } : t),
    });
  };
  
  const removeTextOverlay = (id: string) => {
    onChange({
      ...config,
      texts: config.texts.filter(t => t.id !== id),
    });
  };
  
  const addLowerThird = () => {
    const newLT: LowerThird = {
      id: `lt-${Date.now()}`,
      name: 'Name',
      title: 'Title',
      position: 'left',
    };
    onChange({
      ...config,
      lowerThirds: [...config.lowerThirds, newLT],
    });
  };
  
  return (
    <div className="space-y-6">
      <Tabs defaultValue="text">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="text">Text</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="watermark">Watermark</TabsTrigger>
          <TabsTrigger value="lowerthird">Names</TabsTrigger>
        </TabsList>
        
        {/* TEXT OVERLAYS TAB */}
        <TabsContent value="text" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Text Overlays</Label>
            <Button size="sm" variant="outline" onClick={() => addTextOverlay()}>
              <Plus className="h-4 w-4 mr-1" /> Add Text
            </Button>
          </div>
          
          {/* Suggested from extracted text */}
          {suggestedTexts.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <div className="text-xs text-blue-700 mb-2">Suggested from visual direction:</div>
              <div className="flex flex-wrap gap-2">
                {suggestedTexts.map((text, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => addTextOverlay(text)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> {text}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Existing text overlays */}
          <div className="space-y-3">
            {config.texts.map(text => (
              <div 
                key={text.id}
                className="border rounded-lg p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Input
                    value={text.text}
                    onChange={(e) => updateTextOverlay(text.id, { text: e.target.value })}
                    className="flex-1 mr-2"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removeTextOverlay(text.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Position</Label>
                    <Select
                      value={text.position}
                      onValueChange={(v) => updateTextOverlay(text.id, { position: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Font Size</Label>
                    <Select
                      value={String(text.fontSize)}
                      onValueChange={(v) => updateTextOverlay(text.id, { fontSize: Number(v) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="24">Small (24px)</SelectItem>
                        <SelectItem value="32">Medium (32px)</SelectItem>
                        <SelectItem value="42">Large (42px)</SelectItem>
                        <SelectItem value="56">X-Large (56px)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-xs">Animation</Label>
                    <Select
                      value={text.animation}
                      onValueChange={(v) => updateTextOverlay(text.id, { animation: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fade">Fade In</SelectItem>
                        <SelectItem value="slide-up">Slide Up</SelectItem>
                        <SelectItem value="pop">Pop</SelectItem>
                        <SelectItem value="typewriter">Typewriter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
            
            {config.texts.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                No text overlays. Click "Add Text" or select a suggestion above.
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* LOGO TAB */}
        <TabsContent value="logo" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Logo Overlay</Label>
            <Switch
              checked={config.logo.enabled}
              onCheckedChange={(checked) => onChange({
                ...config,
                logo: { ...config.logo, enabled: checked }
              })}
            />
          </div>
          
          {config.logo.enabled && (
            <div className="space-y-4 border rounded-lg p-4">
              {/* Logo preview */}
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded flex items-center justify-center">
                  <img 
                    src="/assets/brand/phf-logo.png" 
                    alt="Logo" 
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Pine Hill Farm logo will be added to this scene
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Position</Label>
                  <Select
                    value={config.logo.position}
                    onValueChange={(v) => onChange({
                      ...config,
                      logo: { ...config.logo, position: v as any }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="top-left">Top Left</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-right">Bottom Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs">Size</Label>
                  <Select
                    value={config.logo.size}
                    onValueChange={(v) => onChange({
                      ...config,
                      logo: { ...config.logo, size: v as any }
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small (10%)</SelectItem>
                      <SelectItem value="medium">Medium (15%)</SelectItem>
                      <SelectItem value="large">Large (20%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.logo.showTagline}
                  onCheckedChange={(checked) => onChange({
                    ...config,
                    logo: { ...config.logo, showTagline: checked }
                  })}
                />
                <Label className="text-sm">Show tagline "Cultivating Wellness"</Label>
              </div>
            </div>
          )}
        </TabsContent>
        
        {/* WATERMARK TAB */}
        <TabsContent value="watermark" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Watermark</Label>
            <Switch
              checked={config.watermark.enabled}
              onCheckedChange={(checked) => onChange({
                ...config,
                watermark: { ...config.watermark, enabled: checked }
              })}
            />
          </div>
          
          {config.watermark.enabled && (
            <div className="space-y-4 border rounded-lg p-4">
              <div>
                <Label className="text-xs">Position</Label>
                <Select
                  value={config.watermark.position}
                  onValueChange={(v) => onChange({
                    ...config,
                    watermark: { ...config.watermark, position: v as any }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top-left">Top Left</SelectItem>
                    <SelectItem value="top-right">Top Right</SelectItem>
                    <SelectItem value="bottom-left">Bottom Left</SelectItem>
                    <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Opacity: {config.watermark.opacity}%</Label>
                <Slider
                  value={[config.watermark.opacity]}
                  onValueChange={([v]) => onChange({
                    ...config,
                    watermark: { ...config.watermark, opacity: v }
                  })}
                  min={20}
                  max={100}
                  step={5}
                  className="mt-2"
                />
              </div>
            </div>
          )}
        </TabsContent>
        
        {/* LOWER THIRDS TAB */}
        <TabsContent value="lowerthird" className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Lower Thirds (Names/Titles)</Label>
            <Button size="sm" variant="outline" onClick={addLowerThird}>
              <Plus className="h-4 w-4 mr-1" /> Add Person
            </Button>
          </div>
          
          <div className="space-y-3">
            {config.lowerThirds.map(lt => (
              <div key={lt.id} className="border rounded-lg p-3 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={lt.name}
                      onChange={(e) => onChange({
                        ...config,
                        lowerThirds: config.lowerThirds.map(l => 
                          l.id === lt.id ? { ...l, name: e.target.value } : l
                        )
                      })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input
                      value={lt.title}
                      onChange={(e) => onChange({
                        ...config,
                        lowerThirds: config.lowerThirds.map(l => 
                          l.id === lt.id ? { ...l, title: e.target.value } : l
                        )
                      })}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Select
                    value={lt.position}
                    onValueChange={(v) => onChange({
                      ...config,
                      lowerThirds: config.lowerThirds.map(l => 
                        l.id === lt.id ? { ...l, position: v as any } : l
                      )
                    })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left Side</SelectItem>
                      <SelectItem value="right">Right Side</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onChange({
                      ...config,
                      lowerThirds: config.lowerThirds.filter(l => l.id !== lt.id)
                    })}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
            
            {config.lowerThirds.length === 0 && (
              <div className="text-center py-6 text-gray-400 text-sm">
                No lower thirds. Use these for testimonials or speaker names.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### Integrate into Scene Editor Modal

```tsx
// In scene-editor-modal.tsx

import { OverlayEditor } from './overlay-editor';

// Add overlays section
<div className="border-t pt-4 mt-4">
  <h3 className="text-sm font-medium mb-3">Scene Overlays</h3>
  <OverlayEditor
    config={scene.overlayConfig || defaultOverlayConfig}
    onChange={(config) => updateScene(scene.id, { overlayConfig: config })}
    extractedText={scene.extractedOverlayText}
    sceneType={scene.type}
  />
</div>
```

### Default Overlay Config

```typescript
const defaultOverlayConfig: OverlayConfig = {
  texts: [],
  logo: {
    enabled: false,
    position: 'center',
    size: 'medium',
    showTagline: true,
  },
  watermark: {
    enabled: true,
    position: 'bottom-right',
    opacity: 70,
  },
  lowerThirds: [],
};

// Scene type specific defaults
function getDefaultOverlayConfig(sceneType: string): OverlayConfig {
  const config = { ...defaultOverlayConfig };
  
  if (sceneType === 'intro' || sceneType === 'cta') {
    config.logo.enabled = true;
  }
  
  if (sceneType === 'testimonial') {
    // Suggest lower third for testimonial scenes
  }
  
  return config;
}
```

## Verification Checklist

- [ ] Overlay editor renders in scene editor modal
- [ ] Can add new text overlay
- [ ] Can edit text overlay content
- [ ] Can change text position
- [ ] Can change text animation
- [ ] Can remove text overlay
- [ ] Suggested text from extracted content appears
- [ ] Logo toggle works
- [ ] Logo position selector works
- [ ] Logo size selector works
- [ ] Tagline toggle works
- [ ] Watermark toggle works
- [ ] Watermark position selector works
- [ ] Watermark opacity slider works
- [ ] Lower third add/edit/remove works
- [ ] Config saved to scene

## Next Phase

Once overlay UI controls are built, proceed to **Phase 11D: Brand Media Animation** to handle static images from Brand Media with Ken Burns effects.
