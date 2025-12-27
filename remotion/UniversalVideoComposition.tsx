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

export interface UniversalVideoProps {
  scenes: Scene[];
  voiceoverUrl: string | null;
  musicUrl: string | null;
  musicVolume: number;
  brand: BrandSettings;
  outputFormat: OutputFormat;
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

  // Transition calculations - Enhanced with multiple types
  const transitionInFrames = (scene.transitionIn?.duration || 0.5) * fps;
  const transitionOutFrames = (scene.transitionOut?.duration || 0.5) * fps;
  const transitionInType = scene.transitionIn?.type || 'fade';
  const transitionOutType = scene.transitionOut?.type || 'fade';

  // Calculate transition progress
  const getTransitionStyle = (
    transitionType: string,
    progress: number,
    direction: 'in' | 'out'
  ): { opacity: number; transform?: string; filter?: string } => {
    const eased = direction === 'in' 
      ? 1 - Math.pow(1 - progress, 3) // easeOutCubic
      : Math.pow(progress, 3); // easeInCubic

    switch (transitionType) {
      case 'fade':
        return { opacity: direction === 'in' ? eased : 1 - eased };
        
      case 'slide-left':
        const slideX = direction === 'in' 
          ? interpolate(eased, [0, 1], [100, 0])
          : interpolate(eased, [0, 1], [0, -100]);
        return { 
          opacity: direction === 'in' ? eased : 1 - eased,
          transform: `translateX(${slideX}%)` 
        };
        
      case 'slide-right':
        const slideXR = direction === 'in' 
          ? interpolate(eased, [0, 1], [-100, 0])
          : interpolate(eased, [0, 1], [0, 100]);
        return { 
          opacity: direction === 'in' ? eased : 1 - eased,
          transform: `translateX(${slideXR}%)` 
        };
        
      case 'zoom':
        const zoomScale = direction === 'in'
          ? interpolate(eased, [0, 1], [1.2, 1])
          : interpolate(eased, [0, 1], [1, 0.9]);
        return {
          opacity: direction === 'in' ? eased : 1 - eased,
          transform: `scale(${zoomScale})`,
        };
        
      case 'blur':
        const blurAmount = direction === 'in'
          ? interpolate(eased, [0, 1], [20, 0])
          : interpolate(eased, [0, 1], [0, 15]);
        return {
          opacity: direction === 'in' ? eased : 1 - eased,
          filter: `blur(${blurAmount}px)`,
        };
        
      case 'crossfade':
      default:
        return { opacity: direction === 'in' ? eased : 1 - eased };
    }
  };

  // Calculate combined transition styles
  let transitionStyle: { opacity: number; transform?: string; filter?: string } = { opacity: 1 };
  
  if (!isFirst && frame < transitionInFrames) {
    const progress = frame / transitionInFrames;
    transitionStyle = getTransitionStyle(transitionInType, progress, 'in');
  } else if (!isLast && frame > durationInFrames - transitionOutFrames) {
    const progress = (frame - (durationInFrames - transitionOutFrames)) / transitionOutFrames;
    transitionStyle = getTransitionStyle(transitionOutType, progress, 'out');
  }
  
  const opacity = transitionStyle.opacity;

  // Ken Burns / background effect
  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (scene.background?.effect) {
    const effectProgress = frame / durationInFrames;
    const intensity = scene.background.effect.intensity === 'subtle' ? 0.05 :
                      scene.background.effect.intensity === 'medium' ? 0.1 : 0.15;

    switch (scene.background.effect.type) {
      case 'ken-burns':
        if (scene.background.effect.direction === 'in') {
          scale = interpolate(effectProgress, [0, 1], [1, 1 + intensity]);
        } else {
          scale = interpolate(effectProgress, [0, 1], [1 + intensity, 1]);
        }
        break;
      case 'zoom':
        scale = interpolate(effectProgress, [0, 1], [1, 1 + intensity * 2]);
        break;
      case 'pan':
        if (scene.background.effect.direction === 'left') {
          translateX = interpolate(effectProgress, [0, 1], [0, -width * intensity]);
        } else {
          translateX = interpolate(effectProgress, [0, 1], [-width * intensity, 0]);
        }
        break;
    }
  }

  // Get image/video URLs with fallback chain
  const imageUrl = scene.assets?.backgroundUrl || scene.assets?.imageUrl;
  const videoUrl = scene.assets?.videoUrl;
  const productOverlayUrl = scene.assets?.productOverlayUrl;
  const productPosition = scene.assets?.productOverlayPosition || { x: 'center', y: 'center', scale: 0.4, animation: 'fade' };
  const useProductOverlay = scene.assets?.useProductOverlay !== false;

  // Check asset validity
  const imageStatus = getAssetStatus(imageUrl);
  const videoStatus = getAssetStatus(videoUrl);
  const hasValidImage = imageStatus === 'valid';
  const hasValidVideo = videoStatus === 'valid' && scene.background?.type === 'video';
  
  // Debug log for each scene render (only logs once due to React strict mode handling)
  React.useEffect(() => {
    console.log(`[SceneRenderer] Scene ${scene.id} (${scene.type}):`);
    console.log(`  - videoUrl: ${videoUrl?.substring(0, 60) || 'none'}`);
    console.log(`  - videoStatus: ${videoStatus}`);
    console.log(`  - background.type: ${scene.background?.type || 'undefined'}`);
    console.log(`  - hasValidVideo: ${hasValidVideo}`);
    console.log(`  - hasValidImage: ${hasValidImage}`);
  }, [scene.id]);

  return (
    <AbsoluteFill style={{ 
      opacity: transitionStyle.opacity,
      transform: transitionStyle.transform,
      filter: transitionStyle.filter,
    }}>
      {/* Background Layer - Video or Image */}
      <AbsoluteFill>
        {hasValidVideo ? (
          // VIDEO BACKGROUND (B-roll)
          <Video
            src={videoUrl!}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            volume={0}
            startFrom={0}
            loop
            delayRenderTimeoutInMilliseconds={15000}
            delayRenderRetries={1}
          />
        ) : hasValidImage ? (
          // IMAGE BACKGROUND with Ken Burns effect
          <SafeImage
            src={imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
            }}
            fallback={<GradientFallback brand={brand} sceneType={scene.type} />}
          />
        ) : (
          // Use gradient fallback but also show debug info if enabled
          <>
            <GradientFallback brand={brand} sceneType={scene.type} />
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

      {/* Text Overlays - ONLY ONE STYLE per scene to prevent duplicates */}
      {(() => {
        // Determine which style to use based on scene type
        const useLowerThirdStyle = ['hook', 'benefit', 'feature', 'intro'].includes(scene.type);
        const primaryText = scene.textOverlays?.[0];
        
        // No text to display
        if (!primaryText?.text) {
          return null;
        }
        
        if (useLowerThirdStyle) {
          // Use ONLY LowerThird component for content scenes
          // DO NOT also render TextOverlayComponent - that causes duplicates
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
        
        // Use centered TextOverlayComponent ONLY for CTA, outro, and other scene types
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
        </div>
      )}
    </AbsoluteFill>
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
}) => {
  const { fps } = useVideoConfig();
  
  // Enable debug mode via environment or prop
  const showDebugInfo = false; // Set to true for debugging, false for production

  // Build scene sequences
  let currentFrame = 0;
  const sceneSequences = scenes.map((scene, index) => {
    const durationInFrames = (scene.duration || 5) * fps;
    const sequence = (
      <Sequence
        key={scene.id || `scene-${index}`}
        from={currentFrame}
        durationInFrames={durationInFrames}
      >
        <SceneRenderer
          scene={scene}
          brand={brand}
          isFirst={index === 0}
          isLast={index === scenes.length - 1}
          showDebugInfo={showDebugInfo}
        />
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

      {/* Watermark - only if valid URL */}
      <Watermark brand={brand} />

      {/* Background Music - with ducking during voiceover */}
      <DuckedMusicAudio 
        src={musicUrl} 
        baseVolume={0.18}
        duckedVolume={0.15}
        hasVoiceover={!!voiceoverUrl && isValidHttpUrl(voiceoverUrl)}
        label="Background music"
      />

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
    </AbsoluteFill>
  );
};

export default UniversalVideoComposition;
