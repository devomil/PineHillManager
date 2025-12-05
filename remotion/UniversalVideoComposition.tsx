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

const TextOverlayComponent: React.FC<{
  overlay: TextOverlay;
  brand: BrandSettings;
  sceneFrame: number;
  fps: number;
}> = ({ overlay, brand, sceneFrame, fps }) => {
  const startFrame = overlay.timing.startAt * fps;
  const durationFrames = overlay.timing.duration * fps;
  const endFrame = startFrame + durationFrames;
  const animDuration = overlay.animation.duration * fps;

  if (sceneFrame < startFrame || sceneFrame > endFrame) {
    return null;
  }

  const localFrame = sceneFrame - startFrame;

  let opacity = 1;
  let translateY = 0;
  let translateX = 0;
  let scale = 1;

  if (localFrame < animDuration) {
    const progress = localFrame / animDuration;
    switch (overlay.animation.enter) {
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
      case 'typewriter':
        opacity = 1;
        break;
    }
  }

  const exitStart = durationFrames - animDuration;
  if (localFrame > exitStart) {
    const exitProgress = (localFrame - exitStart) / animDuration;
    switch (overlay.animation.exit) {
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

  const getStyleByType = () => {
    const baseStyle: React.CSSProperties = {
      fontFamily: brand.fonts.body,
      color: brand.colors.textLight,
      textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
      textAlign: overlay.position.horizontal as any,
      maxWidth: '80%',
    };

    switch (overlay.style) {
      case 'title':
        return {
          ...baseStyle,
          fontSize: 72,
          fontWeight: brand.fonts.weight.heading,
          letterSpacing: '-0.02em',
        };
      case 'headline':
        return {
          ...baseStyle,
          fontSize: 56,
          fontWeight: brand.fonts.weight.heading,
        };
      case 'subtitle':
        return {
          ...baseStyle,
          fontSize: 40,
          fontWeight: 500,
        };
      case 'body':
        return {
          ...baseStyle,
          fontSize: 32,
          fontWeight: brand.fonts.weight.body,
          lineHeight: 1.4,
        };
      case 'bullet':
        return {
          ...baseStyle,
          fontSize: 36,
          fontWeight: 500,
          paddingLeft: 20,
        };
      case 'caption':
        return {
          ...baseStyle,
          fontSize: 28,
          fontWeight: 400,
          opacity: 0.9,
        };
      case 'cta':
        return {
          ...baseStyle,
          fontSize: 48,
          fontWeight: 700,
          color: brand.colors.accent,
          textShadow: '3px 3px 10px rgba(0,0,0,0.9)',
        };
      case 'quote':
        return {
          ...baseStyle,
          fontSize: 44,
          fontStyle: 'italic',
          fontWeight: 400,
        };
      default:
        return baseStyle;
    }
  };

  const getPosition = (): React.CSSProperties => {
    const pos: React.CSSProperties = {
      position: 'absolute',
      padding: overlay.position.padding,
      display: 'flex',
      justifyContent: overlay.position.horizontal === 'left' ? 'flex-start' :
                      overlay.position.horizontal === 'right' ? 'flex-end' : 'center',
      width: '100%',
      boxSizing: 'border-box',
    };

    switch (overlay.position.vertical) {
      case 'top':
        pos.top = 60;
        break;
      case 'center':
        pos.top = '50%';
        pos.transform = 'translateY(-50%)';
        break;
      case 'bottom':
        pos.bottom = 100;
        break;
      case 'lower-third':
        pos.bottom = 180;
        break;
    }

    return pos;
  };

  const displayText = overlay.animation.enter === 'typewriter' 
    ? overlay.text.substring(0, Math.floor((localFrame / animDuration) * overlay.text.length))
    : overlay.text;

  return (
    <div
      style={{
        ...getPosition(),
        opacity,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
      }}
    >
      <div style={getStyleByType()}>
        {displayText}
      </div>
    </div>
  );
};

const ProductOverlay: React.FC<{
  productUrl: string;
  position: { x: 'left' | 'center' | 'right'; y: 'top' | 'center' | 'bottom'; scale: number; animation?: string };
  fps: number;
  width: number;
  height: number;
}> = ({ productUrl, position, fps, width, height }) => {
  const frame = useCurrentFrame();
  const animDuration = fps * 0.8;

  const productSize = Math.min(width, height) * position.scale;

  let posX = 0;
  let posY = 0;

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

const SceneRenderer: React.FC<{
  scene: Scene;
  brand: BrandSettings;
  isFirst: boolean;
  isLast: boolean;
}> = ({ scene, brand, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const durationInFrames = scene.duration * fps;

  const transitionInFrames = scene.transitionIn.duration * fps;
  const transitionOutFrames = scene.transitionOut.duration * fps;

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
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
  }

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (scene.background.effect) {
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
      case 'parallax':
        translateY = interpolate(effectProgress, [0, 1], [0, -50]);
        scale = interpolate(effectProgress, [0, 1], [1.1, 1]);
        break;
    }
  }

  const imageUrl = scene.assets?.backgroundUrl || scene.assets?.imageUrl || '';
  const productOverlayUrl = scene.assets?.productOverlayUrl;
  const productPosition = scene.assets?.productOverlayPosition || { x: 'center', y: 'center', scale: 0.4, animation: 'fade' };

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill>
        {imageUrl ? (
          <Img
            src={imageUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${brand.colors.primary} 0%, ${brand.colors.secondary} 100%)`,
            }}
          />
        )}
      </AbsoluteFill>

      {scene.background.overlay && (
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

      {productOverlayUrl && (
        <ProductOverlay
          productUrl={productOverlayUrl}
          position={productPosition}
          fps={fps}
          width={width}
          height={height}
        />
      )}

      {scene.textOverlays.map((overlay) => (
        <TextOverlayComponent
          key={overlay.id}
          overlay={overlay}
          brand={brand}
          sceneFrame={frame}
          fps={fps}
        />
      ))}
    </AbsoluteFill>
  );
};

const Watermark: React.FC<{ brand: BrandSettings }> = ({ brand }) => {
  const { width } = useVideoConfig();
  const frame = useCurrentFrame();

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

  if (!brand.logoUrl) return null;

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

export const UniversalVideoComposition: React.FC<UniversalVideoProps> = ({
  scenes,
  voiceoverUrl,
  musicUrl,
  musicVolume = 0.18,
  brand,
  outputFormat,
}) => {
  const { fps, width, height } = useVideoConfig();

  let currentFrame = 0;
  const sceneSequences = scenes.map((scene, index) => {
    const durationInFrames = scene.duration * fps;
    const sequence = (
      <Sequence
        key={scene.id}
        from={currentFrame}
        durationInFrames={durationInFrames}
      >
        <SceneRenderer
          scene={scene}
          brand={brand}
          isFirst={index === 0}
          isLast={index === scenes.length - 1}
        />
      </Sequence>
    );
    currentFrame += durationInFrames;
    return sequence;
  });

  const IntroSlate: React.FC = () => {
    const frame = useCurrentFrame();
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

  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {scenes.length === 0 ? (
        <IntroSlate />
      ) : (
        sceneSequences
      )}

      <Watermark brand={brand} />

      {musicUrl && (
        <Audio src={musicUrl} volume={musicVolume} />
      )}

      {voiceoverUrl && (
        <Audio src={voiceoverUrl} volume={1} />
      )}
    </AbsoluteFill>
  );
};
