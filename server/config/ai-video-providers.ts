// server/config/ai-video-providers.ts

export interface AIVideoProvider {
  name: string;
  type: 'direct' | 'piapi';
  apiKey: string;
  endpoint: string;
  model?: string;
  maxDuration: number;
  costPerSecond: number;
  strengths: string[];
  priority: number;
}

export const AI_VIDEO_PROVIDERS: Record<string, AIVideoProvider> = {
  runway: {
    name: 'Runway Gen-3 Alpha',
    type: 'direct',
    apiKey: process.env.RUNWAY_API_KEY || '',
    endpoint: 'https://api.dev.runwayml.com/v1',
    maxDuration: 10,
    costPerSecond: 0.05,
    strengths: ['hook', 'cta', 'cinematic', 'dramatic', 'emotional'],
    priority: 1,
  },
  
  kling: {
    name: 'Kling AI',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'kling',
    maxDuration: 10,
    costPerSecond: 0.03,
    strengths: ['testimonial', 'lifestyle', 'human', 'expressions', 'story', 'face'],
    priority: 1,
  },
  
  luma: {
    name: 'Luma Dream Machine',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'luma',
    maxDuration: 5,
    costPerSecond: 0.04,
    strengths: ['product', 'reveal', 'camera-motion', 'dynamic', 'brand'],
    priority: 2,
  },
  
  hailuo: {
    name: 'Hailuo (Minimax)',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'hailuo',
    maxDuration: 6,
    costPerSecond: 0.02,
    strengths: ['broll', 'nature', 'abstract', 'supplementary', 'explanation'],
    priority: 3,
  },
  
  hunyuan: {
    name: 'Hunyuan',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'hunyuan',
    maxDuration: 5,
    costPerSecond: 0.025,
    strengths: ['broll', 'nature', 'abstract'],
    priority: 4,
  },
  
  veo: {
    name: 'Veo 3.1 (Google)',
    type: 'piapi',
    apiKey: process.env.PIAPI_API_KEY || '',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'veo3.1',
    maxDuration: 8,
    costPerSecond: 0.06,
    strengths: ['cinematic', 'high-quality', 'dramatic'],
    priority: 2,
  },
};

export function isProviderConfigured(providerKey: string): boolean {
  const provider = AI_VIDEO_PROVIDERS[providerKey];
  return provider && provider.apiKey.length > 0;
}

export function getConfiguredProviders(): string[] {
  return Object.keys(AI_VIDEO_PROVIDERS).filter(isProviderConfigured);
}

export function selectProvidersForScene(
  sceneType: string, 
  visualPrompt: string
): string[] {
  const configuredProviders = getConfiguredProviders();
  
  if (configuredProviders.length === 0) {
    return [];
  }

  const scores: Array<{ key: string; score: number }> = [];
  
  for (const providerKey of configuredProviders) {
    const provider = AI_VIDEO_PROVIDERS[providerKey];
    let score = 100 - (provider.priority * 10);
    
    if (provider.strengths.includes(sceneType)) {
      score += 50;
    }
    
    const promptLower = visualPrompt.toLowerCase();
    
    if (promptLower.match(/person|woman|man|face|expression|talking|smiling|people/)) {
      if (providerKey === 'kling') score += 30;
    }
    
    if (promptLower.match(/cinematic|dramatic|camera|slow.motion|sweeping|epic/)) {
      if (providerKey === 'runway' || providerKey === 'veo') score += 30;
    }
    
    if (promptLower.match(/product|reveal|bottle|package|zoom|showcase/)) {
      if (providerKey === 'luma') score += 30;
    }
    
    if (promptLower.match(/nature|forest|sky|abstract|background|environment/)) {
      if (providerKey === 'hailuo' || providerKey === 'hunyuan') score += 20;
    }
    
    scores.push({ key: providerKey, score });
  }
  
  const sorted = scores.sort((a, b) => b.score - a.score);
  
  console.log(`[ProviderSelect] Scene: ${sceneType}`);
  console.log(`[ProviderSelect] Scores:`, sorted.map(s => `${s.key}:${s.score}`).join(', '));
  
  return sorted.map(s => s.key);
}
