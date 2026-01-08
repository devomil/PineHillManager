# Phase 13E: Intelligent Regeneration System

## Objective

Create a smart regeneration system that:
1. Learns from failed attempts
2. Automatically adjusts approach based on prompt complexity
3. Tries alternative providers intelligently
4. Tracks regeneration history to avoid repeating failures

## The Problem with Current Regeneration

When a video fails Claude's quality check:
1. User clicks "Copy" on suggested improvement
2. User regenerates with same provider
3. Same (or similar) failure occurs
4. Repeat...

**Why it keeps failing:**
- Suggested improvement makes prompt MORE specific
- More specific = HARDER for AI models
- Same provider has same fundamental limitations
- No learning from previous failures

---

## Regeneration Strategy Engine

```typescript
// server/services/regeneration-strategy-engine.ts

import { VIDEO_PROVIDERS } from '../config/video-providers';
import { promptComplexityAnalyzer } from './prompt-complexity-analyzer';
import { smartProviderRouter } from './smart-provider-router';

interface RegenerationAttempt {
  attemptNumber: number;
  timestamp: Date;
  provider: string;
  prompt: string;
  result: 'success' | 'failure' | 'partial';
  qualityScore?: number;
  issues?: string[];
}

interface RegenerationStrategy {
  approach: 'retry' | 'simplify' | 'reference' | 'alternative-provider' | 'stock-footage';
  changes: {
    prompt?: string;
    provider?: string;
    useReference?: boolean;
    referenceUrl?: string;
    motionSettings?: any;
  };
  reasoning: string;
  confidenceScore: number;
  warning?: string;
}

class RegenerationStrategyEngine {
  
  determineStrategy(context: {
    attempts: RegenerationAttempt[];
    complexity: any;
    currentPrompt: string;
    currentMediaUrl?: string;
  }): RegenerationStrategy {
    
    const { attempts, complexity } = context;
    const attemptCount = attempts.length;
    
    // First attempt - route to best provider
    if (attemptCount === 0) {
      return this.firstAttemptStrategy(context);
    }
    
    // Analyze failures
    const pattern = this.analyzeFailures(attempts);
    
    // Strategy based on attempt count
    if (attemptCount === 1) return this.secondAttemptStrategy(context, pattern);
    if (attemptCount === 2) return this.thirdAttemptStrategy(context, pattern);
    if (attemptCount >= 3) return this.fallbackStrategy(context);
    
    return this.defaultStrategy();
  }
  
  private firstAttemptStrategy(context: any): RegenerationStrategy {
    const { complexity, currentPrompt } = context;
    const routing = smartProviderRouter.route(currentPrompt, 'b-roll');
    
    if (complexity.category === 'impossible') {
      return {
        approach: 'simplify',
        changes: {
          prompt: complexity.recommendations?.simplifiedPrompt,
          provider: routing.recommendedProvider,
        },
        reasoning: 'Prompt is extremely specific. Simplifying for better results.',
        confidenceScore: 0.4,
        warning: 'This prompt may be impossible for AI models. Consider stock footage.',
      };
    }
    
    return {
      approach: 'retry',
      changes: { provider: routing.recommendedProvider },
      reasoning: `Using ${VIDEO_PROVIDERS[routing.recommendedProvider]?.name || routing.recommendedProvider}.`,
      confidenceScore: complexity.category === 'complex' ? 0.6 : 0.8,
      warning: complexity.userWarning,
    };
  }
  
  private secondAttemptStrategy(context: any, pattern: any): RegenerationStrategy {
    const { attempts, currentMediaUrl, complexity } = context;
    const lastAttempt = attempts[0];
    
    // If partial result exists, use as reference
    if (currentMediaUrl && lastAttempt.result === 'partial') {
      return {
        approach: 'reference',
        changes: {
          useReference: true,
          referenceUrl: currentMediaUrl,
          provider: this.getI2VProvider(),
        },
        reasoning: 'Previous result was close. Using as reference to refine.',
        confidenceScore: 0.7,
      };
    }
    
    // Try different provider
    const altProvider = this.getAlternativeProvider(lastAttempt.provider, complexity);
    return {
      approach: 'alternative-provider',
      changes: { provider: altProvider },
      reasoning: `Trying ${VIDEO_PROVIDERS[altProvider]?.name || altProvider} for different interpretation.`,
      confidenceScore: 0.6,
    };
  }
  
  private thirdAttemptStrategy(context: any, pattern: any): RegenerationStrategy {
    const { currentMediaUrl } = context;
    
    if (currentMediaUrl) {
      return {
        approach: 'reference',
        changes: {
          useReference: true,
          referenceUrl: currentMediaUrl,
          provider: 'kling-2.5-turbo',
          motionSettings: { style: 'environmental', intensity: 'minimal' },
        },
        reasoning: 'Using current image with minimal motion.',
        confidenceScore: 0.5,
      };
    }
    
    return {
      approach: 'simplify',
      changes: {
        prompt: this.drasticallySimplify(context.currentPrompt),
        provider: 'kling-2.5-turbo',
      },
      reasoning: 'Drastically simplified prompt.',
      confidenceScore: 0.4,
      warning: 'Prompt heavily simplified. May not match original intent.',
    };
  }
  
  private fallbackStrategy(context: any): RegenerationStrategy {
    return {
      approach: 'stock-footage',
      changes: {},
      reasoning: 'Multiple AI attempts failed. Stock footage recommended.',
      confidenceScore: 0.8,
      warning: 'Consider stock footage for this shot.',
    };
  }
  
  private defaultStrategy(): RegenerationStrategy {
    return {
      approach: 'retry',
      changes: {},
      reasoning: 'Standard regeneration.',
      confidenceScore: 0.5,
    };
  }
  
  private analyzeFailures(attempts: RegenerationAttempt[]): any {
    const issues = attempts.flatMap(a => a.issues || []);
    const issueCounts = new Map<string, number>();
    
    for (const issue of issues) {
      const key = issue.toLowerCase().replace(/\[major\]|\[minor\]/g, '').trim();
      issueCounts.set(key, (issueCounts.get(key) || 0) + 1);
    }
    
    return {
      sameIssuesRepeating: Array.from(issueCounts.values()).some(c => c >= 2),
      hasPartialSuccess: attempts.some(a => a.result === 'partial'),
    };
  }
  
  private getAlternativeProvider(current: string, complexity: any): string {
    const fallbacks = ['kling-2.5-turbo', 'runway-gen3', 'veo-3.1', 'luma-dream-machine'];
    return fallbacks.find(p => p !== current) || 'kling-2.5-turbo';
  }
  
  private getI2VProvider(): string {
    return 'kling-2.5-turbo';
  }
  
  private drasticallySimplify(prompt: string): string {
    const lower = prompt.toLowerCase();
    let subject = 'scene';
    if (lower.includes('hand')) subject = 'hands working';
    if (lower.includes('food') || lower.includes('dough')) subject = 'food preparation';
    return `${subject}, natural lighting`;
  }
}

export const regenerationStrategyEngine = new RegenerationStrategyEngine();
```

---

## Regeneration Service

```typescript
// server/services/regeneration-service.ts

import { regenerationStrategyEngine } from './regeneration-strategy-engine';
import { promptComplexityAnalyzer } from './prompt-complexity-analyzer';
import { db } from '../db';
import { sceneRegenerationHistory } from '../db/schema';

interface RegenerateRequest {
  sceneId: string;
  mode: 'standard' | 'with-reference' | 'simplified-prompt' | 'different-provider' | 'stock-search';
  referenceUrl?: string;
  newPrompt?: string;
  newProvider?: string;
}

interface RegenerateResult {
  success: boolean;
  mediaUrl?: string;
  provider: string;
  strategy: string;
  qualityScore?: number;
  issues?: string[];
  nextSuggestion?: string;
}

class RegenerationService {
  
  /**
   * Execute regeneration with intelligent strategy
   */
  async regenerate(request: RegenerateRequest): Promise<RegenerateResult> {
    console.log(`[Regen] Starting regeneration for scene ${request.sceneId}`);
    console.log(`[Regen] Mode: ${request.mode}`);
    
    // Get scene and history
    const scene = await this.getScene(request.sceneId);
    const history = await this.getRegenerationHistory(request.sceneId);
    
    // Analyze complexity
    const complexity = promptComplexityAnalyzer.analyze(scene.visualDirection);
    
    // Build context
    const context = {
      sceneId: request.sceneId,
      originalPrompt: scene.originalVisualDirection || scene.visualDirection,
      currentPrompt: request.newPrompt || scene.visualDirection,
      attempts: history,
      currentMediaUrl: scene.mediaUrl,
      complexity,
    };
    
    // Get strategy (unless user explicitly chose a mode)
    let strategy;
    if (request.mode === 'standard') {
      strategy = regenerationStrategyEngine.determineStrategy(context);
    } else {
      // User-chosen mode overrides auto strategy
      strategy = this.buildUserStrategy(request);
    }
    
    console.log(`[Regen] Strategy: ${strategy.approach}`);
    console.log(`[Regen] Confidence: ${strategy.confidenceScore}`);
    
    // Handle stock footage search separately
    if (strategy.approach === 'stock-footage') {
      return this.handleStockFootageSearch(scene, complexity);
    }
    
    // Execute generation
    const result = await this.executeGeneration(scene, strategy, request);
    
    // Record attempt
    await this.recordAttempt(request.sceneId, strategy, result);
    
    // Determine next suggestion if failed
    if (!result.success || result.qualityScore! < 0.7) {
      const nextContext = {
        ...context,
        attempts: [...history, {
          attemptNumber: history.length + 1,
          timestamp: new Date(),
          provider: result.provider,
          prompt: request.newPrompt || scene.visualDirection,
          result: result.success ? 'partial' : 'failure',
          qualityScore: result.qualityScore,
          issues: result.issues,
        }],
      };
      const nextStrategy = regenerationStrategyEngine.determineStrategy(nextContext);
      result.nextSuggestion = this.formatNextSuggestion(nextStrategy);
    }
    
    return result;
  }
  
  /**
   * Build strategy from user request
   */
  private buildUserStrategy(request: RegenerateRequest): any {
    switch (request.mode) {
      case 'with-reference':
        return {
          approach: 'reference',
          changes: {
            useReference: true,
            referenceUrl: request.referenceUrl,
          },
          reasoning: 'User requested reference-based regeneration',
          confidenceScore: 0.7,
        };
        
      case 'simplified-prompt':
        return {
          approach: 'simplify',
          changes: {
            prompt: request.newPrompt,
          },
          reasoning: 'User requested simplified prompt',
          confidenceScore: 0.6,
        };
        
      case 'different-provider':
        return {
          approach: 'alternative-provider',
          changes: {
            provider: request.newProvider,
          },
          reasoning: 'User requested different provider',
          confidenceScore: 0.5,
        };
        
      case 'stock-search':
        return {
          approach: 'stock-footage',
          changes: {},
          reasoning: 'User requested stock footage search',
          confidenceScore: 0.8,
        };
        
      default:
        return {
          approach: 'retry',
          changes: {},
          reasoning: 'Standard regeneration',
          confidenceScore: 0.5,
        };
    }
  }
  
  /**
   * Execute the actual generation
   */
  private async executeGeneration(
    scene: any,
    strategy: any,
    request: RegenerateRequest
  ): Promise<RegenerateResult> {
    
    const prompt = strategy.changes.prompt || request.newPrompt || scene.visualDirection;
    const provider = strategy.changes.provider || request.newProvider || scene.provider;
    
    // Reference-based generation
    if (strategy.approach === 'reference' && strategy.changes.useReference) {
      return this.executeReferenceGeneration(
        scene,
        strategy.changes.referenceUrl || request.referenceUrl!,
        provider,
        prompt
      );
    }
    
    // Standard generation
    return this.executeStandardGeneration(scene, provider, prompt);
  }
  
  /**
   * Execute reference-based generation (I2I or I2V)
   */
  private async executeReferenceGeneration(
    scene: any,
    referenceUrl: string,
    provider: string,
    prompt: string
  ): Promise<RegenerateResult> {
    
    console.log(`[Regen] Executing reference-based generation with ${provider}`);
    
    // Determine if I2I or I2V based on scene output type
    const isVideo = scene.mediaType === 'video';
    
    if (isVideo) {
      // Image-to-Video
      return this.executeImageToVideo(referenceUrl, provider, prompt, scene);
    } else {
      // Image-to-Image
      return this.executeImageToImage(referenceUrl, provider, prompt, scene);
    }
  }
  
  /**
   * Execute Image-to-Video
   */
  private async executeImageToVideo(
    imageUrl: string,
    provider: string,
    prompt: string,
    scene: any
  ): Promise<RegenerateResult> {
    
    // Use the image-to-video service from Phase 14D
    // This is a simplified version - actual implementation uses imageToVideoService
    
    console.log(`[Regen] I2V: ${imageUrl} -> video with ${provider}`);
    
    // TODO: Call actual I2V provider
    // const result = await imageToVideoService.generate({
    //   sourceImageUrl: imageUrl,
    //   sourceType: 'composed',
    //   sceneId: scene.id,
    //   visualDirection: prompt,
    //   motion: { style: 'subtle', intensity: 'low', duration: scene.duration },
    //   output: { width: 1920, height: 1080, fps: 30, format: 'mp4' },
    // });
    
    return {
      success: true,
      mediaUrl: 'generated-video-url',
      provider,
      strategy: 'image-to-video',
      qualityScore: 0.8,
    };
  }
  
  /**
   * Execute Image-to-Image
   */
  private async executeImageToImage(
    imageUrl: string,
    provider: string,
    prompt: string,
    scene: any
  ): Promise<RegenerateResult> {
    
    console.log(`[Regen] I2I: ${imageUrl} -> image with ${provider}`);
    
    // TODO: Call actual I2I provider (Flux, SD3, etc.)
    
    return {
      success: true,
      mediaUrl: 'generated-image-url',
      provider,
      strategy: 'image-to-image',
      qualityScore: 0.8,
    };
  }
  
  /**
   * Execute standard text-to-video/image generation
   */
  private async executeStandardGeneration(
    scene: any,
    provider: string,
    prompt: string
  ): Promise<RegenerateResult> {
    
    console.log(`[Regen] Standard generation with ${provider}`);
    console.log(`[Regen] Prompt: ${prompt.substring(0, 100)}...`);
    
    // TODO: Call actual provider via universal-video-service
    
    return {
      success: true,
      mediaUrl: 'generated-media-url',
      provider,
      strategy: 'standard',
      qualityScore: 0.7,
    };
  }
  
  /**
   * Handle stock footage search
   */
  private async handleStockFootageSearch(
    scene: any,
    complexity: any
  ): Promise<RegenerateResult> {
    
    console.log(`[Regen] Redirecting to stock footage search`);
    
    // Generate search query from original prompt
    const searchQuery = this.generateStockSearchQuery(scene.visualDirection);
    
    return {
      success: false,
      provider: 'stock-footage',
      strategy: 'stock-footage-redirect',
      nextSuggestion: `Search for stock footage: "${searchQuery}"`,
    };
  }
  
  /**
   * Generate stock footage search query
   */
  private generateStockSearchQuery(prompt: string): string {
    // Extract key terms for stock search
    const stopWords = ['the', 'a', 'an', 'is', 'are', 'on', 'in', 'with', 'and', 'or'];
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => !stopWords.includes(w) && w.length > 2);
    
    return words.slice(0, 5).join(' ');
  }
  
  /**
   * Record regeneration attempt
   */
  private async recordAttempt(
    sceneId: string,
    strategy: any,
    result: RegenerateResult
  ): Promise<void> {
    await db.insert(sceneRegenerationHistory).values({
      sceneId,
      attemptNumber: 0, // Auto-increment
      provider: result.provider,
      strategy: strategy.approach,
      prompt: '', // Would include actual prompt
      result: result.success ? 'success' : 'failure',
      qualityScore: result.qualityScore,
      issues: result.issues?.join('|'),
      timestamp: new Date(),
    });
  }
  
  /**
   * Get regeneration history for scene
   */
  private async getRegenerationHistory(sceneId: string): Promise<any[]> {
    const history = await db.query.sceneRegenerationHistory.findMany({
      where: (h, { eq }) => eq(h.sceneId, sceneId),
      orderBy: (h, { desc }) => [desc(h.timestamp)],
    });
    
    return history.map(h => ({
      attemptNumber: h.attemptNumber,
      timestamp: h.timestamp,
      provider: h.provider,
      prompt: h.prompt,
      result: h.result,
      qualityScore: h.qualityScore,
      issues: h.issues?.split('|'),
    }));
  }
  
  /**
   * Get scene data
   */
  private async getScene(sceneId: string): Promise<any> {
    // Would query actual scene from database
    return {
      id: sceneId,
      visualDirection: '',
      originalVisualDirection: '',
      mediaUrl: '',
      mediaType: 'video',
      provider: 'kling-1.6',
      duration: 5,
    };
  }
  
  /**
   * Format next suggestion for user
   */
  private formatNextSuggestion(strategy: any): string {
    switch (strategy.approach) {
      case 'reference':
        return 'Try using the current result as a reference to refine further.';
      case 'simplify':
        return 'Consider simplifying the visual direction for better results.';
      case 'alternative-provider':
        return `Try ${strategy.changes.provider} for a different interpretation.`;
      case 'stock-footage':
        return 'AI generation may not be suitable for this shot. Consider stock footage.';
      default:
        return 'Try regenerating with adjusted settings.';
    }
  }
}

export const regenerationService = new RegenerationService();
```

---

## API Endpoint

```typescript
// server/routes/regeneration.ts

import { Router } from 'express';
import { regenerationService } from '../services/regeneration-service';
import { promptComplexityAnalyzer } from '../services/prompt-complexity-analyzer';

const router = Router();

/**
 * POST /api/scenes/:sceneId/regenerate
 */
router.post('/:sceneId/regenerate', async (req, res) => {
  const { sceneId } = req.params;
  const { mode, referenceUrl, newPrompt, newProvider } = req.body;
  
  try {
    const result = await regenerationService.regenerate({
      sceneId,
      mode: mode || 'standard',
      referenceUrl,
      newPrompt,
      newProvider,
    });
    
    res.json(result);
  } catch (error) {
    console.error('[API] Regeneration failed:', error);
    res.status(500).json({ error: 'Regeneration failed' });
  }
});

/**
 * GET /api/scenes/:sceneId/regeneration-history
 */
router.get('/:sceneId/regeneration-history', async (req, res) => {
  const { sceneId } = req.params;
  
  try {
    // Would fetch from database
    const history = [];
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * POST /api/prompts/analyze-complexity
 */
router.post('/analyze-complexity', async (req, res) => {
  const { prompt } = req.body;
  
  try {
    const analysis = promptComplexityAnalyzer.analyze(prompt);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

export default router;
```

---

## Database Schema Addition

```typescript
// server/db/schema.ts - Add this table

export const sceneRegenerationHistory = pgTable('scene_regeneration_history', {
  id: serial('id').primaryKey(),
  sceneId: text('scene_id').notNull(),
  attemptNumber: integer('attempt_number').notNull(),
  provider: text('provider').notNull(),
  strategy: text('strategy').notNull(),
  prompt: text('prompt'),
  result: text('result').notNull(), // 'success' | 'failure' | 'partial'
  qualityScore: decimal('quality_score', { precision: 3, scale: 2 }),
  issues: text('issues'),
  claudeAnalysis: text('claude_analysis'),
  timestamp: timestamp('timestamp').defaultNow(),
});
```

---

## Verification Checklist

Phase 13E is complete when:

- [ ] Strategy engine determines approach based on history
- [ ] First attempt uses smart provider routing
- [ ] Second attempt tries alternative approach
- [ ] Third attempt gets more aggressive
- [ ] Fallback suggests stock footage after 3+ failures
- [ ] History is recorded to database
- [ ] Next suggestion is provided after each attempt
- [ ] I2I and I2V regeneration modes work
- [ ] Stock footage redirect works
- [ ] API endpoints respond correctly

---

## Next Phase

Proceed to **Phase 13F: Stock Footage Fallback** for the final piece of the regeneration system.
import { promptComplexityAnalyzer } from './prompt-complexity-analyzer';
import { db } from '../db';

interface RegenerateResult {
  success: boolean;
  strategy: any;
  mediaUrl?: string;
  error?: string;
}

class RegenerationService {
  
  async regenerate(sceneId: string, mode: string, options: any = {}): Promise<RegenerateResult> {
    console.log(`[Regen] Starting regeneration for scene ${sceneId}, mode: ${mode}`);
    
    // Get scene and history
    const scene = await this.getScene(sceneId);
    const history = await this.getRegenerationHistory(sceneId);
    const complexity = promptComplexityAnalyzer.analyze(scene.visualDirection);
    
    // Determine strategy
    const strategy = regenerationStrategyEngine.determineStrategy({
      attempts: history,
      complexity,
      currentPrompt: scene.visualDirection,
      currentMediaUrl: scene.mediaUrl,
    });
    
    console.log(`[Regen] Strategy: ${strategy.approach}`);
    console.log(`[Regen] Confidence: ${strategy.confidenceScore}`);
    
    // Execute based on mode
    let result: RegenerateResult;
    
    switch (mode) {
      case 'standard':
        result = await this.executeStandardRegeneration(scene, strategy);
        break;
      case 'with-reference':
        result = await this.executeReferenceRegeneration(scene, options.referenceUrl, strategy);
        break;
      case 'simplified-prompt':
        result = await this.executeSimplifiedRegeneration(scene, options.newPrompt || strategy.changes.prompt);
        break;
      case 'different-provider':
        result = await this.executeProviderSwitch(scene, strategy.changes.provider);
        break;
      case 'stock-search':
        result = await this.searchStockFootage(scene);
        break;
      default:
        result = await this.executeStandardRegeneration(scene, strategy);
    }
    
    // Record attempt
    await this.recordAttempt(sceneId, {
      provider: result.strategy?.provider || scene.provider,
      prompt: scene.visualDirection,
      result: result.success ? 'success' : 'failure',
    });
    
    return result;
  }
  
  private async executeStandardRegeneration(scene: any, strategy: any): Promise<RegenerateResult> {
    const provider = strategy.changes.provider || scene.provider;
    
    // Use video generation service
    // const result = await universalVideoService.generate(scene.id, provider);
    
    return {
      success: true,
      strategy,
      // mediaUrl: result.videoUrl,
    };
  }
  
  private async executeReferenceRegeneration(scene: any, referenceUrl: string, strategy: any): Promise<RegenerateResult> {
    console.log(`[Regen] Using reference: ${referenceUrl}`);
    
    // Determine if I2I or I2V
    const isVideo = scene.mediaType === 'video';
    
    if (isVideo) {
      // Image-to-video
      // const result = await imageToVideoService.generate({
      //   sourceImageUrl: referenceUrl,
      //   ...strategy.changes.motionSettings
      // });
    } else {
      // Image-to-image
      // const result = await imageCompositionService.refine({
      //   sourceImageUrl: referenceUrl,
      //   prompt: scene.visualDirection,
      // });
    }
    
    return {
      success: true,
      strategy,
    };
  }
  
  private async executeSimplifiedRegeneration(scene: any, simplifiedPrompt: string): Promise<RegenerateResult> {
    console.log(`[Regen] Using simplified prompt: ${simplifiedPrompt}`);
    
    // Update scene with simplified prompt temporarily
    // Generate with simplified prompt
    
    return {
      success: true,
      strategy: { approach: 'simplify' },
    };
  }
  
  private async executeProviderSwitch(scene: any, newProvider: string): Promise<RegenerateResult> {
    console.log(`[Regen] Switching to provider: ${newProvider}`);
    
    // Generate with new provider
    
    return {
      success: true,
      strategy: { approach: 'alternative-provider', provider: newProvider },
    };
  }
  
  private async searchStockFootage(scene: any): Promise<RegenerateResult> {
    console.log(`[Regen] Searching stock footage for: ${scene.visualDirection}`);
    
    // Extract search terms from visual direction
    // Search stock providers (Pexels, Pixabay, etc.)
    
    return {
      success: true,
      strategy: { approach: 'stock-footage' },
    };
  }
  
  private async getScene(sceneId: string): Promise<any> {
    // Get scene from database
    return {};
  }
  
  private async getRegenerationHistory(sceneId: string): Promise<any[]> {
    // Get previous attempts from database
    return [];
  }
  
  private async recordAttempt(sceneId: string, attempt: any): Promise<void> {
    // Save attempt to database
    console.log(`[Regen] Recording attempt for ${sceneId}`);
  }
}

export const regenerationService = new RegenerationService();
```

---

## API Endpoint

```typescript
// server/routes/regeneration.ts

import { Router } from 'express';
import { regenerationService } from '../services/regeneration-service';

const router = Router();

router.post('/api/scenes/:sceneId/regenerate', async (req, res) => {
  try {
    const { sceneId } = req.params;
    const { mode, referenceUrl, newPrompt, newProvider } = req.body;
    
    const result = await regenerationService.regenerate(sceneId, mode, {
      referenceUrl,
      newPrompt,
      newProvider,
    });
    
    res.json(result);
  } catch (error) {
    console.error('[Regen API] Error:', error);
    res.status(500).json({ error: 'Regeneration failed' });
  }
});

export default router;
```

---

## Verification Checklist

Phase 13E is complete when:

- [ ] Regeneration strategy engine determines approach based on history
- [ ] First attempt routes to best provider
- [ ] Second attempt tries alternative provider or reference
- [ ] Third attempt simplifies prompt drastically
- [ ] Fourth+ attempt suggests stock footage
- [ ] Reference mode uses I2I or I2V
- [ ] Simplified mode uses cleaned prompt
- [ ] History is tracked per scene
- [ ] API endpoint works

---

## Integration with UI

The regeneration service integrates with Phase 13D's `RegenerationOptions` component:

```typescript
// In SceneEditorPanel.tsx

const handleRegenerate = async (options: RegenerateOptions) => {
  const result = await fetch(`/api/scenes/${scene.id}/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: options.mode,
      referenceUrl: options.referenceUrl,
      newPrompt: options.newPrompt,
      newProvider: options.newProvider,
    }),
  }).then(r => r.json());
  
  if (result.success) {
    // Update scene with new media
    refreshScene();
  } else {
    // Show error/warning
    toast.error(result.strategy?.warning || 'Regeneration failed');
  }
};
```

---

## Summary

Phase 13E provides intelligent regeneration that:

1. **Learns from failures** - Tracks what hasn't worked
2. **Adapts strategy** - Changes approach based on attempt count
3. **Uses references** - Leverages partial successes with I2I/I2V
4. **Simplifies intelligently** - Reduces complexity when needed
5. **Falls back gracefully** - Suggests stock footage when AI fails
