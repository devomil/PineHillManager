# Phase 11E: Asset Library Integration

## Objective

Enable users to browse, search, and re-use previously generated AI assets across projects. The Asset Library stores:
- All AI-generated images from past projects
- All AI-generated videos from past projects
- Favorited/starred assets
- Organized by project, date, and tags

## Why Asset Library Matters

1. **Cost Savings** - Re-use successful generations instead of generating new ones
2. **Consistency** - Use the same visual for recurring content
3. **Speed** - Skip generation time for scenes using existing assets
4. **Quality Control** - Only save assets that passed QA

## Database Schema

```sql
CREATE TABLE asset_library (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id),
  project_id INTEGER REFERENCES projects(id),
  scene_id INTEGER REFERENCES scenes(id),
  
  asset_url TEXT NOT NULL,
  thumbnail_url TEXT,
  asset_type TEXT NOT NULL, -- 'image' | 'video'
  provider TEXT, -- 'kling' | 'runway' | 'flux' | 'falai'
  
  prompt TEXT,
  visual_direction TEXT,
  duration FLOAT,
  width INTEGER,
  height INTEGER,
  
  quality_score INTEGER,
  is_favorite BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  content_type TEXT, -- 'person' | 'product' | 'nature' | 'abstract'
  
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP,
  use_count INTEGER DEFAULT 1
);
```

## API Endpoints

```typescript
// server/routes/asset-library-routes.ts

// Get assets with filters
router.get('/api/organizations/:orgId/asset-library', async (req, res) => {
  const { orgId } = req.params;
  const { type, provider, contentType, favorite, search, limit = 50, offset = 0 } = req.query;
  
  const assets = await db.select()
    .from(assetLibrary)
    .where(eq(assetLibrary.organizationId, parseInt(orgId)))
    .limit(parseInt(limit))
    .offset(parseInt(offset))
    .orderBy(desc(assetLibrary.createdAt));
  
  res.json(assets);
});

// Toggle favorite
router.post('/api/asset-library/:id/favorite', async (req, res) => {
  const { id } = req.params;
  const asset = await db.select().from(assetLibrary).where(eq(assetLibrary.id, parseInt(id)));
  
  await db.update(assetLibrary)
    .set({ isFavorite: !asset[0].isFavorite })
    .where(eq(assetLibrary.id, parseInt(id)));
  
  res.json({ success: true });
});

// Add tags
router.post('/api/asset-library/:id/tags', async (req, res) => {
  const { id } = req.params;
  const { tags } = req.body;
  
  await db.update(assetLibrary)
    .set({ tags })
    .where(eq(assetLibrary.id, parseInt(id)));
  
  res.json({ success: true });
});

// Use asset in scene (increment use count)
router.post('/api/asset-library/:id/use', async (req, res) => {
  const { id } = req.params;
  
  await db.update(assetLibrary)
    .set({ 
      useCount: sql`use_count + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(assetLibrary.id, parseInt(id)));
  
  res.json({ success: true });
});
```

## Auto-Save After QA Pass

```typescript
// server/services/asset-library-service.ts

export async function saveToLibrary(scene: Scene, project: Project): Promise<void> {
  // Only save if quality score >= 70
  if (!scene.analysisResult || scene.analysisResult.overallScore < 70) {
    return;
  }
  
  const assetUrl = scene.videoUrl || scene.imageUrl;
  if (!assetUrl) return;
  
  // Check if already in library
  const existing = await db.select()
    .from(assetLibrary)
    .where(eq(assetLibrary.assetUrl, assetUrl));
  
  if (existing.length > 0) return;
  
  // Detect content type from analysis
  const contentType = detectContentType(scene.analysisResult);
  
  // Generate thumbnail for video
  const thumbnailUrl = scene.videoUrl 
    ? await generateVideoThumbnail(scene.videoUrl)
    : scene.imageUrl;
  
  await db.insert(assetLibrary).values({
    organizationId: project.organizationId,
    projectId: project.id,
    sceneId: scene.id,
    assetUrl,
    thumbnailUrl,
    assetType: scene.videoUrl ? 'video' : 'image',
    provider: scene.provider,
    prompt: scene.sanitizedPrompt,
    visualDirection: scene.visualDirection,
    duration: scene.duration,
    qualityScore: scene.analysisResult.overallScore,
    contentType,
    tags: generateAutoTags(scene),
  });
}

function detectContentType(analysis: any): string {
  if (analysis.contentMatchDetails?.presentElements?.some((e: string) => 
    e.toLowerCase().includes('person') || e.toLowerCase().includes('face')
  )) {
    return 'person';
  }
  if (analysis.contentMatchDetails?.presentElements?.some((e: string) => 
    e.toLowerCase().includes('product')
  )) {
    return 'product';
  }
  if (analysis.contentMatchDetails?.presentElements?.some((e: string) => 
    e.toLowerCase().includes('nature') || e.toLowerCase().includes('plant')
  )) {
    return 'nature';
  }
  return 'other';
}

function generateAutoTags(scene: Scene): string[] {
  const tags: string[] = [];
  
  // Add scene type as tag
  if (scene.type) tags.push(scene.type);
  
  // Add provider
  if (scene.provider) tags.push(scene.provider);
  
  // Extract keywords from visual direction
  const keywords = ['wellness', 'health', 'nature', 'professional', 'kitchen', 'office'];
  for (const keyword of keywords) {
    if (scene.visualDirection?.toLowerCase().includes(keyword)) {
      tags.push(keyword);
    }
  }
  
  return [...new Set(tags)];
}
```

## Asset Library Browser Component

```tsx
// client/src/components/asset-library-browser.tsx

import React, { useState, useEffect } from 'react';
import { Star, Search, Filter, Grid, List, Play, Image, Tag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LibraryAsset {
  id: number;
  assetUrl: string;
  thumbnailUrl: string;
  assetType: 'image' | 'video';
  provider: string;
  visualDirection: string;
  qualityScore: number;
  isFavorite: boolean;
  tags: string[];
  contentType: string;
  createdAt: string;
  useCount: number;
}

interface AssetLibraryBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: LibraryAsset, animationSettings?: any) => void;
  organizationId: number;
}

export const AssetLibraryBrowser: React.FC<AssetLibraryBrowserProps> = ({
  isOpen,
  onClose,
  onSelect,
  organizationId,
}) => {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'image' | 'video'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<LibraryAsset | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  useEffect(() => {
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen, searchQuery, typeFilter, showFavoritesOnly]);
  
  const fetchAssets = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      type: typeFilter,
      favorite: showFavoritesOnly.toString(),
      search: searchQuery,
    });
    
    const response = await fetch(
      `/api/organizations/${organizationId}/asset-library?${params}`
    );
    const data = await response.json();
    setAssets(data);
    setLoading(false);
  };
  
  const toggleFavorite = async (assetId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/asset-library/${assetId}/favorite`, { method: 'POST' });
    setAssets(assets.map(a => 
      a.id === assetId ? { ...a, isFavorite: !a.isFavorite } : a
    ));
  };
  
  const handleSelect = () => {
    if (selectedAsset) {
      // Track usage
      fetch(`/api/asset-library/${selectedAsset.id}/use`, { method: 'POST' });
      
      // For images, ask about animation
      if (selectedAsset.assetType === 'image') {
        onSelect(selectedAsset, {
          type: 'ken-burns',
          intensity: 'subtle',
        });
      } else {
        onSelect(selectedAsset);
      }
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Asset Library</DialogTitle>
        </DialogHeader>
        
        {/* Toolbar */}
        <div className="flex gap-3 py-3 border-b">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={typeFilter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('all')}
            >
              All
            </Button>
            <Button
              variant={typeFilter === 'image' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('image')}
            >
              <Image className="h-4 w-4 mr-1" /> Images
            </Button>
            <Button
              variant={typeFilter === 'video' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTypeFilter('video')}
            >
              <Play className="h-4 w-4 mr-1" /> Videos
            </Button>
          </div>
          
          <Button
            variant={showFavoritesOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={`h-4 w-4 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            Favorites
          </Button>
          
          <div className="flex border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Asset Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              No assets found. Generate some videos to build your library!
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-4 gap-4">
              {assets.map(asset => (
                <div
                  key={asset.id}
                  className={`
                    relative aspect-video rounded-lg overflow-hidden cursor-pointer
                    border-2 transition-all group
                    ${selectedAsset?.id === asset.id 
                      ? 'border-blue-500 ring-2 ring-blue-200' 
                      : 'border-transparent hover:border-gray-300'}
                  `}
                  onClick={() => setSelectedAsset(asset)}
                >
                  <img
                    src={asset.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    {asset.assetType === 'video' ? (
                      <Badge className="bg-black/60">
                        <Play className="h-3 w-3 mr-1" fill="white" />
                        Video
                      </Badge>
                    ) : (
                      <Badge className="bg-black/60">
                        <Image className="h-3 w-3 mr-1" />
                        Image
                      </Badge>
                    )}
                  </div>
                  
                  {/* Quality score */}
                  <div className="absolute top-2 right-8">
                    <Badge className={
                      asset.qualityScore >= 85 ? 'bg-green-500' :
                      asset.qualityScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                    }>
                      Q: {asset.qualityScore}
                    </Badge>
                  </div>
                  
                  {/* Favorite button */}
                  <button
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/40 hover:bg-black/60"
                    onClick={(e) => toggleFavorite(asset.id, e)}
                  >
                    <Star 
                      className={`h-4 w-4 ${asset.isFavorite ? 'text-yellow-400 fill-current' : 'text-white'}`} 
                    />
                  </button>
                  
                  {/* Provider badge */}
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="outline" className="bg-white/80 text-xs">
                      {asset.provider}
                    </Badge>
                  </div>
                  
                  {/* Use count */}
                  {asset.useCount > 1 && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="outline" className="bg-white/80 text-xs">
                        Used {asset.useCount}x
                      </Badge>
                    </div>
                  )}
                  
                  {/* Hover overlay with description */}
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                    <p className="text-white text-xs line-clamp-3">
                      {asset.visualDirection}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {asset.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List view */
            <div className="space-y-2">
              {assets.map(asset => (
                <div
                  key={asset.id}
                  className={`
                    flex items-center gap-4 p-3 rounded-lg cursor-pointer
                    border-2 transition-all
                    ${selectedAsset?.id === asset.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-transparent hover:bg-gray-50'}
                  `}
                  onClick={() => setSelectedAsset(asset)}
                >
                  <img
                    src={asset.thumbnailUrl}
                    alt=""
                    className="w-24 h-14 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{asset.visualDirection}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{asset.provider}</Badge>
                      <Badge variant="outline" className="text-xs">{asset.assetType}</Badge>
                      <span className="text-xs text-gray-400">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {new Date(asset.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Badge className={
                    asset.qualityScore >= 85 ? 'bg-green-500' : 'bg-yellow-500'
                  }>
                    Q: {asset.qualityScore}
                  </Badge>
                  <button onClick={(e) => toggleFavorite(asset.id, e)}>
                    <Star className={`h-5 w-5 ${asset.isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            {assets.length} assets in library
            {selectedAsset && ` • Selected: ${selectedAsset.assetType}`}
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
```

## Integration with Scene Editor

```tsx
// In scene-editor-modal.tsx

// When user clicks "Asset Library" in provider selection:
{selectedSource === 'asset_library' && (
  <AssetLibraryBrowser
    isOpen={showAssetLibrary}
    onClose={() => setShowAssetLibrary(false)}
    onSelect={(asset, animation) => {
      updateScene(scene.id, {
        mediaSource: 'library',
        libraryAssetId: asset.id,
        imageUrl: asset.assetType === 'image' ? asset.assetUrl : undefined,
        videoUrl: asset.assetType === 'video' ? asset.assetUrl : undefined,
        animationSettings: animation,
      });
      setShowAssetLibrary(false);
    }}
    organizationId={project.organizationId}
  />
)}
```

## Verification Checklist

- [ ] Assets auto-save to library after QA pass (score ≥ 70)
- [ ] Asset Library browser opens from scene editor
- [ ] Can filter by type (image/video)
- [ ] Can filter favorites
- [ ] Can search by description
- [ ] Can toggle favorite on assets
- [ ] Quality score displayed on each asset
- [ ] Provider badge shown
- [ ] Use count tracked
- [ ] Can select asset and apply to scene
- [ ] Animation settings offered for images
- [ ] Grid and list views work
- [ ] Tags displayed and auto-generated

## Phase 11 Complete Summary

| Sub-Phase | What It Does |
|-----------|--------------|
| **11A** | Sanitize AI prompts to remove text/logo requests |
| **11B** | Build Remotion overlay components (text, logo, watermark, lower third) |
| **11C** | Add UI controls for configuring overlays |
| **11D** | Ken Burns animation for brand media images |
| **11E** | Asset library for re-using past generations |

After Phase 11:
- AI generates clean backgrounds (no baked-in text)
- Text overlays added via Remotion (editable, styled)
- Real brand logos injected (not AI-generated fakes)
- Watermarks applied consistently
- Brand media animated with Ken Burns
- Past assets easily re-used
