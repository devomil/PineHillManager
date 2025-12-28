# Phase 4C: Brand Asset Injection Service

## Objective

Create a service that generates instructions for injecting brand assets (logos, watermarks, CTAs) into videos. This service determines what brand elements appear where and when in the video.

## Prerequisites

- Phase 4A complete (`brand-bible-service.ts` exists)
- Phase 4B complete (`prompt-enhancement-service.ts` exists)
- Brand assets uploaded with `usageContexts` configured

## What This Phase Creates

- `server/services/brand-injection-service.ts` - Generates brand overlay instructions

## What Success Looks Like

```
[BrandInject] Generating brand instructions for video...
[BrandInject] Intro animation configured (logo: main_logo.png)
[BrandInject] Watermark overlay configured (position: bottom-right, opacity: 0.7)
[BrandInject] Outro sequence configured with CTA
[BrandInject] Brand instructions complete for 5 scenes
```

---

## Step 1: Create Brand Injection Service

Create `server/services/brand-injection-service.ts`:

```typescript
// server/services/brand-injection-service.ts

import { brandBibleService, BrandBible, BrandAsset } from './brand-bible-service';

export interface BrandOverlay {
  type: 'logo' | 'watermark' | 'cta' | 'intro' | 'outro';
  assetUrl: string;
  position: {
    x: number;  // percentage 0-100
    y: number;  // percentage 0-100
    anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  size: {
    width: number;   // percentage of video width
    maxHeight?: number;  // percentage of video height
  };
  animation: {
    type: 'fade' | 'slide' | 'zoom' | 'none';
    duration: number;  // seconds
    delay?: number;    // seconds
  };
  timing: {
    startTime: number;  // seconds from scene start
    duration: number;   // how long to show (-1 = entire scene)
  };
  opacity: number;  // 0-1
}

export interface CTAText {
  headline: string;
  subtext?: string;
  url: string;
}

export interface SceneBrandOverlays {
  sceneId: string;
  overlays: BrandOverlay[];
  ctaText?: CTAText;
}

export interface VideoBrandInstructions {
  introAnimation?: BrandOverlay;
  watermark?: BrandOverlay;
  outroSequence?: BrandOverlay[];
  sceneOverlays: Map<string, SceneBrandOverlays>;
  colors: BrandBible['colors'];
  typography: BrandBible['typography'];
  callToAction: BrandBible['callToAction'];
}

interface SceneInfo {
  id: string;
  type: string;
  duration: number;
  isFirst: boolean;
  isLast: boolean;
}

class BrandInjectionService {
  
  /**
   * Generate brand injection instructions for an entire video
   */
  async generateBrandInstructions(scenes: SceneInfo[]): Promise<VideoBrandInstructions> {
    const bible = await brandBibleService.getBrandBible();
    
    console.log('[BrandInject] Generating brand instructions for video...');
    
    const instructions: VideoBrandInstructions = {
      sceneOverlays: new Map(),
      colors: bible.colors,
      typography: bible.typography,
      callToAction: bible.callToAction,
    };
    
    // 1. Generate intro animation for first scene
    const introLogo = bible.logos.intro || bible.logos.main;
    if (introLogo) {
      instructions.introAnimation = this.createIntroAnimation(
        introLogo,
        scenes[0]?.duration || 5
      );
      console.log(`[BrandInject] Intro animation configured (logo: ${introLogo.name})`);
    }
    
    // 2. Generate watermark for middle scenes
    const watermarkLogo = bible.logos.watermark || bible.logos.main;
    if (watermarkLogo) {
      instructions.watermark = this.createWatermarkOverlay(watermarkLogo);
      console.log(`[BrandInject] Watermark overlay configured (position: ${instructions.watermark.position.anchor}, opacity: ${instructions.watermark.opacity})`);
    }
    
    // 3. Generate outro sequence for last scene
    const outroLogo = bible.logos.outro || bible.logos.main;
    if (outroLogo) {
      const lastScene = scenes[scenes.length - 1];
      instructions.outroSequence = this.createOutroSequence(
        outroLogo,
        bible.callToAction,
        lastScene?.duration || 5
      );
      console.log('[BrandInject] Outro sequence configured with CTA');
    }
    
    // 4. Generate per-scene overlay instructions
    for (const scene of scenes) {
      const sceneOverlays = await this.generateSceneOverlays(scene, bible);
      instructions.sceneOverlays.set(scene.id, sceneOverlays);
    }
    
    console.log(`[BrandInject] Brand instructions complete for ${scenes.length} scenes`);
    
    return instructions;
  }

  /**
   * Create intro logo animation overlay
   */
  private createIntroAnimation(logo: BrandAsset, sceneDuration: number): BrandOverlay {
    const placement = logo.placementSettings || {};
    
    return {
      type: 'intro',
      assetUrl: logo.url,
      position: {
        x: 50,
        y: 50,
        anchor: 'center',
      },
      size: {
        width: 30,  // 30% of video width
        maxHeight: 25,
      },
      animation: {
        type: placement.animation || 'zoom',
        duration: 1.5,
        delay: 0.3,
      },
      timing: {
        startTime: 0,
        duration: Math.min(3, sceneDuration * 0.5),  // Max 3 seconds or 50% of scene
      },
      opacity: 1,
    };
  }

  /**
   * Create persistent watermark overlay
   */
  private createWatermarkOverlay(logo: BrandAsset): BrandOverlay {
    const placement = logo.placementSettings || {};
    const position = placement.position || 'bottom-right';
    
    // Map position to coordinates
    const positionMap: Record<string, { x: number; y: number }> = {
      'top-left': { x: 8, y: 8 },
      'top-right': { x: 92, y: 8 },
      'bottom-left': { x: 8, y: 92 },
      'bottom-right': { x: 92, y: 92 },
      'center': { x: 50, y: 50 },
    };
    
    const coords = positionMap[position] || positionMap['bottom-right'];
    
    return {
      type: 'watermark',
      assetUrl: logo.url,
      position: {
        x: coords.x,
        y: coords.y,
        anchor: position as BrandOverlay['position']['anchor'],
      },
      size: {
        width: placement.scale ? placement.scale * 20 : 12,  // Default 12% width
        maxHeight: 10,
      },
      animation: {
        type: 'fade',
        duration: 0.5,
        delay: 0,
      },
      timing: {
        startTime: 0,
        duration: -1,  // -1 = entire scene
      },
      opacity: placement.opacity || 0.7,
    };
  }

  /**
   * Create outro CTA sequence
   */
  private createOutroSequence(
    logo: BrandAsset,
    cta: BrandBible['callToAction'],
    sceneDuration: number
  ): BrandOverlay[] {
    const overlays: BrandOverlay[] = [];
    const outroStartTime = Math.max(0, sceneDuration - 4);  // Start 4 seconds before end
    
    // Logo overlay
    overlays.push({
      type: 'outro',
      assetUrl: logo.url,
      position: {
        x: 50,
        y: 30,
        anchor: 'center',
      },
      size: {
        width: 25,
        maxHeight: 20,
      },
      animation: {
        type: 'fade',
        duration: 0.8,
        delay: 0,
      },
      timing: {
        startTime: outroStartTime,
        duration: 4,
      },
      opacity: 1,
    });
    
    return overlays;
  }

  /**
   * Generate overlays for a specific scene
   */
  private async generateSceneOverlays(
    scene: SceneInfo,
    bible: BrandBible
  ): Promise<SceneBrandOverlays> {
    const overlays: BrandOverlay[] = [];
    
    // For product scenes, try to find matching product assets
    if (scene.type === 'product') {
      const productAssets = await brandBibleService.getAssetsForContext('product');
      if (productAssets.length > 0) {
        overlays.push({
          type: 'logo',
          assetUrl: productAssets[0].url,
          position: {
            x: 85,
            y: 75,
            anchor: 'bottom-right',
          },
          size: {
            width: 20,
            maxHeight: 25,
          },
          animation: {
            type: 'fade',
            duration: 0.5,
            delay: 1,
          },
          timing: {
            startTime: 1,
            duration: scene.duration - 2,
          },
          opacity: 1,
        });
      }
    }
    
    const result: SceneBrandOverlays = {
      sceneId: scene.id,
      overlays,
    };
    
    // Add CTA text data for last scene
    if (scene.isLast) {
      result.ctaText = {
        headline: bible.callToAction.text,
        subtext: bible.callToAction.subtext,
        url: bible.callToAction.url,
      };
    }
    
    return result;
  }

  /**
   * Match brand assets to scene based on narration content
   */
  async matchAssetsToScene(
    sceneNarration: string,
    sceneType: string
  ): Promise<BrandAsset[]> {
    const keywords = this.extractKeywords(sceneNarration);
    keywords.push(sceneType);
    
    return brandBibleService.getAssetsForKeywords(keywords);
  }

  /**
   * Extract keywords from text for asset matching
   */
  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'your', 'you', 'our', 'we', 'they', 'them', 'their', 'this', 'that',
      'it', 'its', 'if', 'then', 'so', 'just', 'only', 'also', 'very',
    ]);
    
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
  }

  /**
   * Check if brand assets are configured for video generation
   */
  async hasBrandAssets(): Promise<{
    hasIntro: boolean;
    hasWatermark: boolean;
    hasOutro: boolean;
    hasCTA: boolean;
  }> {
    const bible = await brandBibleService.getBrandBible();
    
    return {
      hasIntro: !!(bible.logos.intro || bible.logos.main),
      hasWatermark: !!(bible.logos.watermark || bible.logos.main),
      hasOutro: !!(bible.logos.outro || bible.logos.main),
      hasCTA: !!bible.callToAction.text,
    };
  }
}

export const brandInjectionService = new BrandInjectionService();
```

---

## Step 2: Test the Service

Add a temporary test route:

```typescript
// Temporary test - add to routes.ts
router.post('/api/test-brand-injection', async (req, res) => {
  try {
    const testScenes = [
      { id: 'scene-1', type: 'hook', duration: 5, isFirst: true, isLast: false },
      { id: 'scene-2', type: 'problem', duration: 6, isFirst: false, isLast: false },
      { id: 'scene-3', type: 'solution', duration: 5, isFirst: false, isLast: false },
      { id: 'scene-4', type: 'cta', duration: 5, isFirst: false, isLast: true },
    ];
    
    const instructions = await brandInjectionService.generateBrandInstructions(testScenes);
    
    res.json({
      hasIntro: !!instructions.introAnimation,
      introAsset: instructions.introAnimation?.assetUrl,
      hasWatermark: !!instructions.watermark,
      watermarkPosition: instructions.watermark?.position,
      watermarkOpacity: instructions.watermark?.opacity,
      hasOutro: !!(instructions.outroSequence && instructions.outroSequence.length > 0),
      colors: instructions.colors,
      cta: instructions.callToAction,
      sceneCount: instructions.sceneOverlays.size,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 3: Verify Asset Configuration

For brand injection to work properly, ensure your brand assets have correct `usageContexts`:

| Asset Type | usageContexts Value | Used For |
|------------|---------------------|----------|
| Main Logo | `['main', 'primary']` | Fallback for all positions |
| Intro Logo | `['intro', 'opening']` | First scene animation |
| Watermark | `['watermark', 'overlay']` | Corner watermark |
| Outro Logo | `['outro', 'closing', 'cta']` | Final CTA screen |
| Product Image | `['product']` | Product scene overlays |

---

## Verification Checklist

Before moving to Phase 4D, confirm:

- [ ] `server/services/brand-injection-service.ts` exists
- [ ] Service exports `brandInjectionService` singleton
- [ ] Service exports all interfaces (`BrandOverlay`, `VideoBrandInstructions`, etc.)
- [ ] `createIntroAnimation()` generates correct overlay data
- [ ] `createWatermarkOverlay()` uses placement settings from asset
- [ ] `createOutroSequence()` includes logo and CTA data
- [ ] Scene overlays map is populated correctly
- [ ] Console logging shows injection configuration
- [ ] Test endpoint returns expected brand instruction data

---

## Overlay Timing Reference

```
Scene Timeline (5 second scene):
|-----------------------------------------------------|
0s                                                    5s

Intro Animation (first scene only):
|=====[LOGO FADE IN]=====|
0s    0.3s              3s

Watermark (middle scenes):
|--[fade]--[================VISIBLE================]--|
0s  0.5s                                             5s

Outro CTA (last scene, 5 seconds):
|------------------------[===CTA OVERLAY===]|
0s                       1s                 5s
                         (4 sec before end)
```

---

## Troubleshooting

### "No intro animation generated"
- Check that at least one logo asset exists
- Verify `usageContexts` includes 'intro' or 'main'
- Check `isActive` is true on the asset

### "Watermark in wrong position"
- Check `placementSettings.position` on the watermark asset
- Valid values: 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'

### "CTA text not appearing"
- Verify `DEFAULT_BRAND_SETTINGS.callToAction` is configured
- Check that last scene has `isLast: true`

---

## Next Phase

Once brand injection service is working, proceed to **Phase 4D: Pipeline Integration** to connect these services to the video generation pipeline.
