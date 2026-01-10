import { 
  WorkflowPath, 
  WorkflowDecision, 
  WorkflowStep 
} from '../../shared/types/brand-workflow-types';
import { BrandRequirementAnalysis } from '../../shared/types/brand-asset-types';

class BrandWorkflowRouter {
  
  route(analysis: BrandRequirementAnalysis): WorkflowDecision {
    const { requirements, matchedAssets, confidence } = analysis;
    
    if (!analysis.requiresBrandAssets) {
      return this.buildDecision('standard', 0.9, ['No brand assets detected'], [
        { name: 'AI Generation', service: 'universalVideoService', input: 'visualDirection', output: 'video', optional: false },
      ]);
    }
    
    const path = this.determineOptimalPath(requirements, matchedAssets);
    const steps = this.buildSteps(path, requirements);
    const reasons = this.buildReasons(path, requirements);
    
    return this.buildDecision(path, confidence, reasons, steps);
  }
  
  private determineOptimalPath(
    requirements: BrandRequirementAnalysis['requirements'],
    matchedAssets: BrandRequirementAnalysis['matchedAssets']
  ): WorkflowPath {
    
    if (requirements.productMentioned && matchedAssets.products.length > 0) {
      
      if (requirements.sceneType === 'product-hero') {
        return requirements.outputType === 'video' ? 'product-hero' : 'product-image';
      }
      
      if (requirements.sceneType === 'product-in-context') {
        return requirements.outputType === 'video' ? 'product-video' : 'product-image';
      }
    }
    
    if (requirements.sceneType === 'branded-environment' && matchedAssets.locations.length > 0) {
      return 'brand-asset-direct';
    }
    
    if (requirements.logoRequired && !requirements.productMentioned) {
      return 'logo-overlay-only';
    }
    
    if (requirements.logoRequired) {
      return 'logo-overlay-only';
    }
    
    return 'standard';
  }
  
  private buildSteps(
    path: WorkflowPath,
    requirements: BrandRequirementAnalysis['requirements']
  ): WorkflowStep[] {
    
    switch (path) {
      case 'product-image':
        return [
          { name: 'Generate Environment', service: 'environmentGenerationService', input: 'cleanPrompt', output: 'backgroundImage', optional: false },
          { name: 'Compose Products', service: 'imageCompositionService', input: 'backgroundImage + products', output: 'composedImage', optional: false },
          { name: 'Add Logo Overlay', service: 'logoCompositionService', input: 'composedImage', output: 'finalImage', optional: !requirements.logoRequired },
        ];
        
      case 'product-video':
        return [
          { name: 'Generate Environment', service: 'environmentGenerationService', input: 'cleanPrompt', output: 'backgroundImage', optional: false },
          { name: 'Compose Products', service: 'imageCompositionService', input: 'backgroundImage + products', output: 'composedImage', optional: false },
          { name: 'Animate Image', service: 'imageToVideoService', input: 'composedImage', output: 'video', optional: false },
          { name: 'Add Logo Overlay', service: 'logoCompositionService', input: 'video', output: 'finalVideo', optional: false },
        ];
        
      case 'product-hero':
        return [
          { name: 'Animate Product Photo', service: 'imageToVideoService', input: 'productAsset', output: 'video', optional: false },
          { name: 'Add Logo Overlay', service: 'logoCompositionService', input: 'video', output: 'finalVideo', optional: false },
        ];
        
      case 'brand-asset-direct':
        return [
          { name: 'Animate Location', service: 'imageToVideoService', input: 'locationAsset', output: 'video', optional: false },
          { name: 'Add Logo Overlay', service: 'logoCompositionService', input: 'video', output: 'finalVideo', optional: false },
        ];
        
      case 'logo-overlay-only':
        return [
          { name: 'AI Generation', service: 'universalVideoService', input: 'visualDirection', output: 'video', optional: false },
          { name: 'Add Logo Overlay', service: 'logoCompositionService', input: 'video', output: 'finalVideo', optional: false },
        ];
        
      case 'standard':
      default:
        return [
          { name: 'AI Generation', service: 'universalVideoService', input: 'visualDirection', output: 'video', optional: false },
        ];
    }
  }
  
  private buildReasons(
    path: WorkflowPath,
    requirements: BrandRequirementAnalysis['requirements']
  ): string[] {
    const reasons: string[] = [];
    
    if (requirements.productMentioned) {
      reasons.push(`Product mentioned: ${requirements.productNames.join(', ') || 'generic'}`);
    }
    
    if (requirements.logoRequired) {
      reasons.push(`Logo required: ${requirements.logoType || 'primary'} (${requirements.brandingVisibility})`);
    }
    
    if (requirements.sceneType !== 'standard') {
      reasons.push(`Scene type: ${requirements.sceneType}`);
    }
    
    if (requirements.outputType === 'image') {
      reasons.push('Output type: static image');
    }
    
    reasons.push(`Selected path: ${path}`);
    
    return reasons;
  }
  
  private buildDecision(
    path: WorkflowPath,
    confidence: number,
    reasons: string[],
    steps: WorkflowStep[]
  ): WorkflowDecision {
    
    const qualityImpact = this.getQualityImpact(path);
    const costMultiplier = this.getCostMultiplier(path);
    
    return {
      path,
      confidence,
      reasons,
      steps,
      qualityImpact,
      costMultiplier,
    };
  }
  
  private getQualityImpact(path: WorkflowPath): 'higher' | 'same' | 'lower' {
    switch (path) {
      case 'product-image':
      case 'product-video':
      case 'product-hero':
        return 'higher';
      case 'logo-overlay-only':
        return 'higher';
      default:
        return 'same';
    }
  }
  
  private getCostMultiplier(path: WorkflowPath): number {
    switch (path) {
      case 'product-video':
        return 2.0;
      case 'product-image':
        return 1.5;
      case 'product-hero':
        return 1.5;
      case 'logo-overlay-only':
        return 1.1;
      default:
        return 1.0;
    }
  }
}

export const brandWorkflowRouter = new BrandWorkflowRouter();
