# Phase 15C: Edit Asset Modal UI Update

## Objective

Replace the current Edit Brand Asset modal with a new version that uses Category → Asset Type dropdowns instead of manual keyword entry. This will allow users to properly classify their uploaded assets.

---

## Prerequisites

- Phase 15A complete (database columns exist)
- Phase 15B complete (asset type configuration file exists)

---

## Current UI Problems

The current Edit Brand Asset modal has:

| Field | Problem |
|-------|---------|
| `Match Keywords` | Users must guess what keywords to enter |
| `Usage Contexts` | Vague, inconsistent entries |
| `Media Type` | Too generic (photo/logo/video) |
| `Entity Type` | Doesn't map to actual asset purposes |

---

## New UI Design

### Fields to REMOVE

```
❌ Match Keywords (text input)
❌ Usage Contexts (text input)  
❌ Media Type dropdown
❌ Entity Type dropdown
```

### Fields to ADD

```
✅ Category dropdown (8 options)
✅ Asset Type dropdown (filtered by category)
✅ Asset Type description (read-only, shows below dropdown)
✅ Auto-match keywords preview (read-only, shows what will match)
```

### Fields to KEEP

```
✅ Name (text input)
✅ Description (text area, optional)
✅ Entity Name (conditional - only for people/products)
```

---

## Component File

**Location:** `client/src/components/brand-media/EditBrandAssetModal.tsx`

```tsx
// client/src/components/brand-media/EditBrandAssetModal.tsx

import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, Info, AlertCircle, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Import from shared config
import {
  ASSET_CATEGORIES,
  BRAND_ASSET_TYPES,
  getAssetType,
  getTypesByCategory,
  AssetCategory,
} from '@/shared/config/brand-asset-types';

interface BrandAsset {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  
  // New taxonomy fields
  assetCategory?: string;
  assetType?: string;
  
  // Legacy fields (may exist on old assets)
  matchKeywords?: string;
  usageContexts?: string;
  entityType?: string;
  entityName?: string;
  mediaType?: string;
}

interface EditBrandAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: BrandAsset;
  onSave?: () => void;
}

export function EditBrandAssetModal({
  isOpen,
  onClose,
  asset,
  onSave,
}: EditBrandAssetModalProps) {
  const queryClient = useQueryClient();
  
  // Form state
  const [name, setName] = useState(asset.name || '');
  const [description, setDescription] = useState(asset.description || '');
  const [assetCategory, setAssetCategory] = useState<string>(asset.assetCategory || '');
  const [assetType, setAssetType] = useState<string>(asset.assetType || '');
  const [entityName, setEntityName] = useState(asset.entityName || '');
  
  // Reset form when asset changes
  useEffect(() => {
    setName(asset.name || '');
    setDescription(asset.description || '');
    setAssetCategory(asset.assetCategory || '');
    setAssetType(asset.assetType || '');
    setEntityName(asset.entityName || '');
  }, [asset]);
  
  // Get available types for selected category
  const availableTypes = useMemo(() => {
    if (!assetCategory) return [];
    return getTypesByCategory(assetCategory as AssetCategory);
  }, [assetCategory]);
  
  // Get selected type definition
  const selectedTypeDefinition = useMemo(() => {
    if (!assetType) return null;
    return getAssetType(assetType);
  }, [assetType]);
  
  // Check if this is a legacy asset needing migration
  const isLegacyAsset = useMemo(() => {
    return !asset.assetType && (asset.matchKeywords || asset.usageContexts || asset.entityType);
  }, [asset]);
  
  // Check if entity name should be shown
  const showEntityName = useMemo(() => {
    if (!selectedTypeDefinition) return false;
    return ['people', 'products'].includes(selectedTypeDefinition.category);
  }, [selectedTypeDefinition]);
  
  // Handle category change
  const handleCategoryChange = (value: string) => {
    setAssetCategory(value);
    setAssetType(''); // Reset type when category changes
  };
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        assetCategory,
        assetType,
        entityName: showEntityName ? entityName : null,
        
        // Clear legacy fields
        matchKeywords: null,
        usageContexts: null,
        entityType: null,
        mediaType: null,
      };
      
      const response = await fetch(`/api/brand-assets/${asset.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save asset');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-assets'] });
      queryClient.invalidateQueries({ queryKey: ['brand-asset', asset.id] });
      onSave?.();
      onClose();
    },
  });
  
  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a name');
      return;
    }
    if (!assetCategory) {
      alert('Please select a category');
      return;
    }
    if (!assetType) {
      alert('Please select an asset type');
      return;
    }
    saveMutation.mutate();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Brand Asset</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Legacy Asset Warning */}
          {isLegacyAsset && (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                <strong>Migration needed:</strong> This asset uses the old keyword system. 
                Please select a Category and Asset Type to enable smart matching.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Asset Preview */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <img
              src={asset.thumbnailUrl || asset.fileUrl}
              alt={asset.name}
              className="w-full h-40 object-contain"
            />
          </div>
          
          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display name for this asset"
            />
          </div>
          
          {/* Category Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={assetCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{cat.label}</span>
                      <span className="text-xs text-gray-500">{cat.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Asset Type Dropdown (filtered by category) */}
          {assetCategory && (
            <div className="space-y-2">
              <Label htmlFor="assetType">Asset Type *</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset type" />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        <span className="text-xs text-gray-500">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Selected Type Info */}
          {selectedTypeDefinition && (
            <div className="p-3 bg-blue-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-blue-800 font-medium">
                <Info className="h-4 w-4" />
                {selectedTypeDefinition.label}
              </div>
              <p className="text-sm text-blue-700">
                {selectedTypeDefinition.description}
              </p>
              
              {/* Show prompt keywords that will auto-match */}
              <div className="pt-2 border-t border-blue-200">
                <span className="text-xs text-blue-600 font-medium">Auto-matches these keywords:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedTypeDefinition.promptKeywords.slice(0, 8).map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      {kw}
                    </Badge>
                  ))}
                  {selectedTypeDefinition.promptKeywords.length > 8 && (
                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                      +{selectedTypeDefinition.promptKeywords.length - 8} more
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Entity Name (conditional) */}
          {showEntityName && (
            <div className="space-y-2">
              <Label htmlFor="entityName">
                {selectedTypeDefinition?.category === 'people' ? 'Person Name' : 'Product Name'}
              </Label>
              <Input
                id="entityName"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder={
                  selectedTypeDefinition?.category === 'people' 
                    ? 'e.g., Dr. Sarah Johnson' 
                    : 'e.g., Black Cohosh Extract'
                }
              />
            </div>
          )}
          
          {/* Description (optional) */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this asset"
              rows={2}
            />
          </div>
          
          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!assetType || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EditBrandAssetModal;
```

---

## API Endpoint Update

Update the PATCH endpoint to handle new fields:

```typescript
// server/routes/brand-assets.ts

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    assetCategory,
    assetType,
    entityName,
    // Legacy fields to clear
    matchKeywords,
    usageContexts,
    entityType,
    mediaType,
  } = req.body;
  
  try {
    const updated = await db
      .update(brandAssets)
      .set({
        name,
        description,
        assetCategory,
        assetType,
        entityName,
        // Clear legacy fields if explicitly set to null
        ...(matchKeywords === null && { matchKeywords: null }),
        ...(usageContexts === null && { usageContexts: null }),
        ...(entityType === null && { entityType: null }),
        ...(mediaType === null && { mediaType: null }),
        updatedAt: new Date(),
      })
      .where(eq(brandAssets.id, id))
      .returning();
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Failed to update brand asset:', error);
    res.status(500).json({ error: 'Failed to update asset' });
  }
});
```

---

## Import Path Setup

Ensure the shared config can be imported from the client:

```typescript
// client/tsconfig.json - add path alias

{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/shared/*": ["../shared/*"]
    }
  }
}
```

Or copy the config to client:

```bash
# If shared imports don't work, copy to client
cp shared/config/brand-asset-types.ts client/src/config/brand-asset-types.ts
```

---

## Testing the Modal

### Test Case 1: Edit Legacy Asset

1. Open Edit modal for "Pine Hill Farm Interior" (currently has `photo` type)
2. Select Category: "Location & Facilities"
3. Select Asset Type: "Interior Workspace"
4. Verify keywords preview shows: `interior, inside, office, workspace, consultation room...`
5. Save
6. Verify database has `assetCategory: 'location'` and `assetType: 'location-interior-workspace'`

### Test Case 2: Edit Logo Asset

1. Open Edit modal for "Pine Hill Farm white light"
2. Select Category: "Logos"
3. Select Asset Type: "Primary Logo (White)"
4. Save
5. Verify `assetType: 'logo-primary-white'`

### Test Case 3: Edit Service Asset

1. Open Edit modal for "Pine Hill Farm BioScan SRT"
2. Select Category: "Services & Programs"
3. Select Asset Type: "BioScan SRT Device"
4. Verify keywords show: `bioscan, biofeedback, srt, scanning device...`
5. Save

---

## Success Criteria

Phase 15C is complete when:

1. ✅ Edit modal shows Category dropdown with 8 options
2. ✅ Asset Type dropdown appears after category selection
3. ✅ Asset Type dropdown shows only types for selected category
4. ✅ Selected type shows description and prompt keywords
5. ✅ Legacy fields are cleared on save
6. ✅ New fields (`assetCategory`, `assetType`) are saved correctly
7. ✅ Entity Name field appears only for people/products categories

---

## Next Step

Proceed to **Phase 15D: Asset Matching Logic Rewrite**
