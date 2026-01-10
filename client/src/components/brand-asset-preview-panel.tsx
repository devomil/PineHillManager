import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Package, Star, MapPin, RefreshCw, Check, X, 
  Image as ImageIcon, ChevronDown, ChevronUp, Eye
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandMediaSelector, BrandAsset } from "./brand-media-selector";

interface MatchedAsset {
  id: number;
  name: string;
  url: string;
  thumbnailUrl?: string;
  mediaType: string;
  entityType?: string;
  matchScore?: number;
  matchReason?: string;
}

interface BrandAssetPreviewPanelProps {
  products: MatchedAsset[];
  logos: MatchedAsset[];
  locations: MatchedAsset[];
  isLoading?: boolean;
  onSwapAsset?: (category: 'products' | 'logos' | 'locations', oldId: number, newAsset: BrandAsset) => void;
  onRemoveAsset?: (category: 'products' | 'logos' | 'locations', assetId: number) => void;
  compact?: boolean;
}

function AssetCard({ 
  asset, 
  category,
  onSwap,
  onRemove,
}: { 
  asset: MatchedAsset;
  category: 'products' | 'logos' | 'locations';
  onSwap?: (asset: BrandAsset) => void;
  onRemove?: () => void;
}) {
  const [showSelector, setShowSelector] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  const thumbnailUrl = asset.thumbnailUrl || asset.url;
  const isValidUrl = thumbnailUrl && (thumbnailUrl.startsWith('http') || thumbnailUrl.startsWith('/'));

  return (
    <>
      <div className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors group">
        <div 
          className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
          onClick={() => setPreviewOpen(true)}
        >
          {isValidUrl ? (
            <img 
              src={thumbnailUrl} 
              alt={asset.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">{asset.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="outline" className="text-xs">
              {asset.mediaType}
            </Badge>
            {asset.matchScore && (
              <span className="text-xs text-muted-foreground">
                {Math.round(asset.matchScore * 100)}% match
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onSwap && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setShowSelector(true)}
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          )}
          {onRemove && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      <BrandMediaSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onSelect={(newAsset) => {
          onSwap?.(newAsset);
          setShowSelector(false);
        }}
        currentAssetId={asset.id}
      />
      
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{asset.name}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            {isValidUrl ? (
              <img 
                src={asset.url} 
                alt={asset.name}
                className="max-h-[60vh] object-contain rounded-lg"
              />
            ) : (
              <div className="w-full h-64 bg-muted flex items-center justify-center rounded-lg">
                <ImageIcon className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function AssetSection({
  title,
  icon: Icon,
  assets,
  category,
  onSwap,
  onRemove,
  defaultExpanded = true,
}: {
  title: string;
  icon: typeof Package;
  assets: MatchedAsset[];
  category: 'products' | 'logos' | 'locations';
  onSwap?: (oldId: number, newAsset: BrandAsset) => void;
  onRemove?: (assetId: number) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  if (assets.length === 0) {
    return null;
  }
  
  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-foreground/80"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span>{title}</span>
          <Badge variant="secondary" className="text-xs">{assets.length}</Badge>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      {expanded && (
        <div className="space-y-2 mt-2">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              category={category}
              onSwap={onSwap ? (newAsset) => onSwap(asset.id, newAsset) : undefined}
              onRemove={onRemove ? () => onRemove(asset.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function BrandAssetPreviewPanel({
  products,
  logos,
  locations,
  isLoading,
  onSwapAsset,
  onRemoveAsset,
  compact = false,
}: BrandAssetPreviewPanelProps) {
  const totalAssets = products.length + logos.length + locations.length;
  
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader className="py-3">
          <div className="h-5 w-40 bg-gray-200 rounded" />
        </CardHeader>
        <CardContent className="py-3">
          <div className="space-y-3">
            <div className="h-14 bg-gray-100 rounded" />
            <div className="h-14 bg-gray-100 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (totalAssets === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center">
          <Package className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No brand assets detected for this scene
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Standard AI generation will be used
          </p>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        {products.length > 0 && (
          <Badge variant="outline" className="bg-blue-50">
            <Package className="w-3 h-3 mr-1" />
            {products.length} product{products.length > 1 ? 's' : ''}
          </Badge>
        )}
        {logos.length > 0 && (
          <Badge variant="outline" className="bg-green-50">
            <Star className="w-3 h-3 mr-1" />
            {logos.length} logo{logos.length > 1 ? 's' : ''}
          </Badge>
        )}
        {locations.length > 0 && (
          <Badge variant="outline" className="bg-amber-50">
            <MapPin className="w-3 h-3 mr-1" />
            {locations.length} location{locations.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Matched Brand Assets
          </CardTitle>
          <Badge variant="secondary">{totalAssets} asset{totalAssets > 1 ? 's' : ''}</Badge>
        </div>
      </CardHeader>
      <Separator />
      <CardContent className="py-3 px-4">
        <ScrollArea className="max-h-80">
          <div className="space-y-4">
            <AssetSection
              title="Products"
              icon={Package}
              assets={products}
              category="products"
              onSwap={onSwapAsset ? (oldId, newAsset) => onSwapAsset('products', oldId, newAsset) : undefined}
              onRemove={onRemoveAsset ? (assetId) => onRemoveAsset('products', assetId) : undefined}
            />
            
            <AssetSection
              title="Logos"
              icon={Star}
              assets={logos}
              category="logos"
              onSwap={onSwapAsset ? (oldId, newAsset) => onSwapAsset('logos', oldId, newAsset) : undefined}
              onRemove={onRemoveAsset ? (assetId) => onRemoveAsset('logos', assetId) : undefined}
            />
            
            <AssetSection
              title="Locations"
              icon={MapPin}
              assets={locations}
              category="locations"
              onSwap={onSwapAsset ? (oldId, newAsset) => onSwapAsset('locations', oldId, newAsset) : undefined}
              onRemove={onRemoveAsset ? (assetId) => onRemoveAsset('locations', assetId) : undefined}
              defaultExpanded={products.length === 0 && logos.length === 0}
            />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function BrandAssetSummary({ 
  products, 
  logos, 
  locations 
}: { 
  products: number; 
  logos: number; 
  locations: number;
}) {
  const total = products + logos + locations;
  
  if (total === 0) {
    return (
      <span className="text-xs text-muted-foreground">No brand assets</span>
    );
  }
  
  return (
    <div className="flex items-center gap-1.5 text-xs">
      {products > 0 && (
        <span className="flex items-center text-blue-600">
          <Package className="w-3 h-3 mr-0.5" />
          {products}
        </span>
      )}
      {logos > 0 && (
        <span className="flex items-center text-green-600">
          <Star className="w-3 h-3 mr-0.5" />
          {logos}
        </span>
      )}
      {locations > 0 && (
        <span className="flex items-center text-amber-600">
          <MapPin className="w-3 h-3 mr-0.5" />
          {locations}
        </span>
      )}
    </div>
  );
}
