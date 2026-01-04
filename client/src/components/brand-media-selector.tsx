import { useState, useEffect } from 'react';
import { Upload, Star, Search, Play, Image, X, Film, Folder } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import type { AnimationSettings, AnimationType, AnimationIntensity } from '@shared/video-types';

export interface BrandAsset {
  id: number;
  name: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: string;
  entityName?: string;
  entityType?: string;
  duration?: number;
  width?: number;
  height?: number;
  isDefault?: boolean;
  priority?: number;
}

interface BrandMediaSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: BrandAsset, animationSettings?: AnimationSettings) => void;
  currentAssetId?: number;
}

const defaultAnimationSettings: AnimationSettings = {
  type: 'ken-burns',
  intensity: 'subtle',
  focusPoint: { x: 50, y: 50 },
};

export function BrandMediaSelector({
  isOpen,
  onClose,
  onSelect,
  currentAssetId,
}: BrandMediaSelectorProps) {
  const [filter, setFilter] = useState<'all' | 'images' | 'videos'>('all');
  const [category, setCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<BrandAsset | null>(null);
  const [animationSettings, setAnimationSettings] = useState<AnimationSettings>(defaultAnimationSettings);
  const [activeTab, setActiveTab] = useState<'brand' | 'library'>('brand');
  
  const { data: brandAssets = [], isLoading: loadingBrand } = useQuery<BrandAsset[]>({
    queryKey: ['/api/brand-media'],
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  
  const { data: libraryAssets = [], isLoading: loadingLibrary } = useQuery<BrandAsset[]>({
    queryKey: ['/api/media-assets', { classification: 'general' }],
    enabled: isOpen && activeTab === 'library',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  
  const assets = activeTab === 'brand' ? brandAssets : libraryAssets;
  const isLoading = activeTab === 'brand' ? loadingBrand : loadingLibrary;
  
  const filteredAssets = assets.filter(asset => {
    const isImage = ['logo', 'photo', 'graphic', 'image'].includes(asset.mediaType);
    const isVideo = ['video', 'broll', 'intro', 'outro'].includes(asset.mediaType);
    
    if (filter === 'images' && !isImage) return false;
    if (filter === 'videos' && !isVideo) return false;
    if (category !== 'all' && asset.entityType !== category && asset.mediaType !== category) return false;
    if (searchQuery && !asset.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });
  
  const isVideoAsset = (asset: BrandAsset) => {
    return ['video', 'broll', 'intro', 'outro'].includes(asset.mediaType);
  };
  
  const handleSelect = () => {
    if (selectedAsset) {
      const settings = isVideoAsset(selectedAsset) ? undefined : animationSettings;
      onSelect(selectedAsset, settings);
      onClose();
    }
  };
  
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getAnimationDescription = (type: AnimationType): string => {
    const descriptions: Record<AnimationType, string> = {
      'ken-burns': 'Classic documentary-style slow zoom and pan movement',
      'zoom-in': 'Slowly zoom into the center of the image',
      'zoom-out': 'Start zoomed in and slowly pull back',
      'pan-left': 'Slowly move the view from right to left',
      'pan-right': 'Slowly move the view from left to right',
      'static': 'No movement - display image as-is',
    };
    return descriptions[type];
  };
  
  useEffect(() => {
    if (currentAssetId && assets.length > 0) {
      const current = assets.find(a => a.id === currentAssetId);
      if (current) setSelectedAsset(current);
    }
  }, [currentAssetId, assets]);
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col" data-testid="brand-media-selector">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            Select Brand Media
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'brand' | 'library')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-2 w-64">
            <TabsTrigger value="brand" data-testid="tab-brand-media">Brand Media</TabsTrigger>
            <TabsTrigger value="library" data-testid="tab-asset-library">Asset Library</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-3 py-3 border-b mt-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-assets"
              />
            </div>
            
            <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'images' | 'videos')}>
              <SelectTrigger className="w-32" data-testid="select-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="images">Images Only</SelectItem>
                <SelectItem value="videos">Videos Only</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-36" data-testid="select-category-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="logo">Logos</SelectItem>
                <SelectItem value="product">Products</SelectItem>
                <SelectItem value="location">Locations</SelectItem>
                <SelectItem value="brand">Brand</SelectItem>
                <SelectItem value="service">Services</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-1 overflow-hidden mt-3">
            <div className="flex-1 overflow-y-auto pr-2">
              {isLoading ? (
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                  Loading assets...
                </div>
              ) : filteredAssets.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Folder className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No assets found.</p>
                  <p className="text-sm mt-1">Upload brand media to get started.</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      className={`
                        relative aspect-video rounded-lg overflow-hidden cursor-pointer
                        border-2 transition-all hover:shadow-md
                        ${selectedAsset?.id === asset.id 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-transparent hover:border-muted-foreground/30'}
                      `}
                      onClick={() => setSelectedAsset(asset)}
                      data-testid={`asset-${asset.id}`}
                    >
                      <img
                        src={asset.thumbnailUrl || asset.url}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                      />
                      
                      <div className="absolute top-2 left-2">
                        {isVideoAsset(asset) ? (
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
                      
                      {asset.isDefault && (
                        <div className="absolute top-2 right-2">
                          <Star className="h-4 w-4 text-yellow-400" fill="currentColor" />
                        </div>
                      )}
                      
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <span className="text-xs text-white truncate block">{asset.name}</span>
                        {asset.entityName && (
                          <span className="text-[10px] text-white/70">{asset.entityName}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {selectedAsset && !isVideoAsset(selectedAsset) && (
              <div className="w-72 border-l pl-4 space-y-4 overflow-y-auto">
                <h4 className="font-medium flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  Animation Settings
                </h4>
                
                <Card>
                  <CardContent className="p-3 space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Animation Type</Label>
                      <Select
                        value={animationSettings.type}
                        onValueChange={(v) => setAnimationSettings({ ...animationSettings, type: v as AnimationType })}
                      >
                        <SelectTrigger data-testid="select-animation-type">
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
                      <Label className="text-xs text-muted-foreground">Intensity</Label>
                      <Select
                        value={animationSettings.intensity}
                        onValueChange={(v) => setAnimationSettings({ ...animationSettings, intensity: v as AnimationIntensity })}
                      >
                        <SelectTrigger data-testid="select-animation-intensity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subtle">Subtle</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="dramatic">Dramatic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {(animationSettings.type === 'ken-burns' || animationSettings.type === 'zoom-in' || animationSettings.type === 'zoom-out') && (
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Focus Point</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-muted-foreground">X: {animationSettings.focusPoint?.x ?? 50}%</span>
                            <Slider
                              value={[animationSettings.focusPoint?.x ?? 50]}
                              onValueChange={([v]) => setAnimationSettings({
                                ...animationSettings,
                                focusPoint: { x: v, y: animationSettings.focusPoint?.y ?? 50 }
                              })}
                              min={0}
                              max={100}
                              step={5}
                              data-testid="slider-focus-x"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">Y: {animationSettings.focusPoint?.y ?? 50}%</span>
                            <Slider
                              value={[animationSettings.focusPoint?.y ?? 50]}
                              onValueChange={([v]) => setAnimationSettings({
                                ...animationSettings,
                                focusPoint: { x: animationSettings.focusPoint?.x ?? 50, y: v }
                              })}
                              min={0}
                              max={100}
                              step={5}
                              data-testid="slider-focus-y"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="aspect-video bg-muted rounded overflow-hidden relative">
                      <img
                        src={selectedAsset.thumbnailUrl || selectedAsset.url}
                        alt="Preview"
                        className={`w-full h-full object-cover animate-${animationSettings.type}-${animationSettings.intensity}`}
                      />
                      {animationSettings.focusPoint && animationSettings.type !== 'static' && (
                        <div
                          className="absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-md pointer-events-none"
                          style={{
                            left: `${animationSettings.focusPoint.x}%`,
                            top: `${animationSettings.focusPoint.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        />
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      {getAnimationDescription(animationSettings.type)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            {selectedAsset && isVideoAsset(selectedAsset) && (
              <div className="w-72 border-l pl-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Video Preview
                </h4>
                
                <Card>
                  <CardContent className="p-3 space-y-3">
                    <div className="aspect-video bg-muted rounded overflow-hidden">
                      <video
                        src={selectedAsset.url}
                        className="w-full h-full object-cover"
                        controls
                        muted
                      />
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Duration:</span>
                        <span>{formatDuration(selectedAsset.duration)}</span>
                      </div>
                      {selectedAsset.width && selectedAsset.height && (
                        <div className="flex justify-between">
                          <span>Resolution:</span>
                          <span>{selectedAsset.width}x{selectedAsset.height}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </Tabs>
        
        <div className="flex justify-between items-center pt-4 border-t mt-auto">
          <div className="text-sm text-muted-foreground">
            {selectedAsset ? (
              <span className="flex items-center gap-2">
                <Image className="h-4 w-4" />
                Selected: <strong>{selectedAsset.name}</strong>
              </span>
            ) : 'No asset selected'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleSelect} disabled={!selectedAsset} data-testid="button-use-asset">
              Use This Asset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
