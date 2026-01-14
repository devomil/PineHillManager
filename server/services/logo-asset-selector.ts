import { db } from '../db';
import { brandMediaLibrary } from '../../shared/schema';
import { eq, or, ilike, and, sql } from 'drizzle-orm';
import type { LogoType, LogoAssetInfo } from '../../shared/types/logo-composition-types';

class LogoAssetSelector {
  private cache: Map<string, LogoAssetInfo> = new Map();
  
  async selectLogo(type: LogoType, preferredName?: string): Promise<LogoAssetInfo | null> {
    const cacheKey = `${type}-${preferredName || 'default'}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }
    
    const assets = await this.queryLogoAssets(type, preferredName);
    if (assets.length === 0) return null;
    
    const selected = this.rankAndSelect(assets, type, preferredName);
    this.cache.set(cacheKey, selected);
    return selected;
  }
  
  async selectMultipleLogos(types: LogoType[]): Promise<Map<LogoType, LogoAssetInfo>> {
    const result = new Map<LogoType, LogoAssetInfo>();
    
    await Promise.all(types.map(async (type) => {
      const asset = await this.selectLogo(type);
      if (asset) {
        result.set(type, asset);
      }
    }));
    
    return result;
  }
  
  private async queryLogoAssets(type: LogoType, preferredName?: string): Promise<any[]> {
    const typeFilters: Record<LogoType, string[]> = {
      primary: ['logo', 'primary', 'pine hill farm'],
      watermark: ['watermark', 'overlay'],
      certification: ['usda', 'organic', 'certification', 'certified'],
      partner: ['association', 'society', 'institute', 'partner', 'menopause', 'functional medicine'],
    };
    
    const keywords = typeFilters[type];
    
    try {
      const keywordConditions = keywords.map(k => ilike(brandMediaLibrary.name, `%${k}%`));
      const assetTypeConditions = keywords.map(k => ilike(brandMediaLibrary.assetType, `%${k}%`));
      const categoryConditions = keywords.map(k => ilike(brandMediaLibrary.assetCategory, `%${k}%`));
      
      const results = await db
        .select()
        .from(brandMediaLibrary)
        .where(
          and(
            eq(brandMediaLibrary.isActive, true),
            or(
              eq(brandMediaLibrary.mediaType, 'logo'),
              eq(brandMediaLibrary.mediaType, 'photo'),
              eq(brandMediaLibrary.mediaType, 'image')
            ),
            or(...keywordConditions, ...assetTypeConditions, ...categoryConditions)
          )
        )
        .orderBy(sql`${brandMediaLibrary.priority} DESC`);
      
      return results;
    } catch (error) {
      console.error('[LogoAssetSelector] Query error:', error);
      return [];
    }
  }
  
  private rankAndSelect(assets: any[], type: LogoType, preferredName?: string): LogoAssetInfo {
    const scored = assets.map(asset => {
      let score = 0;
      const name = (asset.name || '').toLowerCase();
      const description = (asset.description || '').toLowerCase();
      
      if (preferredName && name.includes(preferredName.toLowerCase())) {
        score += 100;
      }
      
      switch (type) {
        case 'primary':
          if (name.includes('primary')) score += 50;
          if (name.includes('pine hill farm') && name.includes('logo')) score += 40;
          if (name.includes('main')) score += 30;
          if (asset.isDefault) score += 25;
          break;
        case 'watermark':
          if (name.includes('watermark')) score += 50;
          if (name.includes('overlay')) score += 30;
          if (name.includes('subtle')) score += 20;
          break;
        case 'certification':
          if (name.includes('usda')) score += 50;
          if (name.includes('organic')) score += 40;
          if (name.includes('certified')) score += 30;
          break;
        case 'partner':
          if (name.includes('menopause society')) score += 50;
          if (name.includes('functional medicine')) score += 40;
          if (name.includes('partner')) score += 30;
          break;
      }
      
      if (asset.mediaType === 'logo') score += 20;
      
      const mimeType = (asset.mimeType || '').toLowerCase();
      const url = (asset.url || '').toLowerCase();
      if (mimeType.includes('png') || url.endsWith('.png')) {
        score += 15;
      }
      
      score += (asset.priority || 0) * 5;
      
      return { asset, score };
    });
    
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].asset;
    
    const url = best.url || '';
    const mimeType = (best.mimeType || '').toLowerCase();
    
    return {
      id: best.id?.toString() || '0',
      url: url,
      width: best.width || 500,
      height: best.height || 500,
      hasTransparency: mimeType.includes('png') || url.toLowerCase().endsWith('.png'),
      type,
      name: best.name || 'Logo',
    };
  }
  
  clearCache(): void {
    this.cache.clear();
  }
}

export const logoAssetSelector = new LogoAssetSelector();
