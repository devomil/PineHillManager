import { KineticTypographyConfig } from '../../shared/types/motion-graphics-types';
import { brandBibleService } from './brand-bible-service';
import { createLogger } from '../utils/logger';

const log = createLogger('KineticTypography');

type TextAnimationStyle = 
  | 'word-by-word'
  | 'character'
  | 'bounce'
  | 'wave'
  | 'reveal'
  | 'typewriter'
  | 'slide-up'
  | 'scale-in';

interface ContentAnalysis {
  wordCount: number;
  averageWordLength: number;
  hasNumbers: boolean;
  isPunctuation: boolean;
  isQuestion: boolean;
  isExclamation: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
}

class KineticTypographyService {
  
  async generateConfig(
    text: string,
    duration: number,
    options?: {
      preferredStyle?: TextAnimationStyle;
      position?: 'top' | 'center' | 'bottom';
      alignment?: 'left' | 'center' | 'right';
      emphasizeWords?: string[];
    }
  ): Promise<KineticTypographyConfig> {
    log.info(`Generating config for: "${text.substring(0, 50)}..."`);
    
    const analysis = this.analyzeContent(text);
    const brandColors = await this.getBrandColors();
    const animationStyle = options?.preferredStyle || this.selectAnimationStyle(analysis);
    const timing = this.calculateTiming(analysis, duration, animationStyle);
    const fontSize = this.calculateFontSize(analysis);
    
    const config: KineticTypographyConfig = {
      type: 'kinetic-typography',
      duration,
      fps: 30,
      width: 1920,
      height: 1080,
      backgroundColor: '#FFFFFF',
      brandColors,
      text,
      animationStyle,
      fontSize,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontWeight: analysis.hasNumbers ? '800' : '700',
      textColor: brandColors.primary,
      position: options?.position || 'center',
      staggerDelay: timing.staggerDelay,
      entranceDuration: timing.entranceDuration,
      holdDuration: timing.holdDuration,
      exitDuration: timing.exitDuration,
      easing: this.selectEasing(animationStyle, analysis),
      textShadow: true,
      backgroundBox: {
        enabled: true,
        color: '#FFFFFF',
        opacity: 0.95,
        padding: 24,
        borderRadius: 12,
      },
    };
    
    log.info(`Style: ${animationStyle}, Font: ${fontSize}px, Duration: ${duration}s`);
    
    return config;
  }
  
  private analyzeContent(text: string): ContentAnalysis {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordLengths = words.map(w => w.length);
    
    return {
      wordCount: words.length,
      averageWordLength: wordLengths.length > 0 
        ? wordLengths.reduce((a, b) => a + b, 0) / words.length 
        : 0,
      hasNumbers: /\d/.test(text),
      isPunctuation: /[.!?]$/.test(text),
      isQuestion: text.trim().endsWith('?'),
      isExclamation: text.trim().endsWith('!'),
      sentiment: this.analyzeSentiment(text),
    };
  }
  
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const lower = text.toLowerCase();
    
    const positiveWords = [
      'wellness', 'health', 'happy', 'success', 'transform', 'achieve', 
      'natural', 'organic', 'fresh', 'vibrant', 'energy', 'balance',
      'pure', 'quality', 'premium', 'effective', 'powerful', 'amazing'
    ];
    const negativeWords = [
      'struggle', 'pain', 'tired', 'frustrated', 'problem', 'issue', 
      'difficult', 'hard', 'stress', 'worry', 'fear', 'doubt'
    ];
    
    const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => lower.includes(w)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  private selectAnimationStyle(analysis: ContentAnalysis): TextAnimationStyle {
    if (analysis.wordCount <= 3) {
      return analysis.isExclamation ? 'bounce' : 'scale-in';
    }
    
    if (analysis.wordCount <= 8) {
      return 'word-by-word';
    }
    
    if (analysis.wordCount <= 15) {
      return 'slide-up';
    }
    
    return 'typewriter';
  }
  
  private calculateTiming(
    analysis: ContentAnalysis,
    duration: number,
    style: TextAnimationStyle
  ): {
    staggerDelay: number;
    entranceDuration: number;
    holdDuration: number;
    exitDuration: number;
  } {
    const fps = 30;
    const totalFrames = duration * fps;
    const exitDuration = Math.round(fps * 0.5);
    
    let staggerDelay: number;
    let entranceDuration: number;
    
    switch (style) {
      case 'typewriter':
        staggerDelay = 2;
        entranceDuration = 1;
        break;
        
      case 'bounce':
      case 'scale-in':
        staggerDelay = 8;
        entranceDuration = 15;
        break;
        
      case 'wave':
      case 'reveal':
        staggerDelay = 5;
        entranceDuration = 12;
        break;
        
      case 'word-by-word':
      case 'slide-up':
      default:
        const wordsPerSecond = analysis.wordCount / (duration * 0.5);
        staggerDelay = Math.max(4, Math.min(12, Math.round(fps / wordsPerSecond)));
        entranceDuration = Math.round(fps * 0.3);
        break;
    }
    
    const totalEntranceTime = entranceDuration + (analysis.wordCount - 1) * staggerDelay;
    const holdDuration = Math.max(fps * 0.5, totalFrames - totalEntranceTime - exitDuration);
    
    return {
      staggerDelay,
      entranceDuration,
      holdDuration,
      exitDuration,
    };
  }
  
  private calculateFontSize(analysis: ContentAnalysis): number {
    let size = 72;
    
    if (analysis.wordCount <= 3) {
      size = 96;
    } else if (analysis.wordCount <= 6) {
      size = 72;
    } else if (analysis.wordCount <= 10) {
      size = 56;
    } else if (analysis.wordCount <= 15) {
      size = 48;
    } else {
      size = 36;
    }
    
    if (analysis.averageWordLength > 8) {
      size = Math.round(size * 0.85);
    }
    
    return size;
  }
  
  private selectEasing(
    style: TextAnimationStyle,
    analysis: ContentAnalysis
  ): 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'spring' | 'bounce' {
    switch (style) {
      case 'bounce':
        return 'bounce';
      case 'scale-in':
        return 'spring';
      case 'wave':
        return 'ease-in-out';
      case 'typewriter':
        return 'linear';
      default:
        return analysis.sentiment === 'positive' ? 'spring' : 'ease-out';
    }
  }
  
  private async getBrandColors(): Promise<{
    primary: string;
    secondary: string;
    accent: string;
    text: string;
  }> {
    try {
      const bible = await brandBibleService.getBrandBible();
      return {
        primary: bible.colors?.primary || '#2D5A27',
        secondary: bible.colors?.secondary || '#D4A574',
        accent: bible.colors?.accent || '#8B4513',
        text: bible.colors?.text || '#FFFFFF',
      };
    } catch {
      return {
        primary: '#2D5A27',
        secondary: '#D4A574',
        accent: '#8B4513',
        text: '#FFFFFF',
      };
    }
  }
  
  async generateMultiLineConfig(
    lines: string[],
    duration: number,
    options?: {
      position?: 'top' | 'center' | 'bottom';
      staggerLines?: boolean;
      lineDelay?: number;
    }
  ): Promise<KineticTypographyConfig[]> {
    const configs: KineticTypographyConfig[] = [];
    const lineDelay = options?.staggerLines ? (options.lineDelay || 30) : 0;
    const lineDuration = (duration * 30 - (lines.length - 1) * lineDelay) / lines.length / 30;
    
    for (let i = 0; i < lines.length; i++) {
      const config = await this.generateConfig(lines[i], lineDuration, {
        position: options?.position || 'center',
      });
      
      if (options?.staggerLines) {
        (config as any).startFrame = i * lineDelay;
      }
      
      configs.push(config);
    }
    
    return configs;
  }
  
  selectPreset(text: string, sceneType: string): string {
    const lower = text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    
    if (sceneType === 'cta' || lower.includes('now') || lower.includes('today')) {
      return 'cta-pop';
    }
    
    if (/\d+%|\d+\+/.test(text)) {
      return 'stat-reveal';
    }
    
    if (text.startsWith('"') || text.startsWith("'")) {
      return 'quote-typewriter';
    }
    
    if (wordCount <= 3 && text.endsWith('!')) {
      return 'headline-bounce';
    }
    
    if (wordCount <= 5) {
      return 'headline-wave';
    }
    
    if (sceneType === 'benefit' || sceneType === 'feature') {
      return 'list-slide';
    }
    
    return 'subtitle-fade';
  }
}

export const kineticTypographyService = new KineticTypographyService();
