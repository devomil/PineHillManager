# Phase 4A: Brand Bible Service

## Objective

Create a service that loads all brand assets from the existing `brand_media_library` database table and provides them to the video generation pipeline. This is the foundation for all brand integration.

## Prerequisites

- Phases 1-3 complete
- Database table `brand_media_library` exists
- API routes `/api/brand-media-library` working
- At least one brand asset uploaded via the Brand Media tab

## What This Phase Creates

- `server/services/brand-bible-service.ts` - Core service for brand asset management

## What Success Looks Like

```
[BrandBible] Loading brand assets from database...
[BrandBible] Loaded 5 active brand assets
[BrandBible] Logos found: main=true, watermark=true, intro=false, outro=true
[BrandBible] Brand bible loaded successfully
```

---

## Step 1: Create Brand Bible Service

Create `server/services/brand-bible-service.ts`:

```typescript
// server/services/brand-bible-service.ts

import { db } from '../db';
import { brandMediaLibrary } from '@shared/schema';
import { eq } from 'drizzle-orm';

export interface BrandAsset {
  id: number;
  name: string;
  description?: string;
  mediaType: 'logo' | 'photo' | 'video' | 'graphic' | 'watermark';
  entityName?: string;
  entityType?: string;
  url: string;
  thumbnailUrl?: string;
  matchKeywords: string[];
  excludeKeywords: string[];
  usageContexts: string[];
  placementSettings?: {
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    scale?: number;
    opacity?: number;
    animation?: 'fade' | 'slide' | 'zoom' | 'none';
  };
  priority: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
}

export interface BrandTypography {
  headingFont: string;
  bodyFont: string;
}

export interface BrandCTA {
  text: string;
  subtext?: string;
  buttonText?: string;
  url: string;
}

export interface BrandBible {
  brandName: string;
  tagline?: string;
  website?: string;
  industry: string;
  colors: BrandColors;
  typography: BrandTypography;
  logos: {
    main?: BrandAsset;
    watermark?: BrandAsset;
    intro?: BrandAsset;
    outro?: BrandAsset;
    favicon?: BrandAsset;
  };
  assets: BrandAsset[];
  callToAction: BrandCTA;
  promptContext: string;
  negativePrompts: string[];
}

// Default brand settings - customize for your brand
const DEFAULT_BRAND_SETTINGS = {
  brandName: 'Pine Hill Farm',
  tagline: 'Natural Wellness, Naturally You',
  website: 'PineHillFarm.com',
  industry: 'wellness and natural health supplements',
  colors: {
    primary: '#2D5A27',
    secondary: '#8B7355',
    accent: '#D4A574',
    text: '#FFFFFF',
    background: '#1A1A1A',
  },
  typography: {
    headingFont: 'Montserrat',
    bodyFont: 'Open Sans',
  },
  callToAction: {
    text: 'Start Your Wellness Journey Today',
    subtext: 'Natural solutions for lasting health',
    buttonText: 'Learn More',
    url: 'PineHillFarm.com',
  },
};

class BrandBibleService {
  private cachedBible: BrandBible | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Load the complete brand bible with caching
   */
  async getBrandBible(forceRefresh = false): Promise<BrandBible> {
    const now = Date.now();
    
    // Return cached version if valid
    if (!forceRefresh && this.cachedBible && (now - this.cacheTimestamp) < this.cacheTTL) {
      console.log('[BrandBible] Using cached brand bible');
      return this.cachedBible;
    }

    console.log('[BrandBible] Loading brand assets from database...');

    try {
      // Load all active brand assets from database
      const dbAssets = await db
        .select()
        .from(brandMediaLibrary)
        .where(eq(brandMediaLibrary.isActive, true));

      // Transform database records to BrandAsset interface
      const assets: BrandAsset[] = dbAssets.map(asset => ({
        id: asset.id,
        name: asset.name,
        description: asset.description || undefined,
        mediaType: asset.mediaType as BrandAsset['mediaType'],
        entityName: asset.entityName || undefined,
        entityType: asset.entityType || undefined,
        url: asset.url,
        thumbnailUrl: asset.thumbnailUrl || undefined,
        matchKeywords: asset.matchKeywords || [],
        excludeKeywords: asset.excludeKeywords || [],
        usageContexts: asset.usageContexts || [],
        placementSettings: asset.placementSettings as BrandAsset['placementSettings'],
        priority: asset.priority || 0,
        isDefault: asset.isDefault || false,
        isActive: asset.isActive ?? true,
      }));

      console.log(`[BrandBible] Loaded ${assets.length} active brand assets`);

      // Categorize logos by usage context
      const logos = {
        main: this.findAssetByContext(assets, 'logo', ['main', 'primary']),
        watermark: this.findAssetByContext(assets, 'watermark', ['watermark', 'overlay']) ||
                   this.findAssetByContext(assets, 'logo', ['watermark']),
        intro: this.findAssetByContext(assets, 'logo', ['intro', 'opening']),
        outro: this.findAssetByContext(assets, 'logo', ['outro', 'closing', 'cta']),
        favicon: this.findAssetByContext(assets, 'logo', ['favicon', 'icon']),
      };

      // Build complete brand bible
      const bible: BrandBible = {
        ...DEFAULT_BRAND_SETTINGS,
        logos,
        assets,
        promptContext: this.buildPromptContext(),
        negativePrompts: this.buildNegativePrompts(),
      };

      // Cache the result
      this.cachedBible = bible;
      this.cacheTimestamp = now;

      console.log('[BrandBible] Brand bible loaded successfully');
      console.log(`[BrandBible] Logos found: main=${!!logos.main}, watermark=${!!logos.watermark}, intro=${!!logos.intro}, outro=${!!logos.outro}`);

      return bible;

    } catch (error: any) {
      console.error('[BrandBible] Failed to load from database:', error.message);
      
      // Return default bible without assets on error
      return {
        ...DEFAULT_BRAND_SETTINGS,
        logos: {},
        assets: [],
        promptContext: this.buildPromptContext(),
        negativePrompts: this.buildNegativePrompts(),
      };
    }
  }

  /**
   * Find an asset by media type and usage context keywords
   */
  private findAssetByContext(
    assets: BrandAsset[],
    mediaType: string,
    contextKeywords: string[]
  ): BrandAsset | undefined {
    // First: exact mediaType match with matching usageContext
    let matches = assets.filter(a => 
      a.mediaType === mediaType &&
      a.usageContexts.some(ctx => 
        contextKeywords.some(kw => ctx.toLowerCase().includes(kw.toLowerCase()))
      )
    );

    // Second: try matchKeywords if no usageContext match
    if (matches.length === 0) {
      matches = assets.filter(a =>
        a.mediaType === mediaType &&
        a.matchKeywords.some(kw =>
          contextKeywords.some(ctx => kw.toLowerCase().includes(ctx.toLowerCase()))
        )
      );
    }

    // Third: fall back to default asset for that mediaType
    if (matches.length === 0) {
      matches = assets.filter(a => a.mediaType === mediaType && a.isDefault);
    }

    // Sort by priority (highest first) and return top match
    if (matches.length > 0) {
      matches.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      return matches[0];
    }

    return undefined;
  }

  /**
   * Build brand context string for AI prompts
   */
  private buildPromptContext(): string {
    return `For ${DEFAULT_BRAND_SETTINGS.brandName}, a ${DEFAULT_BRAND_SETTINGS.industry} brand. ` +
           `Style: professional, warm, natural, wellness-focused, trustworthy. ` +
           `Aesthetic: soft natural lighting, earth tones, clean compositions, human connection.`;
  }

  /**
   * Build mandatory negative prompts to prevent AI hallucination
   */
  private buildNegativePrompts(): string[] {
    return [
      // Prevent text generation
      'no text', 'no words', 'no letters', 'no writing', 'no captions',
      'no subtitles', 'no titles', 'no labels', 'no signs', 'no typography',
      
      // Prevent UI/infographic hallucination  
      'no user interface', 'no UI elements', 'no buttons', 'no menus',
      'no calendars', 'no charts', 'no graphs', 'no infographics',
      'no data visualizations', 'no spreadsheets', 'no tables', 'no icons', 'no emojis',
      
      // Prevent watermarks/logos (we add our own)
      'no watermarks', 'no logos', 'no brand marks', 'no stock photo watermarks',
      
      // Quality
      'no blur', 'no artifacts', 'no distortion', 'no low quality', 'no pixelation',
    ];
  }

  /**
   * Get assets matching specific keywords
   */
  async getAssetsForKeywords(keywords: string[]): Promise<BrandAsset[]> {
    const bible = await this.getBrandBible();
    
    return bible.assets.filter(asset =>
      // Match if any keyword matches asset's matchKeywords, name, or description
      keywords.some(keyword =>
        asset.matchKeywords.some(mk => 
          mk.toLowerCase().includes(keyword.toLowerCase())
        ) ||
        asset.name.toLowerCase().includes(keyword.toLowerCase()) ||
        (asset.description || '').toLowerCase().includes(keyword.toLowerCase())
      ) &&
      // Exclude if any keyword matches excludeKeywords
      !keywords.some(keyword =>
        asset.excludeKeywords.some(ek =>
          ek.toLowerCase().includes(keyword.toLowerCase())
        )
      )
    );
  }

  /**
   * Get assets for a specific usage context
   */
  async getAssetsForContext(context: string): Promise<BrandAsset[]> {
    const bible = await this.getBrandBible();
    
    return bible.assets
      .filter(asset => 
        asset.usageContexts.some(ctx => 
          ctx.toLowerCase() === context.toLowerCase()
        )
      )
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Clear cache - call after brand asset updates
   */
  clearCache(): void {
    this.cachedBible = null;
    this.cacheTimestamp = 0;
    console.log('[BrandBible] Cache cleared');
  }

  /**
   * Check if brand bible has minimum required assets
   */
  async hasMinimumAssets(): Promise<boolean> {
    const bible = await this.getBrandBible();
    return bible.assets.length > 0 && (!!bible.logos.main || !!bible.logos.watermark);
  }
}

export const brandBibleService = new BrandBibleService();
```

---

## Step 2: Add Cache Clearing to Brand Media Routes

In `server/routes.ts`, find the brand media library routes and add cache clearing after mutations.

Add this import at the top of the routes file:
```typescript
import { brandBibleService } from './services/brand-bible-service';
```

After the POST `/api/brand-media-library` handler's success response, add:
```typescript
brandBibleService.clearCache();
```

After the PUT `/api/brand-media-library/:id` handler's success response, add:
```typescript
brandBibleService.clearCache();
```

After the DELETE `/api/brand-media-library/:id` handler's success response, add:
```typescript
brandBibleService.clearCache();
```

---

## Step 3: Test the Service

Create a simple test by adding a temporary route or calling from an existing endpoint:

```typescript
// Temporary test - add to routes.ts
router.get('/api/test-brand-bible', async (req, res) => {
  try {
    const bible = await brandBibleService.getBrandBible();
    res.json({
      brandName: bible.brandName,
      assetCount: bible.assets.length,
      logos: {
        main: !!bible.logos.main,
        watermark: !!bible.logos.watermark,
        intro: !!bible.logos.intro,
        outro: !!bible.logos.outro,
      },
      negativePromptsCount: bible.negativePrompts.length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Verification Checklist

Before moving to Phase 4B, confirm:

- [ ] `server/services/brand-bible-service.ts` exists
- [ ] Service exports `brandBibleService` singleton
- [ ] Service exports all interfaces (`BrandAsset`, `BrandBible`, etc.)
- [ ] Database query successfully loads active brand assets
- [ ] Logo categorization works (finds assets by usageContexts)
- [ ] Cache works (second call within 5 minutes uses cache)
- [ ] `clearCache()` method works
- [ ] Default brand settings are correct for Pine Hill Farm
- [ ] Negative prompts list includes text prevention terms
- [ ] Console shows proper logging during load

---

## Troubleshooting

### "Cannot find module '../db'"
- Check your database connection file path
- May need to adjust import based on your project structure

### "brandMediaLibrary is not defined"
- Verify import from `@shared/schema`
- Check the table name matches your schema

### "No assets loading"
- Verify assets exist in database with `isActive = true`
- Check database connection is working
- Look for errors in console

### "Logos not being categorized"
- Check that uploaded assets have `usageContexts` set
- Verify the context values match: 'main', 'watermark', 'intro', 'outro'

---

## Next Phase

Once brand bible service is working, proceed to **Phase 4B: Prompt Enhancement** to use the brand data for AI prompt improvement.
