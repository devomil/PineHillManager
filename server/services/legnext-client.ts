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
    
    console.log(`[LegNext] Generating with ${request.model || 'midjourney-v7'}, mode: ${request.mode || 'fast'}`);
    
    try {
      const formattedPrompt = this.formatPrompt(request);
      
      const response = await fetch(`${this.config.baseUrl}/diffusion`, {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: formattedPrompt,
        }),
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
      
      if (result.job_id) {
        console.log(`[LegNext] Task created: ${result.job_id}`);
        return this.pollForCompletion(result.job_id);
      }
      
      throw new Error('Unexpected LegNext response format');
      
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
    
    if (request.aspectRatio) {
      prompt += ` --ar ${request.aspectRatio}`;
    }
    
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
    
    if (request.model === 'midjourney-v6') {
      prompt += ' --v 6';
    } else if (request.model === 'niji-6') {
      prompt += ' --niji 6';
    } else {
      prompt += ' --v 7';
    }
    
    if (request.mode === 'turbo') {
      prompt += ' --turbo';
    } else if (request.mode === 'fast') {
      prompt += ' --fast';
    } else if (request.mode === 'relax') {
      prompt += ' --relax';
    }
    
    return prompt;
  }
  
  private async pollForCompletion(
    taskId: string,
    maxAttempts: number = 90,
    intervalMs: number = 2000
  ): Promise<MidjourneyGenerateResponse> {
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.config.baseUrl}/task/${taskId}`, {
          headers: {
            'x-api-key': this.config.apiKey,
          },
        });
        
        if (!response.ok) {
          console.error(`[LegNext] Poll error: ${response.status}`);
          await new Promise(resolve => setTimeout(resolve, intervalMs));
          continue;
        }
        
        const result = await response.json();
        
        console.log(`[LegNext] Task ${taskId} status: ${result.status}`);
        
        if (result.status === 'completed') {
          const imageUrl = result.output?.image_url || result.output?.image_urls?.[0];
          
          if (imageUrl) {
            return {
              success: true,
              taskId,
              status: 'completed',
              imageUrl,
              thumbnailUrl: imageUrl,
              pointsUsed: result.meta?.usage?.consume || 4,
            };
          }
        }
        
        if (result.status === 'failed') {
          return {
            success: false,
            taskId,
            status: 'failed',
            pointsUsed: 0,
            error: result.error?.message || 'Generation failed',
          };
        }
        
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        
      } catch (error: any) {
        console.error(`[LegNext] Poll attempt ${attempt + 1} failed:`, error.message);
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
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
        console.error(`[LegNext] Balance check failed: ${response.status}`);
        return { points: 0, plan: 'unknown' };
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
