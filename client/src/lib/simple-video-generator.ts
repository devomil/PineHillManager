// Simplified video generation using MediaRecorder API
export interface VideoConfig {
  productName: string;
  productDescription: string;
  productImages: File[];
  duration: number;
  style: 'professional' | 'modern' | 'elegant';
  backgroundColor: string;
  textColor: string;
  fontSize: number;
}

interface VideoScene {
  duration: number;
  backgroundColor: string;
  productImage?: HTMLImageElement;
  text: string;
  animation: 'slideIn' | 'fadeIn' | 'zoom';
}

export class SimpleVideoGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private readonly fps = 30;
  private readonly width = 1280;
  private readonly height = 720;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext('2d')!;
  }

  private async loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  private createScenes(config: VideoConfig, productImages: HTMLImageElement[]): VideoScene[] {
    const sceneDuration = config.duration / 3;

    return [
      {
        duration: sceneDuration,
        backgroundColor: config.backgroundColor,
        productImage: productImages[0],
        text: config.productName,
        animation: 'slideIn'
      },
      {
        duration: sceneDuration,
        backgroundColor: config.backgroundColor,
        productImage: productImages[1] || productImages[0],
        text: config.productDescription,
        animation: 'fadeIn'
      },
      {
        duration: sceneDuration,
        backgroundColor: config.backgroundColor,
        productImage: productImages[productImages.length - 1] || productImages[0],
        text: `Experience ${config.productName} - Pine Hill Farm Quality`,
        animation: 'zoom'
      }
    ];
  }

  private drawScene(scene: VideoScene, progress: number, config: VideoConfig) {
    // Clear canvas with background
    this.ctx.fillStyle = scene.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw product image with animation
    if (scene.productImage) {
      let x = this.width / 2 - 200;
      let y = 100;
      let width = 400;
      let height = 400;

      // Apply animations
      if (scene.animation === 'slideIn') {
        x = (this.width / 2 - 200) - (1 - progress) * 300;
      } else if (scene.animation === 'zoom') {
        const scale = 0.7 + (progress * 0.3);
        width *= scale;
        height *= scale;
        x = this.width / 2 - width / 2;
        y = 50 + (400 - height) / 2;
      } else if (scene.animation === 'fadeIn') {
        this.ctx.globalAlpha = progress;
      }

      this.ctx.drawImage(scene.productImage, x, y, width, height);
      this.ctx.globalAlpha = 1;
    }

    // Draw text
    if (scene.text) {
      this.ctx.font = `${config.fontSize}px Great Vibes, cursive`;
      this.ctx.fillStyle = config.textColor;
      this.ctx.textAlign = 'center';
      
      let textY = 550;
      
      if (scene.animation === 'slideIn') {
        this.ctx.globalAlpha = progress;
      } else if (scene.animation === 'fadeIn') {
        this.ctx.globalAlpha = progress;
      }

      // Word wrap
      const words = scene.text.split(' ');
      const lineHeight = config.fontSize * 1.2;
      let line = '';
      let lines: string[] = [];

      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = this.ctx.measureText(testLine);
        
        if (metrics.width > 800 && line.length > 0) {
          lines.push(line.trim());
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line.trim());

      // Draw each line
      lines.forEach((textLine, index) => {
        this.ctx.fillText(textLine, this.width / 2, textY + (index * lineHeight));
      });
      
      this.ctx.globalAlpha = 1;
    }
  }

  public async generateVideo(config: VideoConfig): Promise<Blob> {
    // Load all product images
    const productImages = await Promise.all(
      config.productImages.map(file => this.loadImage(file))
    );

    // Create scenes
    const scenes = this.createScenes(config, productImages);

    // Set up MediaRecorder
    const stream = this.canvas.captureStream(this.fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2500000
    });

    const chunks: Blob[] = [];
    
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };

      mediaRecorder.onerror = (event) => {
        reject(new Error('MediaRecorder error'));
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      // Animate scenes
      let currentTime = 0;
      const totalDuration = config.duration * 1000; // Convert to milliseconds

      const animate = () => {
        if (currentTime >= totalDuration) {
          mediaRecorder.stop();
          return;
        }

        // Determine current scene
        let sceneStartTime = 0;
        let currentScene = scenes[0];
        
        for (const scene of scenes) {
          const sceneEndTime = sceneStartTime + (scene.duration * 1000);
          if (currentTime >= sceneStartTime && currentTime < sceneEndTime) {
            currentScene = scene;
            const sceneProgress = (currentTime - sceneStartTime) / (scene.duration * 1000);
            this.drawScene(scene, sceneProgress, config);
            break;
          }
          sceneStartTime = sceneEndTime;
        }

        currentTime += 1000 / this.fps; // Advance by one frame
        requestAnimationFrame(animate);
      };

      animate();
    });
  }
}

export class ProductVideoCreator {
  private videoGenerator = new SimpleVideoGenerator();

  async createVideo(config: VideoConfig, onProgress?: (progress: number) => void): Promise<{
    videoBlob: Blob;
    downloadUrl: string;
    fileName: string;
  }> {
    onProgress?.(10); // Starting
    
    const videoBlob = await this.videoGenerator.generateVideo(config);
    
    onProgress?.(90); // Almost done
    
    const downloadUrl = URL.createObjectURL(videoBlob);
    const fileName = `${config.productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-video-${Date.now()}.webm`;
    
    onProgress?.(100); // Complete
    
    return {
      videoBlob,
      downloadUrl,
      fileName
    };
  }
}