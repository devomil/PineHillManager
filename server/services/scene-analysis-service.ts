import Anthropic from '@anthropic-ai/sdk';
import { brandContextService } from './brand-context-service';
import { projectInstructionsService } from './project-instructions-service';
import type { Phase8AnalysisResult, Phase8AnalysisIssue } from '../../shared/video-types';

// Re-export the shared type for backwards compatibility
export type { Phase8AnalysisResult, Phase8AnalysisIssue };

export interface SceneContext {
  sceneIndex: number;
  sceneType: string;
  narration: string;
  visualDirection: string;
  expectedContentType: string;
  totalScenes: number;
}

// Internal alias for the shared type
type AnalysisIssue = Phase8AnalysisIssue;

export interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SafeZones {
  topLeft: boolean;
  topCenter: boolean;
  topRight: boolean;
  middleLeft: boolean;
  middleCenter: boolean;
  middleRight: boolean;
  bottomLeft: boolean;
  bottomCenter: boolean;
  bottomRight: boolean;
}

export interface SceneAnalysis {
  faces: {
    detected: boolean;
    count: number;
    positions: FaceDetection[];
  };
  
  composition: {
    focalPoint: { x: number; y: number };
    brightness: 'dark' | 'normal' | 'bright';
    dominantColors: string[];
  };
  
  safeZones: SafeZones;
  
  recommendations: {
    textPosition: {
      vertical: 'top' | 'center' | 'lower-third';
      horizontal: 'left' | 'center' | 'right';
    };
    textColor: string;
    needsTextShadow: boolean;
    needsTextBackground: boolean;
    productOverlayPosition: {
      x: 'left' | 'center' | 'right';
      y: 'top' | 'center' | 'bottom';
    };
    productOverlaySafe: boolean;
  };
  
  contentType: 'person' | 'product' | 'nature' | 'abstract' | 'mixed';
  mood: 'positive' | 'neutral' | 'serious' | 'dramatic';
}

export interface BrandAlignmentScore {
  lighting: {
    score: number;
    assessment: 'warm' | 'neutral' | 'cold';
    issue?: string;
  };
  colorPalette: {
    score: number;
    assessment: 'earth tones' | 'neutral' | 'cold tones';
    issue?: string;
  };
  setting: {
    score: number;
    assessment: 'natural' | 'neutral' | 'clinical';
    issue?: string;
  };
  authenticity: {
    score: number;
    assessment: 'authentic' | 'generic' | 'artificial';
    issue?: string;
  };
  totalScore: number;
  overallAssessment: 'on-brand' | 'needs-adjustment' | 'off-brand';
}

export interface BrandAwareSceneAnalysis extends SceneAnalysis {
  brandAlignment: BrandAlignmentScore;
  sceneTypeMatch: {
    appropriate: boolean;
    notes: string;
  };
  recommendation: 'pass' | 'adjust' | 'regenerate';
  suggestedImprovements: string[];
  overallScore: number;
}

class SceneAnalysisService {
  private anthropic: Anthropic | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && !this.anthropic) {
      const keyPrefix = apiKey.substring(0, 15);
      const keyLength = apiKey.length;
      const hasWhitespace = /\s/.test(apiKey);
      console.log(`[SceneAnalysis] Initializing Anthropic client`);
      console.log(`[SceneAnalysis] API Key prefix: ${keyPrefix}...`);
      console.log(`[SceneAnalysis] API Key length: ${keyLength} chars`);
      console.log(`[SceneAnalysis] API Key has whitespace: ${hasWhitespace}`);
      
      const cleanedKey = apiKey.trim();
      this.anthropic = new Anthropic({
        apiKey: cleanedKey,
      });
    }
  }

  isAvailable(): boolean {
    // Re-check at runtime in case the secret was loaded after construction
    if (!this.anthropic && process.env.ANTHROPIC_API_KEY) {
      this.initializeClient();
    }
    const available = !!this.anthropic;
    console.log(`[SceneAnalysis] isAvailable() = ${available}, ANTHROPIC_API_KEY present: ${!!process.env.ANTHROPIC_API_KEY}`);
    return available;
  }

  async analyzeScene(
    imageUrl: string,
    context: {
      sceneType: string;
      narration: string;
      hasTextOverlays: boolean;
      hasProductOverlay: boolean;
    }
  ): Promise<SceneAnalysis> {
    console.log(`[SceneAnalysis] Analyzing scene: ${context.sceneType}`);
    
    if (!this.anthropic) {
      console.warn(`[SceneAnalysis] Anthropic not configured, using defaults`);
      return this.getDefaultAnalysis();
    }

    try {
      const imageData = await this.fetchAndEncodeImage(imageUrl);
      
      if (!imageData) {
        console.warn(`[SceneAnalysis] Could not fetch image, using defaults`);
        return this.getDefaultAnalysis();
      }

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageData.mediaType,
                  data: imageData.base64,
                },
              },
              {
                type: 'text',
                text: this.buildAnalysisPrompt(context),
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const analysis = this.parseAnalysisResponse(content.text);
      
      console.log(`[SceneAnalysis] Complete:`, {
        faces: analysis.faces.count,
        focalPoint: analysis.composition.focalPoint,
        recommendedTextPos: analysis.recommendations.textPosition,
        contentType: analysis.contentType,
      });

      return analysis;

    } catch (error: any) {
      console.error(`[SceneAnalysis] Failed:`, error.message);
      return this.getDefaultAnalysis();
    }
  }

  async analyzeScenes(
    scenes: Array<{
      id: string;
      imageUrl: string;
      sceneType: string;
      narration: string;
      hasTextOverlays: boolean;
      hasProductOverlay: boolean;
    }>
  ): Promise<Map<string, SceneAnalysis>> {
    const results = new Map<string, SceneAnalysis>();
    
    console.log(`[SceneAnalysis] Analyzing ${scenes.length} scenes...`);
    
    for (const scene of scenes) {
      const analysis = await this.analyzeScene(scene.imageUrl, {
        sceneType: scene.sceneType,
        narration: scene.narration,
        hasTextOverlays: scene.hasTextOverlays,
        hasProductOverlay: scene.hasProductOverlay,
      });
      
      results.set(scene.id, analysis);
      
      await this.sleep(500);
    }
    
    return results;
  }

  /**
   * Brand-aware scene analysis with Pine Hill Farm aesthetic scoring
   */
  async analyzeSceneWithBrandContext(
    imageUrl: string,
    context: {
      sceneType: string;
      narration: string;
      sceneIndex: number;
      expectedContentType: string;
    }
  ): Promise<BrandAwareSceneAnalysis> {
    console.log(`[SceneAnalysis] Analyzing scene ${context.sceneIndex + 1} with brand context...`);
    
    if (!this.anthropic) {
      console.warn(`[SceneAnalysis] Anthropic not configured, using defaults`);
      return this.getDefaultBrandAwareAnalysis();
    }

    try {
      const imageData = await this.fetchAndEncodeImage(imageUrl);
      
      if (!imageData) {
        console.warn(`[SceneAnalysis] Could not fetch image, using defaults`);
        return this.getDefaultBrandAwareAnalysis();
      }

      const visualContext = await brandContextService.getVisualAnalysisContextFull();
      const roleContext = await projectInstructionsService.getCondensedRoleContext();

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageData.mediaType,
                  data: imageData.base64,
                },
              },
              {
                type: 'text',
                text: this.buildBrandAwareAnalysisPrompt(context, visualContext, roleContext),
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      const analysis = this.parseBrandAwareAnalysisResponse(content.text);
      
      console.log(`[SceneAnalysis] Brand alignment: ${analysis.brandAlignment.totalScore}/100 - ${analysis.brandAlignment.overallAssessment}`);
      
      if (analysis.brandAlignment.totalScore < 70) {
        console.log(`[SceneAnalysis] Brand issues:`);
        if (analysis.brandAlignment.lighting.score < 20) {
          console.log(`  - Lighting: ${analysis.brandAlignment.lighting.issue}`);
        }
        if (analysis.brandAlignment.colorPalette.score < 20) {
          console.log(`  - Colors: ${analysis.brandAlignment.colorPalette.issue}`);
        }
        if (analysis.brandAlignment.setting.score < 20) {
          console.log(`  - Setting: ${analysis.brandAlignment.setting.issue}`);
        }
        if (analysis.brandAlignment.authenticity.score < 20) {
          console.log(`  - Feel: ${analysis.brandAlignment.authenticity.issue}`);
        }
      }

      return analysis;

    } catch (error: any) {
      console.error(`[SceneAnalysis] Brand-aware analysis failed:`, error.message);
      return this.getDefaultBrandAwareAnalysis();
    }
  }

  private buildBrandAwareAnalysisPrompt(
    context: {
      sceneType: string;
      narration: string;
      sceneIndex: number;
      expectedContentType: string;
    },
    visualContext: string,
    roleContext: string
  ): string {
    return `${roleContext}

Analyze this video frame for Pine Hill Farm brand alignment.

${visualContext}

SCENE CONTEXT:
- Scene Type: ${context.sceneType}
- Scene Number: ${context.sceneIndex + 1}
- Expected Content: ${context.expectedContentType}
- Narration: "${context.narration.substring(0, 200)}..."

ANALYSIS REQUIRED:

1. **Technical Quality**
   - Resolution and sharpness
   - Exposure and contrast
   - Focus accuracy

2. **Composition**
   - Framing and rule of thirds
   - Subject placement
   - Visual balance

3. **Brand Aesthetic Alignment** (CRITICAL)
   Score each element 0-25:
   
   a) LIGHTING (0-25):
      - Is it warm and golden? Or cold and clinical?
      - Natural or artificial feeling?
   
   b) COLOR PALETTE (0-25):
      - Earth tones (green, brown, gold)? Or cold blues/grays?
      - Brand color alignment?
   
   c) SETTING/ENVIRONMENT (0-25):
      - Natural, farm, home, wellness? Or clinical, corporate?
      - Organic textures present?
   
   d) AUTHENTICITY/FEEL (0-25):
      - Real and warm? Or stock-photo/corporate?
      - Would target audience (women 35-65) connect?

4. **Scene Type Appropriateness**
   - Does this visual match a "${context.sceneType}" scene?
   - Does it support the narration?

5. **Face Detection & Composition** (for overlay positioning)
   - Detect any faces and their positions
   - Identify safe zones for text/product overlays

Return JSON:
{
  "faces": {
    "detected": true/false,
    "count": number,
    "positions": [{"x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100}]
  },
  "composition": {
    "focalPoint": {"x": 0-100, "y": 0-100},
    "brightness": "dark" | "normal" | "bright",
    "dominantColors": ["#hex1", "#hex2", "#hex3"]
  },
  "safeZones": {
    "topLeft": true/false,
    "topCenter": true/false,
    "topRight": true/false,
    "middleLeft": true/false,
    "middleCenter": true/false,
    "middleRight": true/false,
    "bottomLeft": true/false,
    "bottomCenter": true/false,
    "bottomRight": true/false
  },
  "recommendations": {
    "textPosition": {
      "vertical": "top" | "center" | "lower-third",
      "horizontal": "left" | "center" | "right"
    },
    "textColor": "#ffffff" or "#000000",
    "needsTextShadow": true/false,
    "needsTextBackground": true/false,
    "productOverlayPosition": {
      "x": "left" | "center" | "right",
      "y": "top" | "center" | "bottom"
    },
    "productOverlaySafe": true/false
  },
  "contentType": "person" | "product" | "nature" | "abstract" | "mixed",
  "mood": "positive" | "neutral" | "serious" | "dramatic",
  "brandAlignment": {
    "lighting": {
      "score": 0-25,
      "assessment": "warm" | "neutral" | "cold",
      "issue": "description if score < 20"
    },
    "colorPalette": {
      "score": 0-25,
      "assessment": "earth tones" | "neutral" | "cold tones",
      "issue": "description if score < 20"
    },
    "setting": {
      "score": 0-25,
      "assessment": "natural" | "neutral" | "clinical",
      "issue": "description if score < 20"
    },
    "authenticity": {
      "score": 0-25,
      "assessment": "authentic" | "generic" | "artificial",
      "issue": "description if score < 20"
    },
    "totalScore": 0-100,
    "overallAssessment": "on-brand" | "needs-adjustment" | "off-brand"
  },
  "sceneTypeMatch": {
    "appropriate": true/false,
    "notes": ""
  },
  "recommendation": "pass" | "adjust" | "regenerate",
  "suggestedImprovements": [
    "specific actionable improvement"
  ]
}

IMPORTANT RULES:
- Be strict on brand alignment - Pine Hill Farm has a specific warm, natural aesthetic
- Score 85+ = pass, 70-84 = adjust recommended, below 70 = regenerate
- Provide specific, actionable improvement suggestions
- Lower-third is usually safest for text if faces are present`;
  }

  private parseBrandAwareAnalysisResponse(text: string): BrandAwareSceneAnalysis {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      const brandAlignment: BrandAlignmentScore = {
        lighting: {
          score: parsed.brandAlignment?.lighting?.score || 15,
          assessment: parsed.brandAlignment?.lighting?.assessment || 'neutral',
          issue: parsed.brandAlignment?.lighting?.issue,
        },
        colorPalette: {
          score: parsed.brandAlignment?.colorPalette?.score || 15,
          assessment: parsed.brandAlignment?.colorPalette?.assessment || 'neutral',
          issue: parsed.brandAlignment?.colorPalette?.issue,
        },
        setting: {
          score: parsed.brandAlignment?.setting?.score || 15,
          assessment: parsed.brandAlignment?.setting?.assessment || 'neutral',
          issue: parsed.brandAlignment?.setting?.issue,
        },
        authenticity: {
          score: parsed.brandAlignment?.authenticity?.score || 15,
          assessment: parsed.brandAlignment?.authenticity?.assessment || 'generic',
          issue: parsed.brandAlignment?.authenticity?.issue,
        },
        totalScore: parsed.brandAlignment?.totalScore || 60,
        overallAssessment: parsed.brandAlignment?.overallAssessment || 'needs-adjustment',
      };

      const overallScore = this.calculateOverallScore(parsed, brandAlignment);

      const computedRecommendation = this.computeRecommendation(brandAlignment.totalScore);
      const modelRecommendation = parsed.recommendation;
      
      if (modelRecommendation && modelRecommendation !== computedRecommendation) {
        console.log(`[SceneAnalysis] Overriding model recommendation "${modelRecommendation}" with computed "${computedRecommendation}" based on brand score ${brandAlignment.totalScore}`);
      }

      return {
        faces: {
          detected: parsed.faces?.detected || false,
          count: parsed.faces?.count || 0,
          positions: parsed.faces?.positions || [],
        },
        composition: {
          focalPoint: parsed.composition?.focalPoint || { x: 50, y: 50 },
          brightness: parsed.composition?.brightness || 'normal',
          dominantColors: parsed.composition?.dominantColors || ['#808080'],
        },
        safeZones: {
          topLeft: parsed.safeZones?.topLeft ?? true,
          topCenter: parsed.safeZones?.topCenter ?? true,
          topRight: parsed.safeZones?.topRight ?? true,
          middleLeft: parsed.safeZones?.middleLeft ?? true,
          middleCenter: parsed.safeZones?.middleCenter ?? false,
          middleRight: parsed.safeZones?.middleRight ?? true,
          bottomLeft: parsed.safeZones?.bottomLeft ?? true,
          bottomCenter: parsed.safeZones?.bottomCenter ?? true,
          bottomRight: parsed.safeZones?.bottomRight ?? true,
        },
        recommendations: {
          textPosition: {
            vertical: parsed.recommendations?.textPosition?.vertical || 'lower-third',
            horizontal: parsed.recommendations?.textPosition?.horizontal || 'center',
          },
          textColor: parsed.recommendations?.textColor || '#FFFFFF',
          needsTextShadow: parsed.recommendations?.needsTextShadow ?? true,
          needsTextBackground: parsed.recommendations?.needsTextBackground ?? false,
          productOverlayPosition: {
            x: parsed.recommendations?.productOverlayPosition?.x || 'right',
            y: parsed.recommendations?.productOverlayPosition?.y || 'bottom',
          },
          productOverlaySafe: parsed.recommendations?.productOverlaySafe ?? true,
        },
        contentType: parsed.contentType || 'mixed',
        mood: parsed.mood || 'neutral',
        brandAlignment,
        sceneTypeMatch: {
          appropriate: parsed.sceneTypeMatch?.appropriate ?? true,
          notes: parsed.sceneTypeMatch?.notes || '',
        },
        recommendation: computedRecommendation,
        suggestedImprovements: parsed.suggestedImprovements || [],
        overallScore,
      };

    } catch (error: any) {
      console.error(`[SceneAnalysis] Parse error:`, error.message);
      return this.getDefaultBrandAwareAnalysis();
    }
  }

  private calculateOverallScore(parsed: any, brandAlignment: BrandAlignmentScore): number {
    const technicalWeight = 0.25;
    const compositionWeight = 0.25;
    const brandWeight = 0.50;

    const technicalScore = 80;
    const compositionScore = parsed.composition?.focalPoint ? 80 : 70;
    const brandScore = brandAlignment.totalScore;

    return Math.round(
      technicalScore * technicalWeight +
      compositionScore * compositionWeight +
      brandScore * brandWeight
    );
  }

  private computeRecommendation(brandScore: number): 'pass' | 'adjust' | 'regenerate' {
    if (brandScore >= 85) {
      return 'pass';
    } else if (brandScore >= 70) {
      return 'adjust';
    } else {
      return 'regenerate';
    }
  }

  private getDefaultBrandAwareAnalysis(): BrandAwareSceneAnalysis {
    const defaultBase = this.getDefaultAnalysis();
    return {
      ...defaultBase,
      brandAlignment: {
        lighting: { score: 20, assessment: 'warm' },
        colorPalette: { score: 20, assessment: 'earth tones' },
        setting: { score: 20, assessment: 'natural' },
        authenticity: { score: 20, assessment: 'authentic' },
        totalScore: 80,
        overallAssessment: 'needs-adjustment',
      },
      sceneTypeMatch: {
        appropriate: true,
        notes: 'Default analysis - no brand evaluation performed',
      },
      recommendation: 'adjust',
      suggestedImprovements: ['Manual review recommended - automated analysis unavailable'],
      overallScore: 80,
    };
  }

  async fetchAndEncodeImage(
    imageUrl: string
  ): Promise<{ base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' } | null> {
    try {
      if (imageUrl.includes('.mp4') || imageUrl.includes('.webm') || imageUrl.includes('video')) {
        console.log(`[SceneAnalysis] Video URL detected, attempting frame extraction...`);
        
        const { videoFrameExtractor } = await import('./video-frame-extractor');
        const frameData = await videoFrameExtractor.extractFrameAsBase64(imageUrl, 2);
        
        if (frameData) {
          return frameData;
        }
        
        console.warn(`[SceneAnalysis] Frame extraction failed, skipping analysis`);
        return null;
      }

      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const base64 = buffer.toString('base64');
      
      let mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' = 'image/jpeg';
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('png')) mediaType = 'image/png';
      else if (contentType?.includes('webp')) mediaType = 'image/webp';
      else if (contentType?.includes('gif')) mediaType = 'image/gif';
      else if (imageUrl.includes('.png')) mediaType = 'image/png';
      else if (imageUrl.includes('.webp')) mediaType = 'image/webp';

      return { base64, mediaType };

    } catch (error: any) {
      console.error(`[SceneAnalysis] Image fetch failed:`, error.message);
      return null;
    }
  }

  private buildAnalysisPrompt(context: {
    sceneType: string;
    narration: string;
    hasTextOverlays: boolean;
    hasProductOverlay: boolean;
  }): string {
    return `Analyze this image for professional video composition.

CONTEXT:
- Scene type: ${context.sceneType}
- Has text overlays: ${context.hasTextOverlays}
- Has product overlay: ${context.hasProductOverlay}
- Narration: "${context.narration.substring(0, 150)}..."

Respond with a JSON object in this EXACT format:
{
  "faces": {
    "detected": true/false,
    "count": number,
    "positions": [
      {"x": 0-100, "y": 0-100, "width": 0-100, "height": 0-100}
    ]
  },
  "composition": {
    "focalPoint": {"x": 0-100, "y": 0-100},
    "brightness": "dark" | "normal" | "bright",
    "dominantColors": ["#hex1", "#hex2", "#hex3"]
  },
  "safeZones": {
    "topLeft": true/false,
    "topCenter": true/false,
    "topRight": true/false,
    "middleLeft": true/false,
    "middleCenter": true/false,
    "middleRight": true/false,
    "bottomLeft": true/false,
    "bottomCenter": true/false,
    "bottomRight": true/false
  },
  "recommendations": {
    "textPosition": {
      "vertical": "top" | "center" | "lower-third",
      "horizontal": "left" | "center" | "right"
    },
    "textColor": "#ffffff" or "#000000",
    "needsTextShadow": true/false,
    "needsTextBackground": true/false,
    "productOverlayPosition": {
      "x": "left" | "center" | "right",
      "y": "top" | "center" | "bottom"
    },
    "productOverlaySafe": true/false
  },
  "contentType": "person" | "product" | "nature" | "abstract" | "mixed",
  "mood": "positive" | "neutral" | "serious" | "dramatic"
}

RULES:
1. A zone is NOT safe if a face or important subject occupies it
2. Text should NEVER overlap faces
3. Product overlays should not block faces or focal points
4. Use white text (#ffffff) on dark backgrounds, black (#000000) on light
5. Add text shadow if background has mixed brightness
6. Lower-third is usually safest for text if faces are present
7. Positions are percentages (0=left/top, 100=right/bottom)

Return ONLY the JSON object.`;
  }

  private parseAnalysisResponse(text: string): SceneAnalysis {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        faces: {
          detected: parsed.faces?.detected || false,
          count: parsed.faces?.count || 0,
          positions: parsed.faces?.positions || [],
        },
        composition: {
          focalPoint: parsed.composition?.focalPoint || { x: 50, y: 50 },
          brightness: parsed.composition?.brightness || 'normal',
          dominantColors: parsed.composition?.dominantColors || ['#808080'],
        },
        safeZones: {
          topLeft: parsed.safeZones?.topLeft ?? true,
          topCenter: parsed.safeZones?.topCenter ?? true,
          topRight: parsed.safeZones?.topRight ?? true,
          middleLeft: parsed.safeZones?.middleLeft ?? true,
          middleCenter: parsed.safeZones?.middleCenter ?? false,
          middleRight: parsed.safeZones?.middleRight ?? true,
          bottomLeft: parsed.safeZones?.bottomLeft ?? true,
          bottomCenter: parsed.safeZones?.bottomCenter ?? true,
          bottomRight: parsed.safeZones?.bottomRight ?? true,
        },
        recommendations: {
          textPosition: {
            vertical: parsed.recommendations?.textPosition?.vertical || 'lower-third',
            horizontal: parsed.recommendations?.textPosition?.horizontal || 'center',
          },
          textColor: parsed.recommendations?.textColor || '#FFFFFF',
          needsTextShadow: parsed.recommendations?.needsTextShadow ?? true,
          needsTextBackground: parsed.recommendations?.needsTextBackground ?? false,
          productOverlayPosition: {
            x: parsed.recommendations?.productOverlayPosition?.x || 'right',
            y: parsed.recommendations?.productOverlayPosition?.y || 'bottom',
          },
          productOverlaySafe: parsed.recommendations?.productOverlaySafe ?? true,
        },
        contentType: parsed.contentType || 'mixed',
        mood: parsed.mood || 'neutral',
      };

    } catch (error: any) {
      console.error(`[SceneAnalysis] Parse error:`, error.message);
      return this.getDefaultAnalysis();
    }
  }

  getDefaultAnalysis(): SceneAnalysis {
    return {
      faces: {
        detected: false,
        count: 0,
        positions: [],
      },
      composition: {
        focalPoint: { x: 50, y: 50 },
        brightness: 'normal',
        dominantColors: ['#2D5A27', '#F5F5DC'],
      },
      safeZones: {
        topLeft: true,
        topCenter: true,
        topRight: true,
        middleLeft: true,
        middleCenter: false,
        middleRight: true,
        bottomLeft: true,
        bottomCenter: true,
        bottomRight: true,
      },
      recommendations: {
        textPosition: {
          vertical: 'lower-third',
          horizontal: 'center',
        },
        textColor: '#FFFFFF',
        needsTextShadow: true,
        needsTextBackground: false,
        productOverlayPosition: {
          x: 'right',
          y: 'bottom',
        },
        productOverlaySafe: true,
      },
      contentType: 'mixed',
      mood: 'positive',
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Phase 8A: Comprehensive scene analysis with AI artifact detection
   * Phase 10A: Added diagnostic logging
   */
  async analyzeScenePhase8(
    imageBase64: string,
    context: SceneContext
  ): Promise<Phase8AnalysisResult> {
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('[Phase10A] SCENE ANALYSIS STARTED');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log(`[Phase10A] Scene: ${context.sceneIndex + 1}/${context.totalScenes}`);
    console.log(`[Phase10A] Scene Type: ${context.sceneType}`);
    console.log(`[Phase10A] Visual Direction: "${context.visualDirection?.substring(0, 120)}..."`);
    console.log(`[Phase10A] Narration: "${context.narration?.substring(0, 100)}..."`);
    console.log(`[Phase10A] Image data size: ${imageBase64.length} chars`);
    console.log(`[Phase10A] Anthropic client available: ${!!this.anthropic}`);
    console.log(`[Phase10A] ANTHROPIC_API_KEY env: ${!!process.env.ANTHROPIC_API_KEY}`);
    
    // Re-check in case the key was loaded after construction
    if (!this.anthropic && process.env.ANTHROPIC_API_KEY) {
      console.log('[Phase10A] Re-initializing Anthropic client...');
      this.initializeClient();
    }
    
    if (!this.anthropic) {
      console.warn('═══════════════════════════════════════════════════════════════════════════════');
      console.warn('[Phase10A] WARNING: ANTHROPIC NOT CONFIGURED');
      console.warn('[Phase10A] Returning SIMULATED result with FAKE scores (75-90 range)');
      console.warn('[Phase10A] This is why quality scores appear incorrect!');
      console.warn('═══════════════════════════════════════════════════════════════════════════════');
      return this.createSimulatedPhase8Result(context);
    }
    
    const brandContext = await brandContextService.getVisualAnalysisContext();
    const analysisPrompt = this.buildPhase8AnalysisPrompt(context, brandContext);
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2500,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: analysisPrompt,
              },
            ],
          },
        ],
      });
      
      const analysisText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';
      
      console.log('[Phase10A] Claude Vision API call SUCCESSFUL');
      console.log('[Phase10A] Raw response length:', analysisText.length, 'chars');
      
      const result = this.parsePhase8AnalysisResponse(analysisText, context);
      
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      console.log('[Phase10A] REAL ANALYSIS RESULT (from Claude Vision)');
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      console.log(`[Phase10A] Scene ${context.sceneIndex + 1} Overall Score: ${result.overallScore}/100`);
      console.log(`[Phase10A] Technical: ${result.technicalScore}, Content Match: ${result.contentMatchScore}`);
      console.log(`[Phase10A] Brand: ${result.brandComplianceScore}, Composition: ${result.compositionScore}`);
      console.log(`[Phase10A] Recommendation: ${result.recommendation}`);
      console.log(`[Phase10A] Content Match Details: ${result.contentMatchDetails}`);
      console.log(`[Phase10A] Issues: ${result.issues.length > 0 ? result.issues.map(i => i.description).join('; ') : 'None'}`);
      if (result.aiArtifactsDetected) {
        console.log(`[Phase10A] AI Artifacts: ${result.aiArtifactDetails.join(', ')}`);
      }
      console.log(`[Phase10A] Analysis Model: ${result.analysisModel}`);
      console.log('═══════════════════════════════════════════════════════════════════════════════');
      
      return result;
      
    } catch (error: any) {
      console.error('═══════════════════════════════════════════════════════════════════════════════');
      console.error('[Phase10A] CLAUDE VISION API CALL FAILED');
      console.error('[Phase10A] Error:', error.message);
      console.error('[Phase10A] Returning FAILED result with score 0');
      console.error('═══════════════════════════════════════════════════════════════════════════════');
      return this.createFailedPhase8Result(context, error.message);
    }
  }

  /**
   * Phase 8A: Quick check for blank/gradient images
   */
  async isBlankOrGradient(imageBase64: string): Promise<boolean> {
    if (!this.anthropic) {
      return false;
    }
    
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 100,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: 'Is this image blank, a solid color, or just a gradient with no meaningful content? Answer only "yes" or "no".',
              },
            ],
          },
        ],
      });
      
      const answer = response.content[0].type === 'text' 
        ? response.content[0].text.toLowerCase().trim()
        : '';
      
      return answer.includes('yes');
      
    } catch {
      return false;
    }
  }

  private buildPhase8AnalysisPrompt(context: SceneContext, brandContext: string): string {
    return `You are a video production quality analyst. Analyze this image for a marketing video scene.

## SCENE CONTEXT
- Scene ${context.sceneIndex + 1} of ${context.totalScenes}
- Scene Type: ${context.sceneType}
- Expected Content: ${context.expectedContentType}
- Narration: "${context.narration}"
- Visual Direction: "${context.visualDirection}"

## BRAND GUIDELINES
${brandContext}

## ANALYSIS REQUIRED

Analyze this image and provide a JSON response with the following structure:

\`\`\`json
{
  "technicalQuality": {
    "score": <0-100>,
    "resolution": "<good|acceptable|poor>",
    "focus": "<sharp|soft|blurry>",
    "exposure": "<good|overexposed|underexposed>",
    "issues": ["<issue1>", "<issue2>"]
  },
  "contentMatch": {
    "score": <0-100>,
    "matchesNarration": <true|false>,
    "matchesVisualDirection": <true|false>,
    "appropriateForSceneType": <true|false>,
    "explanation": "<why it matches or doesn't>"
  },
  "aiArtifacts": {
    "detected": <true|false>,
    "artifacts": [
      {
        "type": "<garbled_text|fake_ui|distorted_hands|unnatural_face|duplicate_elements|other>",
        "description": "<description>",
        "severity": "<critical|major|minor>"
      }
    ]
  },
  "brandCompliance": {
    "score": <0-100>,
    "lightingMatch": <true|false>,
    "lightingType": "<warm|cool|neutral|mixed>",
    "colorPaletteMatch": <true|false>,
    "dominantColors": ["<color1>", "<color2>"],
    "settingAppropriate": <true|false>,
    "authenticFeel": <true|false>,
    "issues": ["<issue1>", "<issue2>"]
  },
  "composition": {
    "score": <0-100>,
    "subjectPosition": "<left|center|right|none>",
    "faceDetected": <true|false>,
    "faceRegion": {"x": <0-1>, "y": <0-1>, "width": <0-1>, "height": <0-1>} | null,
    "busyRegions": ["<top|bottom|left|right|center>"],
    "safeTextZones": [
      {"position": "<lower-third|top|bottom-left|bottom-right>", "confidence": <0-100>}
    ]
  },
  "overallAssessment": {
    "recommendation": "<approved|needs_review|regenerate|critical_fail>",
    "primaryIssues": ["<issue1>", "<issue2>"],
    "improvedPrompt": "<if regenerate needed, provide improved visual direction>"
  }
}
\`\`\`

## SCORING WEIGHTS
- Technical Quality: 20% of total
- Content Match: 30% of total  
- Brand Compliance: 30% of total
- Composition: 20% of total

## CRITICAL CHECKS (must flag these)
1. AI ARTIFACTS: Garbled/overlapping text, fake UI elements, distorted hands/faces, duplicate elements
2. BLANK/EMPTY: Solid colors, gradients with no content, missing subjects
3. CONTENT MISMATCH: Image completely unrelated to narration
4. BRAND VIOLATION: Clinical/cold lighting, wrong color palette, corporate feel

If ANY critical issue is found, recommendation should be "regenerate" or "critical_fail".

Respond ONLY with the JSON, no other text.`;
  }

  private parsePhase8AnalysisResponse(
    responseText: string,
    context: SceneContext
  ): Phase8AnalysisResult {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const analysis = JSON.parse(jsonMatch[0]);
      
      const technicalScore = Math.round((analysis.technicalQuality?.score || 0) * 0.2);
      const contentMatchScore = Math.round((analysis.contentMatch?.score || 0) * 0.3);
      const brandComplianceScore = Math.round((analysis.brandCompliance?.score || 0) * 0.3);
      const compositionScore = Math.round((analysis.composition?.score || 0) * 0.2);
      
      const overallScore = technicalScore + contentMatchScore + brandComplianceScore + compositionScore;
      
      const issues: AnalysisIssue[] = [];
      
      if (analysis.aiArtifacts?.detected) {
        for (const artifact of analysis.aiArtifacts.artifacts || []) {
          issues.push({
            category: 'ai_artifacts',
            severity: artifact.severity || 'major',
            description: artifact.description,
            suggestion: `Remove ${artifact.type} by regenerating with cleaner prompt`,
          });
        }
      }
      
      if (!analysis.contentMatch?.matchesNarration) {
        issues.push({
          category: 'content_match',
          severity: 'major',
          description: analysis.contentMatch?.explanation || 'Visual does not match narration',
          suggestion: 'Regenerate with more specific visual direction',
        });
      }
      
      for (const issue of analysis.brandCompliance?.issues || []) {
        issues.push({
          category: 'brand_compliance',
          severity: 'major',
          description: issue,
          suggestion: 'Adjust to match Pine Hill Farm aesthetic (warm lighting, earth tones)',
        });
      }
      
      for (const issue of analysis.technicalQuality?.issues || []) {
        issues.push({
          category: 'technical',
          severity: 'minor',
          description: issue,
          suggestion: 'Regenerate for better quality',
        });
      }
      
      let recommendation: Phase8AnalysisResult['recommendation'] = 'approved';
      const hasCriticalArtifact = analysis.aiArtifacts?.artifacts?.some(
        (a: any) => a.severity === 'critical'
      );
      
      if (hasCriticalArtifact || overallScore < 50) {
        recommendation = 'critical_fail';
      } else if (overallScore < 70) {
        recommendation = 'regenerate';
      } else if (overallScore < 85) {
        recommendation = 'needs_review';
      }
      
      return {
        sceneIndex: context.sceneIndex,
        overallScore,
        technicalScore,
        contentMatchScore,
        brandComplianceScore,
        compositionScore,
        aiArtifactsDetected: analysis.aiArtifacts?.detected || false,
        aiArtifactDetails: (analysis.aiArtifacts?.artifacts || []).map((a: any) => a.description),
        contentMatchDetails: analysis.contentMatch?.explanation || '',
        brandComplianceDetails: (analysis.brandCompliance?.issues || []).join('; '),
        frameAnalysis: {
          subjectPosition: analysis.composition?.subjectPosition || 'center',
          faceDetected: analysis.composition?.faceDetected || false,
          faceRegion: analysis.composition?.faceRegion || undefined,
          busyRegions: analysis.composition?.busyRegions || [],
          dominantColors: analysis.brandCompliance?.dominantColors || [],
          lightingType: analysis.brandCompliance?.lightingType || 'neutral',
          safeTextZones: analysis.composition?.safeTextZones || [],
        },
        issues,
        recommendation,
        improvedPrompt: analysis.overallAssessment?.improvedPrompt,
        analysisTimestamp: new Date().toISOString(),
        analysisModel: 'claude-sonnet-4-20250514',
      };
      
    } catch (error: any) {
      console.error('[SceneAnalysis Phase8] Parse error:', error.message);
      return this.createFailedPhase8Result(context, `Parse error: ${error.message}`);
    }
  }

  private createFailedPhase8Result(context: SceneContext, reason: string): Phase8AnalysisResult {
    return {
      sceneIndex: context.sceneIndex,
      overallScore: 0,
      technicalScore: 0,
      contentMatchScore: 0,
      brandComplianceScore: 0,
      compositionScore: 0,
      aiArtifactsDetected: false,
      aiArtifactDetails: [],
      contentMatchDetails: '',
      brandComplianceDetails: '',
      frameAnalysis: {
        subjectPosition: 'none',
        faceDetected: false,
        busyRegions: [],
        dominantColors: [],
        lightingType: 'neutral',
        safeTextZones: [],
      },
      issues: [{
        category: 'technical',
        severity: 'critical',
        description: `Analysis failed: ${reason}`,
        suggestion: 'Retry analysis or manually review',
      }],
      recommendation: 'critical_fail',
      analysisTimestamp: new Date().toISOString(),
      analysisModel: 'claude-sonnet-4-20250514',
    };
  }

  /**
   * Phase 10A WARNING: This method generates FAKE random scores!
   * These are NOT real quality analysis results from Claude Vision.
   * When ANTHROPIC_API_KEY is not configured, this placeholder data is returned.
   */
  private createSimulatedPhase8Result(context: SceneContext): Phase8AnalysisResult {
    // WARNING: These are FAKE random scores, NOT real analysis!
    const baseScore = 75 + Math.floor(Math.random() * 15);
    const technicalScore = Math.round(baseScore * 0.2);
    const contentMatchScore = Math.round(baseScore * 0.3);
    const brandComplianceScore = Math.round(baseScore * 0.3);
    const compositionScore = Math.round(baseScore * 0.2);
    const overallScore = technicalScore + contentMatchScore + brandComplianceScore + compositionScore;
    
    console.warn(`[Phase10A] Generated FAKE score ${overallScore} for scene ${context.sceneIndex + 1} (random 75-90 range)`);
    
    return {
      sceneIndex: context.sceneIndex,
      overallScore,
      technicalScore,
      contentMatchScore,
      brandComplianceScore,
      compositionScore,
      aiArtifactsDetected: false,
      aiArtifactDetails: [],
      contentMatchDetails: '⚠️ SIMULATED (FAKE) - Claude Vision not available. Configure ANTHROPIC_API_KEY for real analysis.',
      brandComplianceDetails: '⚠️ NOT ANALYZED - No Anthropic API key',
      frameAnalysis: {
        subjectPosition: 'center',
        faceDetected: false,
        busyRegions: [],
        dominantColors: ['earth tones'],
        lightingType: 'warm',
        safeTextZones: [{ position: 'lower-third', confidence: 80 }],
      },
      issues: [{
        category: 'technical',
        severity: 'warning' as const,
        description: '⚠️ This is a SIMULATED score. Claude Vision analysis not performed.',
        suggestion: 'Configure ANTHROPIC_API_KEY to enable real quality analysis',
      }],
      recommendation: 'needs_review',
      analysisTimestamp: new Date().toISOString(),
      analysisModel: 'simulated-fake-scores',
    };
  }
}

export const sceneAnalysisService = new SceneAnalysisService();
