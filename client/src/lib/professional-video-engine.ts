// Professional Video Engine - Pure Canvas Implementation

interface VideoElement {
  type: 'text' | 'shape' | 'icon' | 'product' | 'chart' | 'animation';
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  fontSize?: number;
  animation: {
    type: 'slideInLeft' | 'fadeIn' | 'scaleIn' | 'typewriter' | 'slideInRight' | 'bounceIn' | 'zoomIn';
    delay: number;
    duration: number;
  };
  style?: any;
}

interface ProfessionalScene {
  name: string;
  duration: number;
  background: {
    type: 'gradient' | 'medical' | 'corporate' | 'clean';
    colors: string[];
  };
  elements: VideoElement[];
}

export class ProfessionalVideoEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 1920;
  private height = 1080;
  private fps = 30;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = canvas.getContext('2d')!;
    
    // Set high-quality rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.textRenderingOptimization = 'optimizeQuality';
  }

  async generateProfessionalExplainerVideo(config: any): Promise<Blob> {
    console.log("Starting professional explainer video generation...");
    
    // Create 5 professional animated scenes
    const scenes = this.createProfessionalScenes(config);
    
    // Set up MediaRecorder with optimal settings
    const stream = this.canvas.captureStream(this.fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp8',
      videoBitsPerSecond: 5000000
    });

    const chunks: Blob[] = [];
    
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        console.log("Professional video complete, size:", chunks.length, "chunks");
        resolve(new Blob(chunks, { type: 'video/webm' }));
      };

      mediaRecorder.onerror = reject;

      console.log("Starting professional video recording...");
      mediaRecorder.start(100);
      
      // Animate all scenes with smooth transitions
      this.animateProfessionalScenes(scenes, mediaRecorder);
    });
  }

  private createProfessionalScenes(config: any): ProfessionalScene[] {
    return [
      {
        name: 'problem_hook',
        duration: 6,
        background: { type: 'gradient', colors: ['#1e40af', '#3b82f6'] },
        elements: [
          {
            type: 'text',
            content: 'Are You Struggling With Menopause Symptoms?',
            x: 960,
            y: 300,
            fontSize: 64,
            color: '#ffffff',
            animation: { type: 'slideInLeft', delay: 0, duration: 1000 }
          },
          {
            type: 'shape',
            x: 200,
            y: 500,
            width: 400,
            height: 300,
            animation: { type: 'fadeIn', delay: 500, duration: 800 }
          },
          {
            type: 'icon',
            content: 'medical-cross',
            x: 1600,
            y: 200,
            animation: { type: 'bounceIn', delay: 1000, duration: 600 }
          },
          {
            type: 'text',
            content: '• Hot Flashes • Night Sweats • Mood Changes',
            x: 960,
            y: 500,
            fontSize: 36,
            color: '#f1f5f9',
            animation: { type: 'typewriter', delay: 1500, duration: 2000 }
          }
        ]
      },
      {
        name: 'solution_intro',
        duration: 8,
        background: { type: 'clean', colors: ['#f8fafc', '#e2e8f0'] },
        elements: [
          {
            type: 'product',
            x: 400,
            y: 540,
            width: 300,
            height: 400,
            animation: { type: 'slideInRight', delay: 0, duration: 1200 }
          },
          {
            type: 'text',
            content: 'Introducing Black Cohosh Extract Plus',
            x: 1200,
            y: 400,
            fontSize: 48,
            color: '#1e293b',
            animation: { type: 'fadeIn', delay: 800, duration: 1000 }
          },
          {
            type: 'text',
            content: 'Clinically Proven Natural Solution',
            x: 1200,
            y: 500,
            fontSize: 32,
            color: '#059669',
            animation: { type: 'fadeIn', delay: 1200, duration: 800 }
          },
          {
            type: 'shape',
            x: 800,
            y: 300,
            width: 800,
            height: 4,
            color: '#3b82f6',
            animation: { type: 'scaleIn', delay: 1500, duration: 600 }
          }
        ]
      },
      {
        name: 'benefits_showcase',
        duration: 8,
        background: { type: 'medical', colors: ['#ffffff', '#f0f9ff'] },
        elements: [
          {
            type: 'text',
            content: 'Proven Benefits',
            x: 960,
            y: 150,
            fontSize: 56,
            color: '#1e40af',
            animation: { type: 'zoomIn', delay: 0, duration: 800 }
          },
          {
            type: 'chart',
            x: 200,
            y: 300,
            width: 600,
            height: 400,
            animation: { type: 'slideInLeft', delay: 500, duration: 1000 }
          },
          {
            type: 'text',
            content: '✓ Reduces Hot Flashes by 75%',
            x: 1200,
            y: 350,
            fontSize: 32,
            color: '#059669',
            animation: { type: 'fadeIn', delay: 1000, duration: 600 }
          },
          {
            type: 'text',
            content: '✓ Improves Sleep Quality',
            x: 1200,
            y: 420,
            fontSize: 32,
            color: '#059669',
            animation: { type: 'fadeIn', delay: 1400, duration: 600 }
          },
          {
            type: 'text',
            content: '✓ Balances Mood Naturally',
            x: 1200,
            y: 490,
            fontSize: 32,
            color: '#059669',
            animation: { type: 'fadeIn', delay: 1800, duration: 600 }
          },
          {
            type: 'text',
            content: '✓ Supports Bone Health',
            x: 1200,
            y: 560,
            fontSize: 32,
            color: '#059669',
            animation: { type: 'fadeIn', delay: 2200, duration: 600 }
          }
        ]
      },
      {
        name: 'how_it_works',
        duration: 6,
        background: { type: 'corporate', colors: ['#f1f5f9', '#e2e8f0'] },
        elements: [
          {
            type: 'text',
            content: 'How It Works',
            x: 960,
            y: 150,
            fontSize: 56,
            color: '#1e293b',
            animation: { type: 'fadeIn', delay: 0, duration: 800 }
          },
          {
            type: 'animation',
            content: 'process-flow',
            x: 960,
            y: 500,
            animation: { type: 'slideInLeft', delay: 500, duration: 1500 }
          }
        ]
      },
      {
        name: 'call_to_action',
        duration: 2,
        background: { type: 'gradient', colors: ['#dc2626', '#ef4444'] },
        elements: [
          {
            type: 'text',
            content: 'Order Now - Limited Time!',
            x: 960,
            y: 400,
            fontSize: 64,
            color: '#ffffff',
            animation: { type: 'zoomIn', delay: 0, duration: 800 }
          },
          {
            type: 'text',
            content: '50% OFF + FREE SHIPPING',
            x: 960,
            y: 500,
            fontSize: 42,
            color: '#fef3c7',
            animation: { type: 'bounceIn', delay: 400, duration: 600 }
          },
          {
            type: 'text',
            content: 'Call 1-800-HEALTH Today!',
            x: 960,
            y: 600,
            fontSize: 36,
            color: '#ffffff',
            animation: { type: 'fadeIn', delay: 800, duration: 600 }
          }
        ]
      }
    ];
  }

  private async animateProfessionalScenes(scenes: ProfessionalScene[], mediaRecorder: MediaRecorder) {
    let totalFrameCount = 0;
    const totalFrames = scenes.reduce((acc, scene) => acc + (scene.duration * this.fps), 0);
    
    console.log(`Animating ${scenes.length} professional scenes (${totalFrames} frames total)`);

    for (const scene of scenes) {
      const sceneFrames = scene.duration * this.fps;
      
      for (let frame = 0; frame < sceneFrames; frame++) {
        const sceneProgress = frame / sceneFrames;
        const sceneTimeMs = (frame / this.fps) * 1000;
        
        // Clear and render scene
        await this.renderProfessionalScene(scene, sceneProgress, sceneTimeMs);
        
        // Wait for next frame
        await this.waitForFrame();
        totalFrameCount++;
      }
    }

    console.log(`Animation complete: ${totalFrameCount} frames rendered`);
    setTimeout(() => mediaRecorder.stop(), 500);
  }

  private async renderProfessionalScene(scene: ProfessionalScene, progress: number, timeMs: number) {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Render professional background
    this.renderProfessionalBackground(scene.background);
    
    // Render animated elements
    for (const element of scene.elements) {
      if (this.shouldElementBeVisible(element, timeMs)) {
        await this.renderAnimatedElement(element, progress, timeMs);
      }
    }
  }

  private renderProfessionalBackground(background: any) {
    switch (background.type) {
      case 'gradient':
        this.renderGradientBackground(background.colors);
        break;
      case 'medical':
        this.createMedicalBackground();
        break;
      case 'corporate':
        this.createCorporateBackground();
        break;
      default:
        this.ctx.fillStyle = background.colors[0];
        this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private renderGradientBackground(colors: string[]) {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, colors[0]);
    gradient.addColorStop(1, colors[1]);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private createMedicalBackground() {
    // White background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.width, this.height);
    
    // Add medical pattern elements (subtle crosses)
    this.ctx.fillStyle = 'rgba(226, 232, 240, 0.3)';
    
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      
      // Draw cross pattern
      this.ctx.fillRect(x - 20, y - 4, 40, 8);
      this.ctx.fillRect(x - 4, y - 20, 8, 40);
    }
  }

  private createCorporateBackground() {
    // Create radial gradient
    const gradient = this.ctx.createRadialGradient(
      this.width/2, this.height/2, 0,
      this.width/2, this.height/2, this.width/2
    );
    gradient.addColorStop(0, '#f8fafc');
    gradient.addColorStop(1, '#e2e8f0');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private shouldElementBeVisible(element: VideoElement, timeMs: number): boolean {
    return timeMs >= element.animation.delay;
  }

  private async renderAnimatedElement(element: VideoElement, sceneProgress: number, timeMs: number) {
    const elementProgress = this.calculateElementProgress(element, timeMs);
    
    switch (element.type) {
      case 'text':
        this.renderAnimatedText(element, elementProgress);
        break;
      case 'product':
        await this.renderProductImage(element, elementProgress);
        break;
      case 'chart':
        this.renderAnimatedChart(element, elementProgress);
        break;
      case 'animation':
        this.renderProcessFlow(element, elementProgress);
        break;
      case 'shape':
        this.renderAnimatedShape(element, elementProgress);
        break;
      case 'icon':
        this.renderAnimatedIcon(element, elementProgress);
        break;
    }
  }

  private calculateElementProgress(element: VideoElement, timeMs: number): number {
    if (timeMs < element.animation.delay) return 0;
    if (timeMs >= element.animation.delay + element.animation.duration) return 1;
    
    const elapsed = timeMs - element.animation.delay;
    return elapsed / element.animation.duration;
  }

  private renderAnimatedText(element: VideoElement, progress: number) {
    if (progress <= 0) return;

    let displayText = element.content || '';
    let opacity = progress;
    let scale = 1;
    let left = element.x;
    let top = element.y;

    // Apply animation effects
    switch (element.animation.type) {
      case 'slideInLeft':
        left = element.x - (200 * (1 - this.easeOutCubic(progress)));
        opacity = progress;
        break;
      case 'typewriter':
        const chars = Math.floor(progress * displayText.length);
        displayText = displayText.substring(0, chars) + (progress < 1 ? '|' : '');
        break;
      case 'zoomIn':
        scale = this.easeOutBack(progress);
        opacity = progress;
        break;
      case 'bounceIn':
        scale = this.easeOutBounce(progress);
        opacity = progress;
        break;
    }

    // Save context for transformations
    this.ctx.save();
    
    // Apply opacity
    this.ctx.globalAlpha = opacity;
    
    // Apply scale transformation
    this.ctx.translate(left, top);
    this.ctx.scale(scale, scale);
    
    // Text styling
    this.ctx.font = `bold ${element.fontSize || 32}px Arial, sans-serif`;
    this.ctx.fillStyle = element.color || '#ffffff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    // Add shadow for better visibility
    this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
    this.ctx.shadowBlur = 10;
    this.ctx.shadowOffsetX = 3;
    this.ctx.shadowOffsetY = 3;
    
    // Draw text
    this.ctx.fillText(displayText, 0, 0);
    
    // Restore context
    this.ctx.restore();
  }

  private async renderProductImage(element: VideoElement, progress: number) {
    if (progress <= 0) return;

    let left = element.x;
    let opacity = progress;
    let scale = 1;

    switch (element.animation.type) {
      case 'slideInRight':
        left = element.x + (200 * (1 - this.easeOutCubic(progress)));
        break;
      case 'scaleIn':
        scale = this.easeOutBack(progress);
        break;
    }

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    
    // Transform for scaling
    this.ctx.translate(left, element.y);
    this.ctx.scale(scale, scale);
    
    // Draw shadow first
    this.ctx.shadowColor = 'rgba(0,0,0,0.3)';
    this.ctx.shadowBlur = 15;
    this.ctx.shadowOffsetX = 5;
    this.ctx.shadowOffsetY = 5;
    
    // Draw product bottle shape
    const width = element.width || 200;
    const height = element.height || 300;
    const radius = 20;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.strokeStyle = '#1e40af';
    this.ctx.lineWidth = 3;
    
    // Rounded rectangle for bottle
    this.ctx.beginPath();
    this.ctx.moveTo(radius, 0);
    this.ctx.lineTo(width - radius, 0);
    this.ctx.quadraticCurveTo(width, 0, width, radius);
    this.ctx.lineTo(width, height - radius);
    this.ctx.quadraticCurveTo(width, height, width - radius, height);
    this.ctx.lineTo(radius, height);
    this.ctx.quadraticCurveTo(0, height, 0, height - radius);
    this.ctx.lineTo(0, radius);
    this.ctx.quadraticCurveTo(0, 0, radius, 0);
    this.ctx.closePath();
    
    this.ctx.fill();
    this.ctx.stroke();
    
    // Reset shadow for text
    this.ctx.shadowBlur = 0;
    this.ctx.shadowOffsetX = 0;
    this.ctx.shadowOffsetY = 0;
    
    // Draw product label
    this.ctx.fillStyle = '#1e40af';
    this.ctx.font = 'bold 24px Arial, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    this.ctx.fillText('Black Cohosh', width/2, 60);
    this.ctx.fillText('Extract Plus', width/2, 95);
    
    this.ctx.restore();
  }

  private renderAnimatedChart(element: VideoElement, progress: number) {
    if (progress <= 0) return;

    // Create animated bar chart
    const bars = [
      { label: 'Hot Flashes', value: 75, color: '#ef4444' },
      { label: 'Sleep Quality', value: 85, color: '#3b82f6' },
      { label: 'Mood Balance', value: 70, color: '#059669' }
    ];

    this.ctx.save();
    this.ctx.globalAlpha = progress;

    bars.forEach((bar, index) => {
      const barHeight = (bar.value / 100) * 300 * progress;
      const barY = element.y + 300 - barHeight;
      const barX = element.x + (index * 150);

      // Draw bar
      this.ctx.fillStyle = bar.color;
      this.ctx.fillRect(barX, barY, 100, barHeight);
      
      // Draw label
      this.ctx.fillStyle = '#1e293b';
      this.ctx.font = '16px Arial, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(bar.label, barX + 50, element.y + 340);
      
      // Draw value
      this.ctx.font = 'bold 20px Arial, sans-serif';
      this.ctx.fillText(`${Math.floor(bar.value * progress)}%`, barX + 50, barY - 15);
    });

    this.ctx.restore();
  }

  private renderProcessFlow(element: VideoElement, progress: number) {
    const steps = ['Take Daily', 'Absorbs Fast', 'Feel Results'];
    
    steps.forEach((step, index) => {
      const stepProgress = Math.max(0, (progress - (index * 0.3)) / 0.3);
      if (stepProgress <= 0) return;

      const x = element.x - 400 + (index * 300);
      const y = element.y;
      const scale = this.easeOutBack(stepProgress);

      this.ctx.save();
      this.ctx.globalAlpha = stepProgress;
      
      // Transform for scaling
      this.ctx.translate(x, y);
      this.ctx.scale(scale, scale);

      // Draw circle
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 60, 0, 2 * Math.PI);
      this.ctx.fillStyle = '#1e40af';
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 4;
      this.ctx.stroke();

      // Draw step number
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 36px Arial, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText((index + 1).toString(), 0, 0);

      this.ctx.restore();

      // Draw step label (no scaling)
      this.ctx.save();
      this.ctx.globalAlpha = stepProgress;
      this.ctx.fillStyle = '#1e293b';
      this.ctx.font = 'bold 22px Arial, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(step, x, y + 100);
      this.ctx.restore();

      // Draw arrow
      if (index < steps.length - 1) {
        this.ctx.save();
        this.ctx.globalAlpha = stepProgress;
        this.ctx.fillStyle = '#64748b';
        
        this.ctx.translate(x + 120, y);
        this.ctx.beginPath();
        this.ctx.moveTo(0, -15);
        this.ctx.lineTo(30, 0);
        this.ctx.lineTo(0, 15);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.restore();
      }
    });
  }

  private renderAnimatedShape(element: VideoElement, progress: number) {
    if (progress <= 0) return;

    const scale = this.easeOutCubic(progress);
    
    this.ctx.save();
    this.ctx.globalAlpha = progress;
    this.ctx.translate(element.x, element.y);
    this.ctx.scale(scale, scale);
    
    this.ctx.fillStyle = element.color || '#3b82f6';
    this.ctx.fillRect(0, 0, element.width || 100, element.height || 100);
    
    this.ctx.restore();
  }

  private renderAnimatedIcon(element: VideoElement, progress: number) {
    if (progress <= 0) return;

    const scale = this.easeOutBounce(progress);
    
    this.ctx.save();
    this.ctx.globalAlpha = progress;
    this.ctx.translate(element.x, element.y);
    this.ctx.scale(scale, scale);
    
    // Draw medical cross
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(-30, -6, 60, 12);  // horizontal bar
    this.ctx.fillRect(-6, -30, 12, 60);  // vertical bar
    
    this.ctx.restore();
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeOutBounce(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  }

  private waitForFrame(): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, 1000 / this.fps);
    });
  }
}