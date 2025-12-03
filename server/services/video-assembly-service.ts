import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as https from 'https';
import * as http from 'http';

const execAsync = promisify(exec);
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);
const readFileAsync = promisify(fs.readFile);

export interface VideoScene {
  id: number;
  imageUrl?: string;
  videoUrl?: string;
  duration: number; // in seconds
  transition?: 'fade' | 'dissolve' | 'wipe' | 'zoom' | 'none';
  transitionDuration?: number; // in seconds
  text?: string;
  textPosition?: 'top' | 'center' | 'bottom';
  kenBurnsEffect?: boolean;
}

export interface AudioTrack {
  url: string;
  type: 'music' | 'voiceover' | 'sfx';
  startTime?: number; // When to start in the final video
  volume?: number; // 0-100
  fadeIn?: number; // seconds
  fadeOut?: number; // seconds
}

export interface WatermarkConfig {
  url: string;
  placement: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number; // 0-1
  size: number; // percentage of video width (5-30)
}

export interface VideoAssemblyConfig {
  scenes: VideoScene[];
  audioTracks?: AudioTrack[];
  outputResolution?: string; // e.g., '1920x1080'
  outputFps?: number;
  title?: string;
  watermark?: WatermarkConfig;
  backgroundColor?: string;
}

export interface AssemblyProgress {
  phase: 'preparing' | 'downloading' | 'processing' | 'encoding' | 'finalizing';
  progress: number; // 0-100
  message: string;
  currentScene?: number;
  totalScenes?: number;
}

export interface AssemblyResult {
  success: boolean;
  outputPath?: string;
  duration?: number;
  fileSize?: number;
  error?: string;
}

class VideoAssemblyService {
  private tempDir: string;
  private progressCallback?: (progress: AssemblyProgress) => void;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'video-assembly');
  }

  private async ensureTempDir(): Promise<string> {
    const sessionDir = path.join(this.tempDir, `session_${Date.now()}`);
    await mkdirAsync(sessionDir, { recursive: true });
    return sessionDir;
  }

  private async downloadFile(url: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(outputPath);
      
      protocol.get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(outputPath);
            this.downloadFile(redirectUrl, outputPath).then(resolve).catch(reject);
            return;
          }
        }
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        fs.unlinkSync(outputPath);
        reject(err);
      });
    });
  }

  private async checkFfmpeg(): Promise<boolean> {
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch {
      return false;
    }
  }

  private updateProgress(progress: AssemblyProgress): void {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }

  async assembleVideo(
    config: VideoAssemblyConfig,
    onProgress?: (progress: AssemblyProgress) => void
  ): Promise<AssemblyResult> {
    this.progressCallback = onProgress;
    
    const hasFfmpeg = await this.checkFfmpeg();
    if (!hasFfmpeg) {
      return { success: false, error: 'FFmpeg not available' };
    }

    const workDir = await this.ensureTempDir();
    const outputPath = path.join(workDir, 'output.mp4');
    const resolution = config.outputResolution || '1920x1080';
    const [width, height] = resolution.split('x').map(Number);
    const fps = config.outputFps || 30;

    try {
      this.updateProgress({
        phase: 'preparing',
        progress: 0,
        message: 'Preparing video assembly...',
        totalScenes: config.scenes.length
      });

      // Download all scene assets
      this.updateProgress({
        phase: 'downloading',
        progress: 5,
        message: 'Downloading scene assets...',
        totalScenes: config.scenes.length
      });

      const scenePaths: string[] = [];
      for (let i = 0; i < config.scenes.length; i++) {
        const scene = config.scenes[i];
        const assetUrl = scene.videoUrl || scene.imageUrl;
        
        if (!assetUrl) continue;

        this.updateProgress({
          phase: 'downloading',
          progress: 5 + Math.floor((i / config.scenes.length) * 20),
          message: `Downloading scene ${i + 1}/${config.scenes.length}...`,
          currentScene: i + 1,
          totalScenes: config.scenes.length
        });

        const ext = scene.videoUrl ? '.mp4' : '.jpg';
        const scenePath = path.join(workDir, `scene_${i}${ext}`);
        
        try {
          await this.downloadFile(assetUrl, scenePath);
          scenePaths.push(scenePath);
        } catch (err) {
          console.error(`Failed to download scene ${i}:`, err);
          // Create a placeholder for failed downloads
          scenePaths.push('');
        }
      }

      // Download audio tracks
      const audioPaths: { path: string; track: AudioTrack }[] = [];
      if (config.audioTracks && config.audioTracks.length > 0) {
        this.updateProgress({
          phase: 'downloading',
          progress: 25,
          message: 'Downloading audio tracks...'
        });

        for (let i = 0; i < config.audioTracks.length; i++) {
          const track = config.audioTracks[i];
          if (!track.url) continue; // Skip empty URLs
          
          const isVideoSource = track.url.includes('.mp4') || track.url.includes('pexels.com');
          const downloadExt = isVideoSource ? '.mp4' : '.mp3';
          const downloadPath = path.join(workDir, `audio_${i}_${track.type}_raw${downloadExt}`);
          const audioPath = path.join(workDir, `audio_${i}_${track.type}.mp3`);
          
          try {
            await this.downloadFile(track.url, downloadPath);
            
            if (isVideoSource) {
              // Extract audio from video file
              try {
                await execAsync(
                  `ffmpeg -y -i "${downloadPath}" -vn -acodec libmp3lame -ar 44100 -ab 128k "${audioPath}"`
                );
                audioPaths.push({ path: audioPath, track });
              } catch (extractErr) {
                console.error(`Failed to extract audio from ${downloadPath}:`, extractErr);
              }
            } else {
              // Direct audio file
              await execAsync(`cp "${downloadPath}" "${audioPath}"`);
              audioPaths.push({ path: audioPath, track });
            }
          } catch (err) {
            console.error(`Failed to download audio ${i}:`, err);
          }
        }
      }

      // Process scenes - create video clips from images with Ken Burns effect
      this.updateProgress({
        phase: 'processing',
        progress: 30,
        message: 'Processing scene clips...'
      });

      const processedClips: string[] = [];
      for (let i = 0; i < config.scenes.length; i++) {
        const scene = config.scenes[i];
        const sourcePath = scenePaths[i];
        
        if (!sourcePath || !fs.existsSync(sourcePath)) {
          // Create a black frame for missing scenes
          const blackPath = path.join(workDir, `black_${i}.mp4`);
          await execAsync(
            `ffmpeg -y -f lavfi -i color=black:s=${width}x${height}:d=${scene.duration} -c:v libx264 -preset ultrafast "${blackPath}"`
          );
          processedClips.push(blackPath);
          continue;
        }

        this.updateProgress({
          phase: 'processing',
          progress: 30 + Math.floor((i / config.scenes.length) * 30),
          message: `Processing scene ${i + 1}/${config.scenes.length}...`,
          currentScene: i + 1,
          totalScenes: config.scenes.length
        });

        const clipPath = path.join(workDir, `clip_${i}.mp4`);
        const isImage = !scene.videoUrl;

        // Build text overlay filter if scene has text
        let textFilter = '';
        if (scene.text && scene.text.trim()) {
          const escapedText = scene.text.replace(/'/g, "\\'").replace(/:/g, "\\:");
          const yPosition = scene.textPosition === 'top' ? 'h*0.08' : 
                           scene.textPosition === 'center' ? '(h-text_h)/2' : 'h*0.85';
          textFilter = `,drawtext=text='${escapedText}':fontcolor=white:fontsize=48:borderw=3:bordercolor=black:x=(w-text_w)/2:y=${yPosition}`;
        }

        if (isImage) {
          // Convert image to video with Ken Burns effect (zoom and pan)
          const zoomFactor = scene.kenBurnsEffect !== false ? 1.04 : 1;
          const zoomFilter = scene.kenBurnsEffect !== false
            ? `zoompan=z='min(zoom+0.0005,${zoomFactor})':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${scene.duration * fps}:s=${width}x${height}:fps=${fps}${textFilter}`
            : `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2${textFilter}`;

          await execAsync(
            `ffmpeg -y -loop 1 -i "${sourcePath}" -vf "${zoomFilter}" -t ${scene.duration} -c:v libx264 -pix_fmt yuv420p -preset medium "${clipPath}"`
          );
        } else {
          // Process video clip - scale and trim with optional text overlay
          const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2${textFilter}`;
          await execAsync(
            `ffmpeg -y -i "${sourcePath}" -vf "${videoFilter}" -t ${scene.duration} -c:v libx264 -preset medium "${clipPath}"`
          );
        }

        processedClips.push(clipPath);
      }

      // Create concat file
      this.updateProgress({
        phase: 'encoding',
        progress: 60,
        message: 'Assembling video sequence...'
      });

      const concatFilePath = path.join(workDir, 'concat.txt');
      const concatContent = processedClips.map(p => `file '${p}'`).join('\n');
      await writeFileAsync(concatFilePath, concatContent);

      // Concatenate clips with crossfade transitions
      const rawVideoPath = path.join(workDir, 'raw_video.mp4');
      
      if (processedClips.length === 1) {
        // Single clip, just copy
        await execAsync(`ffmpeg -y -i "${processedClips[0]}" -c copy "${rawVideoPath}"`);
      } else if (processedClips.length > 1) {
        // Apply crossfade transitions between clips
        const transitionDuration = 0.5; // Default transition duration
        let filterComplex = '';
        let lastOutput = '[0:v]';
        
        for (let i = 1; i < processedClips.length; i++) {
          const offset = config.scenes.slice(0, i).reduce((sum, s) => sum + s.duration, 0) - (transitionDuration * i);
          const nextInput = `[${i}:v]`;
          const outputLabel = i === processedClips.length - 1 ? '[outv]' : `[v${i}]`;
          
          filterComplex += `${lastOutput}${nextInput}xfade=transition=fade:duration=${transitionDuration}:offset=${Math.max(0, offset)}${outputLabel}`;
          if (i < processedClips.length - 1) filterComplex += ';';
          lastOutput = outputLabel;
        }

        const inputArgs = processedClips.map(p => `-i "${p}"`).join(' ');
        
        try {
          await execAsync(
            `ffmpeg -y ${inputArgs} -filter_complex "${filterComplex}" -map "[outv]" -c:v libx264 -preset medium "${rawVideoPath}"`
          );
        } catch (err) {
          // Fallback to simple concatenation without transitions
          console.error('Transition failed, using simple concat:', err);
          await execAsync(
            `ffmpeg -y -f concat -safe 0 -i "${concatFilePath}" -c:v libx264 -preset medium "${rawVideoPath}"`
          );
        }
      }

      // Add audio tracks
      this.updateProgress({
        phase: 'encoding',
        progress: 75,
        message: 'Mixing audio tracks...'
      });

      let finalVideoPath = rawVideoPath;

      if (audioPaths.length > 0) {
        const audioMixPath = path.join(workDir, 'with_audio.mp4');
        
        // Build audio filter for mixing multiple tracks
        const audioInputs = audioPaths.map((a, i) => `-i "${a.path}"`).join(' ');
        const audioFilters = audioPaths.map((a, i) => {
          const vol = (a.track.volume || 80) / 100;
          let filter = `[${i + 1}:a]volume=${vol}`;
          if (a.track.fadeIn) filter += `,afade=t=in:d=${a.track.fadeIn}`;
          if (a.track.fadeOut) filter += `,afade=t=out:d=${a.track.fadeOut}`;
          return `${filter}[a${i}]`;
        }).join(';');
        
        const amixInputs = audioPaths.map((_, i) => `[a${i}]`).join('');
        const mixFilter = `${audioFilters};${amixInputs}amix=inputs=${audioPaths.length}:duration=first[aout]`;

        try {
          await execAsync(
            `ffmpeg -y -i "${rawVideoPath}" ${audioInputs} -filter_complex "${mixFilter}" -map 0:v -map "[aout]" -c:v copy -c:a aac -shortest "${audioMixPath}"`
          );
          finalVideoPath = audioMixPath;
        } catch (err) {
          console.error('Audio mixing failed:', err);
          // Try with just the first audio track
          if (audioPaths.length > 0) {
            try {
              await execAsync(
                `ffmpeg -y -i "${rawVideoPath}" -i "${audioPaths[0].path}" -c:v copy -c:a aac -shortest "${audioMixPath}"`
              );
              finalVideoPath = audioMixPath;
            } catch (innerErr) {
              console.error('Fallback audio failed too:', innerErr);
            }
          }
        }
      }

      // Apply watermark if configured
      if (config.watermark && config.watermark.url) {
        this.updateProgress({
          phase: 'finalizing',
          progress: 85,
          message: 'Adding watermark...'
        });

        let watermarkPath = path.join(workDir, 'watermark.png');
        try {
          // Check if watermark URL is a local file path or a URL
          if (config.watermark.url.startsWith('/') || config.watermark.url.includes(':\\')) {
            // Local file path - copy it
            if (fs.existsSync(config.watermark.url)) {
              await execAsync(`cp "${config.watermark.url}" "${watermarkPath}"`);
              console.log('[VideoAssembly] Using local watermark file:', config.watermark.url);
            } else {
              console.error('[VideoAssembly] Watermark file not found:', config.watermark.url);
              watermarkPath = ''; // Skip watermark
            }
          } else {
            // Remote URL - download it
            await this.downloadFile(config.watermark.url, watermarkPath);
          }
          
          if (fs.existsSync(watermarkPath)) {
            const watermarkedPath = path.join(workDir, 'watermarked.mp4');
            
            // Calculate watermark size and position
            const wmSize = Math.round((config.watermark.size || 15) / 100 * width);
            const opacity = config.watermark.opacity || 0.8;
            
            // Position mapping
            let overlayPosition = '';
            switch (config.watermark.placement) {
              case 'top-left':
                overlayPosition = `x=20:y=20`;
                break;
              case 'top-right':
                overlayPosition = `x=W-w-20:y=20`;
                break;
              case 'bottom-left':
                overlayPosition = `x=20:y=H-h-20`;
                break;
              case 'bottom-right':
                overlayPosition = `x=W-w-20:y=H-h-20`;
                break;
              case 'center':
                overlayPosition = `x=(W-w)/2:y=(H-h)/2`;
                break;
              default:
                overlayPosition = `x=W-w-20:y=H-h-20`; // Default to bottom-right
            }
            
            const watermarkFilter = `[1:v]scale=${wmSize}:-1,format=rgba,colorchannelmixer=aa=${opacity}[wm];[0:v][wm]overlay=${overlayPosition}`;
            
            try {
              await execAsync(
                `ffmpeg -y -i "${finalVideoPath}" -i "${watermarkPath}" -filter_complex "${watermarkFilter}" -c:v libx264 -preset medium -c:a copy "${watermarkedPath}"`
              );
              finalVideoPath = watermarkedPath;
              console.log('[VideoAssembly] Watermark applied successfully');
            } catch (wmErr) {
              console.error('[VideoAssembly] Watermark overlay failed:', wmErr);
            }
          }
        } catch (dlErr) {
          console.error('[VideoAssembly] Failed to download watermark:', dlErr);
        }
      }

      // Final encoding pass with quality settings
      this.updateProgress({
        phase: 'finalizing',
        progress: 90,
        message: 'Finalizing video...'
      });

      await execAsync(
        `ffmpeg -y -i "${finalVideoPath}" -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k "${outputPath}"`
      );

      // Get file info
      const stats = await fs.promises.stat(outputPath);
      const { stdout: durationOutput } = await execAsync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
      );
      const duration = parseFloat(durationOutput.trim());

      this.updateProgress({
        phase: 'finalizing',
        progress: 100,
        message: 'Video assembly complete!'
      });

      return {
        success: true,
        outputPath,
        duration,
        fileSize: stats.size
      };

    } catch (error: any) {
      console.error('Video assembly failed:', error);
      return {
        success: false,
        error: error.message || 'Video assembly failed'
      };
    }
  }

  async cleanup(workDir: string): Promise<void> {
    try {
      const files = await fs.promises.readdir(workDir);
      for (const file of files) {
        await unlinkAsync(path.join(workDir, file));
      }
      await fs.promises.rmdir(workDir);
    } catch (err) {
      console.error('Cleanup failed:', err);
    }
  }

  async getVideoBuffer(videoPath: string): Promise<Buffer> {
    return readFileAsync(videoPath);
  }
}

export const videoAssemblyService = new VideoAssemblyService();
