export type ProductionPhaseType = 
  | "analyze"
  | "generate" 
  | "evaluate"
  | "iterate"
  | "assemble";

export type PhaseStatus = 
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";

export type AssetType = 
  | "image"
  | "ai_image"
  | "video"
  | "ai_video"
  | "broll"
  | "voiceover"
  | "music"
  | "sfx";

export type AssetSource =
  | "stability_ai"
  | "huggingface"
  | "runway"
  | "pexels"
  | "pixabay"
  | "unsplash"
  | "elevenlabs"
  | "music_library";

export interface QualityScore {
  relevance: number;
  technicalQuality: number;
  brandAlignment: number;
  emotionalImpact: number;
  overall: number;
}

export interface ProductionAsset {
  id: string;
  type: AssetType;
  source: AssetSource;
  url: string;
  section: "hook" | "problem" | "solution" | "social_proof" | "cta";
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    photographer?: string;
    license?: string;
    prompt?: string;
  };
  qualityScore?: QualityScore;
  status: "pending" | "generating" | "evaluating" | "approved" | "rejected" | "regenerating";
  regenerationCount: number;
  aiEvaluation?: string;
  fallbackUsed?: boolean;
}

export interface ProductionPhase {
  id: ProductionPhaseType;
  name: string;
  description: string;
  status: PhaseStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ProductionLog {
  id: string;
  timestamp: string;
  type: "decision" | "generation" | "evaluation" | "success" | "error" | "fallback" | "warning";
  icon: string;
  message: string;
  phase: ProductionPhaseType;
  assetId?: string;
}

export interface SceneManifest {
  id: string;
  section: "hook" | "problem" | "solution" | "social_proof" | "cta";
  startTime: number;
  endTime: number;
  duration: number;
  scriptText: string;
  visualDirection: string;
  suggestedAssets: string[];
  transition: {
    in: "fade" | "crossfade" | "slide" | "zoom" | "none";
    out: "fade" | "crossfade" | "slide" | "zoom" | "none";
  };
  requiredAssets: {
    heroImage: boolean;
    broll: boolean;
    aiVideo: boolean;
  };
}

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

export interface VideoProduction {
  id: string;
  brief: VideoProductionBrief;
  status: "initializing" | "analyzing" | "generating" | "evaluating" | "iterating" | "assembling" | "completed" | "failed";
  phases: ProductionPhase[];
  sceneManifest: SceneManifest[];
  assets: ProductionAsset[];
  logs: ProductionLog[];
  script: string;
  voiceoverUrl?: string;
  voiceoverDuration?: number;
  musicUrl?: string;
  finalVideoUrl?: string;
  qualityThreshold: number;
  createdAt: string;
  updatedAt: string;
  aiDirectorNotes: string[];
}

export const PHASE_DEFINITIONS: Omit<ProductionPhase, "status" | "progress">[] = [
  { 
    id: "analyze", 
    name: "Analyze", 
    description: "Script breakdown & scene planning"
  },
  { 
    id: "generate", 
    name: "Generate", 
    description: "Create images, videos & audio"
  },
  { 
    id: "evaluate", 
    name: "Evaluate", 
    description: "AI quality assessment"
  },
  { 
    id: "iterate", 
    name: "Iterate", 
    description: "Regenerate failed assets"
  },
  { 
    id: "assemble", 
    name: "Assemble", 
    description: "Final video composition"
  },
];

export const QUALITY_THRESHOLD = 70;

export function createInitialProduction(brief: VideoProductionBrief): VideoProduction {
  const id = `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    brief,
    status: "initializing",
    phases: PHASE_DEFINITIONS.map(p => ({
      ...p,
      status: "pending" as PhaseStatus,
      progress: 0,
    })),
    sceneManifest: [],
    assets: [],
    logs: [],
    script: "",
    qualityThreshold: QUALITY_THRESHOLD,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiDirectorNotes: [],
  };
}

export function getPhaseIcon(type: ProductionLog["type"]): string {
  switch (type) {
    case "decision": return "🧠";
    case "generation": return "🎬";
    case "evaluation": return "✅";
    case "error": return "❌";
    case "fallback": return "🔄";
    case "success": return "✨";
    default: return "📋";
  }
}
