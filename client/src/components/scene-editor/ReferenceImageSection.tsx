import { useState, useCallback, type ChangeEvent } from 'react';
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
  TooltipProvider,
} from '@/components/ui/tooltip';
import type { ReferenceConfig, ReferenceMode, ReferenceSourceType } from '@shared/video-types';

interface ReferenceImageSectionProps {
  sceneId: string;
  currentMediaUrl?: string;
  currentMediaType: 'image' | 'video';
  onReferenceSet: (config: ReferenceConfig) => void;
  onClear: () => void;
}

interface ReferenceSourcePickerProps {
  referenceUrl: string | null;
  currentMediaUrl?: string;
  onFileUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onUseCurrentMedia: () => void;
  onClear: () => void;
}

const ReferenceSourcePicker = ({ 
  referenceUrl, 
  currentMediaUrl, 
  onFileUpload, 
  onUseCurrentMedia, 
  onClear 
}: ReferenceSourcePickerProps) => {
  return (
    <div className="space-y-2">
      <Label>Reference Source</Label>
      
      {referenceUrl ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <img 
            src={referenceUrl} 
            alt="Reference" 
            className="w-full h-32 object-cover"
            data-testid="reference-image-preview"
          />
          <button
            className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
            onClick={onClear}
            data-testid="button-clear-reference"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label 
            className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
            data-testid="label-upload-reference"
          >
            <Upload className="w-6 h-6 text-gray-400 mb-1" />
            <span className="text-sm text-gray-600">Upload Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onFileUpload}
              data-testid="input-upload-reference"
            />
          </label>
          
          {currentMediaUrl && (
            <button
              className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
              onClick={onUseCurrentMedia}
              data-testid="button-use-current-media"
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

export const ReferenceImageSection = ({
  sceneId,
  currentMediaUrl,
  currentMediaType,
  onReferenceSet,
  onClear,
}: ReferenceImageSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [mode, setMode] = useState<ReferenceMode>('none');
  const [referenceUrl, setReferenceUrl] = useState<string | null>(null);
  const [sourceType, setSourceType] = useState<ReferenceSourceType>('upload');
  
  const [i2iStrength, setI2iStrength] = useState(0.7);
  const [i2vMotion, setI2vMotion] = useState(0.5);
  const [i2vMotionType, setI2vMotionType] = useState<'environmental' | 'subtle' | 'dynamic'>('subtle');
  const [styleStrength, setStyleStrength] = useState(0.7);
  
  const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    setReferenceUrl(url);
    setSourceType('upload');
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
    
    if (mode === 'style-reference') {
      config.styleSettings = {
        styleStrength,
        applyColors: true,
        applyLighting: true,
        applyComposition: false,
      };
    }
    
    onReferenceSet(config);
  }, [mode, referenceUrl, sourceType, i2iStrength, i2vMotion, i2vMotionType, styleStrength, onReferenceSet]);
  
  const handleClear = useCallback(() => {
    setMode('none');
    setReferenceUrl(null);
    onClear();
  }, [onClear]);
  
  return (
    <TooltipProvider>
      <Card 
        className="p-4 mb-4 border-dashed border-2 border-gray-200 hover:border-blue-300 transition-colors"
        data-testid="card-reference-image-section"
      >
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-toggle-reference-section"
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
          <Button variant="ghost" size="sm" data-testid="button-expand-reference">
            {isExpanded ? '−' : '+'}
          </Button>
        </div>
        
        {isExpanded && (
          <div className="mt-4 space-y-4">
            <Tabs value={mode} onValueChange={(v) => setMode(v as ReferenceMode)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="none" data-testid="tab-none">None</TabsTrigger>
                <TabsTrigger value="image-to-image" data-testid="tab-i2i">
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
                <TabsTrigger value="image-to-video" data-testid="tab-i2v">
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
                <TabsTrigger value="style-reference" data-testid="tab-style">
                  <Tooltip>
                    <TooltipTrigger>Style</TooltipTrigger>
                    <TooltipContent>
                      <p>Style Reference: Match visual style</p>
                    </TooltipContent>
                  </Tooltip>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="image-to-image" className="space-y-4 mt-4">
                <div className="text-sm text-gray-600">
                  Use a reference image to guide generation. The AI will create a new image 
                  that follows the composition and style of your reference.
                </div>
                
                <ReferenceSourcePicker
                  referenceUrl={referenceUrl}
                  currentMediaUrl={currentMediaUrl}
                  onFileUpload={handleFileUpload}
                  onUseCurrentMedia={handleUseCurrentMedia}
                  onClear={() => setReferenceUrl(null)}
                />
                
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
                    data-testid="slider-i2i-strength"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Closer to reference</span>
                    <span>More variation</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="image-to-video" className="space-y-4 mt-4">
                <div className="text-sm text-gray-600">
                  Animate a still image with controlled motion. The image becomes 
                  the first frame of your video.
                </div>
                
                <ReferenceSourcePicker
                  referenceUrl={referenceUrl}
                  currentMediaUrl={currentMediaUrl}
                  onFileUpload={handleFileUpload}
                  onUseCurrentMedia={handleUseCurrentMedia}
                  onClear={() => setReferenceUrl(null)}
                />
                
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
                        onClick={() => setI2vMotionType(value as 'environmental' | 'subtle' | 'dynamic')}
                        data-testid={`button-motion-${value}`}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-gray-500">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
                
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
                    data-testid="slider-i2v-motion"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Minimal motion</span>
                    <span>More motion</span>
                  </div>
                </div>
              </TabsContent>
              
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
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Style Strength</Label>
                    <span className="text-sm text-gray-500">{Math.round(styleStrength * 100)}%</span>
                  </div>
                  <Slider
                    value={[styleStrength]}
                    onValueChange={([v]) => setStyleStrength(v)}
                    min={0.1}
                    max={1}
                    step={0.05}
                    data-testid="slider-style-strength"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Subtle influence</span>
                    <span>Strong match</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            {mode !== 'none' && (
              <div className="flex gap-2 pt-2">
                <Button 
                  className="flex-1" 
                  onClick={handleApply}
                  disabled={!referenceUrl}
                  data-testid="button-apply-reference"
                >
                  Apply Reference
                </Button>
                <Button variant="outline" onClick={handleClear} data-testid="button-clear-all">
                  Clear
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </TooltipProvider>
  );
};

export default ReferenceImageSection;
