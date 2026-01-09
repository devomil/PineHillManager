import { QUALITY_TIERS, QualityTier, QualityTierConfig } from '../config/quality-tiers';
import { VIDEO_PROVIDERS } from '../config/video-providers';

interface RoutingRequest {
  visualDirection: string;
  sceneType: string;
  duration: number;
  aspectRatio: string;
  qualityTier: QualityTier;
  preferredProvider?: string;
  requireAudio?: boolean;
  requireMotionControl?: boolean;
  hasReferenceImage?: boolean;
  hasReferenceVideo?: boolean;
}

interface RoutingResult {
  provider: string;
  providerName: string;
  estimatedCost: number;
  qualityScore: number;
  matchReasons: string[];
  alternatives: Array<{
    provider: string;
    cost: number;
    reason: string;
  }>;
}

class QualityAwareProviderRouter {
  route(request: RoutingRequest): RoutingResult {
    const tierConfig = QUALITY_TIERS[request.qualityTier];
    
    let candidates = this.getPreferredProviders(tierConfig);
    candidates = this.filterByCapabilities(candidates, request);
    candidates = this.filterByQualityMinimums(candidates, tierConfig);
    
    const scored = this.scoreProviders(candidates, request, tierConfig);
    scored.sort((a, b) => b.score - a.score);
    
    if (scored.length === 0) {
      const allProviders = Object.keys(VIDEO_PROVIDERS).filter(id => {
        const provider = VIDEO_PROVIDERS[id];
        return provider.capabilities.textToVideo || provider.capabilities.imageToVideo;
      });
      
      const fallbackScored = this.scoreProviders(allProviders, request, tierConfig);
      fallbackScored.sort((a, b) => b.score - a.score);
      
      if (fallbackScored.length === 0) {
        return {
          provider: 'kling-2.6',
          providerName: 'Kling 2.6',
          estimatedCost: this.estimateCost(VIDEO_PROVIDERS['kling-2.6'], request.duration),
          qualityScore: 50,
          matchReasons: ['Fallback provider'],
          alternatives: [],
        };
      }
      
      scored.push(...fallbackScored);
    }
    
    const best = scored[0];
    const provider = VIDEO_PROVIDERS[best.providerId];
    
    return {
      provider: best.providerId,
      providerName: provider.name,
      estimatedCost: this.estimateCost(provider, request.duration),
      qualityScore: best.score,
      matchReasons: best.reasons,
      alternatives: scored.slice(1, 4).map(s => ({
        provider: s.providerId,
        cost: this.estimateCost(VIDEO_PROVIDERS[s.providerId], request.duration),
        reason: s.reasons[0] || 'Alternative option',
      })),
    };
  }
  
  private getPreferredProviders(tierConfig: QualityTierConfig): string[] {
    return tierConfig.preferredVideoProviders.filter(id => VIDEO_PROVIDERS[id]);
  }
  
  private filterByCapabilities(providerIds: string[], request: RoutingRequest): string[] {
    return providerIds.filter(id => {
      const provider = VIDEO_PROVIDERS[id];
      if (!provider) return false;
      
      const caps = provider.capabilities;
      
      if (request.requireAudio && !caps.nativeAudio) {
        return false;
      }
      
      if (request.requireMotionControl) {
        if (!id.includes('motion-control')) {
          return false;
        }
      }
      
      if (request.hasReferenceImage && !caps.imageToVideo) {
        return false;
      }
      
      if (request.hasReferenceVideo) {
        if (!id.includes('motion-control') && !(caps as any).videoToVideo) {
          return false;
        }
      }
      
      if (request.duration > caps.maxDuration) {
        return false;
      }
      
      return true;
    });
  }
  
  private filterByQualityMinimums(providerIds: string[], tierConfig: QualityTierConfig): string[] {
    const qualityOrder = ['basic', 'good', 'excellent', 'cinematic'];
    const consistencyOrder = ['low', 'medium', 'high'];
    const resolutionOrder = ['720p', '1080p', '4k'];
    
    const minQualityIndex = qualityOrder.indexOf(tierConfig.minMotionQuality);
    const minConsistencyIndex = consistencyOrder.indexOf(tierConfig.minTemporalConsistency);
    const minResolutionIndex = resolutionOrder.indexOf(tierConfig.minResolution);
    
    return providerIds.filter(id => {
      const provider = VIDEO_PROVIDERS[id];
      if (!provider) return false;
      
      const caps = provider.capabilities;
      
      const qualityIndex = qualityOrder.indexOf(caps.motionQuality);
      const consistencyIndex = consistencyOrder.indexOf(caps.temporalConsistency);
      const resolutionIndex = resolutionOrder.indexOf(caps.maxResolution);
      
      return (
        qualityIndex >= minQualityIndex &&
        consistencyIndex >= minConsistencyIndex &&
        resolutionIndex >= minResolutionIndex
      );
    });
  }
  
  private scoreProviders(
    providerIds: string[],
    request: RoutingRequest,
    tierConfig: QualityTierConfig
  ): Array<{ providerId: string; score: number; reasons: string[] }> {
    return providerIds.map(id => {
      const provider = VIDEO_PROVIDERS[id];
      if (!provider) return { providerId: id, score: 0, reasons: [] };
      
      const caps = provider.capabilities;
      const reasons: string[] = [];
      let score = 0;
      
      const qualityScores: Record<string, number> = { basic: 0, good: 25, excellent: 50, cinematic: 75 };
      score += qualityScores[caps.motionQuality] || 0;
      if (caps.motionQuality === 'cinematic') {
        reasons.push('Cinematic motion quality');
      }
      
      const consistencyScores: Record<string, number> = { low: 0, medium: 15, high: 30 };
      score += consistencyScores[caps.temporalConsistency] || 0;
      
      const resolutionScores: Record<string, number> = { '720p': 0, '1080p': 10, '4k': 25 };
      score += resolutionScores[caps.maxResolution] || 0;
      
      const detectedNeeds = this.detectContentNeeds(request.visualDirection, request.sceneType);
      
      for (const need of detectedNeeds) {
        if (caps.strengths.includes(need as any)) {
          score += 20;
          reasons.push(`Strong at: ${need}`);
        }
      }
      
      for (const need of detectedNeeds) {
        if (caps.weaknesses.includes(need as any)) {
          score -= 30;
          reasons.push(`Weak at: ${need} (penalty)`);
        }
      }
      
      if (caps.nativeAudio) {
        score += 25;
        reasons.push('Native audio generation');
      }
      
      const preferredIndex = tierConfig.preferredVideoProviders.indexOf(id);
      if (preferredIndex >= 0) {
        score += Math.max(0, 30 - (preferredIndex * 3));
        if (preferredIndex < 3) {
          reasons.push('Top tier preference');
        }
      }
      
      return { providerId: id, score, reasons };
    }).filter(s => s.score > 0);
  }
  
  private detectContentNeeds(visualDirection: string, sceneType: string): string[] {
    const needs: string[] = [];
    const lower = (visualDirection || '').toLowerCase();
    
    if (/\b(person|woman|man|face|people|human)\b/.test(lower)) {
      needs.push('human-faces');
    }
    if (/\b(walking|running|moving|dancing|gesture)\b/.test(lower)) {
      needs.push('human-motion');
    }
    if (/\b(hand|hands|finger|grip|hold|pour|stretch)\b/.test(lower)) {
      needs.push('hand-actions');
    }
    if (/\b(talking|speaking|interview|testimonial)\b/.test(lower)) {
      needs.push('talking-heads');
    }
    if (/\b(product|bottle|package|supplement|item)\b/.test(lower)) {
      needs.push('product-shots');
    }
    if (/\b(nature|forest|ocean|sky|outdoor|landscape)\b/.test(lower)) {
      needs.push('nature-scenes');
    }
    if (/\b(cinematic|dramatic|film|movie|epic)\b/.test(lower)) {
      needs.push('cinematic');
    }
    if (/\b(animated|cartoon|stylized|artistic)\b/.test(lower)) {
      needs.push('stylized');
    }
    if (/\b(food|cooking|kitchen|ingredient|recipe|eating)\b/.test(lower)) {
      needs.push('food-content');
    }
    
    if (sceneType === 'product-shot') needs.push('product-shots');
    if (sceneType === 'testimonial') needs.push('talking-heads');
    if (sceneType === 'b-roll') needs.push('nature-scenes');
    
    return [...new Set(needs)];
  }
  
  private estimateCost(provider: typeof VIDEO_PROVIDERS[string], durationSeconds: number): number {
    if (!provider) return 0;
    const segments = Math.ceil(durationSeconds / 10);
    return segments * provider.costPer10Seconds;
  }
}

export const qualityAwareProviderRouter = new QualityAwareProviderRouter();
