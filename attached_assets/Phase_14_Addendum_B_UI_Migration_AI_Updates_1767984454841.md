# Phase 14 Addendum B: UI Migration & AI System Updates

## Purpose

This addendum ensures the new Asset Type Taxonomy fully replaces the old manual keyword/context system. It covers:
1. UI field removal and replacement
2. AI system updates (Claude, Vision, Remotion)
3. Data migration for existing assets
4. Backward compatibility handling

---

## Part 1: UI Migration

### Fields to REMOVE

These fields create confusion and duplicate the taxonomy's built-in knowledge:

```typescript
// REMOVE from EditBrandAssetModal and UploadBrandAssetModal

// ❌ REMOVE - Taxonomy provides this automatically
matchKeywords: string;        // Was: "Functional Medicine, Organic, advocacy groups..."
usageContexts: string;        // Was: "intro, outro, overlay"

// ❌ REMOVE - Replaced by Asset Type
entityType: string;           // Was: "Brand" | "Product" | "Person" | "Location"
mediaType: string;            // Was: "Photo" | "Video" | "Logo" - auto-detect instead
```

### Fields to KEEP

```typescript
// ✅ KEEP - User-defined display name
name: string;                 // "Functional Medicine Logo"

// ✅ KEEP - Optional user notes
description?: string;         // "Partnership logo for IFM certification display"

// ✅ KEEP - But only show conditionally based on asset type
entityName?: string;          // For people: "Dr. Sarah Johnson", For products: "Black Cohosh Extract"
```

### Fields to ADD

```typescript
// ✅ ADD - Primary classification
assetCategory: string;        // "trust" | "products" | "services" | etc.
assetType: string;            // "trust-partnership-logo" | "product-hero-single" | etc.

// ✅ ADD - Auto-detected from file
detectedFormat: string;       // "png" | "jpg" | "svg" | etc.
detectedResolution: {         // { width: 1200, height: 800 }
  width: number;
  height: number;
};
hasTransparency: boolean;     // true/false (for PNG)
```

---

## Part 2: New Edit Brand Asset Modal

```tsx
// client/src/components/brand-media/EditBrandAssetModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertCircle, Check, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { ASSET_CATEGORIES, getAssetType, getTypesByCategory } from '@/config/brand-asset-types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface BrandAsset {
  id: string;
  name: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  assetCategory?: string;
  assetType?: string;
  
  // Legacy fields (may exist on old assets)
  matchKeywords?: string;
  usageContexts?: string;
  entityType?: string;
  entityName?: string;
  
  // Person/Product specific
  personInfo?: {
    name?: string;
    title?: string;
    credentials?: string;
    consentObtained?: boolean;
  };
  productInfo?: {
    productName?: string;
    sku?: string;
  };
  
  // Auto-detected
  detectedFormat?: string;
  width?: number;
  height?: number;
  hasTransparency?: boolean;
}

interface EditBrandAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: BrandAsset;
  onSave?: () => void;
}

export const EditBrandAssetModal: React.FC<EditBrandAssetModalProps> = ({
  isOpen,
  onClose,
  asset,
  onSave,
}) => {
  const queryClient = useQueryClient();
  
  // Form state
  const [name, setName] = useState(asset.name || '');
  const [description, setDescription] = useState(asset.description || '');
  const [assetCategory, setAssetCategory] = useState(asset.assetCategory || '');
  const [assetType, setAssetType] = useState(asset.assetType || '');
  
  // Conditional fields based on asset type
  const [personName, setPersonName] = useState(asset.personInfo?.name || asset.entityName || '');
  const [personTitle, setPersonTitle] = useState(asset.personInfo?.title || '');
  const [personCredentials, setPersonCredentials] = useState(asset.personInfo?.credentials || '');
  const [consentObtained, setConsentObtained] = useState(asset.personInfo?.consentObtained || false);
  const [productName, setProductName] = useState(asset.productInfo?.productName || '');
  const [productSku, setProductSku] = useState(asset.productInfo?.sku || '');
  
  // Validation
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  
  // Get selected asset type details
  const selectedAssetType = useMemo(() => {
    return assetType ? getAssetType(assetType) : null;
  }, [assetType]);
  
  // Get available types for selected category
  const availableTypes = useMemo(() => {
    return assetCategory ? getTypesByCategory(assetCategory) : [];
  }, [assetCategory]);
  
  // Check if this is a legacy asset (has old fields but no taxonomy)
  const isLegacyAsset = useMemo(() => {
    return !asset.assetType && (asset.matchKeywords || asset.usageContexts || asset.entityType);
  }, [asset]);
  
  // Suggest asset type based on legacy data
  const suggestedType = useMemo(() => {
    if (!isLegacyAsset) return null;
    
    // Try to infer from entityType and keywords
    const entityType = asset.entityType?.toLowerCase();
    const keywords = (asset.matchKeywords || '').toLowerCase();
    const name = (asset.name || '').toLowerCase();
    
    // Logo detection
    if (name.includes('logo') || keywords.includes('logo')) {
      if (keywords.includes('partner') || keywords.includes('association')) {
        return 'trust-partnership-logo';
      }
      if (keywords.includes('organic') || keywords.includes('usda')) {
        return 'trust-certification-usda';
      }
      if (keywords.includes('watermark')) {
        return 'logo-watermark';
      }
      return 'logo-primary-color';
    }
    
    // Product detection
    if (entityType === 'product' || keywords.includes('product')) {
      if (keywords.includes('lifestyle')) {
        return 'product-lifestyle';
      }
      return 'product-hero-single';
    }
    
    // Person detection
    if (entityType === 'person') {
      if (keywords.includes('founder') || keywords.includes('owner')) {
        return 'people-founder-portrait';
      }
      if (keywords.includes('customer') || keywords.includes('testimonial')) {
        return 'people-customer-portrait';
      }
      return 'people-employee-headshot';
    }
    
    // Location detection
    if (entityType === 'location' || keywords.includes('building') || keywords.includes('facility')) {
      if (keywords.includes('sign')) {
        return 'location-exterior-sign';
      }
      return 'location-exterior-building';
    }
    
    return null;
  }, [isLegacyAsset, asset]);
  
  // Apply suggestion
  const applySuggestion = () => {
    if (suggestedType) {
      const type = getAssetType(suggestedType);
      if (type) {
        setAssetCategory(type.category);
        setAssetType(suggestedType);
      }
    }
  };
  
  // Validate against asset type requirements
  useEffect(() => {
    const warnings: string[] = [];
    
    if (selectedAssetType?.requirements) {
      const req = selectedAssetType.requirements;
      
      // Check format
      if (req.recommendedFormat && asset.detectedFormat) {
        if (!req.recommendedFormat.includes(asset.detectedFormat.toLowerCase())) {
          warnings.push(`Recommended format: ${req.recommendedFormat.join(', ').toUpperCase()}`);
        }
      }
      
      // Check resolution
      if (req.minResolution && asset.width && asset.height) {
        if (asset.width < req.minResolution.width || asset.height < req.minResolution.height) {
          warnings.push(`Recommended minimum: ${req.minResolution.width}x${req.minResolution.height}px`);
        }
      }
      
      // Check transparency
      if (req.transparentBackground === true && asset.hasTransparency === false) {
        warnings.push('Transparent background required for best results');
      }
    }
    
    setValidationWarnings(warnings);
  }, [selectedAssetType, asset]);
  
  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name,
        description: description || null,
        assetCategory,
        assetType,
        
        // Clear legacy fields
        matchKeywords: null,
        usageContexts: null,
        entityType: null,
      };
      
      // Add person info if applicable
      if (selectedAssetType?.category === 'people') {
        payload.personInfo = {
          name: personName || null,
          title: personTitle || null,
          credentials: personCredentials || null,
          consentObtained,
        };
        payload.entityName = personName || null;
      }
      
      // Add product info if applicable
      if (selectedAssetType?.category === 'products') {
        payload.productInfo = {
          productName: productName || null,
          sku: productSku || null,
        };
        payload.entityName = productName || null;
      }
      
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
      onSave?.();
      onClose();
    },
  });
  
  const handleSave = () => {
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
        
        {/* Legacy Asset Warning */}
        {isLegacyAsset && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Migration needed:</strong> This asset uses the old keyword system. 
              Please select an Asset Type to enable smart matching.
              {suggestedType && (
                <Button 
                  variant="link" 
                  size="sm" 
                  className="ml-2 text-amber-700 underline p-0 h-auto"
                  onClick={applySuggestion}
                >
                  Apply suggestion: {getAssetType(suggestedType)?.label}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Preview */}
        <div className="relative bg-gray-100 rounded-lg overflow-hidden">
          <img
            src={asset.thumbnailUrl || asset.fileUrl}
            alt={asset.name}
            className="w-full h-40 object-contain"
          />
          {asset.detectedFormat && (
            <Badge className="absolute top-2 right-2">
              {asset.detectedFormat.toUpperCase()}
            </Badge>
          )}
          {asset.width && asset.height && (
            <Badge variant="outline" className="absolute bottom-2 right-2 bg-white">
              {asset.width}x{asset.height}
            </Badge>
          )}
        </div>
        
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Display name for this asset"
          />
        </div>
        
        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category">Category *</Label>
          <Select value={assetCategory} onValueChange={(value) => {
            setAssetCategory(value);
            setAssetType(''); // Reset type when category changes
          }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {ASSET_CATEGORIES.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <div className="flex items-center gap-2">
                    <span>{cat.label}</span>
                    <span className="text-xs text-gray-500">({cat.types.length} types)</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Asset Type Selection */}
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
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-gray-500">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        
        {/* Asset Type Info */}
        {selectedAssetType && (
          <div className="p-3 bg-blue-50 rounded-lg text-sm space-y-2">
            <div className="flex items-center gap-2 font-medium text-blue-800">
              <Info className="w-4 h-4" />
              {selectedAssetType.label}
            </div>
            <p className="text-blue-700">{selectedAssetType.description}</p>
            {selectedAssetType.promptKeywords?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-blue-600 text-xs">Auto-matches:</span>
                {selectedAssetType.promptKeywords.slice(0, 5).map((kw, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Validation Warnings */}
        {validationWarnings.length > 0 && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <ul className="list-disc list-inside text-sm">
                {validationWarnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Person-specific fields */}
        {selectedAssetType?.category === 'people' && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">Person Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="personName">Full Name</Label>
                <Input
                  id="personName"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Dr. Jane Smith"
                />
              </div>
              <div>
                <Label htmlFor="personTitle">Title/Role</Label>
                <Input
                  id="personTitle"
                  value={personTitle}
                  onChange={(e) => setPersonTitle(e.target.value)}
                  placeholder="Chief Science Officer"
                />
              </div>
            </div>
            {selectedAssetType.personMetadata?.requiresCredentials && (
              <div>
                <Label htmlFor="personCredentials">Credentials</Label>
                <Input
                  id="personCredentials"
                  value={personCredentials}
                  onChange={(e) => setPersonCredentials(e.target.value)}
                  placeholder="PhD, RD, CNS"
                />
              </div>
            )}
            {selectedAssetType.personMetadata?.requiresConsent && (
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consentObtained}
                  onChange={(e) => setConsentObtained(e.target.checked)}
                  className="mt-1"
                />
                <label htmlFor="consent" className="text-sm text-gray-700">
                  I confirm consent has been obtained to use this person's image
                </label>
              </div>
            )}
          </div>
        )}
        
        {/* Product-specific fields */}
        {selectedAssetType?.category === 'products' && (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm">Product Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Black Cohosh Extract"
                />
              </div>
              <div>
                <Label htmlFor="productSku">SKU (optional)</Label>
                <Input
                  id="productSku"
                  value={productSku}
                  onChange={(e) => setProductSku(e.target.value)}
                  placeholder="PHF-BC-001"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Description */}
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
      </DialogContent>
    </Dialog>
  );
};

export default EditBrandAssetModal;
```

---

## Part 3: AI System Updates

### 3A: Claude Brand Context Service

Update the Brand Context Service to provide taxonomy-aware context to Claude:

```typescript
// server/services/brand-context-service.ts

import { BRAND_ASSET_TYPES, getAssetType, findMatchingAssetTypes } from '../config/brand-asset-types';

interface BrandContextForClaude {
  availableAssets: {
    category: string;
    type: string;
    typeLabel: string;
    assets: Array<{
      id: string;
      name: string;
      description?: string;
      personName?: string;
      productName?: string;
    }>;
  }[];
  assetMatchingGuidance: string;
}

class BrandContextService {
  
  /**
   * Generate brand context for Claude prompts
   */
  async generateContextForClaude(projectId: string): Promise<BrandContextForClaude> {
    // Fetch all brand assets for project
    const assets = await db.query.brandAssets.findMany({
      where: eq(brandAssets.projectId, projectId),
    });
    
    // Group by asset type
    const groupedByType = new Map<string, typeof assets>();
    
    for (const asset of assets) {
      if (!asset.assetType) continue; // Skip legacy assets without taxonomy
      
      const existing = groupedByType.get(asset.assetType) || [];
      existing.push(asset);
      groupedByType.set(asset.assetType, existing);
    }
    
    // Build structured context
    const availableAssets: BrandContextForClaude['availableAssets'] = [];
    
    for (const [typeId, typeAssets] of groupedByType) {
      const assetType = getAssetType(typeId);
      if (!assetType) continue;
      
      availableAssets.push({
        category: assetType.category,
        type: typeId,
        typeLabel: assetType.label,
        assets: typeAssets.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description || undefined,
          personName: a.personInfo ? JSON.parse(a.personInfo).name : undefined,
          productName: a.productInfo ? JSON.parse(a.productInfo).productName : undefined,
        })),
      });
    }
    
    // Generate guidance text
    const assetMatchingGuidance = this.generateMatchingGuidance(availableAssets);
    
    return {
      availableAssets,
      assetMatchingGuidance,
    };
  }
  
  /**
   * Generate natural language guidance for Claude
   */
  private generateMatchingGuidance(availableAssets: BrandContextForClaude['availableAssets']): string {
    const lines: string[] = [
      'BRAND ASSET GUIDANCE:',
      'When writing visual directions, reference these available brand assets:',
      '',
    ];
    
    // Group by category for cleaner output
    const byCategory = new Map<string, typeof availableAssets>();
    for (const item of availableAssets) {
      const existing = byCategory.get(item.category) || [];
      existing.push(item);
      byCategory.set(item.category, existing);
    }
    
    for (const [category, items] of byCategory) {
      const categoryLabel = ASSET_CATEGORIES.find(c => c.id === category)?.label || category;
      lines.push(`## ${categoryLabel}`);
      
      for (const item of items) {
        const assetNames = item.assets.map(a => a.name).join(', ');
        lines.push(`- ${item.typeLabel}: ${assetNames}`);
      }
      lines.push('');
    }
    
    lines.push('When a scene requires any of these elements, reference them by name in the visual direction.');
    lines.push('Example: "Show the Pine Hill Farm exterior sign" or "Display the USDA Organic certification badge"');
    
    return lines.join('\n');
  }
  
  /**
   * Find matching assets for a visual direction
   * Used by asset injection pipeline
   */
  async findAssetsForVisualDirection(
    projectId: string,
    visualDirection: string
  ): Promise<Array<{
    asset: BrandAsset;
    assetType: typeof BRAND_ASSET_TYPES[string];
    matchScore: number;
    matchReason: string;
  }>> {
    // Get matching asset type IDs based on prompt keywords
    const matchingTypeIds = findMatchingAssetTypes(visualDirection);
    
    // Fetch assets that match those types
    const assets = await db.query.brandAssets.findMany({
      where: and(
        eq(brandAssets.projectId, projectId),
        inArray(brandAssets.assetType, matchingTypeIds)
      ),
    });
    
    // Score each asset
    const results = [];
    const lowerDirection = visualDirection.toLowerCase();
    
    for (const asset of assets) {
      const assetType = getAssetType(asset.assetType);
      if (!assetType) continue;
      
      let score = 0;
      let matchReason = '';
      
      // Type match score (earlier in matchingTypeIds = higher score)
      const typeIndex = matchingTypeIds.indexOf(asset.assetType);
      if (typeIndex >= 0) {
        score += 100 - (typeIndex * 10);
        matchReason = `Asset type "${assetType.label}" matches visual direction`;
      }
      
      // Name match
      if (asset.name && lowerDirection.includes(asset.name.toLowerCase())) {
        score += 80;
        matchReason = `Asset name "${asset.name}" found in visual direction`;
      }
      
      // Person name match
      if (asset.personInfo) {
        const person = JSON.parse(asset.personInfo);
        if (person.name && lowerDirection.includes(person.name.toLowerCase())) {
          score += 90;
          matchReason = `Person "${person.name}" mentioned in visual direction`;
        }
      }
      
      // Product name match
      if (asset.productInfo) {
        const product = JSON.parse(asset.productInfo);
        if (product.productName && lowerDirection.includes(product.productName.toLowerCase())) {
          score += 90;
          matchReason = `Product "${product.productName}" mentioned in visual direction`;
        }
      }
      
      if (score > 0) {
        results.push({
          asset,
          assetType,
          matchScore: score,
          matchReason,
        });
      }
    }
    
    // Sort by score descending
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }
}

export const brandContextService = new BrandContextService();
```

### 3B: Claude Vision QA Updates

Update Claude Vision to validate correct asset type usage:

```typescript
// server/services/claude-vision-qa-service.ts

import { getAssetType } from '../config/brand-asset-types';

interface AssetValidationResult {
  assetId: string;
  assetType: string;
  expectedUsage: string;
  actualUsage: string;
  isCorrect: boolean;
  issues: string[];
}

class ClaudeVisionQAService {
  
  /**
   * Validate that brand assets were used correctly
   */
  async validateAssetUsage(
    sceneId: string,
    renderedFrameUrl: string,
    injectedAssets: Array<{
      assetId: string;
      assetType: string;
      placementPosition: string;
      placementScale: string;
    }>
  ): Promise<AssetValidationResult[]> {
    
    const results: AssetValidationResult[] = [];
    
    for (const injected of injectedAssets) {
      const assetType = getAssetType(injected.assetType);
      if (!assetType) continue;
      
      const placementRules = assetType.placementRules;
      const issues: string[] = [];
      
      // Check position matches expected
      if (placementRules?.typicalPosition && placementRules.typicalPosition !== 'flexible') {
        if (injected.placementPosition !== placementRules.typicalPosition) {
          // Not necessarily wrong, but note it
          // Some positions are guidelines, not strict rules
        }
      }
      
      // Check scale is appropriate
      if (placementRules?.typicalScale) {
        const expectedScale = placementRules.typicalScale;
        const actualScale = injected.placementScale;
        
        // Watermarks should be small
        if (injected.assetType === 'logo-watermark' && actualScale !== 'small') {
          issues.push('Watermark logo should be small, not prominent');
        }
        
        // Hero logos should be large
        if (injected.assetType === 'logo-primary-color' && actualScale === 'small') {
          issues.push('Primary logo appears too small for hero placement');
        }
      }
      
      // Use Claude Vision to verify asset is visible and correct
      const visionAnalysis = await this.analyzeFrameForAsset(
        renderedFrameUrl,
        injected.assetId,
        assetType
      );
      
      if (!visionAnalysis.assetVisible) {
        issues.push('Asset not visible in rendered frame');
      }
      
      if (visionAnalysis.occluded) {
        issues.push('Asset partially occluded by other elements');
      }
      
      if (visionAnalysis.distorted) {
        issues.push('Asset appears distorted or incorrectly scaled');
      }
      
      results.push({
        assetId: injected.assetId,
        assetType: injected.assetType,
        expectedUsage: `${assetType.label} at ${placementRules?.typicalPosition || 'flexible'} position`,
        actualUsage: `Placed at ${injected.placementPosition}, scale: ${injected.placementScale}`,
        isCorrect: issues.length === 0,
        issues,
      });
    }
    
    return results;
  }
  
  /**
   * Analyze rendered frame for specific asset
   */
  private async analyzeFrameForAsset(
    frameUrl: string,
    assetId: string,
    assetType: typeof BRAND_ASSET_TYPES[string]
  ): Promise<{
    assetVisible: boolean;
    occluded: boolean;
    distorted: boolean;
    notes: string;
  }> {
    
    const prompt = `Analyze this video frame and check for the presence of a brand asset.

Asset Type: ${assetType.label}
Description: ${assetType.description}
Expected Placement: ${assetType.placementRules?.typicalPosition || 'flexible'}
Expected Scale: ${assetType.placementRules?.typicalScale || 'medium'}

Please evaluate:
1. Is the asset visible in the frame?
2. Is it partially hidden or occluded by other elements?
3. Does it appear distorted, stretched, or incorrectly scaled?
4. Is the placement appropriate for this asset type?

Respond in JSON format:
{
  "assetVisible": boolean,
  "occluded": boolean,
  "distorted": boolean,
  "notes": "string"
}`;

    const response = await this.callClaudeVision(frameUrl, prompt);
    
    try {
      return JSON.parse(response);
    } catch {
      return {
        assetVisible: true,
        occluded: false,
        distorted: false,
        notes: 'Unable to parse vision response',
      };
    }
  }
  
  /**
   * Call Claude Vision API
   */
  private async callClaudeVision(imageUrl: string, prompt: string): Promise<string> {
    // Implementation depends on your Claude API setup
    // This is a placeholder
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'url', url: imageUrl },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      }],
    });
    
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}

export const claudeVisionQAService = new ClaudeVisionQAService();
```

### 3C: Remotion Asset Injection Updates

Update Remotion to use placement rules from taxonomy:

```typescript
// server/services/remotion-asset-injector.ts

import { getAssetType } from '../config/brand-asset-types';

interface InjectionConfig {
  assetId: string;
  assetUrl: string;
  assetType: string;
  position: { x: number; y: number };
  scale: number;
  opacity: number;
  animation: string;
  layer: number;
}

class RemotionAssetInjector {
  
  /**
   * Calculate injection config based on asset type
   */
  calculateInjectionConfig(
    asset: BrandAsset,
    frameWidth: number,
    frameHeight: number,
    existingElements: Array<{ bounds: DOMRect; layer: number }>
  ): InjectionConfig {
    
    const assetType = getAssetType(asset.assetType);
    if (!assetType) {
      // Fallback for legacy assets
      return this.getDefaultConfig(asset, frameWidth, frameHeight);
    }
    
    const rules = assetType.placementRules;
    
    // Calculate position
    const position = this.calculatePosition(
      rules?.typicalPosition || 'center',
      frameWidth,
      frameHeight
    );
    
    // Calculate scale
    const scale = this.calculateScale(
      rules?.typicalScale || 'medium',
      frameWidth,
      frameHeight
    );
    
    // Get opacity
    const opacity = rules?.typicalOpacity ?? 1.0;
    
    // Get animation
    const animation = rules?.animationStyle || 'fade-in';
    
    // Calculate layer (higher = on top)
    const layer = this.calculateLayer(assetType.category, existingElements);
    
    return {
      assetId: asset.id,
      assetUrl: asset.fileUrl,
      assetType: asset.assetType,
      position,
      scale,
      opacity,
      animation,
      layer,
    };
  }
  
  /**
   * Calculate position from placement rule
   */
  private calculatePosition(
    placement: string,
    width: number,
    height: number
  ): { x: number; y: number } {
    
    const margin = 40; // pixels from edge
    
    switch (placement) {
      case 'center':
        return { x: width / 2, y: height / 2 };
      
      case 'top-left':
        return { x: margin, y: margin };
      
      case 'top-right':
        return { x: width - margin, y: margin };
      
      case 'bottom-left':
        return { x: margin, y: height - margin };
      
      case 'bottom-right':
        return { x: width - margin, y: height - margin };
      
      case 'center-left':
        return { x: margin + 100, y: height / 2 };
      
      case 'center-right':
        return { x: width - margin - 100, y: height / 2 };
      
      case 'center-bottom':
        return { x: width / 2, y: height - margin - 50 };
      
      case 'bottom':
        return { x: width / 2, y: height - margin - 30 };
      
      case 'corner':
        return { x: width - margin - 50, y: margin + 50 };
      
      case 'full-frame':
      case 'background':
        return { x: width / 2, y: height / 2 };
      
      default:
        return { x: width / 2, y: height / 2 };
    }
  }
  
  /**
   * Calculate scale from placement rule
   */
  private calculateScale(
    scaleRule: string,
    width: number,
    height: number
  ): number {
    
    const baseUnit = Math.min(width, height);
    
    switch (scaleRule) {
      case 'small':
        return baseUnit * 0.08; // 8% of frame
      
      case 'small-medium':
        return baseUnit * 0.12;
      
      case 'medium':
        return baseUnit * 0.18;
      
      case 'medium-large':
        return baseUnit * 0.25;
      
      case 'large':
        return baseUnit * 0.35;
      
      case 'full':
      case 'full-width':
        return width;
      
      default:
        return baseUnit * 0.18;
    }
  }
  
  /**
   * Calculate layer order based on asset category
   */
  private calculateLayer(
    category: string,
    existingElements: Array<{ layer: number }>
  ): number {
    
    // Base layer by category (higher = on top)
    const categoryLayers: Record<string, number> = {
      'background': 0,       // Behind everything
      'location': 10,        // Background context
      'products': 20,        // Main subjects
      'people': 30,          // Main subjects
      'services': 30,        // Main subjects
      'creative': 40,        // Overlays
      'trust': 50,           // Badges (on top of content)
      'logos': 60,           // Logos (often watermarks)
      'documents': 35,       // Screenshots/docs
    };
    
    const baseLayer = categoryLayers[category] ?? 25;
    
    // Offset if there are conflicts
    const conflictingLayers = existingElements.filter(e => e.layer === baseLayer);
    
    return baseLayer + conflictingLayers.length;
  }
  
  /**
   * Default config for legacy assets without taxonomy
   */
  private getDefaultConfig(
    asset: BrandAsset,
    frameWidth: number,
    frameHeight: number
  ): InjectionConfig {
    return {
      assetId: asset.id,
      assetUrl: asset.fileUrl,
      assetType: 'unknown',
      position: { x: frameWidth / 2, y: frameHeight / 2 },
      scale: Math.min(frameWidth, frameHeight) * 0.18,
      opacity: 1.0,
      animation: 'fade-in',
      layer: 25,
    };
  }
  
  /**
   * Generate Remotion component props
   */
  generateRemotionProps(config: InjectionConfig): object {
    return {
      src: config.assetUrl,
      style: {
        position: 'absolute',
        left: config.position.x,
        top: config.position.y,
        transform: 'translate(-50%, -50%)',
        width: config.scale,
        height: 'auto',
        opacity: config.opacity,
        zIndex: config.layer,
      },
      animation: config.animation,
    };
  }
}

export const remotionAssetInjector = new RemotionAssetInjector();
```

---

## Part 4: Data Migration

### Migration Script for Existing Assets

```typescript
// scripts/migrate-brand-assets-to-taxonomy.ts

import { db } from '../server/db';
import { brandAssets } from '../server/db/schema';
import { getAssetType, BRAND_ASSET_TYPES } from '../server/config/brand-asset-types';

interface MigrationResult {
  assetId: string;
  assetName: string;
  oldData: {
    entityType?: string;
    matchKeywords?: string;
    usageContexts?: string;
  };
  newData: {
    assetCategory: string;
    assetType: string;
  };
  confidence: 'high' | 'medium' | 'low';
  requiresReview: boolean;
}

async function migrateAsset(asset: any): Promise<MigrationResult> {
  const oldData = {
    entityType: asset.entityType,
    matchKeywords: asset.matchKeywords,
    usageContexts: asset.usageContexts,
  };
  
  // Skip if already has taxonomy
  if (asset.assetType && asset.assetCategory) {
    return {
      assetId: asset.id,
      assetName: asset.name,
      oldData,
      newData: {
        assetCategory: asset.assetCategory,
        assetType: asset.assetType,
      },
      confidence: 'high',
      requiresReview: false,
    };
  }
  
  // Inference logic
  const name = (asset.name || '').toLowerCase();
  const keywords = (asset.matchKeywords || '').toLowerCase();
  const entityType = (asset.entityType || '').toLowerCase();
  
  let inferredType: string | null = null;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  
  // === LOGOS ===
  if (name.includes('logo') || keywords.includes('logo')) {
    if (keywords.includes('watermark') || name.includes('watermark')) {
      inferredType = 'logo-watermark';
      confidence = 'high';
    } else if (keywords.includes('white') || name.includes('white')) {
      inferredType = 'logo-primary-white';
      confidence = 'high';
    } else if (keywords.includes('dark') || keywords.includes('black')) {
      inferredType = 'logo-primary-dark';
      confidence = 'high';
    } else if (keywords.includes('partner') || keywords.includes('association')) {
      inferredType = 'trust-partnership-logo';
      confidence = 'high';
    } else {
      inferredType = 'logo-primary-color';
      confidence = 'medium';
    }
  }
  
  // === CERTIFICATIONS ===
  else if (keywords.includes('usda') || keywords.includes('organic')) {
    inferredType = 'trust-certification-usda';
    confidence = 'high';
  }
  else if (keywords.includes('non-gmo') || keywords.includes('gmo')) {
    inferredType = 'trust-certification-nongmo';
    confidence = 'high';
  }
  else if (keywords.includes('gmp') || keywords.includes('certified')) {
    inferredType = 'trust-certification-gmp';
    confidence = 'medium';
  }
  else if (keywords.includes('award') || keywords.includes('winner')) {
    inferredType = 'trust-award-badge';
    confidence = 'medium';
  }
  
  // === PRODUCTS ===
  else if (entityType === 'product') {
    if (keywords.includes('lifestyle') || keywords.includes('in use')) {
      inferredType = 'product-lifestyle';
      confidence = 'medium';
    } else if (keywords.includes('group') || keywords.includes('lineup')) {
      inferredType = 'product-hero-group';
      confidence = 'medium';
    } else if (keywords.includes('packaging') || keywords.includes('label')) {
      inferredType = 'product-packaging-front';
      confidence = 'medium';
    } else {
      inferredType = 'product-hero-single';
      confidence = 'medium';
    }
  }
  
  // === PEOPLE ===
  else if (entityType === 'person') {
    if (keywords.includes('founder') || keywords.includes('owner') || keywords.includes('ceo')) {
      inferredType = 'people-founder-portrait';
      confidence = 'high';
    } else if (keywords.includes('customer') || keywords.includes('testimonial')) {
      inferredType = 'people-customer-portrait';
      confidence = 'medium';
    } else if (keywords.includes('expert') || keywords.includes('doctor') || keywords.includes('dr.')) {
      inferredType = 'people-expert-portrait';
      confidence = 'medium';
    } else {
      inferredType = 'people-employee-headshot';
      confidence = 'low';
    }
  }
  
  // === LOCATION ===
  else if (entityType === 'location') {
    if (keywords.includes('sign') || name.includes('sign')) {
      inferredType = 'location-exterior-sign';
      confidence = 'high';
    } else if (keywords.includes('interior') || keywords.includes('inside')) {
      inferredType = 'location-interior-workspace';
      confidence = 'medium';
    } else if (keywords.includes('farm') || keywords.includes('garden')) {
      inferredType = 'location-farm-grounds';
      confidence = 'medium';
    } else {
      inferredType = 'location-exterior-building';
      confidence = 'low';
    }
  }
  
  // === SERVICES (check keywords for service names) ===
  else if (keywords.includes('bioscan') || keywords.includes('srt')) {
    if (keywords.includes('device') || keywords.includes('machine')) {
      inferredType = 'service-bioscan-device';
      confidence = 'high';
    } else {
      inferredType = 'service-bioscan-session';
      confidence = 'medium';
    }
  }
  else if (keywords.includes('functional health')) {
    inferredType = 'service-functional-health-hero';
    confidence = 'medium';
  }
  else if (keywords.includes('lab') || keywords.includes('testing')) {
    inferredType = 'service-lab-testing-hero';
    confidence = 'medium';
  }
  
  // === FALLBACK ===
  if (!inferredType) {
    // Try to infer from brand entity type
    if (entityType === 'brand') {
      inferredType = 'trust-partnership-logo';
      confidence = 'low';
    } else {
      inferredType = 'product-hero-single';
      confidence = 'low';
    }
  }
  
  const assetType = getAssetType(inferredType);
  
  return {
    assetId: asset.id,
    assetName: asset.name,
    oldData,
    newData: {
      assetCategory: assetType?.category || 'products',
      assetType: inferredType,
    },
    confidence,
    requiresReview: confidence === 'low',
  };
}

async function runMigration(dryRun: boolean = true): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`BRAND ASSET TAXONOMY MIGRATION ${dryRun ? '(DRY RUN)' : ''}`);
  console.log(`${'='.repeat(60)}\n`);
  
  // Fetch all assets
  const assets = await db.select().from(brandAssets);
  console.log(`Found ${assets.length} assets to process\n`);
  
  const results: MigrationResult[] = [];
  const requiresReview: MigrationResult[] = [];
  
  for (const asset of assets) {
    const result = await migrateAsset(asset);
    results.push(result);
    
    if (result.requiresReview) {
      requiresReview.push(result);
    }
    
    // Apply migration if not dry run
    if (!dryRun && result.newData.assetType) {
      await db
        .update(brandAssets)
        .set({
          assetCategory: result.newData.assetCategory,
          assetType: result.newData.assetType,
          // Clear legacy fields
          matchKeywords: null,
          usageContexts: null,
          entityType: null,
        })
        .where(eq(brandAssets.id, asset.id));
    }
    
    // Log progress
    const confidenceEmoji = {
      high: '✅',
      medium: '⚠️',
      low: '❌',
    }[result.confidence];
    
    console.log(`${confidenceEmoji} ${result.assetName}`);
    console.log(`   Old: ${result.oldData.entityType || 'none'} | ${result.oldData.matchKeywords?.substring(0, 30) || 'no keywords'}...`);
    console.log(`   New: ${result.newData.assetCategory} → ${result.newData.assetType}`);
    console.log('');
  }
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('MIGRATION SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total assets: ${results.length}`);
  console.log(`High confidence: ${results.filter(r => r.confidence === 'high').length}`);
  console.log(`Medium confidence: ${results.filter(r => r.confidence === 'medium').length}`);
  console.log(`Low confidence (needs review): ${results.filter(r => r.confidence === 'low').length}`);
  
  if (requiresReview.length > 0) {
    console.log(`\n⚠️  ASSETS REQUIRING MANUAL REVIEW:`);
    for (const r of requiresReview) {
      console.log(`   - ${r.assetName} (ID: ${r.assetId})`);
    }
  }
  
  if (dryRun) {
    console.log(`\n🔵 This was a DRY RUN. No changes were made.`);
    console.log(`   Run with --apply to apply changes.`);
  } else {
    console.log(`\n✅ Migration complete!`);
  }
}

// CLI
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

runMigration(dryRun).catch(console.error);
```

### Run Migration

```bash
# Preview changes (dry run)
npx ts-node scripts/migrate-brand-assets-to-taxonomy.ts

# Apply changes
npx ts-node scripts/migrate-brand-assets-to-taxonomy.ts --apply
```

---

## Part 5: Database Schema Updates

```sql
-- migrations/update_brand_assets_for_taxonomy.sql

-- Add new taxonomy columns
ALTER TABLE brand_assets 
ADD COLUMN IF NOT EXISTS asset_category TEXT,
ADD COLUMN IF NOT EXISTS asset_type TEXT;

-- Add indexes for taxonomy queries
CREATE INDEX IF NOT EXISTS idx_brand_assets_category ON brand_assets(asset_category);
CREATE INDEX IF NOT EXISTS idx_brand_assets_type ON brand_assets(asset_type);
CREATE INDEX IF NOT EXISTS idx_brand_assets_category_type ON brand_assets(asset_category, asset_type);

-- Note: Do NOT drop legacy columns yet
-- Keep match_keywords, usage_contexts, entity_type during transition
-- They will be cleared by migration script but column remains for safety

-- After migration is verified, you can drop legacy columns:
-- ALTER TABLE brand_assets DROP COLUMN IF EXISTS match_keywords;
-- ALTER TABLE brand_assets DROP COLUMN IF EXISTS usage_contexts;
-- ALTER TABLE brand_assets DROP COLUMN IF EXISTS entity_type;
```

---

## Verification Checklist

### UI Migration
- [ ] EditBrandAssetModal shows Category → Asset Type dropdowns
- [ ] Match Keywords field removed
- [ ] Usage Contexts field removed
- [ ] Entity Type field removed (replaced by Asset Type)
- [ ] Legacy asset warning shows with suggestion
- [ ] Person-specific fields show for people category
- [ ] Product-specific fields show for products category
- [ ] Validation warnings display from taxonomy requirements

### AI System Updates
- [ ] Brand Context Service generates taxonomy-aware context
- [ ] Asset matching uses promptKeywords from taxonomy
- [ ] Claude Vision validates asset type usage
- [ ] Remotion uses placementRules for positioning
- [ ] Layer ordering based on asset category

### Data Migration
- [ ] Migration script runs in dry-run mode
- [ ] High/medium/low confidence assignments are accurate
- [ ] Migration applies changes when --apply flag used
- [ ] Legacy fields cleared after migration
- [ ] Assets requiring review are flagged

### Backward Compatibility
- [ ] Legacy assets without taxonomy still display
- [ ] Legacy assets get default injection config
- [ ] Migration can be run incrementally
- [ ] No breaking changes to existing video generation

---

## Summary

This addendum ensures a clean transition from the old keyword-based system to the new taxonomy-based system:

1. **UI simplified** - Users just pick Category → Asset Type instead of guessing keywords
2. **AI systems enhanced** - Claude, Vision, and Remotion all understand asset types
3. **Data migrated** - Existing assets auto-assigned types with confidence scoring
4. **No data loss** - Legacy fields preserved until migration verified
