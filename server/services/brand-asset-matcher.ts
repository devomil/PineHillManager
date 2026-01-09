import { db } from '../db';
import { brandMediaLibrary, BrandMedia } from '@shared/schema';
import { eq, and, ilike, sql, or } from 'drizzle-orm';
import type { BrandRequirementAnalysis, AssetPurpose, AssetMatchResult } from '../../shared/types/brand-asset-types';

class BrandAssetMatcher {
  
  async matchAssets(analysis: BrandRequirementAnalysis): Promise<BrandRequirementAnalysis> {
    const matchedAssets = {
      products: [] as BrandMedia[],
      logos: [] as BrandMedia[],
      locations: [] as BrandMedia[],
    };
    
    try {
      if (analysis.requirements.productMentioned) {
        matchedAssets.products = await this.findProductAssets(
          analysis.requirements.productNames,
          analysis.requirements.productVisibility
        );
      }
      
      if (analysis.requirements.logoRequired) {
        matchedAssets.logos = await this.findLogoAssets(
          analysis.requirements.logoType,
          analysis.requirements.brandingVisibility
        );
      }
      
      if (analysis.requirements.sceneType === 'branded-environment') {
        matchedAssets.locations = await this.findLocationAssets();
      }
      
      console.log('[BrandAssetMatcher] Matched assets:', {
        products: matchedAssets.products.length,
        logos: matchedAssets.logos.length,
        locations: matchedAssets.locations.length,
      });
    } catch (error) {
      console.error('[BrandAssetMatcher] Error matching assets:', error);
    }
    
    return {
      ...analysis,
      matchedAssets,
    };
  }
  
  private async findProductAssets(
    productNames: string[],
    visibility: string
  ): Promise<BrandMedia[]> {
    
    const allProductAssets = await db.select()
      .from(brandMediaLibrary)
      .where(
        and(
          eq(brandMediaLibrary.isActive, true),
          or(
            eq(brandMediaLibrary.entityType, 'product'),
            ilike(brandMediaLibrary.mediaType, '%product%'),
            sql`'product' = ANY(${brandMediaLibrary.matchKeywords})`
          )
        )
      );
    
    const scored = allProductAssets.map(asset => {
      let score = 0;
      const assetText = `${asset.name || ''} ${asset.description || ''} ${(asset.matchKeywords || []).join(' ')} ${asset.entityName || ''}`.toLowerCase();
      
      for (const productName of productNames) {
        if (assetText.includes(productName.toLowerCase())) {
          score += 10;
        }
      }
      
      if (visibility === 'featured' && (asset.name?.toLowerCase().includes('hero') || asset.priority && asset.priority > 5)) {
        score += 5;
      }
      
      if (asset.mimeType?.includes('png')) {
        score += 2;
      }
      
      if (asset.priority) {
        score += asset.priority;
      }
      
      if (asset.isDefault) {
        score += 3;
      }
      
      const matchedKeywords = productNames.filter(name => assetText.includes(name.toLowerCase()));
      
      return { 
        asset, 
        score, 
        matchedKeywords,
        matchType: score >= 10 ? 'exact' as const : 'keyword' as const
      };
    });
    
    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(s => s.asset);
  }
  
  private async findLogoAssets(
    logoType: 'primary' | 'watermark' | 'certification' | null,
    visibility: string
  ): Promise<BrandMedia[]> {
    
    const logoAssets = await db.select()
      .from(brandMediaLibrary)
      .where(
        and(
          eq(brandMediaLibrary.isActive, true),
          or(
            eq(brandMediaLibrary.mediaType, 'logo'),
            ilike(brandMediaLibrary.name, '%logo%'),
            sql`'logo' = ANY(${brandMediaLibrary.matchKeywords})`
          )
        )
      );
    
    const scored = logoAssets.map(asset => {
      let score = 0;
      const assetText = `${asset.name || ''} ${asset.description || ''} ${asset.entityName || ''}`.toLowerCase();
      
      if (logoType === 'primary' && (assetText.includes('primary') || asset.isDefault)) score += 10;
      if (logoType === 'watermark' && assetText.includes('watermark')) score += 10;
      if (logoType === 'certification') {
        if (assetText.includes('usda') || assetText.includes('organic')) score += 10;
        if (assetText.includes('certification')) score += 5;
      }
      
      if (assetText.includes('pine hill farm') || assetText.includes('phf')) score += 5;
      
      if (asset.mimeType?.includes('png')) score += 3;
      
      if (visibility === 'prominent' && assetText.includes('large')) score += 2;
      
      if (asset.priority) score += asset.priority;
      if (asset.isDefault) score += 3;
      
      return { asset, score };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.asset);
  }
  
  private async findLocationAssets(): Promise<BrandMedia[]> {
    return db.select()
      .from(brandMediaLibrary)
      .where(
        and(
          eq(brandMediaLibrary.isActive, true),
          or(
            eq(brandMediaLibrary.entityType, 'location'),
            eq(brandMediaLibrary.mediaType, 'location'),
            sql`'store' = ANY(${brandMediaLibrary.matchKeywords})`,
            sql`'location' = ANY(${brandMediaLibrary.matchKeywords})`,
            sql`'facility' = ANY(${brandMediaLibrary.matchKeywords})`
          )
        )
      )
      .limit(3);
  }
  
  async getBestAsset(
    purpose: AssetPurpose,
    productName?: string
  ): Promise<BrandMedia | null> {
    
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
        const groupAssets = await db.select()
          .from(brandMediaLibrary)
          .where(
            and(
              eq(brandMediaLibrary.isActive, true),
              or(
                ilike(brandMediaLibrary.name, '%group%'),
                ilike(brandMediaLibrary.name, '%products%'),
                ilike(brandMediaLibrary.description, '%collection%')
              )
            )
          )
          .limit(1);
        return groupAssets[0] || null;
        
      case 'location':
        const locations = await this.findLocationAssets();
        return locations[0] || null;
    }
    
    return null;
  }
  
  async searchByKeywords(keywords: string[]): Promise<AssetMatchResult[]> {
    const allAssets = await db.select()
      .from(brandMediaLibrary)
      .where(eq(brandMediaLibrary.isActive, true));
    
    const results: AssetMatchResult[] = [];
    
    for (const asset of allAssets) {
      const assetText = `${asset.name || ''} ${asset.description || ''} ${(asset.matchKeywords || []).join(' ')} ${asset.entityName || ''}`.toLowerCase();
      
      const matchedKeywords = keywords.filter(kw => assetText.includes(kw.toLowerCase()));
      
      if (matchedKeywords.length > 0) {
        results.push({
          asset,
          score: matchedKeywords.length * 10 + (asset.priority || 0),
          matchedKeywords,
          matchType: matchedKeywords.length > 2 ? 'exact' : 'keyword',
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }
}

export const brandAssetMatcher = new BrandAssetMatcher();
