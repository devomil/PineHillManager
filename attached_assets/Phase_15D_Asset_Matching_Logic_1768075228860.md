# Phase 15D: Asset Matching Logic Rewrite

## Objective

Replace the current keyword-string-based asset matching with taxonomy-based matching that uses `promptKeywords` from asset type definitions. This is the core fix that ensures the correct brand assets are matched to visual directions.

---

## Prerequisites

- Phase 15A complete (database columns exist)
- Phase 15B complete (asset type configuration exists)
- Phase 15C complete (assets can be classified via UI)
- **At least some assets have been classified** (have `assetType` values)

---

## Current Problem

The current matching logic:

```typescript
// CURRENT (BROKEN) - searches manual keyword strings
function findMatchingAssets(visualDirection: string, assets: BrandAsset[]) {
  return assets.filter(asset => {
    const keywords = (asset.matchKeywords || '').toLowerCase().split(',');
    return keywords.some(kw => visualDirection.toLowerCase().includes(kw.trim()));
  });
}
```

**Why it fails:**
- "consultation space" doesn't match "photo" type
- Manual keywords are inconsistent or missing
- No understanding of asset PURPOSE

---

## New Matching Logic

### Step 1: Find Matching Asset Types

First, determine which asset TYPES match the visual direction:

```typescript
// server/services/asset-matcher.ts

import { 
  BRAND_ASSET_TYPES, 
  findMatchingAssetTypes,
  getAssetType,
} from '@/shared/config/brand-asset-types';

interface AssetMatch {
  asset: BrandAsset;
  assetTypeDefinition: AssetTypeDefinition;
  matchScore: number;
  matchedKeywords: string[];
  matchReason: string;
}

/**
 * Find brand assets that match a visual direction
 */
export async function findMatchingBrandAssets(
  projectId: string,
  visualDirection: string
): Promise<AssetMatch[]> {
  
  // Step 1: Find which asset TYPES match the visual direction
  const matchingTypeIds = findMatchingAssetTypes(visualDirection);
  
  if (matchingTypeIds.length === 0) {
    console.log('[AssetMatcher] No asset types match visual direction');
    return [];
  }
  
  console.log('[AssetMatcher] Matching asset types:', matchingTypeIds.slice(0, 5));
  
  // Step 2: Fetch assets that have those types
  const assets = await db.query.brandAssets.findMany({
    where: and(
      eq(brandAssets.projectId, projectId),
      inArray(brandAssets.assetType, matchingTypeIds)
    ),
  });
  
  if (assets.length === 0) {
    console.log('[AssetMatcher] No assets found with matching types');
    return [];
  }
  
  // Step 3: Score each asset
  const matches: AssetMatch[] = [];
  const lowerDirection = visualDirection.toLowerCase();
  
  for (const asset of assets) {
    const typeDef = getAssetType(asset.assetType);
    if (!typeDef) continue;
    
    // Calculate score based on keyword matches
    let score = 0;
    const matchedKeywords: string[] = [];
    
    for (const keyword of typeDef.promptKeywords) {
      if (lowerDirection.includes(keyword.toLowerCase())) {
        score += keyword.length; // Longer keywords = more specific = higher score
        matchedKeywords.push(keyword);
      }
    }
    
    // Bonus for exact asset name match
    if (asset.name && lowerDirection.includes(asset.name.toLowerCase())) {
      score += 50;
      matchedKeywords.push(`name: ${asset.name}`);
    }
    
    // Bonus for entity name match
    if (asset.entityName && lowerDirection.includes(asset.entityName.toLowerCase())) {
      score += 40;
      matchedKeywords.push(`entity: ${asset.entityName}`);
    }
    
    // Position bonus based on type priority in matchingTypeIds
    const typeIndex = matchingTypeIds.indexOf(asset.assetType);
    if (typeIndex >= 0) {
      score += Math.max(0, 20 - typeIndex * 2); // First type = +20, second = +18, etc.
    }
    
    const matchReason = `Matched ${typeDef.label} via keywords: ${matchedKeywords.join(', ')}`;
    
    matches.push({
      asset,
      assetTypeDefinition: typeDef,
      matchScore: score,
      matchedKeywords,
      matchReason,
    });
  }
  
  // Step 4: Sort by score descending
  matches.sort((a, b) => b.matchScore - a.matchScore);
  
  console.log(`[AssetMatcher] Found ${matches.length} matching assets`);
  matches.slice(0, 3).forEach(m => {
    console.log(`  - ${m.asset.name} (${m.asset.assetType}): score ${m.matchScore}`);
  });
  
  return matches;
}
```

---

### Step 2: Group Matches by Category

For the UI, group matches by category:

```typescript
// server/services/asset-matcher.ts (continued)

interface GroupedAssetMatches {
  category: AssetCategory;
  categoryLabel: string;
  assets: AssetMatch[];
}

/**
 * Group matched assets by category for UI display
 */
export function groupMatchesByCategory(matches: AssetMatch[]): GroupedAssetMatches[] {
  const groups = new Map<AssetCategory, AssetMatch[]>();
  
  for (const match of matches) {
    const category = match.assetTypeDefinition.category;
    const existing = groups.get(category) || [];
    existing.push(match);
    groups.set(category, existing);
  }
  
  // Convert to array with labels
  const result: GroupedAssetMatches[] = [];
  
  for (const [categoryId, categoryMatches] of groups) {
    const categoryDef = ASSET_CATEGORIES.find(c => c.id === categoryId);
    result.push({
      category: categoryId,
      categoryLabel: categoryDef?.label || categoryId,
      assets: categoryMatches,
    });
  }
  
  // Sort categories by total match score
  result.sort((a, b) => {
    const scoreA = a.assets.reduce((sum, m) => sum + m.matchScore, 0);
    const scoreB = b.assets.reduce((sum, m) => sum + m.matchScore, 0);
    return scoreB - scoreA;
  });
  
  return result;
}
```

---

### Step 3: API Endpoint

Create/update the endpoint that the scene editor calls:

```typescript
// server/routes/asset-matching.ts

import { findMatchingBrandAssets, groupMatchesByCategory } from '../services/asset-matcher';

router.post('/match', async (req, res) => {
  const { projectId, visualDirection } = req.body;
  
  if (!projectId || !visualDirection) {
    return res.status(400).json({ error: 'projectId and visualDirection required' });
  }
  
  try {
    const matches = await findMatchingBrandAssets(projectId, visualDirection);
    const grouped = groupMatchesByCategory(matches);
    
    // Calculate total match count
    const totalMatches = matches.length;
    
    // Determine if we should use Brand Asset Workflow
    const hasBrandAssets = totalMatches > 0;
    const hasLocationAsset = matches.some(m => m.assetTypeDefinition.category === 'location');
    const hasProductAsset = matches.some(m => m.assetTypeDefinition.category === 'products');
    
    res.json({
      totalMatches,
      hasBrandAssets,
      hasLocationAsset,
      hasProductAsset,
      groupedMatches: grouped,
      
      // Flat list for backward compatibility
      matches: matches.map(m => ({
        assetId: m.asset.id,
        assetName: m.asset.name,
        assetType: m.asset.assetType,
        assetTypeLabel: m.assetTypeDefinition.label,
        category: m.assetTypeDefinition.category,
        fileUrl: m.asset.fileUrl,
        thumbnailUrl: m.asset.thumbnailUrl,
        matchScore: m.matchScore,
        matchReason: m.matchReason,
      })),
    });
  } catch (error) {
    console.error('Asset matching failed:', error);
    res.status(500).json({ error: 'Asset matching failed' });
  }
});
```

---

### Step 4: Update Scene Editor to Use New Matching

The scene editor should call the new endpoint when visual direction changes:

```typescript
// client/src/components/scene-editor/useAssetMatching.ts

import { useQuery } from '@tanstack/react-query';

interface MatchedAsset {
  assetId: string;
  assetName: string;
  assetType: string;
  assetTypeLabel: string;
  category: string;
  fileUrl: string;
  thumbnailUrl?: string;
  matchScore: number;
  matchReason: string;
}

interface GroupedMatches {
  category: string;
  categoryLabel: string;
  assets: MatchedAsset[];
}

interface AssetMatchResult {
  totalMatches: number;
  hasBrandAssets: boolean;
  hasLocationAsset: boolean;
  hasProductAsset: boolean;
  groupedMatches: GroupedMatches[];
  matches: MatchedAsset[];
}

export function useAssetMatching(projectId: string, visualDirection: string) {
  return useQuery<AssetMatchResult>({
    queryKey: ['asset-matching', projectId, visualDirection],
    queryFn: async () => {
      const response = await fetch('/api/asset-matching/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, visualDirection }),
      });
      
      if (!response.ok) {
        throw new Error('Asset matching failed');
      }
      
      return response.json();
    },
    enabled: !!projectId && !!visualDirection && visualDirection.length > 10,
    staleTime: 30000, // Cache for 30 seconds
  });
}
```

---

### Step 5: Display Matched Assets in Scene Editor

Update the "Matched Brand Assets" section:

```tsx
// client/src/components/scene-editor/MatchedBrandAssetsSection.tsx

import React from 'react';
import { Package, MapPin, Users, Sparkles, BadgeCheck, Stethoscope } from 'lucide-react';
import { useAssetMatching } from './useAssetMatching';

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  products: Package,
  location: MapPin,
  people: Users,
  logos: Sparkles,
  trust: BadgeCheck,
  services: Stethoscope,
};

interface Props {
  projectId: string;
  visualDirection: string;
}

export function MatchedBrandAssetsSection({ projectId, visualDirection }: Props) {
  const { data, isLoading, error } = useAssetMatching(projectId, visualDirection);
  
  if (isLoading) {
    return <div className="text-gray-500 text-sm">Finding matching assets...</div>;
  }
  
  if (error || !data) {
    return <div className="text-red-500 text-sm">Failed to match assets</div>;
  }
  
  if (data.totalMatches === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg text-center">
        <div className="text-gray-400 text-sm">No brand assets detected for this scene</div>
        <div className="text-gray-400 text-xs mt-1">Standard AI generation will be used</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium">Matched Brand Assets</span>
        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
          {data.totalMatches} {data.totalMatches === 1 ? 'asset' : 'assets'}
        </span>
      </div>
      
      {data.groupedMatches.map((group) => {
        const Icon = CATEGORY_ICONS[group.category] || Package;
        
        return (
          <div key={group.category} className="border rounded-lg overflow-hidden">
            {/* Category Header */}
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
              <Icon className="w-4 h-4 text-gray-600" />
              <span className="font-medium text-sm">{group.categoryLabel}</span>
              <span className="text-xs text-gray-500 ml-auto">
                {group.assets.length}
              </span>
            </div>
            
            {/* Assets List */}
            <div className="divide-y">
              {group.assets.map((match) => (
                <div key={match.assetId} className="flex items-center gap-3 p-2">
                  {/* Thumbnail */}
                  <div className="w-12 h-12 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                    {match.thumbnailUrl ? (
                      <img
                        src={match.thumbnailUrl}
                        alt={match.assetName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Icon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{match.assetName}</div>
                    <div className="text-xs text-gray-500">{match.assetTypeLabel}</div>
                  </div>
                  
                  {/* Match Score */}
                  <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    {Math.round((match.matchScore / 100) * 100)}% match
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

---

## Testing

### Test Case 1: Consultation Space

**Visual Direction:** "Welcoming Pine Hill Farm consultation space with warm lighting, natural wood furniture, plants"

**Before (Broken):**
- Matches random "Pine Hill Farm 2" (farm field with rainbow)

**After (Fixed):**
- Should match `location-interior-workspace` type
- Should find "Pine Hill Farm Interior" asset
- Match reason: "Matched Interior Workspace via keywords: consultation space, interior, warm interior"

### Test Case 2: BioScan Equipment

**Visual Direction:** "BioScan equipment in warm wellness space, lab materials"

**Before (Broken):**
- Only matches "Pine Hill Farm Products" generically

**After (Fixed):**
- Should match `service-bioscan-device` type
- Should find "Pine Hill Farm BioScan SRT" asset
- Match reason: "Matched BioScan SRT Device via keywords: bioscan, bioscan equipment"

### Test Case 3: Product Display with Logo

**Visual Direction:** "Pine Hill Farm products arranged beautifully with PHF logo visible"

**Before (Broken):**
- Matches some assets but generates wrong image

**After (Fixed):**
- Should match `product-hero-group` → "Pine Hill Farm Products"
- Should match `logo-primary-color` → "Pine Hill Farm logo"
- Both assets returned with appropriate scores

---

## Fallback for Legacy Assets

If an asset has no `assetType` yet, fall back to name matching:

```typescript
// Add to findMatchingBrandAssets function

// Also check legacy assets without assetType
const legacyAssets = await db.query.brandAssets.findMany({
  where: and(
    eq(brandAssets.projectId, projectId),
    isNull(brandAssets.assetType)
  ),
});

for (const asset of legacyAssets) {
  // Simple name matching for legacy assets
  if (asset.name && lowerDirection.includes(asset.name.toLowerCase())) {
    matches.push({
      asset,
      assetTypeDefinition: null,
      matchScore: 10, // Low score since no type info
      matchedKeywords: [`name: ${asset.name}`],
      matchReason: `Legacy asset matched by name (needs classification)`,
    });
  }
}
```

---

## Success Criteria

Phase 15D is complete when:

1. ✅ `findMatchingBrandAssets()` uses `promptKeywords` from asset types
2. ✅ "consultation space" matches `location-interior-workspace` assets
3. ✅ "BioScan" matches `service-bioscan-device` assets
4. ✅ Matched assets grouped by category in UI
5. ✅ Match scores displayed correctly
6. ✅ Scene editor shows correct matched assets
7. ✅ Legacy assets still match by name (with low score)

---

## Next Step

Proceed to **Phase 15E: I2V Trigger for Brand Assets**
