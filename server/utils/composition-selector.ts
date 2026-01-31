import { FILM_TREATMENT_PRESETS, FilmTreatmentConfig } from '../../shared/config/film-treatment';

export type RenderPreset = 'preview' | 'broadcast-1080p' | 'social-vertical' | 'premium-4k';

export interface CompositionConfig {
  compositionId: string;
  width: number;
  height: number;
  fps: number;
  crf: number;
  filmTreatment: FilmTreatmentConfig;
}

const styleToPresetMap: Record<string, keyof typeof FILM_TREATMENT_PRESETS> = {
  'Hero (Cinematic)': 'hero-cinematic',
  'hero': 'hero-cinematic',
  'cinematic': 'hero-cinematic',
  'Lifestyle': 'lifestyle',
  'lifestyle': 'lifestyle',
  'Product Showcase': 'product-showcase',
  'product': 'product-showcase',
  'Educational': 'educational',
  'educational': 'educational',
  'Social (Energetic)': 'social-energetic',
  'social': 'social-energetic',
  'energetic': 'social-energetic',
  'Premium': 'premium',
  'premium': 'premium',
  'luxury': 'premium',
};

export function getCompositionConfig(
  preset: RenderPreset,
  visualStyle?: string
): CompositionConfig {
  const filmTreatmentPreset = visualStyle 
    ? (styleToPresetMap[visualStyle] || 'hero-cinematic')
    : 'hero-cinematic';
  
  const filmTreatment = FILM_TREATMENT_PRESETS[filmTreatmentPreset] || FILM_TREATMENT_PRESETS['hero-cinematic'];

  switch (preset) {
    case 'preview':
      return {
        compositionId: 'PreviewComposition',
        width: 854,
        height: 480,
        fps: 24,
        crf: 28,
        filmTreatment: {
          ...filmTreatment,
          grainIntensity: filmTreatment.grainIntensity * 0.5,
        },
      };

    case 'social-vertical':
      return {
        compositionId: 'SocialVerticalComposition',
        width: 1080,
        height: 1920,
        fps: 30,
        crf: 20,
        filmTreatment: FILM_TREATMENT_PRESETS['social-energetic'],
      };

    case 'premium-4k':
      return {
        compositionId: 'BroadcastVideoComposition',
        width: 3840,
        height: 2160,
        fps: 30,
        crf: 16,
        filmTreatment,
      };

    case 'broadcast-1080p':
    default:
      return {
        compositionId: 'BroadcastVideoComposition',
        width: 1920,
        height: 1080,
        fps: 30,
        crf: 18,
        filmTreatment,
      };
  }
}

export function getCompositionIdForPreset(preset: RenderPreset): string {
  switch (preset) {
    case 'preview':
      return 'PreviewComposition';
    case 'social-vertical':
      return 'SocialVerticalComposition';
    case 'broadcast-1080p':
    case 'premium-4k':
    default:
      return 'BroadcastVideoComposition';
  }
}
