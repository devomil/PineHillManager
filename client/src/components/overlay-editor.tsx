import { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Eye, Type, Image, Droplet, User, Check, Loader2, Save } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

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
  onPreview?: (draftConfig: OverlayConfig) => void;
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
  onPreview,
  extractedText = [],
  sceneType,
}: OverlayEditorProps) {
  const { toast } = useToast();
  const { data: brandMedia = [], isLoading: brandMediaLoading } = useQuery<BrandMediaAsset[]>({
    queryKey: ['/api/brand-media'],
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const logos = useMemo(() => brandMedia.filter(a => 
    (a.mediaType === 'image' || a.mediaType === 'photo') && 
    (a.entityType === 'logo' || a.entityType === 'brand' || a.name?.toLowerCase().includes('logo'))
  ), [brandMedia]);
  
  const watermarks = useMemo(() => brandMedia.filter(a => 
    (a.mediaType === 'image' || a.mediaType === 'photo') && 
    (a.entityType === 'watermark' || a.entityType === 'brand' || a.name?.toLowerCase().includes('watermark') || a.name?.toLowerCase().includes('logo'))
  ), [brandMedia]);
  
  const [draft, setDraft] = useState<OverlayConfig>(config);
  const [hasChanges, setHasChanges] = useState(false);
  
  const configString = useMemo(() => JSON.stringify(config), [config]);
  
  useEffect(() => {
    setDraft(config);
    setHasChanges(false);
  }, [configString]);
  
  const suggestedTexts = extractedText.filter(
    text => !draft.texts.some(t => t.text === text)
  );
  
  const updateDraft = (newConfig: OverlayConfig) => {
    setDraft(newConfig);
    setHasChanges(true);
  };
  
  const handleSave = () => {
    onChange(draft);
    setHasChanges(false);
    toast({
      title: "Overlays saved",
      description: "Your overlay settings have been saved.",
    });
  };
  
  const addTextOverlay = (text: string = 'New Text') => {
    const newText: TextOverlayItem = {
      id: `text-${Date.now()}`,
      text,
      position: 'bottom',
      fontSize: 32,
      animation: 'slide-up',
    };
    updateDraft({
      ...draft,
      texts: [...draft.texts, newText],
    });
  };
  
  const updateTextOverlay = (id: string, updates: Partial<TextOverlayItem>) => {
    updateDraft({
      ...draft,
      texts: draft.texts.map(t => t.id === id ? { ...t, ...updates } : t),
    });
  };
  
  const removeTextOverlay = (id: string) => {
    updateDraft({
      ...draft,
      texts: draft.texts.filter(t => t.id !== id),
    });
  };
  
  const addLowerThird = () => {
    const newLT: LowerThirdItem = {
      id: `lt-${Date.now()}`,
      name: 'Name',
      title: 'Title',
      position: 'left',
    };
    updateDraft({
      ...draft,
      lowerThirds: [...draft.lowerThirds, newLT],
    });
  };
  
  const updateLowerThird = (id: string, updates: Partial<LowerThirdItem>) => {
    updateDraft({
      ...draft,
      lowerThirds: draft.lowerThirds.map(lt => lt.id === id ? { ...lt, ...updates } : lt),
    });
  };
  
  const removeLowerThird = (id: string) => {
    updateDraft({
      ...draft,
      lowerThirds: draft.lowerThirds.filter(lt => lt.id !== id),
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
            {draft.texts.map((text, idx) => (
              <Card key={text.id}>
                <CardContent className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <Input
                      value={text.text}
                      onChange={(e) => updateTextOverlay(text.id, { text: e.target.value })}
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
            
            {draft.texts.length === 0 && (
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
              checked={draft.logo.enabled}
              onCheckedChange={(checked) => updateDraft({
                ...draft,
                logo: { ...draft.logo, enabled: checked }
              })}
              data-testid="switch-logo-enabled"
            />
          </div>
          
          {draft.logo.enabled && (
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
                            onClick={() => updateDraft({
                              ...draft,
                              logo: { ...draft.logo, logoUrl: logo.url, logoName: logo.name }
                            })}
                            className={`relative flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                              draft.logo.logoUrl === logo.url 
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
                            {draft.logo.logoUrl === logo.url && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <Check className="h-5 w-5 text-primary" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  {draft.logo.logoName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Selected: {draft.logo.logoName}
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Position</Label>
                    <Select
                      value={draft.logo.position}
                      onValueChange={(v) => updateDraft({
                        ...draft,
                        logo: { ...draft.logo, position: v as LogoConfig['position'] }
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
                      value={draft.logo.size}
                      onValueChange={(v) => updateDraft({
                        ...draft,
                        logo: { ...draft.logo, size: v as LogoConfig['size'] }
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
                    checked={draft.logo.showTagline}
                    onCheckedChange={(checked) => updateDraft({
                      ...draft,
                      logo: { ...draft.logo, showTagline: checked }
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
              checked={draft.watermark.enabled}
              onCheckedChange={(checked) => updateDraft({
                ...draft,
                watermark: { ...draft.watermark, enabled: checked }
              })}
              data-testid="switch-watermark-enabled"
            />
          </div>
          
          {draft.watermark.enabled && (
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
                            onClick={() => updateDraft({
                              ...draft,
                              watermark: { ...draft.watermark, watermarkUrl: wm.url, watermarkName: wm.name }
                            })}
                            className={`relative flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                              draft.watermark.watermarkUrl === wm.url 
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
                            {draft.watermark.watermarkUrl === wm.url && (
                              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                                <Check className="h-5 w-5 text-primary" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                  {draft.watermark.watermarkName && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Selected: {draft.watermark.watermarkName}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label className="text-xs">Position</Label>
                  <Select
                    value={draft.watermark.position}
                    onValueChange={(v) => updateDraft({
                      ...draft,
                      watermark: { ...draft.watermark, position: v as WatermarkConfig['position'] }
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
                    <span className="text-xs text-muted-foreground">{draft.watermark.opacity}%</span>
                  </div>
                  <Slider
                    value={[draft.watermark.opacity]}
                    onValueChange={([v]) => updateDraft({
                      ...draft,
                      watermark: { ...draft.watermark, opacity: v }
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
            {draft.lowerThirds.map((lt, idx) => (
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
            
            {draft.lowerThirds.length === 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No lower thirds. Use these for testimonials or speaker names.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="flex items-center justify-between pt-4 border-t mt-4">
        <div className="text-sm text-muted-foreground">
          {hasChanges && <span className="text-amber-600">You have unsaved changes</span>}
        </div>
        <div className="flex gap-2">
          {onPreview && (
            <Button 
              variant="outline" 
              onClick={() => onPreview(draft)}
              data-testid="button-preview-overlays"
            >
              <Eye className="h-4 w-4 mr-1" /> Preview
            </Button>
          )}
          <Button 
            onClick={handleSave}
            disabled={!hasChanges}
            data-testid="button-save-overlays"
          >
            <Save className="h-4 w-4 mr-1" /> Save Overlays
          </Button>
        </div>
      </div>
    </div>
  );
}
