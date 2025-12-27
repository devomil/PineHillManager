import { SceneAnalysis, SafeZones } from './scene-analysis-service';

export interface TextOverlayInstruction {
  text: string;
  position: {
    x: number;
    y: number;
    anchor: 'top-left' | 'top-center' | 'top-right' | 'center-left' | 'center' | 'center-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
  };
  style: {
    fontSize: number;
    fontWeight: string;
    color: string;
    textShadow?: string;
    backgroundColor?: string;
    padding?: string;
  };
  animation: {
    enter: 'fade' | 'slide-up' | 'slide-left' | 'slide-right' | 'zoom';
    exit: 'fade' | 'slide-down' | 'slide-left' | 'slide-right';
    enterDuration: number;
    exitDuration: number;
    enterDelay: number;
  };
}

export interface ProductOverlayInstruction {
  enabled: boolean;
  position: {
    x: number;
    y: number;
    anchor: string;
  };
  scale: number;
  animation: 'fade' | 'zoom' | 'slide';
  shadow: boolean;
}

export interface SceneCompositionInstructions {
  sceneId: string;
  textOverlays: TextOverlayInstruction[];
  productOverlay?: ProductOverlayInstruction;
  lowerThird?: {
    enabled: boolean;
    position: { y: number };
    style: {
      accentColor: string;
      backgroundColor: string;
    };
  };
}

class CompositionInstructionsService {
  
  generateInstructions(
    sceneId: string,
    textOverlays: Array<{ text: string; style?: string }>,
    analysis: SceneAnalysis | undefined,
    options: {
      useProductOverlay?: boolean;
      brandColor?: string;
      defaultTextPosition?: 'top' | 'center' | 'lower-third';
    } = {}
  ): SceneCompositionInstructions {
    
    const safeAnalysis = analysis || this.getDefaultAnalysis();
    
    const instructions: SceneCompositionInstructions = {
      sceneId,
      textOverlays: this.positionTextOverlays(textOverlays, safeAnalysis, options),
      productOverlay: options.useProductOverlay 
        ? this.positionProductOverlay(safeAnalysis) 
        : undefined,
    };
    
    return instructions;
  }

  generateFallbackInstructions(
    sceneId: string,
    textOverlays: Array<{ text: string; style?: string }>
  ): SceneCompositionInstructions {
    return {
      sceneId,
      textOverlays: textOverlays.map((overlay, index) => ({
        text: overlay.text,
        position: {
          x: 50,
          y: 82 + (index * 8),
          anchor: 'bottom-center' as const,
        },
        style: {
          fontSize: this.getFontSize(overlay.style || 'body'),
          fontWeight: this.getFontWeight(overlay.style || 'body'),
          color: '#FFFFFF',
          textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
        },
        animation: {
          enter: 'fade' as const,
          exit: 'fade' as const,
          enterDuration: 0.5,
          exitDuration: 0.3,
          enterDelay: index * 0.15,
        },
      })),
    };
  }

  private positionTextOverlays(
    overlays: Array<{ text: string; style?: string }>,
    analysis: SceneAnalysis,
    options: { defaultTextPosition?: 'top' | 'center' | 'lower-third'; brandColor?: string }
  ): TextOverlayInstruction[] {
    
    const rec = analysis.recommendations;
    const safeZones = analysis.safeZones;
    
    const basePosition = this.calculateBasePosition(rec.textPosition, safeZones);
    
    const textColor = rec.textColor;
    const needsShadow = rec.needsTextShadow;
    const needsBackground = rec.needsTextBackground;
    
    return overlays.map((overlay, index) => {
      const style = overlay.style || 'body';
      
      const yOffset = index * 8;
      
      return {
        text: overlay.text,
        position: {
          x: basePosition.x,
          y: Math.min(basePosition.y + yOffset, 95),
          anchor: this.getAnchor(rec.textPosition),
        },
        style: {
          fontSize: this.getFontSize(style),
          fontWeight: this.getFontWeight(style),
          color: textColor,
          textShadow: needsShadow 
            ? '2px 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' 
            : undefined,
          backgroundColor: needsBackground 
            ? 'rgba(0,0,0,0.6)' 
            : undefined,
          padding: needsBackground ? '8px 16px' : undefined,
        },
        animation: {
          enter: this.getEnterAnimation(style, analysis.mood),
          exit: 'fade',
          enterDuration: 0.5,
          exitDuration: 0.3,
          enterDelay: index * 0.15,
        },
      };
    });
  }

  private positionProductOverlay(analysis: SceneAnalysis): ProductOverlayInstruction {
    const rec = analysis.recommendations;
    
    if (!rec.productOverlaySafe) {
      return {
        enabled: false,
        position: { x: 90, y: 90, anchor: 'bottom-right' },
        scale: 0.15,
        animation: 'fade',
        shadow: true,
      };
    }
    
    const xMap: Record<string, number> = { left: 10, center: 50, right: 90 };
    const yMap: Record<string, number> = { top: 10, center: 50, bottom: 90 };
    
    return {
      enabled: true,
      position: {
        x: xMap[rec.productOverlayPosition.x] || 90,
        y: yMap[rec.productOverlayPosition.y] || 90,
        anchor: `${rec.productOverlayPosition.y}-${rec.productOverlayPosition.x}`,
      },
      scale: analysis.faces.detected ? 0.2 : 0.25,
      animation: analysis.mood === 'dramatic' ? 'zoom' : 'fade',
      shadow: true,
    };
  }

  private calculateBasePosition(
    textPosition: { vertical: string; horizontal: string },
    safeZones: SafeZones
  ): { x: number; y: number } {
    const yMap: Record<string, number> = {
      'top': 12,
      'center': 50,
      'lower-third': 82,
    };
    
    const xMap: Record<string, number> = {
      'left': 15,
      'center': 50,
      'right': 85,
    };
    
    let y = yMap[textPosition.vertical] || 82;
    let x = xMap[textPosition.horizontal] || 50;
    
    const zoneKey = this.getZoneKey(textPosition.vertical, textPosition.horizontal);
    if (!safeZones[zoneKey as keyof SafeZones]) {
      const alternative = this.findSafeAlternative(safeZones);
      if (alternative) {
        y = yMap[alternative.vertical] || y;
        x = xMap[alternative.horizontal] || x;
      }
    }
    
    return { x, y };
  }

  private getZoneKey(vertical: string, horizontal: string): string {
    const vMap: Record<string, string> = {
      'top': 'top',
      'center': 'middle',
      'lower-third': 'bottom',
    };
    const hMap: Record<string, string> = {
      'left': 'Left',
      'center': 'Center',
      'right': 'Right',
    };
    return `${vMap[vertical] || 'bottom'}${hMap[horizontal] || 'Center'}`;
  }

  private findSafeAlternative(safeZones: SafeZones): { vertical: string; horizontal: string } | null {
    const priorities = [
      { zone: 'bottomCenter', vertical: 'lower-third', horizontal: 'center' },
      { zone: 'bottomLeft', vertical: 'lower-third', horizontal: 'left' },
      { zone: 'bottomRight', vertical: 'lower-third', horizontal: 'right' },
      { zone: 'topCenter', vertical: 'top', horizontal: 'center' },
      { zone: 'topLeft', vertical: 'top', horizontal: 'left' },
      { zone: 'topRight', vertical: 'top', horizontal: 'right' },
    ];
    
    for (const p of priorities) {
      if (safeZones[p.zone as keyof SafeZones]) {
        return { vertical: p.vertical, horizontal: p.horizontal };
      }
    }
    
    return { vertical: 'lower-third', horizontal: 'center' };
  }

  private getAnchor(textPosition: { vertical: string; horizontal: string }): TextOverlayInstruction['position']['anchor'] {
    const v = textPosition.vertical === 'top' ? 'top' : 
              textPosition.vertical === 'center' ? 'center' : 'bottom';
    const h = textPosition.horizontal;
    
    if (v === 'center' && h === 'center') return 'center';
    return `${v}-${h}` as TextOverlayInstruction['position']['anchor'];
  }

  private getFontSize(style: string): number {
    const sizes: Record<string, number> = {
      'title': 72,
      'headline': 56,
      'subheadline': 42,
      'body': 36,
      'caption': 28,
    };
    return sizes[style] || 36;
  }

  private getFontWeight(style: string): string {
    const weights: Record<string, string> = {
      'title': '700',
      'headline': '600',
      'subheadline': '600',
      'body': '500',
      'caption': '400',
    };
    return weights[style] || '500';
  }

  private getEnterAnimation(
    style: string, 
    mood: string
  ): TextOverlayInstruction['animation']['enter'] {
    if (mood === 'dramatic') return 'zoom';
    if (style === 'title') return 'fade';
    if (style === 'headline') return 'slide-up';
    return 'fade';
  }

  private getDefaultAnalysis(): SceneAnalysis {
    return {
      faces: { detected: false, count: 0, positions: [] },
      composition: {
        focalPoint: { x: 50, y: 50 },
        brightness: 'normal',
        dominantColors: ['#808080'],
      },
      safeZones: {
        topLeft: true, topCenter: true, topRight: true,
        middleLeft: true, middleCenter: false, middleRight: true,
        bottomLeft: true, bottomCenter: true, bottomRight: true,
      },
      recommendations: {
        textPosition: { vertical: 'lower-third', horizontal: 'center' },
        textColor: '#FFFFFF',
        needsTextShadow: true,
        needsTextBackground: false,
        productOverlayPosition: { x: 'right', y: 'bottom' },
        productOverlaySafe: true,
      },
      contentType: 'mixed',
      mood: 'neutral',
    };
  }
}

export const compositionInstructionsService = new CompositionInstructionsService();
