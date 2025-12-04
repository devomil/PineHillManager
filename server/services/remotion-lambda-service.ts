import {
  deploySite,
  getOrCreateBucket,
  deployFunction,
  getFunctions,
  renderMediaOnLambda,
  getRenderProgress,
  AwsRegion,
  RenderMediaOnLambdaOutput,
} from "@remotion/lambda";
import path from "path";

const REMOTION_APP_NAME = "pine-hill-video-producer";
const REGION: AwsRegion = "us-east-1";
const MEMORY_SIZE = 2048;
const DISK_SIZE = 2048;
const TIMEOUT = 240;

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

class RemotionLambdaService {
  private functionName: string | null = null;
  private bucketName: string | null = null;
  private serveUrl: string | null = null;

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

  async getDeploymentStatus(): Promise<{
    deployed: boolean;
    functionName: string | null;
    bucketName: string | null;
    serveUrl: string | null;
  }> {
    try {
      const { accessKeyId, secretAccessKey } = this.getAwsCredentials();

      const functions = await getFunctions({
        region: REGION,
        compatibleOnly: true,
      });

      const existingFunction = functions.find(
        (f) => f.functionName.includes(REMOTION_APP_NAME)
      );

      if (existingFunction) {
        this.functionName = existingFunction.functionName;
        return {
          deployed: true,
          functionName: existingFunction.functionName,
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
    console.log("[Remotion Lambda] Starting deployment...");

    try {
      const { accessKeyId, secretAccessKey } = this.getAwsCredentials();

      console.log("[Remotion Lambda] Getting or creating S3 bucket...");
      const { bucketName } = await getOrCreateBucket({
        region: REGION,
      });
      this.bucketName = bucketName;
      console.log(`[Remotion Lambda] Bucket: ${bucketName}`);

      console.log("[Remotion Lambda] Deploying site to S3...");
      const { serveUrl } = await deploySite({
        bucketName,
        entryPoint: path.resolve(process.cwd(), "remotion/index.ts"),
        region: REGION,
        siteName: REMOTION_APP_NAME,
      });
      this.serveUrl = serveUrl;
      console.log(`[Remotion Lambda] Site deployed: ${serveUrl}`);

      console.log("[Remotion Lambda] Deploying Lambda function...");
      const { functionName } = await deployFunction({
        region: REGION,
        timeoutInSeconds: TIMEOUT,
        memorySizeInMb: MEMORY_SIZE,
        diskSizeInMb: DISK_SIZE,
        createCloudWatchLogGroup: true,
      });
      this.functionName = functionName;
      console.log(`[Remotion Lambda] Function deployed: ${functionName}`);

      return {
        functionName,
        bucketName,
        serveUrl,
      };
    } catch (error) {
      console.error("[Remotion Lambda] Deployment failed:", error);
      throw error;
    }
  }

  async startRender(params: {
    compositionId: string;
    inputProps: Record<string, any>;
    codec?: "h264" | "h265" | "vp8" | "vp9";
    imageFormat?: "jpeg" | "png";
  }): Promise<RenderResult> {
    if (!this.functionName || !this.serveUrl) {
      const status = await this.getDeploymentStatus();
      if (!status.deployed) {
        throw new Error("Lambda function not deployed. Call deploy() first.");
      }
    }

    console.log(`[Remotion Lambda] Starting render for ${params.compositionId}...`);
    console.log(`[Remotion Lambda] Input props:`, JSON.stringify(params.inputProps).substring(0, 200));

    try {
      const result = await renderMediaOnLambda({
        region: REGION,
        functionName: this.functionName!,
        serveUrl: this.serveUrl!,
        composition: params.compositionId,
        inputProps: params.inputProps,
        codec: params.codec || "h264",
        imageFormat: params.imageFormat || "jpeg",
        maxRetries: 1,
        privacy: "public",
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
    } catch (error) {
      console.error("[Remotion Lambda] Render failed to start:", error);
      throw error;
    }
  }

  async getRenderProgress(renderId: string, bucketName: string): Promise<RenderProgress> {
    try {
      if (!this.functionName) {
        await this.getDeploymentStatus();
      }

      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName: this.functionName!,
        region: REGION,
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
