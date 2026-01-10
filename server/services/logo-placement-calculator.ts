import type { LogoPlacement, LogoCompositionConfig, CalculatedLogoPosition } from '../../shared/types/logo-composition-types';

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

class LogoPlacementCalculator {
  
  calculate(
    placement: LogoPlacement,
    logoAsset: { width: number; height: number },
    config: LogoCompositionConfig
  ): CalculatedLogoPosition {
    
    const { width: logoWidth, height: logoHeight } = this.calculateSize(placement, logoAsset, config);
    const { x, y } = this.calculatePosition(placement, logoWidth, logoHeight, config);
    const adjusted = config.respectProductRegions
      ? this.adjustForProductRegions(x, y, logoWidth, logoHeight, config)
      : { x, y };
    
    return { 
      x: Math.round(adjusted.x), 
      y: Math.round(adjusted.y), 
      width: logoWidth, 
      height: logoHeight 
    };
  }
  
  private calculateSize(
    placement: LogoPlacement,
    logoAsset: { width: number; height: number },
    config: LogoCompositionConfig
  ): { width: number; height: number } {
    
    const sizeMap: Record<string, number> = { 
      small: 0.08, 
      medium: 0.12, 
      large: 0.18, 
      xlarge: 0.25 
    };
    const baseWidth = config.width * sizeMap[placement.size];
    const aspectRatio = logoAsset.width / logoAsset.height;
    
    let finalWidth = baseWidth;
    let finalHeight = baseWidth / aspectRatio;
    
    if (placement.maxWidthPercent) {
      const maxW = config.width * (placement.maxWidthPercent / 100);
      if (finalWidth > maxW) {
        finalWidth = maxW;
        finalHeight = finalWidth / aspectRatio;
      }
    }
    
    if (placement.maxHeightPercent) {
      const maxH = config.height * (placement.maxHeightPercent / 100);
      if (finalHeight > maxH) {
        finalHeight = maxH;
        finalWidth = finalHeight * aspectRatio;
      }
    }
    
    return { width: Math.round(finalWidth), height: Math.round(finalHeight) };
  }
  
  private calculatePosition(
    placement: LogoPlacement,
    logoWidth: number,
    logoHeight: number,
    config: LogoCompositionConfig
  ): { x: number; y: number } {
    
    const m = config.safeZoneMargin;
    const fw = config.width;
    const fh = config.height;
    
    const positions: Record<string, { x: number; y: number }> = {
      'top-left': { x: m, y: m },
      'top-center': { x: (fw - logoWidth) / 2, y: m },
      'top-right': { x: fw - logoWidth - m, y: m },
      'center-left': { x: m, y: (fh - logoHeight) / 2 },
      'center': { x: (fw - logoWidth) / 2, y: (fh - logoHeight) / 2 },
      'center-right': { x: fw - logoWidth - m, y: (fh - logoHeight) / 2 },
      'bottom-left': { x: m, y: fh - logoHeight - m },
      'bottom-center': { x: (fw - logoWidth) / 2, y: fh - logoHeight - m },
      'bottom-right': { x: fw - logoWidth - m, y: fh - logoHeight - m },
      'lower-third-left': { x: m * 2, y: fh * 0.75 - logoHeight / 2 },
      'lower-third-right': { x: fw - logoWidth - m * 2, y: fh * 0.75 - logoHeight / 2 },
    };
    
    if (placement.position === 'custom' && placement.customPosition) {
      return {
        x: fw * (placement.customPosition.x / 100) - logoWidth / 2,
        y: fh * (placement.customPosition.y / 100) - logoHeight / 2,
      };
    }
    
    return positions[placement.position] || positions['bottom-right'];
  }
  
  private adjustForProductRegions(
    x: number, 
    y: number, 
    width: number, 
    height: number,
    config: LogoCompositionConfig
  ): { x: number; y: number } {
    
    if (!config.productRegions?.length) return { x, y };
    
    const logoRect: Rectangle = { x, y, width, height };
    
    for (const region of config.productRegions) {
      if (this.checkOverlap(logoRect, region)) {
        const m = config.safeZoneMargin;
        const inLeft = x < config.width / 2;
        const inTop = y < config.height / 2;
        
        if (inLeft && inTop) {
          return { x: config.width - width - m, y: config.height - height - m };
        }
        if (!inLeft && inTop) {
          return { x: m, y: config.height - height - m };
        }
        if (inLeft) {
          return { x: config.width - width - m, y: m };
        }
        return { x: m, y: m };
      }
    }
    
    return { x, y };
  }
  
  private checkOverlap(r1: Rectangle, r2: Rectangle): boolean {
    return !(
      r1.x + r1.width < r2.x || 
      r2.x + r2.width < r1.x ||
      r1.y + r1.height < r2.y || 
      r2.y + r2.height < r1.y
    );
  }
  
  calculateMultiple(
    placements: LogoPlacement[],
    assets: Map<string, { width: number; height: number }>,
    config: LogoCompositionConfig
  ): Map<string, CalculatedLogoPosition> {
    const results = new Map<string, CalculatedLogoPosition>();
    const usedRegions: Rectangle[] = [...(config.productRegions || [])];
    
    for (const placement of placements) {
      const assetKey = placement.assetId || placement.logoType;
      const asset = assets.get(assetKey);
      if (!asset) continue;
      
      const configWithUsedRegions = {
        ...config,
        productRegions: usedRegions,
      };
      
      const position = this.calculate(placement, asset, configWithUsedRegions);
      results.set(assetKey, position);
      
      usedRegions.push(position);
    }
    
    return results;
  }
}

export const logoPlacementCalculator = new LogoPlacementCalculator();
