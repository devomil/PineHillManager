export interface VideoProject {
  id: string;
  type: 'product' | 'script-based';
  title: string;
  description: string;
  targetAudience?: string;
  totalDuration: number;
  fps: 30;
  outputFormat: OutputFormat;
  brand: BrandSettings;
  scenes: Scene[];
  assets: GeneratedAssets;
  status: VideoProjectStatus;
  progress: ProductionProgress;
  createdAt: string;
  updatedAt: string;
}

export type VideoProjectStatus = 'draft' | 'generating' | 'ready' | 'rendering' | 'complete' | 'error';

export interface OutputFormat {
  aspectRatio: '16:9' | '9:16' | '1:1';
  resolution: { width: number; height: number };
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'website';
}

export interface BrandSettings {
  name: string;
  logoUrl: string;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    textLight: string;
  };
  fonts: {
    heading: string;
    body: string;
    weight: {
      heading: 600 | 700 | 800;
      body: 400 | 500;
    };
  };
}

export interface Scene {
  id: string;
  order: number;
  type: SceneType;
  duration: number;
  narration: string;
  textOverlays: TextOverlay[];
  background: BackgroundConfig;
  transitionIn: TransitionConfig;
  transitionOut: TransitionConfig;
  assets?: SceneAssets;
}

export type SceneType =
  | 'hook'
  | 'intro'
  | 'benefit'
  | 'feature'
  | 'explanation'
  | 'process'
  | 'testimonial'
  | 'brand'
  | 'cta'
  | 'outro';

export interface TextOverlay {
  id: string;
  text: string;
  style: TextOverlayStyle;
  position: TextPosition;
  timing: {
    startAt: number;
    duration: number;
  };
  animation: {
    enter: 'fade' | 'slide-up' | 'slide-left' | 'scale' | 'typewriter';
    exit: 'fade' | 'slide-down' | 'scale';
    duration: number;
  };
}

export type TextOverlayStyle = 'title' | 'subtitle' | 'headline' | 'body' | 'bullet' | 'caption' | 'cta' | 'quote';

export interface TextPosition {
  vertical: 'top' | 'center' | 'bottom' | 'lower-third';
  horizontal: 'left' | 'center' | 'right';
  padding: number;
}

export interface BackgroundConfig {
  type: 'image' | 'video' | 'gradient' | 'solid';
  source: string;
  effect?: {
    type: 'ken-burns' | 'parallax' | 'zoom' | 'pan' | 'none';
    intensity: 'subtle' | 'medium' | 'dramatic';
    direction?: 'in' | 'out' | 'left' | 'right';
  };
  overlay?: {
    type: 'gradient' | 'solid' | 'vignette';
    color: string;
    opacity: number;
  };
}

export interface TransitionConfig {
  type: 'none' | 'fade' | 'crossfade' | 'slide' | 'zoom' | 'wipe';
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

export interface SceneAssets {
  imageUrl?: string;
  videoUrl?: string;
  voiceoverUrl?: string;
  useAIImage?: boolean;
  assignedProductImageId?: string;
}

export interface GeneratedAssets {
  voiceover: {
    fullTrackUrl: string;
    duration: number;
    perScene: { sceneId: string; url: string; duration: number }[];
  };
  music: {
    url: string;
    duration: number;
    volume: number;
  };
  images: { sceneId: string; url: string; prompt: string; source: 'ai' | 'uploaded' | 'stock' }[];
  videos: { sceneId: string; url: string; source: 'pexels' | 'pixabay' | 'generated' }[];
  productImages: ProductImage[];
}

export interface ProductionProgress {
  currentStep: ProductionStep;
  steps: {
    script: StepStatus;
    voiceover: StepStatus;
    images: StepStatus;
    videos: StepStatus;
    music: StepStatus;
    assembly: StepStatus;
    rendering: StepStatus;
  };
  overallPercent: number;
  errors: string[];
  serviceFailures: ServiceFailure[];
}

export type ProductionStep = 'idle' | 'script' | 'voiceover' | 'images' | 'videos' | 'music' | 'assembly' | 'rendering';

export interface StepStatus {
  status: 'pending' | 'in-progress' | 'complete' | 'error' | 'skipped';
  progress: number;
  message?: string;
}

export interface ServiceFailure {
  service: 'fal.ai' | 'elevenlabs' | 'pexels' | 'huggingface' | 'remotion-lambda';
  timestamp: string;
  error: string;
  fallbackUsed?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  name: string;
  description?: string;
  isPrimary?: boolean;
}

export interface ProductVideoInput {
  productName: string;
  productDescription: string;
  targetAudience: string;
  benefits: string[];
  duration: 30 | 60 | 90;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'website';
  style: 'professional' | 'friendly' | 'energetic' | 'calm';
  callToAction: string;
  productImages?: ProductImage[];
}

export interface ScriptVideoInput {
  title: string;
  script: string;
  platform: 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'website';
  style: 'professional' | 'casual' | 'energetic' | 'calm' | 'cinematic' | 'documentary';
  targetDuration?: number;
}

export const PINE_HILL_FARM_BRAND: BrandSettings = {
  name: 'Pine Hill Farm',
  logoUrl: '/assets/pine-hill-farm-logo.png',
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 0.3,
  colors: {
    primary: '#1a4480',
    secondary: '#f5f0e6',
    accent: '#c9a227',
    text: '#1a1a1a',
    textLight: '#ffffff',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
    weight: {
      heading: 700,
      body: 400,
    },
  },
};

export const OUTPUT_FORMATS: Record<string, OutputFormat> = {
  youtube: {
    aspectRatio: '16:9',
    resolution: { width: 1920, height: 1080 },
    platform: 'youtube',
  },
  tiktok: {
    aspectRatio: '9:16',
    resolution: { width: 1080, height: 1920 },
    platform: 'tiktok',
  },
  instagram: {
    aspectRatio: '1:1',
    resolution: { width: 1080, height: 1080 },
    platform: 'instagram',
  },
  facebook: {
    aspectRatio: '16:9',
    resolution: { width: 1920, height: 1080 },
    platform: 'facebook',
  },
  website: {
    aspectRatio: '16:9',
    resolution: { width: 1920, height: 1080 },
    platform: 'website',
  },
};

export function createEmptyVideoProject(
  type: 'product' | 'script-based',
  title: string,
  platform: string = 'youtube'
): VideoProject {
  const now = new Date().toISOString();
  return {
    id: `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    description: '',
    fps: 30,
    totalDuration: 0,
    outputFormat: OUTPUT_FORMATS[platform] || OUTPUT_FORMATS.youtube,
    brand: PINE_HILL_FARM_BRAND,
    scenes: [],
    assets: {
      voiceover: { fullTrackUrl: '', duration: 0, perScene: [] },
      music: { url: '', duration: 0, volume: 0.18 },
      images: [],
      videos: [],
      productImages: [],
    },
    status: 'draft',
    progress: {
      currentStep: 'idle',
      steps: {
        script: { status: 'pending', progress: 0 },
        voiceover: { status: 'pending', progress: 0 },
        images: { status: 'pending', progress: 0 },
        videos: { status: 'pending', progress: 0 },
        music: { status: 'pending', progress: 0 },
        assembly: { status: 'pending', progress: 0 },
        rendering: { status: 'pending', progress: 0 },
      },
      overallPercent: 0,
      errors: [],
      serviceFailures: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}

export function calculateTotalDuration(scenes: Scene[]): number {
  return scenes.reduce((total, scene) => total + scene.duration, 0);
}

export function getCompositionId(aspectRatio: '16:9' | '9:16' | '1:1'): string {
  switch (aspectRatio) {
    case '9:16':
      return 'UniversalVideoVertical';
    case '1:1':
      return 'UniversalVideoSquare';
    default:
      return 'UniversalVideo';
  }
}
