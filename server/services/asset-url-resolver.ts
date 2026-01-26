import { db } from '../db';
import { brandAssets } from '@shared/schema';
import { eq } from 'drizzle-orm';

const urlCache = new Map<string, string>();

export interface AssetUrlResolverOptions {
  skipCache?: boolean;
}

class AssetUrlResolver {
  
  async resolve(url: string, options: AssetUrlResolverOptions = {}): Promise<string | null> {
    if (!url) {
      console.log('[AssetURL] Empty URL provided');
      return null;
    }
    
    if (this.isPublicUrl(url)) {
      console.log('[AssetURL] Already public:', url.substring(0, 60) + '...');
      return url;
    }
    
    if (!options.skipCache && urlCache.has(url)) {
      console.log('[AssetURL] Cache hit for:', url);
      return urlCache.get(url)!;
    }
    
    let publicUrl: string | null = null;
    
    if (url.startsWith('/api/brand-assets/file/')) {
      publicUrl = await this.resolveRelativeAssetUrl(url);
    } else if (url.includes('.picard.replit.dev') || url.includes('.replit.dev')) {
      publicUrl = await this.resolveReplitDevUrl(url);
    } else if (url.startsWith('/uploads/')) {
      publicUrl = await this.resolveStaticPath(url);
    }
    
    if (publicUrl) {
      urlCache.set(url, publicUrl);
      console.log('[AssetURL] Resolved:', url, '→', publicUrl.substring(0, 60) + '...');
    } else {
      console.warn('[AssetURL] Failed to resolve:', url);
    }
    
    return publicUrl;
  }
  
  async resolveAll(urls: string[]): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    
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
  
  private async resolveRelativeAssetUrl(url: string): Promise<string | null> {
    try {
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
      
      const [asset] = await db
        .select()
        .from(brandAssets)
        .where(eq(brandAssets.id, assetId));
      
      if (!asset) {
        console.log('[AssetURL] Asset not found:', assetId);
        return null;
      }
      
      const settings = asset.settings as any;
      const storagePath = settings?.storagePath;
      
      if (!storagePath) {
        console.log('[AssetURL] No storagePath for asset:', assetId);
        return null;
      }
      
      const [bucketName, objectPath] = storagePath.split('|');
      if (!bucketName || !objectPath) {
        console.log('[AssetURL] Invalid storagePath format:', storagePath);
        return null;
      }
      
      // Replit object storage buckets are NOT publicly accessible
      // Return null to trigger fallback S3 caching in the caller
      if (bucketName.startsWith('replit-objstore-')) {
        console.log('[AssetURL] Replit object storage bucket is private, needs S3 caching');
        console.log('[AssetURL] Asset info for S3 caching - bucket:', bucketName, 'path:', objectPath);
        return null;
      }
      
      return `https://storage.googleapis.com/${bucketName}/${objectPath}`;
      
    } catch (error) {
      console.error('[AssetURL] Error resolving relative URL:', error);
      return null;
    }
  }
  
  private async resolveReplitDevUrl(url: string): Promise<string | null> {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      if (path.startsWith('/api/brand-assets/file/')) {
        return this.resolveRelativeAssetUrl(path);
      }
      
      if (path.startsWith('/uploads/')) {
        return this.resolveStaticPath(path);
      }
      
      console.log('[AssetURL] Unknown Replit URL pattern:', path);
      return null;
      
    } catch (error) {
      console.error('[AssetURL] Error parsing Replit URL:', error);
      return null;
    }
  }
  
  private async resolveStaticPath(path: string): Promise<string | null> {
    // Static paths like /uploads/ need to be fetched and cached to S3
    // Replit object storage is private, so return null to trigger S3 caching fallback
    console.log('[AssetURL] Static path needs S3 caching:', path);
    return null;
  }
  
  clearCache(): void {
    urlCache.clear();
    console.log('[AssetURL] Cache cleared');
  }
}

export const assetUrlResolver = new AssetUrlResolver();
