// server/config/ai-video-providers.ts

export interface AIVideoProvider {
  name: string;
  apiKey: string;
  endpoint: string;
  maxDuration: number;
  costPerSecond: number;
  strengths: string[];
}

export const AI_VIDEO_PROVIDERS: Record<string, AIVideoProvider> = {
  runway: {
    name: 'Runway Gen-3 Alpha',
    apiKey: process.env.RUNWAY_API_KEY || '',
    endpoint: 'https://api.runwayml.com/v1',
    maxDuration: 10,
    costPerSecond: 0.05,
    strengths: ['hook', 'cta', 'emotional', 'cinematic', 'testimonial'],
  },
};

export function isProviderConfigured(providerKey: string): boolean {
  const provider = AI_VIDEO_PROVIDERS[providerKey];
  return provider && provider.apiKey.length > 0;
}

export function getConfiguredProviders(): string[] {
  return Object.keys(AI_VIDEO_PROVIDERS).filter(isProviderConfigured);
}
