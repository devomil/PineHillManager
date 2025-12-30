// server/services/video-provider-selector.ts - Phase 7A: Intelligent Provider Selection

import { VIDEO_PROVIDERS, VideoProvider } from '../../shared/provider-config';
import { VISUAL_STYLES } from '../../shared/visual-style-config';

export interface ProviderSelection {
  provider: VideoProvider;
  reason: string;
  confidence: number;
  alternatives: string[];
}

export interface SceneForSelection {
  sceneIndex: number;
  sceneType: string;
  contentType: string;
  narration: string;
  visualDirection: string;
  duration: number;
}

class VideoProviderSelectorService {
  
  selectProvider(
    scene: SceneForSelection,
    visualStyle: string
  ): ProviderSelection {
    const styleConfig = VISUAL_STYLES[visualStyle] || VISUAL_STYLES.professional;
    const scores: Record<string, number> = {};
    const reasons: Record<string, string[]> = {};
    
    Object.keys(VIDEO_PROVIDERS).forEach(id => {
      scores[id] = 50;
      reasons[id] = [];
    });
    
    this.scoreByContentType(scene.contentType, scores, reasons);
    this.scoreBySceneType(scene.sceneType, scores, reasons);
    this.scoreByVisualDirection(scene.visualDirection, scores, reasons);
    this.scoreByStylePreferences(styleConfig.preferredVideoProviders || [], scores, reasons);
    this.scoreByDuration(scene.duration, scores, reasons);
    
    const sortedProviders = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);
    
    const bestProviderId = sortedProviders[0][0];
    const bestScore = sortedProviders[0][1];
    const bestProvider = VIDEO_PROVIDERS[bestProviderId];
    
    return {
      provider: bestProvider,
      reason: reasons[bestProviderId].slice(0, 2).join('; ') || 'Default selection',
      confidence: Math.min(100, bestScore),
      alternatives: sortedProviders.slice(1, 3).map(([id]) => id),
    };
  }
  
  selectProvidersForProject(
    scenes: SceneForSelection[],
    visualStyle: string
  ): Map<number, ProviderSelection> {
    const selections = new Map<number, ProviderSelection>();
    
    scenes.forEach(scene => {
      const selection = this.selectProvider(scene, visualStyle);
      selections.set(scene.sceneIndex, selection);
    });
    
    const providerCounts: Record<string, number> = {};
    selections.forEach(sel => {
      providerCounts[sel.provider.id] = (providerCounts[sel.provider.id] || 0) + 1;
    });
    
    console.log('[ProviderSelector] Selection summary:');
    Object.entries(providerCounts).forEach(([id, count]) => {
      console.log(`  ${VIDEO_PROVIDERS[id]?.displayName || id}: ${count} scenes`);
    });
    
    return selections;
  }
  
  private scoreByContentType(
    contentType: string,
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    switch (contentType) {
      case 'person':
        scores.kling += 30;
        reasons.kling.push('Best for human subjects');
        scores.runway += 15;
        break;
        
      case 'product':
        scores.luma += 30;
        reasons.luma.push('Excellent product reveals');
        scores.runway += 20;
        reasons.runway.push('Premium product quality');
        break;
        
      case 'nature':
        scores.hailuo += 25;
        reasons.hailuo.push('Cost-effective nature scenes');
        scores.hunyuan += 20;
        scores.runway += 20;
        reasons.runway.push('Cinematic landscapes');
        break;
        
      case 'abstract':
        scores.kling += 20;
        reasons.kling.push('Creative motion handling');
        scores.hunyuan += 15;
        scores.runway += 15;
        break;
        
      case 'lifestyle':
        scores.kling += 25;
        reasons.kling.push('Natural lifestyle rendering');
        scores.hailuo += 15;
        break;
    }
  }
  
  private scoreBySceneType(
    sceneType: string,
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    switch (sceneType) {
      case 'hook':
        scores.runway += 25;
        reasons.runway.push('Cinematic hook impact');
        scores.veo += 20;
        reasons.veo.push('High-quality opening');
        break;
        
      case 'problem':
      case 'agitation':
        scores.kling += 20;
        reasons.kling.push('Authentic emotional expressions');
        break;
        
      case 'solution':
        scores.runway += 15;
        scores.kling += 15;
        break;
        
      case 'benefit':
        scores.kling += 20;
        reasons.kling.push('Lifestyle transformation scenes');
        break;
        
      case 'product':
        scores.luma += 30;
        reasons.luma.push('Product showcase specialty');
        scores.runway += 15;
        break;
        
      case 'testimonial':
        scores.kling += 30;
        reasons.kling.push('Best for talking heads');
        break;
        
      case 'cta':
        scores.runway += 20;
        reasons.runway.push('Premium closing impact');
        scores.veo += 15;
        break;
        
      case 'broll':
      case 'explanation':
        scores.hailuo += 25;
        reasons.hailuo.push('Cost-effective B-roll');
        scores.hunyuan += 15;
        break;
    }
  }
  
  private scoreByVisualDirection(
    visualDirection: string,
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    if (!visualDirection) return;
    
    const lower = visualDirection.toLowerCase();
    
    if (/cinematic|dramatic|epic|film|movie|golden hour|sweeping/.test(lower)) {
      scores.runway += 20;
      reasons.runway.push('Cinematic visual direction');
      scores.veo += 15;
    }
    
    if (/person|woman|man|face|expression|people|customer|talking|smiling/.test(lower)) {
      scores.kling += 25;
      reasons.kling.push('Human subject in visual');
    }
    
    if (/product|bottle|package|reveal|showcase|display|object/.test(lower)) {
      scores.luma += 20;
      reasons.luma.push('Product focus in visual');
    }
    
    if (/nature|landscape|outdoor|garden|field|ambient|background|farm|natural/.test(lower)) {
      scores.hailuo += 15;
      reasons.hailuo.push('Nature/ambient scene');
      scores.hunyuan += 10;
    }
    
    if (/wellness|spa|calm|peaceful|serene|relaxing/.test(lower)) {
      scores.kling += 15;
      reasons.kling.push('Wellness atmosphere');
    }
  }
  
  private scoreByStylePreferences(
    preferredProviders: string[],
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    preferredProviders.forEach((provider, index) => {
      const bonus = 15 - (index * 5);
      if (scores[provider] !== undefined && bonus > 0) {
        scores[provider] += bonus;
        reasons[provider].push('Style preference');
      }
    });
  }
  
  private scoreByDuration(
    duration: number,
    scores: Record<string, number>,
    reasons: Record<string, string[]>
  ): void {
    Object.entries(VIDEO_PROVIDERS).forEach(([id, provider]) => {
      if (duration > provider.maxDuration) {
        scores[id] -= 30;
        reasons[id].push(`Duration exceeds ${provider.maxDuration}s max`);
      }
    });
  }
  
  calculateTotalCost(
    selections: Map<number, ProviderSelection>,
    scenes: SceneForSelection[]
  ): { total: number; breakdown: Record<string, number> } {
    const breakdown: Record<string, number> = {};
    let total = 0;
    
    selections.forEach((selection, sceneIndex) => {
      const scene = scenes.find(s => s.sceneIndex === sceneIndex);
      if (scene) {
        const cost = scene.duration * selection.provider.costPerSecond;
        breakdown[selection.provider.id] = (breakdown[selection.provider.id] || 0) + cost;
        total += cost;
      }
    });
    
    return { total, breakdown };
  }
  
  getProviderSummary(
    selections: Map<number, ProviderSelection>
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    selections.forEach(sel => {
      counts[sel.provider.id] = (counts[sel.provider.id] || 0) + 1;
    });
    return counts;
  }
}

export const videoProviderSelector = new VideoProviderSelectorService();
