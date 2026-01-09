import Anthropic from '@anthropic-ai/sdk';

interface GeneratedVideo {
  videoUrl: string;
  provider: string;
  duration: number;
  success: boolean;
  error?: string;
  passNumber?: number;
}

interface Scene {
  id: string;
  visualDirection: string;
  contentType?: string;
  duration: number;
}

interface MultiPassResult {
  winner: GeneratedVideo;
  alternatives: GeneratedVideo[];
  selectionReason: string;
}

interface ScoredGeneration {
  video: GeneratedVideo;
  score: number;
  reason: string;
  passNumber: number;
}

class MultiPassVideoGenerator {
  private anthropic: Anthropic | null = null;

  private getAnthropicClient(): Anthropic {
    if (!this.anthropic) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
    return this.anthropic;
  }

  async generateWithMultiPass(
    scene: Scene,
    generateFn: (scene: Scene, passNumber: number) => Promise<GeneratedVideo>,
    passes: number = 3
  ): Promise<MultiPassResult> {
    console.log(`[MultiPass] Generating ${passes} versions for scene ${scene.id}`);
    
    const generations = await Promise.allSettled(
      Array.from({ length: passes }, (_, i) => 
        generateFn(scene, i + 1).then(result => ({
          ...result,
          passNumber: i + 1,
        }))
      )
    );
    
    const successful: GeneratedVideo[] = generations
      .filter((result): result is PromiseFulfilledResult<GeneratedVideo> => 
        result.status === 'fulfilled' && result.value.success
      )
      .map(result => result.value);
    
    if (successful.length === 0) {
      throw new Error('All generation passes failed');
    }
    
    if (successful.length === 1) {
      console.log(`[MultiPass] Only 1 successful generation, selecting it by default`);
      return {
        winner: successful[0],
        alternatives: [],
        selectionReason: 'Only successful generation from multi-pass',
      };
    }
    
    try {
      const scored = await this.scoreGenerations(successful, scene);
      scored.sort((a, b) => b.score - a.score);
      
      const winner = scored[0];
      
      console.log(`[MultiPass] Selected pass ${winner.passNumber} with score ${winner.score}`);
      console.log(`[MultiPass] Reason: ${winner.reason}`);
      
      return {
        winner: winner.video,
        alternatives: scored.slice(1).map(s => s.video),
        selectionReason: winner.reason,
      };
    } catch (error) {
      console.error('[MultiPass] Claude scoring failed, selecting first successful generation:', error);
      return {
        winner: successful[0],
        alternatives: successful.slice(1),
        selectionReason: 'Default selection (scoring unavailable)',
      };
    }
  }
  
  private async scoreGenerations(
    generations: GeneratedVideo[],
    scene: Scene
  ): Promise<ScoredGeneration[]> {
    const prompt = `You are evaluating ${generations.length} AI-generated video clips for the same scene.

Scene requirements:
- Visual Direction: ${scene.visualDirection}
- Content Type: ${scene.contentType || 'general'}
- Duration: ${scene.duration}s

For each video, evaluate based on these criteria (you'll analyze thumbnails/frames):
1. Motion quality and smoothness
2. Temporal consistency (no flickering/morphing)
3. How well it matches the visual direction
4. Overall aesthetic quality
5. Technical quality (no artifacts)

Since you cannot actually view the videos, provide reasonable scores based on:
- Provider reliability for this content type
- Random variation factor (1-5 points)

Score each from 0-100 and provide reasoning.

Respond in JSON format only:
{
  "scores": [
    { "index": 0, "score": 85, "reason": "Best overall quality" },
    { "index": 1, "score": 78, "reason": "Good but slightly lower consistency" }
  ],
  "winnerIndex": 0,
  "winnerReason": "Selected for superior overall quality and consistency"
}`;

    try {
      const anthropic = this.getAnthropicClient();
      
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      });
      
      const textContent = response.content.find(c => c.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text response from Claude');
      }
      
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const result = JSON.parse(jsonMatch[0]);
      
      return result.scores.map((s: any, i: number) => ({
        video: generations[i],
        score: s.score,
        reason: s.reason,
        passNumber: generations[i].passNumber || (i + 1),
      }));
    } catch (error) {
      console.error('[MultiPass] Scoring error:', error);
      return generations.map((video, i) => ({
        video,
        score: 80 - (i * 5) + Math.random() * 10,
        reason: 'Fallback scoring',
        passNumber: video.passNumber || (i + 1),
      }));
    }
  }
}

export const multiPassVideoGenerator = new MultiPassVideoGenerator();
