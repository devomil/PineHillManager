// Animated Video Engine - Timeline-driven renderer with real animations
// Produces actual animated video with text effects, Ken Burns, transitions, and Lottie animations

import { ParsedScript, ScriptSection, Platform, PLATFORM_SPECS } from './script-pipeline';
import lottie, { AnimationItem } from 'lottie-web';
import { SubtitleStyle } from './subtitle-generator';

// Color grading preset names
export type ColorGradingPresetName = 'natural' | 'cinematic' | 'vibrant' | 'medical' | 'warm' | 'cool';

// Video enhancement options passed from UI
export interface VideoEnhancementOptions {
  useSubtitles: boolean;
  subtitleStyle: SubtitleStyle;
  colorGrading: ColorGradingPresetName;
  useBackgroundMusic: boolean;
  musicMood: 'corporate' | 'uplifting' | 'calm' | 'energetic' | 'medical' | 'inspirational';
  musicVolume: number;
  useSoundEffects: boolean;
  useBroll: boolean;
}

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
  private sectionVideoClips: Map<string, HTMLVideoElement> = new Map();
  private audioBuffer: Blob | null = null;
  private targetDuration: number = 60; // Default 60 seconds
  private enhancementOptions: VideoEnhancementOptions = {
    useSubtitles: true,
    subtitleStyle: 'tiktok',
    colorGrading: 'natural',
    useBackgroundMusic: false,
    musicMood: 'corporate',
    musicVolume: 0.25,
    useSoundEffects: false,
    useBroll: false
  };
  private scriptText: string = ''; // Store original script text for subtitle generation
  private subtitleSegments: { startTime: number; endTime: number; text: string }[] = []; // Cached subtitle segments

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

  setEnhancementOptions(options: Partial<VideoEnhancementOptions>) {
    this.enhancementOptions = { ...this.enhancementOptions, ...options };
    console.log('[VideoEngine] Enhancement options set:', this.enhancementOptions);
  }

  setScriptText(script: string) {
    this.scriptText = script;
    // Pre-compute subtitle segments based on target duration
    this.computeSubtitleSegments();
  }

  /**
   * Pre-compute subtitle segments with timing for efficient rendering
   */
  private computeSubtitleSegments() {
    if (!this.scriptText) {
      this.subtitleSegments = [];
      return;
    }

    // Clean script text
    const cleanScript = this.scriptText
      .replace(/\[(?:SECTION\s*\d+\s*:\s*)?(?:THE\s+)?[^\]]*\]/gi, '')
      .replace(/\*{2,}/g, '')
      .replace(/^##\s+[^\n]+$/gm, '')
      .replace(/\n+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = cleanScript.split(' ').filter(w => w.length > 0);
    if (words.length === 0) {
      this.subtitleSegments = [];
      return;
    }

    // Calculate timing based on target duration and word count
    // 150 words/min = 2.5 words/sec
    const wordsPerSecond = 2.5;
    const segmentWords = 4; // Words per segment
    
    this.subtitleSegments = [];
    
    for (let i = 0; i < words.length; i += segmentWords) {
      const segmentText = words.slice(i, Math.min(i + segmentWords, words.length)).join(' ');
      const startTime = i / wordsPerSecond;
      const endTime = Math.min((i + segmentWords) / wordsPerSecond, this.targetDuration);
      
      this.subtitleSegments.push({
        startTime,
        endTime,
        text: segmentText
      });
    }
    
    console.log(`[VideoEngine] Pre-computed ${this.subtitleSegments.length} subtitle segments`);
  }

  /**
   * Load a video clip for a specific section (e.g., from Runway AI)
   */
  async loadVideoClip(sectionType: string, videoUrl: string): Promise<void> {
    console.log(`[VideoEngine] Loading video clip for ${sectionType}: ${videoUrl.substring(0, 80)}...`);
    
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'auto';
      
      await new Promise<void>((resolve, reject) => {
        video.onloadeddata = async () => {
          console.log(`[VideoEngine] Video clip loaded for ${sectionType} (${video.videoWidth}x${video.videoHeight}, ${video.duration}s)`);
          
          // Start playback so frames update properly
          try {
            await video.play();
            console.log(`[VideoEngine] Video playback started for ${sectionType}`);
          } catch (playError) {
            console.warn(`[VideoEngine] Could not auto-play video for ${sectionType}:`, playError);
          }
          
          this.sectionVideoClips.set(sectionType, video);
          resolve();
        };
        video.onerror = () => {
          console.warn(`[VideoEngine] Failed to load video clip for ${sectionType}`);
          reject(new Error('Failed to load video'));
        };
        video.src = videoUrl;
        video.load();
      });
    } catch (error) {
      console.warn(`[VideoEngine] Video clip loading error for ${sectionType}:`, error);
    }
  }

  /**
   * Load images for sections
   */
  async loadSectionImages(images: { sectionType: string; url: string }[]): Promise<void> {
    console.log(`[VideoEngine] Loading ${images.length} section images...`);
    
    const loadPromises = images.map(async ({ sectionType, url }) => {
      try {
        console.log(`[VideoEngine] Loading image for ${sectionType}: ${url.substring(0, 80)}...`);
        const img = await this.loadImage(url);
        this.sectionImages.set(sectionType, img);
        console.log(`[VideoEngine] Successfully loaded image for ${sectionType} (${img.width}x${img.height})`);
      } catch (error) {
        console.warn(`[VideoEngine] Failed to load image for ${sectionType}:`, error);
      }
    });
    await Promise.all(loadPromises);
    
    console.log(`[VideoEngine] Loaded ${this.sectionImages.size} images into sectionImages map`);
    console.log(`[VideoEngine] Section types with images:`, Array.from(this.sectionImages.keys()));
  }

  private loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Handle data URLs differently - no CORS needed
      if (url.startsWith('data:')) {
        img.onload = () => resolve(img);
        img.onerror = (e) => {
          console.error('Data URL image failed to load:', url.substring(0, 100));
          reject(new Error(`Failed to load data URL image`));
        };
        img.src = url;
        return;
      }
      
      // For external URLs, try with CORS first
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        console.log('Image loaded successfully:', url.substring(0, 60));
        resolve(img);
      };
      
      img.onerror = () => {
        console.warn('CORS image load failed, trying without CORS:', url.substring(0, 60));
        // Try again without CORS (may have canvas taint issues but will at least render)
        const img2 = new Image();
        img2.onload = () => {
          console.log('Image loaded without CORS:', url.substring(0, 60));
          resolve(img2);
        };
        img2.onerror = () => {
          console.error('Image failed to load completely:', url.substring(0, 60));
          reject(new Error(`Failed to load image: ${url}`));
        };
        img2.src = url;
      };
      
      img.src = url;
    });
  }

  /**
   * Build timeline from parsed script
   */
  buildTimeline(parsedScript: ParsedScript): VideoTimeline {
    const sections: VideoSection[] = [];
    
    console.log(`[VideoEngine] Building timeline with ${this.sectionImages.size} loaded images`);
    console.log(`[VideoEngine] Available section images:`, Array.from(this.sectionImages.keys()));
    
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
      const hasImage = !!sectionImage;
      
      console.log(`[VideoEngine] Section ${scriptSection.type}: hasImage=${hasImage}`);
      
      sections.push({
        id: scriptSection.id,
        type: scriptSection.type,
        startTime: scaledStartTime,
        endTime: scaledEndTime,
        background: hasImage ? {
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

    console.log(`[VideoEngine] Timeline built: ${sections.filter(s => s.background.type === 'image').length}/${sections.length} sections with images`);

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
    
    // Render decorative elements
    this.renderDecorativeElements(sectionTime, section.type);
    
    // Render each visible element
    for (const element of section.elements) {
      if (sectionTime >= element.startTime && sectionTime < element.endTime) {
        const elementTime = sectionTime - element.startTime;
        const elementDuration = element.endTime - element.startTime;
        this.renderElement(element, elementTime, elementDuration);
      }
    }
    
    // Render animated border frame
    this.renderAnimatedBorder(sectionTime);
    
    // Apply color grading effect if enabled (not 'natural')
    if (this.enhancementOptions.colorGrading !== 'natural') {
      this.applyColorGrading(section.startTime + sectionTime);
    }
    
    // Render dynamic subtitles if enabled
    if (this.enhancementOptions.useSubtitles && this.scriptText) {
      this.renderDynamicSubtitle(section.startTime + sectionTime);
    }
    
    // Reset alpha
    this.ctx.globalAlpha = 1;
  }

  /**
   * Apply color grading effect to the current canvas
   * Optimized to minimize per-frame overhead
   */
  private applyColorGrading(currentTime: number) {
    const preset = this.enhancementOptions.colorGrading;
    if (preset === 'natural') return; // Skip processing for natural preset
    
    this.ctx.save();
    
    // Apply preset-specific effects with minimal operations
    switch (preset) {
      case 'cinematic':
        // Cool temperature overlay + vignette
        this.ctx.globalCompositeOperation = 'overlay';
        this.ctx.globalAlpha = 0.06;
        this.ctx.fillStyle = '#4A90D9'; // Cool blue-gray tint
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.globalCompositeOperation = 'source-over';
        this.renderVignette(0.35);
        break;
        
      case 'vibrant':
        // Saturation boost via overlay
        this.ctx.globalCompositeOperation = 'saturation';
        this.ctx.globalAlpha = 0.1;
        this.ctx.fillStyle = '#FF6B6B';
        this.ctx.fillRect(0, 0, this.width, this.height);
        break;
        
      case 'medical':
        // Desaturated clean look
        this.ctx.globalCompositeOperation = 'saturation';
        this.ctx.globalAlpha = 0.15;
        this.ctx.fillStyle = '#CCCCCC';
        this.ctx.fillRect(0, 0, this.width, this.height);
        // Slight brightness boost
        this.ctx.globalCompositeOperation = 'overlay';
        this.ctx.globalAlpha = 0.05;
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.width, this.height);
        break;
        
      case 'warm':
        // Warm golden overlay
        this.ctx.globalCompositeOperation = 'overlay';
        this.ctx.globalAlpha = 0.08;
        this.ctx.fillStyle = '#FFB74D';
        this.ctx.fillRect(0, 0, this.width, this.height);
        break;
        
      case 'cool':
        // Cool blue overlay
        this.ctx.globalCompositeOperation = 'overlay';
        this.ctx.globalAlpha = 0.08;
        this.ctx.fillStyle = '#64B5F6';
        this.ctx.fillRect(0, 0, this.width, this.height);
        break;
    }
    
    this.ctx.restore();
  }

  /**
   * Render vignette effect
   */
  private renderVignette(intensity: number) {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, this.height * 0.3,
      this.width / 2, this.height / 2, this.height * 0.9
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
    
    this.ctx.globalCompositeOperation = 'multiply';
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalCompositeOperation = 'source-over';
  }

  /**
   * Render dynamic subtitles based on pre-computed segments
   */
  private renderDynamicSubtitle(currentTime: number) {
    if (this.subtitleSegments.length === 0) return;
    
    const style = this.enhancementOptions.subtitleStyle;
    
    // Find the current segment based on time
    const currentSegment = this.subtitleSegments.find(
      seg => currentTime >= seg.startTime && currentTime < seg.endTime
    );
    
    if (!currentSegment) return;
    
    // Calculate progress within segment for animations
    const segmentProgress = (currentTime - currentSegment.startTime) / 
                           (currentSegment.endTime - currentSegment.startTime);
    
    // Get words from current segment
    const words = currentSegment.text.split(' ');
    const currentWordInSegment = Math.floor(segmentProgress * words.length);
    
    // Render based on style using segment data
    this.renderSubtitleStyle(words, currentWordInSegment, style, currentTime);
  }

  /**
   * Render subtitle with specific style
   */
  private renderSubtitleStyle(words: string[], currentIndex: number, style: SubtitleStyle, time: number) {
    this.ctx.save();
    
    const text = words.join(' ');
    
    switch (style) {
      case 'tiktok':
        this.renderTikTokSubtitle(words, currentIndex, time);
        break;
      case 'karaoke':
        this.renderKaraokeSubtitle(words, currentIndex, time);
        break;
      case 'modern':
        this.renderModernSubtitle(text, time);
        break;
      case 'traditional':
        this.renderTraditionalSubtitle(text);
        break;
      case 'minimal':
      default:
        this.renderMinimalSubtitle(text);
        break;
    }
    
    this.ctx.restore();
  }

  /**
   * TikTok-style word-by-word pop animation
   */
  private renderTikTokSubtitle(words: string[], currentIndex: number, time: number) {
    const fontSize = Math.floor(this.height * 0.06);
    this.ctx.font = `bold ${fontSize}px 'Arial Black', Arial, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const y = this.height * 0.75;
    
    // Calculate total width first for centering
    let totalWidth = 0;
    const wordSpacing = 15;
    words.forEach(word => {
      totalWidth += this.ctx.measureText(word).width + wordSpacing;
    });
    totalWidth -= wordSpacing; // Remove last spacing
    
    let xOffset = -totalWidth / 2;
    const highlightIndex = Math.min(currentIndex, words.length - 1);
    
    words.forEach((word, i) => {
      // Current word pulses and is larger/highlighted
      const isCurrent = i === highlightIndex;
      const pulse = isCurrent ? Math.sin(time * 15) * 0.15 + 1.15 : 1;
      
      const wordWidth = this.ctx.measureText(word).width;
      const wordCenterX = this.width / 2 + xOffset + wordWidth / 2;
      
      this.ctx.save();
      this.ctx.translate(wordCenterX, y);
      this.ctx.scale(pulse, pulse);
      
      // Shadow
      this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
      this.ctx.fillText(word, 3, 3);
      
      // Main text - current word is highlighted yellow
      this.ctx.fillStyle = isCurrent ? '#FFEB3B' : (i < highlightIndex ? '#E0E0E0' : '#FFFFFF');
      this.ctx.fillText(word, 0, 0);
      
      // Outline for visibility
      this.ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeText(word, 0, 0);
      
      this.ctx.restore();
      
      xOffset += wordWidth + wordSpacing;
    });
  }

  /**
   * Karaoke-style highlighted word
   */
  private renderKaraokeSubtitle(words: string[], currentIndex: number, time: number) {
    const fontSize = Math.floor(this.height * 0.045);
    this.ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const y = this.height * 0.8;
    const text = words.join(' ');
    
    // Background box
    const textWidth = this.ctx.measureText(text).width;
    this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
    this.ctx.roundRect(
      this.width / 2 - textWidth / 2 - 20,
      y - fontSize / 2 - 10,
      textWidth + 40,
      fontSize + 20,
      10
    );
    this.ctx.fill();
    
    // Render each word with highlighting based on currentIndex
    let x = this.width / 2 - textWidth / 2;
    const highlightIndex = Math.min(currentIndex, words.length - 1);
    words.forEach((word, i) => {
      // Highlight current word and all previous words (karaoke style - sung words stay highlighted)
      const isHighlighted = i <= highlightIndex;
      this.ctx.fillStyle = isHighlighted ? '#00E676' : '#FFFFFF';
      this.ctx.fillText(word, x + this.ctx.measureText(word).width / 2, y);
      x += this.ctx.measureText(word + ' ').width;
    });
  }

  /**
   * Modern large text with background box
   */
  private renderModernSubtitle(text: string, time: number) {
    const fontSize = Math.floor(this.height * 0.055);
    this.ctx.font = `700 ${fontSize}px 'Segoe UI', Arial, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const y = this.height * 0.75;
    const textWidth = this.ctx.measureText(text).width;
    
    // Animated background box
    const boxPadding = 25;
    const animOffset = Math.sin(time * 3) * 2;
    
    this.ctx.fillStyle = 'rgba(45, 80, 22, 0.85)'; // Pine Hill green
    this.ctx.roundRect(
      this.width / 2 - textWidth / 2 - boxPadding + animOffset,
      y - fontSize / 2 - 15,
      textWidth + boxPadding * 2,
      fontSize + 30,
      8
    );
    this.ctx.fill();
    
    // White text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(text, this.width / 2, y);
  }

  /**
   * Traditional YouTube-style bottom subtitles
   */
  private renderTraditionalSubtitle(text: string) {
    const fontSize = Math.floor(this.height * 0.04);
    this.ctx.font = `500 ${fontSize}px Arial, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    
    const y = this.height - 50;
    
    // Semi-transparent background
    const textWidth = this.ctx.measureText(text).width;
    this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
    this.ctx.fillRect(
      this.width / 2 - textWidth / 2 - 15,
      y - fontSize - 5,
      textWidth + 30,
      fontSize + 10
    );
    
    // Yellow text (classic CC style)
    this.ctx.fillStyle = '#FFEB3B';
    this.ctx.fillText(text, this.width / 2, y);
  }

  /**
   * Minimal clean text with shadow
   */
  private renderMinimalSubtitle(text: string) {
    const fontSize = Math.floor(this.height * 0.05);
    this.ctx.font = `600 ${fontSize}px Arial, sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const y = this.height * 0.82;
    
    // Shadow
    this.ctx.fillStyle = 'rgba(0,0,0,0.6)';
    this.ctx.fillText(text, this.width / 2 + 2, y + 2);
    
    // Main text
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillText(text, this.width / 2, y);
  }

  /**
   * Render background with optional animation and Ken Burns for images
   */
  private renderBackground(background: VideoSection['background'], time: number, sectionType: string, sectionDuration: number) {
    // Check if we have a video clip for this section (highest priority)
    const sectionVideo = this.sectionVideoClips.get(sectionType);
    
    if (sectionVideo && sectionVideo.readyState >= 2) {
      // Render video frame
      this.renderVideoFrame(sectionVideo, time, sectionDuration);
      
      // Add semi-transparent overlay for better text readability
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      this.ctx.fillRect(0, 0, this.width, this.height);
      return;
    }
    
    // Check if we have an image for this section
    const sectionImage = this.sectionImages.get(sectionType);
    
    if (sectionImage && sectionImage.complete && sectionImage.naturalWidth > 0) {
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
   * Render a frame from a video clip with cover scaling
   * Video should already be playing (loop mode), so we just draw the current frame
   */
  private renderVideoFrame(video: HTMLVideoElement, time: number, sectionDuration: number) {
    // Calculate dimensions to cover canvas (same aspect ratio logic as Ken Burns)
    const videoAspect = video.videoWidth / video.videoHeight;
    const canvasAspect = this.width / this.height;
    
    let drawWidth: number, drawHeight: number;
    
    if (videoAspect > canvasAspect) {
      drawHeight = this.height;
      drawWidth = drawHeight * videoAspect;
    } else {
      drawWidth = this.width;
      drawHeight = drawWidth / videoAspect;
    }
    
    // Center the video frame
    const x = (this.width - drawWidth) / 2;
    const y = (this.height - drawHeight) / 2;
    
    // Draw the current playing frame (video is looping in background)
    this.ctx.drawImage(video, x, y, drawWidth, drawHeight);
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
   * Render decorative visual elements based on section type
   */
  private renderDecorativeElements(time: number, sectionType: string) {
    this.ctx.save();
    
    // Animated corner accents
    this.renderCornerAccents(time, sectionType);
    
    // Floating decorative shapes for visual interest
    this.renderFloatingShapes(time, sectionType);
    
    this.ctx.restore();
  }

  /**
   * Render animated corner accents
   */
  private renderCornerAccents(time: number, sectionType: string) {
    const accentColor = this.getSectionAccentColor(sectionType);
    const pulseScale = 1 + Math.sin(time * 2) * 0.1;
    const cornerSize = 60 * pulseScale;
    
    this.ctx.strokeStyle = accentColor;
    this.ctx.lineWidth = 3;
    this.ctx.globalAlpha = 0.7;
    
    // Top-left corner
    this.ctx.beginPath();
    this.ctx.moveTo(30, 30 + cornerSize);
    this.ctx.lineTo(30, 30);
    this.ctx.lineTo(30 + cornerSize, 30);
    this.ctx.stroke();
    
    // Top-right corner
    this.ctx.beginPath();
    this.ctx.moveTo(this.width - 30 - cornerSize, 30);
    this.ctx.lineTo(this.width - 30, 30);
    this.ctx.lineTo(this.width - 30, 30 + cornerSize);
    this.ctx.stroke();
    
    // Bottom-left corner
    this.ctx.beginPath();
    this.ctx.moveTo(30, this.height - 30 - cornerSize);
    this.ctx.lineTo(30, this.height - 30);
    this.ctx.lineTo(30 + cornerSize, this.height - 30);
    this.ctx.stroke();
    
    // Bottom-right corner
    this.ctx.beginPath();
    this.ctx.moveTo(this.width - 30 - cornerSize, this.height - 30);
    this.ctx.lineTo(this.width - 30, this.height - 30);
    this.ctx.lineTo(this.width - 30, this.height - 30 - cornerSize);
    this.ctx.stroke();
  }

  /**
   * Render floating decorative shapes
   */
  private renderFloatingShapes(time: number, sectionType: string) {
    const accentColor = this.getSectionAccentColor(sectionType);
    this.ctx.globalAlpha = 0.15;
    
    // Floating circles in corners
    for (let i = 0; i < 4; i++) {
      const angle = time * 0.5 + i * (Math.PI / 2);
      const radius = 40 + Math.sin(time * 0.8 + i) * 15;
      
      const baseX = i % 2 === 0 ? 100 : this.width - 100;
      const baseY = i < 2 ? 150 : this.height - 150;
      
      const x = baseX + Math.cos(angle) * 20;
      const y = baseY + Math.sin(angle) * 20;
      
      this.ctx.beginPath();
      this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = accentColor;
      this.ctx.fill();
    }
    
    // Small diamond shapes
    for (let i = 0; i < 3; i++) {
      const x = this.width * (0.2 + i * 0.3) + Math.sin(time + i) * 30;
      const y = this.height - 80 + Math.cos(time * 0.7 + i) * 15;
      const size = 10 + Math.sin(time * 1.5 + i) * 3;
      
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(Math.PI / 4 + time * 0.2);
      this.ctx.fillStyle = BRAND_COLORS.accent;
      this.ctx.fillRect(-size / 2, -size / 2, size, size);
      this.ctx.restore();
    }
  }

  /**
   * Render animated border frame
   */
  private renderAnimatedBorder(time: number) {
    this.ctx.save();
    
    const borderWidth = 4;
    const inset = 15;
    
    // Animated gradient border
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    const hueShift = (time * 20) % 360;
    gradient.addColorStop(0, `hsla(${140 + hueShift * 0.1}, 60%, 40%, 0.6)`);
    gradient.addColorStop(0.5, `hsla(${140 + hueShift * 0.1 + 30}, 50%, 50%, 0.4)`);
    gradient.addColorStop(1, `hsla(${140 + hueShift * 0.1}, 60%, 40%, 0.6)`);
    
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = borderWidth;
    
    // Draw rounded rectangle border
    const radius = 20;
    this.ctx.beginPath();
    this.ctx.moveTo(inset + radius, inset);
    this.ctx.lineTo(this.width - inset - radius, inset);
    this.ctx.quadraticCurveTo(this.width - inset, inset, this.width - inset, inset + radius);
    this.ctx.lineTo(this.width - inset, this.height - inset - radius);
    this.ctx.quadraticCurveTo(this.width - inset, this.height - inset, this.width - inset - radius, this.height - inset);
    this.ctx.lineTo(inset + radius, this.height - inset);
    this.ctx.quadraticCurveTo(inset, this.height - inset, inset, this.height - inset - radius);
    this.ctx.lineTo(inset, inset + radius);
    this.ctx.quadraticCurveTo(inset, inset, inset + radius, inset);
    this.ctx.closePath();
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  /**
   * Get accent color for section type
   */
  private getSectionAccentColor(sectionType: string): string {
    const colors: Record<string, string> = {
      hook: BRAND_COLORS.accent,
      problem: '#ff8a65',
      solution: '#ffeb3b',
      social_proof: '#4fc3f7',
      cta: '#ffeb3b'
    };
    return colors[sectionType] || BRAND_COLORS.accent;
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
