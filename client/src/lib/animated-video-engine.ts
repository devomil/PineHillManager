// Animated Video Engine - Timeline-driven renderer with real animations
// Produces actual animated video with text effects, Ken Burns, and transitions

import { ParsedScript, ScriptSection, Platform, PLATFORM_SPECS } from './script-pipeline';

interface AnimationKeyframe {
  time: number; // Time in seconds when this keyframe is active
  properties: Record<string, number | string>;
}

interface AnimatedElement {
  id: string;
  type: 'text' | 'subtitle' | 'image' | 'shape' | 'logo';
  content: string;
  startTime: number; // When element appears
  endTime: number; // When element disappears
  position: { x: number; y: number };
  size?: { width: number; height: number };
  style: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    opacity?: number;
    align?: 'left' | 'center' | 'right';
  };
  animation: {
    entry: 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'typewriter' | 'scale' | 'none';
    entryDuration: number;
    exit: 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'scale' | 'none';
    exitDuration: number;
    kenBurns?: {
      startScale: number;
      endScale: number;
      panX: number;
      panY: number;
    };
  };
}

interface VideoSection {
  id: string;
  type: ScriptSection['type'];
  startTime: number;
  endTime: number;
  background: {
    type: 'gradient' | 'solid' | 'image';
    colors: string[];
    imageUrl?: string;
  };
  elements: AnimatedElement[];
  transition: {
    in: 'crossfade' | 'wipe' | 'slide' | 'none';
    inDuration: number;
    out: 'crossfade' | 'wipe' | 'slide' | 'none';
    outDuration: number;
  };
}

interface VideoTimeline {
  sections: VideoSection[];
  totalDuration: number;
  fps: number;
  resolution: { width: number; height: number };
}

// Brand colors for Pine Hill Farm
const BRAND_COLORS = {
  primary: '#2d5016',
  secondary: '#4a7c23',
  accent: '#7cb342',
  light: '#c5e1a5',
  dark: '#1b3409',
  white: '#ffffff',
  cream: '#f5f5dc',
  warmWhite: '#faf8f5'
};

// Section-specific color schemes
const SECTION_THEMES: Record<ScriptSection['type'], {
  background: { type: 'gradient' | 'solid'; colors: string[] };
  titleColor: string;
  textColor: string;
  accentColor: string;
}> = {
  hook: {
    background: { type: 'gradient', colors: [BRAND_COLORS.primary, BRAND_COLORS.secondary] },
    titleColor: BRAND_COLORS.white,
    textColor: BRAND_COLORS.cream,
    accentColor: BRAND_COLORS.accent
  },
  problem: {
    background: { type: 'gradient', colors: ['#37474f', '#546e7a'] },
    titleColor: BRAND_COLORS.white,
    textColor: '#eceff1',
    accentColor: '#ff8a65'
  },
  solution: {
    background: { type: 'gradient', colors: [BRAND_COLORS.secondary, BRAND_COLORS.accent] },
    titleColor: BRAND_COLORS.white,
    textColor: BRAND_COLORS.cream,
    accentColor: '#ffeb3b'
  },
  social_proof: {
    background: { type: 'gradient', colors: ['#1565c0', '#1976d2'] },
    titleColor: BRAND_COLORS.white,
    textColor: '#e3f2fd',
    accentColor: '#4fc3f7'
  },
  cta: {
    background: { type: 'gradient', colors: ['#c62828', '#e53935'] },
    titleColor: BRAND_COLORS.white,
    textColor: BRAND_COLORS.white,
    accentColor: '#ffeb3b'
  }
};

export interface SectionImage {
  url: string;
  loadedImage?: HTMLImageElement;
}

export class AnimatedVideoEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private fps: number = 30;
  private timeline: VideoTimeline | null = null;
  private onProgress?: (progress: number) => void;
  private sectionImages: Map<string, HTMLImageElement> = new Map();
  private audioBuffer: Blob | null = null;
  private targetDuration: number = 60; // Default 60 seconds

  constructor(canvas: HTMLCanvasElement, platform: Platform = 'youtube') {
    this.canvas = canvas;
    const spec = PLATFORM_SPECS[platform];
    this.width = spec.resolution.width;
    this.height = spec.resolution.height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = true;
  }

  setProgressCallback(callback: (progress: number) => void) {
    this.onProgress = callback;
  }

  setTargetDuration(seconds: number) {
    this.targetDuration = seconds;
  }

  setAudioBuffer(audio: Blob | null) {
    this.audioBuffer = audio;
  }

  /**
   * Load images for sections
   */
  async loadSectionImages(images: { sectionType: string; url: string }[]): Promise<void> {
    const loadPromises = images.map(async ({ sectionType, url }) => {
      try {
        const img = await this.loadImage(url);
        this.sectionImages.set(sectionType, img);
      } catch (error) {
        console.warn(`Failed to load image for ${sectionType}:`, error);
      }
    });
    await Promise.all(loadPromises);
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  }

  /**
   * Build timeline from parsed script
   */
  buildTimeline(parsedScript: ParsedScript): VideoTimeline {
    const sections: VideoSection[] = [];
    
    // Scale section times to match target duration
    const scaleFactor = this.targetDuration / parsedScript.totalDuration;
    
    for (const scriptSection of parsedScript.sections) {
      const theme = SECTION_THEMES[scriptSection.type];
      
      // Scale times to target duration
      const scaledStartTime = scriptSection.startTime * scaleFactor;
      const scaledEndTime = scriptSection.endTime * scaleFactor;
      
      // Create scaled section for element creation
      const scaledSection = {
        ...scriptSection,
        startTime: scaledStartTime,
        endTime: scaledEndTime
      };
      
      const elements = this.createSectionElements(scaledSection, theme);
      
      // Check if we have an image for this section type
      const sectionImage = this.sectionImages.get(scriptSection.type);
      
      sections.push({
        id: scriptSection.id,
        type: scriptSection.type,
        startTime: scaledStartTime,
        endTime: scaledEndTime,
        background: sectionImage ? {
          type: 'image' as const,
          colors: theme.background.colors,
          imageUrl: undefined // Image loaded separately
        } : theme.background,
        elements,
        transition: {
          in: 'crossfade',
          inDuration: 0.5,
          out: 'crossfade',
          outDuration: 0.5
        }
      });
    }

    this.timeline = {
      sections,
      totalDuration: this.targetDuration,
      fps: this.fps,
      resolution: parsedScript.resolution
    };

    return this.timeline;
  }

  /**
   * Create animated elements for a section
   */
  private createSectionElements(section: ScriptSection, theme: typeof SECTION_THEMES['hook']): AnimatedElement[] {
    const elements: AnimatedElement[] = [];
    const sectionDuration = section.endTime - section.startTime;
    
    // Brand logo/name at top
    elements.push({
      id: `${section.id}_logo`,
      type: 'text',
      content: 'Pine Hill Farm',
      startTime: 0,
      endTime: sectionDuration,
      position: { x: this.width / 2, y: 60 },
      style: {
        fontSize: 32,
        fontFamily: 'Georgia, serif',
        color: theme.titleColor,
        align: 'center',
        opacity: 0.9
      },
      animation: {
        entry: 'fade',
        entryDuration: 0.3,
        exit: 'fade',
        exitDuration: 0.3
      }
    });

    // Section type indicator
    const sectionLabels: Record<ScriptSection['type'], string> = {
      hook: '',
      problem: 'The Challenge',
      solution: 'The Solution',
      social_proof: 'Why Choose Us',
      cta: 'Take Action Now'
    };

    if (sectionLabels[section.type]) {
      elements.push({
        id: `${section.id}_label`,
        type: 'text',
        content: sectionLabels[section.type],
        startTime: 0.2,
        endTime: sectionDuration - 0.2,
        position: { x: this.width / 2, y: 140 },
        style: {
          fontSize: 28,
          fontFamily: 'Arial, sans-serif',
          color: theme.accentColor,
          align: 'center'
        },
        animation: {
          entry: 'slideDown',
          entryDuration: 0.4,
          exit: 'fade',
          exitDuration: 0.3
        }
      });
    }

    // Main content - split into lines
    const lines = this.wrapText(section.content, 50);
    const maxLines = section.type === 'solution' ? 6 : 4;
    const displayLines = lines.slice(0, maxLines);
    
    // Calculate vertical positioning
    const lineHeight = section.type === 'hook' ? 80 : 70;
    const startY = this.height / 2 - ((displayLines.length - 1) * lineHeight) / 2;
    
    displayLines.forEach((line, index) => {
      const isFirstLine = index === 0;
      const entryDelay = 0.3 + (index * 0.2);
      
      elements.push({
        id: `${section.id}_line_${index}`,
        type: 'text',
        content: line,
        startTime: entryDelay,
        endTime: sectionDuration - 0.3,
        position: { 
          x: this.width / 2, 
          y: startY + (index * lineHeight)
        },
        style: {
          fontSize: isFirstLine && section.type === 'hook' ? 56 : 42,
          fontFamily: 'Arial, sans-serif',
          color: theme.textColor,
          align: 'center'
        },
        animation: {
          entry: section.type === 'hook' ? 'typewriter' : 'slideLeft',
          entryDuration: section.type === 'hook' ? 1.5 : 0.5,
          exit: 'fade',
          exitDuration: 0.3
        }
      });
    });

    // Add decorative elements based on section type
    if (section.type === 'hook') {
      // Animated underline
      elements.push({
        id: `${section.id}_underline`,
        type: 'shape',
        content: 'line',
        startTime: 1.5,
        endTime: sectionDuration - 0.2,
        position: { x: this.width / 2 - 200, y: startY + 60 },
        size: { width: 400, height: 4 },
        style: { backgroundColor: theme.accentColor },
        animation: {
          entry: 'scale',
          entryDuration: 0.5,
          exit: 'fade',
          exitDuration: 0.2
        }
      });
    }

    if (section.type === 'solution') {
      // Checkmarks for benefits
      displayLines.forEach((line, index) => {
        if (line.includes('✓') || line.includes('•') || line.includes('-')) {
          elements.push({
            id: `${section.id}_check_${index}`,
            type: 'text',
            content: '✓',
            startTime: 0.5 + (index * 0.3),
            endTime: sectionDuration - 0.2,
            position: { x: 150, y: startY + (index * lineHeight) },
            style: {
              fontSize: 48,
              color: BRAND_COLORS.accent
            },
            animation: {
              entry: 'scale',
              entryDuration: 0.3,
              exit: 'fade',
              exitDuration: 0.2
            }
          });
        }
      });
    }

    if (section.type === 'cta') {
      // Pulsing button effect
      elements.push({
        id: `${section.id}_button`,
        type: 'shape',
        content: 'button',
        startTime: 0.8,
        endTime: sectionDuration,
        position: { x: this.width / 2 - 150, y: this.height - 180 },
        size: { width: 300, height: 60 },
        style: { backgroundColor: BRAND_COLORS.accent },
        animation: {
          entry: 'scale',
          entryDuration: 0.4,
          exit: 'fade',
          exitDuration: 0.2
        }
      });
      
      elements.push({
        id: `${section.id}_button_text`,
        type: 'text',
        content: 'Shop Now',
        startTime: 1.0,
        endTime: sectionDuration,
        position: { x: this.width / 2, y: this.height - 150 },
        style: {
          fontSize: 28,
          fontFamily: 'Arial, sans-serif',
          color: BRAND_COLORS.dark,
          align: 'center'
        },
        animation: {
          entry: 'fade',
          entryDuration: 0.3,
          exit: 'fade',
          exitDuration: 0.2
        }
      });
    }

    return elements;
  }

  /**
   * Render the entire video and return as blob
   */
  async renderVideo(): Promise<Blob> {
    if (!this.timeline) {
      throw new Error('Timeline not built. Call buildTimeline first.');
    }

    console.log(`Rendering animated video: ${this.timeline.totalDuration}s at ${this.fps}fps`);

    const stream = this.canvas.captureStream(this.fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 8000000
    });

    const chunks: Blob[] = [];
    const totalFrames = Math.ceil(this.timeline.totalDuration * this.fps);

    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        console.log('Video rendering complete');
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };

      mediaRecorder.onerror = reject;

      mediaRecorder.start(100);

      // Render each frame
      this.renderFrames(totalFrames, mediaRecorder);
    });
  }

  /**
   * Render all frames sequentially
   */
  private async renderFrames(totalFrames: number, mediaRecorder: MediaRecorder) {
    const timeline = this.timeline!;
    
    for (let frame = 0; frame < totalFrames; frame++) {
      const currentTime = frame / this.fps;
      
      // Find active section
      const activeSection = timeline.sections.find(
        s => currentTime >= s.startTime && currentTime < s.endTime
      );

      if (activeSection) {
        const sectionTime = currentTime - activeSection.startTime;
        const sectionDuration = activeSection.endTime - activeSection.startTime;
        
        // Calculate transition states
        const transitionIn = Math.min(1, sectionTime / activeSection.transition.inDuration);
        const timeFromEnd = sectionDuration - sectionTime;
        const transitionOut = Math.min(1, timeFromEnd / activeSection.transition.outDuration);
        const transitionAlpha = Math.min(transitionIn, transitionOut);
        
        // Render frame
        this.renderFrame(activeSection, sectionTime, transitionAlpha);
      } else {
        // Black frame for gaps
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
      }

      // Report progress
      if (this.onProgress && frame % 10 === 0) {
        this.onProgress((frame / totalFrames) * 100);
      }

      // Wait for next frame
      await this.waitForFrame();
    }

    // Final progress
    if (this.onProgress) {
      this.onProgress(100);
    }

    // Stop recording
    setTimeout(() => mediaRecorder.stop(), 500);
  }

  /**
   * Render a single frame
   */
  private renderFrame(section: VideoSection, sectionTime: number, transitionAlpha: number) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Apply section transition
    this.ctx.globalAlpha = this.easeInOutCubic(transitionAlpha);
    
    // Get section duration for Ken Burns calculation
    const sectionDuration = section.endTime - section.startTime;
    
    // Render background (with image if available)
    this.renderBackground(section.background, sectionTime, section.type, sectionDuration);
    
    // Render each visible element
    for (const element of section.elements) {
      if (sectionTime >= element.startTime && sectionTime < element.endTime) {
        const elementTime = sectionTime - element.startTime;
        const elementDuration = element.endTime - element.startTime;
        this.renderElement(element, elementTime, elementDuration);
      }
    }
    
    // Reset alpha
    this.ctx.globalAlpha = 1;
  }

  /**
   * Render background with optional animation and Ken Burns for images
   */
  private renderBackground(background: VideoSection['background'], time: number, sectionType: string, sectionDuration: number) {
    // Check if we have an image for this section
    const sectionImage = this.sectionImages.get(sectionType);
    
    if (sectionImage) {
      // Render image with Ken Burns effect
      this.renderImageWithKenBurns(sectionImage, time, sectionDuration);
      
      // Add semi-transparent overlay for better text readability
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      // Fallback to gradient/solid background
      if (background.type === 'gradient') {
        const shift = Math.sin(time * 0.5) * 50;
        const gradient = this.ctx.createLinearGradient(0, shift, this.width, this.height + shift);
        gradient.addColorStop(0, background.colors[0]);
        gradient.addColorStop(1, background.colors[1]);
        this.ctx.fillStyle = gradient;
      } else {
        this.ctx.fillStyle = background.colors[0];
      }
      
      this.ctx.fillRect(0, 0, this.width, this.height);
      
      // Add subtle animated particles/pattern
      this.renderBackgroundParticles(time);
    }
  }

  /**
   * Render image with Ken Burns zoom/pan effect
   */
  private renderImageWithKenBurns(img: HTMLImageElement, time: number, sectionDuration: number) {
    const progress = time / sectionDuration;
    
    // Ken Burns parameters - slow zoom in and slight pan
    const startScale = 1.0;
    const endScale = 1.15;
    const scale = startScale + (endScale - startScale) * this.easeInOutCubic(progress);
    
    // Calculate pan (slight movement)
    const panX = Math.sin(progress * Math.PI) * 30;
    const panY = Math.cos(progress * Math.PI * 0.5) * 20;
    
    // Calculate dimensions to cover canvas
    const imgAspect = img.width / img.height;
    const canvasAspect = this.width / this.height;
    
    let drawWidth: number, drawHeight: number;
    
    if (imgAspect > canvasAspect) {
      drawHeight = this.height * scale;
      drawWidth = drawHeight * imgAspect;
    } else {
      drawWidth = this.width * scale;
      drawHeight = drawWidth / imgAspect;
    }
    
    // Center the image with pan offset
    const x = (this.width - drawWidth) / 2 + panX;
    const y = (this.height - drawHeight) / 2 + panY;
    
    this.ctx.drawImage(img, x, y, drawWidth, drawHeight);
  }

  /**
   * Render subtle background animation
   */
  private renderBackgroundParticles(time: number) {
    this.ctx.save();
    this.ctx.globalAlpha = 0.1;
    
    // Floating circles
    for (let i = 0; i < 8; i++) {
      const baseX = (i * this.width / 8) + 100;
      const baseY = this.height / 2;
      const x = baseX + Math.sin(time * 0.3 + i) * 50;
      const y = baseY + Math.cos(time * 0.4 + i * 0.5) * 100;
      const radius = 20 + Math.sin(time * 0.5 + i) * 10;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  /**
   * Render an animated element
   */
  private renderElement(element: AnimatedElement, elementTime: number, elementDuration: number) {
    // Calculate animation progress
    const entryProgress = Math.min(1, elementTime / element.animation.entryDuration);
    const timeFromEnd = elementDuration - elementTime;
    const exitProgress = Math.min(1, timeFromEnd / element.animation.exitDuration);
    
    // Apply entry animation
    const entryState = this.calculateEntryAnimation(element.animation.entry, entryProgress);
    
    // Apply exit animation
    const exitState = this.calculateExitAnimation(element.animation.exit, exitProgress);
    
    // Combine states
    const opacity = entryState.opacity * exitState.opacity * (element.style.opacity ?? 1);
    const offsetX = entryState.offsetX + exitState.offsetX;
    const offsetY = entryState.offsetY + exitState.offsetY;
    const scale = entryState.scale * exitState.scale;
    
    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    
    const x = element.position.x + offsetX;
    const y = element.position.y + offsetY;
    
    // Apply scale transform
    if (scale !== 1) {
      this.ctx.translate(x, y);
      this.ctx.scale(scale, scale);
      this.ctx.translate(-x, -y);
    }
    
    // Render based on type
    switch (element.type) {
      case 'text':
      case 'subtitle':
        this.renderText(element, x, y, entryProgress);
        break;
      case 'shape':
        this.renderShape(element, x, y, scale);
        break;
      case 'logo':
        this.renderText(element, x, y, 1);
        break;
    }
    
    this.ctx.restore();
  }

  /**
   * Render text with optional typewriter effect
   */
  private renderText(element: AnimatedElement, x: number, y: number, progress: number) {
    const fontSize = element.style.fontSize || 36;
    const fontFamily = element.style.fontFamily || 'Arial, sans-serif';
    
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.fillStyle = element.style.color || '#ffffff';
    this.ctx.textAlign = (element.style.align || 'center') as CanvasTextAlign;
    this.ctx.textBaseline = 'middle';
    
    let content = element.content;
    
    // Typewriter effect
    if (element.animation.entry === 'typewriter' && progress < 1) {
      const chars = Math.floor(content.length * this.easeOutCubic(progress));
      content = content.substring(0, chars);
      
      // Add cursor
      if (progress < 0.95) {
        content += '|';
      }
    }
    
    // Add text shadow for better readability
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowOffsetX = 2;
    this.ctx.shadowOffsetY = 2;
    
    this.ctx.fillText(content, x, y);
    
    // Reset shadow
    this.ctx.shadowColor = 'transparent';
    this.ctx.shadowBlur = 0;
  }

  /**
   * Render shape element
   */
  private renderShape(element: AnimatedElement, x: number, y: number, scale: number) {
    const width = (element.size?.width || 100) * scale;
    const height = (element.size?.height || 100) * scale;
    const color = element.style.backgroundColor || BRAND_COLORS.accent;
    
    this.ctx.fillStyle = color;
    
    if (element.content === 'button') {
      // Rounded button
      this.roundRect(x, y, width, height, 10);
      this.ctx.fill();
    } else if (element.content === 'line') {
      // Horizontal line
      this.ctx.fillRect(x, y, width, height);
    } else {
      // Default rectangle
      this.ctx.fillRect(x, y, width, height);
    }
  }

  /**
   * Draw rounded rectangle
   */
  private roundRect(x: number, y: number, width: number, height: number, radius: number) {
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + width - radius, y);
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.ctx.lineTo(x + width, y + height - radius);
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.ctx.lineTo(x + radius, y + height);
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
  }

  /**
   * Calculate entry animation state
   */
  private calculateEntryAnimation(type: AnimatedElement['animation']['entry'], progress: number): {
    opacity: number;
    offsetX: number;
    offsetY: number;
    scale: number;
  } {
    const easedProgress = this.easeOutCubic(progress);
    
    switch (type) {
      case 'fade':
        return { opacity: easedProgress, offsetX: 0, offsetY: 0, scale: 1 };
      case 'slideLeft':
        return { opacity: easedProgress, offsetX: (1 - easedProgress) * 100, offsetY: 0, scale: 1 };
      case 'slideRight':
        return { opacity: easedProgress, offsetX: (1 - easedProgress) * -100, offsetY: 0, scale: 1 };
      case 'slideUp':
        return { opacity: easedProgress, offsetX: 0, offsetY: (1 - easedProgress) * 50, scale: 1 };
      case 'slideDown':
        return { opacity: easedProgress, offsetX: 0, offsetY: (1 - easedProgress) * -50, scale: 1 };
      case 'scale':
        return { opacity: easedProgress, offsetX: 0, offsetY: 0, scale: this.easeOutBack(progress) };
      case 'typewriter':
        return { opacity: 1, offsetX: 0, offsetY: 0, scale: 1 };
      case 'none':
      default:
        return { opacity: 1, offsetX: 0, offsetY: 0, scale: 1 };
    }
  }

  /**
   * Calculate exit animation state
   */
  private calculateExitAnimation(type: AnimatedElement['animation']['exit'], progress: number): {
    opacity: number;
    offsetX: number;
    offsetY: number;
    scale: number;
  } {
    const easedProgress = this.easeOutCubic(progress);
    const inverseProgress = 1 - easedProgress;
    
    switch (type) {
      case 'fade':
        return { opacity: easedProgress, offsetX: 0, offsetY: 0, scale: 1 };
      case 'slideLeft':
        return { opacity: easedProgress, offsetX: inverseProgress * -100, offsetY: 0, scale: 1 };
      case 'slideRight':
        return { opacity: easedProgress, offsetX: inverseProgress * 100, offsetY: 0, scale: 1 };
      case 'slideUp':
        return { opacity: easedProgress, offsetX: 0, offsetY: inverseProgress * -50, scale: 1 };
      case 'slideDown':
        return { opacity: easedProgress, offsetX: 0, offsetY: inverseProgress * 50, scale: 1 };
      case 'scale':
        return { opacity: easedProgress, offsetX: 0, offsetY: 0, scale: easedProgress };
      case 'none':
      default:
        return { opacity: 1, offsetX: 0, offsetY: 0, scale: 1 };
    }
  }

  /**
   * Wrap text to specified character width
   */
  private wrapText(text: string, maxChars: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (testLine.length <= maxChars) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Easing functions
  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private waitForFrame(): Promise<void> {
    return new Promise(resolve => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 1000 / this.fps);
      });
    });
  }
}

export const createAnimatedVideoEngine = (canvas: HTMLCanvasElement, platform: Platform = 'youtube') => {
  return new AnimatedVideoEngine(canvas, platform);
};
