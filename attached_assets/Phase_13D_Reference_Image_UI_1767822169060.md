# Phase 13D: Reference Image UI

## Objective

Add UI components to the scene editor that enable:
1. **Image-to-Image**: Use a reference image to guide image generation
2. **Image-to-Video**: Use an image as the starting frame for video
3. **Regenerate with Reference**: Use a failed/partial generation as reference for retry

## The Gap in Current UI

Looking at the screenshot, the scene editor has:
- ✅ Image/Video toggle
- ✅ Provider selection (Flux.1, fal.ai, Kling, Runway, etc.)
- ✅ Custom prompt override
- ❌ **No way to upload reference image**
- ❌ **No way to use existing image as video source**
- ❌ **No image-to-image refinement option**

## New UI Components

### 1. Reference Image Section

Add between "Media Source Controls" and "IMAGE PROVIDERS":

```tsx
// client/src/components/scene-editor/ReferenceImageSection.tsx

import React, { useState, useCallback } from 'react';
import { Upload, Image, Video, X, Wand2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ReferenceImageSectionProps {
  sceneId: string;
  currentMediaUrl?: string;
  currentMediaType: 'image' | 'video';
  onReferenceSet: (config: ReferenceConfig) => void;
  onClear: () => void;
}

export interface ReferenceConfig {
  mode: 'none' | 'image-to-image' | 'image-to-video' | 'style-reference';
  sourceUrl?: string;
  sourceType: 'upload' | 'current-media' | 'asset-library' | 'brand-media';
  
  // Image-to-image settings
  i2iSettings?: {
    strength: number;        // 0-1, how much to change from reference
    preserveComposition: boolean;
    preserveColors: boolean;
  };
  
  // Image-to-video settings
  i2vSettings?: {
    motionStrength: number;  // 0-1, amount of motion
    motionType: 'environmental' | 'subtle' | 'dynamic';
    preserveSubject: boolean;
  };
  
  // Style reference settings
  styleSettings?: {
    styleStrength: number;   // 0-1, how much to apply style
    applyColors: boolean;
    applyLighting: boolean;
    applyComposition: boolean;
  };
}

export const ReferenceImageSection: React.FC<ReferenceImageSectionProps> = ({
  sceneId,
  currentMediaUrl,
  currentMediaType,
  onReferenceSet,
  onClear,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<ReferenceConfig['mode']>('none');
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<ReferenceConfig['sourceType']>('upload');
  
  // Settings states
  const [i2iStrength, setI2iStrength] = useState(0.7);
  const [i2vMotion, setI2vMotion] = useState(0.5);
  const [i2vMotionType, setI2vMotionType] = useState<'environmental' | 'subtle' | 'dynamic'>('subtle');
  
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Create preview URL
    const url = URL.createObjectURL(file);
    setReferenceUrl(url);
    setSourceType('upload');
    
    // TODO: Upload to server and get permanent URL
  }, []);
  
  const handleUseCurrentMedia = useCallback(() => {
    if (currentMediaUrl) {
      setReferenceUrl(currentMediaUrl);
      setSourceType('current-media');
    }
  }, [currentMediaUrl]);
  
  const handleApply = useCallback(() => {
    if (!referenceUrl && mode !== 'none') return;
    
    const config: ReferenceConfig = {
      mode,
      sourceUrl: referenceUrl || undefined,
      sourceType,
    };
    
    if (mode === 'image-to-image') {
      config.i2iSettings = {
        strength: i2iStrength,
        preserveComposition: true,
        preserveColors: true,
      };
    }
    
    if (mode === 'image-to-video') {
      config.i2vSettings = {
        motionStrength: i2vMotion,
        motionType: i2vMotionType,
        preserveSubject: true,
      };
    }
    
    onReferenceSet(config);
  }, [mode, referenceUrl, sourceType, i2iStrength, i2vMotion, i2vMotionType, onReferenceSet]);
  
  const handleClear = useCallback(() => {
    setMode('none');
    setReferenceUrl(null);
    onClear();
  }, [onClear]);
  
  return (
    <Card className="p-4 mb-4 border-dashed border-2 border-gray-200 hover:border-blue-300 transition-colors">
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Image className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-sm">Reference Image</span>
          {mode !== 'none' && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
              {mode === 'image-to-image' ? 'I2I' : mode === 'image-to-video' ? 'I2V' : 'Style'}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm">
          {isExpanded ? '−' : '+'}
        </Button>
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Mode Selection */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as ReferenceConfig['mode'])}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="none">None</TabsTrigger>
              <TabsTrigger value="image-to-image">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <Wand2 className="w-3 h-3" />
                    I2I
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Image-to-Image: Refine an existing image</p>
                  </TooltipContent>
                </Tooltip>
              </TabsTrigger>
              <TabsTrigger value="image-to-video">
                <Tooltip>
                  <TooltipTrigger className="flex items-center gap-1">
                    <Video className="w-3 h-3" />
                    I2V
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Image-to-Video: Animate an image</p>
                  </TooltipContent>
                </Tooltip>
              </TabsTrigger>
              <TabsTrigger value="style-reference">
                <Tooltip>
                  <TooltipTrigger>Style</TooltipTrigger>
                  <TooltipContent>
                    <p>Style Reference: Match visual style</p>
                  </TooltipContent>
                </Tooltip>
              </TabsTrigger>
            </TabsList>
            
            {/* Image-to-Image Settings */}
            <TabsContent value="image-to-image" className="space-y-4 mt-4">
              <div className="text-sm text-gray-600">
                Use a reference image to guide generation. The AI will create a new image 
                that follows the composition and style of your reference.
              </div>
              
              {/* Reference Source */}
              <ReferenceSourcePicker
                referenceUrl={referenceUrl}
                currentMediaUrl={currentMediaUrl}
                onFileUpload={handleFileUpload}
                onUseCurrentMedia={handleUseCurrentMedia}
                onClear={() => setReferenceUrl(null)}
              />
              
              {/* Strength Slider */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Variation Strength</Label>
                  <span className="text-sm text-gray-500">{Math.round(i2iStrength * 100)}%</span>
                </div>
                <Slider
                  value={[i2iStrength]}
                  onValueChange={([v]) => setI2iStrength(v)}
                  min={0}
                  max={1}
                  step={0.05}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Closer to reference</span>
                  <span>More variation</span>
                </div>
              </div>
            </TabsContent>
            
            {/* Image-to-Video Settings */}
            <TabsContent value="image-to-video" className="space-y-4 mt-4">
              <div className="text-sm text-gray-600">
                Animate a still image with controlled motion. The image becomes 
                the first frame of your video.
              </div>
              
              {/* Reference Source */}
              <ReferenceSourcePicker
                referenceUrl={referenceUrl}
                currentMediaUrl={currentMediaUrl}
                onFileUpload={handleFileUpload}
                onUseCurrentMedia={handleUseCurrentMedia}
                onClear={() => setReferenceUrl(null)}
              />
              
              {/* Motion Type */}
              <div className="space-y-2">
                <Label>Motion Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'environmental', label: 'Environmental', desc: 'Background moves, subject static' },
                    { value: 'subtle', label: 'Subtle', desc: 'Gentle camera drift' },
                    { value: 'dynamic', label: 'Dynamic', desc: 'More pronounced motion' },
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      className={`p-2 rounded border text-sm ${
                        i2vMotionType === value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setI2vMotionType(value as any)}
                    >
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Motion Strength */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Motion Amount</Label>
                  <span className="text-sm text-gray-500">{Math.round(i2vMotion * 100)}%</span>
                </div>
                <Slider
                  value={[i2vMotion]}
                  onValueChange={([v]) => setI2vMotion(v)}
                  min={0.1}
                  max={1}
                  step={0.05}
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Minimal motion</span>
                  <span>More motion</span>
                </div>
              </div>
            </TabsContent>
            
            {/* Style Reference Settings */}
            <TabsContent value="style-reference" className="space-y-4 mt-4">
              <div className="text-sm text-gray-600">
                Use an image as style reference. The AI will match the visual style 
                (colors, lighting, mood) without copying the content.
              </div>
              
              <ReferenceSourcePicker
                referenceUrl={referenceUrl}
                currentMediaUrl={currentMediaUrl}
                onFileUpload={handleFileUpload}
                onUseCurrentMedia={handleUseCurrentMedia}
                onClear={() => setReferenceUrl(null)}
              />
            </TabsContent>
          </Tabs>
          
          {/* Apply/Clear Buttons */}
          {mode !== 'none' && (
            <div className="flex gap-2 pt-2">
              <Button 
                className="flex-1" 
                onClick={handleApply}
                disabled={!referenceUrl}
              >
                Apply Reference
              </Button>
              <Button variant="outline" onClick={handleClear}>
                Clear
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// Sub-component for reference source selection
const ReferenceSourcePicker: React.FC<{
  referenceUrl: string | null;
  currentMediaUrl?: string;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUseCurrentMedia: () => void;
  onClear: () => void;
}> = ({ referenceUrl, currentMediaUrl, onFileUpload, onUseCurrentMedia, onClear }) => {
  return (
    <div className="space-y-2">
      <Label>Reference Source</Label>
      
      {referenceUrl ? (
        // Preview
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <img 
            src={referenceUrl} 
            alt="Reference" 
            className="w-full h-32 object-cover"
          />
          <button
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
            onClick={onClear}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        // Source options
        <div className="grid grid-cols-2 gap-2">
          {/* Upload */}
          <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors">
            <Upload className="w-6 h-6 text-gray-400 mb-1" />
            <span className="text-sm text-gray-600">Upload Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileUpload}
            />
          </label>
          
          {/* Use Current */}
          {currentMediaUrl && (
            <button
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              onClick={onUseCurrentMedia}
            >
              <RefreshCw className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-sm text-gray-600">Use Current</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferenceImageSection;
```

---

## 2. Regenerate with Reference Button

Add to the video preview area when a video fails quality check:

```tsx
// client/src/components/scene-editor/RegenerationOptions.tsx

import React, { useState } from 'react';
import { RefreshCw, Image, Wand2, FileQuestion, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RegenerationOptionsProps {
  sceneId: string;
  currentMediaUrl?: string;
  qualityIssues?: string[];
  suggestedImprovement?: string;
  complexity?: {
    category: 'simple' | 'moderate' | 'complex' | 'impossible';
    warning?: string;
    simplifiedPrompt?: string;
  };
  onRegenerate: (options: RegenerateOptions) => void;
}

export interface RegenerateOptions {
  mode: 'standard' | 'with-reference' | 'simplified-prompt' | 'different-provider' | 'stock-search';
  referenceUrl?: string;
  newPrompt?: string;
  newProvider?: string;
}

export const RegenerationOptions: React.FC<RegenerationOptionsProps> = ({
  sceneId,
  currentMediaUrl,
  qualityIssues = [],
  suggestedImprovement,
  complexity,
  onRegenerate,
}) => {
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  const hasQualityIssues = qualityIssues.length > 0;
  const isComplexPrompt = complexity?.category === 'complex' || complexity?.category === 'impossible';
  
  const handleRegenerate = async (options: RegenerateOptions) => {
    setIsRegenerating(true);
    try {
      await onRegenerate(options);
    } finally {
      setIsRegenerating(false);
    }
  };
  
  return (
    <div className="space-y-3">
      {/* Complexity Warning */}
      {isComplexPrompt && complexity?.warning && (
        <Alert variant="warning" className="bg-amber-50 border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-amber-800 text-sm">
            {complexity.warning}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Quality Issues */}
      {hasQualityIssues && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            <strong>Quality issues found:</strong>
            <ul className="mt-1 list-disc list-inside">
              {qualityIssues.slice(0, 3).map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Regeneration Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant={hasQualityIssues ? "destructive" : "outline"} 
            className="w-full"
            disabled={isRegenerating}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRegenerating ? 'animate-spin' : ''}`} />
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* Standard Regenerate */}
          <DropdownMenuItem onClick={() => handleRegenerate({ mode: 'standard' })}>
            <RefreshCw className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Standard Regenerate</div>
              <div className="text-xs text-gray-500">Try again with same settings</div>
            </div>
          </DropdownMenuItem>
          
          {/* Use Current as Reference (I2I) */}
          {currentMediaUrl && (
            <DropdownMenuItem onClick={() => handleRegenerate({ 
              mode: 'with-reference', 
              referenceUrl: currentMediaUrl 
            })}>
              <Image className="w-4 h-4 mr-2" />
              <div>
                <div className="font-medium">Refine Current (I2I)</div>
                <div className="text-xs text-gray-500">Use current as starting point</div>
              </div>
            </DropdownMenuItem>
          )}
          
          {/* Apply Suggested Improvement */}
          {suggestedImprovement && (
            <DropdownMenuItem onClick={() => handleRegenerate({ 
              mode: 'standard', 
              newPrompt: suggestedImprovement 
            })}>
              <Wand2 className="w-4 h-4 mr-2" />
              <div>
                <div className="font-medium">Apply Suggestion</div>
                <div className="text-xs text-gray-500">Use Claude's improved prompt</div>
              </div>
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Simplified Prompt (for complex prompts) */}
          {complexity?.simplifiedPrompt && (
            <DropdownMenuItem onClick={() => handleRegenerate({ 
              mode: 'simplified-prompt', 
              newPrompt: complexity.simplifiedPrompt 
            })}>
              <FileQuestion className="w-4 h-4 mr-2" />
              <div>
                <div className="font-medium">Try Simplified</div>
                <div className="text-xs text-gray-500">Use simpler prompt for better results</div>
              </div>
            </DropdownMenuItem>
          )}
          
          {/* Try Different Provider */}
          <DropdownMenuItem onClick={() => handleRegenerate({ mode: 'different-provider' })}>
            <RefreshCw className="w-4 h-4 mr-2" />
            <div>
              <div className="font-medium">Try Different Provider</div>
              <div className="text-xs text-gray-500">Auto-select alternative AI</div>
            </div>
          </DropdownMenuItem>
          
          {/* Search Stock Footage (for impossible prompts) */}
          {complexity?.category === 'impossible' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleRegenerate({ mode: 'stock-search' })}>
                <FileQuestion className="w-4 h-4 mr-2" />
                <div>
                  <div className="font-medium">Search Stock Footage</div>
                  <div className="text-xs text-gray-500">Find real footage instead</div>
                </div>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default RegenerationOptions;
```

---

## 3. Updated Scene Editor Integration

```tsx
// Updates to SceneEditorPanel.tsx

import { ReferenceImageSection, ReferenceConfig } from './ReferenceImageSection';
import { RegenerationOptions, RegenerateOptions } from './RegenerationOptions';
import { promptComplexityAnalyzer } from '@/services/prompt-complexity-analyzer';

// In the component:

const SceneEditorPanel: React.FC<SceneEditorPanelProps> = ({ scene }) => {
  // ... existing state ...
  
  const [referenceConfig, setReferenceConfig] = useState<ReferenceConfig | null>(null);
  const [complexity, setComplexity] = useState<any>(null);
  
  // Analyze complexity when visual direction changes
  useEffect(() => {
    if (scene.visualDirection) {
      const analysis = promptComplexityAnalyzer.analyze(scene.visualDirection);
      setComplexity(analysis);
    }
  }, [scene.visualDirection]);
  
  const handleReferenceSet = (config: ReferenceConfig) => {
    setReferenceConfig(config);
    
    // Update generation mode based on reference config
    if (config.mode === 'image-to-video') {
      setMediaType('video');
      // Filter to I2V capable providers
    }
  };
  
  const handleRegenerate = async (options: RegenerateOptions) => {
    // Handle different regeneration modes
    switch (options.mode) {
      case 'with-reference':
        await regenerateWithReference(scene.id, options.referenceUrl!);
        break;
      case 'simplified-prompt':
        await regenerateWithPrompt(scene.id, options.newPrompt!);
        break;
      case 'different-provider':
        await regenerateWithAlternativeProvider(scene.id);
        break;
      case 'stock-search':
        // Open stock footage search modal
        setShowStockSearch(true);
        break;
      default:
        await standardRegenerate(scene.id);
    }
  };
  
  return (
    <div className="scene-editor-panel">
      {/* ... existing header ... */}
      
      <div className="p-4 space-y-4">
        {/* Visual Direction with Complexity Indicator */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Visual Direction</Label>
            {complexity && complexity.category !== 'simple' && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                complexity.category === 'impossible' ? 'bg-red-100 text-red-700' :
                complexity.category === 'complex' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {complexity.category} prompt
              </span>
            )}
          </div>
          <Textarea value={scene.visualDirection} />
        </div>
        
        {/* NEW: Reference Image Section */}
        <ReferenceImageSection
          sceneId={scene.id}
          currentMediaUrl={scene.mediaUrl}
          currentMediaType={mediaType}
          onReferenceSet={handleReferenceSet}
          onClear={() => setReferenceConfig(null)}
        />
        
        {/* Media Source Controls */}
        <div className="space-y-2">
          <Label>Media Source Controls</Label>
          {/* ... existing controls ... */}
        </div>
        
        {/* Provider Selection - filtered based on reference config */}
        <ProviderSelection
          mediaType={mediaType}
          referenceMode={referenceConfig?.mode}
          complexity={complexity}
        />
        
        {/* ... existing overlays section ... */}
        
        {/* Regeneration Options (shown when media exists) */}
        {scene.mediaUrl && (
          <RegenerationOptions
            sceneId={scene.id}
            currentMediaUrl={scene.mediaUrl}
            qualityIssues={scene.qualityIssues}
            suggestedImprovement={scene.suggestedImprovement}
            complexity={complexity}
            onRegenerate={handleRegenerate}
          />
        )}
      </div>
    </div>
  );
};
```

---

## 4. Updated Provider Selection with Filtering

```tsx
// client/src/components/scene-editor/ProviderSelection.tsx

import React from 'react';
import { VIDEO_PROVIDERS } from '@/config/video-providers';

interface ProviderSelectionProps {
  mediaType: 'image' | 'video';
  referenceMode?: 'none' | 'image-to-image' | 'image-to-video' | 'style-reference';
  complexity?: {
    category: string;
    recommendations?: {
      bestProviders: string[];
      avoidProviders: string[];
    };
  };
  selectedProvider: string;
  onProviderSelect: (providerId: string) => void;
}

export const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  mediaType,
  referenceMode,
  complexity,
  selectedProvider,
  onProviderSelect,
}) => {
  // Filter providers based on mode
  const getFilteredProviders = () => {
    let providers = Object.values(VIDEO_PROVIDERS);
    
    // Filter by media type
    if (mediaType === 'image') {
      providers = providers.filter(p => p.capabilities.imageToImage);
    } else {
      providers = providers.filter(p => p.capabilities.textToVideo || p.capabilities.imageToVideo);
    }
    
    // Filter by reference mode
    if (referenceMode === 'image-to-video') {
      providers = providers.filter(p => p.capabilities.imageToVideo);
    } else if (referenceMode === 'image-to-image') {
      providers = providers.filter(p => p.capabilities.imageToImage);
    }
    
    return providers;
  };
  
  const providers = getFilteredProviders();
  const bestProviders = complexity?.recommendations?.bestProviders || [];
  const avoidProviders = complexity?.recommendations?.avoidProviders || [];
  
  return (
    <div className="space-y-2">
      <Label>
        {mediaType === 'image' ? 'IMAGE' : 'VIDEO'} PROVIDERS
        {referenceMode && referenceMode !== 'none' && (
          <span className="ml-2 text-xs text-blue-600">
            ({referenceMode === 'image-to-video' ? 'I2V' : 'I2I'} compatible)
          </span>
        )}
      </Label>
      
      <div className="grid grid-cols-1 gap-2">
        {providers.map(provider => {
          const isBest = bestProviders.includes(provider.id);
          const isAvoided = avoidProviders.includes(provider.id);
          const isSelected = selectedProvider === provider.id;
          
          return (
            <button
              key={provider.id}
              className={`p-3 rounded-lg border text-left transition-colors ${
                isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : isAvoided
                  ? 'border-gray-200 bg-gray-50 opacity-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onProviderSelect(provider.id)}
              disabled={isAvoided}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{provider.name}</span>
                  {isBest && (
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                      Best for this scene
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  ${provider.costPer10Seconds.toFixed(2)}/10s
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {provider.capabilities.strengths.slice(0, 3).join(', ')}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
```

---

## Verification Checklist

Phase 13D is complete when:

- [ ] Reference Image Section shows in scene editor
- [ ] Can upload reference image
- [ ] Can use current media as reference
- [ ] Image-to-Image mode works with strength slider
- [ ] Image-to-Video mode works with motion settings
- [ ] Style reference mode works
- [ ] Regeneration dropdown shows all options
- [ ] Complexity warning displays for complex prompts
- [ ] Provider selection filters based on reference mode
- [ ] "Best for this scene" badge shows correctly

---

## Next Phase

Proceed to **Phase 13E: Intelligent Regeneration** for the backend logic that handles all regeneration modes.
