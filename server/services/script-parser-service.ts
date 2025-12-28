import Anthropic from "@anthropic-ai/sdk";
import { brandContextService } from "./brand-context-service";
import { projectInstructionsService } from "./project-instructions-service";

export interface ParsedScene {
  id: string;
  type: string;
  narration: string;
  duration: number;
  visualDirection: string;
  searchQuery?: string;
  fallbackQuery?: string;
  contentType: string;
  status: string;
  keyPoints?: string[];
  serviceMatch?: string | null;
  productMatch?: string | null;
  conditionMatch?: string | null;
  audienceResonance?: string | null;
  brandOpportunity?: string | null;
}

export interface ParsedScriptSummary {
  totalDuration: number;
  sceneCount: number;
  primaryService?: string | null;
  targetConditions?: string[];
  brandAlignment?: string;
}

export interface ParsedScript {
  scenes: ParsedScene[];
  summary: ParsedScriptSummary;
  brandMatches: {
    services: string[];
    products: string[];
    conditions: string[];
  };
}

export interface ScriptParseOptions {
  platform: string;
  visualStyle: string;
  targetDuration?: number;
}

class ScriptParserService {
  private anthropic: Anthropic | null = null;

  constructor() {
    if (process.env.ANTHROPIC_API_KEY) {
      this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      console.log("[ScriptParser] Anthropic client configured");
    } else {
      console.warn("[ScriptParser] Anthropic API key not found");
    }
  }

  async parseScript(
    script: string,
    options: ScriptParseOptions
  ): Promise<ParsedScript> {
    if (!this.anthropic) {
      throw new Error("Anthropic API not configured");
    }

    console.log("[ScriptParser] Starting brand-aware script parsing...");

    const brandContext = await brandContextService.getScriptParsingContext();
    const serviceMatches = await brandContextService.matchScriptToServices(script);
    const roleContext = await projectInstructionsService.getCondensedRoleContext();

    console.log(
      `[ScriptParser] Brand matches - Services: ${serviceMatches.services.length}, Products: ${serviceMatches.products.length}, Conditions: ${serviceMatches.conditions.length}`
    );

    const systemPrompt = this.buildBrandAwareSystemPrompt(brandContext, roleContext);
    const userPrompt = this.buildParsingPrompt(script, options, serviceMatches);

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      return this.parseResponse(content.text, serviceMatches);
    } catch (error: any) {
      console.error("[ScriptParser] Parsing failed:", error.message);
      throw error;
    }
  }

  private buildBrandAwareSystemPrompt(brandContext: string, roleContext: string): string {
    return `${roleContext}

You are an expert video script parser for Pine Hill Farm, a farm-to-wellness brand.

${brandContext}

YOUR ROLE:
You parse video scripts into scenes, identifying:
1. Scene breaks and types (hook, problem, solution, benefit, testimonial, cta)
2. Pine Hill Farm service/product connections for each scene
3. Visual directions that match the brand's warm, natural aesthetic
4. Target audience resonance points
5. Brand messaging opportunities

SCENE TYPES FOR PINE HILL FARM:
- "hook": Opening that captures attention, often showing a relatable health struggle
- "problem": Depicts the health challenge (fatigue, gut issues, hormone problems)
- "agitation": Deepens the pain point (conventional medicine frustrations)
- "solution": Introduces Pine Hill Farm's approach (root cause, holistic)
- "benefit": Shows transformation and positive outcomes
- "proof": Social proof, credentials, certifications
- "product": Showcases specific products or services
- "testimonial": Customer success stories
- "cta": Call to action (visit website, book consultation)
- "explanation": Educational content about health topics
- "process": Step-by-step demonstrations
- "intro": Introduction and context setting
- "brand": Brand values and mission

VISUAL STYLE FOR PINE HILL FARM:
- Warm, golden lighting (NOT clinical/cold)
- Natural settings: farm fields, gardens, cozy interiors, spa environments
- Real people with authentic expressions (NOT stock photo models)
- Earth tones: greens, browns, warm golds
- Organic textures: wood, plants, natural materials
- Family farm feel, NOT corporate wellness

OUTPUT FORMAT:
Return a JSON object with scenes array. Each scene should include:
- id: unique identifier
- type: scene type from list above
- narration: the script text for this scene
- duration: estimated seconds (based on reading speed ~150 words/min or ~2.5 words/sec)
- visualDirection: detailed visual description matching PHF aesthetic
- searchQuery: 3-5 word stock video search query
- fallbackQuery: alternative search query
- keyPoints: main points for text overlays
- serviceMatch: Pine Hill Farm service if relevant
- productMatch: Pine Hill Farm product if relevant
- conditionMatch: Health condition being addressed
- audienceResonance: Why this connects with target audience
- brandOpportunity: Messaging opportunity for PHF values`;
  }

  private buildParsingPrompt(
    script: string,
    options: ScriptParseOptions,
    serviceMatches: { services: string[]; products: string[]; conditions: string[] }
  ): string {
    return `Parse this video script for Pine Hill Farm.

PLATFORM: ${options.platform}
VISUAL STYLE: ${options.visualStyle}
${options.targetDuration ? `TARGET DURATION: ${options.targetDuration} seconds` : ""}

PRE-IDENTIFIED MATCHES (use these as hints):
- Services mentioned: ${serviceMatches.services.join(", ") || "None detected"}
- Products mentioned: ${serviceMatches.products.join(", ") || "None detected"}
- Health conditions: ${serviceMatches.conditions.join(", ") || "None detected"}

SCRIPT TO PARSE:
"""
${script}
"""

Parse this into scenes with Pine Hill Farm brand awareness. For each scene:
1. Identify the scene type and purpose
2. Connect to relevant PHF services/products
3. Write visual directions that match PHF's warm, natural aesthetic
4. Note audience resonance and brand opportunities
5. Create searchQuery for stock video (3-5 concise words)
6. Create fallbackQuery as alternative search approach

Return ONLY valid JSON matching this structure:
{
  "scenes": [
    {
      "id": "scene-1",
      "type": "hook|problem|solution|benefit|cta|etc",
      "narration": "exact script text for this scene",
      "duration": 5,
      "visualDirection": "detailed visual matching PHF aesthetic",
      "searchQuery": "3-5 word stock video search",
      "fallbackQuery": "alternative search query",
      "keyPoints": ["main point for text overlay"],
      "serviceMatch": "PHF service name or null",
      "productMatch": "PHF product name or null",
      "conditionMatch": "health condition or null",
      "audienceResonance": "why this connects with target audience",
      "brandOpportunity": "PHF value or messaging opportunity"
    }
  ],
  "summary": {
    "totalDuration": 60,
    "sceneCount": 8,
    "primaryService": "main PHF service featured",
    "targetConditions": ["list of conditions addressed"],
    "brandAlignment": "how well this aligns with PHF messaging"
  }
}`;
  }

  private parseResponse(
    responseText: string,
    serviceMatches: { services: string[]; products: string[]; conditions: string[] }
  ): ParsedScript {
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const scenes: ParsedScene[] = parsed.scenes.map((scene: any, index: number) => ({
        id: scene.id || `scene-${index + 1}`,
        type: this.validateSceneType(scene.type),
        narration: scene.narration || "",
        duration: scene.duration || 5,
        visualDirection: scene.visualDirection || "",
        searchQuery: scene.searchQuery || "",
        fallbackQuery: scene.fallbackQuery || "",
        keyPoints: scene.keyPoints || [],
        contentType: this.inferContentType(scene),
        status: "pending",
        serviceMatch: scene.serviceMatch || null,
        productMatch: scene.productMatch || null,
        conditionMatch: scene.conditionMatch || null,
        audienceResonance: scene.audienceResonance || null,
        brandOpportunity: scene.brandOpportunity || null,
      }));

      console.log(`[ScriptParser] Parsed ${scenes.length} scenes with brand awareness`);

      return {
        scenes,
        summary: parsed.summary || {
          totalDuration: scenes.reduce((sum: number, s: ParsedScene) => sum + s.duration, 0),
          sceneCount: scenes.length,
          primaryService: serviceMatches.services[0] || null,
          targetConditions: serviceMatches.conditions,
          brandAlignment: "Analyzed",
        },
        brandMatches: serviceMatches,
      };
    } catch (error: any) {
      console.error("[ScriptParser] Failed to parse response:", error.message);
      throw error;
    }
  }

  private validateSceneType(type: string): string {
    const validTypes = [
      "hook",
      "problem",
      "agitation",
      "solution",
      "benefit",
      "proof",
      "product",
      "testimonial",
      "cta",
      "explanation",
      "story",
      "broll",
      "process",
      "intro",
      "brand",
      "feature",
      "social_proof",
    ];
    return validTypes.includes(type) ? type : "broll";
  }

  private inferContentType(scene: any): string {
    const narration = (scene.narration || "").toLowerCase();
    const visual = (scene.visualDirection || "").toLowerCase();
    const combined = narration + " " + visual;

    if (
      combined.includes("person") ||
      combined.includes("woman") ||
      combined.includes("man") ||
      combined.includes("people") ||
      combined.includes("face") ||
      combined.includes("customer")
    ) {
      return "person";
    }
    if (
      combined.includes("product") ||
      combined.includes("supplement") ||
      combined.includes("bottle") ||
      combined.includes("package")
    ) {
      return "product";
    }
    if (
      combined.includes("farm") ||
      combined.includes("field") ||
      combined.includes("garden") ||
      combined.includes("nature") ||
      combined.includes("outdoor")
    ) {
      return "nature";
    }
    if (
      combined.includes("abstract") ||
      combined.includes("concept") ||
      combined.includes("metaphor")
    ) {
      return "abstract";
    }
    return "lifestyle";
  }
}

export const scriptParserService = new ScriptParserService();
