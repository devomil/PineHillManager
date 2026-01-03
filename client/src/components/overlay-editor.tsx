import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, Eye, EyeOff, Type, Image, Droplet, User, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { SCENE_OVERLAY_DEFAULTS } from '@shared/video-types';
import { useQuery } from '@tanstack/react-query';

interface BrandMediaAsset {
  id: number;
  name: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: string;
  entityType?: string;
}

interface TextOverlayItem {
  id: string;
  text: string;
  position: 'top' | 'center' | 'bottom';
  fontSize: number;
  animation: 'fade' | 'slide-up' | 'pop' | 'typewriter';
}

interface LogoConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'center' | 'bottom-left' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
  showTagline: boolean;
  logoUrl?: string;
  logoName?: string;
}

interface WatermarkConfig {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  watermarkUrl?: string;
  watermarkName?: string;
}

interface LowerThirdItem {
  id: string;
  name: string;
  title: string;
  position: 'left' | 'right';
}

export interface OverlayConfig {
  texts: TextOverlayItem[];
  logo: LogoConfig;
  watermark: WatermarkConfig;
  lowerThirds: LowerThirdItem[];
}

interface OverlayEditorProps {
  config: OverlayConfig;
  onChange: (config: OverlayConfig) => void;
  extractedText?: string[];
  sceneType?: string;
}

export const defaultOverlayConfig: OverlayConfig = {
  texts: [],
  logo: {
    enabled: false,
    position: 'center',
    size: 'medium',
    showTagline: true,
    logoUrl: undefined,
    logoName: undefined,
  },
  watermark: {
    enabled: true,
    position: 'bottom-right',
    opacity: 70,
    watermarkUrl: undefined,
    watermarkName: undefined,
  },
  lowerThirds: [],
};

export function getDefaultOverlayConfig(sceneType: string): OverlayConfig {
  const config: OverlayConfig = {
    texts: [],
    logo: {
      enabled: SCENE_OVERLAY_DEFAULTS[sceneType] ?? false,
      position: 'center',
      size: 'medium',
      showTagline: true,
      logoUrl: undefined,
      logoName: undefined,
    },
    watermark: {
      enabled: true,
      position: 'bottom-right',
      opacity: 70,
      watermarkUrl: undefined,
      watermarkName: undefined,
    },
    lowerThirds: [],
  };
  
  return config;
}

export function OverlayEditor({
  config,
  onChange,
  extractedText = [],
  sceneType,
}: OverlayEditorProps) {
  const { data: brandMedia = [], isLoading: brandMediaLoading } = useQuery<BrandMediaAsset[]>({
    queryKey: ['/api/brand-media'],
  });

  const logos = brandMedia.filter(a => 
    (a.mediaType === 'image' || a.mediaType === 'photo') && 
    (a.entityType === 'logo' || a.entityType === 'brand' || a.name?.toLowerCase().includes('logo'))
  );
  
  const watermarks = brandMedia.filter(a => 
    (a.mediaType === 'image' || a.mediaType === 'photo') && 
    (a.entityType === 'watermark' || a.entityType === 'brand' || a.name?.toLowerCase().includes('watermark') || a.name?.toLowerCase().includes('logo'))
  );
  
  const suggestedTexts = extractedText.filter(
    text => !config.texts.some(t => t.text === text)
  );
  
  const [localTexts, setLocalTexts] = useState<Record<string, string>>({});
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});
  
  useEffect(() => {
    const textMap: Record<string, string> = {};
    config.texts.forEach(t => {
      textMap[t.id] = t.text;
    });
    setLocalTexts(textMap);
  }, [config.texts.map(t => t.id).join(',')]);
  
  const handleTextChange = useCallback((id: string, newText: string) => {
    setLocalTexts(prev => ({ ...prev, [id]: newText }));
    
    if (debounceTimers.current[id]) {
      clearTimeout(debounceTimers.current[id]);
    }
    
    debounceTimers.current[id] = setTimeout(() => {
      onChange({
        ...config,
        texts: config.texts.map(t => t.id === id ? { ...t, text: newText } : t),
      });
    }, 500);
  }, [config, onChange]);
  
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(clearTimeout);
    };
  }, []);
  
  const addTextOverlay = (text: string = 'New Text') => {
    const newText: TextOverlayItem = {
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
  
  const updateTextOverlay = (id: string, updates: Partial<TextOverlayItem>) => {
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
    const newLT: LowerThirdItem = {
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
  
  const updateLowerThird = (id: string, updates: Partial<LowerThirdItem>) => {
    onChange({
      ...config,
      lowerThirds: config.lowerThirds.map(lt => lt.id === id ? { ...lt, ...updates } : lt),
    });
  };
  
  const removeLowerThird = (id: string) => {
    onChange({
      ...config,
      lowerThirds: config.lowerThirds.filter(lt => lt.id !== id),
    });
  };
  
  return (
    <div className="space-y-4" data-testid="overlay-editor">
      <Tabs defaultValue="text">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="text" className="flex items-center gap-1" data-testid="tab-text">
            <Type className="h-3 w-3" /> Text
          </TabsTrigger>
          <TabsTrigger value="logo" className="flex items-center gap-1" data-testid="tab-logo">
            <Image className="h-3 w-3" /> Logo
          </TabsTrigger>
          <TabsTrigger value="watermark" className="flex items-center gap-1" data-testid="tab-watermark">
            <Droplet className="h-3 w-3" /> Watermark
          </TabsTrigger>
          <TabsTrigger value="lowerthird" className="flex items-center gap-1" data-testid="tab-lowerthird">
            <User className="h-3 w-3" /> Names
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="text" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Text Overlays</Label>
            <Button size="sm" variant="outline" onClick={() => addTextOverlay()} data-testid="button-add-text">
              <Plus className="h-4 w-4 mr-1" /> Add Text
            </Button>
          </div>
          
          {suggestedTexts.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="text-xs text-blue-700 mb-2">Suggested from visual direction:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestedTexts.map((text, i) => (
                    <Button
                      key={i}
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => addTextOverlay(text)}
                      data-testid={`button-suggest-text-${i}`}
                    >
                      <Plus className="h-3 w-3 mr-1" /> {text.length > 30 ? text.substring(0, 27) + '...' : text}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <div className="space-y-3">
            {config.texts.map((text, idx) => (
              <Card key={text.id}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={localTexts[text.id] ?? text.text}
                      onChange={(e) => handleTextChange(text.id, e.target.value)}
                      className="flex-1 mr-2"
                      placeholder="Enter text..."
                      data-testid={`input-text-overlay-${idx}`}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeTextOverlay(text.id)}
                      data-testid={`button-remove-text-${idx}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Position</Label>
                      <Select
                        value={text.position}
                        onValueChange={(v) => updateTextOverlay(text.id, { position: v as 'top' | 'center' | 'bottom' })}
                      >
                        <SelectTrigger data-testid={`select-text-position-${idx}`}>
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
                        <SelectTrigger data-testid={`select-text-fontsize-${idx}`}>
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
                        onValueChange={(v) => updateTextOverlay(text.id, { animation: v as 'fade' | 'slide-up' | 'pop' | 'typewriter' })}
                      >
                        <SelectTrigger data-testid={`select-text-animation-${idx}`}>
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
                </CardContent>
              </Card>
            ))}
            
            {config.texts.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No text overlays. Click "Add Text" or select a suggestion above.
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="logo" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Logo Overlay</Label>
            <Switch
              checked={config.logo.enabled}
              onCheckedChange={(checked) => onChange({
                ...config,
                logo: { ...config.logo, enabled: checked }
              })}
              data-testid="switch-logo-enabled"
            />
          </div>
          
          {config.logo.enabled && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-xs mb-2 block">Select Logo</Label>
                  {brandMediaLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : logos.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      No logos found. Upload logos to the Brand Media Library.
                    </div>
                  ) : (
                    <ScrollArea className="h-24">
                      <div className="flex gap-2 pb-2">
                        {logos.map((logo) => (
                          <button
                            key={logo.id}
                            type="button"
                            onClick={() => onChange({
                              ...config,
                              logo: { ...config.logo, logoUrl: logo.url, logoName: logo.name }
                            })}
                            className={`relative flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                              config.logo.logoUrl === logo.url 
                                ? 'border-primary ring-2 ring-primary/30' 
                                : 'border-muted hover:border-muted-foreground/50'
                            }`}
                            data-testid={`button-select-logo-${logo.id}`}
                          >
                            <img 
                              src={logo.thumbnailUrl || logo.url} 
                              alt={logo.name}
                              className="w-full h-full object-contain bg-white p-1"
                            />
                            {config.logo.logoUrl === logo.url && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <Check className="h-5 w-5 text-primary" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  {config.logo.logoName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Selected: {config.logo.logoName}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Position</Label>
                    <Select
                      value={config.logo.position}
                      onValueChange={(v) => onChange({
                        ...config,
                        logo: { ...config.logo, position: v as LogoConfig['position'] }
                      })}
                    >
                      <SelectTrigger data-testid="select-logo-position">
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
                        logo: { ...config.logo, size: v as LogoConfig['size'] }
                      })}
                    >
                      <SelectTrigger data-testid="select-logo-size">
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
                    data-testid="switch-logo-tagline"
                  />
                  <Label className="text-sm">Show tagline "Cultivating Wellness"</Label>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="watermark" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Watermark</Label>
            <Switch
              checked={config.watermark.enabled}
              onCheckedChange={(checked) => onChange({
                ...config,
                watermark: { ...config.watermark, enabled: checked }
              })}
              data-testid="switch-watermark-enabled"
            />
          </div>
          
          {config.watermark.enabled && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-xs mb-2 block">Select Watermark</Label>
                  {brandMediaLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : watermarks.length === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 text-center">
                      No watermarks found. Upload watermarks to the Brand Media Library.
                    </div>
                  ) : (
                    <ScrollArea className="h-24">
                      <div className="flex gap-2 pb-2">
                        {watermarks.map((wm) => (
                          <button
                            key={wm.id}
                            type="button"
                            onClick={() => onChange({
                              ...config,
                              watermark: { ...config.watermark, watermarkUrl: wm.url, watermarkName: wm.name }
                            })}
                            className={`relative flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                              config.watermark.watermarkUrl === wm.url 
                                ? 'border-primary ring-2 ring-primary/30' 
                                : 'border-muted hover:border-muted-foreground/50'
                            }`}
                            data-testid={`button-select-watermark-${wm.id}`}
                          >
                            <img 
                              src={wm.thumbnailUrl || wm.url} 
                              alt={wm.name}
                              className="w-full h-full object-contain bg-white p-1"
                            />
                            {config.watermark.watermarkUrl === wm.url && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <Check className="h-5 w-5 text-primary" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  {config.watermark.watermarkName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Selected: {config.watermark.watermarkName}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label className="text-xs">Position</Label>
                  <Select
                    value={config.watermark.position}
                    onValueChange={(v) => onChange({
                      ...config,
                      watermark: { ...config.watermark, position: v as WatermarkConfig['position'] }
                    })}
                  >
                    <SelectTrigger data-testid="select-watermark-position">
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
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs">Opacity</Label>
                    <span className="text-xs text-muted-foreground">{config.watermark.opacity}%</span>
                  </div>
                  <Slider
                    value={[config.watermark.opacity]}
                    onValueChange={([v]) => onChange({
                      ...config,
                      watermark: { ...config.watermark, opacity: v }
                    })}
                    min={20}
                    max={100}
                    step={5}
                    data-testid="slider-watermark-opacity"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="lowerthird" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Lower Thirds (Names/Titles)</Label>
            <Button size="sm" variant="outline" onClick={addLowerThird} data-testid="button-add-lowerthird">
              <Plus className="h-4 w-4 mr-1" /> Add Person
            </Button>
          </div>
          
          <div className="space-y-3">
            {config.lowerThirds.map((lt, idx) => (
              <Card key={lt.id}>
                <CardContent className="p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={lt.name}
                        onChange={(e) => updateLowerThird(lt.id, { name: e.target.value })}
                        placeholder="Person's name"
                        data-testid={`input-lowerthird-name-${idx}`}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Title</Label>
                      <Input
                        value={lt.title}
                        onChange={(e) => updateLowerThird(lt.id, { title: e.target.value })}
                        placeholder="Their title"
                        data-testid={`input-lowerthird-title-${idx}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Select
                      value={lt.position}
                      onValueChange={(v) => updateLowerThird(lt.id, { position: v as 'left' | 'right' })}
                    >
                      <SelectTrigger className="w-32" data-testid={`select-lowerthird-position-${idx}`}>
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
                      onClick={() => removeLowerThird(lt.id)}
                      data-testid={`button-remove-lowerthird-${idx}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {config.lowerThirds.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No lower thirds. Use these for testimonials or speaker names.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
