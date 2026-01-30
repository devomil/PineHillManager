import { AbsoluteFill } from 'remotion';

export type ColorGradePreset = 
  | 'warm-cinematic'
  | 'cool-corporate'
  | 'vibrant-lifestyle'
  | 'moody-dramatic'
  | 'natural-organic'
  | 'luxury-elegant'
  | 'none';

interface ColorGradingProps {
  preset: ColorGradePreset;
  intensity: number;
  children: React.ReactNode;
}

const COLOR_GRADE_FILTERS: Record<ColorGradePreset, string> = {
  'warm-cinematic': `
    contrast(1.1)
    saturate(1.15)
    sepia(0.15)
    brightness(1.02)
    hue-rotate(-5deg)
  `.replace(/\s+/g, ' ').trim(),
  
  'cool-corporate': `
    contrast(1.05)
    saturate(0.95)
    brightness(1.05)
    hue-rotate(10deg)
  `.replace(/\s+/g, ' ').trim(),
  
  'vibrant-lifestyle': `
    contrast(1.15)
    saturate(1.35)
    brightness(1.05)
  `.replace(/\s+/g, ' ').trim(),
  
  'moody-dramatic': `
    contrast(1.25)
    saturate(0.85)
    brightness(0.95)
  `.replace(/\s+/g, ' ').trim(),
  
  'natural-organic': `
    contrast(1.05)
    saturate(1.05)
    sepia(0.05)
    brightness(1.02)
  `.replace(/\s+/g, ' ').trim(),
  
  'luxury-elegant': `
    contrast(1.12)
    saturate(0.9)
    brightness(0.98)
    sepia(0.08)
  `.replace(/\s+/g, ' ').trim(),
  
  'none': '',
};

export const ColorGrading: React.FC<ColorGradingProps> = ({
  preset,
  intensity,
  children,
}) => {
  if (preset === 'none' || intensity === 0) {
    return <>{children}</>;
  }

  const filter = COLOR_GRADE_FILTERS[preset];

  return (
    <AbsoluteFill
      style={{
        filter: filter,
        opacity: intensity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
