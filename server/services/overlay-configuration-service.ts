import { 
  SceneOverlayConfig, 
  SceneType,
  LogoOverlayConfig,
  WatermarkConfig,
  CTAOverlayConfig,
  TextOverlayConfig,
  BadgeConfig,
  EndCardConfig
} from '../../shared/types/scene-overlays';
import { brandBibleService, BrandBible, BrandAsset } from './brand-bible-service';

interface SceneInput {
  id: string;
  sceneType: SceneType | string;
  duration?: number;
  script?: string;
}

interface SceneContext {
  isFirst: boolean;
  isLast: boolean;
  isCTA: boolean;
}

class OverlayConfigurationService {
  async generateOverlaysForProject(
    projectId: string,
    scenes: SceneInput[]
  ): Promise<Map<string, SceneOverlayConfig>> {
    console.log(`[Overlays] Generating overlay config for ${scenes.length} scenes`);

    const brandBible = await brandBibleService.getBrandBible();
    const overlayConfigs = new Map<string, SceneOverlayConfig>();

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const isFirst = i === 0;
      const isLast = i === scenes.length - 1;
      const isCTA = scene.sceneType === 'cta' || isLast;

      const config = await this.generateSceneOverlays(
        scene,
        brandBible,
        { isFirst, isLast, isCTA }
      );

      overlayConfigs.set(scene.id, config);

      console.log(`[Overlays] Scene ${scene.id} (${scene.sceneType}): ${this.summarizeOverlays(config)}`);
    }

    return overlayConfigs;
  }

  async generateSceneOverlays(
    scene: SceneInput,
    brandBible: BrandBible,
    context: SceneContext
  ): Promise<SceneOverlayConfig> {
    const sceneType = this.normalizeSceneType(scene.sceneType);
    
    const config: SceneOverlayConfig = {
      sceneId: scene.id,
      sceneType,
    };

    if (!context.isFirst && !context.isLast && brandBible.logos.watermark) {
      config.watermark = this.createWatermarkConfig(brandBible.logos.watermark);
    }

    if (context.isFirst) {
      const introLogo = brandBible.logos.intro || brandBible.logos.main;
      if (introLogo) {
        config.logo = this.createIntroLogoConfig(introLogo);
      }
    }

    if (context.isCTA || context.isLast) {
      const sceneDuration = scene.duration || 6;
      const ctaStartTime = Math.max(1, sceneDuration - 4);

      const outroLogo = brandBible.logos.outro || brandBible.logos.main;
      if (outroLogo) {
        config.logo = this.createOutroLogoConfig(outroLogo, ctaStartTime);
      }

      config.ctaOverlay = this.createCTAOverlayConfig(brandBible, ctaStartTime);
      config.textOverlays = this.createCTATextOverlays(brandBible, ctaStartTime);

      if (context.isLast) {
        config.endCard = this.createEndCardConfig(brandBible);
      }
    }

    if (['product', 'proof', 'benefit'].includes(sceneType)) {
      const certBadges = this.getCertificationBadges(brandBible);
      if (certBadges.length > 0) {
        config.badges = this.createBadgeConfigs(certBadges);
      }
    }

    return config;
  }

  private normalizeSceneType(sceneType: string): SceneType {
    const validTypes: SceneType[] = ['hook', 'problem', 'solution', 'benefit', 'proof', 'cta', 'standard'];
    const normalized = sceneType.toLowerCase() as SceneType;
    return validTypes.includes(normalized) ? normalized : 'standard';
  }

  private createWatermarkConfig(watermarkAsset: BrandAsset): WatermarkConfig {
    return {
      enabled: true,
      url: watermarkAsset.url,
      position: watermarkAsset.placementSettings?.position === 'top-left' || 
                watermarkAsset.placementSettings?.position === 'top-right' || 
                watermarkAsset.placementSettings?.position === 'bottom-left' || 
                watermarkAsset.placementSettings?.position === 'bottom-right' 
                ? watermarkAsset.placementSettings.position 
                : 'bottom-right',
      size: watermarkAsset.placementSettings?.scale ? watermarkAsset.placementSettings.scale * 100 : 8,
      opacity: watermarkAsset.placementSettings?.opacity || 0.6,
    };
  }

  private createIntroLogoConfig(logoAsset: BrandAsset): LogoOverlayConfig {
    return {
      enabled: true,
      url: logoAsset.url,
      position: 'center',
      size: 25,
      opacity: 1,
      animation: logoAsset.placementSettings?.animation || 'zoom',
      timing: {
        startTime: 0.5,
        duration: 2.5,
      },
    };
  }

  private createOutroLogoConfig(logoAsset: BrandAsset, ctaStartTime: number): LogoOverlayConfig {
    return {
      enabled: true,
      url: logoAsset.url,
      position: 'center',
      size: 20,
      opacity: 1,
      animation: 'fade',
      timing: {
        startTime: ctaStartTime,
        duration: -1,
      },
    };
  }

  private createCTAOverlayConfig(brandBible: BrandBible, ctaStartTime: number): CTAOverlayConfig {
    return {
      enabled: true,
      headline: brandBible.callToAction?.text || 'Learn More',
      subheadline: brandBible.callToAction?.subtext,
      website: brandBible.callToAction?.url || brandBible.website || 'www.pinehillfarm.com',
      phone: undefined,
      backgroundColor: brandBible.colors?.primary || '#2D5A27',
      textColor: '#FFFFFF',
      timing: {
        startTime: ctaStartTime + 0.5,
        fadeInDuration: 0.8,
      },
    };
  }

  private createCTATextOverlays(brandBible: BrandBible, ctaStartTime: number): TextOverlayConfig[] {
    return [
      {
        id: 'cta-headline',
        text: brandBible.callToAction?.text || 'Visit Us Today',
        position: 'center',
        style: {
          fontSize: 48,
          fontFamily: brandBible.typography?.headingFont || 'Inter',
          fontWeight: 700,
          color: '#FFFFFF',
          backgroundColor: brandBible.colors?.primary,
          backgroundOpacity: 0.85,
        },
        animation: {
          type: 'fade',
          duration: 0.8,
          delay: 0,
        },
        timing: {
          startTime: ctaStartTime + 0.8,
          duration: -1,
        },
      },
      {
        id: 'cta-website',
        text: brandBible.callToAction?.url || brandBible.website || 'www.pinehillfarm.com',
        position: 'bottom',
        style: {
          fontSize: 32,
          fontFamily: brandBible.typography?.bodyFont || 'Inter',
          fontWeight: 500,
          color: '#FFFFFF',
        },
        animation: {
          type: 'slide-up',
          duration: 0.6,
          delay: 0,
        },
        timing: {
          startTime: ctaStartTime + 1.2,
          duration: -1,
        },
      },
    ];
  }

  private createEndCardConfig(brandBible: BrandBible): EndCardConfig {
    return {
      enabled: true,
      logoUrl: brandBible.logos.main?.url || '',
      headline: brandBible.callToAction?.text || 'Thank You',
      website: brandBible.callToAction?.url || brandBible.website || 'www.pinehillfarm.com',
      backgroundColor: brandBible.colors?.primary || '#2D5A27',
      duration: 2,
    };
  }

  private getCertificationBadges(brandBible: BrandBible): BrandAsset[] {
    return brandBible.assets.filter(asset => 
      asset.mediaType === 'graphic' &&
      (asset.usageContexts.includes('certification') || 
       asset.usageContexts.includes('trust-badge') ||
       asset.matchKeywords.some(k => k.includes('certif') || k.includes('badge')))
    ).slice(0, 4);
  }

  private createBadgeConfigs(badges: BrandAsset[]): BadgeConfig[] {
    return badges.map((badge, index) => ({
      url: badge.url,
      position: {
        x: 10 + (index * 12),
        y: 85,
      },
      size: 8,
      timing: {
        startTime: 2,
        duration: -1,
      },
    }));
  }

  private summarizeOverlays(config: SceneOverlayConfig): string {
    const parts: string[] = [];
    if (config.logo?.enabled) parts.push('logo');
    if (config.watermark?.enabled) parts.push('watermark');
    if (config.ctaOverlay?.enabled) parts.push('CTA');
    if (config.textOverlays?.length) parts.push(`${config.textOverlays.length} texts`);
    if (config.badges?.length) parts.push(`${config.badges.length} badges`);
    if (config.endCard?.enabled) parts.push('end-card');
    return parts.length > 0 ? parts.join(', ') : 'none';
  }
}

export const overlayConfigurationService = new OverlayConfigurationService();
