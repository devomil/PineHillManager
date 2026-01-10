import type { 
  LogoPlacement, 
  LogoCompositionConfig, 
  LogoRemotionProps,
  LogoType 
} from '../../shared/types/logo-composition-types';
import { logoAssetSelector } from './logo-asset-selector';
import { logoPlacementCalculator } from './logo-placement-calculator';
import type { BrandRequirementAnalysis } from '../../shared/types/brand-asset-types';

interface ProductRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

class LogoCompositionService {
  
  async buildConfig(
    sceneId: string,
    sceneDuration: number,
    analysis: BrandRequirementAnalysis,
    productRegions?: ProductRegion[],
    options?: {
      width?: number;
      height?: number;
      fps?: number;
    }
  ): Promise<LogoCompositionConfig> {
    
    const logos: LogoPlacement[] = [];
    
    if (analysis.requirements.logoRequired) {
      const primary = await this.buildPrimaryPlacement(analysis);
      if (primary) logos.push(primary);
    }
    
    logos.push(this.buildWatermarkPlacement());
    
    if (analysis.requirements.productMentioned) {
      const cert = await this.buildCertificationPlacement();
      if (cert) logos.push(cert);
    }
    
    return {
      sceneId,
      sceneDuration,
      fps: options?.fps || 30,
      width: options?.width || 1920,
      height: options?.height || 1080,
      logos,
      safeZoneMargin: 40,
      respectProductRegions: true,
      productRegions,
    };
  }
  
  async buildSimpleConfig(
    sceneId: string,
    sceneDuration: number,
    logoTypes: LogoType[],
    options?: {
      width?: number;
      height?: number;
      fps?: number;
      productRegions?: ProductRegion[];
    }
  ): Promise<LogoCompositionConfig> {
    
    const logos: LogoPlacement[] = [];
    
    for (const type of logoTypes) {
      const placement = await this.buildPlacementForType(type);
      if (placement) logos.push(placement);
    }
    
    return {
      sceneId,
      sceneDuration,
      fps: options?.fps || 30,
      width: options?.width || 1920,
      height: options?.height || 1080,
      logos,
      safeZoneMargin: 40,
      respectProductRegions: true,
      productRegions: options?.productRegions,
    };
  }
  
  private async buildPlacementForType(type: LogoType): Promise<LogoPlacement | null> {
    switch (type) {
      case 'primary':
        return this.buildPrimaryPlacement({ 
          requirements: { brandingVisibility: 'prominent' } 
        } as BrandRequirementAnalysis);
      case 'watermark':
        return this.buildWatermarkPlacement();
      case 'certification':
        return this.buildCertificationPlacement();
      case 'partner':
        return this.buildPartnerPlacement();
      default:
        return null;
    }
  }
  
  private async buildPrimaryPlacement(analysis: BrandRequirementAnalysis): Promise<LogoPlacement | null> {
    const logo = await logoAssetSelector.selectLogo('primary');
    if (!logo) return null;
    
    const prominent = analysis.requirements.brandingVisibility === 'prominent';
    
    return {
      logoType: 'primary',
      assetId: logo.id,
      assetUrl: logo.url,
      position: prominent ? 'top-left' : 'bottom-right',
      size: prominent ? 'large' : 'medium',
      opacity: 1.0,
      animation: prominent ? 'scale-up' : 'fade-in',
      animationDuration: 20,
      animationDelay: 5,
      startFrame: 0,
      shadow: { 
        enabled: true, 
        color: 'rgba(0,0,0,0.2)', 
        blur: 8, 
        offsetX: 2, 
        offsetY: 2 
      },
    };
  }
  
  private buildWatermarkPlacement(): LogoPlacement {
    return {
      logoType: 'watermark',
      position: 'bottom-right',
      size: 'small',
      opacity: 0.5,
      animation: 'fade-in',
      animationDuration: 15,
      animationDelay: 30,
      startFrame: 30,
    };
  }
  
  private async buildCertificationPlacement(): Promise<LogoPlacement | null> {
    const cert = await logoAssetSelector.selectLogo('certification', 'usda');
    if (!cert) return null;
    
    return {
      logoType: 'certification',
      assetId: cert.id,
      assetUrl: cert.url,
      position: 'bottom-left',
      size: 'small',
      opacity: 0.9,
      animation: 'fade-in',
      animationDuration: 15,
      animationDelay: 45,
      startFrame: 45,
    };
  }
  
  private async buildPartnerPlacement(): Promise<LogoPlacement | null> {
    const partner = await logoAssetSelector.selectLogo('partner');
    if (!partner) return null;
    
    return {
      logoType: 'partner',
      assetId: partner.id,
      assetUrl: partner.url,
      position: 'lower-third-right',
      size: 'small',
      opacity: 0.85,
      animation: 'slide-in',
      animationDuration: 18,
      animationDelay: 60,
      startFrame: 60,
    };
  }
  
  async generateRemotionProps(config: LogoCompositionConfig): Promise<LogoRemotionProps[]> {
    const props: LogoRemotionProps[] = [];
    
    for (const placement of config.logos) {
      let asset = placement.assetUrl ? {
        id: placement.assetId || '0',
        url: placement.assetUrl,
        width: 500,
        height: 500,
        hasTransparency: true,
        type: placement.logoType,
        name: 'Logo',
      } : await logoAssetSelector.selectLogo(placement.logoType);
      
      if (!asset) continue;
      
      const calculated = logoPlacementCalculator.calculate(
        placement, 
        { width: asset.width, height: asset.height }, 
        config
      );
      
      props.push({
        logoUrl: asset.url,
        placement: { 
          ...calculated, 
          opacity: placement.opacity 
        },
        animation: placement.animation,
        animationDuration: placement.animationDuration || 15,
        animationDelay: placement.animationDelay || 0,
        startFrame: placement.startFrame || 0,
        endFrame: placement.endFrame,
        shadow: placement.shadow,
      });
    }
    
    return props;
  }
  
  async addLogoToConfig(
    config: LogoCompositionConfig,
    logoType: LogoType,
    overrides?: Partial<LogoPlacement>
  ): Promise<LogoCompositionConfig> {
    const basePlacement = await this.buildPlacementForType(logoType);
    if (!basePlacement) return config;
    
    const placement: LogoPlacement = {
      ...basePlacement,
      ...overrides,
    };
    
    return {
      ...config,
      logos: [...config.logos, placement],
    };
  }
  
  removeLogoFromConfig(
    config: LogoCompositionConfig,
    logoType: LogoType
  ): LogoCompositionConfig {
    return {
      ...config,
      logos: config.logos.filter(l => l.logoType !== logoType),
    };
  }
  
  async resolveAllAssetUrls(config: LogoCompositionConfig): Promise<LogoCompositionConfig> {
    const resolvedLogos = await Promise.all(
      config.logos.map(async (placement) => {
        if (placement.assetUrl) return placement;
        
        const asset = await logoAssetSelector.selectLogo(placement.logoType);
        if (!asset) return placement;
        
        return {
          ...placement,
          assetId: asset.id,
          assetUrl: asset.url,
        };
      })
    );
    
    return {
      ...config,
      logos: resolvedLogos,
    };
  }
}

export const logoCompositionService = new LogoCompositionService();
