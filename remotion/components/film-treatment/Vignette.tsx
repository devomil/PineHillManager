import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

export interface VignetteProps {
  intensity?: number;
  spread?: number;
  color?: string;
  shape?: 'circular' | 'elliptical';
  fadeInFrames?: number;
}

export const Vignette: React.FC<VignetteProps> = ({
  intensity = 0.5,
  spread = 0.3,
  color = 'rgba(0, 0, 0, 1)',
  shape = 'elliptical',
  fadeInFrames = 15,
}) => {
  const frame = useCurrentFrame();
  
  const fadeIn = interpolate(frame, [0, fadeInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  
  const effectiveIntensity = intensity * fadeIn;
  
  const innerRadius = 1 - spread;
  const aspectRatio = shape === 'elliptical' ? '100% 70%' : '100% 100%';
  
  const gradient = `radial-gradient(
    ${aspectRatio} at 50% 50%,
    transparent ${Math.round(innerRadius * 100)}%,
    ${color.replace('1)', `${effectiveIntensity})`)} 100%
  )`;
  
  return (
    <AbsoluteFill
      style={{
        background: gradient,
        pointerEvents: 'none',
      }}
    />
  );
};
