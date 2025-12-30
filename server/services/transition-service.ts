export interface TransitionDesign {
  fromScene: number;
  toScene: number;
  type: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'zoom' | 'slide';
  duration: number;
  reason: string;
  moodMatch: string;
}

export interface ProjectTransitions {
  transitions: TransitionDesign[];
  summary: {
    cuts: number;
    fades: number;
    dissolves: number;
    wipes: number;
    zooms: number;
    slides: number;
  };
}

class TransitionService {
  
  designTransitions(
    scenes: Array<{
      sceneIndex: number;
      sceneType: string;
      mood?: string;
      duration: number;
    }>,
    visualStyle: string
  ): ProjectTransitions {
    const transitions: TransitionDesign[] = [];
    
    for (let i = 0; i < scenes.length - 1; i++) {
      const current = scenes[i];
      const next = scenes[i + 1];
      
      const transition = this.selectTransition(current, next, visualStyle);
      transitions.push(transition);
    }
    
    const summary = {
      cuts: transitions.filter(t => t.type === 'cut').length,
      fades: transitions.filter(t => t.type === 'fade').length,
      dissolves: transitions.filter(t => t.type === 'dissolve').length,
      wipes: transitions.filter(t => t.type === 'wipe').length,
      zooms: transitions.filter(t => t.type === 'zoom').length,
      slides: transitions.filter(t => t.type === 'slide').length,
    };
    
    console.log(`[Transitions] Designed ${transitions.length} mood-matched transitions`);
    console.log(`[Transitions] Types: ${summary.dissolves} dissolve, ${summary.fades} fade, ${summary.cuts} cut`);
    
    return { transitions, summary };
  }
  
  private selectTransition(
    current: { sceneIndex: number; sceneType: string; mood?: string },
    next: { sceneIndex: number; sceneType: string; mood?: string },
    visualStyle: string
  ): TransitionDesign {
    
    if (current.sceneType === 'hook') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'fade',
        duration: 0.5,
        reason: 'Hook to content - quick engagement',
        moodMatch: 'attention → focus',
      };
    }
    
    if (
      (current.sceneType === 'problem' || current.sceneType === 'agitation') &&
      (next.sceneType === 'solution' || next.sceneType === 'benefit')
    ) {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'dissolve',
        duration: 1.0,
        reason: 'Problem to solution - transformation moment',
        moodMatch: 'struggle → hope',
      };
    }
    
    if (next.sceneType === 'cta') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'fade',
        duration: 0.8,
        reason: 'Building to call-to-action',
        moodMatch: 'content → action',
      };
    }
    
    if (current.sceneType === 'explanation' && next.sceneType === 'explanation') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'cut',
        duration: 0.1,
        reason: 'Sequential information - clean cut',
        moodMatch: 'continuous learning',
      };
    }
    
    if (current.sceneType === 'benefit' && next.sceneType === 'benefit') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'dissolve',
        duration: 0.6,
        reason: 'Multiple benefits - flowing connection',
        moodMatch: 'positive → positive',
      };
    }
    
    if (visualStyle === 'cinematic') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'fade',
        duration: 1.0,
        reason: 'Cinematic style - dramatic pacing',
        moodMatch: 'dramatic flow',
      };
    }
    
    if (visualStyle === 'energetic') {
      return {
        fromScene: current.sceneIndex,
        toScene: next.sceneIndex,
        type: 'cut',
        duration: 0.2,
        reason: 'Energetic style - fast pacing',
        moodMatch: 'dynamic rhythm',
      };
    }
    
    return {
      fromScene: current.sceneIndex,
      toScene: next.sceneIndex,
      type: 'dissolve',
      duration: 0.5,
      reason: 'Standard transition',
      moodMatch: 'smooth continuity',
    };
  }
}

export const transitionService = new TransitionService();
