import { AbsoluteFill, useCurrentFrame, random } from 'remotion';
import { useMemo } from 'react';

export interface FilmGrainProps {
  intensity?: number;
  animated?: boolean;
  size?: 'fine' | 'medium' | 'coarse';
  opacity?: number;
}

const SIZE_CONFIG = {
  fine: { frequency: 0.85, octaves: 4 },
  medium: { frequency: 0.65, octaves: 3 },
  coarse: { frequency: 0.45, octaves: 2 },
};

export const FilmGrain: React.FC<FilmGrainProps> = ({
  intensity = 0.08,
  animated = true,
  size = 'fine',
  opacity,
}) => {
  const frame = useCurrentFrame();
  const config = SIZE_CONFIG[size];
  
  const seed = animated ? Math.floor(frame / 2) : 0;
  const turbulenceSeed = useMemo(() => random(`grain-${seed}`), [seed]);
  
  const effectOpacity = opacity ?? intensity;
  
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        mixBlendMode: 'overlay',
        opacity: effectOpacity,
      }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute' }}>
        <defs>
          <filter id={`grain-${seed}`} x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={config.frequency}
              numOctaves={config.octaves}
              seed={Math.floor(turbulenceSeed * 1000)}
              stitchTiles="stitch"
            />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect
          width="100%"
          height="100%"
          filter={`url(#grain-${seed})`}
        />
      </svg>
    </AbsoluteFill>
  );
};
