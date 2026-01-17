interface LegNextConfig {
  apiKey: string;
  baseUrl: string;
}

export interface MidjourneyGenerateRequest {
  prompt: string;
  model?: 'midjourney-v7' | 'midjourney-v6' | 'niji-6';
  mode?: 'turbo' | 'fast' | 'relax';
  aspectRatio?: string;
  stylize?: number;
  chaos?: number;
  quality?: number;
  seed?: number;
  referenceImage?: string;
  referenceStrength?: number;
}

export interface MidjourneyGenerateResponse {
  success: boolean;
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  thumbnailUrl?: string;
  pointsUsed: number;
  error?: string;
}

export interface LegNextBalance {
  points: number;
  plan: string;
}

class LegNextClient {
  private config: LegNextConfig;
  private isAvailable: boolean = true;
  private lastBalanceCheck: number = 0;
  private cachedBalance: LegNextBalance | null = null;
  
  constructor() {
    this.config = {
      apiKey: process.env.LEGNEXT_API_KEY || '',
      baseUrl: 'https://api.legnext.ai/api/v1',
    };
  }
  
  isConfigured(): boolean {
    return !!this.config.apiKey;
  }
  
  async generateImage(request: MidjourneyGenerateRequest): Promise<MidjourneyGenerateResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        taskId: '',
        status: 'failed',
        pointsUsed: 0,
        error: 'LegNext API key not configured',
      };
    }
    
    const modelMap: Record<string, string> = {
      'midjourney-v7': 'mj-7',
      'midjourney-v6': 'mj-6.1',
      'niji-6': 'niji-6',
    };
    const apiModel = modelMap[request.model || 'midjourney-v7'] || 'mj-7';
    
    console.log(`[LegNext] Generating with ${apiModel}, mode: ${request.mode || 'fast'}`);
    
    try {
      const requestBody: Record<string, any> = {
        prompt: this.formatPrompt(request),
        model: apiModel,
        mode: request.mode || 'fast',
      };
      
      if (request.aspectRatio) {
        requestBody.aspectRatio = request.aspectRatio;
      }
      
      if (request.referenceImage) {
        requestBody.imageUrl = request.referenceImage;
        if (request.referenceStrength !== undefined) {
          requestBody.imageWeight = request.referenceStrength;
        }
      }
      
      console.log(`[LegNext] Request body:`, JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${this.config.baseUrl}/imagine`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[LegNext] API error: ${response.status} - ${errorText}`);
        
        if (response.status === 402) {
          this.isAvailable = false;
          return {
            success: false,
            taskId: '',
            status: 'failed',
            pointsUsed: 0,
            error: 'Insufficient LegNext credits',
          };
        }
        
        throw new Error(`LegNext API error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log(`[LegNext] Response:`, JSON.stringify(result, null, 2));
      
      const jobId = result.jobId || result.job_id || result.taskId;
      if (jobId) {
        console.log(`[LegNext] Task created: ${jobId}`);
        return this.pollForCompletion(jobId);
      }
      
      if (result.imageUrl) {
        return {
          success: true,
          taskId: '',
          status: 'completed',
          imageUrl: result.imageUrl,
          thumbnailUrl: result.imageUrl,
          pointsUsed: result.pointsUsed || 4,
        };
      }
      
      throw new Error('Unexpected LegNext response format: ' + JSON.stringify(result));
      
    } catch (error: any) {
      console.error('[LegNext] Generation failed:', error.message);
      return {
        success: false,
        taskId: '',
        status: 'failed',
        pointsUsed: 0,
        error: error.message,
      };
    }
  }
  
  private formatPrompt(request: MidjourneyGenerateRequest): string {
    let prompt = request.prompt;
    
    if (request.stylize !== undefined) {
      prompt += ` --stylize ${request.stylize}`;
    }
    
    if (request.chaos !== undefined && request.chaos > 0) {
      prompt += ` --chaos ${request.chaos}`;
    }
    
    if (request.quality !== undefined && request.quality !== 1) {
      prompt += ` --quality ${request.quality}`;
    }
    
    if (request.seed !== undefined) {
      prompt += ` --seed ${request.seed}`;
    }
    
    return prompt;
  }
  
  private async pollForCompletion(
    taskId: string,
    maxAttempts: number = 90,
    intervalMs: number = 2000
  ): Promise<MidjourneyGenerateResponse> {
    
    const endpoints = [
      `${this.config.baseUrl}/status/${taskId}`,
      `${this.config.baseUrl}/task/${taskId}`,
      `${this.config.baseUrl}/job/${taskId}`,
    ];
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            headers: {
              'x-api-key': this.config.apiKey,
            },
          });
          
          if (!response.ok) {
            if (attempt === 0) {
              console.log(`[LegNext] Endpoint ${endpoint} returned ${response.status}, trying next...`);
            }
            continue;
          }
          
          const result = await response.json();
          
          console.log(`[LegNext] Task ${taskId} status: ${result.status}`);
          
          const status = result.status?.toLowerCase();
          
          if (status === 'completed' || status === 'success') {
            const imageUrl = result.imageUrl || result.image_url || 
                           result.output?.image_url || result.output?.image_urls?.[0] ||
                           result.result?.imageUrl || result.data?.imageUrl;
            
            if (imageUrl) {
              console.log(`[LegNext] Generation completed: ${imageUrl}`);
              return {
                success: true,
                taskId,
                status: 'completed',
                imageUrl,
                thumbnailUrl: imageUrl,
                pointsUsed: result.meta?.usage?.consume || result.pointsUsed || 4,
              };
            }
          }
          
          if (status === 'failed' || status === 'error') {
            return {
              success: false,
              taskId,
              status: 'failed',
              pointsUsed: 0,
              error: result.error?.message || result.message || 'Generation failed',
            };
          }
          
          break;
          
        } catch (error: any) {
          if (attempt === 0) {
            console.log(`[LegNext] Endpoint ${endpoint} error: ${error.message}`);
          }
          continue;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    return {
      success: false,
      taskId,
      status: 'failed',
      pointsUsed: 0,
      error: 'Generation timed out',
    };
  }
  
  async getBalance(): Promise<LegNextBalance> {
    if (!this.isConfigured()) {
      return { points: 0, plan: 'none' };
    }
    
    const now = Date.now();
    if (this.cachedBalance && now - this.lastBalanceCheck < 60000) {
      return this.cachedBalance;
    }
    
    try {
      const response = await fetch(`${this.config.baseUrl}/account/balance`, {
        headers: {
          'x-api-key': this.config.apiKey,
        },
      });
      
      if (!response.ok) {
        console.log(`[LegNext] Balance check endpoint returned ${response.status} - assuming credits available`);
        return { points: 100, plan: 'unknown' };
      }
      
      const result = await response.json();
      
      this.cachedBalance = {
        points: result.points || result.balance || 0,
        plan: result.plan || 'free',
      };
      this.lastBalanceCheck = now;
      this.isAvailable = this.cachedBalance.points >= 4;
      
      console.log(`[LegNext] Balance: ${this.cachedBalance.points} points (${this.cachedBalance.plan})`);
      
      return this.cachedBalance;
      
    } catch (error: any) {
      console.error('[LegNext] Balance check error:', error.message);
      return { points: 0, plan: 'unknown' };
    }
  }
  
  async hasAvailableCredits(requiredPoints: number = 4): Promise<boolean> {
    if (!this.isConfigured()) return false;
    
    const balance = await this.getBalance();
    return balance.points >= requiredPoints;
  }
  
  async upscaleImage(taskId: string, index: number = 1): Promise<MidjourneyGenerateResponse> {
    if (!this.isConfigured()) {
      return {
        success: false,
        taskId: '',
        status: 'failed',
        pointsUsed: 0,
        error: 'LegNext API key not configured',
      };
    }
    
    try {
      const response = await fetch(`${this.config.baseUrl}/upscale`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin_task_id: taskId,
          index,
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LegNext upscale error: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      
      if (result.job_id) {
        return this.pollForCompletion(result.job_id);
      }
      
      throw new Error('Unexpected upscale response format');
      
    } catch (error: any) {
      console.error('[LegNext] Upscale failed:', error.message);
      return {
        success: false,
        taskId: '',
        status: 'failed',
        pointsUsed: 0,
        error: error.message,
      };
    }
  }
}

export const legNextClient = new LegNextClient();
