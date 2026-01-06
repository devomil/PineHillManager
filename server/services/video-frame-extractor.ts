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
      console.log(`[FrameExtractor] Starting download from: ${url.substring(0, 100)}...`);
      const protocol = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(outputPath);
      
      const request = protocol.get(url, { timeout: 60000 }, (response) => {
        console.log(`[FrameExtractor] Response status: ${response.statusCode}`);
        
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307) {
          const redirectUrl = response.headers.location;
          console.log(`[FrameExtractor] Following redirect to: ${redirectUrl?.substring(0, 100)}...`);
          if (redirectUrl) {
            file.close();
            if (fs.existsSync(outputPath)) {
              try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }
            }
            const fullRedirectUrl = redirectUrl.startsWith('http') ? redirectUrl : new URL(redirectUrl, url).href;
            this.downloadVideo(fullRedirectUrl, outputPath).then(resolve);
            return;
          }
        }
        
        if (response.statusCode !== 200) {
          console.error(`[FrameExtractor] Download failed with status: ${response.statusCode}`);
          file.close();
          resolve(false);
          return;
        }
        
        let downloadedBytes = 0;
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
        });
        
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`[FrameExtractor] Download complete: ${downloadedBytes} bytes`);
          resolve(true);
        });
        file.on('error', (err) => {
          console.error(`[FrameExtractor] File write error:`, err.message);
          file.close();
          resolve(false);
        });
      });
      
      request.on('error', (err) => {
        console.error(`[FrameExtractor] Download error:`, err.message);
        file.close();
        if (fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }
        }
        resolve(false);
      });
      
      request.on('timeout', () => {
        console.error(`[FrameExtractor] Download timeout after 60s`);
        request.destroy();
        file.close();
        if (fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }
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
      
      console.log(`[FrameExtractor] Processing video URL (remote: ${isRemoteUrl}): ${videoUrl.substring(0, 100)}...`);
      
      if (isRemoteUrl) {
        const downloaded = await this.downloadVideo(videoUrl, videoPath);
        if (!downloaded) {
          console.error(`[FrameExtractor] Download returned false`);
          return null;
        }
        if (!fs.existsSync(videoPath)) {
          console.error(`[FrameExtractor] Video file does not exist after download`);
          return null;
        }
        const stats = fs.statSync(videoPath);
        console.log(`[FrameExtractor] Video downloaded successfully: ${stats.size} bytes at ${videoPath}`);
        inputPath = videoPath;
      }
      
      const command = `ffmpeg -ss ${timestampSeconds} -i "${inputPath}" -vframes 1 -q:v 2 "${outputPath}" -y`;
      console.log(`[FrameExtractor] Executing FFmpeg command...`);
      
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      if (stderr) {
        console.log(`[FrameExtractor] FFmpeg stderr: ${stderr.substring(0, 200)}`);
      }
      
      if (fs.existsSync(outputPath)) {
        const buffer = fs.readFileSync(outputPath);
        const base64 = buffer.toString('base64');
        console.log(`[FrameExtractor] Frame extracted successfully: ${buffer.length} bytes`);
        
        fs.unlinkSync(outputPath);
        if (isRemoteUrl && fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }
        
        return `data:image/jpeg;base64,${base64}`;
      }
      
      console.error(`[FrameExtractor] FFmpeg did not produce output file`);
      if (isRemoteUrl && fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
      
      return null;

    } catch (error: any) {
      console.error(`[FrameExtractor] Exception:`, error.message);
      
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
