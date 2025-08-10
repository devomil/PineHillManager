// Real video file generation using canvas and FFmpeg
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

export interface VideoConfig {
  productName: string;
  productDescription: string;
  productImages: File[];
  duration: number; // in seconds
  style: 'professional' | 'modern' | 'elegant';
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  voiceScript?: string;
}

export interface VideoScene {
  duration: number; // seconds for this scene
  backgroundColor: string;
  productImage?: HTMLImageElement;
  imageX: number;
  imageY: number;
  imageWidth: number;
  imageHeight: number;
  text: string;
  textX: number;
  textY: number;
  fontSize: number;
  fontFamily: string;
  textColor: string;
  animation?: 'slideIn' | 'fadeIn' | 'zoom';
}

export class VideoGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private frames: string[] = [];
  private readonly fps = 30;
  private readonly width = 1920;
  private readonly height = 1080;

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

  private async generateFrame(scene: VideoScene, frameNumber: number, totalFrames: number): Promise<string> {
    // Clear canvas with background
    this.ctx.fillStyle = scene.backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Animation progress (0 to 1)
    const progress = frameNumber / totalFrames;

    // Draw product image with animation
    if (scene.productImage) {
      let x = scene.imageX;
      let y = scene.imageY;
      let width = scene.imageWidth;
      let height = scene.imageHeight;

      // Apply animations
      if (scene.animation === 'slideIn') {
        x = scene.imageX - (1 - progress) * 200;
      } else if (scene.animation === 'zoom') {
        const scale = 0.5 + (progress * 0.5);
        width *= scale;
        height *= scale;
        x += (scene.imageWidth - width) / 2;
        y += (scene.imageHeight - height) / 2;
      } else if (scene.animation === 'fadeIn') {
        this.ctx.globalAlpha = progress;
      }

      this.ctx.drawImage(scene.productImage, x, y, width, height);
      this.ctx.globalAlpha = 1; // Reset alpha
    }

    // Draw text with animation
    if (scene.text) {
      this.ctx.font = `${scene.fontSize}px ${scene.fontFamily}`;
      this.ctx.fillStyle = scene.textColor;
      this.ctx.textAlign = 'left';
      
      let textX = scene.textX;
      let textY = scene.textY;

      // Apply text animations
      if (scene.animation === 'slideIn') {
        textX = scene.textX - (1 - progress) * 300;
      } else if (scene.animation === 'fadeIn') {
        this.ctx.globalAlpha = progress;
      }

      // Word wrap for long text
      const words = scene.text.split(' ');
      const lineHeight = scene.fontSize * 1.2;
      let line = '';
      let yPos = textY;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = this.ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > 600 && n > 0) {
          this.ctx.fillText(line, textX, yPos);
          line = words[n] + ' ';
          yPos += lineHeight;
        } else {
          line = testLine;
        }
      }
      this.ctx.fillText(line, textX, yPos);
      this.ctx.globalAlpha = 1; // Reset alpha
    }

    return this.canvas.toDataURL('image/png');
  }

  private createScenes(config: VideoConfig, productImages: HTMLImageElement[]): VideoScene[] {
    const scenes: VideoScene[] = [];
    const sceneDuration = config.duration / Math.max(productImages.length, 3);

    // Scene 1: Product introduction
    scenes.push({
      duration: sceneDuration,
      backgroundColor: config.backgroundColor,
      productImage: productImages[0],
      imageX: 960 - 300, // Center horizontally
      imageY: 200,
      imageWidth: 600,
      imageHeight: 600,
      text: config.productName,
      textX: 100,
      textY: 150,
      fontSize: config.fontSize * 1.5,
      fontFamily: 'Great Vibes, cursive',
      textColor: config.textColor,
      animation: 'slideIn'
    });

    // Scene 2: Product description
    if (productImages.length > 1) {
      scenes.push({
        duration: sceneDuration,
        backgroundColor: config.backgroundColor,
        productImage: productImages[1],
        imageX: 100,
        imageY: 150,
        imageWidth: 500,
        imageHeight: 500,
        text: config.productDescription,
        textX: 700,
        textY: 300,
        fontSize: config.fontSize,
        fontFamily: 'Arial, sans-serif',
        textColor: config.textColor,
        animation: 'fadeIn'
      });
    }

    // Scene 3: Call to action
    scenes.push({
      duration: sceneDuration,
      backgroundColor: config.backgroundColor,
      productImage: productImages[productImages.length - 1] || productImages[0],
      imageX: 960 - 250, // Center
      imageY: 100,
      imageWidth: 500,
      imageHeight: 500,
      text: `Experience ${config.productName} - Pine Hill Farm Quality`,
      textX: 960 - 400, // Center text
      textY: 700,
      fontSize: config.fontSize * 1.2,
      fontFamily: 'Arial, sans-serif',
      textColor: config.textColor,
      animation: 'zoom'
    });

    return scenes;
  }

  public async generateVideo(config: VideoConfig): Promise<Blob> {
    this.frames = [];
    
    // Load all product images
    const productImages = await Promise.all(
      config.productImages.map(file => this.loadImage(file))
    );

    // Create scenes
    const scenes = this.createScenes(config, productImages);

    // Generate frames for each scene
    for (const scene of scenes) {
      const framesForScene = Math.floor(scene.duration * this.fps);
      
      for (let frame = 0; frame < framesForScene; frame++) {
        const frameData = await this.generateFrame(scene, frame, framesForScene);
        this.frames.push(frameData);
      }
    }

    // Convert frames to video using FFmpeg
    return await this.framesToVideo();
  }

  private async framesToVideo(): Promise<Blob> {
    const ffmpeg = new FFmpeg();
    
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    // Write frames to FFmpeg filesystem
    for (let i = 0; i < this.frames.length; i++) {
      const frameBlob = await fetch(this.frames[i]).then(r => r.blob());
      await ffmpeg.writeFile(`frame${i.toString().padStart(4, '0')}.png`, await fetchFile(frameBlob));
    }

    // Generate video from frames
    await ffmpeg.exec([
      '-framerate', this.fps.toString(),
      '-i', 'frame%04d.png',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-t', (this.frames.length / this.fps).toString(),
      'output.mp4'
    ]);

    // Get the generated video
    const data = await ffmpeg.readFile('output.mp4');
    return new Blob([data], { type: 'video/mp4' });
  }
}

export class ProductVideoCreator {
  private videoGenerator = new VideoGenerator();

  async createVideo(config: VideoConfig, onProgress?: (progress: number) => void): Promise<{
    videoBlob: Blob;
    downloadUrl: string;
    fileName: string;
  }> {
    onProgress?.(10); // Starting
    
    const videoBlob = await this.videoGenerator.generateVideo(config);
    
    onProgress?.(90); // Almost done
    
    const downloadUrl = URL.createObjectURL(videoBlob);
    const fileName = `${config.productName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-video-${Date.now()}.mp4`;
    
    onProgress?.(100); // Complete
    
    return {
      videoBlob,
      downloadUrl,
      fileName
    };
  }
}