import React from 'react';
import { Img, interpolate, useCurrentFrame, spring, useVideoConfig } from 'remotion';

export interface LogoShadowProps {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export interface LogoOverlayProps {
  logoUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  customPosition?: { x: number; y: number };
  size: number;
  opacity: number;
  animation: {
    type: 'none' | 'fade' | 'fade-in' | 'zoom' | 'scale-up' | 'slide' | 'slide-in' | 'pulse';
    duration: number;
    delay: number;
  };
  timing: {
    startFrame: number;
    endFrame: number;
  };
  tagline?: string;
  taglineStyle?: {
    fontSize: number;
    color: string;
  };
  shadow?: LogoShadowProps;
}

export const LogoOverlay: React.FC<LogoOverlayProps> = ({
  logoUrl,
  position,
  customPosition,
  size,
  opacity: maxOpacity,
  animation,
  timing,
  tagline,
  taglineStyle,
  shadow,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  
  if (frame < timing.startFrame || frame > timing.endFrame) {
    return null;
  }
  
  const localFrame = frame - timing.startFrame;
  const duration = timing.endFrame - timing.startFrame;
  
  let opacity = maxOpacity;
  const animType = animation.type;
  if (animType !== 'none') {
    opacity = interpolate(
      localFrame,
      [animation.delay, animation.delay + animation.duration, duration - fps * 0.5, duration],
      [0, maxOpacity, maxOpacity, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  let transform = '';
  if (animType === 'zoom' || animType === 'scale-up') {
    const scale = spring({
      frame: localFrame - animation.delay,
      fps,
      config: { damping: 15, stiffness: 180 },
    });
    transform = `scale(${Math.min(scale, 1)})`;
  } else if (animType === 'slide' || animType === 'slide-in') {
    const translateY = interpolate(
      localFrame,
      [animation.delay, animation.delay + animation.duration],
      [-50, 0],
      { extrapolateRight: 'clamp' }
    );
    transform = `translateY(${translateY}px)`;
  } else if (animType === 'pulse') {
    const pulseScale = 1 + Math.sin((localFrame / fps) * Math.PI * 2) * 0.05;
    transform = `scale(${pulseScale})`;
  }
  
  const shadowStyle = shadow?.enabled
    ? `drop-shadow(${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color})`
    : undefined;
  
  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'bottom-right': { bottom: 20, right: 20 },
    'center': { top: '50%', left: '50%', transform: `translate(-50%, -50%) ${transform}` },
    'custom': customPosition 
      ? { top: `${customPosition.y}%`, left: `${customPosition.x}%`, transform: `translate(-50%, -50%) ${transform}` }
      : {},
  };
  
  const logoWidth = (size / 100) * width;
  
  return (
    <div
      data-testid="logo-overlay"
      style={{
        position: 'absolute',
        ...positionStyles[position],
        opacity,
        transform: position !== 'center' && position !== 'custom' ? transform : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Img
        src={logoUrl}
        style={{
          width: logoWidth,
          height: 'auto',
          objectFit: 'contain',
          filter: shadowStyle,
        }}
      />
      {tagline && (
        <div
          style={{
            marginTop: 8,
            fontSize: taglineStyle?.fontSize || 16,
            color: taglineStyle?.color || '#FFFFFF',
            fontFamily: 'Inter, sans-serif',
            textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
          }}
        >
          {tagline}
        </div>
      )}
    </div>
  );
};

export default LogoOverlay;
