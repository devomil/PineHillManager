import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export interface TextOverlayStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'semibold';
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  padding?: number;
  borderRadius?: number;
  shadow?: boolean;
}

export interface TextPlacementData {
  overlay: {
    id: string;
    text: string;
    type: 'lower_third' | 'title' | 'subtitle' | 'caption' | 'cta';
  };
  position: {
    x: number;
    y: number;
    anchor: string;
  };
  animation: {
    enter: string;
    exit: string;
    duration: number;
  };
  timing: {
    startFrame: number;
    endFrame: number;
  };
  style: TextOverlayStyle;
  placementReason: string;
}

interface TextOverlayProps {
  placement: TextPlacementData;
  fps: number;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({ placement, fps }) => {
  const frame = useCurrentFrame();
  const { timing, animation, position, style, overlay } = placement;

  if (frame < timing.startFrame || frame > timing.endFrame) {
    return null;
  }

  const animFrames = Math.round(animation.duration * fps);

  const opacity = interpolate(
    frame,
    [timing.startFrame, timing.startFrame + animFrames, timing.endFrame - animFrames, timing.endFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  let transform = '';
  if (animation.enter === 'slide-up') {
    const y = interpolate(frame, [timing.startFrame, timing.startFrame + animFrames], [30, 0], { extrapolateRight: 'clamp' });
    transform = `translateY(${y}px)`;
  } else if (animation.enter === 'pop') {
    const scale = interpolate(frame, [timing.startFrame, timing.startFrame + animFrames], [0.8, 1], { extrapolateRight: 'clamp' });
    transform = `scale(${scale})`;
  }

  const posStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: `translate(-50%, -50%) ${transform}`,
  };

  const getFontWeight = (weight: string): number | string => {
    switch (weight) {
      case 'bold': return 700;
      case 'semibold': return 600;
      default: return 400;
    }
  };

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        data-testid={`text-overlay-${overlay.id}`}
        style={{
          ...posStyle,
          opacity,
          fontSize: style.fontSize,
          fontWeight: getFontWeight(style.fontWeight),
          fontFamily: style.fontFamily,
          color: style.color,
          backgroundColor: style.backgroundColor,
          padding: style.padding,
          borderRadius: style.borderRadius,
          textShadow: style.shadow ? '2px 2px 4px rgba(0,0,0,0.5)' : undefined,
          whiteSpace: 'nowrap',
          maxWidth: '80%',
          textAlign: 'center',
        }}
      >
        {overlay.text}
      </div>
    </AbsoluteFill>
  );
};

interface MultipleTextOverlaysProps {
  placements: TextPlacementData[];
  fps: number;
}

export const MultipleTextOverlays: React.FC<MultipleTextOverlaysProps> = ({ placements, fps }) => {
  return (
    <>
      {placements.map((placement) => (
        <TextOverlay key={placement.overlay.id} placement={placement} fps={fps} />
      ))}
    </>
  );
};

export default TextOverlay;
