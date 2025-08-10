// Phase 2: Import content generation capabilities
import { ContentGenerator, GeneratedContent } from './content-generator';

// Professional Animated Marketing Video Generator
export interface VideoConfig {
  productName: string;
  productDescription: string;
  productImages: File[];
  duration: number;
  style: 'pharmaceutical' | 'medical' | 'clinical';
  healthConcern: string;
  benefits: string[];
  ingredients: string[];
  callToAction: string;
}

interface VideoScene {
  type: 'problem_statement' | 'product_reveal' | 'how_it_works' | 'benefits_showcase' | 'ingredients' | 'call_to_action';
  duration: number;
  background: {
    type: 'gradient' | 'solid' | 'medical_office';
    colors?: string[];
    color?: string;
  };
  elements: VideoElement[];
}

interface VideoElement {
  type: 'animated_text' | 'product_image' | 'icon' | 'infographic' | 'benefit_list' | 'ingredient_grid' | 'cta_button';
  text?: string;
  image?: HTMLImageElement;
  animation: string;
  position: { x: number | 'center', y: number };
  fontSize?: number;
  color?: string;
  delay?: number;
  items?: string[];
}

export class SimpleVideoGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly fps = 30;
  private readonly width = 1920;  // HD resolution as per Phase 1 requirements
  private readonly height = 1080; // HD resolution as per Phase 1 requirements
  private contentGenerator: ContentGenerator; // Phase 2: Content generation

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;
    this.contentGenerator = new ContentGenerator(); // Phase 2: Initialize content generator
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private async createProfessionalScenes(config: VideoConfig, productImages: HTMLImageElement[], generatedContent?: GeneratedContent): Promise<VideoScene[]> {
    // PHASE 1: Force 30-second minimum duration (900 frames at 30fps)
    const MINIMUM_DURATION = 30; // Never less than 30 seconds
    const FRAME_COUNT = MINIMUM_DURATION * this.fps; // 900 frames minimum
    const totalDuration = MINIMUM_DURATION;
    
    return [
      // Scene 1: Problem Hook (0-6 seconds) 
      {
        type: 'problem_statement',
        duration: 6,
        background: {
          type: 'gradient',
          colors: ['#1e40af', '#3b82f6']
        },
        elements: [
          {
            type: 'animated_text',
            text: generatedContent?.problemStatement || `Struggling with ${config.healthConcern}?`,
            animation: 'fadeInUp',
            position: { x: 'center', y: 200 },
            fontSize: 48,
            color: '#ffffff',
            delay: 0
          },
          {
            type: 'icon',
            animation: 'pulse',
            position: { x: 'center', y: 400 },
            delay: 1000
          }
        ]
      },
      
      // Scene 2: Product Introduction (6-14 seconds) - Extended for more professional pacing
      {
        type: 'product_reveal', 
        duration: 8,
        background: {
          type: 'solid',
          color: '#f8fafc'
        },
        elements: [
          {
            type: 'product_image',
            image: productImages[0],
            animation: 'slideInRight',
            position: { x: 300, y: 200 }
          },
          {
            type: 'animated_text',
            text: generatedContent?.productIntroduction || `Introducing ${config.productName}`,
            animation: 'typewriter',
            position: { x: 800, y: 300 },
            fontSize: 42,
            color: '#1e293b',
            delay: 1000
          },
          {
            type: 'benefit_list',
            items: generatedContent?.enhancedBenefits?.slice(0, 3) || config.benefits.slice(0, 3),
            animation: 'cascadeIn',
            position: { x: 800, y: 400 },
            delay: 3000
          }
        ]
      },
      
      // Scene 3: Benefits Showcase (14-22 seconds) 
      {
        type: 'benefits_showcase',
        duration: 8,
        background: {
          type: 'solid',
          color: '#ffffff'
        },
        elements: [
          {
            type: 'animated_text',
            text: 'Proven Benefits',
            animation: 'fadeIn',
            position: { x: 'center', y: 100 },
            fontSize: 42,
            color: '#166534'
          },
          {
            type: 'benefit_list',
            items: generatedContent?.enhancedBenefits || config.benefits,
            animation: 'cascadeIn', 
            position: { x: 'center', y: 300 },
            delay: 1000
          }
        ]
      },
      
      // Scene 4: How It Works (22-26 seconds)
      {
        type: 'how_it_works',
        duration: 4,
        background: {
          type: 'solid', 
          color: '#ffffff'
        },
        elements: [
          {
            type: 'animated_text',
            text: 'How It Works',
            animation: 'fadeIn',
            position: { x: 'center', y: 120 },
            fontSize: 36,
            color: '#1e293b'
          },
          {
            type: 'infographic',
            animation: 'slideInUp',
            position: { x: 'center', y: 400 },
            delay: 800
          }
        ]
      },
      
      // Scene 5: Call to Action (26-30 seconds)
      {
        type: 'call_to_action',
        duration: 4,
        background: {
          type: 'gradient',
          colors: ['#1e40af', '#1e293b']
        },
        elements: [
          {
            type: 'product_image',
            image: productImages[productImages.length - 1] || productImages[0],
            animation: 'glowEffect',
            position: { x: 'center', y: 280 }
          },
          {
            type: 'animated_text',
            text: generatedContent?.callToAction || config.callToAction || 'Order Now - Limited Time Offer',
            animation: 'pulsingGlow',
            position: { x: 'center', y: 480 },
            fontSize: 40,
            color: '#ffffff',
            delay: 1000
          },
          {
            type: 'cta_button',
            text: 'Get Yours Today',
            animation: 'pulse',
            position: { x: 'center', y: 620 },
            delay: 2000
          }
        ]
      }
    ];
  }

  private async drawProfessionalScene(scene: VideoScene, progress: number, totalTime: number) {
    // Render professional background
    await this.renderBackground(scene.background);
    
    // Render each animated element
    for (const element of scene.elements) {
      const elementProgress = this.calculateElementProgress(element, progress, totalTime);
      await this.renderAnimatedElement(element, elementProgress);
    }
  }

  private async renderBackground(background: VideoScene['background']) {
    if (background.type === 'gradient' && background.colors) {
      const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
      gradient.addColorStop(0, background.colors[0]);
      gradient.addColorStop(1, background.colors[1]);
      this.ctx.fillStyle = gradient;
    } else {
      this.ctx.fillStyle = background.color || '#ffffff';
    }
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private calculateElementProgress(element: VideoElement, sceneProgress: number, totalTime: number): number {
    const delay = (element.delay || 0) / 1000; // Convert to seconds
    const adjustedProgress = Math.max(0, sceneProgress - delay);
    // Professional slower animations (no speed multiplier)
    return Math.min(adjustedProgress * 1.2, 1); // Slightly slower, more professional pacing
  }

  private async renderAnimatedElement(element: VideoElement, progress: number) {
    this.ctx.save();
    
    const x = element.position.x === 'center' ? this.width / 2 : element.position.x;
    const y = element.position.y;

    switch (element.type) {
      case 'animated_text':
        await this.renderAnimatedText(element, x, y, progress);
        break;
      case 'product_image':
        await this.renderAnimatedProductImage(element, x, y, progress);
        break;
      case 'icon':
        await this.renderAnimatedIcon(element, x, y, progress);
        break;
      case 'infographic':
        await this.renderInfographic(element, x, y, progress);
        break;
      case 'benefit_list':
        await this.renderBenefitList(element, x, y, progress);
        break;
      case 'ingredient_grid':
        await this.renderIngredientGrid(element, x, y, progress);
        break;
      case 'cta_button':
        await this.renderCTAButton(element, x, y, progress);
        break;
    }

    this.ctx.restore();
  }

  private async renderAnimatedText(element: VideoElement, x: number, y: number, progress: number) {
    if (progress <= 0) return;

    const text = element.text || '';
    const fontSize = element.fontSize || 42;
    const color = element.color || '#ffffff';

    // Professional easing for text animations
    const easedProgress = this.easeOutQuart(progress);
    let opacity = easedProgress;
    let translateY = 0;
    let displayText = text;

    switch (element.animation) {
      case 'fadeInUp':
        opacity = progress;
        translateY = (1 - progress) * 50;
        break;
      case 'typewriter':
        const chars = Math.floor(progress * text.length);
        displayText = text.substring(0, chars) + (progress < 1 ? '|' : '');
        break;
      case 'fadeIn':
        opacity = progress;
        break;
      case 'pulsingGlow':
        opacity = 0.9 + (Math.sin(progress * Math.PI * 6) * 0.1);
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = 30 * progress;
        break;
      case 'slideInRight':
        const translateX = (1 - this.easeOutBack(progress)) * 200;
        x = x - translateX;
        break;
    }

    // Set text properties with better visibility
    this.ctx.globalAlpha = opacity;
    this.ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif`;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';

    // Enhanced text shadow for maximum visibility
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    this.ctx.shadowBlur = 6;
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 3;

    // Add text stroke for better contrast
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.lineWidth = 3;

    // Draw text with stroke and fill for maximum visibility
    this.ctx.strokeText(displayText, x, y - translateY);
    this.ctx.fillText(displayText, x, y - translateY);

    // Reset shadow
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
  }

  private async renderAnimatedProductImage(element: VideoElement, x: number, y: number, progress: number) {
    if (!element.image || progress <= 0) return;

    let translateX = 0;
    let scale = 1;
    let opacity = 1;

    switch (element.animation) {
      case 'slideInRight':
        const easeOut = 1 - Math.pow(1 - progress, 3);
        translateX = (1 - easeOut) * 200;
        break;
      case 'glowEffect':
        scale = 0.9 + (Math.sin(progress * Math.PI * 4) * 0.1);
        this.ctx.shadowColor = '#3b82f6';
        this.ctx.shadowBlur = 30 * progress;
        break;
      case 'fadeIn':
        opacity = progress;
        break;
    }

    this.ctx.globalAlpha = opacity;
    const width = 300 * scale;
    const height = 300 * scale;
    this.ctx.drawImage(
      element.image,
      x - width / 2 + translateX,
      y - height / 2,
      width,
      height
    );
  }

  private async renderInfographic(element: VideoElement, x: number, y: number, progress: number) {
    if (progress <= 0) return;

    // Draw 3-step infographic
    const steps = [
      { icon: '💊', text: 'Take Daily', color: '#ef4444' },
      { icon: '⚡', text: 'Absorbs Quickly', color: '#f97316' },
      { icon: '✨', text: 'Feel Results', color: '#22c55e' }
    ];

    const stepWidth = 200;
    const totalWidth = (steps.length - 1) * stepWidth;
    const startX = x - totalWidth / 2;

    steps.forEach((step, index) => {
      const stepProgress = Math.max(0, Math.min(1, (progress - index * 0.3) / 0.3));
      if (stepProgress <= 0) return;

      const stepX = startX + (index * stepWidth);
      const stepY = y;

      // Draw step circle
      this.ctx.globalAlpha = stepProgress;
      this.ctx.fillStyle = step.color;
      this.ctx.beginPath();
      this.ctx.arc(stepX, stepY, 40 * stepProgress, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw step icon
      this.ctx.font = '30px Arial';
      this.ctx.fillStyle = '#ffffff';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(step.icon, stepX, stepY + 10);

      // Draw step text
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillStyle = '#1e293b';
      this.ctx.fillText(step.text, stepX, stepY + 70);

      // Draw connecting arrow
      if (index < steps.length - 1) {
        this.ctx.strokeStyle = '#94a3b8';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(stepX + 40, stepY);
        this.ctx.lineTo(stepX + stepWidth - 40, stepY);
        this.ctx.stroke();
        
        // Arrow head
        this.ctx.beginPath();
        this.ctx.moveTo(stepX + stepWidth - 50, stepY - 10);
        this.ctx.lineTo(stepX + stepWidth - 40, stepY);
        this.ctx.lineTo(stepX + stepWidth - 50, stepY + 10);
        this.ctx.stroke();
      }
    });
  }

  private async renderBenefitList(element: VideoElement, x: number, y: number, progress: number) {
    if (!element.items || progress <= 0) return;

    const itemHeight = 40;
    const startY = y - (element.items.length * itemHeight) / 2;

    element.items.forEach((benefit, index) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - index * 0.2) / 0.5));
      if (itemProgress <= 0) return;

      const itemY = startY + (index * itemHeight);
      
      // Animate in from left
      const translateX = (1 - itemProgress) * -100;
      this.ctx.globalAlpha = itemProgress;

      // Draw checkmark
      this.ctx.fillStyle = '#22c55e';
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('✓', x - 300 + translateX, itemY);

      // Draw benefit text
      this.ctx.fillStyle = '#1e293b';
      this.ctx.font = 'bold 18px Arial';
      this.ctx.fillText(benefit, x - 270 + translateX, itemY);
    });
  }

  private drawWrappedText(text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line.length > 0) {
        this.ctx.fillText(line.trim(), x, currentY);
        line = word + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line.trim(), x, currentY);
  }

  public async generateProfessionalVideo(config: VideoConfig): Promise<Blob> {
    console.log("Starting professional video generation...");
    
    // Phase 2: Generate professional marketing content
    const generatedContent = await this.contentGenerator.generateProfessionalContent(config);
    console.log("Generated content complete");
    
    // Load all product images
    const productImages = await Promise.all(
      config.productImages.map(file => this.loadImage(file))
    );
    console.log("Product images loaded:", productImages.length);

    // Create professional animated scenes with generated content
    const scenes = await this.createProfessionalScenes(config, productImages, generatedContent);
    const totalDuration = scenes.reduce((acc, scene) => acc + scene.duration, 0);
    console.log("Created scenes:", scenes.length, "total duration:", totalDuration, "seconds");

    // PHASE 1: Set up MediaRecorder with HD quality (1920x1080) 
    const stream = this.canvas.captureStream(this.fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 8000000 // Higher bitrate for HD quality
    });

    const chunks: Blob[] = [];
    
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log("Recording stopped, creating blob from", chunks.length, "chunks");
        const blob = new Blob(chunks, { type: 'video/webm' });
        console.log("Video blob created, size:", blob.size, "bytes");
        resolve(blob);
      };

      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
        reject(new Error('Professional video generation error'));
      };

      console.log("Starting MediaRecorder...");
      // Start recording with frequent data collection
      mediaRecorder.start(100);

      // Professional animation sequence with proper timing
      this.animateProfessionalScenes(scenes, mediaRecorder);
    });
  }

  private async animateProfessionalScenes(scenes: VideoScene[], mediaRecorder: MediaRecorder) {
    let currentTime = 0;
    const frameTime = 1000 / this.fps; // 33.33ms per frame at 30fps
    const totalDurationMs = scenes.reduce((acc, scene) => acc + scene.duration * 1000, 0);
    
    console.log(`Starting animation sequence: ${totalDurationMs}ms total (${totalDurationMs/1000}s)`);
    
    const animate = async () => {
      // Calculate which scene we're in
      let sceneStartTime = 0;
      let currentScene: VideoScene | null = null;
      let sceneProgress = 0;

      for (const scene of scenes) {
        const sceneEndTime = sceneStartTime + (scene.duration * 1000);
        if (currentTime >= sceneStartTime && currentTime < sceneEndTime) {
          currentScene = scene;
          sceneProgress = (currentTime - sceneStartTime) / (scene.duration * 1000);
          break;
        }
        sceneStartTime = sceneEndTime;
      }

      if (currentScene) {
        // Professional slow transitions (1.5 seconds)
        const transitionProgress = 0.75; // Start transition at 75% through scene
        if (sceneProgress > transitionProgress) {
          // Professional 1.5-second fade transition with easing
          const fadeProgress = (sceneProgress - transitionProgress) / (1 - transitionProgress);
          const easedFade = this.easeInOutCubic(fadeProgress);
          this.ctx.globalAlpha = 1 - (easedFade * 0.3); // Subtle fade for professional look
        }
        
        await this.drawProfessionalScene(currentScene, sceneProgress, currentTime / 1000);
        
        this.ctx.globalAlpha = 1;
      } else {
        // Fill with default background if no scene (shouldn't happen)
        this.ctx.fillStyle = '#f8fafc';
        this.ctx.fillRect(0, 0, this.width, this.height);
      }

      currentTime += frameTime;

      // Check if video is complete - add a small buffer to ensure we capture the full duration
      if (currentTime >= totalDurationMs + 100) {
        console.log(`Animation complete at ${currentTime}ms, stopping recorder`);
        // Add a small delay before stopping to ensure all frames are captured
        setTimeout(() => {
          mediaRecorder.stop();
        }, 200);
        return;
      }

      // Continue animation
      requestAnimationFrame(animate);
    };

    // Start the animation
    animate();
  }

  // Professional easing function for smooth transitions
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  // Professional ease out for element animations
  private easeOutQuart(t: number): number {
    return 1 - (--t) * t * t * t;
  }

  // Professional bounce effect for slide animations
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private async renderAnimatedIcon(element: VideoElement, x: number, y: number, progress: number) {
    if (progress <= 0) return;

    // Draw pulsing health concern icon
    const radius = 40 + (Math.sin(progress * Math.PI * 4) * 5);
    
    this.ctx.globalAlpha = 0.3 + (progress * 0.7);
    this.ctx.fillStyle = '#ef4444';
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw warning symbol
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 30px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('⚠', x, y + 10);
  }

  private async renderIngredientGrid(element: VideoElement, x: number, y: number, progress: number) {
    if (!element.items || progress <= 0) return;

    const gridSize = Math.ceil(Math.sqrt(element.items.length));
    const cellSize = 100;
    const spacing = 120;
    const startX = x - ((gridSize - 1) * spacing) / 2;
    const startY = y - ((gridSize - 1) * spacing) / 2;

    element.items.forEach((ingredient, index) => {
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      const itemX = startX + (col * spacing);
      const itemY = startY + (row * spacing);
      
      const itemProgress = Math.max(0, Math.min(1, (progress - index * 0.1) / 0.3));
      if (itemProgress <= 0) return;

      // Molecular animation effect
      const rotation = progress * 360 + (index * 45);
      const scale = 0.8 + (Math.sin(progress * Math.PI * 2 + index) * 0.2);

      this.ctx.save();
      this.ctx.translate(itemX, itemY);
      this.ctx.rotate((rotation * Math.PI) / 180);
      this.ctx.scale(scale, scale);
      this.ctx.globalAlpha = itemProgress;

      // Draw ingredient molecule
      this.ctx.fillStyle = '#3b82f6';
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 25, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw ingredient name
      this.ctx.restore();
      this.ctx.globalAlpha = itemProgress;
      this.ctx.fillStyle = '#1e293b';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(ingredient.substring(0, 8), itemX, itemY + 50);
    });
  }

  private async renderCTAButton(element: VideoElement, x: number, y: number, progress: number) {
    if (progress <= 0) return;

    const buttonWidth = 300;
    const buttonHeight = 60;
    const pulse = 1 + (Math.sin(progress * Math.PI * 8) * 0.1);

    // Draw pulsing button
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.scale(pulse, pulse);
    this.ctx.globalAlpha = progress;

    // Button background with glow
    this.ctx.shadowColor = '#3b82f6';
    this.ctx.shadowBlur = 20;
    this.ctx.fillStyle = '#3b82f6';
    this.ctx.fillRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight);

    // Button text
    this.ctx.shadowBlur = 0;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(element.text || 'Get Yours Today', 0, 0);

    this.ctx.restore();
  }
}

export class ProductVideoCreator {
  private videoGenerator = new SimpleVideoGenerator();

  async createVideo(config: VideoConfig, onProgress?: (progress: number) => void): Promise<{
    videoBlob: Blob;
    downloadUrl: string;
    fileName: string;
  }> {
    onProgress?.(10); // Starting professional video generation
    
    const videoBlob = await this.videoGenerator.generateProfessionalVideo(config);
    
    onProgress?.(90); // Professional animations complete
    
    const downloadUrl = URL.createObjectURL(videoBlob);
    const fileName = `${config.productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-professional-video-${Date.now()}.webm`;
    
    onProgress?.(100); // Professional marketing video ready
    
    return {
      videoBlob,
      downloadUrl,
      fileName
    };
  }
}