import { db } from '../db';
import { brandMediaLibrary, BrandMedia } from '@shared/schema';
import { eq, and, ilike, sql, or, inArray } from 'drizzle-orm';
import type { BrandRequirementAnalysis, AssetPurpose, AssetMatchResult } from '../../shared/types/brand-asset-types';
import { 
  PRODUCT_ASSET_TYPES, 
  LOGO_ASSET_TYPES, 
  LOCATION_ASSET_TYPES, 
  PEOPLE_ASSET_TYPES,
  TRUST_ASSET_TYPES,
  SERVICES_ASSET_TYPES,
  CREATIVE_ASSET_TYPES,
  AssetType,
  getAssetTypeById,
  getAssetTypesByCategory
} from '../../shared/brand-asset-types';

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
    const productAssetTypeIds = Object.keys(PRODUCT_ASSET_TYPES);
    
    const allProductAssets = await db.select()
      .from(brandMediaLibrary)
      .where(
        and(
          eq(brandMediaLibrary.isActive, true),
          or(
            inArray(brandMediaLibrary.assetType, productAssetTypeIds),
            eq(brandMediaLibrary.entityType, 'product'),
            ilike(brandMediaLibrary.mediaType, '%product%'),
            sql`'product' = ANY(${brandMediaLibrary.matchKeywords})`
          )
        )
      );
    
    const scored = allProductAssets.map(asset => {
      let score = 0;
      const assetText = `${asset.name || ''} ${asset.description || ''} ${(asset.matchKeywords || []).join(' ')} ${asset.entityName || ''}`.toLowerCase();
      
      if (asset.assetType && productAssetTypeIds.includes(asset.assetType)) {
        score += 20;
        
        const assetTypeDef = getAssetTypeById(asset.assetType);
        if (assetTypeDef) {
          if (visibility === 'featured' && asset.assetType.includes('hero')) {
            score += 15;
          }
          if (visibility === 'background' && asset.assetType.includes('lifestyle')) {
            score += 10;
          }
        }
      }
      
      for (const productName of productNames) {
        if (assetText.includes(productName.toLowerCase())) {
          score += 10;
        }
        
        const productInfo = asset.productInfo as { productName?: string; sku?: string } | null;
        if (productInfo?.productName?.toLowerCase().includes(productName.toLowerCase())) {
          score += 15;
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
        matchType: asset.assetType ? 'declared' as const : (score >= 10 ? 'exact' as const : 'keyword' as const)
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
    const logoAssetTypeIds = Object.keys(LOGO_ASSET_TYPES);
    
    const logoAssets = await db.select()
      .from(brandMediaLibrary)
      .where(
        and(
          eq(brandMediaLibrary.isActive, true),
          or(
            inArray(brandMediaLibrary.assetType, logoAssetTypeIds),
            eq(brandMediaLibrary.mediaType, 'logo'),
            ilike(brandMediaLibrary.name, '%logo%'),
            sql`'logo' = ANY(${brandMediaLibrary.matchKeywords})`
          )
        )
      );
    
    const scored = logoAssets.map(asset => {
      let score = 0;
      const assetText = `${asset.name || ''} ${asset.description || ''} ${asset.entityName || ''}`.toLowerCase();
      
      if (asset.assetType && logoAssetTypeIds.includes(asset.assetType)) {
        score += 20;
        
        if (logoType === 'primary' && asset.assetType.includes('primary')) {
          score += 25;
        }
        if (logoType === 'watermark' && asset.assetType.includes('watermark')) {
          score += 25;
        }
        if (logoType === 'certification' && (
          asset.assetType.includes('certification') || 
          asset.assetType.includes('badge') ||
          asset.assetType.includes('trust')
        )) {
          score += 25;
        }
      }
      
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
      
      return { 
        asset, 
        score,
        matchType: asset.assetType ? 'declared' as const : 'keyword' as const
      };
    });
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(s => s.asset);
  }
  
  private async findLocationAssets(): Promise<BrandMedia[]> {
    const locationAssetTypeIds = Object.keys(LOCATION_ASSET_TYPES);
    
    return db.select()
      .from(brandMediaLibrary)
      .where(
        and(
          eq(brandMediaLibrary.isActive, true),
          or(
            inArray(brandMediaLibrary.assetType, locationAssetTypeIds),
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
  
  async findAssetsByType(assetTypeId: string): Promise<BrandMedia[]> {
    return db.select()
      .from(brandMediaLibrary)
      .where(
        and(
          eq(brandMediaLibrary.isActive, true),
          eq(brandMediaLibrary.assetType, assetTypeId)
        )
      )
      .orderBy(sql`priority DESC NULLS LAST`);
  }
  
  async findAssetsByCategory(category: string): Promise<BrandMedia[]> {
    const assetTypes = getAssetTypesByCategory(category);
    const assetTypeIds = assetTypes.map(t => t.id);
    
    if (assetTypeIds.length === 0) {
      return [];
    }
    
    return db.select()
      .from(brandMediaLibrary)
      .where(
        and(
          eq(brandMediaLibrary.isActive, true),
          inArray(brandMediaLibrary.assetType, assetTypeIds)
        )
      )
      .orderBy(sql`priority DESC NULLS LAST`);
  }
  
  async getBestAsset(
    purpose: AssetPurpose,
    productName?: string
  ): Promise<BrandMedia | null> {
    
    switch (purpose) {
      case 'product-hero':
        const heroAssets = await this.findAssetsByType('product-hero-single');
        if (heroAssets.length > 0) {
          if (productName) {
            const matching = heroAssets.find(a => {
              const productInfo = a.productInfo as { productName?: string } | null;
              return productInfo?.productName?.toLowerCase().includes(productName.toLowerCase()) ||
                     a.name?.toLowerCase().includes(productName.toLowerCase());
            });
            if (matching) return matching;
          }
          return heroAssets[0];
        }
        
        if (productName) {
          const products = await this.findProductAssets([productName], 'featured');
          return products[0] || null;
        }
        break;
        
      case 'logo-overlay':
        const primaryLogos = await this.findAssetsByType('logo-primary-color');
        if (primaryLogos.length > 0) return primaryLogos[0];
        
        const logos = await this.findLogoAssets('primary', 'prominent');
        return logos[0] || null;
        
      case 'watermark':
        const watermarkLogos = await this.findAssetsByType('logo-watermark-subtle');
        if (watermarkLogos.length > 0) return watermarkLogos[0];
        
        const watermarks = await this.findLogoAssets('watermark', 'subtle');
        return watermarks[0] || null;
        
      case 'product-group':
        const groupAssets = await this.findAssetsByType('product-hero-group');
        if (groupAssets.length > 0) return groupAssets[0];
        
        const legacyGroupAssets = await db.select()
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
        return legacyGroupAssets[0] || null;
        
      case 'location':
        const locationAssets = await this.findAssetsByCategory('location');
        if (locationAssets.length > 0) return locationAssets[0];
        
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
      
      const matchedKeywords: string[] = [];
      
      keywords.forEach(kw => {
        if (assetText.includes(kw.toLowerCase())) {
          matchedKeywords.push(kw);
        }
      });
      
      if (asset.assetType) {
        const assetTypeDef = getAssetTypeById(asset.assetType);
        if (assetTypeDef) {
          keywords.forEach(kw => {
            if (assetTypeDef.promptKeywords.some(pk => pk.toLowerCase().includes(kw.toLowerCase()))) {
              if (!matchedKeywords.includes(kw)) {
                matchedKeywords.push(kw);
              }
            }
          });
        }
      }
      
      if (matchedKeywords.length > 0) {
        const declaredBonus = asset.assetType ? 15 : 0;
        results.push({
          asset,
          score: matchedKeywords.length * 10 + (asset.priority || 0) + declaredBonus,
          matchedKeywords,
          matchType: asset.assetType ? 'declared' : (matchedKeywords.length > 2 ? 'exact' : 'keyword'),
        });
      }
    }
    
    return results.sort((a, b) => b.score - a.score);
  }
  
  async getAssetTypeStats(): Promise<Record<string, number>> {
    const stats: Record<string, number> = {};
    
    const result = await db.select({
      assetType: brandMediaLibrary.assetType,
      count: sql<number>`COUNT(*)::int`
    })
    .from(brandMediaLibrary)
    .where(
      and(
        eq(brandMediaLibrary.isActive, true),
        sql`${brandMediaLibrary.assetType} IS NOT NULL`
      )
    )
    .groupBy(brandMediaLibrary.assetType);
    
    for (const row of result) {
      if (row.assetType) {
        stats[row.assetType] = row.count;
      }
    }
    
    return stats;
  }
}

export const brandAssetMatcher = new BrandAssetMatcher();
