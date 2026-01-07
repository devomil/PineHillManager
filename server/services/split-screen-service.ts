import type { SplitPanel, SplitLayout } from '../../remotion/components/motion-graphics/SplitScreen';

const log = {
  info: (message: string, data?: any) => console.log(`[SplitScreen] ${message}`, data ? JSON.stringify(data) : ''),
  debug: (message: string, data?: any) => console.log(`[SplitScreen:debug] ${message}`, data ? JSON.stringify(data) : ''),
};

interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
}

interface SplitScreenConfig {
  type: 'split-screen';
  duration: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  brandColors: BrandColors;
  layout: SplitLayout;
  panels: SplitPanel[];
  dividerStyle: {
    width: number;
    color: string;
    animated: boolean;
  };
  labelStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
    backgroundOpacity: number;
    padding: number;
  };
  transitionType: 'simultaneous' | 'sequential' | 'wipe-left' | 'wipe-right' | 'wipe-down';
  transitionDuration: number;
  staggerDelay: number;
}

interface BeforeAfterConfig {
  type: 'before-after';
  duration: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  brandColors: BrandColors;
  beforeMedia: {
    url: string;
    type: 'image' | 'video';
    label: string;
  };
  afterMedia: {
    url: string;
    type: 'image' | 'video';
    label: string;
  };
  transitionStyle: 'slider' | 'fade' | 'wipe' | 'flip';
  sliderConfig: {
    startPosition: number;
    endPosition: number;
    handleColor: string;
    handleWidth: number;
  };
  labelStyle: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
    backgroundOpacity: number;
  };
  transitionStartFrame: number;
  transitionDuration: number;
  holdBeforeFrames: number;
  holdAfterFrames: number;
}

interface PictureInPictureConfig {
  type: 'picture-in-picture';
  duration: number;
  fps: number;
  width: number;
  height: number;
  backgroundColor: string;
  brandColors: BrandColors;
  mainMedia: {
    url: string;
    type: 'image' | 'video';
  };
  pipMedia: {
    url: string;
    type: 'image' | 'video';
    label?: string;
  };
  pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  pipSize: number;
  pipMargin: number;
  pipStyle: {
    borderWidth: number;
    borderColor: string;
    borderRadius: number;
    shadow: boolean;
  };
  labelStyle?: {
    fontSize: number;
    fontWeight: string | number;
    fontFamily: string;
    color: string;
    backgroundColor: string;
  };
  pipEntranceFrame: number;
  pipEntranceDuration: number;
  pipEntranceStyle: 'fade' | 'scale' | 'slide';
}

type SplitScreenCompositorConfig = SplitScreenConfig | BeforeAfterConfig | PictureInPictureConfig;

class SplitScreenService {
  private defaultBrandColors: BrandColors = {
    primary: '#2D5A27',
    secondary: '#D4A574',
    accent: '#8B4513',
    text: '#FFFFFF',
  };

  private brandBibleService: any = null;

  setBrandBibleService(service: any): void {
    this.brandBibleService = service;
  }

  private async getBrandColors(): Promise<BrandColors> {
    if (!this.brandBibleService) {
      try {
        const { brandBibleService } = await import('./brand-bible-service');
        this.brandBibleService = brandBibleService;
      } catch {
        log.debug('Brand bible service not available, using defaults');
        return this.defaultBrandColors;
      }
    }

    try {
      const bible = await this.brandBibleService.getBrandBible();
      return {
        primary: bible.colors?.primary || this.defaultBrandColors.primary,
        secondary: bible.colors?.secondary || this.defaultBrandColors.secondary,
        accent: bible.colors?.accent || this.defaultBrandColors.accent,
        text: bible.colors?.text || this.defaultBrandColors.text,
      };
    } catch {
      return this.defaultBrandColors;
    }
  }

  async generateSplitScreenConfig(
    panels: Array<{ url: string; type: 'image' | 'video'; label?: string; labelPosition?: 'top' | 'bottom' | 'overlay' }>,
    duration: number,
    options?: {
      layout?: SplitLayout;
      transitionType?: 'simultaneous' | 'sequential' | 'wipe-left' | 'wipe-right' | 'wipe-down';
      width?: number;
      height?: number;
    }
  ): Promise<SplitScreenConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    const totalFrames = Math.round(fps * duration);
    
    let layout: SplitLayout;
    if (options?.layout) {
      layout = options.layout;
    } else {
      switch (panels.length) {
        case 2:
          layout = '2-horizontal';
          break;
        case 3:
          layout = '3-horizontal';
          break;
        case 4:
          layout = '4-grid';
          break;
        default:
          layout = '2-horizontal';
      }
    }

    const transitionDuration = Math.round(fps * 0.5);
    const staggerDelay = Math.round(fps * 0.2);

    log.info('Generating split screen config', { 
      panelCount: panels.length, 
      layout, 
      duration,
      transitionType: options?.transitionType || 'simultaneous'
    });
    
    return {
      type: 'split-screen',
      duration,
      fps,
      width: options?.width || 1920,
      height: options?.height || 1080,
      backgroundColor: '#000000',
      brandColors,
      layout,
      panels: panels.map(p => ({
        mediaUrl: p.url,
        mediaType: p.type,
        label: p.label,
        labelPosition: p.labelPosition || 'bottom',
      })),
      dividerStyle: {
        width: 4,
        color: brandColors.secondary,
        animated: true,
      },
      labelStyle: {
        fontSize: 24,
        fontWeight: '600',
        fontFamily: 'Inter, sans-serif',
        color: '#FFFFFF',
        backgroundColor: brandColors.primary,
        backgroundOpacity: 0.8,
        padding: 12,
      },
      transitionType: options?.transitionType || 'simultaneous',
      transitionDuration,
      staggerDelay,
    };
  }

  async generateBeforeAfterConfig(
    before: { url: string; type: 'image' | 'video'; label: string },
    after: { url: string; type: 'image' | 'video'; label: string },
    duration: number,
    options?: {
      transitionStyle?: 'slider' | 'fade' | 'wipe' | 'flip';
      width?: number;
      height?: number;
    }
  ): Promise<BeforeAfterConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;
    const totalFrames = Math.round(fps * duration);
    
    const holdBeforeFrames = Math.round(fps * 1);
    const transitionDuration = Math.round(fps * 1.5);
    const holdAfterFrames = Math.max(15, totalFrames - holdBeforeFrames - transitionDuration - Math.round(fps * 0.5));

    log.info('Generating before/after config', { 
      transitionStyle: options?.transitionStyle || 'slider',
      duration,
      holdBeforeFrames,
      transitionDuration,
      holdAfterFrames
    });
    
    return {
      type: 'before-after',
      duration,
      fps,
      width: options?.width || 1920,
      height: options?.height || 1080,
      backgroundColor: '#000000',
      brandColors,
      beforeMedia: {
        url: before.url,
        type: before.type,
        label: before.label,
      },
      afterMedia: {
        url: after.url,
        type: after.type,
        label: after.label,
      },
      transitionStyle: options?.transitionStyle || 'slider',
      sliderConfig: {
        startPosition: 100,
        endPosition: 0,
        handleColor: '#FFFFFF',
        handleWidth: 6,
      },
      labelStyle: {
        fontSize: 24,
        fontWeight: '600',
        fontFamily: 'Inter, sans-serif',
        color: '#FFFFFF',
        backgroundColor: brandColors.primary,
        backgroundOpacity: 0.8,
      },
      transitionStartFrame: holdBeforeFrames,
      transitionDuration,
      holdBeforeFrames,
      holdAfterFrames,
    };
  }

  async generatePictureInPictureConfig(
    mainMedia: { url: string; type: 'image' | 'video' },
    pipMedia: { url: string; type: 'image' | 'video'; label?: string },
    duration: number,
    options?: {
      pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
      pipSize?: number;
      pipEntranceStyle?: 'fade' | 'scale' | 'slide';
      width?: number;
      height?: number;
    }
  ): Promise<PictureInPictureConfig> {
    const brandColors = await this.getBrandColors();
    const fps = 30;

    const pipEntranceFrame = Math.round(fps * 0.5);
    const pipEntranceDuration = Math.round(fps * 0.5);

    log.info('Generating PiP config', {
      pipPosition: options?.pipPosition || 'bottom-right',
      pipSize: options?.pipSize || 30,
      pipEntranceStyle: options?.pipEntranceStyle || 'scale',
      duration
    });
    
    return {
      type: 'picture-in-picture',
      duration,
      fps,
      width: options?.width || 1920,
      height: options?.height || 1080,
      backgroundColor: '#000000',
      brandColors,
      mainMedia,
      pipMedia,
      pipPosition: options?.pipPosition || 'bottom-right',
      pipSize: options?.pipSize || 30,
      pipMargin: 30,
      pipStyle: {
        borderWidth: 3,
        borderColor: brandColors.accent,
        borderRadius: 8,
        shadow: true,
      },
      labelStyle: pipMedia.label ? {
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'Inter, sans-serif',
        color: '#FFFFFF',
        backgroundColor: brandColors.primary,
      } : undefined,
      pipEntranceFrame,
      pipEntranceDuration,
      pipEntranceStyle: options?.pipEntranceStyle || 'scale',
    };
  }

  parseSplitScreenFromDirection(visualDirection: string): {
    type: 'split-screen' | 'before-after' | 'pip' | 'unknown';
    panelCount: number;
    labels: string[];
    layout?: SplitLayout;
    transitionStyle?: 'slider' | 'fade' | 'wipe' | 'flip';
    pipPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  } {
    const lower = visualDirection.toLowerCase();
    
    if (lower.includes('before') && lower.includes('after')) {
      let transitionStyle: 'slider' | 'fade' | 'wipe' | 'flip' = 'slider';
      if (lower.includes('fade')) transitionStyle = 'fade';
      else if (lower.includes('wipe')) transitionStyle = 'wipe';
      else if (lower.includes('flip')) transitionStyle = 'flip';
      
      const labelMatch = visualDirection.match(/(?:before|after)[:\s]+["']?([^"'\n,]+)/gi);
      const labels = labelMatch 
        ? labelMatch.map(m => m.replace(/^(before|after)[:\s]+["']?/i, '').replace(/["']$/, '').trim())
        : ['Before', 'After'];
      
      return {
        type: 'before-after',
        panelCount: 2,
        labels: labels.slice(0, 2),
        transitionStyle,
      };
    }
    
    if (lower.includes('picture in picture') || lower.includes('pip') || lower.includes('overlay')) {
      let pipPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';
      if (lower.includes('top') && lower.includes('left')) pipPosition = 'top-left';
      else if (lower.includes('top') && lower.includes('right')) pipPosition = 'top-right';
      else if (lower.includes('bottom') && lower.includes('left')) pipPosition = 'bottom-left';
      
      return {
        type: 'pip',
        panelCount: 2,
        labels: [],
        pipPosition,
      };
    }
    
    if (lower.includes('split') || lower.includes('side by side') || lower.includes('comparison') || lower.includes('grid')) {
      const countMatch = lower.match(/(\d+)\s*(?:panel|way|screen|part|column|row)/);
      let panelCount = countMatch ? parseInt(countMatch[1]) : 2;
      panelCount = Math.min(Math.max(panelCount, 2), 4);
      
      let layout: SplitLayout = '2-horizontal';
      if (lower.includes('vertical')) {
        layout = panelCount === 2 ? '2-vertical' : panelCount === 3 ? '3-vertical' : '4-grid';
      } else if (lower.includes('grid') || panelCount === 4) {
        layout = '4-grid';
      } else if (panelCount === 3) {
        layout = '3-horizontal';
      }
      
      const labelMatch = visualDirection.match(/(?:showing|comparing|displaying|with)[:\s]+([^.!?]+)/i);
      const labels = labelMatch 
        ? labelMatch[1].split(/,|and|vs|versus/).map(s => s.trim()).filter(s => s.length > 0 && s.length < 40)
        : [];
      
      log.info('Parsed split screen from direction', { panelCount, layout, labels: labels.length });
      
      return {
        type: 'split-screen',
        panelCount,
        labels,
        layout,
      };
    }
    
    return {
      type: 'unknown',
      panelCount: 0,
      labels: [],
    };
  }

  async generateConfigFromDirection(
    visualDirection: string,
    mediaUrls: string[],
    mediaTypes: Array<'image' | 'video'>,
    duration: number
  ): Promise<SplitScreenCompositorConfig | null> {
    const parsed = this.parseSplitScreenFromDirection(visualDirection);
    
    if (parsed.type === 'unknown' || mediaUrls.length < 2) {
      return null;
    }
    
    switch (parsed.type) {
      case 'before-after': {
        return this.generateBeforeAfterConfig(
          { url: mediaUrls[0], type: mediaTypes[0] || 'image', label: parsed.labels[0] || 'Before' },
          { url: mediaUrls[1], type: mediaTypes[1] || 'image', label: parsed.labels[1] || 'After' },
          duration,
          { transitionStyle: parsed.transitionStyle }
        );
      }
      
      case 'pip': {
        return this.generatePictureInPictureConfig(
          { url: mediaUrls[0], type: mediaTypes[0] || 'video' },
          { url: mediaUrls[1], type: mediaTypes[1] || 'image', label: parsed.labels[0] },
          duration,
          { pipPosition: parsed.pipPosition }
        );
      }
      
      case 'split-screen': {
        const panels = mediaUrls.slice(0, parsed.panelCount).map((url, i) => ({
          url,
          type: mediaTypes[i] || 'image' as const,
          label: parsed.labels[i],
        }));
        
        return this.generateSplitScreenConfig(panels, duration, { layout: parsed.layout });
      }
      
      default:
        return null;
    }
  }

  detectCompositorType(visualDirection: string): 'split-screen' | 'before-after' | 'pip' | null {
    const parsed = this.parseSplitScreenFromDirection(visualDirection);
    return parsed.type === 'unknown' ? null : parsed.type;
  }
}

export const splitScreenService = new SplitScreenService();
