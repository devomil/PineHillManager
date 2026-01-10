import {
  WorkflowDecision,
  WorkflowResult,
  WorkflowPath,
} from '../../shared/types/brand-workflow-types';
import { BrandRequirementAnalysis } from '../../shared/types/brand-asset-types';
import { brandRequirementAnalyzer } from './brand-requirement-analyzer';
import { brandAssetMatcher } from './brand-asset-matcher';
import { brandWorkflowRouter } from './brand-workflow-router';
import { imageCompositionService } from './image-composition-service';
import { compositionRequestBuilder } from './composition-request-builder';
import { imageToVideoService } from './image-to-video-service';
import { motionStyleDetector } from './motion-style-detector';
import { logoCompositionService } from './logo-composition-service';

class BrandWorkflowOrchestrator {
  
  async execute(
    sceneId: string,
    visualDirection: string,
    narration: string,
    sceneDuration: number,
    outputType: 'image' | 'video'
  ): Promise<WorkflowResult> {
    
    const startTime = Date.now();
    console.log(`\n[BrandWorkflow] ═══════════════════════════════════════`);
    console.log(`[BrandWorkflow] Starting workflow for scene ${sceneId}`);
    console.log(`[BrandWorkflow] Visual: ${visualDirection.substring(0, 80)}...`);
    
    try {
      console.log(`[BrandWorkflow] Step 1: Analyzing brand requirements...`);
      let analysis = brandRequirementAnalyzer.analyze(visualDirection, narration);
      
      console.log(`[BrandWorkflow] Step 2: Matching brand assets...`);
      analysis = await brandAssetMatcher.matchAssets(analysis);
      
      analysis.requirements.outputType = outputType;
      
      console.log(`[BrandWorkflow] Step 3: Routing to workflow...`);
      const decision = brandWorkflowRouter.route(analysis);
      
      console.log(`[BrandWorkflow] Decision: ${decision.path}`);
      console.log(`[BrandWorkflow] Reasons: ${decision.reasons.join('; ')}`);
      console.log(`[BrandWorkflow] Steps: ${decision.steps.map(s => s.name).join(' → ')}`);
      
      console.log(`[BrandWorkflow] Step 4: Executing workflow...`);
      const result = await this.executeWorkflow(
        sceneId,
        visualDirection,
        sceneDuration,
        analysis,
        decision
      );
      
      const executionTime = Date.now() - startTime;
      console.log(`[BrandWorkflow] Complete in ${executionTime}ms`);
      console.log(`[BrandWorkflow] Quality: ${(result.quality.overallScore * 100).toFixed(1)}%`);
      console.log(`[BrandWorkflow] ═══════════════════════════════════════\n`);
      
      return {
        ...result,
        executionTimeMs: executionTime,
      };
      
    } catch (error) {
      console.error(`[BrandWorkflow] Error:`, error);
      return {
        success: false,
        path: 'standard',
        intermediates: {},
        quality: { brandAccuracy: 0, logoClarity: 0, productVisibility: 0, overallScore: 0 },
        executionTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  async analyzeOnly(
    visualDirection: string,
    narration: string,
    outputType: 'image' | 'video'
  ): Promise<{ analysis: BrandRequirementAnalysis; decision: WorkflowDecision }> {
    
    let analysis = brandRequirementAnalyzer.analyze(visualDirection, narration);
    analysis = await brandAssetMatcher.matchAssets(analysis);
    analysis.requirements.outputType = outputType;
    
    const decision = brandWorkflowRouter.route(analysis);
    
    return { analysis, decision };
  }
  
  private async executeWorkflow(
    sceneId: string,
    visualDirection: string,
    sceneDuration: number,
    analysis: BrandRequirementAnalysis,
    decision: WorkflowDecision
  ): Promise<Omit<WorkflowResult, 'executionTimeMs'>> {
    
    switch (decision.path) {
      case 'product-image':
        return this.executeProductImageWorkflow(sceneId, visualDirection, analysis);
        
      case 'product-video':
        return this.executeProductVideoWorkflow(sceneId, visualDirection, sceneDuration, analysis);
        
      case 'product-hero':
        return this.executeProductHeroWorkflow(sceneId, visualDirection, sceneDuration, analysis);
        
      case 'brand-asset-direct':
        return this.executeBrandAssetDirectWorkflow(sceneId, sceneDuration, analysis);
        
      case 'logo-overlay-only':
        return this.executeLogoOverlayWorkflow(sceneId, visualDirection, sceneDuration, analysis);
        
      case 'standard':
      default:
        return this.executeStandardWorkflow(sceneId, visualDirection);
    }
  }
  
  private async executeProductImageWorkflow(
    sceneId: string,
    visualDirection: string,
    analysis: BrandRequirementAnalysis
  ): Promise<Omit<WorkflowResult, 'executionTimeMs'>> {
    
    console.log(`[BrandWorkflow] Executing product-image workflow for ${sceneId}`);
    
    const request = await compositionRequestBuilder.build(
      sceneId, visualDirection, analysis, 'image'
    );
    
    const compositionResult = await imageCompositionService.compose(request);
    
    if (!compositionResult.success) {
      throw new Error(`Composition failed: ${compositionResult.error}`);
    }
    
    return {
      success: true,
      path: 'product-image',
      imageUrl: compositionResult.imageUrl,
      intermediates: {
        composedImage: compositionResult.imageUrl,
      },
      quality: {
        brandAccuracy: 1.0,
        logoClarity: 1.0,
        productVisibility: 0.95,
        overallScore: 0.98,
      },
    };
  }
  
  private async executeProductVideoWorkflow(
    sceneId: string,
    visualDirection: string,
    sceneDuration: number,
    analysis: BrandRequirementAnalysis
  ): Promise<Omit<WorkflowResult, 'executionTimeMs'>> {
    
    console.log(`[BrandWorkflow] Executing product-video workflow for ${sceneId}`);
    
    const request = await compositionRequestBuilder.build(
      sceneId, visualDirection, analysis, 'video'
    );
    const compositionResult = await imageCompositionService.compose(request);
    
    if (!compositionResult.success) {
      throw new Error(`Composition failed: ${compositionResult.error}`);
    }
    
    const motionConfig = motionStyleDetector.detect(visualDirection, analysis);
    
    const i2vResult = await imageToVideoService.generate({
      sourceImageUrl: compositionResult.imageUrl,
      sourceType: 'composed',
      sceneId,
      visualDirection,
      motion: {
        style: motionConfig.style,
        intensity: motionConfig.intensity,
        duration: Math.min(sceneDuration, 10),
        cameraMovement: motionConfig.cameraMovement,
        environmentalEffects: motionConfig.environmentalEffects,
      },
      productRegions: compositionResult.compositionData.productRegions.map(r => ({
        bounds: r.bounds,
        importance: 'critical' as const,
      })),
      output: { width: 1920, height: 1080, fps: 30, format: 'mp4' },
    });
    
    if (!i2vResult.success) {
      throw new Error(`I2V failed: ${i2vResult.error}`);
    }
    
    const logoConfig = await logoCompositionService.buildConfig(
      sceneId, 
      sceneDuration, 
      analysis,
      compositionResult.compositionData.productRegions.map(r => r.bounds)
    );
    
    return {
      success: true,
      path: 'product-video',
      videoUrl: i2vResult.videoUrl,
      intermediates: {
        composedImage: compositionResult.imageUrl,
        preLogoVideo: i2vResult.videoUrl,
      },
      quality: {
        brandAccuracy: 1.0,
        logoClarity: 1.0,
        productVisibility: i2vResult.quality.productStability,
        overallScore: (1.0 + i2vResult.quality.overallScore) / 2,
      },
    };
  }
  
  private async executeProductHeroWorkflow(
    sceneId: string,
    visualDirection: string,
    sceneDuration: number,
    analysis: BrandRequirementAnalysis
  ): Promise<Omit<WorkflowResult, 'executionTimeMs'>> {
    
    console.log(`[BrandWorkflow] Executing product-hero workflow for ${sceneId}`);
    
    const productAsset = analysis.matchedAssets.products[0];
    if (!productAsset?.url) {
      throw new Error('No product asset found for hero workflow');
    }
    
    const i2vResult = await imageToVideoService.generate({
      sourceImageUrl: productAsset.url,
      sourceType: 'product-photo',
      sceneId,
      visualDirection,
      motion: {
        style: 'subtle',
        intensity: 'minimal',
        duration: Math.min(sceneDuration, 10),
        cameraMovement: { direction: 'push', distance: 'subtle' },
      },
      output: { width: 1920, height: 1080, fps: 30, format: 'mp4' },
    });
    
    const logoConfig = await logoCompositionService.buildConfig(
      sceneId, 
      sceneDuration, 
      analysis
    );
    
    return {
      success: i2vResult.success,
      path: 'product-hero',
      videoUrl: i2vResult.videoUrl,
      intermediates: {},
      quality: {
        brandAccuracy: 1.0,
        logoClarity: 1.0,
        productVisibility: 1.0,
        overallScore: 0.98,
      },
      error: i2vResult.error,
    };
  }
  
  private async executeBrandAssetDirectWorkflow(
    sceneId: string,
    sceneDuration: number,
    analysis: BrandRequirementAnalysis
  ): Promise<Omit<WorkflowResult, 'executionTimeMs'>> {
    
    console.log(`[BrandWorkflow] Executing brand-asset-direct workflow for ${sceneId}`);
    
    const locationAsset = analysis.matchedAssets.locations[0];
    if (!locationAsset?.url) {
      throw new Error('No location asset found');
    }
    
    const i2vResult = await imageToVideoService.generate({
      sourceImageUrl: locationAsset.url,
      sourceType: 'brand-asset',
      sceneId,
      visualDirection: 'Location establishing shot',
      motion: {
        style: 'environmental',
        intensity: 'low',
        duration: Math.min(sceneDuration, 10),
      },
      output: { width: 1920, height: 1080, fps: 30, format: 'mp4' },
    });
    
    const logoConfig = await logoCompositionService.buildConfig(
      sceneId, 
      sceneDuration, 
      analysis
    );
    
    return {
      success: i2vResult.success,
      path: 'brand-asset-direct',
      videoUrl: i2vResult.videoUrl,
      intermediates: {},
      quality: {
        brandAccuracy: 1.0,
        logoClarity: 1.0,
        productVisibility: 0,
        overallScore: 0.95,
      },
      error: i2vResult.error,
    };
  }
  
  private async executeLogoOverlayWorkflow(
    sceneId: string,
    visualDirection: string,
    sceneDuration: number,
    analysis: BrandRequirementAnalysis
  ): Promise<Omit<WorkflowResult, 'executionTimeMs'>> {
    
    console.log(`[BrandWorkflow] Executing logo-overlay-only workflow for ${sceneId}`);
    
    const logoConfig = await logoCompositionService.buildConfig(
      sceneId, sceneDuration, analysis
    );
    
    const remotionProps = await logoCompositionService.generateRemotionProps(logoConfig);
    
    console.log(`[BrandWorkflow] Logo config ready with ${remotionProps.length} logos`);
    console.log(`[BrandWorkflow] Logos: ${remotionProps.map(p => p.logoUrl?.substring(0, 50)).join(', ')}`);
    
    return {
      success: true,
      path: 'logo-overlay-only',
      intermediates: {},
      quality: {
        brandAccuracy: 0.8,
        logoClarity: 1.0,
        productVisibility: 0,
        overallScore: 0.85,
      },
    };
  }
  
  private async executeStandardWorkflow(
    sceneId: string,
    visualDirection: string
  ): Promise<Omit<WorkflowResult, 'executionTimeMs'>> {
    
    console.log(`[BrandWorkflow] Executing standard workflow for ${sceneId}`);
    
    return {
      success: true,
      path: 'standard',
      intermediates: {},
      quality: {
        brandAccuracy: 0.5,
        logoClarity: 0,
        productVisibility: 0,
        overallScore: 0.7,
      },
    };
  }
  
  getWorkflowPaths(): WorkflowPath[] {
    return ['standard', 'product-image', 'product-video', 'logo-overlay-only', 'brand-asset-direct', 'product-hero'];
  }
  
  describeWorkflow(path: WorkflowPath): string {
    const descriptions: Record<WorkflowPath, string> = {
      'standard': 'Standard AI generation without brand assets',
      'product-image': 'AI environment + real product composition → static image',
      'product-video': 'AI environment + real product composition → animated video',
      'logo-overlay-only': 'Standard AI generation + deterministic logo overlay',
      'brand-asset-direct': 'Brand location asset → animated video',
      'product-hero': 'Product photo → animated hero video',
    };
    return descriptions[path];
  }
}

export const brandWorkflowOrchestrator = new BrandWorkflowOrchestrator();
