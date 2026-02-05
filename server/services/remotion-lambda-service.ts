import {
  deploySite,
  getFunctions,
  renderMediaOnLambda,
  getRenderProgress,
  AwsRegion,
} from "@remotion/lambda";
import path from "path";

// Updated defaults for us-east-2 deployment (Phase 18I)
const DEFAULT_REGION: AwsRegion = "us-east-2";
const DEFAULT_FUNCTION_NAME = "remotion-render-4-0-410-mem3008mb-disk10240mb-900sec";
const DEFAULT_SITE_NAME = "pinehillfarm-video";
const DEFAULT_BUCKET_NAME = "remotionlambda-useast2-1vc2l6a56o";
const DEFAULT_SERVE_URL = `https://${DEFAULT_BUCKET_NAME}.s3.${DEFAULT_REGION}.amazonaws.com/sites/${DEFAULT_SITE_NAME}/index.html`;

// Phase 18I: Use environment variables with updated us-east-2 defaults
const getRegion = (): AwsRegion => (process.env.REMOTION_AWS_REGION as AwsRegion) || DEFAULT_REGION;
const getFunctionName = (): string => process.env.REMOTION_FUNCTION_NAME || DEFAULT_FUNCTION_NAME;
const getSiteName = (): string => process.env.REMOTION_SITE_NAME || DEFAULT_SITE_NAME;
const getBucketName = (): string => process.env.REMOTION_S3_BUCKET || process.env.REMOTION_AWS_BUCKET || DEFAULT_BUCKET_NAME;
const getServeUrl = (): string => process.env.REMOTION_SERVE_URL || DEFAULT_SERVE_URL;

interface DeploymentResult {
  functionName: string;
  bucketName: string;
  serveUrl: string;
}

interface RenderResult {
  renderId: string;
  bucketName: string;
}

interface RenderProgress {
  overallProgress: number;
  outputFile: string | null;
  errors: string[];
  done: boolean;
}

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'error';
  function?: {
    name: string;
    version?: string;
    memory?: number;
    timeout?: number;
    disk?: number;
  };
  region: string;
  serveUrl?: string;
  bucket?: string;
  timestamp: string;
  error?: string;
  expected?: string;
  available?: string[];
}

class RemotionLambdaService {
  private get functionName(): string {
    return getFunctionName();
  }
  
  private get bucketName(): string {
    return getBucketName();
  }
  
  private get serveUrl(): string {
    return getServeUrl();
  }
  
  private get region(): AwsRegion {
    return getRegion();
  }

  private getAwsCredentials() {
    const accessKeyId = process.env.REMOTION_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.REMOTION_AWS_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials not configured. Please set REMOTION_AWS_ACCESS_KEY_ID and REMOTION_AWS_SECRET_ACCESS_KEY");
    }

    return { accessKeyId, secretAccessKey };
  }

  async isConfigured(): Promise<boolean> {
    try {
      this.getAwsCredentials();
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const region = this.region;
    const functionName = this.functionName;
    
    try {
      this.getAwsCredentials();
      
      const functions = await getFunctions({
        region,
        compatibleOnly: true,
      });

      const ourFunction = functions.find(f => f.functionName === functionName);

      if (!ourFunction) {
        return {
          status: 'unhealthy',
          error: 'Lambda function not found',
          expected: functionName,
          available: functions.map(f => f.functionName),
          region,
          timestamp: new Date().toISOString(),
        };
      }

      return {
        status: 'healthy',
        function: {
          name: ourFunction.functionName,
          version: ourFunction.version,
          memory: ourFunction.memorySizeInMb,
          timeout: ourFunction.timeoutInSeconds,
          disk: ourFunction.diskSizeInMb,
        },
        region,
        serveUrl: this.serveUrl,
        bucket: this.bucketName,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('[Health] Check failed:', error);
      return {
        status: 'error',
        error: error.message,
        region,
        timestamp: new Date().toISOString(),
      };
    }
  }

  async getDeploymentStatus(): Promise<{
    deployed: boolean;
    functionName: string | null;
    bucketName: string | null;
    serveUrl: string | null;
  }> {
    try {
      this.getAwsCredentials();

      const functions = await getFunctions({
        region: this.region,
        compatibleOnly: true,
      });

      const existingFunction = functions.find(
        (f) => f.functionName === this.functionName
      );

      if (existingFunction) {
        return {
          deployed: true,
          functionName: this.functionName,
          bucketName: this.bucketName,
          serveUrl: this.serveUrl,
        };
      }

      return {
        deployed: false,
        functionName: null,
        bucketName: null,
        serveUrl: null,
      };
    } catch (error) {
      console.error("[Remotion Lambda] Error checking deployment status:", error);
      return {
        deployed: false,
        functionName: null,
        bucketName: null,
        serveUrl: null,
      };
    }
  }

  async deploy(): Promise<DeploymentResult> {
    console.log("[Remotion Lambda] Using pre-deployed Lambda infrastructure...");
    console.log(`[Remotion Lambda] Function: ${this.functionName}`);
    console.log(`[Remotion Lambda] Bucket: ${this.bucketName}`);
    console.log(`[Remotion Lambda] ServeUrl: ${this.serveUrl}`);

    return {
      functionName: this.functionName,
      bucketName: this.bucketName,
      serveUrl: this.serveUrl,
    };
  }

  async redeploySite(): Promise<string> {
    console.log("[Remotion Lambda] Redeploying site to S3...");

    try {
      this.getAwsCredentials();

      const { serveUrl } = await deploySite({
        bucketName: this.bucketName,
        entryPoint: path.resolve(process.cwd(), "remotion/index.ts"),
        region: this.region,
        siteName: getSiteName(),
      });

      console.log(`[Remotion Lambda] Site redeployed: ${serveUrl}`);
      return serveUrl;
    } catch (error) {
      console.error("[Remotion Lambda] Site redeployment failed:", error);
      throw error;
    }
  }

  async startRender(params: {
    compositionId: string;
    inputProps: Record<string, any>;
    codec?: "h264" | "h265" | "vp8" | "vp9";
    imageFormat?: "jpeg" | "png";
  }): Promise<RenderResult> {
    this.getAwsCredentials();

    console.log(`[Remotion Lambda] Starting render for ${params.compositionId}...`);
    console.log(`[Remotion Lambda] Function: ${this.functionName}`);
    console.log(`[Remotion Lambda] ServeUrl: ${this.serveUrl}`);
    console.log(`[Remotion Lambda] Input props:`, JSON.stringify(params.inputProps).substring(0, 500));
    
    // Debug logging for scene details
    console.log('[DEBUG] Scenes being rendered:', JSON.stringify(params.inputProps.scenes?.map((s: any) => ({
      id: s.id,
      type: s.type,
      bgType: s.background?.type,
      hasVideo: !!s.assets?.videoUrl,
      hasImage: !!s.assets?.imageUrl
    })), null, 2));

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await renderMediaOnLambda({
          region: this.region,
          functionName: this.functionName,
          serveUrl: this.serveUrl,
          composition: params.compositionId,
          inputProps: params.inputProps,
          codec: params.codec || "h264",
          imageFormat: params.imageFormat || "jpeg",
          maxRetries: 2,
          privacy: "public",
          framesPerLambda: 600,
          concurrencyPerLambda: 1,
          timeoutInMilliseconds: 1800000,
          downloadBehavior: {
            type: "download",
            fileName: `${params.compositionId}-${Date.now()}.mp4`,
          },
        });

        console.log(`[Remotion Lambda] Render started: ${result.renderId}`);

        return {
          renderId: result.renderId,
          bucketName: result.bucketName,
        };
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        
        // Check for concurrency/rate limit errors
        const isConcurrencyError = 
          errorMessage.includes('Concurrency limit') ||
          errorMessage.includes('Rate Exceeded') ||
          errorMessage.includes('TooManyRequestsException') ||
          errorMessage.includes('rate limit');

        if (isConcurrencyError && attempt < maxRetries) {
          const delay = Math.min(15000 * Math.pow(2, attempt - 1), 60000); // 15s, 30s, 60s max
          console.log(`[Remotion Lambda] Concurrency limit hit, waiting ${delay/1000}s before retry ${attempt + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        console.error(`[Remotion Lambda] Render failed to start (attempt ${attempt}/${maxRetries}):`, error);
        
        if (isConcurrencyError) {
          throw new Error(`AWS Lambda is currently busy. Please wait a minute and try again. If this persists, there may be other renders in progress.`);
        }
        throw error;
      }
    }

    throw lastError || new Error("Render failed after all retries");
  }

  async getRenderProgress(renderId: string, bucketName: string): Promise<RenderProgress> {
    try {
      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName: this.functionName,
        region: this.region,
      });

      return {
        overallProgress: progress.overallProgress,
        outputFile: progress.outputFile,
        errors: progress.errors.map((e) => e.message),
        done: progress.done,
      };
    } catch (error) {
      console.error("[Remotion Lambda] Error getting render progress:", error);
      throw error;
    }
  }

  async renderVideo(params: {
    compositionId: string;
    inputProps: Record<string, any>;
    codec?: "h264" | "h265" | "vp8" | "vp9";
  }): Promise<string> {
    const { renderId, bucketName } = await this.startRender(params);

    console.log(`[Remotion Lambda] Waiting for render to complete...`);

    while (true) {
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const progress = await this.getRenderProgress(renderId, bucketName);

      console.log(`[Remotion Lambda] Progress: ${Math.round(progress.overallProgress * 100)}%`);

      if (progress.errors.length > 0) {
        throw new Error(`Render failed: ${progress.errors.join(", ")}`);
      }

      if (progress.done && progress.outputFile) {
        console.log(`[Remotion Lambda] Render complete: ${progress.outputFile}`);
        return progress.outputFile;
      }

      if (progress.done && !progress.outputFile) {
        throw new Error("Render completed but no output file was generated");
      }
    }
  }
}

export const remotionLambdaService = new RemotionLambdaService();
