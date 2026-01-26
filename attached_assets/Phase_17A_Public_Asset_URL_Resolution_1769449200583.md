# Phase 17A: Public Asset URL Resolution

## Priority: CRITICAL

This phase fixes the image loading errors that prevent ALL brand assets from appearing in rendered videos.

---

## The Problem

```
Error loading image with src: https://58265a68-cbcc-4b55-91b2-58806c585b51-00-395r5svtpwqde.picard.replit.dev/assets/pine-hill-farm-logo.png
```

**Why it fails:**
1. Brand assets are stored in Replit Object Storage
2. URLs served to frontend are relative (`/api/brand-assets/file/123`)
3. Server resolves these to Replit dev URLs (`*.picard.replit.dev`)
4. Remotion Lambda runs in AWS - it CANNOT access Replit's internal servers
5. All images fail to load → no logos, watermarks, or brand graphics

---

## Solution Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   ASSET URL RESOLUTION FLOW                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Input: /api/brand-assets/file/123                             │
│           ↓                                                     │
│  Step 1: Parse asset ID from URL                               │
│           ↓                                                     │
│  Step 2: Load asset metadata from database                     │
│           ↓                                                     │
│  Step 3: Get storage path from settings                        │
│           (e.g., "bucket-name|public/uploads/logo.png")        │
│           ↓                                                     │
│  Step 4: Construct public GCS URL                              │
│           https://storage.googleapis.com/{bucket}/{path}        │
│           ↓                                                     │
│  Output: https://storage.googleapis.com/replit-objstore-.../logo.png
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation

### Step 1: Create Asset URL Resolver Service

Create `server/services/asset-url-resolver.ts`:

```typescript
// server/services/asset-url-resolver.ts

import { db } from '../db';
import { brandAssets } from '../db/schema';
import { eq } from 'drizzle-orm';

// Cache resolved URLs to avoid repeated database lookups
const urlCache = new Map<string, string>();

export interface AssetUrlResolverOptions {
  skipCache?: boolean;
  preferPiAPI?: boolean;  // If true, upload to PiAPI ephemeral storage
}

class AssetUrlResolver {
  
  /**
   * Resolve any asset URL to a publicly accessible URL.
   * 
   * Handles:
   * - Relative URLs: /api/brand-assets/file/123
   * - Replit dev URLs: https://*.picard.replit.dev/...
   * - Already public URLs: https://storage.googleapis.com/...
   */
  async resolve(url: string, options: AssetUrlResolverOptions = {}): Promise<string | null> {
    if (!url) {
      console.log('[AssetURL] Empty URL provided');
      return null;
    }
    
    // Already a public cloud URL - return as-is
    if (this.isPublicUrl(url)) {
      console.log('[AssetURL] Already public:', url.substring(0, 60) + '...');
      return url;
    }
    
    // Check cache first
    if (!options.skipCache && urlCache.has(url)) {
      console.log('[AssetURL] Cache hit for:', url);
      return urlCache.get(url)!;
    }
    
    // Resolve based on URL type
    let publicUrl: string | null = null;
    
    if (url.startsWith('/api/brand-assets/file/')) {
      publicUrl = await this.resolveRelativeAssetUrl(url);
    } else if (url.includes('.picard.replit.dev') || url.includes('.replit.dev')) {
      publicUrl = await this.resolveReplitDevUrl(url);
    } else if (url.startsWith('/assets/') || url.startsWith('/uploads/')) {
      publicUrl = await this.resolveStaticPath(url);
    }
    
    // Cache successful resolution
    if (publicUrl) {
      urlCache.set(url, publicUrl);
      console.log('[AssetURL] Resolved:', url, '→', publicUrl.substring(0, 60) + '...');
    } else {
      console.warn('[AssetURL] Failed to resolve:', url);
    }
    
    return publicUrl;
  }
  
  /**
   * Batch resolve multiple URLs (more efficient)
   */
  async resolveAll(urls: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
    // Process in parallel with concurrency limit
    const batchSize = 5;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const resolved = await Promise.all(
        batch.map(url => this.resolve(url))
      );
      batch.forEach((url, idx) => results.set(url, resolved[idx]));
    }
    
    return results;
  }
  
  /**
   * Check if URL is already publicly accessible
   */
  private isPublicUrl(url: string): boolean {
    return (
      url.startsWith('https://storage.googleapis.com/') ||
      url.startsWith('https://storage.theapi.app/') ||
      url.startsWith('https://s3.') ||
      url.startsWith('https://cdn.') ||
      url.includes('.s3.amazonaws.com') ||
      url.includes('.r2.cloudflarestorage.com')
    );
  }
  
  /**
   * Resolve relative brand asset URL: /api/brand-assets/file/123
   */
  private async resolveRelativeAssetUrl(url: string): Promise<string | null> {
    try {
      // Extract asset ID
      const match = url.match(/\/api\/brand-assets\/file\/(\d+)/);
      if (!match) {
        console.log('[AssetURL] Invalid relative URL format:', url);
        return null;
      }
      
      const assetId = parseInt(match[1]);
      if (isNaN(assetId) || assetId <= 0) {
        console.log('[AssetURL] Invalid asset ID:', match[1]);
        return null;
      }
      
      // Load asset from database
      const [asset] = await db
        .select()
        .from(brandAssets)
        .where(eq(brandAssets.id, assetId));
      
      if (!asset) {
        console.log('[AssetURL] Asset not found:', assetId);
        return null;
      }
      
      // Get storage path from settings
      const settings = asset.settings as any;
      const storagePath = settings?.storagePath;
      
      if (!storagePath) {
        console.log('[AssetURL] No storagePath for asset:', assetId);
        // Try fileUrl if available
        if (asset.fileUrl && this.isPublicUrl(asset.fileUrl)) {
          return asset.fileUrl;
        }
        return null;
      }
      
      // Parse storage path: "bucketName|objectPath"
      const [bucketName, objectPath] = storagePath.split('|');
      if (!bucketName || !objectPath) {
        console.log('[AssetURL] Invalid storagePath format:', storagePath);
        return null;
      }
      
      // Construct public GCS URL
      return `https://storage.googleapis.com/${bucketName}/${objectPath}`;
      
    } catch (error) {
      console.error('[AssetURL] Error resolving relative URL:', error);
      return null;
    }
  }
  
  /**
   * Resolve Replit dev URL to GCS URL
   */
  private async resolveReplitDevUrl(url: string): Promise<string | null> {
    try {
      // Extract path from Replit URL
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // If it's a brand asset endpoint, resolve it
      if (path.startsWith('/api/brand-assets/file/')) {
        return this.resolveRelativeAssetUrl(path);
      }
      
      // If it's a static asset path, resolve it
      if (path.startsWith('/assets/') || path.startsWith('/uploads/')) {
        return this.resolveStaticPath(path);
      }
      
      console.log('[AssetURL] Unknown Replit URL pattern:', path);
      return null;
      
    } catch (error) {
      console.error('[AssetURL] Error parsing Replit URL:', error);
      return null;
    }
  }
  
  /**
   * Resolve static path like /assets/logo.png
   */
  private async resolveStaticPath(path: string): Promise<string | null> {
    // For static assets, we need to either:
    // 1. Look them up in the database by filename
    // 2. Have them pre-uploaded to cloud storage
    
    console.log('[AssetURL] Static path resolution not yet implemented:', path);
    console.log('[AssetURL] Consider uploading static assets to cloud storage');
    
    // TODO: Implement lookup by filename or return pre-configured URLs
    return null;
  }
  
  /**
   * Clear the URL cache (useful for testing or when assets change)
   */
  clearCache(): void {
    urlCache.clear();
    console.log('[AssetURL] Cache cleared');
  }
}

export const assetUrlResolver = new AssetUrlResolver();
```

---

### Step 2: Update Brand Injection Service

In `server/services/brand-injection-service.ts`, update asset URL handling:

```typescript
import { assetUrlResolver } from './asset-url-resolver';

// In the createInjectionPlan method, after loading assets:

async createInjectionPlan(projectId: number, organizationId: number): Promise<BrandInjectionPlan> {
  // ... existing code to load brand assets ...
  
  // ═══════════════════════════════════════════════════════════════
  // CRITICAL: Resolve all asset URLs to public URLs
  // ═══════════════════════════════════════════════════════════════
  
  console.log('[BrandInjection] Resolving asset URLs to public URLs...');
  
  const urlsToResolve = [
    primaryLogo?.url,
    watermarkAsset?.url,
    ctaLogo?.url,
  ].filter(Boolean) as string[];
  
  const resolvedUrls = await assetUrlResolver.resolveAll(urlsToResolve);
  
  // Update asset URLs with resolved public URLs
  if (primaryLogo?.url) {
    const resolved = resolvedUrls.get(primaryLogo.url);
    if (resolved) {
      primaryLogo = { ...primaryLogo, url: resolved };
      console.log('[BrandInjection] Logo URL resolved:', resolved.substring(0, 50) + '...');
    } else {
      console.warn('[BrandInjection] Failed to resolve logo URL - logo will not appear');
      primaryLogo = null;
    }
  }
  
  if (watermarkAsset?.url) {
    const resolved = resolvedUrls.get(watermarkAsset.url);
    if (resolved) {
      watermarkAsset = { ...watermarkAsset, url: resolved };
    } else {
      watermarkAsset = null;
    }
  }
  
  if (ctaLogo?.url) {
    const resolved = resolvedUrls.get(ctaLogo.url);
    if (resolved) {
      ctaLogo = { ...ctaLogo, url: resolved };
    } else {
      ctaLogo = null;
    }
  }
  
  // ... rest of the method ...
}
```

---

### Step 3: Update Overlay Configuration Service

In `server/services/overlay-configuration-service.ts`:

```typescript
import { assetUrlResolver } from './asset-url-resolver';

async generateSceneOverlays(
  scene: Scene,
  brandBible: BrandBible,
  context: { isFirst: boolean; isLast: boolean; isCTA: boolean }
): Promise<SceneOverlayConfig> {
  const config: SceneOverlayConfig = {
    sceneId: scene.id,
    sceneType: scene.sceneType,
  };
  
  // ═══════════════════════════════════════════════════════════════
  // CRITICAL: Resolve logo URLs before using
  // ═══════════════════════════════════════════════════════════════
  
  const introLogoUrl = brandBible.logos.intro?.url || brandBible.logos.main?.url;
  const watermarkUrl = brandBible.logos.watermark?.url || brandBible.logos.main?.url;
  const outroLogoUrl = brandBible.logos.outro?.url || brandBible.logos.main?.url;
  
  // Resolve all URLs in parallel
  const [resolvedIntro, resolvedWatermark, resolvedOutro] = await Promise.all([
    introLogoUrl ? assetUrlResolver.resolve(introLogoUrl) : null,
    watermarkUrl ? assetUrlResolver.resolve(watermarkUrl) : null,
    outroLogoUrl ? assetUrlResolver.resolve(outroLogoUrl) : null,
  ]);
  
  // First scene - Logo intro with RESOLVED URL
  if (context.isFirst && resolvedIntro) {
    config.logo = {
      enabled: true,
      url: resolvedIntro,  // Use resolved URL!
      position: 'center',
      size: 25,
      opacity: 1,
      animation: 'zoom',
      timing: { startTime: 0.5, duration: 2.5 },
    };
  }
  
  // Middle scenes - Watermark with RESOLVED URL
  if (!context.isFirst && !context.isLast && resolvedWatermark) {
    config.watermark = {
      enabled: true,
      url: resolvedWatermark,  // Use resolved URL!
      position: 'bottom-right',
      size: 8,
      opacity: 0.6,
    };
  }
  
  // Last scene - CTA logo with RESOLVED URL
  if (context.isCTA || context.isLast) {
    if (resolvedOutro) {
      config.logo = {
        enabled: true,
        url: resolvedOutro,  // Use resolved URL!
        position: 'center',
        size: 20,
        opacity: 1,
        animation: 'fade',
        timing: { startTime: 2, duration: -1 },
      };
    }
    
    // CTA overlay config...
  }
  
  return config;
}
```

---

### Step 4: Add URL Validation in Remotion Composition

In `remotion/UniversalVideoComposition.tsx`, add defensive checks:

```tsx
// Helper function to validate URLs before rendering
function isValidImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  
  // Must be an absolute URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    console.warn('[Remotion] Invalid image URL (not absolute):', url);
    return false;
  }
  
  // Must NOT be a Replit dev URL
  if (url.includes('.picard.replit.dev') || url.includes('.replit.dev/')) {
    console.error('[Remotion] Invalid image URL (Replit dev URL):', url);
    console.error('[Remotion] This URL is not accessible from Lambda!');
    return false;
  }
  
  return true;
}

// In the component, use this before rendering images:
{config.logo?.enabled && isValidImageUrl(config.logo.url) && (
  <LogoOverlay
    logoUrl={config.logo.url}
    position={config.logo.position}
    // ...
  />
)}
```

---

## Verification

### Console Output (Expected):

```
[AssetURL] Resolving: /api/brand-assets/file/123
[AssetURL] Asset 123 storage path: replit-objstore-abc|public/uploads/logo.png
[AssetURL] Resolved: /api/brand-assets/file/123 → https://storage.googleapis.com/replit-objstore-abc/public/uploads/logo.png

[BrandInjection] Logo URL resolved: https://storage.googleapis.com/replit-objstore-...
[BrandInjection] Watermark URL resolved: https://storage.googleapis.com/replit-objstore-...
```

### Test Command:

```bash
# Test URL resolution directly
curl -I "https://storage.googleapis.com/YOUR_BUCKET/path/to/logo.png"
# Should return 200 OK if publicly accessible
```

---

## Troubleshooting

### "Asset not found"
- Check the asset ID exists in the `brand_assets` table
- Verify the asset belongs to the correct organization

### "No storagePath for asset"
- The asset was uploaded before storage path tracking was implemented
- Re-upload the asset to get a proper storage path

### "Invalid storagePath format"
- Storage path should be `bucketName|objectPath`
- Check for corruption in the `settings` JSON column

### URL Still Returns 403 Forbidden
- The GCS bucket may not be public
- Check Replit Object Storage settings
- May need to use PiAPI ephemeral upload instead

---

## Next Phase

Once URLs resolve correctly, proceed to **Phase_17B_Overlay_Pipeline_Connection.md** to wire the overlay configuration to Remotion.
