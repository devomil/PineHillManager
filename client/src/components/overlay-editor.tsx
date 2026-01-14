import { useState, useEffect, useMemo, memo } from 'react';
import { Plus, Trash2, Eye, Type, Image, Droplet, User, Check, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
  assetCategory?: string;
  assetType?: string;
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
  position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  size: 'small' | 'medium' | 'large';
  showTagline: boolean;
  logoUrl?: string;
  logoName?: string;
}

interface WatermarkConfig {
  enabled: boolean;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  opacity: number;
  watermarkUrl?: string;
  watermarkName?: string;
}

interface AdditionalLogoItem {
  id: string;
  type: 'certification' | 'partner' | 'trust';
  logoUrl: string;
  logoName: string;
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  size: 'small' | 'medium';
  opacity: number;
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
  additionalLogos?: AdditionalLogoItem[];
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
  additionalLogos: [],
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
    additionalLogos: [],
    lowerThirds: [],
  };
  
  return config;
}

export const OverlayEditor = memo(function OverlayEditor({
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

  const logos = useMemo(() => brandMedia.filter(a => {
    if (a.mediaType !== 'image' && a.mediaType !== 'photo' && a.mediaType !== 'logo') return false;
    const nameLower = a.name?.toLowerCase() || '';
    const categoryLower = a.assetCategory?.toLowerCase() || '';
    const typeLower = a.assetType?.toLowerCase() || '';
    const entityLower = a.entityType?.toLowerCase() || '';
    return (
      a.mediaType === 'logo' ||
      entityLower === 'logo' || 
      entityLower === 'brand' || 
      entityLower === 'certification' ||
      entityLower === 'partner' ||
      entityLower === 'trust' ||
      categoryLower === 'logos' ||
      categoryLower === 'trust' ||
      typeLower.includes('logo') ||
      typeLower.includes('certification') ||
      typeLower.includes('partner') ||
      typeLower.includes('badge') ||
      typeLower.includes('trust') ||
      nameLower.includes('logo') ||
      nameLower.includes('usda') ||
      nameLower.includes('organic') ||
      nameLower.includes('certified') ||
      nameLower.includes('badge') ||
      nameLower.includes('seal') ||
      nameLower.includes('association') ||
      nameLower.includes('society') ||
      nameLower.includes('women owned')
    );
  }), [brandMedia]);
  
  const watermarks = useMemo(() => brandMedia.filter(a => {
    if (a.mediaType !== 'image' && a.mediaType !== 'photo' && a.mediaType !== 'logo') return false;
    const nameLower = a.name?.toLowerCase() || '';
    const categoryLower = a.assetCategory?.toLowerCase() || '';
    const typeLower = a.assetType?.toLowerCase() || '';
    const entityLower = a.entityType?.toLowerCase() || '';
    return (
      a.mediaType === 'logo' ||
      entityLower === 'watermark' || 
      entityLower === 'brand' || 
      categoryLower === 'logos' ||
      typeLower.includes('watermark') ||
      typeLower.includes('logo') ||
      nameLower.includes('watermark') ||
      nameLower.includes('logo')
    );
  }), [brandMedia]);
  
  const certifications = useMemo(() => brandMedia.filter(a => {
    if (a.mediaType !== 'image' && a.mediaType !== 'photo' && a.mediaType !== 'logo') return false;
    const nameLower = a.name?.toLowerCase() || '';
    const categoryLower = a.assetCategory?.toLowerCase() || '';
    const typeLower = a.assetType?.toLowerCase() || '';
    return (
      categoryLower === 'trust' ||
      typeLower.includes('certification') ||
      typeLower.includes('trust') ||
      typeLower.includes('partner') ||
      typeLower.includes('badge') ||
      nameLower.includes('usda') ||
      nameLower.includes('organic') ||
      nameLower.includes('certified') ||
      nameLower.includes('association') ||
      nameLower.includes('society') ||
      nameLower.includes('women owned')
    );
  }), [brandMedia]);
  
  const normalizedConfig = useMemo(() => ({
    ...config,
    additionalLogos: config.additionalLogos || [],
    lowerThirds: config.lowerThirds || [],
  }), [config]);
  
  const [draft, setDraft] = useState<OverlayConfig>(normalizedConfig);
  const [hasChanges, setHasChanges] = useState(false);
  
  const configString = useMemo(() => JSON.stringify(normalizedConfig), [normalizedConfig]);
  
  useEffect(() => {
    setDraft(normalizedConfig);
    setHasChanges(false);
  }, [configString]);
  
  const suggestedTexts = extractedText.filter(
    text => !draft.texts.some(t => t.text === text)
  );
  
  const updateDraft = (newConfig: OverlayConfig) => {
    console.log('[OverlayEditor v3.1] updateDraft called with:', {
      logoEnabled: newConfig.logo.enabled,
      logoPosition: newConfig.logo.position,
      logoUrl: newConfig.logo.logoUrl?.substring(0, 50),
      additionalLogosCount: (newConfig.additionalLogos || []).length,
      additionalLogos: (newConfig.additionalLogos || []).map(l => ({ id: l.id, pos: l.position, url: l.logoUrl?.substring(0, 40) })),
    });
    setDraft(newConfig);
    setHasChanges(true);
    if (onPreview) {
      console.log('[OverlayEditor v3.1] Calling onPreview with additionalLogos:', (newConfig.additionalLogos || []).length);
      onPreview(newConfig);
    }
  };
  
  const handleSave = () => {
    console.log('[OverlayEditor] handleSave called - draft:', draft);
    console.log('[OverlayEditor] Calling onChange with draft config');
    onChange(draft);
    setHasChanges(false);
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
  
  const addCertificationLogo = (asset: BrandMediaAsset, type: 'certification' | 'partner' | 'trust' = 'certification') => {
    console.log('[OverlayEditor v3.1] addCertificationLogo called with:', { name: asset.name, url: asset.url?.substring(0, 50), type });
    
    const isAlreadyAdded = (draft.additionalLogos || []).some(l => l.logoUrl === asset.url);
    if (isAlreadyAdded) {
      console.log('[OverlayEditor v3.1] Badge already added, skipping');
      toast({ title: 'Already added', description: `${asset.name} is already in your overlays.` });
      return;
    }
    
    const positions: ('top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'bottom-center')[] = ['bottom-center', 'bottom-left', 'top-right', 'top-left', 'bottom-right'];
    const usedPositions = (draft.additionalLogos || []).map(l => l.position);
    const availablePosition = positions.find(p => !usedPositions.includes(p)) || 'bottom-center';
    
    const newLogo: AdditionalLogoItem = {
      id: `cert-${Date.now()}`,
      type,
      logoUrl: asset.url,
      logoName: asset.name,
      position: availablePosition,
      size: 'small',
      opacity: 0.9,
    };
    
    console.log('[OverlayEditor v3.1] Creating new badge:', { id: newLogo.id, position: newLogo.position, logoUrl: newLogo.logoUrl?.substring(0, 40) });
    
    const newAdditionalLogos = [...(draft.additionalLogos || []), newLogo];
    console.log('[OverlayEditor v3.1] New additionalLogos count:', newAdditionalLogos.length);
    
    updateDraft({
      ...draft,
      additionalLogos: newAdditionalLogos,
    });
  };
  
  const updateAdditionalLogo = (id: string, updates: Partial<AdditionalLogoItem>) => {
    updateDraft({
      ...draft,
      additionalLogos: (draft.additionalLogos || []).map(l => l.id === id ? { ...l, ...updates } : l),
    });
  };
  
  const removeAdditionalLogo = (id: string) => {
    updateDraft({
      ...draft,
      additionalLogos: (draft.additionalLogos || []).filter(l => l.id !== id),
    });
  };
  
  return (
    <div className="space-y-4" data-testid="overlay-editor">
      <Tabs defaultValue="text">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="text" className="flex items-center gap-1 text-xs px-2" data-testid="tab-text">
            <Type className="h-3 w-3" /> Text
          </TabsTrigger>
          <TabsTrigger value="logo" className="flex items-center gap-1 text-xs px-2" data-testid="tab-logo">
            <Image className="h-3 w-3" /> Logo
          </TabsTrigger>
          <TabsTrigger value="watermark" className="flex items-center gap-1 text-xs px-2" data-testid="tab-watermark">
            <Droplet className="h-3 w-3" /> Mark
          </TabsTrigger>
          <TabsTrigger value="badges" className="flex items-center gap-1 text-xs px-2" data-testid="tab-badges">
            <Check className="h-3 w-3" /> Badges
          </TabsTrigger>
          <TabsTrigger value="lowerthird" className="flex items-center gap-1 text-xs px-2" data-testid="tab-lowerthird">
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
                    <ScrollArea className="w-full whitespace-nowrap">
                      <div className="flex gap-2 pb-4">
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
                      <ScrollBar orientation="horizontal" />
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
                        <SelectItem value="top-center">Top Center</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-center">Bottom Center</SelectItem>
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
                    <ScrollArea className="w-full whitespace-nowrap">
                      <div className="flex gap-2 pb-4">
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
                      <ScrollBar orientation="horizontal" />
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
                      <SelectItem value="top-center">Top Center</SelectItem>
                      <SelectItem value="top-right">Top Right</SelectItem>
                      <SelectItem value="bottom-left">Bottom Left</SelectItem>
                      <SelectItem value="bottom-center">Bottom Center</SelectItem>
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
        
        <TabsContent value="badges" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Certification & Trust Badges</Label>
            <span className="text-xs text-muted-foreground">
              {(draft.additionalLogos || []).length} added
            </span>
          </div>
          
          <Card>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-xs mb-2 block">Click to Add Badges (USDA, Partner Logos, etc.)</Label>
                {brandMediaLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : certifications.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-4 text-center">
                    No certification badges found. Upload USDA, partner, or trust logos to the Brand Media Library.
                  </div>
                ) : (
                  <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex gap-2 pb-4">
                      {certifications.map((cert) => {
                        const isAdded = (draft.additionalLogos || []).some(l => l.logoUrl === cert.url);
                        return (
                          <button
                            key={cert.id}
                            type="button"
                            onClick={() => addCertificationLogo(cert, 
                              cert.name.toLowerCase().includes('usda') ? 'certification' :
                              cert.name.toLowerCase().includes('association') || cert.name.toLowerCase().includes('society') ? 'partner' : 'trust'
                            )}
                            className={`relative flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-all ${
                              isAdded 
                                ? 'border-green-500 ring-2 ring-green-500/30 opacity-50' 
                                : 'border-muted hover:border-primary/50'
                            }`}
                            disabled={isAdded}
                            data-testid={`button-add-certification-${cert.id}`}
                          >
                            <img 
                              src={cert.thumbnailUrl || cert.url} 
                              alt={cert.name}
                              className="w-full h-full object-contain bg-white p-1"
                            />
                            {isAdded && (
                              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                                <Check className="h-4 w-4 text-green-600" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                )}
              </div>
              
              {(draft.additionalLogos || []).length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <Label className="text-xs font-medium">Active Badges</Label>
                  {(draft.additionalLogos || []).map((logo) => (
                    <div key={logo.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                      <img 
                        src={logo.logoUrl} 
                        alt={logo.logoName}
                        className="w-10 h-10 object-contain bg-white rounded p-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate">{logo.logoName}</div>
                        <Select
                          value={logo.position}
                          onValueChange={(v) => updateAdditionalLogo(logo.id, { position: v as AdditionalLogoItem['position'] })}
                        >
                          <SelectTrigger className="h-7 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="top-left">Top Left</SelectItem>
                            <SelectItem value="top-center">Top Center</SelectItem>
                            <SelectItem value="top-right">Top Right</SelectItem>
                            <SelectItem value="bottom-left">Bottom Left</SelectItem>
                            <SelectItem value="bottom-center">Bottom Center</SelectItem>
                            <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => removeAdditionalLogo(logo.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
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
});
