import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export interface ColorGradingProps {
  preset?: 'cinematic' | 'warm' | 'cool' | 'vintage' | 'dramatic' | 'natural';
  intensity?: number;
  contrast?: number;
  saturation?: number;
  shadows?: number;
  highlights?: number;
  fadeInFrames?: number;
}

const PRESETS = {
  cinematic: {
    sepia: 0.1,
    contrast: 1.15,
    saturate: 0.9,
    brightness: 1.02,
    hueRotate: -5,
  },
  warm: {
    sepia: 0.15,
    contrast: 1.05,
    saturate: 1.1,
    brightness: 1.05,
    hueRotate: 5,
  },
  cool: {
    sepia: 0,
    contrast: 1.1,
    saturate: 0.85,
    brightness: 1.0,
    hueRotate: -10,
  },
  vintage: {
    sepia: 0.25,
    contrast: 1.2,
    saturate: 0.7,
    brightness: 0.95,
    hueRotate: 0,
  },
  dramatic: {
    sepia: 0.05,
    contrast: 1.3,
    saturate: 0.8,
    brightness: 0.95,
    hueRotate: -3,
  },
  natural: {
    sepia: 0,
    contrast: 1.05,
    saturate: 1.0,
    brightness: 1.0,
    hueRotate: 0,
  },
};

export const ColorGrading: React.FC<ColorGradingProps> = ({
  preset = 'cinematic',
  intensity = 1.0,
  fadeInFrames = 15,
}) => {
  const frame = useCurrentFrame();
  const config = PRESETS[preset];
  
  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  const effectIntensity = intensity * fadeIn;
  
  const sepia = config.sepia * effectIntensity;
  const contrast = 1 + (config.contrast - 1) * effectIntensity;
  const saturate = 1 + (config.saturate - 1) * effectIntensity;
  const brightness = 1 + (config.brightness - 1) * effectIntensity;
  const hueRotate = config.hueRotate * effectIntensity;
  
  return (
    <AbsoluteFill
      style={{
        mixBlendMode: 'normal',
        pointerEvents: 'none',
        filter: `sepia(${sepia}) contrast(${contrast}) saturate(${saturate}) brightness(${brightness}) hue-rotate(${hueRotate}deg)`,
      }}
    />
  );
};
