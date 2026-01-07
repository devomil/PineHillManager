import { VIDEO_PROVIDERS, getAllVideoProviders } from '../config/video-providers';
import { promptComplexityAnalyzer } from './prompt-complexity-analyzer';
import { VideoProvider, ComplexityAnalysis, RoutingDecision, ProviderStrength } from '@shared/types/video-providers';

type SceneType = 'b-roll' | 'talking-head' | 'product' | 'lifestyle' | 'cinematic' | 'hook' | 'cta' | 'testimonial' | 'explanation';

export interface SceneRequirements {
  needsAudio?: boolean;
  needsVoice?: boolean;
  hasMotionReference?: boolean;
  qualityTier?: 'standard' | 'premium';
  audioType?: string[];
}

export interface AudioRequirements {
  needsAudio: boolean;
  needsVoice: boolean;
  audioType: string[];
}

class SmartProviderRouter {
  
  // Audio detection keywords
  private readonly AUDIO_VOICE_KEYWORDS = [
    'speaking', 'talking', 'says', 'dialogue', 'conversation',
    'interview', 'narrator', 'announcer', 'presenter', 'host',
  ];
  
  private readonly AUDIO_SFX_KEYWORDS = [
    'splash', 'pour', 'sizzle', 'crunch', 'click', 'footsteps',
    'door', 'applause', 'music', 'knock', 'bell', 'ring',
  ];
  
  private readonly AUDIO_AMBIENT_KEYWORDS = [
    'outdoor', 'forest', 'ocean', 'city', 'cafe', 'restaurant',
    'office', 'nature', 'street', 'crowd', 'park', 'beach',
  ];
  
  private readonly STRENGTH_KEYWORDS: Record<string, string[]> = {
    'human-faces': ['face', 'person', 'people', 'man', 'woman', 'portrait', 'expression'],
    'human-motion': ['walking', 'running', 'dancing', 'moving', 'gesture', 'motion'],
    'hand-actions': ['hand', 'hands', 'finger', 'holding', 'touching', 'grabbing'],
    'food-content': ['food', 'cooking', 'kitchen', 'recipe', 'ingredient', 'dough', 'pizza', 'baking'],
    'product-shots': ['product', 'bottle', 'package', 'item', 'display', 'showcase', 'reveal'],
    'nature-scenes': ['nature', 'forest', 'ocean', 'mountain', 'landscape', 'outdoor', 'sky', 'sunset'],
    'cinematic': ['cinematic', 'dramatic', 'epic', 'film', 'movie'],
    'b-roll': ['b-roll', 'background', 'ambient', 'establishing', 'supplementary'],
    'camera-movement': ['pan', 'zoom', 'dolly', 'tracking', 'orbit', 'sweeping'],
    'talking-heads': ['talking', 'speaking', 'interview', 'presenter', 'host'],
    'stylized': ['stylized', 'artistic', 'creative', 'unique'],
    'animated': ['animated', 'animation', 'cartoon', 'motion graphic'],
    'fast-motion': ['fast', 'quick', 'rapid', 'speed'],
    'slow-motion': ['slow motion', 'slow-mo', 'slow', 'graceful'],
  };
  
  private readonly WEAKNESS_KEYWORDS: Record<string, string[]> = {
    'specific-actions': ['stretching', 'pulling', 'kneading', 'precise', 'exactly', 'specific'],
    'text-in-video': ['text', 'title', 'subtitle', 'logo', 'writing', 'words'],
    'complex-motion': ['complex', 'intricate', 'detailed motion', 'elaborate'],
    'translucent-materials': ['translucent', 'transparent', 'see-through', 'glass', 'crystal'],
    'fine-details': ['detail', 'intricate', 'precise', 'exact', 'fine'],
    'multiple-subjects': ['multiple', 'several', 'many', 'group of'],
    'physics-accuracy': ['physics', 'realistic', 'accurate', 'gravity'],
  };
  
  route(
    visualDirection: string,
    sceneType: SceneType = 'b-roll',
    preferredProvider?: string
  ): RoutingDecision {
    
    const complexity = promptComplexityAnalyzer.analyze(visualDirection);
    
    const candidates = this.getCandidates(sceneType, complexity);
    
    const scored = this.scoreCandidates(candidates, visualDirection, complexity, preferredProvider);
    
    const best = scored[0];
    const alternatives = scored.slice(1, 4);
    
    const reasoning = this.buildReasoning(best.provider, visualDirection, complexity);
    const warnings = this.buildWarnings(complexity, best.provider);
    
    console.log(`[SmartRouter] Routed to ${best.provider.id} (confidence: ${best.score.toFixed(2)}) for: "${visualDirection.substring(0, 50)}..."`);
    
    return {
      recommendedProvider: best.provider.id,
      confidence: best.score,
      reasoning,
      alternatives: alternatives.map(a => ({
        provider: a.provider.id,
        reason: a.reason,
      })),
      warnings,
      complexity,
    };
  }
  
  private getCandidates(
    sceneType: SceneType,
    complexity: ComplexityAnalysis
  ): VideoProvider[] {
    
    const videoProviders = getAllVideoProviders();
    
    if (complexity.category === 'impossible') {
      return videoProviders.filter(p => 
        p.capabilities.motionQuality === 'excellent' || 
        p.capabilities.motionQuality === 'cinematic'
      );
    }
    
    return videoProviders;
  }
  
  private scoreCandidates(
    candidates: VideoProvider[],
    visualDirection: string,
    complexity: ComplexityAnalysis,
    preferredProvider?: string
  ): Array<{ provider: VideoProvider; score: number; reason: string }> {
    
    const lower = visualDirection.toLowerCase();
    
    return candidates.map(provider => {
      let score = 0.5;
      let reason = '';
      
      for (const strength of provider.capabilities.strengths) {
        if (this.strengthMatchesContent(strength, lower)) {
          score += 0.15;
          reason = `Good for ${strength}`;
        }
      }
      
      for (const weakness of provider.capabilities.weaknesses) {
        if (this.weaknessMatchesContent(weakness, lower)) {
          score -= 0.2;
        }
      }
      
      if (complexity.category === 'complex' || complexity.category === 'impossible') {
        if (provider.capabilities.motionQuality === 'cinematic') score += 0.2;
        else if (provider.capabilities.motionQuality === 'excellent') score += 0.1;
        if (provider.capabilities.temporalConsistency === 'high') score += 0.1;
      }
      
      if (complexity.recommendations.bestProviders.includes(provider.id)) {
        score += 0.25;
        reason = 'Recommended for this content type';
      }
      
      if (complexity.recommendations.avoidProviders.includes(provider.id)) {
        score -= 0.3;
      }
      
      if (preferredProvider && provider.id === preferredProvider) {
        score += 0.1;
        reason = 'User preferred provider';
      }
      
      const costFactor = 1 - (provider.costPer10Seconds / 1.0);
      score += costFactor * 0.05;
      
      return { provider, score: Math.max(0, Math.min(1, score)), reason };
    }).sort((a, b) => b.score - a.score);
  }
  
  private strengthMatchesContent(strength: string, content: string): boolean {
    const keywords = this.STRENGTH_KEYWORDS[strength] || [];
    return keywords.some(k => content.includes(k));
  }
  
  private weaknessMatchesContent(weakness: string, content: string): boolean {
    const keywords = this.WEAKNESS_KEYWORDS[weakness] || [];
    return keywords.some(k => content.includes(k));
  }
  
  private buildReasoning(
    provider: VideoProvider,
    visualDirection: string,
    complexity: ComplexityAnalysis
  ): string[] {
    const reasons: string[] = [];
    
    reasons.push(`${provider.name} selected as best match`);
    
    if (complexity.category !== 'simple') {
      reasons.push(`Prompt complexity: ${complexity.category}`);
    }
    
    const matchingStrengths = provider.capabilities.strengths.filter(s =>
      this.strengthMatchesContent(s, visualDirection.toLowerCase())
    );
    if (matchingStrengths.length > 0) {
      reasons.push(`Strengths match: ${matchingStrengths.join(', ')}`);
    }
    
    if (provider.capabilities.motionQuality === 'cinematic' || provider.capabilities.motionQuality === 'excellent') {
      reasons.push(`Motion quality: ${provider.capabilities.motionQuality}`);
    }
    
    reasons.push(`Cost: $${provider.costPer10Seconds.toFixed(2)}/10s`);
    
    return reasons;
  }
  
  private buildWarnings(
    complexity: ComplexityAnalysis,
    provider: VideoProvider
  ): string[] {
    const warnings: string[] = [];
    
    if (complexity.userWarning) {
      warnings.push(complexity.userWarning);
    }
    
    if (complexity.category === 'impossible') {
      warnings.push(`Even ${provider.name} may struggle with this prompt. Consider simplifying.`);
    }
    
    if (complexity.recommendations.simplifiedPrompt) {
      warnings.push(`Suggested simplified prompt: "${complexity.recommendations.simplifiedPrompt}"`);
    }
    
    if (complexity.recommendations.alternativeApproach) {
      const approachNames: Record<string, string> = {
        'stock-footage': 'stock footage',
        'reference-image': 'a reference image',
        'motion-graphics': 'motion graphics',
      };
      warnings.push(`Consider using ${approachNames[complexity.recommendations.alternativeApproach]} for better results.`);
    }
    
    return warnings;
  }
  
  routeMultipleScenes(
    scenes: Array<{ visualDirection: string; sceneType: SceneType }>
  ): Array<RoutingDecision> {
    return scenes.map(scene => this.route(scene.visualDirection, scene.sceneType));
  }
  
  getProviderInfo(providerId: string): VideoProvider | undefined {
    return VIDEO_PROVIDERS[providerId];
  }
  
  getAllProviders(): VideoProvider[] {
    return getAllVideoProviders();
  }
  
  /**
   * Detect audio requirements from visual direction and narration
   * Phase 13 Addendum: Routes to Kling 2.6 when audio needed
   */
  detectAudioRequirements(
    visualDirection: string,
    narration?: string
  ): AudioRequirements {
    const lower = visualDirection.toLowerCase();
    const audioTypes: string[] = [];
    
    // Detect voice requirements
    const needsVoice = this.AUDIO_VOICE_KEYWORDS.some(k => lower.includes(k));
    if (needsVoice) audioTypes.push('voice');
    
    // Detect sound effect requirements
    const hasSfx = this.AUDIO_SFX_KEYWORDS.some(k => lower.includes(k));
    if (hasSfx) audioTypes.push('sound-effect');
    
    // Detect ambient requirements
    const hasAmbient = this.AUDIO_AMBIENT_KEYWORDS.some(k => lower.includes(k));
    if (hasAmbient) audioTypes.push('ambient');
    
    return {
      needsAudio: audioTypes.length > 0,
      needsVoice,
      audioType: audioTypes,
    };
  }
  
  /**
   * Route with scene requirements including audio/motion control needs
   * Phase 13 Addendum: Smart routing to Kling 2.6 for audio-required scenes
   */
  routeWithRequirements(
    visualDirection: string,
    sceneType: SceneType = 'b-roll',
    requirements?: SceneRequirements,
    preferredProvider?: string
  ): RoutingDecision {
    
    // If explicit audio requirements or motion reference provided
    if (requirements?.needsAudio || requirements?.needsVoice) {
      // Route to Kling 2.6 for native audio
      const tier = requirements.qualityTier;
      const providerId = tier === 'premium' ? 'kling-2.6-pro' : 'kling-2.6';
      const provider = VIDEO_PROVIDERS[providerId];
      
      if (provider) {
        console.log(`[SmartRouter] Routing to ${providerId} for audio requirements`);
        // Build tier-appropriate alternatives
        const alternatives = tier === 'premium' 
          ? [
              { provider: 'kling-2.6', reason: 'Standard audio quality at lower cost' },
              { provider: 'kling-avatar', reason: 'For longer talking head content' },
            ]
          : [
              { provider: 'kling-2.6-pro', reason: 'Premium audio quality' },
              { provider: 'kling-avatar', reason: 'For longer talking head content' },
            ];
            
        return {
          recommendedProvider: providerId,
          confidence: 0.95,
          reasoning: [
            `${provider.name} selected for native audio generation`,
            `Audio requirements: ${requirements.audioType?.join(', ') || 'detected'}`,
            'Eliminates need for separate audio sync',
            `Cost: $${provider.costPer10Seconds.toFixed(2)}/10s`,
          ],
          alternatives,
          warnings: [],
          complexity: promptComplexityAnalyzer.analyze(visualDirection),
        };
      }
    }
    
    // If motion reference video provided, route to Motion Control
    if (requirements?.hasMotionReference) {
      const tier = requirements.qualityTier;
      const providerId = tier === 'premium' 
        ? 'kling-2.6-motion-control-pro' 
        : 'kling-2.6-motion-control';
      const provider = VIDEO_PROVIDERS[providerId];
      
      if (provider) {
        console.log(`[SmartRouter] Routing to ${providerId} for motion transfer`);
        // Build tier-appropriate alternatives for motion control
        const alternatives = tier === 'premium'
          ? [
              { provider: 'kling-2.6-motion-control', reason: 'Standard motion control at lower cost' },
              { provider: 'kling-2.6-pro', reason: 'Standard video with audio (no motion transfer)' },
            ]
          : [
              { provider: 'kling-2.6-motion-control-pro', reason: 'Premium motion control for complex choreography' },
              { provider: 'kling-2.6', reason: 'Standard video with audio (no motion transfer)' },
            ];
            
        return {
          recommendedProvider: providerId,
          confidence: 0.95,
          reasoning: [
            `${provider.name} selected for motion transfer`,
            'Transfers motion from reference video to character',
            'Supports up to 30 seconds duration',
            `Cost: $${provider.costPer10Seconds.toFixed(2)}/10s`,
          ],
          alternatives,
          warnings: ['Motion Control requires a reference video (3-30 seconds)'],
          complexity: promptComplexityAnalyzer.analyze(visualDirection),
        };
      }
    }
    
    // Auto-detect audio requirements from content
    const audioReqs = this.detectAudioRequirements(visualDirection);
    if (audioReqs.needsAudio && !preferredProvider) {
      // Boost Kling 2.6 providers in the standard routing
      console.log(`[SmartRouter] Audio detected: ${audioReqs.audioType.join(', ')}`);
    }
    
    // Fall back to standard routing
    return this.route(visualDirection, sceneType, preferredProvider);
  }
}

export const smartProviderRouter = new SmartProviderRouter();
