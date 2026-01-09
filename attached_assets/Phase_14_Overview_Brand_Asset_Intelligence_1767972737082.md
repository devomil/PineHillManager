# Phase 14: Brand Asset Intelligence Pipeline

## Executive Summary

This phase transforms the video generation system from "AI imagining your brand" to "AI enhancing your actual brand assets." It introduces intelligent detection of brand-visibility requirements in visual directions, automatic matching against uploaded Brand Media, and sophisticated composition workflows that place real products and logos into AI-generated environments.

**Business Impact:**
- Eliminates AI text hallucination on product labels
- Ensures 100% brand accuracy in every frame
- Enables product-specific video content at scale
- Delivers TV-quality brand consistency

**Cost Consideration:** This phase prioritizes broadcast-quality output over cost savings. Some workflows will use multiple API calls (image generation + composition + video) but deliver significantly higher quality than single-pass generation.

---

## The Problem

### Current State
When visual directions include:
- "Close-up shot showing testing materials prominently with Pine Hill Farm branding clearly visible"
- "Warm room with wood table prominently showing products, zooming into the Pine logo"
- "Product arrangement with Black Cohosh Extract Plus featured"

The system generates **new AI images** that **attempt** to show branding. Results:
- Generic bottles that look "wellness-ish" but aren't PHF products
- Garbled or hallucinated text on labels
- Logo attempts that are illegible or wrong
- Loss of brand authenticity

### Desired State
The system should:
1. **Detect** when visual direction requires brand assets
2. **Match** against uploaded Brand Media library
3. **Compose** real assets into AI-generated environments
4. **Animate** with product-appropriate motion styles

---

## Architecture Overview

```
Visual Direction Input
         │
         ▼
┌─────────────────────────────┐
│  Brand Requirement Analyzer  │
│  - Product mentions          │
│  - Branding requirements     │
│  - Logo visibility needs     │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Brand Asset Matcher         │
│  - Search Brand Media DB     │
│  - Match by keywords/tags    │
│  - Select best asset         │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Workflow Router             │
│  - Image-to-Image path       │
│  - Image-to-Video path       │
│  - Composite + Overlay path  │
│  - Pure generation path      │
└─────────────────────────────┘
         │
    ┌────┴────┬────────┬───────────┐
    ▼         ▼        ▼           ▼
 Product   Logo     Scene +     Standard
 Hero     Overlay   Product      AI Gen
 Shot     Composite Placement   (fallback)
```

---

## Sub-Phases

| Phase | Name | Purpose |
|-------|------|---------|
| 14A | Brand Requirement Analyzer | Detect brand/product needs from visual directions |
| 14B | Asset Matching Service | Match requirements to Brand Media library |
| 14C | Image-to-Image Composition | Place products into AI environments |
| 14D | Image-to-Video Pipeline | Animate brand assets with appropriate motion |
| 14E | Logo Composition System | Broadcast-quality logo placement |
| 14F | Workflow Orchestration | Route scenes to optimal pipeline |

---

## Phase 14A: Brand Requirement Analyzer

### Purpose
Parse visual directions to detect when brand assets are required, what type, and what specific products or logos are mentioned.

### Detection Categories

```typescript
interface BrandRequirementAnalysis {
  requiresBrandAssets: boolean;
  confidence: number; // 0-1
  
  requirements: {
    // Product visibility
    productMentioned: boolean;
    productNames: string[]; // ["Black Cohosh", "Deep Sleep", "Wonder Lotion"]
    productVisibility: 'featured' | 'prominent' | 'visible' | 'background';
    
    // Logo/branding visibility  
    logoRequired: boolean;
    logoType: 'primary' | 'watermark' | 'certification' | null;
    brandingVisibility: 'prominent' | 'visible' | 'subtle';
    
    // Scene composition
    sceneType: 'product-hero' | 'product-in-context' | 'branded-environment' | 'standard';
    
    // Output type
    outputType: 'image' | 'video';
    motionStyle: 'static' | 'subtle' | 'environmental' | 'reveal' | null;
  };
  
  // Matched assets (populated by 14B)
  matchedAssets: {
    products: BrandMediaAsset[];
    logos: BrandMediaAsset[];
    locations: BrandMediaAsset[];
  };
}
```

### Detection Keywords

```typescript
const BRAND_DETECTION_PATTERNS = {
  // Product indicators
  productKeywords: [
    'product', 'products', 'bottle', 'packaging', 'label',
    'supplement', 'extract', 'gummies', 'lotion', 'oil',
    'testing kit', 'test kit', 'materials'
  ],
  
  // Specific PHF products (from Brand Media tags)
  productNames: [
    'black cohosh', 'deep sleep', 'wonder lotion', 'b-complex',
    'ultra omega', 'herbal ear oil', 'hemp extract',
    'lab test', 'dutch test', 'gut health test'
  ],
  
  // Brand visibility indicators
  brandingKeywords: [
    'pine hill farm', 'phf', 'branding', 'branded',
    'logo', 'watermark', 'label visible', 'packaging visible',
    'brand visible', 'branding clearly', 'brand recognition'
  ],
  
  // Visibility modifiers
  visibilityModifiers: {
    prominent: ['prominently', 'featured', 'hero', 'showcase', 'highlight', 'focus on'],
    visible: ['visible', 'showing', 'displaying', 'with', 'including'],
    subtle: ['subtle', 'background', 'secondary', 'hint of']
  },
  
  // Motion indicators (for image vs video routing)
  motionIndicators: {
    static: ['still', 'static', 'photograph', 'photo'],
    subtle: ['subtle motion', 'slight movement', 'gentle', 'camera drift'],
    environmental: ['environmental motion', 'background movement', 'ambient'],
    reveal: ['zoom into', 'reveal', 'emerge', 'transition to']
  }
};
```

### Analyzer Implementation

```typescript
// server/services/brand-requirement-analyzer.ts

import { BrandRequirementAnalysis } from '../../shared/types/brand-asset-types';

class BrandRequirementAnalyzer {
  
  /**
   * Analyze visual direction for brand asset requirements
   */
  analyze(visualDirection: string, narration?: string): BrandRequirementAnalysis {
    const lower = visualDirection.toLowerCase();
    const combined = `${visualDirection} ${narration || ''}`.toLowerCase();
    
    // Detect product mentions
    const productAnalysis = this.analyzeProductRequirements(lower, combined);
    
    // Detect logo/branding requirements
    const brandingAnalysis = this.analyzeBrandingRequirements(lower);
    
    // Determine scene type
    const sceneType = this.determineSceneType(productAnalysis, brandingAnalysis, lower);
    
    // Determine output type and motion
    const outputAnalysis = this.analyzeOutputRequirements(lower);
    
    // Calculate overall confidence
    const confidence = this.calculateConfidence(productAnalysis, brandingAnalysis);
    
    return {
      requiresBrandAssets: confidence > 0.4,
      confidence,
      requirements: {
        ...productAnalysis,
        ...brandingAnalysis,
        sceneType,
        ...outputAnalysis,
      },
      matchedAssets: {
        products: [],
        logos: [],
        locations: [],
      },
    };
  }
  
  private analyzeProductRequirements(direction: string, combined: string) {
    const productNames: string[] = [];
    let productVisibility: 'featured' | 'prominent' | 'visible' | 'background' = 'visible';
    
    // Check for specific product names
    for (const product of BRAND_DETECTION_PATTERNS.productNames) {
      if (combined.includes(product)) {
        productNames.push(product);
      }
    }
    
    // Check for generic product keywords
    const hasProductKeyword = BRAND_DETECTION_PATTERNS.productKeywords.some(k => direction.includes(k));
    
    // Determine visibility level
    if (BRAND_DETECTION_PATTERNS.visibilityModifiers.prominent.some(m => direction.includes(m))) {
      productVisibility = 'featured';
    } else if (direction.includes('prominent')) {
      productVisibility = 'prominent';
    } else if (BRAND_DETECTION_PATTERNS.visibilityModifiers.subtle.some(m => direction.includes(m))) {
      productVisibility = 'background';
    }
    
    return {
      productMentioned: hasProductKeyword || productNames.length > 0,
      productNames,
      productVisibility,
    };
  }
  
  private analyzeBrandingRequirements(direction: string) {
    const hasBrandingKeyword = BRAND_DETECTION_PATTERNS.brandingKeywords.some(k => direction.includes(k));
    
    // Determine logo type needed
    let logoType: 'primary' | 'watermark' | 'certification' | null = null;
    if (direction.includes('logo')) {
      logoType = 'primary';
    } else if (direction.includes('watermark')) {
      logoType = 'watermark';
    } else if (direction.includes('usda') || direction.includes('organic') || direction.includes('certification')) {
      logoType = 'certification';
    }
    
    // Determine branding visibility
    let brandingVisibility: 'prominent' | 'visible' | 'subtle' = 'visible';
    if (direction.includes('prominently') || direction.includes('clearly visible')) {
      brandingVisibility = 'prominent';
    } else if (direction.includes('subtle') || direction.includes('hint')) {
      brandingVisibility = 'subtle';
    }
    
    return {
      logoRequired: hasBrandingKeyword || logoType !== null,
      logoType,
      brandingVisibility,
    };
  }
  
  private determineSceneType(
    productAnalysis: any,
    brandingAnalysis: any,
    direction: string
  ): 'product-hero' | 'product-in-context' | 'branded-environment' | 'standard' {
    
    // Product hero: Close-up, featured product
    if (productAnalysis.productVisibility === 'featured' || 
        direction.includes('close-up') || 
        direction.includes('hero shot')) {
      return 'product-hero';
    }
    
    // Product in context: Products visible in environment
    if (productAnalysis.productMentioned && 
        (direction.includes('room') || direction.includes('desk') || 
         direction.includes('table') || direction.includes('shelf'))) {
      return 'product-in-context';
    }
    
    // Branded environment: Location/space with branding but no specific products
    if (brandingAnalysis.logoRequired && !productAnalysis.productMentioned) {
      return 'branded-environment';
    }
    
    // Standard: No specific brand asset requirements
    return 'standard';
  }
  
  private analyzeOutputRequirements(direction: string) {
    // Determine if this should be image or video
    const isImageOnly = BRAND_DETECTION_PATTERNS.motionIndicators.static.some(k => direction.includes(k));
    
    // Determine motion style for video
    let motionStyle: 'static' | 'subtle' | 'environmental' | 'reveal' | null = null;
    
    if (BRAND_DETECTION_PATTERNS.motionIndicators.reveal.some(k => direction.includes(k))) {
      motionStyle = 'reveal';
    } else if (BRAND_DETECTION_PATTERNS.motionIndicators.environmental.some(k => direction.includes(k))) {
      motionStyle = 'environmental';
    } else if (BRAND_DETECTION_PATTERNS.motionIndicators.subtle.some(k => direction.includes(k))) {
      motionStyle = 'subtle';
    } else {
      // Default based on scene type
      motionStyle = 'subtle'; // Per user preference
    }
    
    return {
      outputType: isImageOnly ? 'image' as const : 'video' as const,
      motionStyle,
    };
  }
  
  private calculateConfidence(productAnalysis: any, brandingAnalysis: any): number {
    let confidence = 0;
    
    // Product mentions add confidence
    if (productAnalysis.productNames.length > 0) confidence += 0.4;
    if (productAnalysis.productMentioned) confidence += 0.2;
    if (productAnalysis.productVisibility === 'featured') confidence += 0.2;
    
    // Branding mentions add confidence
    if (brandingAnalysis.logoRequired) confidence += 0.3;
    if (brandingAnalysis.brandingVisibility === 'prominent') confidence += 0.2;
    
    return Math.min(confidence, 1);
  }
}

export const brandRequirementAnalyzer = new BrandRequirementAnalyzer();
```

---

## Phase 14B: Asset Matching Service

### Purpose
Match detected requirements against the Brand Media library to find the best assets for composition.

### Matching Logic

```typescript
// server/services/brand-asset-matcher.ts

import { db } from '../db';
import { brandMedia } from '../db/schema';
import { BrandRequirementAnalysis, BrandMediaAsset } from '../../shared/types/brand-asset-types';

class BrandAssetMatcher {
  
  /**
   * Find matching brand assets for detected requirements
   */
  async matchAssets(analysis: BrandRequirementAnalysis): Promise<BrandRequirementAnalysis> {
    const matchedAssets = {
      products: [] as BrandMediaAsset[],
      logos: [] as BrandMediaAsset[],
      locations: [] as BrandMediaAsset[],
    };
    
    // Match products
    if (analysis.requirements.productMentioned) {
      matchedAssets.products = await this.findProductAssets(
        analysis.requirements.productNames,
        analysis.requirements.productVisibility
      );
    }
    
    // Match logos
    if (analysis.requirements.logoRequired) {
      matchedAssets.logos = await this.findLogoAssets(
        analysis.requirements.logoType,
        analysis.requirements.brandingVisibility
      );
    }
    
    // Check for location assets if branded environment
    if (analysis.requirements.sceneType === 'branded-environment') {
      matchedAssets.locations = await this.findLocationAssets();
    }
    
    return {
      ...analysis,
      matchedAssets,
    };
  }
  
  /**
   * Find product assets matching product names
   */
  private async findProductAssets(
    productNames: string[],
    visibility: string
  ): Promise<BrandMediaAsset[]> {
    
    // Query Brand Media for products
    const allProductAssets = await db.query.brandMedia.findMany({
      where: (media, { or, eq, ilike }) => or(
        eq(media.mediaType, 'product'),
        eq(media.entityType, 'product'),
        ilike(media.tags, '%product%')
      ),
    });
    
    // Score and rank matches
    const scored = allProductAssets.map(asset => {
      let score = 0;
      const assetText = `${asset.name} ${asset.description} ${asset.tags} ${asset.matchKeywords}`.toLowerCase();
      
      // Check for product name matches
      for (const productName of productNames) {
        if (assetText.includes(productName.toLowerCase())) {
          score += 10; // Strong match
        }
      }
      
      // Prefer higher quality images for featured visibility
      if (visibility === 'featured' && asset.name?.toLowerCase().includes('hero')) {
        score += 5;
      }
      
      // Prefer images with transparent backgrounds for composition
      if (asset.fileName?.includes('png')) {
        score += 2;
      }
      
      return { asset, score };
    });
    
    // Sort by score and return top matches
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.asset);
  }
  
  /**
   * Find logo assets matching requirements
   */
  private async findLogoAssets(
    logoType: 'primary' | 'watermark' | 'certification' | null,
    visibility: string
  ): Promise<BrandMediaAsset[]> {
    
    const logoAssets = await db.query.brandMedia.findMany({
      where: (media, { or, eq, ilike }) => or(
        eq(media.mediaType, 'logo'),
        ilike(media.tags, '%logo%'),
        ilike(media.name, '%logo%')
      ),
    });
    
    // Score based on logo type preference
    const scored = logoAssets.map(asset => {
      let score = 0;
      const assetText = `${asset.name} ${asset.description} ${asset.entityName}`.toLowerCase();
      
      // Match logo type
      if (logoType === 'primary' && assetText.includes('primary')) score += 10;
      if (logoType === 'watermark' && assetText.includes('watermark')) score += 10;
      if (logoType === 'certification') {
        if (assetText.includes('usda') || assetText.includes('organic')) score += 10;
        if (assetText.includes('certification')) score += 5;
      }
      
      // Pine Hill Farm logos get priority
      if (assetText.includes('pine hill farm')) score += 5;
      
      // Prefer PNG for transparency
      if (asset.fileName?.includes('png')) score += 3;
      
      // For prominent visibility, prefer larger/clearer versions
      if (visibility === 'prominent' && assetText.includes('large')) score += 2;
      
      return { asset, score };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.asset);
  }
  
  /**
   * Find location/store assets
   */
  private async findLocationAssets(): Promise<BrandMediaAsset[]> {
    return db.query.brandMedia.findMany({
      where: (media, { or, eq, ilike }) => or(
        eq(media.mediaType, 'location'),
        eq(media.entityType, 'location'),
        ilike(media.tags, '%store%'),
        ilike(media.tags, '%location%'),
        ilike(media.tags, '%reception%')
      ),
      limit: 3,
    });
  }
  
  /**
   * Get the single best asset for a specific purpose
   */
  async getBestAsset(
    purpose: 'product-hero' | 'logo-overlay' | 'watermark' | 'product-group' | 'location',
    productName?: string
  ): Promise<BrandMediaAsset | null> {
    
    switch (purpose) {
      case 'product-hero':
        if (productName) {
          const products = await this.findProductAssets([productName], 'featured');
          return products[0] || null;
        }
        break;
        
      case 'logo-overlay':
        const logos = await this.findLogoAssets('primary', 'prominent');
        return logos[0] || null;
        
      case 'watermark':
        const watermarks = await this.findLogoAssets('watermark', 'subtle');
        return watermarks[0] || null;
        
      case 'product-group':
        // Find group product shot
        const groupAssets = await db.query.brandMedia.findMany({
          where: (media, { or, ilike }) => or(
            ilike(media.name, '%group%'),
            ilike(media.name, '%products%'),
            ilike(media.description, '%collection%')
          ),
          limit: 1,
        });
        return groupAssets[0] || null;
        
      case 'location':
        const locations = await this.findLocationAssets();
        return locations[0] || null;
    }
    
    return null;
  }
}

export const brandAssetMatcher = new BrandAssetMatcher();
```

---

## Success Metrics

After Phase 14 implementation:

| Metric | Before | After |
|--------|--------|-------|
| Brand accuracy in product scenes | ~30% | 100% |
| Logo legibility | ~20% | 100% |
| Product recognition | Generic | Actual PHF products |
| Label text accuracy | Garbled | Perfect |
| Brand consistency score | Variable | Consistent |

---

## Files Created in This Phase

| Sub-Phase | Files |
|-----------|-------|
| 14A | `brand-requirement-analyzer.ts`, `brand-asset-types.ts` |
| 14B | `brand-asset-matcher.ts` |
| 14C | `image-composition-service.ts` |
| 14D | `brand-video-pipeline.ts` |
| 14E | `logo-composition-service.ts` |
| 14F | `brand-workflow-orchestrator.ts` |

---

## Next Steps

Proceed to **Phase 14C** for the Image-to-Image Composition system, which handles placing products into AI-generated environments.
