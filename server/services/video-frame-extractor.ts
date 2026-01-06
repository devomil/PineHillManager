import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import https from 'https';
import http from 'http';

const execAsync = promisify(exec);

class VideoFrameExtractor {
  
  async isFFmpegAvailable(): Promise<boolean> {
    try {
      await execAsync('which ffmpeg');
      return true;
    } catch {
      return false;
    }
  }

  private async downloadVideo(url: string, outputPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      const protocol = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(outputPath);
      
      const request = protocol.get(url, { timeout: 60000 }, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            fs.unlinkSync(outputPath);
            this.downloadVideo(redirectUrl, outputPath).then(resolve);
            return;
          }
        }
        
        if (response.statusCode !== 200) {
          console.error(`[FrameExtractor] Download failed with status: ${response.statusCode}`);
          file.close();
          resolve(false);
          return;
        }
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      });
      
      request.on('error', (err) => {
        console.error(`[FrameExtractor] Download error:`, err.message);
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        resolve(false);
      });
      
      request.on('timeout', () => {
        console.error(`[FrameExtractor] Download timeout`);
        request.destroy();
        file.close();
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        resolve(false);
      });
    });
  }

  async extractFrame(
    videoUrl: string,
    timestampSeconds: number = 1
  ): Promise<string | null> {
    const hasFFmpeg = await this.isFFmpegAvailable();
    
    if (!hasFFmpeg) {
      console.warn(`[FrameExtractor] FFmpeg not available`);
      return null;
    }

    const tempDir = os.tmpdir();
    const videoPath = path.join(tempDir, `video_${Date.now()}.mp4`);
    const outputPath = path.join(tempDir, `frame_${Date.now()}.jpg`);

    try {
      const isRemoteUrl = videoUrl.startsWith('http://') || videoUrl.startsWith('https://');
      let inputPath = videoUrl;
      
      if (isRemoteUrl) {
        console.log(`[FrameExtractor] Downloading video from: ${videoUrl.substring(0, 100)}...`);
        const downloaded = await this.downloadVideo(videoUrl, videoPath);
        if (!downloaded || !fs.existsSync(videoPath)) {
          console.error(`[FrameExtractor] Failed to download video`);
          return null;
        }
        inputPath = videoPath;
        console.log(`[FrameExtractor] Video downloaded to: ${videoPath}`);
      }
      
      const command = `ffmpeg -ss ${timestampSeconds} -i "${inputPath}" -vframes 1 -q:v 2 "${outputPath}" -y 2>/dev/null`;
      
      await execAsync(command, { timeout: 30000 });
      
      if (fs.existsSync(outputPath)) {
        const buffer = fs.readFileSync(outputPath);
        const base64 = buffer.toString('base64');
        
        fs.unlinkSync(outputPath);
        if (isRemoteUrl && fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
        
        return `data:image/jpeg;base64,${base64}`;
      }
      
      if (isRemoteUrl && fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      
      return null;

    } catch (error: any) {
      console.error(`[FrameExtractor] Failed:`, error.message);
      
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      
      return null;
    }
  }

  async extractFrameAsBase64(
    videoUrl: string,
    timestampSeconds: number = 1
  ): Promise<{ base64: string; mediaType: 'image/jpeg' } | null> {
    const dataUrl = await this.extractFrame(videoUrl, timestampSeconds);
    
    if (!dataUrl) {
      return null;
    }

    const base64Match = dataUrl.match(/base64,(.+)$/);
    if (!base64Match) {
      return null;
    }

    return {
      base64: base64Match[1],
      mediaType: 'image/jpeg',
    };
  }
}

export const videoFrameExtractor = new VideoFrameExtractor();
