# Phase 8E: Brand Asset Injection

## Objective

Automatically inject brand assets (logo intro, watermark, CTA outro) into every video produced. This ensures consistent branding across all content without manual intervention.

## Problems This Solves

1. **Missing logo** - Videos without brand identification
2. **No watermark** - Content easily stolen/unattributed
3. **Missing CTA** - Videos without call-to-action or contact info
4. **Inconsistent branding** - Different placements/styles across videos

## What This Phase Creates

- `server/services/brand-injection-service.ts` - Asset injection logic
- Integration with Brand Media library
- Remotion composition updates for brand layers

---

## Brand Injection Service

Create `server/services/brand-injection-service.ts`:

```typescript
// server/services/brand-injection-service.ts

import { db } from '../db';
import { brandAssets } from '../db/schema';
import { eq, and } from 'drizzle-orm';

// ============================================
// TYPES
// ============================================

export interface BrandAsset {
  id: number;
  name: string;
  type: 'logo' | 'watermark' | 'cta_background' | 'icon';
  url: string;
  usageContexts: string[];
  metadata?: {
    width?: number;
    height?: number;
    hasTransparency?: boolean;
  };
}

export interface LogoIntroConfig {
  enabled: boolean;
  asset: BrandAsset | null;
  duration: number;          // seconds
  animation: 'fade' | 'zoom' | 'slide-up' | 'none';
  backgroundColor?: string;
  position: 'center' | 'lower-third';
  includeTagline: boolean;
  tagline?: string;
}

export interface WatermarkConfig {
  enabled: boolean;
  asset: BrandAsset | null;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;           // 0-1
  scale: number;             // 0-1 relative to video width
  margin: number;            // pixels from edge
  showDuring: 'all' | 'middle' | 'custom';
  customStart?: number;      // frame
  customEnd?: number;        // frame
}

export interface CTAOutroConfig {
  enabled: boolean;
  duration: number;          // seconds
  backgroundColor: string;
  logo: BrandAsset | null;
  
  // Contact information
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    address?: string;
  };
  
  // Social media
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    youtube?: string;
    tiktok?: string;
  };
  
  // CTA text
  headline?: string;
  subheadline?: string;
  buttonText?: string;
  buttonUrl?: string;
  
  // Animation
  animation: 'fade' | 'slide-up' | 'build';
}

export interface BrandInjectionPlan {
  logoIntro: LogoIntroConfig;
  watermark: WatermarkConfig;
  ctaOutro: CTAOutroConfig;
  totalAddedDuration: number;  // seconds added to video
}

// ============================================
// DEFAULT CONFIGURATIONS
// ============================================

const DEFAULT_LOGO_INTRO: Omit<LogoIntroConfig, 'asset'> = {
  enabled: true,
  duration: 2.5,
  animation: 'fade',
  backgroundColor: '#1a1a1a', // Dark background
  position: 'center',
  includeTagline: true,
  tagline: 'Cultivating Wellness',
};

const DEFAULT_WATERMARK: Omit<WatermarkConfig, 'asset'> = {
  enabled: true,
  position: 'bottom-right',
  opacity: 0.7,
  scale: 0.08,  // 8% of video width
  margin: 20,
  showDuring: 'all',
};

const DEFAULT_CTA_OUTRO: Omit<CTAOutroConfig, 'logo'> = {
  enabled: true,
  duration: 5,
  backgroundColor: '#2D5A27', // PHF Forest Green
  contactInfo: {
    website: 'pinehillfarm.co',
    phone: '',
    email: '',
  },
  headline: 'Start Your Wellness Journey',
  subheadline: 'Schedule your consultation today',
  buttonText: 'Learn More',
  animation: 'build',
};

// ============================================
// BRAND INJECTION SERVICE
// ============================================

class BrandInjectionService {
  
  /**
   * Create brand injection plan for a project
   */
  async createInjectionPlan(
    projectId: number,
    organizationId: number,
    overrides?: Partial<BrandInjectionPlan>
  ): Promise<BrandInjectionPlan> {
    console.log(`[BrandInjection] Creating plan for project ${projectId}`);
    
    // Load brand assets from library
    const assets = await this.loadBrandAssets(organizationId);
    
    // Find appropriate assets
    const primaryLogo = assets.find(a => 
      a.type === 'logo' && a.usageContexts.includes('intro')
    ) || assets.find(a => a.type === 'logo');
    
    const watermarkAsset = assets.find(a => 
      a.type === 'watermark' || 
      (a.type === 'logo' && a.usageContexts.includes('watermark'))
    ) || assets.find(a => a.type === 'logo');
    
    const ctaLogo = assets.find(a => 
      a.type === 'logo' && a.usageContexts.includes('outro')
    ) || assets.find(a => a.type === 'logo');
    
    // Build plan
    const plan: BrandInjectionPlan = {
      logoIntro: {
        ...DEFAULT_LOGO_INTRO,
        asset: primaryLogo || null,
        enabled: !!primaryLogo,
        ...overrides?.logoIntro,
      },
      watermark: {
        ...DEFAULT_WATERMARK,
        asset: watermarkAsset || null,
        enabled: !!watermarkAsset,
        ...overrides?.watermark,
      },
      ctaOutro: {
        ...DEFAULT_CTA_OUTRO,
        logo: ctaLogo || null,
        enabled: true, // Always show CTA even without logo
        ...overrides?.ctaOutro,
      },
      totalAddedDuration: 0,
    };
    
    // Calculate total added duration
    plan.totalAddedDuration = 
      (plan.logoIntro.enabled ? plan.logoIntro.duration : 0) +
      (plan.ctaOutro.enabled ? plan.ctaOutro.duration : 0);
    
    console.log(`[BrandInjection] Plan created: intro=${plan.logoIntro.enabled}, watermark=${plan.watermark.enabled}, outro=${plan.ctaOutro.enabled}`);
    console.log(`[BrandInjection] Added duration: ${plan.totalAddedDuration}s`);
    
    return plan;
  }
  
  /**
   * Load brand assets from database
   */
  private async loadBrandAssets(organizationId: number): Promise<BrandAsset[]> {
    try {
      const assets = await db
        .select()
        .from(brandAssets)
        .where(eq(brandAssets.organizationId, organizationId));
      
      return assets.map(a => ({
        id: a.id,
        name: a.name,
        type: a.assetType as BrandAsset['type'],
        url: a.url,
        usageContexts: a.usageContexts || [],
        metadata: a.metadata,
      }));
    } catch (error) {
      console.error('[BrandInjection] Failed to load assets:', error);
      return [];
    }
  }
  
  /**
   * Generate Remotion logo intro component props
   */
  getLogoIntroProps(config: LogoIntroConfig, fps: number): object {
    if (!config.enabled || !config.asset) {
      return { enabled: false };
    }
    
    return {
      enabled: true,
      durationInFrames: Math.round(config.duration * fps),
      logoUrl: config.asset.url,
      backgroundColor: config.backgroundColor,
      position: config.position,
      animation: config.animation,
      tagline: config.includeTagline ? config.tagline : undefined,
      fadeIn: Math.round(0.5 * fps),  // 0.5s fade in
      fadeOut: Math.round(0.3 * fps), // 0.3s fade out
    };
  }
  
  /**
   * Generate Remotion watermark component props
   */
  getWatermarkProps(
    config: WatermarkConfig,
    totalFrames: number,
    fps: number
  ): object {
    if (!config.enabled || !config.asset) {
      return { enabled: false };
    }
    
    let startFrame = 0;
    let endFrame = totalFrames;
    
    if (config.showDuring === 'middle') {
      // Skip first and last 10%
      startFrame = Math.round(totalFrames * 0.1);
      endFrame = Math.round(totalFrames * 0.9);
    } else if (config.showDuring === 'custom') {
      startFrame = config.customStart || 0;
      endFrame = config.customEnd || totalFrames;
    }
    
    return {
      enabled: true,
      logoUrl: config.asset.url,
      position: config.position,
      opacity: config.opacity,
      scale: config.scale,
      margin: config.margin,
      startFrame,
      endFrame,
    };
  }
  
  /**
   * Generate Remotion CTA outro component props
   */
  getCTAOutroProps(config: CTAOutroConfig, fps: number): object {
    if (!config.enabled) {
      return { enabled: false };
    }
    
    return {
      enabled: true,
      durationInFrames: Math.round(config.duration * fps),
      backgroundColor: config.backgroundColor,
      logoUrl: config.logo?.url,
      
      headline: config.headline,
      subheadline: config.subheadline,
      
      website: config.contactInfo.website,
      phone: config.contactInfo.phone,
      email: config.contactInfo.email,
      address: config.contactInfo.address,
      
      socialMedia: config.socialMedia,
      
      buttonText: config.buttonText,
      buttonUrl: config.buttonUrl,
      
      animation: config.animation,
      
      // Animation timing
      logoDelay: Math.round(0.3 * fps),
      headlineDelay: Math.round(0.8 * fps),
      contactDelay: Math.round(1.5 * fps),
      buttonDelay: Math.round(2.2 * fps),
    };
  }
  
  /**
   * Update organization's default brand injection settings
   */
  async updateDefaultSettings(
    organizationId: number,
    settings: Partial<BrandInjectionPlan>
  ): Promise<void> {
    // Store in organization settings table
    console.log(`[BrandInjection] Updating default settings for org ${organizationId}`);
    // Implementation depends on your settings storage
  }
}

export const brandInjectionService = new BrandInjectionService();
```

---

## Remotion Brand Components

### Logo Intro Component

```tsx
// remotion/components/LogoIntro.tsx

import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';

interface LogoIntroProps {
  enabled: boolean;
  durationInFrames: number;
  logoUrl: string;
  backgroundColor: string;
  position: 'center' | 'lower-third';
  animation: 'fade' | 'zoom' | 'slide-up' | 'none';
  tagline?: string;
  fadeIn: number;
  fadeOut: number;
}

export const LogoIntro: React.FC<LogoIntroProps> = ({
  enabled,
  durationInFrames,
  logoUrl,
  backgroundColor,
  position,
  animation,
  tagline,
  fadeIn,
  fadeOut,
}) => {
  const frame = useCurrentFrame();
  
  if (!enabled) return null;
  
  // Opacity animation
  const opacity = interpolate(
    frame,
    [0, fadeIn, durationInFrames - fadeOut, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateRight: 'clamp' }
  );
  
  // Scale animation for zoom
  const scale = animation === 'zoom'
    ? interpolate(frame, [0, fadeIn], [0.8, 1], { extrapolateRight: 'clamp' })
    : 1;
  
  // Y position for slide-up
  const translateY = animation === 'slide-up'
    ? interpolate(frame, [0, fadeIn], [50, 0], { extrapolateRight: 'clamp' })
    : 0;
  
  const positionStyle = position === 'center'
    ? { justifyContent: 'center', alignItems: 'center' }
    : { justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 100 };
  
  return (
    <AbsoluteFill style={{ backgroundColor, ...positionStyle, opacity }}>
      <div style={{
        transform: `scale(${scale}) translateY(${translateY}px)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 20,
      }}>
        <Img
          src={logoUrl}
          style={{ maxWidth: '40%', maxHeight: '30%', objectFit: 'contain' }}
        />
        {tagline && (
          <div style={{
            color: 'white',
            fontSize: 28,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 300,
            letterSpacing: 2,
            opacity: interpolate(frame, [fadeIn, fadeIn + 15], [0, 1]),
          }}>
            {tagline}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
```

### Watermark Component

```tsx
// remotion/components/Watermark.tsx

import { AbsoluteFill, Img, useCurrentFrame } from 'remotion';

interface WatermarkProps {
  enabled: boolean;
  logoUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  scale: number;
  margin: number;
  startFrame: number;
  endFrame: number;
}

export const Watermark: React.FC<WatermarkProps> = ({
  enabled,
  logoUrl,
  position,
  opacity,
  scale,
  margin,
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  
  if (!enabled) return null;
  if (frame < startFrame || frame > endFrame) return null;
  
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: margin, left: margin },
    'top-right': { top: margin, right: margin },
    'bottom-left': { bottom: margin, left: margin },
    'bottom-right': { bottom: margin, right: margin },
  };
  
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <Img
        src={logoUrl}
        style={{
          position: 'absolute',
          ...positionStyles[position],
          width: `${scale * 100}%`,
          opacity,
          objectFit: 'contain',
        }}
      />
    </AbsoluteFill>
  );
};
```

### CTA Outro Component

```tsx
// remotion/components/CTAOutro.tsx

import { AbsoluteFill, Img, interpolate, useCurrentFrame } from 'remotion';

interface CTAOutroProps {
  enabled: boolean;
  durationInFrames: number;
  backgroundColor: string;
  logoUrl?: string;
  headline?: string;
  subheadline?: string;
  website?: string;
  phone?: string;
  email?: string;
  buttonText?: string;
  animation: 'fade' | 'slide-up' | 'build';
  logoDelay: number;
  headlineDelay: number;
  contactDelay: number;
  buttonDelay: number;
}

export const CTAOutro: React.FC<CTAOutroProps> = ({
  enabled,
  durationInFrames,
  backgroundColor,
  logoUrl,
  headline,
  subheadline,
  website,
  phone,
  buttonText,
  animation,
  logoDelay,
  headlineDelay,
  contactDelay,
  buttonDelay,
}) => {
  const frame = useCurrentFrame();
  
  if (!enabled) return null;
  
  const fadeInDuration = 15;
  
  const getOpacity = (delay: number) => {
    if (animation === 'fade') {
      return interpolate(frame, [0, fadeInDuration], [0, 1], { extrapolateRight: 'clamp' });
    }
    return interpolate(frame, [delay, delay + fadeInDuration], [0, 1], { extrapolateRight: 'clamp' });
  };
  
  const getTranslateY = (delay: number) => {
    if (animation !== 'build') return 0;
    return interpolate(frame, [delay, delay + fadeInDuration], [30, 0], { extrapolateRight: 'clamp' });
  };
  
  return (
    <AbsoluteFill style={{
      backgroundColor,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 60,
    }}>
      {/* Logo */}
      {logoUrl && (
        <div style={{
          opacity: getOpacity(logoDelay),
          transform: `translateY(${getTranslateY(logoDelay)}px)`,
          marginBottom: 40,
        }}>
          <Img src={logoUrl} style={{ height: 80, objectFit: 'contain' }} />
        </div>
      )}
      
      {/* Headline */}
      {headline && (
        <div style={{
          opacity: getOpacity(headlineDelay),
          transform: `translateY(${getTranslateY(headlineDelay)}px)`,
          color: 'white',
          fontSize: 48,
          fontWeight: 'bold',
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          marginBottom: 16,
        }}>
          {headline}
        </div>
      )}
      
      {/* Subheadline */}
      {subheadline && (
        <div style={{
          opacity: getOpacity(headlineDelay + 5),
          transform: `translateY(${getTranslateY(headlineDelay + 5)}px)`,
          color: 'rgba(255,255,255,0.9)',
          fontSize: 24,
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          marginBottom: 40,
        }}>
          {subheadline}
        </div>
      )}
      
      {/* Contact Info */}
      <div style={{
        opacity: getOpacity(contactDelay),
        transform: `translateY(${getTranslateY(contactDelay)}px)`,
        display: 'flex',
        gap: 40,
        marginBottom: 40,
      }}>
        {website && (
          <div style={{ color: 'white', fontSize: 20 }}>🌐 {website}</div>
        )}
        {phone && (
          <div style={{ color: 'white', fontSize: 20 }}>📞 {phone}</div>
        )}
      </div>
      
      {/* Button */}
      {buttonText && (
        <div style={{
          opacity: getOpacity(buttonDelay),
          transform: `translateY(${getTranslateY(buttonDelay)}px) scale(${interpolate(frame, [buttonDelay, buttonDelay + 10], [0.9, 1], { extrapolateRight: 'clamp' })})`,
          backgroundColor: '#D4A574',
          color: '#1a1a1a',
          fontSize: 24,
          fontWeight: 'bold',
          padding: '16px 48px',
          borderRadius: 8,
        }}>
          {buttonText}
        </div>
      )}
    </AbsoluteFill>
  );
};
```

---

## API Endpoints

```typescript
// GET /api/projects/:id/brand-injection
router.get('/api/projects/:id/brand-injection', async (req, res) => {
  const projectId = parseInt(req.params.id);
  const project = await getProject(projectId);
  
  const plan = await brandInjectionService.createInjectionPlan(
    projectId,
    project.organizationId
  );
  
  res.json(plan);
});

// PUT /api/projects/:id/brand-injection
router.put('/api/projects/:id/brand-injection', async (req, res) => {
  const projectId = parseInt(req.params.id);
  const overrides = req.body;
  
  const project = await getProject(projectId);
  
  const plan = await brandInjectionService.createInjectionPlan(
    projectId,
    project.organizationId,
    overrides
  );
  
  // Save plan to project
  await updateProject(projectId, { brandInjectionPlan: plan });
  
  res.json(plan);
});
```

---

## Verification Checklist

- [ ] Brand injection service created
- [ ] Loads assets from Brand Media library
- [ ] Logo intro config generated
- [ ] Watermark config generated
- [ ] CTA outro config generated
- [ ] Remotion LogoIntro component working
- [ ] Remotion Watermark component working
- [ ] Remotion CTAOutro component working
- [ ] Animation options functional (fade, zoom, slide, build)
- [ ] Total added duration calculated correctly
- [ ] API endpoints working
- [ ] Default settings customizable

---

## Next Phase

Once Brand Asset Injection is working, proceed to **Phase 8F: Quality Assurance Dashboard** which provides the user-facing UI for reviewing and approving all scenes before rendering.
