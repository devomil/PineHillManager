// server/config/ai-video-providers.ts

import { smartProviderRouter } from '../services/smart-provider-router';
import { promptComplexityAnalyzer } from '../services/prompt-complexity-analyzer';
import type { RoutingDecision, ComplexityAnalysis } from '@shared/types/video-providers';

export { smartProviderRouter, promptComplexityAnalyzer };
export type { RoutingDecision, ComplexityAnalysis };

// Motion graphic keywords that should route to Remotion instead of AI video providers
const MOTION_GRAPHIC_KEYWORDS = [
  'animated', 'animation', 'motion graphic', 'kinetic',
  'split screen', 'montage', 'infographic', 'diagram',
  'transformation', 'morph', 'data visualization',
  'process flow', 'timeline', '2d', '3d animation',
  'before and after', 'comparison', 'picture in picture',
  'text overlay', 'typography', 'counter', 'progress bar',
  'tree growth', 'network', 'statistics', 'chart'
];

export function shouldUseRemotionMotionGraphics(visualDirection: string): boolean {
  const lower = visualDirection.toLowerCase();
  return MOTION_GRAPHIC_KEYWORDS.some(kw => lower.includes(kw));
}

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
  let config = providerConfigs[providerKey];
  
  // If versioned provider not found, try base provider name
  // e.g., 'kling-2.5' -> 'kling', 'kling-2.6-master' -> 'kling'
  if (!config) {
    const baseName = providerKey.split('-')[0];
    config = providerConfigs[baseName];
    if (config) {
      // Create a version-specific config
      return {
        name: `${config.name} (${providerKey})`,
        type: config.type,
        endpoint: config.endpoint,
        model: providerKey, // Use the full versioned name as the model
        maxDuration: config.maxDuration,
        costPerSecond: config.costPerSecond,
        strengths: config.strengths,
        priority: config.priority,
        apiKey: config.getApiKey(),
      };
    }
    return null;
  }
  
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
  // Check if this should be routed to Remotion motion graphics (cost: $0)
  if (shouldUseRemotionMotionGraphics(visualPrompt)) {
    console.log(`[ProviderSelect] Motion graphics detected, routing to Remotion: "${visualPrompt.substring(0, 50)}..."`);
    return ['remotion-motion-graphics'];
  }
  
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

const NEW_TO_LEGACY_PROVIDER_MAP: Record<string, string> = {
  // Kling Family (12 variants)
  'kling-1.6': 'kling',
  'kling-2.0': 'kling',
  'kling-2.1': 'kling',
  'kling-2.1-master': 'kling',
  'kling-2.5': 'kling',
  'kling-2.5-turbo': 'kling',
  'kling-2.6': 'kling',
  'kling-2.6-pro': 'kling',
  'kling-2.6-motion-control': 'kling',
  'kling-2.6-motion-control-pro': 'kling',
  'kling-effects': 'kling',
  'kling-avatar': 'kling',
  // Wan Family
  'wan-2.1': 'hailuo',
  'wan-2.6': 'hailuo',
  // Veo Family
  'veo-2': 'veo',
  'veo-3': 'veo',
  'veo-3.1': 'veo',
  // Hailuo Family
  'seedance-1.0': 'hailuo',
  'hailuo-minimax': 'hailuo',
  // Other providers
  'runway-gen3': 'runway',
  'luma-dream-machine': 'luma',
  'hunyuan': 'hunyuan',
  'flux-1-dev': 'flux-1-dev',
  'stable-diffusion-3': 'stable-diffusion-3',
  'remotion-motion-graphics': 'remotion-motion-graphics',
};

export function mapToLegacyProviderId(newProviderId: string): string {
  return NEW_TO_LEGACY_PROVIDER_MAP[newProviderId] || newProviderId;
}

export function isProviderExecutable(providerId: string): boolean {
  const legacyId = mapToLegacyProviderId(providerId);
  if (legacyId === 'remotion-motion-graphics') return true;
  return isProviderConfigured(legacyId);
}

export function getExecutableProviders(): string[] {
  return Object.keys(providerConfigs).filter(key => isProviderConfigured(key));
}

export function selectProvidersForSceneSmart(
  sceneType: string,
  visualPrompt: string
): RoutingDecision {
  if (shouldUseRemotionMotionGraphics(visualPrompt)) {
    return {
      recommendedProvider: 'remotion-motion-graphics',
      confidence: 1.0,
      reasoning: ['Motion graphics detected, routing to Remotion ($0 cost)'],
      alternatives: [],
      warnings: [],
      complexity: {
        score: 0,
        category: 'simple',
        factors: {
          specificAction: { detected: false, description: '', difficulty: 'easy' },
          materialProperties: { detected: false, properties: [], difficulty: 'easy' },
          motionRequirements: { detected: false, type: '', difficulty: 'easy' },
          elementCount: 0,
          temporalSequence: false,
        },
        recommendations: { bestProviders: ['remotion-motion-graphics'], avoidProviders: [] },
      },
    };
  }
  
  const sceneTypeMap: Record<string, 'b-roll' | 'talking-head' | 'product' | 'lifestyle' | 'cinematic' | 'hook' | 'cta' | 'testimonial' | 'explanation'> = {
    'broll': 'b-roll',
    'b-roll': 'b-roll',
    'talking-head': 'talking-head',
    'testimonial': 'testimonial',
    'product': 'product',
    'lifestyle': 'lifestyle',
    'cinematic': 'cinematic',
    'hook': 'hook',
    'cta': 'cta',
    'explanation': 'explanation',
  };
  
  const mappedSceneType = sceneTypeMap[sceneType.toLowerCase()] || 'b-roll';
  
  const decision = smartProviderRouter.route(visualPrompt, mappedSceneType);
  
  return {
    ...decision,
    recommendedProvider: mapToLegacyProviderId(decision.recommendedProvider),
    alternatives: decision.alternatives.map(alt => ({
      ...alt,
      provider: mapToLegacyProviderId(alt.provider),
    })),
    originalProviderId: decision.recommendedProvider,
  } as RoutingDecision & { originalProviderId: string };
}

export function analyzePromptComplexity(visualPrompt: string): ComplexityAnalysis {
  return promptComplexityAnalyzer.analyze(visualPrompt);
}
