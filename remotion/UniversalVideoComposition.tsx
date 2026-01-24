import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  Video,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  continueRender,
  delayRender,
} from "remotion";
import type {
  Scene,
  BrandSettings,
  TextOverlay,
  OutputFormat,
  SceneSoundDesign,
} from "../shared/video-types";

import { EnhancedTextOverlay } from "./components/TextOverlay";
import { LogoOverlay } from "./components/LogoOverlay";
import { WatermarkOverlay } from "./components/WatermarkOverlay";
import { LowerThird as Phase11BLowerThird } from "./components/LowerThird";
import { BulletList } from "./components/BulletList";
import { CTAButton } from "./components/CTAButton";
import { KenBurnsImage } from "./components/KenBurnsImage";
import { mapSceneToOverlays, shouldShowLogo, shouldShowWatermark } from "./utils/overlay-mapper";
import { MotionGraphicsScene } from "./compositions/MotionGraphicsScene";
import { AnimatedEndCard } from "./components/endcard/AnimatedEndCard";
import { EndCardConfig, PINE_HILL_FARM_END_CARD } from "../shared/config/end-card";
import { SoundDesignLayer } from "./components/audio/SoundDesignLayer";
import { DuckedMusic, VolumeKeyframe } from "./components/audio/DuckedMusic";
import { TransitionConfig, SoundDesignConfig, PINE_HILL_FARM_SOUND_CONFIG } from "../shared/config/sound-design";

// ============================================================
// BRAND OVERLAY TYPES (Phase 4E)
// ============================================================

export interface BrandOverlay {
  type: 'logo' | 'watermark' | 'cta' | 'intro' | 'outro';
  assetUrl: string;
  position: {
    x: number;
    y: number;
    anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  };
  size: {
    width: number;
    maxHeight?: number;
  };
  animation: {
    type: 'fade' | 'slide' | 'zoom' | 'none';
    duration: number;
    delay?: number;
  };
  timing: {
    startTime: number;
    duration: number;
  };
  opacity: number;
}

export interface CTAOverlay {
  type: 'cta';
  ctaData: {
    headline: string;
    subtext?: string;
    url: string;
    buttonColor?: string;
  };
  timing: {
    startTime: number;
    duration: number;
  };
}

export interface LogoEndingConfig {
  enabled: boolean;
  logoUrl: string;
  backgroundColor: string;
  duration: number;
  animation: 'fade' | 'zoom' | 'slide' | 'elegant';
}

export interface SceneBrandOverlays {
  sceneId: string;
  overlays: BrandOverlay[];
  showWatermark: boolean;
  watermark?: BrandOverlay;
  ctaText?: {
    headline: string;
    subtext?: string;
    url: string;
  };
  logoEnding?: LogoEndingConfig;
}

export interface ProjectBrandInstructions {
  introAnimation?: BrandOverlay;
  watermark?: BrandOverlay;
  outroSequence?: BrandOverlay[];
  ctaOverlay?: CTAOverlay;
  sceneOverlays: Record<string, SceneBrandOverlays>;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
  };
  callToAction: {
    text: string;
    subtext?: string;
    url: string;
  };
}

export interface UniversalVideoProps {
  scenes: Scene[];
  voiceoverUrl: string | null;
  musicUrl: string | null;
  musicVolume: number;
  brand: BrandSettings;
  outputFormat: OutputFormat;
  brandInstructions?: ProjectBrandInstructions;
  endCardConfig?: EndCardConfig;
  soundDesignConfig?: SoundDesignConfig;
  audioDuckingKeyframes?: VolumeKeyframe[];
  transitions?: TransitionConfig[];
}

// ============================================================
// ASSET VALIDATION UTILITIES
// ============================================================

function isValidHttpUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('https://') || url.startsWith('http://');
}

function isDataUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('data:');
}

function getAssetStatus(url: string | null | undefined): 'valid' | 'data-url' | 'local-path' | 'missing' {
  if (!url) return 'missing';
  if (isValidHttpUrl(url)) return 'valid';
  if (isDataUrl(url)) return 'data-url';
  return 'local-path';
}

// ============================================================
// ERROR PLACEHOLDER COMPONENTS
// ============================================================

const AssetErrorPlaceholder: React.FC<{
  type: 'image' | 'audio' | 'video';
  sceneId: string;
  url?: string;
  brand: BrandSettings;
}> = ({ type, sceneId, url, brand }) => {
  const status = getAssetStatus(url);
  
  const errorMessages: Record<string, string> = {
    'missing': `No ${type} URL provided`,
    'data-url': `${type} is base64 (not Lambda-compatible)`,
    'local-path': `${type} uses local path (not Lambda-accessible)`,
  };
  
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${brand.colors.primary} 0%, #1a1a2e 100%)`,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(255, 100, 100, 0.15)',
          border: '2px solid rgba(255, 100, 100, 0.5)',
          borderRadius: 16,
          padding: 40,
          maxWidth: '80%',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
        <div
          style={{
            color: '#ff6b6b',
            fontSize: 28,
            fontWeight: 700,
            fontFamily: brand.fonts.heading,
            marginBottom: 12,
          }}
        >
          Asset Error: {type.toUpperCase()}
        </div>
        <div
          style={{
            color: '#ffffff',
            fontSize: 20,
            fontFamily: brand.fonts.body,
            opacity: 0.9,
            marginBottom: 16,
          }}
        >
          {errorMessages[status] || 'Unknown error'}
        </div>
        <div
          style={{
            color: '#888',
            fontSize: 14,
            fontFamily: 'monospace',
            wordBreak: 'break-all',
          }}
        >
          Scene: {sceneId}
          {url && (
            <>
              <br />
              URL: {url.substring(0, 80)}...
            </>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Gradient fallback when image is missing but we want to continue
// Uses Pine Hill Farm brand colors for professional branded look
const GradientFallback: React.FC<{ brand: BrandSettings; sceneType: string }> = ({ brand, sceneType }) => {
  // Pine Hill Farm official colors
  const forestGreen = '#2d5a27';
  const sageGreen = '#607e66';
  const gold = '#c9a227';
  const slateBlue = '#5e637a';
  const steelBlue = '#5b7c99';
  const tealBlue = '#6c97ab';
  const cream = '#f5f0e8';
  
  const gradients: Record<string, string> = {
    hook: `linear-gradient(135deg, ${slateBlue} 0%, ${forestGreen} 50%, ${sageGreen} 100%)`,
    intro: `linear-gradient(180deg, ${forestGreen} 0%, ${gold} 30%, ${cream} 100%)`,
    benefit: `linear-gradient(135deg, ${tealBlue} 0%, ${forestGreen} 50%, ${sageGreen} 100%)`,
    feature: `linear-gradient(135deg, ${gold} 0%, ${forestGreen} 50%, ${slateBlue} 100%)`,
    cta: `linear-gradient(135deg, ${forestGreen} 0%, ${gold} 40%, ${forestGreen} 100%)`,
    testimonial: `linear-gradient(135deg, ${steelBlue} 0%, ${sageGreen} 100%)`,
    brand: `linear-gradient(180deg, ${forestGreen} 0%, ${sageGreen} 50%, ${cream} 100%)`,
    outro: `linear-gradient(135deg, ${forestGreen} 0%, ${gold} 100%)`,
    default: `linear-gradient(135deg, ${brand.colors.primary || forestGreen} 0%, ${brand.colors.secondary || sageGreen} 100%)`,
  };
  
  return (
    <AbsoluteFill
      style={{
        background: gradients[sceneType] || gradients.default,
      }}
    />
  );
};

// ============================================================
// SAFE IMAGE COMPONENT
// ============================================================

const SafeImage: React.FC<{
  src: string | undefined;
  style?: React.CSSProperties;
  fallback: React.ReactNode;
  onError?: () => void;
}> = ({ src, style, fallback, onError }) => {
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  
  // Check URL validity before even trying to load
  if (!src || !isValidHttpUrl(src)) {
    return <>{fallback}</>;
  }
  
  if (hasError) {
    return <>{fallback}</>;
  }
  
  return (
    <Img
      src={src}
      style={style}
      onError={() => {
        console.error(`[Remotion] Image failed to load: ${src}`);
        setHasError(true);
        onError?.();
      }}
    />
  );
};

// ============================================================
// SAFE AUDIO COMPONENT - SUPPORTS STATIC AND DUCKING VOLUMES
// ============================================================

const SafeAudio: React.FC<{
  src: string | null | undefined;
  volume: number;
  label: string;
}> = ({ src, volume, label }) => {
  const status = getAssetStatus(src);
  
  if (status !== 'valid') {
    console.warn(`[Remotion] ${label} audio skipped - ${status}: ${src?.substring(0, 50)}`);
    return null;
  }
  
  return <Audio src={src!} volume={volume} />;
};

// Music with ducking during voiceover
const DuckedMusicAudio: React.FC<{
  src: string | null | undefined;
  baseVolume: number;
  duckedVolume: number;
  hasVoiceover: boolean;
  label: string;
}> = ({ src, baseVolume, duckedVolume, hasVoiceover, label }) => {
  const status = getAssetStatus(src);
  
  if (status !== 'valid') {
    console.warn(`[Remotion] ${label} audio skipped - ${status}: ${src?.substring(0, 50)}`);
    return null;
  }
  
  // If voiceover exists, duck the music for the entire duration
  // Since voiceover plays continuously, use ducked volume
  const volume = hasVoiceover ? duckedVolume : baseVolume;
  
  return <Audio src={src!} volume={volume} />;
};

// ============================================================
// EASING FUNCTIONS FOR SMOOTHER MOTION
// ============================================================

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// ============================================================
// TEXT OVERLAY COMPONENT - ENHANCED WITH TV-QUALITY ANIMATIONS
// ============================================================

const TextOverlayComponent: React.FC<{
  overlay: TextOverlay;
  brand: BrandSettings;
  sceneFrame: number;
  fps: number;
}> = ({ overlay, brand, sceneFrame, fps }) => {
  // Safety check
  if (!overlay || !overlay.timing) {
    console.warn('[Remotion] Invalid text overlay config');
    return null;
  }
  
  const startFrame = (overlay.timing.startAt || 0) * fps;
  const durationFrames = (overlay.timing.duration || 3) * fps;
  const endFrame = startFrame + durationFrames;
  const animDuration = (overlay.animation?.duration || 0.5) * fps;

  if (sceneFrame < startFrame || sceneFrame > endFrame) {
    return null;
  }

  const localFrame = sceneFrame - startFrame;

  let opacity = 1;
  let translateY = 0;
  let translateX = 0;
  let scale = 1;
  let blur = 0;

  // ENHANCED ENTER ANIMATIONS with smooth easing
  if (localFrame < animDuration) {
    const progress = localFrame / animDuration;
    const eased = easeOutCubic(progress);
    
    switch (overlay.animation?.enter || 'fade') {
      case 'fade':
        opacity = eased;
        scale = interpolate(eased, [0, 1], [0.95, 1]);
        break;
      case 'slide-up':
        opacity = eased;
        translateY = interpolate(eased, [0, 1], [60, 0]);
        break;
      case 'slide-left':
        opacity = eased;
        translateX = interpolate(eased, [0, 1], [100, 0]);
        break;
      case 'slide-right':
        opacity = eased;
        translateX = interpolate(eased, [0, 1], [-100, 0]);
        break;
      case 'scale':
        opacity = eased;
        scale = interpolate(eased, [0, 1], [0.3, 1]);
        blur = interpolate(eased, [0, 1], [10, 0]);
        break;
      case 'pop':
        opacity = eased;
        scale = spring({
          frame: localFrame,
          fps,
          config: { damping: 10, stiffness: 200 },
        });
        break;
      case 'blur-in':
        opacity = eased;
        blur = interpolate(eased, [0, 1], [20, 0]);
        break;
      case 'typewriter':
        opacity = 1;
        break;
    }
  }

  // ENHANCED EXIT ANIMATIONS with smooth easing
  const exitStart = durationFrames - animDuration;
  if (localFrame > exitStart) {
    const exitProgress = (localFrame - exitStart) / animDuration;
    const eased = easeInCubic(exitProgress);
    
    switch (overlay.animation?.exit || 'fade') {
      case 'fade':
        opacity = 1 - eased;
        break;
      case 'slide-down':
        opacity = 1 - eased;
        translateY = interpolate(eased, [0, 1], [0, 40]);
        break;
      case 'slide-up':
        opacity = 1 - eased;
        translateY = interpolate(eased, [0, 1], [0, -40]);
        break;
      case 'scale':
        opacity = 1 - eased;
        scale = interpolate(eased, [0, 1], [1, 0.9]);
        break;
      case 'blur-out':
        opacity = 1 - eased;
        blur = interpolate(eased, [0, 1], [0, 15]);
        break;
    }
  }

  const getStyleByType = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      fontFamily: brand.fonts.body,
      color: brand.colors.textLight,
      textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
      textAlign: (overlay.position?.horizontal || 'center') as any,
      maxWidth: '80%',
    };

    switch (overlay.style) {
      case 'title':
        return { ...baseStyle, fontSize: 72, fontWeight: brand.fonts.weight.heading, letterSpacing: '-0.02em' };
      case 'headline':
        return { ...baseStyle, fontSize: 56, fontWeight: brand.fonts.weight.heading };
      case 'subtitle':
        return { ...baseStyle, fontSize: 40, fontWeight: 500 };
      case 'body':
        return { ...baseStyle, fontSize: 32, fontWeight: brand.fonts.weight.body, lineHeight: 1.4 };
      case 'bullet':
        return { ...baseStyle, fontSize: 36, fontWeight: 500, paddingLeft: 20 };
      case 'caption':
        return { ...baseStyle, fontSize: 28, fontWeight: 400, opacity: 0.9 };
      case 'cta':
        return { ...baseStyle, fontSize: 48, fontWeight: 700, color: brand.colors.accent, textShadow: '3px 3px 10px rgba(0,0,0,0.9)' };
      case 'quote':
        return { ...baseStyle, fontSize: 44, fontStyle: 'italic', fontWeight: 400 };
      default:
        return baseStyle;
    }
  };

  const getPosition = (): React.CSSProperties => {
    const pos: React.CSSProperties = {
      position: 'absolute',
      padding: overlay.position?.padding || 60,
      display: 'flex',
      justifyContent: overlay.position?.horizontal === 'left' ? 'flex-start' :
                      overlay.position?.horizontal === 'right' ? 'flex-end' : 'center',
      width: '100%',
      boxSizing: 'border-box',
    };

    switch (overlay.position?.vertical || 'center') {
      case 'top': pos.top = 60; break;
      case 'center': pos.top = '50%'; pos.transform = 'translateY(-50%)'; break;
      case 'bottom': pos.bottom = 100; break;
      case 'lower-third': pos.bottom = 180; break;
    }

    return pos;
  };

  return (
    <div
      style={{
        ...getPosition(),
        opacity,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        filter: blur > 0 ? `blur(${blur}px)` : undefined,
        willChange: 'transform, opacity, filter',
      }}
    >
      <div style={getStyleByType()}>
        {overlay.text || ''}
      </div>
    </div>
  );
};

// ============================================================
// INTELLIGENT TEXT OVERLAY - AI-POWERED POSITIONING
// ============================================================

interface TextOverlayInstruction {
  text: string;
  position: {
    x: number;
    y: number;
    anchor: string;
  };
  style: {
    fontSize: number;
    fontWeight: string;
    color: string;
    textShadow?: string;
    backgroundColor?: string;
    padding?: string;
  };
  animation: {
    enter: string;
    exit: string;
    enterDuration: number;
    exitDuration: number;
    enterDelay: number;
  };
}

interface KenBurnsInstruction {
  enabled: boolean;
  startScale: number;
  endScale: number;
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

interface TransitionInstruction {
  type: 'fade' | 'crossfade' | 'dissolve' | 'wipe-left' | 'wipe-right' | 'zoom' | 'slide-left' | 'slide-right' | 'none';
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

interface SceneCompositionInstructions {
  sceneId: string;
  textOverlays: TextOverlayInstruction[];
  productOverlay?: {
    enabled: boolean;
    position: { x: number; y: number; anchor: string };
    scale: number;
    animation: string;
    shadow: boolean;
  };
  kenBurns?: KenBurnsInstruction;
  transitionIn?: TransitionInstruction;
  transitionOut?: TransitionInstruction;
}

const IntelligentTextOverlay: React.FC<{
  instruction: TextOverlayInstruction;
  sceneDuration: number;
  fps: number;
  brand: BrandSettings;
}> = ({ instruction, sceneDuration, fps, brand }) => {
  const frame = useCurrentFrame();
  
  const enterFrames = instruction.animation.enterDuration * fps;
  const exitFrames = instruction.animation.exitDuration * fps;
  const delayFrames = instruction.animation.enterDelay * fps;
  const totalFrames = sceneDuration * fps;
  
  let opacity = 0;
  const adjustedFrame = frame - delayFrames;
  
  if (adjustedFrame < 0) {
    opacity = 0;
  } else if (adjustedFrame < enterFrames) {
    opacity = adjustedFrame / enterFrames;
  } else if (adjustedFrame > totalFrames - exitFrames) {
    opacity = Math.max(0, (totalFrames - adjustedFrame) / exitFrames);
  } else {
    opacity = 1;
  }
  
  const getAnimationTransform = (): string => {
    const transforms: string[] = [];
    
    if (instruction.animation.enter === 'slide-up' && adjustedFrame >= 0 && adjustedFrame < enterFrames) {
      const progress = adjustedFrame / enterFrames;
      const translateY = (1 - easeOutCubic(progress)) * 30;
      transforms.push(`translateY(${translateY}px)`);
    } else if (instruction.animation.enter === 'zoom' && adjustedFrame >= 0 && adjustedFrame < enterFrames) {
      const progress = adjustedFrame / enterFrames;
      const scale = 0.8 + (easeOutCubic(progress) * 0.2);
      transforms.push(`scale(${scale})`);
    }
    
    return transforms.join(' ');
  };
  
  const getPositionStyle = (): { style: React.CSSProperties; anchorTransform: string } => {
    const { x, y, anchor } = instruction.position;
    const style: React.CSSProperties = { position: 'absolute' };
    const anchorTransforms: string[] = [];
    
    if (anchor.includes('left')) {
      style.left = `${x}%`;
    } else if (anchor.includes('right')) {
      style.right = `${100 - x}%`;
    } else {
      style.left = `${x}%`;
      anchorTransforms.push('translateX(-50%)');
    }
    
    if (anchor.includes('top')) {
      style.top = `${y}%`;
    } else if (anchor.includes('bottom')) {
      style.bottom = `${100 - y}%`;
    } else {
      style.top = `${y}%`;
      anchorTransforms.push('translateY(-50%)');
    }
    
    return { style, anchorTransform: anchorTransforms.join(' ') };
  };
  
  if (opacity <= 0) return null;
  
  const { style: positionStyle, anchorTransform } = getPositionStyle();
  const animationTransform = getAnimationTransform();
  const combinedTransform = [anchorTransform, animationTransform].filter(Boolean).join(' ') || undefined;
  
  return (
    <div
      style={{
        ...positionStyle,
        opacity,
        transform: combinedTransform,
        fontSize: instruction.style.fontSize,
        fontWeight: instruction.style.fontWeight as any,
        fontFamily: brand.fonts.body,
        color: instruction.style.color,
        textShadow: instruction.style.textShadow,
        backgroundColor: instruction.style.backgroundColor,
        padding: instruction.style.padding,
        borderRadius: instruction.style.backgroundColor ? 4 : undefined,
        maxWidth: '80%',
        textAlign: 'center',
        lineHeight: 1.3,
      }}
    >
      {instruction.text}
    </div>
  );
};

const IntelligentProductOverlay: React.FC<{
  productImage: string;
  instruction: SceneCompositionInstructions['productOverlay'];
  sceneDuration: number;
  fps: number;
}> = ({ productImage, instruction, sceneDuration, fps }) => {
  const frame = useCurrentFrame();
  
  if (!instruction?.enabled || !productImage) {
    return null;
  }
  
  const enterFrames = 0.5 * fps;
  const exitFrames = 0.3 * fps;
  const totalFrames = sceneDuration * fps;
  
  let opacity = 0;
  if (frame < enterFrames) {
    opacity = frame / enterFrames;
  } else if (frame > totalFrames - exitFrames) {
    opacity = Math.max(0, (totalFrames - frame) / exitFrames);
  } else {
    opacity = 1;
  }
  
  let scale = instruction.scale;
  if (instruction.animation === 'zoom' && frame < enterFrames) {
    const progress = frame / enterFrames;
    scale = instruction.scale * (0.8 + (easeOutCubic(progress) * 0.2));
  }
  
  const { x, y, anchor } = instruction.position;
  
  if (opacity <= 0) return null;
  
  const getPositionStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = { position: 'absolute' };
    
    if (anchor.includes('left')) {
      style.left = `${x}%`;
    } else if (anchor.includes('right')) {
      style.right = `${100 - x}%`;
    } else {
      style.left = `${x}%`;
      style.transform = 'translateX(-50%)';
    }
    
    if (anchor.includes('top')) {
      style.top = `${y}%`;
    } else if (anchor.includes('bottom')) {
      style.bottom = `${100 - y}%`;
    } else {
      style.top = `${y}%`;
      style.transform = (style.transform || '') + ' translateY(-50%)';
    }
    
    return style;
  };
  
  const positionStyle = getPositionStyle();
  const existingTransform = positionStyle.transform || '';
  const scaleTransform = `scale(${scale})`;
  const combinedTransform = [existingTransform, scaleTransform].filter(Boolean).join(' ');
  
  return (
    <div
      style={{
        ...positionStyle,
        opacity,
        transform: combinedTransform,
        filter: instruction.shadow ? 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' : undefined,
      }}
    >
      <Img
        src={productImage}
        style={{
          maxWidth: 200,
          maxHeight: 200,
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

// ============================================================
// KEN BURNS BACKGROUND - AI-POWERED FOCAL POINT MOTION
// ============================================================

function applyKenBurnsEasing(t: number, easing: KenBurnsInstruction['easing']): number {
  switch (easing) {
    case 'ease-in': return t * t;
    case 'ease-out': return t * (2 - t);
    case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t;
  }
}

const KenBurnsBackground: React.FC<{
  src: string;
  isVideo: boolean;
  instruction: KenBurnsInstruction;
  sceneDuration: number;
  fps: number;
  fallback: React.ReactNode;
}> = ({ src, isVideo, instruction, sceneDuration, fps, fallback }) => {
  const frame = useCurrentFrame();
  const totalFrames = sceneDuration * fps;
  
  if (!instruction.enabled) {
    if (isVideo) {
      return (
        <Video
          src={src}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          volume={0}
          startFrom={0}
          loop
        />
      );
    }
    return (
      <SafeImage
        src={src}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        fallback={fallback}
      />
    );
  }
  
  let progress = frame / totalFrames;
  progress = Math.min(1, Math.max(0, progress));
  progress = applyKenBurnsEasing(progress, instruction.easing);
  
  const scale = interpolate(
    progress, 
    [0, 1], 
    [instruction.startScale, instruction.endScale], 
    { extrapolateRight: 'clamp' }
  );
  
  const startOffsetX = (instruction.startPosition.x - 50) * 0.5;
  const endOffsetX = (instruction.endPosition.x - 50) * 0.5;
  const startOffsetY = (instruction.startPosition.y - 50) * 0.5;
  const endOffsetY = (instruction.endPosition.y - 50) * 0.5;
  
  const translateX = interpolate(
    progress, 
    [0, 1], 
    [startOffsetX, endOffsetX], 
    { extrapolateRight: 'clamp' }
  );
  
  const translateY = interpolate(
    progress, 
    [0, 1], 
    [startOffsetY, endOffsetY], 
    { extrapolateRight: 'clamp' }
  );
  
  const style: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `translate(${-translateX}%, ${-translateY}%) scale(${scale})`,
    transformOrigin: 'center center',
  };
  
  if (isVideo) {
    return (
      <Video
        src={src}
        style={style}
        volume={0}
        startFrom={0}
        loop
      />
    );
  }
  
  return (
    <SafeImage
      src={src}
      style={style}
      fallback={fallback}
    />
  );
};

// ============================================================
// SCENE TRANSITION WRAPPER - MOOD-BASED TRANSITIONS
// ============================================================

const SceneTransitionWrapper: React.FC<{
  children: React.ReactNode;
  transitionIn?: TransitionInstruction;
  transitionOut?: TransitionInstruction;
  sceneDuration: number;
  fps: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ children, transitionIn, transitionOut, sceneDuration, fps, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const totalFrames = sceneDuration * fps;
  
  const defaultIn: TransitionInstruction = { type: 'fade', duration: 0.5, easing: 'ease-out' };
  const defaultOut: TransitionInstruction = { type: 'fade', duration: 0.5, easing: 'ease-in' };
  
  const inTransition = transitionIn || defaultIn;
  const outTransition = transitionOut || defaultOut;
  
  const inFrames = inTransition.duration * fps;
  const outFrames = outTransition.duration * fps;
  
  let opacity = 1;
  let transform = '';
  
  const applyTransitionEasing = (t: number, easing: TransitionInstruction['easing']): number => {
    switch (easing) {
      case 'ease-in': return t * t;
      case 'ease-out': return t * (2 - t);
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default: return t;
    }
  };
  
  if (!isFirst && frame < inFrames) {
    const rawProgress = frame / inFrames;
    const p = applyTransitionEasing(rawProgress, inTransition.easing);
    
    switch (inTransition.type) {
      case 'fade':
      case 'crossfade':
      case 'dissolve':
        opacity = p;
        break;
      case 'zoom':
        opacity = p;
        const zoomScale = 1.2 - p * 0.2;
        transform = `scale(${zoomScale})`;
        break;
      case 'slide-left':
        opacity = p;
        const slideL = (1 - p) * 100;
        transform = `translateX(${slideL}%)`;
        break;
      case 'slide-right':
        opacity = p;
        const slideR = (1 - p) * -100;
        transform = `translateX(${slideR}%)`;
        break;
      case 'wipe-left':
      case 'wipe-right':
        opacity = p;
        break;
      case 'none':
        opacity = 1;
        break;
    }
  }
  
  if (!isLast && frame > totalFrames - outFrames) {
    const rawProgress = (frame - (totalFrames - outFrames)) / outFrames;
    const p = applyTransitionEasing(rawProgress, outTransition.easing);
    
    switch (outTransition.type) {
      case 'fade':
      case 'crossfade':
      case 'dissolve':
        opacity = Math.min(opacity, 1 - p);
        break;
      case 'zoom':
        opacity = Math.min(opacity, 1 - p);
        const zoomOutScale = 1 - p * 0.1;
        transform = `scale(${zoomOutScale})`;
        break;
      case 'slide-left':
        opacity = Math.min(opacity, 1 - p);
        const slideOutL = p * -100;
        transform = `translateX(${slideOutL}%)`;
        break;
      case 'slide-right':
        opacity = Math.min(opacity, 1 - p);
        const slideOutR = p * 100;
        transform = `translateX(${slideOutR}%)`;
        break;
      case 'none':
        break;
    }
  }
  
  return (
    <AbsoluteFill style={{ opacity, transform: transform || undefined }}>
      {children}
    </AbsoluteFill>
  );
};

// ============================================================
// LOWER THIRD COMPONENT - PROFESSIONAL TV-STYLE SCENE TITLES
// ============================================================

interface LowerThirdProps {
  title: string;
  subtitle?: string;
  brand: BrandSettings;
  fps: number;
  durationInFrames: number;
}

const LowerThird: React.FC<LowerThirdProps> = ({ 
  title, 
  subtitle, 
  brand, 
  fps, 
  durationInFrames 
}) => {
  const frame = useCurrentFrame();
  const enterDuration = fps * 0.6;
  const exitStart = durationInFrames - fps * 0.4;
  
  let lineWidth = 0;
  let textOpacity = 0;
  let translateX = -20;
  let barScale = 0;
  
  if (frame < enterDuration) {
    const progress = frame / enterDuration;
    const eased = easeOutCubic(progress);
    lineWidth = interpolate(eased, [0, 1], [0, 100]);
    textOpacity = interpolate(progress, [0.3, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    translateX = interpolate(eased, [0, 1], [-20, 0]);
    barScale = spring({ frame, fps, config: { damping: 15, stiffness: 180 } });
  } else if (frame > exitStart) {
    const exitProgress = (frame - exitStart) / (durationInFrames - exitStart);
    const eased = easeInCubic(exitProgress);
    lineWidth = 100;
    textOpacity = 1 - eased;
    translateX = interpolate(eased, [0, 1], [0, 20]);
    barScale = 1;
  } else {
    lineWidth = 100;
    textOpacity = 1;
    translateX = 0;
    barScale = 1;
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        bottom: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          width: `${lineWidth}%`,
          height: 4,
          backgroundColor: brand.colors.accent,
          transform: `scaleX(${barScale})`,
          transformOrigin: 'left',
          borderRadius: 2,
        }}
      />
      <div
        style={{
          opacity: textOpacity,
          transform: `translateX(${translateX}px)`,
        }}
      >
        <div
          style={{
            fontSize: 36,
            fontWeight: brand.fonts.weight.heading,
            fontFamily: brand.fonts.heading,
            color: brand.colors.textLight,
            textShadow: '2px 2px 8px rgba(0,0,0,0.9)',
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              fontSize: 22,
              fontWeight: 400,
              fontFamily: brand.fonts.body,
              color: brand.colors.textLight,
              opacity: 0.8,
              textShadow: '1px 1px 4px rgba(0,0,0,0.8)',
              marginTop: 4,
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// PRODUCT OVERLAY COMPONENT
// ============================================================

const ProductOverlay: React.FC<{
  productUrl: string;
  position: { x: 'left' | 'center' | 'right'; y: 'top' | 'center' | 'bottom'; scale: number; animation?: string };
  fps: number;
  width: number;
  height: number;
}> = ({ productUrl, position, fps, width, height }) => {
  const frame = useCurrentFrame();
  
  // Validate URL
  if (!isValidHttpUrl(productUrl)) {
    console.warn(`[Remotion] Product overlay skipped - invalid URL: ${productUrl?.substring(0, 50)}`);
    return null;
  }
  
  const animDuration = fps * 0.8;
  const productSize = Math.min(width, height) * (position.scale || 0.4);

  let posX = width * 0.5;
  let posY = height * 0.5;

  switch (position.x) {
    case 'left': posX = width * 0.15; break;
    case 'center': posX = width * 0.5; break;
    case 'right': posX = width * 0.85; break;
  }
  switch (position.y) {
    case 'top': posY = height * 0.25; break;
    case 'center': posY = height * 0.5; break;
    case 'bottom': posY = height * 0.75; break;
  }

  let opacity = 1;
  let scale = 1;
  let translateX = 0;

  if (frame < animDuration) {
    const progress = frame / animDuration;
    switch (position.animation) {
      case 'fade':
        opacity = interpolate(progress, [0, 1], [0, 1]);
        break;
      case 'zoom':
        opacity = interpolate(progress, [0, 1], [0, 1]);
        scale = interpolate(progress, [0, 1], [0.7, 1]);
        break;
      case 'slide':
        opacity = interpolate(progress, [0, 1], [0, 1]);
        translateX = interpolate(progress, [0, 1], [position.x === 'left' ? -200 : 200, 0]);
        break;
      default:
        opacity = interpolate(progress, [0, 1], [0, 1]);
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: posX - productSize / 2,
        top: posY - productSize / 2,
        width: productSize,
        height: productSize,
        opacity,
        transform: `scale(${scale}) translateX(${translateX}px)`,
        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.4))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Img
        src={productUrl}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

// ============================================================
// PRODUCT REVEAL COMPONENT - TV-QUALITY DRAMATIC ANIMATION
// ============================================================

const ProductReveal: React.FC<{
  productUrl: string;
  brand: BrandSettings;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
}> = ({ productUrl, brand, fps, width, height, durationInFrames }) => {
  const frame = useCurrentFrame();
  
  if (!isValidHttpUrl(productUrl)) {
    return null;
  }
  
  const revealDuration = fps * 1.5; // 1.5 seconds for dramatic reveal
  const productSize = Math.min(width, height) * 0.5;
  
  let scale = 0.3;
  let opacity = 0;
  let glowIntensity = 0;
  let blur = 20;
  let floatY = 0;
  
  if (frame < revealDuration) {
    // Dramatic entrance with easeOutBack for overshoot effect
    const progress = frame / revealDuration;
    const eased = progress < 1 
      ? 1 - Math.pow(1 - progress, 3) * (1 - progress * 0.3 * Math.sin(progress * Math.PI))
      : 1;
    
    scale = interpolate(eased, [0, 1], [0.3, 1]);
    opacity = interpolate(progress, [0, 0.3, 1], [0, 1, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    glowIntensity = interpolate(progress, [0, 0.5, 1], [0, 30, 15]);
    blur = interpolate(progress, [0, 0.5, 1], [20, 0, 0]);
  } else {
    scale = 1;
    opacity = 1;
    glowIntensity = 15;
    blur = 0;
    
    // Subtle floating animation after reveal
    const floatFrame = frame - revealDuration;
    floatY = Math.sin(floatFrame / 30) * 5;
  }
  
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: `translate(-50%, calc(-50% + ${floatY}px)) scale(${scale})`,
        opacity,
        filter: `blur(${blur}px) drop-shadow(0 0 ${glowIntensity}px ${brand.colors.accent})`,
        width: productSize,
        height: productSize,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Img
        src={productUrl}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

// ============================================================
// SCENE RENDERER - WITH FULL ERROR HANDLING
// ============================================================

const SceneRenderer: React.FC<{
  scene: Scene;
  brand: BrandSettings;
  isFirst: boolean;
  isLast: boolean;
  showDebugInfo: boolean;
}> = ({ scene, brand, isFirst, isLast, showDebugInfo }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationInFrames = (scene.duration || 5) * fps;

  const instructions = (scene as any).compositionInstructions as SceneCompositionInstructions | undefined;
  const hasAIInstructions = !!instructions?.kenBurns;

  const defaultKenBurns: KenBurnsInstruction = {
    enabled: true,
    startScale: 1.0,
    endScale: 1.08,
    startPosition: { x: 50, y: 50 },
    endPosition: { x: 50, y: 50 },
    easing: 'ease-in-out',
  };

  const kenBurnsInstruction = instructions?.kenBurns || defaultKenBurns;

  // Phase 11D: Check for brand media assets first
  const brandAssetUrl = (scene as any).brandAssetUrl;
  const brandAssetType = (scene as any).brandAssetType;
  const animationSettings = (scene as any).animationSettings;
  const useBrandMedia = (scene as any).mediaSource === 'brand' && brandAssetUrl;
  
  const imageUrl = scene.assets?.backgroundUrl || scene.assets?.imageUrl;
  const videoUrl = scene.assets?.videoUrl;
  const productOverlayUrl = scene.assets?.productOverlayImage || 
                            scene.assets?.generatedProductImage ||
                            scene.assets?.productOverlayUrl ||
                            scene.assets?.productImage;
  const productPosition = scene.assets?.productOverlayPosition || { x: 'center', y: 'center', scale: 0.4, animation: 'fade' };
  // FIXED: Only show product overlay if EXPLICITLY enabled (user selected a product)
  // Previously defaulted to true which caused unwanted product overlays
  const useProductOverlay = scene.assets?.useProductOverlay === true;

  const imageStatus = getAssetStatus(imageUrl);
  const videoStatus = getAssetStatus(videoUrl);
  const brandStatus = getAssetStatus(brandAssetUrl);
  const hasValidImage = imageStatus === 'valid';
  const hasValidVideo = videoStatus === 'valid' && scene.background?.type === 'video';
  const hasValidBrandAsset = useBrandMedia && brandStatus === 'valid';
  
  const motionGraphicsData = (scene.assets as any)?.motionGraphics;
  const hasMotionGraphics = motionGraphicsData?.enabled && motionGraphicsData?.config;
  const isMotionGraphicScene = scene.background?.type === 'motion-graphic' as any || hasMotionGraphics;
  
  React.useEffect(() => {
    console.log(`[SceneRenderer] Scene ${scene.id} (${scene.type}):`);
    console.log(`  - videoUrl: ${videoUrl?.substring(0, 60) || 'none'}`);
    console.log(`  - hasAIInstructions: ${hasAIInstructions}`);
    if (hasAIInstructions && instructions?.kenBurns) {
      console.log(`  - kenBurns: ${instructions.kenBurns.startScale.toFixed(2)} → ${instructions.kenBurns.endScale.toFixed(2)}`);
      console.log(`  - transitionIn: ${instructions.transitionIn?.type || 'default'}`);
    }
  }, [scene.id]);

  const gradientFallback = <GradientFallback brand={brand} sceneType={scene.type} />;

  return (
    <SceneTransitionWrapper
      transitionIn={instructions?.transitionIn}
      transitionOut={instructions?.transitionOut}
      sceneDuration={scene.duration || 5}
      fps={fps}
      isFirst={isFirst}
      isLast={isLast}
    >
      {/* Background Layer - Brand Media, Motion Graphics, Video or Image with AI-powered Ken Burns */}
      <AbsoluteFill>
        {/* Phase 12: Priority 0 - Motion Graphics rendering */}
        {isMotionGraphicScene && hasMotionGraphics ? (
          <MotionGraphicsScene
            configs={[{
              type: motionGraphicsData.config.type,
              startFrame: 0,
              durationInFrames: durationInFrames,
              props: motionGraphicsData.renderInstructions || motionGraphicsData.config,
            }]}
            backgroundColor="transparent"
          />
        ) : hasValidBrandAsset && brandAssetType === 'video' ? (
          <Video
            src={brandAssetUrl}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            volume={0}
            startFrom={0}
            loop
          />
        ) : hasValidBrandAsset && brandAssetType === 'image' ? (
          <KenBurnsImage
            src={brandAssetUrl}
            animation={animationSettings?.type || 'ken-burns'}
            intensity={animationSettings?.intensity || 'subtle'}
            focusPoint={animationSettings?.focusPoint || { x: 50, y: 50 }}
          />
        ) : hasValidVideo ? (
          <KenBurnsBackground
            src={videoUrl!}
            isVideo={true}
            instruction={kenBurnsInstruction}
            sceneDuration={scene.duration || 5}
            fps={fps}
            fallback={gradientFallback}
          />
        ) : hasValidImage ? (
          <KenBurnsBackground
            src={imageUrl!}
            isVideo={false}
            instruction={kenBurnsInstruction}
            sceneDuration={scene.duration || 5}
            fps={fps}
            fallback={gradientFallback}
          />
        ) : (
          <>
            {gradientFallback}
            {showDebugInfo && imageStatus !== 'missing' && (
              <div
                style={{
                  position: 'absolute',
                  top: 20,
                  left: 20,
                  backgroundColor: 'rgba(255,0,0,0.8)',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: 4,
                  fontSize: 14,
                  fontFamily: 'monospace',
                }}
              >
                ⚠️ Image: {imageStatus}
              </div>
            )}
          </>
        )}
      </AbsoluteFill>

      {/* Overlay for text readability */}
      {scene.background?.overlay && (
        <AbsoluteFill
          style={{
            background: scene.background.overlay.type === 'gradient'
              ? `linear-gradient(to top, ${scene.background.overlay.color} 0%, transparent 60%)`
              : scene.background.overlay.type === 'vignette'
              ? 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)'
              : scene.background.overlay.color,
            opacity: scene.background.overlay.opacity,
          }}
        />
      )}

      {/* Product Overlay - Use ProductReveal for intro/cta scenes, regular overlay for others */}
      {productOverlayUrl && useProductOverlay && isValidHttpUrl(productOverlayUrl) && (
        scene.type === 'intro' || scene.type === 'cta' ? (
          <ProductReveal
            productUrl={productOverlayUrl}
            brand={brand}
            fps={fps}
            width={width}
            height={height}
            durationInFrames={durationInFrames}
          />
        ) : (
          <ProductOverlay
            productUrl={productOverlayUrl}
            position={productPosition}
            fps={fps}
            width={width}
            height={height}
          />
        )
      )}

      {/* Text Overlays - Use ONLY ONE source to prevent duplicates */}
      {(() => {
        // Phase 16 Fix: Skip text overlays for CTA/outro scenes - they have dedicated overlay components
        if (scene.type === 'cta' || scene.type === 'outro') {
          return null;
        }
        
        const instructions = (scene as any).compositionInstructions as SceneCompositionInstructions | undefined;
        const hasIntelligentOverlays = instructions?.textOverlays && instructions.textOverlays.length > 0;
        const hasTraditionalOverlays = scene.textOverlays && scene.textOverlays.length > 0;
        
        // PRIORITY 1: If we have AI-generated composition instructions, use ONLY intelligent overlays
        // Do NOT fall through to traditional overlays - this prevents duplication
        if (hasIntelligentOverlays) {
          return (
            <>
              {instructions!.textOverlays.map((textInstruction, idx) => (
                <IntelligentTextOverlay
                  key={`intelligent-text-${scene.id}-${idx}`}
                  instruction={textInstruction}
                  sceneDuration={scene.duration}
                  fps={fps}
                  brand={brand}
                />
              ))}
              {/* Intelligent product overlay if enabled */}
              {instructions!.productOverlay?.enabled && productOverlayUrl && isValidHttpUrl(productOverlayUrl) && (
                <IntelligentProductOverlay
                  productImage={productOverlayUrl}
                  instruction={instructions!.productOverlay}
                  sceneDuration={scene.duration}
                  fps={fps}
                />
              )}
            </>
          );
        }
        
        // PRIORITY 2: Use traditional overlays ONLY if no intelligent overlays exist
        if (!hasTraditionalOverlays) {
          return null;  // Let extracted overlays handle it (if any)
        }
        
        const useLowerThirdStyle = ['hook', 'benefit', 'feature', 'intro'].includes(scene.type);
        const primaryText = scene.textOverlays?.[0];
        
        if (!primaryText?.text) {
          return null;
        }
        
        if (useLowerThirdStyle) {
          return (
            <LowerThird
              title={primaryText.text.length > 50 ? primaryText.text.substring(0, 47) + '...' : primaryText.text}
              subtitle={scene.textOverlays?.[1]?.text}
              brand={brand}
              fps={fps}
              durationInFrames={durationInFrames}
            />
          );
        }
        
        return (
          <>
            {(scene.textOverlays || []).map((overlay) => (
              <TextOverlayComponent
                key={overlay.id}
                overlay={overlay}
                brand={brand}
                sceneFrame={frame}
                fps={fps}
              />
            ))}
          </>
        );
      })()}

      {/* Phase 11B: Extracted Overlay Rendering - ONLY if no other text overlays exist */}
      {(() => {
        // FIXED: Completely skip extracted overlays if we have ANY other text source
        // This prevents duplicate text overlays from showing
        const hasRegularTextOverlays = (scene.textOverlays?.length ?? 0) > 0 && scene.textOverlays![0]?.text;
        const hasIntelligentOverlays = ((scene as any).compositionInstructions?.textOverlays?.length ?? 0) > 0;
        const skipExtractedText = hasRegularTextOverlays || hasIntelligentOverlays;
        
        if (!scene.extractedOverlayText?.length && !scene.extractedLogos?.length) {
          return null;
        }
        
        const mappedOverlays = mapSceneToOverlays(
          scene,
          fps,
          brand.logoUrl,
          brand.watermarkUrl
        );
        
        return (
          <>
            {/* Only render extracted text if no regular overlays exist - prevents duplicates */}
            {!skipExtractedText && mappedOverlays.textOverlays.map((textProps, idx) => (
              <EnhancedTextOverlay key={`ext-text-${scene.id}-${idx}`} {...textProps} />
            ))}
            
            {mappedOverlays.bulletLists.map((listProps, idx) => (
              <BulletList key={`ext-bullets-${scene.id}-${idx}`} {...listProps} />
            ))}
            
            {/* Only render extracted lower thirds if no regular overlays exist */}
            {!skipExtractedText && mappedOverlays.lowerThirds.map((ltProps, idx) => (
              <Phase11BLowerThird key={`ext-lt-${scene.id}-${idx}`} {...ltProps} />
            ))}
            
            {mappedOverlays.ctaButtons.map((ctaProps, idx) => (
              <CTAButton key={`ext-cta-${scene.id}-${idx}`} {...ctaProps} />
            ))}
            
            {shouldShowLogo(scene.type) && mappedOverlays.logo && (
              <LogoOverlay {...mappedOverlays.logo} />
            )}
            
            {shouldShowWatermark(scene.type) && mappedOverlays.watermark && (
              <WatermarkOverlay {...mappedOverlays.watermark} />
            )}
          </>
        );
      })()}

      {/* Debug overlay showing scene info */}
      {showDebugInfo && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: 'rgba(0,0,0,0.7)',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 4,
            fontSize: 12,
            fontFamily: 'monospace',
          }}
        >
          Scene: {scene.id} | Type: {scene.type} | Duration: {scene.duration}s
          {hasAIInstructions && ` | KB: ${kenBurnsInstruction.startScale.toFixed(2)}→${kenBurnsInstruction.endScale.toFixed(2)}`}
        </div>
      )}
    </SceneTransitionWrapper>
  );
};

// ============================================================
// WATERMARK
// ============================================================

const Watermark: React.FC<{ brand: BrandSettings }> = ({ brand }) => {
  const { width } = useVideoConfig();
  const frame = useCurrentFrame();

  // Skip if no logo
  if (!brand.logoUrl || !isValidHttpUrl(brand.logoUrl)) {
    return null;
  }

  const fadeIn = interpolate(frame, [0, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 30, left: 30 },
    'top-right': { top: 30, right: 30 },
    'bottom-left': { bottom: 30, left: 30 },
    'bottom-right': { bottom: 30, right: 30 },
  };

  const watermarkSize = width * 0.08;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          ...positionStyles[brand.watermarkPosition],
          opacity: brand.watermarkOpacity * fadeIn,
        }}
      >
        <Img
          src={brand.logoUrl}
          style={{
            width: watermarkSize,
            height: 'auto',
            maxHeight: watermarkSize,
            objectFit: 'contain',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// BRAND OVERLAY COMPONENT (Phase 4E)
// ============================================================

interface BrandOverlayComponentProps {
  overlay: BrandOverlay;
  sceneDuration: number;
  fps: number;
}

const BrandOverlayComponent: React.FC<BrandOverlayComponentProps> = ({
  overlay,
  sceneDuration,
  fps,
}) => {
  const frame = useCurrentFrame();
  const startFrame = overlay.timing.startTime * fps;
  const animationFrames = overlay.animation.duration * fps;
  const delayFrames = (overlay.animation.delay || 0) * fps;
  const totalDuration = overlay.timing.duration === -1 
    ? sceneDuration * fps 
    : overlay.timing.duration * fps;
  
  // Validate asset URL
  if (!overlay.assetUrl || !isValidHttpUrl(overlay.assetUrl)) {
    return null;
  }
  
  // Don't render if before start time
  if (frame < startFrame) return null;
  
  // Don't render if after end time (unless duration is -1 for "entire scene")
  if (overlay.timing.duration !== -1 && frame > startFrame + totalDuration) return null;
  
  const adjustedFrame = frame - startFrame - delayFrames;
  
  // Calculate opacity based on animation
  let opacity = 0;
  if (adjustedFrame < 0) {
    opacity = 0;
  } else if (adjustedFrame < animationFrames) {
    // Fade in
    opacity = interpolate(
      adjustedFrame,
      [0, animationFrames],
      [0, overlay.opacity],
      { extrapolateRight: 'clamp' }
    );
  } else if (overlay.timing.duration !== -1 && adjustedFrame > totalDuration - animationFrames) {
    // Fade out
    const fadeOutFrame = adjustedFrame - (totalDuration - animationFrames);
    opacity = interpolate(
      fadeOutFrame,
      [0, animationFrames],
      [overlay.opacity, 0],
      { extrapolateRight: 'clamp' }
    );
  } else {
    opacity = overlay.opacity;
  }
  
  // Calculate scale for zoom animation
  let scale = 1;
  if (overlay.animation.type === 'zoom' && adjustedFrame >= 0 && adjustedFrame < animationFrames) {
    scale = interpolate(
      adjustedFrame,
      [0, animationFrames],
      [0.7, 1],
      { extrapolateRight: 'clamp' }
    );
  }
  
  // Calculate slide offset
  let translateY = 0;
  if (overlay.animation.type === 'slide' && adjustedFrame >= 0 && adjustedFrame < animationFrames) {
    translateY = interpolate(
      adjustedFrame,
      [0, animationFrames],
      [50, 0],
      { extrapolateRight: 'clamp' }
    );
  }
  
  // Position calculation based on anchor
  const getPositionStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = {
      position: 'absolute',
    };
    const { x, y, anchor } = overlay.position;
    
    if (anchor === 'center') {
      style.left = '50%';
      style.top = '50%';
      style.transform = `translate(-50%, -50%) scale(${scale}) translateY(${translateY}px)`;
    } else {
      if (anchor.includes('left')) {
        style.left = `${x}%`;
      } else if (anchor.includes('right')) {
        style.right = `${100 - x}%`;
      }
      
      if (anchor.includes('top')) {
        style.top = `${y}%`;
      } else if (anchor.includes('bottom')) {
        style.bottom = `${100 - y}%`;
      }
      
      style.transform = `scale(${scale}) translateY(${translateY}px)`;
    }
    
    return style;
  };
  
  return (
    <div
      style={{
        ...getPositionStyle(),
        opacity,
        width: `${overlay.size.width}%`,
        maxHeight: overlay.size.maxHeight ? `${overlay.size.maxHeight}%` : undefined,
        zIndex: overlay.type === 'watermark' ? 10 : 20,
        pointerEvents: 'none',
      }}
    >
      <Img
        src={overlay.assetUrl}
        style={{
          width: '100%',
          height: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

// ============================================================
// INTRO ANIMATION COMPONENT (Phase 4E)
// ============================================================

interface IntroAnimationProps {
  overlay: BrandOverlay;
  fps: number;
}

const IntroAnimation: React.FC<IntroAnimationProps> = ({ overlay, fps }) => {
  const durationFrames = Math.ceil(overlay.timing.duration * fps);
  
  return (
    <Sequence from={0} durationInFrames={durationFrames}>
      <BrandOverlayComponent
        overlay={overlay}
        sceneDuration={overlay.timing.duration}
        fps={fps}
      />
    </Sequence>
  );
};

// ============================================================
// BRAND WATERMARK COMPONENT (Phase 4E)
// ============================================================

interface BrandWatermarkProps {
  overlay: BrandOverlay;
  sceneDuration: number;
  fps: number;
}

const BrandWatermark: React.FC<BrandWatermarkProps> = ({ overlay, sceneDuration, fps }) => {
  return (
    <BrandOverlayComponent
      overlay={{
        ...overlay,
        timing: {
          ...overlay.timing,
          duration: -1,  // Show for entire scene
        },
      }}
      sceneDuration={sceneDuration}
      fps={fps}
    />
  );
};

// ============================================================
// CTA OUTRO COMPONENT (Phase 4E)
// ============================================================

interface CTAOutroProps {
  logo: BrandOverlay;
  ctaOverlay: CTAOverlay;
  colors: ProjectBrandInstructions['colors'];
  sceneDuration: number;
  fps: number;
}

const CTAOutro: React.FC<CTAOutroProps> = ({
  logo,
  ctaOverlay,
  colors,
  sceneDuration,
  fps,
}) => {
  const frame = useCurrentFrame();
  // Use timing from ctaOverlay if provided, otherwise default to 4 seconds before end
  const ctaStartTime = ctaOverlay.timing?.startTime ?? Math.max(0, sceneDuration - 4);
  const startFrame = ctaStartTime * fps;
  
  // Validate logo URL
  if (!logo.assetUrl || !isValidHttpUrl(logo.assetUrl)) {
    return null;
  }
  
  // Don't render before CTA start time
  if (frame < startFrame) return null;
  
  const adjustedFrame = frame - startFrame;
  const fadeInFrames = 0.8 * fps;
  
  // Fade in the entire CTA
  const fadeIn = interpolate(
    adjustedFrame,
    [0, fadeInFrames],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Stagger the elements
  const logoOpacity = interpolate(
    adjustedFrame,
    [0, fadeInFrames],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const headlineOpacity = interpolate(
    adjustedFrame,
    [fadeInFrames * 0.3, fadeInFrames * 1.2],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const subtextOpacity = interpolate(
    adjustedFrame,
    [fadeInFrames * 0.5, fadeInFrames * 1.4],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const urlOpacity = interpolate(
    adjustedFrame,
    [fadeInFrames * 0.7, fadeInFrames * 1.6],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const ctaData = ctaOverlay.ctaData;
  
  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `rgba(0, 0, 0, ${fadeIn * 0.75})`,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div
        style={{
          marginBottom: '2rem',
          opacity: logoOpacity,
          width: '200px',
        }}
      >
        <Img
          src={logo.assetUrl}
          style={{
            width: '100%',
            height: 'auto',
            objectFit: 'contain',
          }}
        />
      </div>
      
      {/* Headline */}
      <h2
        style={{
          fontSize: '48px',
          fontWeight: 'bold',
          color: colors.text || '#ffffff',
          textAlign: 'center',
          marginBottom: '0.75rem',
          textShadow: '2px 2px 8px rgba(0,0,0,0.5)',
          opacity: headlineOpacity,
          maxWidth: '80%',
          lineHeight: 1.2,
        }}
      >
        {ctaData.headline}
      </h2>
      
      {/* Subtext */}
      {ctaData.subtext && (
        <p
          style={{
            fontSize: '24px',
            color: colors.text || '#ffffff',
            marginBottom: '1.5rem',
            textShadow: '1px 1px 4px rgba(0,0,0,0.5)',
            opacity: subtextOpacity,
          }}
        >
          {ctaData.subtext}
        </p>
      )}
      
      {/* Website URL Button */}
      <div
        style={{
          padding: '14px 36px',
          backgroundColor: ctaData.buttonColor || colors.primary || '#2D5A27',
          borderRadius: '8px',
          fontSize: '28px',
          fontWeight: 'bold',
          color: colors.text || '#ffffff',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          opacity: urlOpacity,
        }}
      >
        {ctaData.url}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// SCENE LOGO ENDING (Phase 16G - Logo reveal at end of scene)
// ============================================================

interface SceneLogoEndingProps {
  logoUrl: string;
  backgroundColor: string;
  duration: number;
  animation: 'fade' | 'zoom' | 'slide' | 'elegant';
  sceneDuration: number;
  fps: number;
}

const SceneLogoEnding: React.FC<SceneLogoEndingProps> = ({
  logoUrl,
  backgroundColor,
  duration,
  animation,
  sceneDuration,
  fps,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  // Clamp duration to ensure it doesn't exceed scene duration
  const clampedDuration = Math.min(duration, sceneDuration - 0.5); // Leave at least 0.5s of content
  const effectiveDuration = clampedDuration > 0 ? clampedDuration : 1; // Minimum 1s if scene is too short
  
  const endingDurationFrames = Math.round(effectiveDuration * fps);
  const endingStartFrame = Math.round((sceneDuration - effectiveDuration) * fps);
  
  // Only render when in the ending sequence
  if (frame < endingStartFrame) {
    return null;
  }
  
  const relativeFrame = frame - endingStartFrame;
  
  // Background fade in
  const bgOpacity = interpolate(
    relativeFrame,
    [0, fps * 0.5],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Logo animation based on type
  let logoOpacity = 1;
  let logoScale = 1;
  let logoTranslateY = 0;
  
  switch (animation) {
    case 'fade':
      logoOpacity = interpolate(
        relativeFrame,
        [fps * 0.3, fps * 0.8],
        [0, 1],
        { extrapolateRight: 'clamp' }
      );
      break;
    case 'zoom':
      logoOpacity = interpolate(
        relativeFrame,
        [fps * 0.3, fps * 0.6],
        [0, 1],
        { extrapolateRight: 'clamp' }
      );
      logoScale = interpolate(
        relativeFrame,
        [fps * 0.3, fps * 0.8],
        [0.5, 1],
        { extrapolateRight: 'clamp' }
      );
      break;
    case 'slide':
      logoOpacity = interpolate(
        relativeFrame,
        [fps * 0.2, fps * 0.5],
        [0, 1],
        { extrapolateRight: 'clamp' }
      );
      logoTranslateY = interpolate(
        relativeFrame,
        [fps * 0.2, fps * 0.7],
        [50, 0],
        { extrapolateRight: 'clamp' }
      );
      break;
    case 'elegant':
    default:
      // Spring-based elegant reveal
      const logoSpring = spring({
        frame: relativeFrame - Math.round(fps * 0.3),
        fps,
        config: { damping: 20, stiffness: 100, mass: 0.5 },
      });
      logoOpacity = logoSpring;
      logoScale = interpolate(logoSpring, [0, 1], [0.85, 1]);
      break;
  }
  
  return (
    <AbsoluteFill
      style={{
        opacity: bgOpacity,
        backgroundColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
    >
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale}) translateY(${logoTranslateY}px)`,
          maxWidth: '40%',
          maxHeight: '40%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Img
          src={logoUrl}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.3))',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// INTRO SLATE (shown when no scenes)
// ============================================================

const IntroSlate: React.FC<{ brand: BrandSettings }> = ({ brand }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = spring({
    frame,
    fps,
    config: { damping: 100, stiffness: 200, mass: 0.5 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: brand.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          opacity,
          color: brand.colors.textLight,
          fontSize: 48,
          fontFamily: brand.fonts.heading,
          fontWeight: brand.fonts.weight.heading,
        }}
      >
        {brand.name}
      </div>
    </AbsoluteFill>
  );
};

// ============================================================
// ASSET VALIDATION SUMMARY (for debugging)
// ============================================================

const AssetValidationSummary: React.FC<{
  scenes: Scene[];
  voiceoverUrl: string | null;
  musicUrl: string | null;
}> = ({ scenes, voiceoverUrl, musicUrl }) => {
  // This component logs validation info but doesn't render anything
  React.useEffect(() => {
    console.log('=== REMOTION ASSET VALIDATION ===');
    console.log(`Voiceover: ${getAssetStatus(voiceoverUrl)} - ${voiceoverUrl?.substring(0, 60)}`);
    console.log(`Music: ${getAssetStatus(musicUrl)} - ${musicUrl?.substring(0, 60)}`);
    
    const videoScenes = scenes.filter(s => s.background?.type === 'video');
    console.log(`Total scenes: ${scenes.length}, Scenes with video B-roll: ${videoScenes.length}`);
    
    scenes.forEach((scene, i) => {
      const imgUrl = scene.assets?.backgroundUrl || scene.assets?.imageUrl;
      const videoUrl = scene.assets?.videoUrl;
      const prodUrl = scene.assets?.productOverlayUrl;
      const bgType = scene.background?.type;
      
      console.log(`Scene ${i} (${scene.type}):`);
      console.log(`  Background type: ${bgType || 'undefined'}`);
      console.log(`  Image: ${getAssetStatus(imgUrl)}`);
      console.log(`  Video: ${getAssetStatus(videoUrl)} - ${videoUrl?.substring(0, 60) || 'none'}`);
      if (prodUrl) {
        console.log(`  Product: ${getAssetStatus(prodUrl)}`);
      }
      
      // Log whether video will render
      const willRenderVideo = getAssetStatus(videoUrl) === 'valid' && bgType === 'video';
      console.log(`  >>> WILL RENDER VIDEO: ${willRenderVideo}`);
    });
    
    console.log('=================================');
  }, []);

  return null;
};

// ============================================================
// SOUND EFFECTS COMPONENT
// ============================================================

const SceneSoundEffects: React.FC<{
  soundDesign: SceneSoundDesign | undefined;
  sceneStartFrame: number;
  sceneDuration: number;
  fps: number;
}> = ({ soundDesign, sceneStartFrame, sceneDuration, fps }) => {
  if (!soundDesign) return null;

  const sceneFrames = Math.ceil(sceneDuration * fps);

  return (
    <>
      {/* Transition In Sound */}
      {soundDesign.transitionIn && isValidHttpUrl(soundDesign.transitionIn.url) && (
        <Sequence from={sceneStartFrame} durationInFrames={Math.ceil(soundDesign.transitionIn.duration * fps)}>
          <Audio
            src={soundDesign.transitionIn.url}
            volume={soundDesign.transitionIn.volume}
          />
        </Sequence>
      )}

      {/* Ambient Sound (loops through scene) */}
      {soundDesign.ambience && isValidHttpUrl(soundDesign.ambience.url) && (
        <Sequence from={sceneStartFrame} durationInFrames={sceneFrames}>
          <Audio
            src={soundDesign.ambience.url}
            volume={soundDesign.ambience.volume}
            loop
          />
        </Sequence>
      )}

      {/* Transition Out Sound */}
      {soundDesign.transitionOut && isValidHttpUrl(soundDesign.transitionOut.url) && (
        <Sequence 
          from={sceneStartFrame + sceneFrames - Math.ceil(soundDesign.transitionOut.duration * fps)} 
          durationInFrames={Math.ceil(soundDesign.transitionOut.duration * fps)}
        >
          <Audio
            src={soundDesign.transitionOut.url}
            volume={soundDesign.transitionOut.volume}
          />
        </Sequence>
      )}

      {/* Emphasis Sounds (sparkles, success chimes, etc.) */}
      {soundDesign.emphasis?.map((effect, index) => {
        if (!isValidHttpUrl(effect.url)) return null;
        const emphasisFrame = sceneStartFrame + Math.floor(sceneDuration * 0.5 * fps);
        return (
          <Sequence 
            key={`emphasis-${index}`}
            from={emphasisFrame} 
            durationInFrames={Math.ceil(effect.duration * fps)}
          >
            <Audio
              src={effect.url}
              volume={effect.volume}
            />
          </Sequence>
        );
      })}
    </>
  );
};

// ============================================================
// MAIN COMPOSITION
// ============================================================

export const UniversalVideoComposition: React.FC<UniversalVideoProps> = ({
  scenes,
  voiceoverUrl,
  musicUrl,
  musicVolume = 0.18,
  brand,
  outputFormat,
  brandInstructions,
  endCardConfig,
  soundDesignConfig,
  audioDuckingKeyframes,
  transitions,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  
  const showDebugInfo = false;
  
  // Phase 16: Always use Pine Hill Farm defaults if no config provided
  // endCardConfig being undefined or explicitly set means we use defaults
  const effectiveEndCardConfig = endCardConfig ?? PINE_HILL_FARM_END_CARD;
  const effectiveSoundConfig = soundDesignConfig ?? PINE_HILL_FARM_SOUND_CONFIG;
  
  // Phase 16 Fix: End card should ALWAYS render (using defaults if no config provided)
  // Only skip if endCardConfig is explicitly set with enabled: false (not implemented in current API)
  const hasEndCard = true; // Always render end card with Pine Hill Farm branding
  const endCardDuration = Math.round((effectiveEndCardConfig.duration || 5) * fps);
  const endCardStartFrame = durationInFrames - endCardDuration;

  // Build scene sequences with brand overlays
  let currentFrame = 0;
  const sceneSequences = scenes.map((scene, index) => {
    const durationInFrames = (scene.duration || 5) * fps;
    const isFirstScene = index === 0;
    const isLastScene = index === scenes.length - 1;
    const sceneStartFrame = currentFrame;
    
    // Get scene-specific brand overlays
    const sceneBrandOverlays = brandInstructions?.sceneOverlays?.[scene.id];
    
    const sequence = (
      <Sequence
        key={scene.id || `scene-${index}`}
        from={sceneStartFrame}
        durationInFrames={durationInFrames}
      >
        <AbsoluteFill>
          {/* Scene content */}
          <SceneRenderer
            scene={scene}
            brand={brand}
            isFirst={isFirstScene}
            isLast={isLastScene}
            showDebugInfo={showDebugInfo}
          />
          
          {/* BRAND OVERLAYS (Phase 4E) */}
          
          {/* Intro animation on first scene */}
          {isFirstScene && brandInstructions?.introAnimation && (
            <IntroAnimation
              overlay={brandInstructions.introAnimation}
              fps={fps}
            />
          )}
          
          {/* Brand watermark on middle scenes (respects scene-level showWatermark flag) */}
          {!isFirstScene && !isLastScene && (
            // Use scene-level watermark if provided, otherwise use global watermark
            // Only show if showWatermark is true (defaults to true if not specified)
            (sceneBrandOverlays?.showWatermark !== false) && (
              sceneBrandOverlays?.watermark ? (
                <BrandWatermark
                  overlay={sceneBrandOverlays.watermark}
                  sceneDuration={scene.duration || 5}
                  fps={fps}
                />
              ) : brandInstructions?.watermark ? (
                <BrandWatermark
                  overlay={brandInstructions.watermark}
                  sceneDuration={scene.duration || 5}
                  fps={fps}
                />
              ) : null
            )
          )}
          
          {/* CTA outro on last scene */}
          {isLastScene && 
           brandInstructions?.outroSequence?.[0] && 
           brandInstructions?.ctaOverlay && (
            <CTAOutro
              logo={brandInstructions.outroSequence[0]}
              ctaOverlay={brandInstructions.ctaOverlay}
              colors={brandInstructions.colors}
              sceneDuration={scene.duration || 5}
              fps={fps}
            />
          )}
          
          {/* Scene-specific brand overlays */}
          {sceneBrandOverlays?.overlays?.map((overlay, overlayIndex) => (
            <BrandOverlayComponent
              key={`brand-overlay-${overlayIndex}`}
              overlay={overlay}
              sceneDuration={scene.duration || 5}
              fps={fps}
            />
          ))}
          
          {/* Scene-level Logo Ending (renders at end of scene) */}
          {sceneBrandOverlays?.logoEnding?.enabled && sceneBrandOverlays?.logoEnding?.logoUrl && (
            <SceneLogoEnding
              logoUrl={sceneBrandOverlays.logoEnding.logoUrl}
              backgroundColor={sceneBrandOverlays.logoEnding.backgroundColor || '#4A7C59'}
              duration={sceneBrandOverlays.logoEnding.duration || 3}
              animation={sceneBrandOverlays.logoEnding.animation || 'elegant'}
              sceneDuration={scene.duration || 5}
              fps={fps}
            />
          )}
        </AbsoluteFill>
      </Sequence>
    );
    currentFrame += durationInFrames;
    return sequence;
  });

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {/* Validation logging (development only) */}
      <AssetValidationSummary 
        scenes={scenes} 
        voiceoverUrl={voiceoverUrl} 
        musicUrl={musicUrl} 
      />
      
      {/* Main content */}
      {scenes.length === 0 ? (
        <IntroSlate brand={brand} />
      ) : (
        sceneSequences
      )}

      {/* Fallback watermark - only if no brand instructions */}
      {!brandInstructions?.watermark && <Watermark brand={brand} />}

      {/* Background Music - legacy ducking (only when no keyframes provided) */}
      {(!audioDuckingKeyframes || audioDuckingKeyframes.length === 0) && (
        <DuckedMusicAudio 
          src={musicUrl} 
          baseVolume={musicVolume}
          duckedVolume={musicVolume * 0.5}
          hasVoiceover={!!voiceoverUrl && isValidHttpUrl(voiceoverUrl)}
          label="Background music"
        />
      )}

      {/* Voiceover - full volume */}
      <SafeAudio 
        src={voiceoverUrl} 
        volume={1.0} 
        label="Voiceover"
      />

      {/* Sound Effects (whooshes, ambient, emphasis) */}
      {(() => {
        let frameOffset = 0;
        return scenes.map((scene, index) => {
          const sceneStartFrame = frameOffset;
          const sceneDuration = scene.duration || 5;
          frameOffset += Math.ceil(sceneDuration * fps);
          
          return (
            <SceneSoundEffects
              key={`sfx-${scene.id || index}`}
              soundDesign={scene.soundDesign}
              sceneStartFrame={sceneStartFrame}
              sceneDuration={sceneDuration}
              fps={fps}
            />
          );
        });
      })()}
      
      {/* Animated End Card (Phase 16) */}
      {hasEndCard && (
        <Sequence from={endCardStartFrame} durationInFrames={endCardDuration}>
          <AnimatedEndCard config={effectiveEndCardConfig} />
        </Sequence>
      )}
      
      {/* Enhanced Sound Design Layer (Phase 16) */}
      {effectiveSoundConfig.enabled && effectiveSoundConfig.transitionSounds && transitions && transitions.length > 0 && (
        <SoundDesignLayer
          transitions={transitions.map((t, i) => {
            let frameOffset = 0;
            for (let j = 0; j <= i; j++) {
              frameOffset += Math.ceil((scenes[j]?.duration || 5) * fps);
            }
            const transitionDurationFrames = Math.round(t.duration * fps);
            return {
              config: t,
              startFrame: frameOffset - Math.floor(transitionDurationFrames / 2),
            };
          })}
          logoRevealFrame={effectiveSoundConfig.impactSounds && hasEndCard ? endCardStartFrame + Math.round(0.3 * fps) : undefined}
          ctaStartFrame={effectiveSoundConfig.impactSounds && hasEndCard ? endCardStartFrame : undefined}
          enableAmbient={effectiveSoundConfig.ambientLayer && effectiveSoundConfig.ambientType !== 'none'}
          ambientType={effectiveSoundConfig.ambientType === 'nature' ? 'nature' : 'warm'}
          masterVolume={effectiveSoundConfig.masterVolume}
        />
      )}
      
      {/* Enhanced Ducked Music with Keyframes (Phase 16) */}
      {musicUrl && audioDuckingKeyframes && audioDuckingKeyframes.length > 0 && (
        <DuckedMusic
          musicUrl={musicUrl}
          baseVolume={musicVolume}
          volumeKeyframes={audioDuckingKeyframes}
          fps={fps}
        />
      )}
    </AbsoluteFill>
  );
};

export default UniversalVideoComposition;
