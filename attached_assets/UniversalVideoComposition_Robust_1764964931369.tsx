import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
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
const GradientFallback: React.FC<{ brand: BrandSettings; sceneType: string }> = ({ brand, sceneType }) => {
  const gradients: Record<string, string> = {
    hook: `linear-gradient(135deg, ${brand.colors.primary} 0%, #2d1b4e 100%)`,
    intro: `linear-gradient(180deg, ${brand.colors.primary} 0%, ${brand.colors.secondary} 100%)`,
    benefit: `linear-gradient(135deg, #1a4480 0%, #2d5a27 100%)`,
    feature: `linear-gradient(135deg, ${brand.colors.accent} 0%, ${brand.colors.primary} 100%)`,
    cta: `linear-gradient(135deg, ${brand.colors.accent} 0%, #c9a227 50%, ${brand.colors.primary} 100%)`,
    default: `linear-gradient(135deg, ${brand.colors.primary} 0%, ${brand.colors.secondary} 100%)`,
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
// SAFE AUDIO COMPONENT
// ============================================================

const SafeAudio: React.FC<{
  src: string | null | undefined;
  volume: number;
  label: string;
}> = ({ src, volume, label }) => {
  const status = getAssetStatus(src);
  
  if (status !== 'valid') {
    // Log the issue but don't crash - just skip audio
    console.warn(`[Remotion] ${label} audio skipped - ${status}: ${src?.substring(0, 50)}`);
    return null;
  }
  
  return <Audio src={src!} volume={volume} />;
};

// ============================================================
// TEXT OVERLAY COMPONENT (unchanged but with safety)
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

  // Enter animation
  if (localFrame < animDuration) {
    const progress = localFrame / animDuration;
    switch (overlay.animation?.enter || 'fade') {
      case 'fade':
        opacity = progress;
        break;
      case 'slide-up':
        opacity = progress;
        translateY = interpolate(progress, [0, 1], [50, 0]);
        break;
      case 'slide-left':
        opacity = progress;
        translateX = interpolate(progress, [0, 1], [100, 0]);
        break;
      case 'scale':
        opacity = progress;
        scale = interpolate(progress, [0, 1], [0.5, 1]);
        break;
    }
  }

  // Exit animation
  const exitStart = durationFrames - animDuration;
  if (localFrame > exitStart) {
    const exitProgress = (localFrame - exitStart) / animDuration;
    switch (overlay.animation?.exit || 'fade') {
      case 'fade':
        opacity = 1 - exitProgress;
        break;
      case 'slide-down':
        opacity = 1 - exitProgress;
        translateY = interpolate(exitProgress, [0, 1], [0, 50]);
        break;
      case 'scale':
        opacity = 1 - exitProgress;
        scale = interpolate(exitProgress, [0, 1], [1, 0.8]);
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
      }}
    >
      <div style={getStyleByType()}>
        {overlay.text || ''}
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

  // Transition calculations
  const transitionInFrames = (scene.transitionIn?.duration || 0.5) * fps;
  const transitionOutFrames = (scene.transitionOut?.duration || 0.5) * fps;

  let opacity = 1;
  if (!isFirst && frame < transitionInFrames) {
    opacity = interpolate(frame, [0, transitionInFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  }
  if (!isLast && frame > durationInFrames - transitionOutFrames) {
    opacity = interpolate(
      frame,
      [durationInFrames - transitionOutFrames, durationInFrames],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }

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

  // Get image URLs with fallback chain
  const imageUrl = scene.assets?.backgroundUrl || scene.assets?.imageUrl;
  const productOverlayUrl = scene.assets?.productOverlayUrl;
  const productPosition = scene.assets?.productOverlayPosition || { x: 'center', y: 'center', scale: 0.4, animation: 'fade' };
  const useProductOverlay = scene.assets?.useProductOverlay !== false;

  // Check image validity
  const imageStatus = getAssetStatus(imageUrl);
  const hasValidImage = imageStatus === 'valid';

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Background Layer */}
      <AbsoluteFill>
        {hasValidImage ? (
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

      {/* Product Overlay */}
      {productOverlayUrl && useProductOverlay && isValidHttpUrl(productOverlayUrl) && (
        <ProductOverlay
          productUrl={productOverlayUrl}
          position={productPosition}
          fps={fps}
          width={width}
          height={height}
        />
      )}

      {/* Text Overlays */}
      {(scene.textOverlays || []).map((overlay) => (
        <TextOverlayComponent
          key={overlay.id}
          overlay={overlay}
          brand={brand}
          sceneFrame={frame}
          fps={fps}
        />
      ))}

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
    
    scenes.forEach((scene, i) => {
      const imgUrl = scene.assets?.backgroundUrl || scene.assets?.imageUrl;
      const prodUrl = scene.assets?.productOverlayUrl;
      console.log(`Scene ${i} (${scene.type}):`);
      console.log(`  Background: ${getAssetStatus(imgUrl)}`);
      if (prodUrl) {
        console.log(`  Product: ${getAssetStatus(prodUrl)}`);
      }
    });
    
    console.log('=================================');
  }, []);

  return null;
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

      {/* Background Music - with validation */}
      <SafeAudio 
        src={musicUrl} 
        volume={musicVolume} 
        label="Background music"
      />

      {/* Voiceover - with validation */}
      <SafeAudio 
        src={voiceoverUrl} 
        volume={1} 
        label="Voiceover"
      />
    </AbsoluteFill>
  );
};

export default UniversalVideoComposition;
