# Phase 18A: Asset URL Resolution

## Priority: CRITICAL
## Dependency: None
## Estimated Time: 2-3 hours

---

## Problem

Brand assets stored with relative URLs fail to load in Remotion Lambda:

```
Error: Error loading image with src: 
https://58265a68-cbcc-4b55-91b2-58806c585b51-00-395r5svtpwqde.picard.replit.dev/assets/logo.png
```

**Why:** Remotion Lambda runs in AWS and cannot access Replit's internal dev server.

---

## Solution

Create `assetUrlResolver` service that converts relative URLs to public GCS URLs.

---

## Task 1: Create Asset URL Resolver Service

Create file: `server/services/asset-url-resolver.ts`

```typescript
// server/services/asset-url-resolver.ts

import { db } from '../db';
import { brandAssets } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface ResolvedUrl {
  original: string;
  resolved: string;
  isPublic: boolean;
}

class AssetUrlResolver {
  private cache: Map<string, string> = new Map();
  private gcsBucket: string;

  constructor() {
    // Get GCS bucket from environment or use default
    this.gcsBucket = process.env.GCS_BUCKET || 'replit-objstore';
  }

  /**
   * Resolve a single asset URL to a public URL
   */
  async resolve(url: string): Promise<string> {
    // Already a public URL - return as-is
    if (this.isPublicUrl(url)) {
      return url;
    }

    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    // Handle /api/brand-assets/file/{id} pattern
    const assetIdMatch = url.match(/\/api\/brand-assets\/file\/(\d+)/);
    if (assetIdMatch) {
      const assetId = parseInt(assetIdMatch[1], 10);
      const resolved = await this.resolveFromDatabase(assetId);
      if (resolved) {
        this.cache.set(url, resolved);
        console.log(`[AssetURL] Resolved: ${url} → ${resolved}`);
        return resolved;
      }
    }

    // Handle /uploads/{path} pattern
    const uploadsMatch = url.match(/\/uploads\/(.+)/);
    if (uploadsMatch) {
      const resolved = this.buildGcsUrl(uploadsMatch[1]);
      this.cache.set(url, resolved);
      console.log(`[AssetURL] Resolved: ${url} → ${resolved}`);
      return resolved;
    }

    // Fallback: return original (will likely fail)
    console.warn(`[AssetURL] Could not resolve: ${url}`);
    return url;
  }

  /**
   * Resolve multiple URLs at once
   */
  async resolveAll(urls: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (const url of urls) {
      const resolved = await this.resolve(url);
      results.set(url, resolved);
    }
    
    return results;
  }

  /**
   * Resolve asset from database by ID
   */
  private async resolveFromDatabase(assetId: number): Promise<string | null> {
    try {
      const [asset] = await db
        .select()
        .from(brandAssets)
        .where(eq(brandAssets.id, assetId))
        .limit(1);

      if (!asset) {
        console.warn(`[AssetURL] Asset not found: ${assetId}`);
        return null;
      }

      // Extract storage path from settings JSON
      const settings = asset.settings as any;
      
      // Check for direct storagePath
      if (settings?.storagePath) {
        return this.buildGcsUrl(settings.storagePath);
      }

      // Check for publicUrl already stored
      if (settings?.publicUrl && this.isPublicUrl(settings.publicUrl)) {
        return settings.publicUrl;
      }

      // Check for gcsPath
      if (settings?.gcsPath) {
        return this.buildGcsUrl(settings.gcsPath);
      }

      // Fallback to asset URL if it's already public
      if (asset.url && this.isPublicUrl(asset.url)) {
        return asset.url;
      }

      console.warn(`[AssetURL] No public path for asset ${assetId}`);
      return null;
    } catch (error) {
      console.error(`[AssetURL] Database error for asset ${assetId}:`, error);
      return null;
    }
  }

  /**
   * Build a public GCS URL from a storage path
   */
  private buildGcsUrl(storagePath: string): string {
    // Remove leading slash if present
    const cleanPath = storagePath.startsWith('/') 
      ? storagePath.slice(1) 
      : storagePath;
    
    return `https://storage.googleapis.com/${this.gcsBucket}/${cleanPath}`;
  }

  /**
   * Check if URL is already publicly accessible
   */
  private isPublicUrl(url: string): boolean {
    if (!url) return false;
    
    // Valid public URL patterns
    const publicPatterns = [
      'https://storage.googleapis.com/',
      'https://storage.cloud.google.com/',
      'https://*.s3.amazonaws.com/',
      'https://s3.amazonaws.com/',
      'https://cdn.',
      'https://res.cloudinary.com/',
    ];

    // Invalid patterns (Replit dev URLs)
    const invalidPatterns = [
      '.picard.replit.dev',
      '.repl.co',
      'localhost:',
      '127.0.0.1',
    ];

    // Check for invalid patterns first
    for (const pattern of invalidPatterns) {
      if (url.includes(pattern)) {
        return false;
      }
    }

    // Check for valid public patterns
    for (const pattern of publicPatterns) {
      if (url.includes(pattern.replace('*', ''))) {
        return true;
      }
    }

    // HTTPS URLs without invalid patterns are considered public
    return url.startsWith('https://');
  }

  /**
   * Validate a URL can be accessed by Remotion Lambda
   */
  async validate(url: string): Promise<{ valid: boolean; error?: string }> {
    if (!url) {
      return { valid: false, error: 'URL is empty' };
    }

    if (!this.isPublicUrl(url)) {
      return { 
        valid: false, 
        error: `URL is not publicly accessible: ${url}` 
      };
    }

    return { valid: true };
  }

  /**
   * Clear the URL cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[AssetURL] Cache cleared');
  }
}

// Export singleton instance
export const assetUrlResolver = new AssetUrlResolver();
```

---

## Task 2: Add Validation Helper

Add to the same file or create `server/utils/url-validation.ts`:

```typescript
// server/utils/url-validation.ts

/**
 * Validate URLs before sending to Remotion
 */
export function validateRenderUrls(scenes: any[]): string[] {
  const issues: string[] = [];

  for (const scene of scenes) {
    // Check video URL
    if (scene.videoUrl) {
      if (scene.videoUrl.includes('.picard.replit.dev')) {
        issues.push(`Scene ${scene.id}: videoUrl is a Replit dev URL`);
      }
      if (scene.videoUrl.startsWith('/')) {
        issues.push(`Scene ${scene.id}: videoUrl is relative`);
      }
      if (!scene.videoUrl.startsWith('https://')) {
        issues.push(`Scene ${scene.id}: videoUrl is not HTTPS`);
      }
    }

    // Check image URL
    if (scene.imageUrl) {
      if (scene.imageUrl.includes('.picard.replit.dev')) {
        issues.push(`Scene ${scene.id}: imageUrl is a Replit dev URL`);
      }
    }

    // Check voiceover URL
    if (scene.voiceoverUrl) {
      if (scene.voiceoverUrl.includes('.picard.replit.dev')) {
        issues.push(`Scene ${scene.id}: voiceoverUrl is a Replit dev URL`);
      }
    }
  }

  return issues;
}

/**
 * Check if URL is accessible from Lambda
 */
export function isLambdaAccessible(url: string): boolean {
  if (!url) return false;
  
  const blockedPatterns = [
    '.picard.replit.dev',
    '.repl.co',
    'localhost',
    '127.0.0.1',
    '/api/',
    '/uploads/',
  ];

  return !blockedPatterns.some(pattern => url.includes(pattern));
}
```

---

## Task 3: Integration Test

Create test file: `server/services/__tests__/asset-url-resolver.test.ts`

```typescript
// server/services/__tests__/asset-url-resolver.test.ts

import { assetUrlResolver } from '../asset-url-resolver';

describe('AssetUrlResolver', () => {
  beforeEach(() => {
    assetUrlResolver.clearCache();
  });

  test('returns public URLs unchanged', async () => {
    const url = 'https://storage.googleapis.com/bucket/logo.png';
    const resolved = await assetUrlResolver.resolve(url);
    expect(resolved).toBe(url);
  });

  test('resolves /api/brand-assets/file/{id} pattern', async () => {
    // This test requires database - mock or skip in CI
    const url = '/api/brand-assets/file/123';
    const resolved = await assetUrlResolver.resolve(url);
    expect(resolved).toMatch(/^https:\/\//);
  });

  test('identifies Replit dev URLs as non-public', async () => {
    const url = 'https://abc.picard.replit.dev/uploads/logo.png';
    const validation = await assetUrlResolver.validate(url);
    expect(validation.valid).toBe(false);
  });

  test('caches resolved URLs', async () => {
    const url = 'https://storage.googleapis.com/bucket/logo.png';
    await assetUrlResolver.resolve(url);
    await assetUrlResolver.resolve(url);
    // Second call should hit cache (check logs)
  });
});
```

---

## Task 4: Export from Services Index

Update `server/services/index.ts`:

```typescript
// Add to existing exports
export { assetUrlResolver } from './asset-url-resolver';
```

---

## Verification

After implementation, check the logs:

```
[AssetURL] Resolved: /api/brand-assets/file/123 → https://storage.googleapis.com/replit-objstore/public/uploads/logo.png
```

Run validation:

```typescript
import { assetUrlResolver } from './services/asset-url-resolver';

// Test resolution
const resolved = await assetUrlResolver.resolve('/api/brand-assets/file/123');
console.log('Resolved URL:', resolved);

// Test validation
const validation = await assetUrlResolver.validate(resolved);
console.log('Valid for Lambda:', validation.valid);
```

---

## Success Criteria

- [ ] `assetUrlResolver.ts` created and exported
- [ ] Relative URLs resolve to `https://storage.googleapis.com/...`
- [ ] Replit dev URLs detected as invalid
- [ ] Cache working (check logs for cache hits)
- [ ] No TypeScript errors

---

## Next Phase

Proceed to **Phase 18B: Overlay Pipeline Connection** once this is complete.
