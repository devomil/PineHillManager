import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { remotionLambdaService } from "./remotion-lambda-service";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

const REGION = process.env.REMOTION_AWS_REGION || "us-east-2";
const BUCKET_NAME = process.env.REMOTION_S3_BUCKET || process.env.REMOTION_AWS_BUCKET || "remotionlambda-useast2-1vc2l6a56o";
const TEMP_DIR = "/tmp/video-chunks";
const MAX_CHUNK_DURATION_SEC = 120;
const CHUNK_THRESHOLD_SEC = 90;

export interface ChunkConfig {
  chunkIndex: number;
  startFrame: number;
  endFrame: number;
  scenes: any[];
  startTimeSeconds: number;
  endTimeSeconds: number;
}

export interface ChunkResult {
  chunkIndex: number;
  s3Url: string;
  localPath: string;
  success: boolean;
  error?: string;
  renderTimeMs?: number;
}

export interface ChunkedRenderProgress {
  phase: 'preparing' | 'rendering' | 'downloading' | 'concatenating' | 'uploading' | 'complete' | 'error';
  totalChunks: number;
  completedChunks: number;
  currentChunk?: number;
  overallPercent: number;
  message: string;
  error?: string;
}

class ChunkedRenderService {
  private s3Client: S3Client | null = null;

  constructor() {
    this.ensureTempDirectory();
  }

  private getS3Client(): S3Client {
    const accessKeyId = process.env.REMOTION_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("[ChunkedRender] AWS credentials not configured - REMOTION_AWS_ACCESS_KEY_ID and REMOTION_AWS_SECRET_ACCESS_KEY required");
    }

    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region: REGION,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }

    return this.s3Client;
  }

  private ensureTempDirectory(): void {
    try {
      if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
        console.log(`[ChunkedRender] Created temp directory: ${TEMP_DIR}`);
      }
    } catch (error) {
      console.error("[ChunkedRender] Failed to create temp directory:", error);
    }
  }

  shouldUseChunkedRendering(scenes: any[], thresholdSeconds: number = CHUNK_THRESHOLD_SEC): boolean {
    const totalDuration = scenes.reduce((acc, scene) => acc + (scene.duration || 0), 0);
    const shouldChunk = totalDuration > thresholdSeconds;
    console.log(`[ChunkedRender] Total duration: ${totalDuration}s, threshold: ${thresholdSeconds}s, use chunked: ${shouldChunk}`);
    return shouldChunk;
  }

  calculateChunks(scenes: any[], fps: number = 30, maxChunkDurationSec: number = MAX_CHUNK_DURATION_SEC): ChunkConfig[] {
    const chunks: ChunkConfig[] = [];
    let currentChunk: ChunkConfig = {
      chunkIndex: 0,
      startFrame: 0,
      endFrame: 0,
      scenes: [],
      startTimeSeconds: 0,
      endTimeSeconds: 0,
    };
    let chunkDuration = 0;
    let globalFrame = 0;
    let globalTime = 0;

    for (const scene of scenes) {
      const sceneDuration = scene.duration || 0;
      const sceneFrames = Math.round(sceneDuration * fps);

      if (chunkDuration + sceneDuration > maxChunkDurationSec && currentChunk.scenes.length > 0) {
        currentChunk.endFrame = globalFrame - 1;
        currentChunk.endTimeSeconds = globalTime;
        chunks.push({ ...currentChunk });

        currentChunk = {
          chunkIndex: chunks.length,
          startFrame: globalFrame,
          endFrame: 0,
          scenes: [],
          startTimeSeconds: globalTime,
          endTimeSeconds: 0,
        };
        chunkDuration = 0;
      }

      const sceneWithAdjustedTiming = {
        ...scene,
        chunkStartFrame: currentChunk.scenes.length === 0 ? 0 : 
          currentChunk.scenes.reduce((acc: number, s: any) => acc + Math.round((s.duration || 0) * fps), 0),
      };

      currentChunk.scenes.push(sceneWithAdjustedTiming);
      chunkDuration += sceneDuration;
      globalFrame += sceneFrames;
      globalTime += sceneDuration;
    }

    if (currentChunk.scenes.length > 0) {
      currentChunk.endFrame = globalFrame - 1;
      currentChunk.endTimeSeconds = globalTime;
      chunks.push(currentChunk);
    }

    console.log(`[ChunkedRender] Calculated ${chunks.length} chunks from ${scenes.length} scenes`);
    chunks.forEach((chunk, idx) => {
      const chunkDur = chunk.scenes.reduce((acc: number, s: any) => acc + (s.duration || 0), 0);
      console.log(`[ChunkedRender] Chunk ${idx}: ${chunk.scenes.length} scenes, ${chunkDur.toFixed(1)}s, frames ${chunk.startFrame}-${chunk.endFrame}, time ${chunk.startTimeSeconds.toFixed(1)}s-${chunk.endTimeSeconds.toFixed(1)}s`);
    });

    return chunks;
  }

  async renderChunk(
    chunk: ChunkConfig,
    inputProps: Record<string, any>,
    compositionId: string
  ): Promise<ChunkResult> {
    const startTime = Date.now();
    const maxRetries = 5;
    let lastError: Error | null = null;
    
    console.log(`[ChunkedRender] Rendering chunk ${chunk.chunkIndex} with ${chunk.scenes.length} scenes...`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const chunkInputProps: any = {
          ...inputProps,
          scenes: chunk.scenes,
          isChunk: true,
          chunkIndex: chunk.chunkIndex,
        };

        if (attempt > 1 && lastError?.message?.includes('Could not play audio')) {
          console.log(`[ChunkedRender] Disabling ambient audio for chunk ${chunk.chunkIndex} retry (audio playback error detected)`);
          if (chunkInputProps.soundDesignConfig) {
            chunkInputProps.soundDesignConfig = {
              ...chunkInputProps.soundDesignConfig,
              ambientLayer: false,
            };
          }
        }

        const outputUrl = await remotionLambdaService.renderVideo({
          compositionId,
          inputProps: chunkInputProps,
        });

        const renderTimeMs = Date.now() - startTime;
        console.log(`[ChunkedRender] Chunk ${chunk.chunkIndex} completed in ${(renderTimeMs / 1000).toFixed(1)}s: ${outputUrl}`);

        return {
          chunkIndex: chunk.chunkIndex,
          s3Url: outputUrl,
          localPath: "",
          success: true,
          renderTimeMs,
        };
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        
        const isRateLimitError = 
          errorMessage.includes('Rate Exceeded') ||
          errorMessage.includes('rate limit') ||
          errorMessage.includes('Concurrency limit') ||
          errorMessage.includes('TooManyRequestsException') ||
          errorMessage.includes('Lambda is currently busy');

        if (isRateLimitError && attempt < maxRetries) {
          const delay = Math.min(30000 * Math.pow(1.5, attempt - 1), 120000);
          console.log(`[ChunkedRender] Chunk ${chunk.chunkIndex} hit rate limit, waiting ${delay/1000}s before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        console.error(`[ChunkedRender] Chunk ${chunk.chunkIndex} failed (attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt < maxRetries && !isRateLimitError) {
          const delay = 10000;
          console.log(`[ChunkedRender] Retrying chunk ${chunk.chunkIndex} in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
    }

    const renderTimeMs = Date.now() - startTime;
    return {
      chunkIndex: chunk.chunkIndex,
      s3Url: "",
      localPath: "",
      success: false,
      error: lastError?.message || "Unknown error after all retries",
      renderTimeMs,
    };
  }

  async downloadChunk(s3Url: string, chunkIndex: number): Promise<string> {
    const localPath = path.join(TEMP_DIR, `chunk_${chunkIndex}_${Date.now()}.mp4`);
    console.log(`[ChunkedRender] Downloading chunk ${chunkIndex} from ${s3Url.substring(0, 60)}...`);

    try {
      const urlParts = s3Url.match(/https?:\/\/([^.]+)\.s3\.([^.]+)\.amazonaws\.com\/(.+)/);
      if (!urlParts) {
        const response = await fetch(s3Url);
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(localPath, Buffer.from(buffer));
      } else {
        const [, bucket, region, key] = urlParts;
        const command = new GetObjectCommand({
          Bucket: bucket,
          Key: decodeURIComponent(key),
        });

        const response = await this.getS3Client().send(command);
        const stream = response.Body as NodeJS.ReadableStream;
        
        await new Promise<void>((resolve, reject) => {
          const writeStream = fs.createWriteStream(localPath);
          stream.pipe(writeStream);
          writeStream.on("finish", resolve);
          writeStream.on("error", reject);
        });
      }

      const stats = fs.statSync(localPath);
      console.log(`[ChunkedRender] Downloaded chunk ${chunkIndex}: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);

      return localPath;
    } catch (error) {
      console.error(`[ChunkedRender] Failed to download chunk ${chunkIndex}:`, error);
      throw error;
    }
  }

  async concatenateChunks(chunkPaths: string[], outputPath: string): Promise<void> {
    console.log(`[ChunkedRender] Concatenating ${chunkPaths.length} chunks...`);

    const listFile = path.join(TEMP_DIR, `concat_list_${Date.now()}.txt`);
    const listContent = chunkPaths.map(p => `file '${p}'`).join("\n");
    fs.writeFileSync(listFile, listContent);

    try {
      const ffmpegCmd = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${outputPath}"`;
      console.log(`[ChunkedRender] Running FFmpeg: ${ffmpegCmd}`);

      const { stdout, stderr } = await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 });
      
      if (stderr) {
        console.log(`[ChunkedRender] FFmpeg stderr:`, stderr.substring(0, 500));
      }

      const stats = fs.statSync(outputPath);
      console.log(`[ChunkedRender] Concatenation complete: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } finally {
      try {
        fs.unlinkSync(listFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  async uploadFinalVideo(localPath: string, projectId: string): Promise<string> {
    const key = `renders/chunked/${projectId}_${Date.now()}.mp4`;
    console.log(`[ChunkedRender] Uploading final video to S3: ${key}`);

    const fileBuffer = fs.readFileSync(localPath);

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: "video/mp4",
      ACL: "public-read",
    });

    await this.getS3Client().send(command);

    const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${key}`;
    console.log(`[ChunkedRender] Upload complete: ${url}`);

    return url;
  }

  cleanupTempFiles(paths: string[]): void {
    console.log(`[ChunkedRender] Cleaning up ${paths.length} temp files...`);
    for (const filePath of paths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.warn(`[ChunkedRender] Failed to delete temp file ${filePath}:`, error);
      }
    }
  }

  async renderLongVideo(
    projectId: string,
    inputProps: Record<string, any>,
    compositionId: string,
    onProgress?: (progress: ChunkedRenderProgress) => void
  ): Promise<string> {
    const scenes = inputProps.scenes || [];
    const fps = inputProps.fps || 30;
    const tempFiles: string[] = [];

    const updateProgress = (progress: ChunkedRenderProgress) => {
      console.log(`[ChunkedRender] Progress: ${progress.phase} - ${progress.overallPercent}% - ${progress.message}`);
      if (onProgress) {
        onProgress(progress);
      }
    };

    try {
      updateProgress({
        phase: 'preparing',
        totalChunks: 0,
        completedChunks: 0,
        overallPercent: 5,
        message: 'Calculating chunks...',
      });

      const chunks = this.calculateChunks(scenes, fps);
      const totalChunks = chunks.length;

      updateProgress({
        phase: 'rendering',
        totalChunks,
        completedChunks: 0,
        overallPercent: 10,
        message: `Starting render of ${totalChunks} chunks...`,
      });

      const chunkResults: ChunkResult[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        updateProgress({
          phase: 'rendering',
          totalChunks,
          completedChunks: i,
          currentChunk: i,
          overallPercent: 10 + Math.round((i / totalChunks) * 50),
          message: `Rendering chunk ${i + 1} of ${totalChunks}...`,
        });

        const result = await this.renderChunk(chunk, inputProps, compositionId);
        
        if (!result.success) {
          throw new Error(`Chunk ${i} failed: ${result.error}`);
        }

        chunkResults.push(result);
      }

      updateProgress({
        phase: 'downloading',
        totalChunks,
        completedChunks: totalChunks,
        overallPercent: 60,
        message: 'Downloading rendered chunks...',
      });

      const chunkPaths: string[] = [];
      for (let i = 0; i < chunkResults.length; i++) {
        const result = chunkResults[i];
        
        updateProgress({
          phase: 'downloading',
          totalChunks,
          completedChunks: totalChunks,
          currentChunk: i,
          overallPercent: 60 + Math.round((i / totalChunks) * 15),
          message: `Downloading chunk ${i + 1} of ${totalChunks}...`,
        });

        const localPath = await this.downloadChunk(result.s3Url, result.chunkIndex);
        chunkPaths.push(localPath);
        tempFiles.push(localPath);
      }

      updateProgress({
        phase: 'concatenating',
        totalChunks,
        completedChunks: totalChunks,
        overallPercent: 80,
        message: 'Concatenating video chunks...',
      });

      const outputPath = path.join(TEMP_DIR, `final_${projectId}_${Date.now()}.mp4`);
      tempFiles.push(outputPath);
      await this.concatenateChunks(chunkPaths, outputPath);

      updateProgress({
        phase: 'uploading',
        totalChunks,
        completedChunks: totalChunks,
        overallPercent: 90,
        message: 'Uploading final video...',
      });

      const finalUrl = await this.uploadFinalVideo(outputPath, projectId);

      updateProgress({
        phase: 'complete',
        totalChunks,
        completedChunks: totalChunks,
        overallPercent: 100,
        message: 'Video rendering complete!',
      });

      return finalUrl;
    } catch (error: any) {
      updateProgress({
        phase: 'error',
        totalChunks: 0,
        completedChunks: 0,
        overallPercent: 0,
        message: 'Render failed',
        error: error.message,
      });
      throw error;
    } finally {
      this.cleanupTempFiles(tempFiles);
    }
  }
}

export const chunkedRenderService = new ChunkedRenderService();
