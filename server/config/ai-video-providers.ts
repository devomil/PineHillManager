// server/config/ai-video-providers.ts

export interface AIVideoProvider {
  name: string;
  type: 'direct' | 'piapi';
  endpoint: string;
  model?: string;
  maxDuration: number;
  costPerSecond: number;
  strengths: string[];
  priority: number;
  getApiKey: () => string;
}

export interface AIVideoProviderWithKey extends Omit<AIVideoProvider, 'getApiKey'> {
  apiKey: string;
}

const providerConfigs: Record<string, AIVideoProvider> = {
  runway: {
    name: 'Runway Gen-3 Alpha',
    type: 'direct',
    endpoint: 'https://api.dev.runwayml.com/v1',
    maxDuration: 10,
    costPerSecond: 0.05,
    strengths: ['hook', 'cta', 'cinematic', 'dramatic', 'emotional'],
    priority: 1,
    getApiKey: () => process.env.RUNWAY_API_KEY || '',
  },
  
  kling: {
    name: 'Kling AI',
    type: 'piapi',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'kling',
    maxDuration: 10,
    costPerSecond: 0.03,
    strengths: ['testimonial', 'lifestyle', 'human', 'expressions', 'story', 'face'],
    priority: 1,
    getApiKey: () => process.env.PIAPI_API_KEY || '',
  },
  
  luma: {
    name: 'Luma Dream Machine',
    type: 'piapi',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'luma',
    maxDuration: 5,
    costPerSecond: 0.04,
    strengths: ['product', 'reveal', 'camera-motion', 'dynamic', 'brand'],
    priority: 2,
    getApiKey: () => process.env.PIAPI_API_KEY || '',
  },
  
  hailuo: {
    name: 'Hailuo (Minimax)',
    type: 'piapi',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'hailuo',
    maxDuration: 6,
    costPerSecond: 0.02,
    strengths: ['broll', 'nature', 'abstract', 'supplementary', 'explanation'],
    priority: 3,
    getApiKey: () => process.env.PIAPI_API_KEY || '',
  },
  
  hunyuan: {
    name: 'Hunyuan',
    type: 'piapi',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'hunyuan',
    maxDuration: 5,
    costPerSecond: 0.025,
    strengths: ['broll', 'nature', 'abstract'],
    priority: 4,
    getApiKey: () => process.env.PIAPI_API_KEY || '',
  },
  
  veo: {
    name: 'Veo 3.1 (Google)',
    type: 'piapi',
    endpoint: 'https://api.piapi.ai/api/v1/task',
    model: 'veo3.1',
    maxDuration: 8,
    costPerSecond: 0.06,
    strengths: ['cinematic', 'high-quality', 'dramatic'],
    priority: 2,
    getApiKey: () => process.env.PIAPI_API_KEY || '',
  },
};

export function getProvider(providerKey: string): AIVideoProviderWithKey | null {
  const config = providerConfigs[providerKey];
  if (!config) return null;
  
  return {
    name: config.name,
    type: config.type,
    endpoint: config.endpoint,
    model: config.model,
    maxDuration: config.maxDuration,
    costPerSecond: config.costPerSecond,
    strengths: config.strengths,
    priority: config.priority,
    apiKey: config.getApiKey(),
  };
}

export const AI_VIDEO_PROVIDERS = new Proxy({} as Record<string, AIVideoProviderWithKey>, {
  get(_target, prop: string) {
    return getProvider(prop);
  },
  ownKeys() {
    return Object.keys(providerConfigs);
  },
  getOwnPropertyDescriptor(_target, prop: string) {
    if (prop in providerConfigs) {
      return { enumerable: true, configurable: true };
    }
    return undefined;
  },
});

export function isProviderConfigured(providerKey: string): boolean {
  const provider = getProvider(providerKey);
  if (!provider) return false;
  return provider.apiKey.length > 0;
}

export function getConfiguredProviders(): string[] {
  const configured = Object.keys(providerConfigs).filter(isProviderConfigured);
  console.log(`[AI-Providers] Configured providers: ${configured.join(', ')}`);
  return configured;
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
    const provider = getProvider(providerKey);
    if (!provider) continue;
    
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
