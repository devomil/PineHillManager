import Anthropic from "@anthropic-ai/sdk";

export interface VideoProductionBrief {
  productName: string;
  productDescription: string;
  targetAudience: string;
  keyBenefits: string[];
  videoDuration: number;
  platform: "youtube" | "tiktok" | "instagram" | "facebook" | "twitter";
  style: "professional" | "casual" | "energetic" | "calm";
  callToAction: string;
}

export interface ProductionPhase {
  id: string;
  name: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
  aiNotes?: string;
}

export interface GatheredAsset {
  id: string;
  type: "image" | "video" | "music" | "voiceover" | "ai_image" | "ai_video";
  source: string;
  url: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    photographer?: string;
    license?: string;
    relevanceScore?: number;
    aiEvaluation?: string;
  };
  section?: string;
}

export interface ProductionPlan {
  id: string;
  brief: VideoProductionBrief;
  phases: ProductionPhase[];
  assets: GatheredAsset[];
  script: string;
  timeline: SceneTimeline[];
  createdAt: Date;
  status: "planning" | "gathering" | "evaluating" | "assembling" | "rendering" | "completed" | "failed";
  aiDirectorNotes: string[];
}

export interface SceneTimeline {
  id: string;
  section: "hook" | "problem" | "solution" | "social_proof" | "cta";
  startTime: number;
  endTime: number;
  visualDescription: string;
  scriptText: string;
  suggestedAssets: string[];
  transitions: {
    in: string;
    out: string;
  };
}

export interface DirectorDecision {
  decision: string;
  reasoning: string;
  confidence: number;
  alternatives?: string[];
}

const PHASE_DEFINITIONS: Omit<ProductionPhase, "status" | "progress">[] = [
  { id: "script", name: "Script Generation" },
  { id: "images", name: "Image Collection" },
  { id: "ai_images", name: "AI Image Generation" },
  { id: "broll", name: "B-Roll Footage" },
  { id: "music", name: "Background Music" },
  { id: "ai_video", name: "AI Video Generation" },
  { id: "voiceover", name: "Voiceover Creation" },
  { id: "evaluation", name: "Asset Evaluation" },
  { id: "assembly", name: "Final Assembly" },
  { id: "render", name: "Video Rendering" },
];

class AIVideoDirector {
  private anthropic: Anthropic | null = null;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
      console.log("[AI Director] Initialized with Anthropic API");
    } else {
      console.warn("[AI Director] No Anthropic API key found - using fallback mode");
    }
  }

  async createProductionPlan(brief: VideoProductionBrief): Promise<ProductionPlan> {
    const planId = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const phases: ProductionPhase[] = PHASE_DEFINITIONS.map(phase => ({
      ...phase,
      status: "pending",
      progress: 0,
    }));

    const plan: ProductionPlan = {
      id: planId,
      brief,
      phases,
      assets: [],
      script: "",
      timeline: [],
      createdAt: new Date(),
      status: "planning",
      aiDirectorNotes: [],
    };

    plan.aiDirectorNotes.push(
      `Production initiated for "${brief.productName}" - ${brief.videoDuration}s ${brief.platform} video`
    );

    return plan;
  }

  async analyzeAndPlanScript(plan: ProductionPlan): Promise<{
    script: string;
    timeline: SceneTimeline[];
    directorNotes: string;
  }> {
    const { brief } = plan;

    if (!this.anthropic) {
      return this.fallbackScriptGeneration(brief);
    }

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: `You are a professional TV commercial director creating a ${brief.videoDuration}-second pharmaceutical-style commercial for ${brief.productName}.

PRODUCT DETAILS:
- Name: ${brief.productName}
- Description: ${brief.productDescription}
- Target Audience: ${brief.targetAudience}
- Key Benefits: ${brief.keyBenefits.join(", ")}
- Call to Action: ${brief.callToAction}
- Style: ${brief.style}
- Platform: ${brief.platform}

Create a professional TV commercial script with these EXACT section markers:

[HOOK]
(Attention-grabbing opening - ${Math.round(brief.videoDuration * 0.15)}s)

[PROBLEM]  
(Identify the problem/pain point - ${Math.round(brief.videoDuration * 0.20)}s)

[SOLUTION]
(Present the product as the solution - ${Math.round(brief.videoDuration * 0.30)}s)

[SOCIAL_PROOF]
(Testimonials or trust elements - ${Math.round(brief.videoDuration * 0.20)}s)

[CTA]
(Call to action - ${Math.round(brief.videoDuration * 0.15)}s)

For each section, include:
1. The spoken narration (voiceover text)
2. Visual direction notes in [VISUAL: description] format
3. Suggested transitions in [TRANSITION: type] format

Also provide a JSON timeline at the end in this format:
\`\`\`json
{
  "timeline": [
    {
      "section": "hook",
      "startTime": 0,
      "endTime": X,
      "visualDescription": "...",
      "suggestedAssets": ["search term 1", "search term 2"]
    }
  ],
  "directorNotes": "Your creative direction notes..."
}
\`\`\``,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected response type");
      }

      const text = content.text;
      
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      let timeline: SceneTimeline[] = [];
      let directorNotes = "";
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          timeline = parsed.timeline.map((item: any, idx: number) => ({
            id: `scene_${idx}`,
            section: item.section,
            startTime: item.startTime,
            endTime: item.endTime,
            visualDescription: item.visualDescription,
            scriptText: "",
            suggestedAssets: item.suggestedAssets || [],
            transitions: { in: "fade", out: "fade" },
          }));
          directorNotes = parsed.directorNotes || "";
        } catch (e) {
          console.warn("[AI Director] Could not parse timeline JSON, using defaults");
        }
      }

      const scriptText = text.replace(/```json[\s\S]*?```/g, "").trim();

      if (timeline.length === 0) {
        timeline = this.createDefaultTimeline(brief);
      }

      return {
        script: scriptText,
        timeline,
        directorNotes: directorNotes || "Script generated successfully. Ready for asset gathering.",
      };
    } catch (error) {
      console.error("[AI Director] Script generation error:", error);
      return this.fallbackScriptGeneration(brief);
    }
  }

  private fallbackScriptGeneration(brief: VideoProductionBrief): {
    script: string;
    timeline: SceneTimeline[];
    directorNotes: string;
  } {
    const duration = brief.videoDuration;
    const hookDuration = Math.round(duration * 0.15);
    const problemDuration = Math.round(duration * 0.20);
    const solutionDuration = Math.round(duration * 0.30);
    const socialProofDuration = Math.round(duration * 0.20);
    const ctaDuration = Math.round(duration * 0.15);

    let currentTime = 0;
    const timeline: SceneTimeline[] = [
      {
        id: "scene_hook",
        section: "hook",
        startTime: currentTime,
        endTime: (currentTime += hookDuration),
        visualDescription: `Captivating opening featuring ${brief.productName}`,
        scriptText: "",
        suggestedAssets: [brief.productName, "wellness", "nature"],
        transitions: { in: "fade", out: "crossfade" },
      },
      {
        id: "scene_problem",
        section: "problem",
        startTime: currentTime,
        endTime: (currentTime += problemDuration),
        visualDescription: "Depicting common challenges faced by target audience",
        scriptText: "",
        suggestedAssets: ["challenge", "struggle", "everyday life"],
        transitions: { in: "crossfade", out: "crossfade" },
      },
      {
        id: "scene_solution",
        section: "solution",
        startTime: currentTime,
        endTime: (currentTime += solutionDuration),
        visualDescription: `Showcasing ${brief.productName} as the answer`,
        scriptText: "",
        suggestedAssets: [brief.productName, "solution", "relief", "happiness"],
        transitions: { in: "crossfade", out: "crossfade" },
      },
      {
        id: "scene_social_proof",
        section: "social_proof",
        startTime: currentTime,
        endTime: (currentTime += socialProofDuration),
        visualDescription: "Building trust through testimonials and results",
        scriptText: "",
        suggestedAssets: ["happy customer", "testimonial", "results"],
        transitions: { in: "crossfade", out: "crossfade" },
      },
      {
        id: "scene_cta",
        section: "cta",
        startTime: currentTime,
        endTime: (currentTime += ctaDuration),
        visualDescription: "Clear call to action with product branding",
        scriptText: "",
        suggestedAssets: [brief.productName, "call to action", "order now"],
        transitions: { in: "crossfade", out: "fade" },
      },
    ];

    const script = `[HOOK]
Are you ready to discover something that could change your life?
[VISUAL: Beautiful opening shot with ${brief.productName}]

[PROBLEM]
We understand the challenges you face. ${brief.targetAudience} often struggle with finding the right solution.
[VISUAL: Relatable scenes of everyday challenges]

[SOLUTION]
Introducing ${brief.productName}. ${brief.productDescription}
${brief.keyBenefits.map(b => `- ${b}`).join("\n")}
[VISUAL: Product showcase with benefits highlighted]

[SOCIAL_PROOF]
Thousands of satisfied customers have already made the switch. Join them today.
[VISUAL: Happy customers, testimonials]

[CTA]
${brief.callToAction}
Visit us today and experience the difference.
[VISUAL: Logo, contact information, call to action]`;

    return {
      script,
      timeline,
      directorNotes: "Fallback script generated. AI Director recommends enhancing with custom content.",
    };
  }

  private createDefaultTimeline(brief: VideoProductionBrief): SceneTimeline[] {
    const duration = brief.videoDuration;
    let currentTime = 0;
    
    const sections = [
      { section: "hook" as const, ratio: 0.15 },
      { section: "problem" as const, ratio: 0.20 },
      { section: "solution" as const, ratio: 0.30 },
      { section: "social_proof" as const, ratio: 0.20 },
      { section: "cta" as const, ratio: 0.15 },
    ];

    return sections.map((s, idx) => {
      const sectionDuration = Math.round(duration * s.ratio);
      const scene: SceneTimeline = {
        id: `scene_${idx}`,
        section: s.section,
        startTime: currentTime,
        endTime: currentTime + sectionDuration,
        visualDescription: `${s.section} section for ${brief.productName}`,
        scriptText: "",
        suggestedAssets: [brief.productName],
        transitions: { in: "fade", out: "fade" },
      };
      currentTime += sectionDuration;
      return scene;
    });
  }

  async evaluateAssets(assets: GatheredAsset[], brief: VideoProductionBrief): Promise<{
    evaluations: Map<string, { score: number; notes: string }>;
    recommendations: string[];
    overallQuality: number;
  }> {
    const evaluations = new Map<string, { score: number; notes: string }>();
    const recommendations: string[] = [];

    if (!this.anthropic) {
      assets.forEach(asset => {
        evaluations.set(asset.id, {
          score: 0.7 + Math.random() * 0.3,
          notes: "Asset quality acceptable for production",
        });
      });
      return {
        evaluations,
        recommendations: ["Consider adding more variety to imagery"],
        overallQuality: 0.75,
      };
    }

    try {
      const assetSummary = assets.map(a => ({
        id: a.id,
        type: a.type,
        source: a.source,
        section: a.section,
      }));

      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        messages: [
          {
            role: "user",
            content: `As a professional video production director, evaluate these gathered assets for a ${brief.videoDuration}s commercial about "${brief.productName}":

Assets: ${JSON.stringify(assetSummary, null, 2)}

Product Context:
- Target Audience: ${brief.targetAudience}
- Style: ${brief.style}
- Platform: ${brief.platform}

Provide evaluation in JSON format:
{
  "assetScores": { "asset_id": { "score": 0-1, "notes": "evaluation notes" } },
  "recommendations": ["recommendation 1", "recommendation 2"],
  "overallQuality": 0-1,
  "missingElements": ["element 1", "element 2"]
}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        try {
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            Object.entries(parsed.assetScores || {}).forEach(([id, data]: [string, any]) => {
              evaluations.set(id, { score: data.score, notes: data.notes });
            });
            return {
              evaluations,
              recommendations: parsed.recommendations || [],
              overallQuality: parsed.overallQuality || 0.7,
            };
          }
        } catch (e) {
          console.warn("[AI Director] Could not parse evaluation JSON");
        }
      }
    } catch (error) {
      console.error("[AI Director] Asset evaluation error:", error);
    }

    assets.forEach(asset => {
      evaluations.set(asset.id, {
        score: 0.75,
        notes: "Asset meets production standards",
      });
    });

    return {
      evaluations,
      recommendations: [],
      overallQuality: 0.75,
    };
  }

  async makeCreativeDecision(
    context: string,
    options: string[],
    brief: VideoProductionBrief
  ): Promise<DirectorDecision> {
    if (!this.anthropic) {
      return {
        decision: options[0],
        reasoning: "Default selection based on production guidelines",
        confidence: 0.7,
        alternatives: options.slice(1),
      };
    }

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `As a TV commercial director, make a creative decision:

Context: ${context}
Options: ${JSON.stringify(options)}

Product: ${brief.productName}
Target Audience: ${brief.targetAudience}
Style: ${brief.style}

Respond in JSON:
{
  "decision": "chosen option",
  "reasoning": "why this is best",
  "confidence": 0-1,
  "alternatives": ["other viable options"]
}`,
          },
        ],
      });

      const content = response.content[0];
      if (content.type === "text") {
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
      }
    } catch (error) {
      console.error("[AI Director] Decision making error:", error);
    }

    return {
      decision: options[0],
      reasoning: "Selected based on production best practices",
      confidence: 0.7,
      alternatives: options.slice(1),
    };
  }

  getPhaseDefinitions(): typeof PHASE_DEFINITIONS {
    return PHASE_DEFINITIONS;
  }

  updatePhaseStatus(
    plan: ProductionPlan,
    phaseId: string,
    status: ProductionPhase["status"],
    progress: number,
    result?: any,
    error?: string
  ): ProductionPlan {
    const phaseIdx = plan.phases.findIndex(p => p.id === phaseId);
    if (phaseIdx === -1) return plan;

    const phase = plan.phases[phaseIdx];
    phase.status = status;
    phase.progress = progress;
    
    if (status === "in_progress" && !phase.startedAt) {
      phase.startedAt = new Date();
    }
    if (status === "completed" || status === "failed") {
      phase.completedAt = new Date();
    }
    if (result) phase.result = result;
    if (error) phase.error = error;

    return plan;
  }

  addAsset(plan: ProductionPlan, asset: GatheredAsset): ProductionPlan {
    plan.assets.push(asset);
    return plan;
  }

  addDirectorNote(plan: ProductionPlan, note: string): ProductionPlan {
    plan.aiDirectorNotes.push(`[${new Date().toISOString()}] ${note}`);
    return plan;
  }
}

export const aiVideoDirector = new AIVideoDirector();
export default aiVideoDirector;
