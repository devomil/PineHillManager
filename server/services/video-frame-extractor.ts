import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
    const outputPath = path.join(tempDir, `frame_${Date.now()}.jpg`);

    try {
      const command = `ffmpeg -ss ${timestampSeconds} -i "${videoUrl}" -vframes 1 -q:v 2 "${outputPath}" -y 2>/dev/null`;
      
      await execAsync(command, { timeout: 30000 });
      
      if (fs.existsSync(outputPath)) {
        const buffer = fs.readFileSync(outputPath);
        const base64 = buffer.toString('base64');
        
        fs.unlinkSync(outputPath);
        
        return `data:image/jpeg;base64,${base64}`;
      }
      
      return null;

    } catch (error: any) {
      console.error(`[FrameExtractor] Failed:`, error.message);
      
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
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
