import Anthropic from '@anthropic-ai/sdk';

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

class SceneAnalysisService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
    }
  }

  isAvailable(): boolean {
    return !!this.anthropic;
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
}

export const sceneAnalysisService = new SceneAnalysisService();
