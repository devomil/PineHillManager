export interface ImageProvider {
  id: string;
  name: string;
  version: string;
  apiProvider: 'piapi' | 'legnext' | 'falai' | 'replicate' | 'direct';
  
  capabilities: {
    textToImage: boolean;
    imageToImage: boolean;
    inpainting: boolean;
    outpainting: boolean;
    upscaling: boolean;
    
    maxResolution: { width: number; height: number };
    supportedAspectRatios: string[];
    
    strengths: ImageStrength[];
    weaknesses: ImageWeakness[];
  };
  
  costPerImage: number;
  
  qualityTier: 'premium' | 'standard' | 'budget';
  aestheticScore: number;
  photorealismScore: number;
  
  modelId: string;
  defaultParams?: Record<string, any>;
}

export type ImageStrength = 
  | 'aesthetics'
  | 'photorealism'
  | 'composition'
  | 'text-rendering'
  | 'products'
  | 'people'
  | 'landscapes'
  | 'artistic'
  | 'anime'
  | 'speed'
  | 'specific-details'
  | 'consistency';

export type ImageWeakness =
  | 'text-rendering'
  | 'hands'
  | 'specific-details'
  | 'consistency'
  | 'speed'
  | 'products';

export const IMAGE_PROVIDERS: Record<string, ImageProvider> = {
  
  'midjourney-v7': {
    id: 'midjourney-v7',
    name: 'Midjourney v7',
    version: '7.0',
    apiProvider: 'legnext',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: false,
      outpainting: false,
      upscaling: true,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
      
      strengths: ['aesthetics', 'composition', 'artistic', 'people', 'landscapes'],
      weaknesses: ['text-rendering', 'specific-details'],
    },
    
    costPerImage: 0.004,
    qualityTier: 'premium',
    aestheticScore: 10,
    photorealismScore: 8,
    
    modelId: 'midjourney-v7',
    defaultParams: {
      mode: 'fast',
      stylize: 100,
      chaos: 0,
      quality: 1,
    },
  },
  
  'midjourney-v6': {
    id: 'midjourney-v6',
    name: 'Midjourney v6',
    version: '6.0',
    apiProvider: 'legnext',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: false,
      outpainting: false,
      upscaling: true,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
      
      strengths: ['aesthetics', 'composition', 'artistic', 'people'],
      weaknesses: ['text-rendering', 'specific-details'],
    },
    
    costPerImage: 0.004,
    qualityTier: 'premium',
    aestheticScore: 9,
    photorealismScore: 8,
    
    modelId: 'midjourney-v6',
    defaultParams: {
      mode: 'fast',
      stylize: 100,
      chaos: 0,
      quality: 1,
    },
  },
  
  'midjourney-niji6': {
    id: 'midjourney-niji6',
    name: 'Midjourney Niji 6',
    version: '6.0',
    apiProvider: 'legnext',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: false,
      outpainting: false,
      upscaling: true,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16', '3:2', '2:3'],
      
      strengths: ['anime', 'artistic', 'aesthetics', 'composition'],
      weaknesses: ['specific-details'],
    },
    
    costPerImage: 0.004,
    qualityTier: 'premium',
    aestheticScore: 9,
    photorealismScore: 3,
    
    modelId: 'niji-6',
    defaultParams: {
      mode: 'fast',
      stylize: 100,
    },
  },
  
  'flux-1.1-pro': {
    id: 'flux-1.1-pro',
    name: 'Flux 1.1 Pro',
    version: '1.1',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: true,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['photorealism', 'products', 'text-rendering', 'specific-details'],
      weaknesses: [],
    },
    
    costPerImage: 0.05,
    qualityTier: 'premium',
    aestheticScore: 7,
    photorealismScore: 10,
    
    modelId: 'flux-1.1-pro',
  },
  
  'flux-kontext': {
    id: 'flux-kontext',
    name: 'Flux Kontext',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: true,
      outpainting: true,
      upscaling: false,
      
      maxResolution: { width: 2048, height: 2048 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['specific-details', 'consistency', 'products'],
      weaknesses: ['speed'],
    },
    
    costPerImage: 0.06,
    qualityTier: 'premium',
    aestheticScore: 7,
    photorealismScore: 9,
    
    modelId: 'flux-kontext',
  },
  
  'flux-schnell': {
    id: 'flux-schnell',
    name: 'Flux Schnell',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1024, height: 1024 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['speed', 'photorealism'],
      weaknesses: ['text-rendering'],
    },
    
    costPerImage: 0.02,
    qualityTier: 'standard',
    aestheticScore: 6,
    photorealismScore: 7,
    
    modelId: 'flux-schnell',
  },
  
  'gpt-image-1.5': {
    id: 'gpt-image-1.5',
    name: 'GPT Image 1.5',
    version: '1.5',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: true,
      outpainting: true,
      upscaling: false,
      
      maxResolution: { width: 1792, height: 1792 },
      supportedAspectRatios: ['1:1', '16:9', '9:16'],
      
      strengths: ['text-rendering', 'specific-details', 'consistency'],
      weaknesses: [],
    },
    
    costPerImage: 0.04,
    qualityTier: 'premium',
    aestheticScore: 7,
    photorealismScore: 8,
    
    modelId: 'gpt-image-1.5',
  },
  
  'gpt-image-1': {
    id: 'gpt-image-1',
    name: 'GPT Image 1',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: true,
      inpainting: true,
      outpainting: true,
      upscaling: false,
      
      maxResolution: { width: 1792, height: 1792 },
      supportedAspectRatios: ['1:1', '16:9', '9:16'],
      
      strengths: ['text-rendering', 'specific-details'],
      weaknesses: [],
    },
    
    costPerImage: 0.04,
    qualityTier: 'premium',
    aestheticScore: 6,
    photorealismScore: 7,
    
    modelId: 'gpt-image-1',
  },
  
  'qwen-image': {
    id: 'qwen-image',
    name: 'Qwen Image',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1024, height: 1024 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['speed', 'people'],
      weaknesses: ['specific-details', 'text-rendering'],
    },
    
    costPerImage: 0.02,
    qualityTier: 'standard',
    aestheticScore: 6,
    photorealismScore: 6,
    
    modelId: 'qwen-image',
  },
  
  'seedream-4': {
    id: 'seedream-4',
    name: 'Seedream 4.0',
    version: '4.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1024, height: 1024 },
      supportedAspectRatios: ['1:1', '4:3', '3:4', '16:9', '9:16'],
      
      strengths: ['artistic', 'aesthetics'],
      weaknesses: ['specific-details'],
    },
    
    costPerImage: 0.02,
    qualityTier: 'standard',
    aestheticScore: 7,
    photorealismScore: 5,
    
    modelId: 'seedream-4',
  },
  
  'flux': {
    id: 'flux',
    name: 'Flux.1',
    version: '1.0',
    apiProvider: 'piapi',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1280, height: 720 },
      supportedAspectRatios: ['16:9', '1:1', '4:3'],
      
      strengths: ['products', 'photorealism', 'speed'],
      weaknesses: [],
    },
    
    costPerImage: 0.03,
    qualityTier: 'standard',
    aestheticScore: 6,
    photorealismScore: 7,
    
    modelId: 'Qubico/flux1-schnell',
  },
  
  'falai': {
    id: 'falai',
    name: 'fal.ai',
    version: '1.0',
    apiProvider: 'falai',
    
    capabilities: {
      textToImage: true,
      imageToImage: false,
      inpainting: false,
      outpainting: false,
      upscaling: false,
      
      maxResolution: { width: 1280, height: 720 },
      supportedAspectRatios: ['16:9', '1:1', '4:3'],
      
      strengths: ['people', 'landscapes', 'artistic'],
      weaknesses: ['products'],
    },
    
    costPerImage: 0.02,
    qualityTier: 'standard',
    aestheticScore: 6,
    photorealismScore: 6,
    
    modelId: 'fal-ai/flux/schnell',
  },
};

export type ImageStyle = 
  | 'lifestyle' 
  | 'hero-shot' 
  | 'artistic' 
  | 'product-photo' 
  | 'product-detail' 
  | 'text-heavy'
  | 'nature'
  | 'person'
  | 'default';

export interface ImageProviderRouting {
  [style: string]: string;
}

export const ULTRA_IMAGE_ROUTING: ImageProviderRouting = {
  'lifestyle': 'midjourney-v7',
  'hero-shot': 'midjourney-v7',
  'artistic': 'midjourney-v7',
  'product-photo': 'flux-1.1-pro',
  'product-detail': 'flux-kontext',
  'text-heavy': 'gpt-image-1.5',
  'nature': 'midjourney-v7',
  'person': 'midjourney-v7',
  'default': 'midjourney-v7',
};

export const PREMIUM_IMAGE_ROUTING: ImageProviderRouting = {
  'lifestyle': 'midjourney-v6',
  'hero-shot': 'midjourney-v6',
  'artistic': 'midjourney-v6',
  'product-photo': 'flux-1.1-pro',
  'product-detail': 'flux-1.1-pro',
  'text-heavy': 'gpt-image-1.5',
  'nature': 'midjourney-v6',
  'person': 'midjourney-v6',
  'default': 'flux-1.1-pro',
};

export const STANDARD_IMAGE_ROUTING: ImageProviderRouting = {
  'lifestyle': 'falai',
  'hero-shot': 'flux-schnell',
  'artistic': 'falai',
  'product-photo': 'flux',
  'product-detail': 'flux',
  'text-heavy': 'gpt-image-1',
  'nature': 'falai',
  'person': 'falai',
  'default': 'flux-schnell',
};

export function getImageProviderForStyle(
  style: ImageStyle,
  qualityTier: 'ultra' | 'premium' | 'standard'
): ImageProvider {
  let routing: ImageProviderRouting;
  
  switch (qualityTier) {
    case 'ultra':
      routing = ULTRA_IMAGE_ROUTING;
      break;
    case 'premium':
      routing = PREMIUM_IMAGE_ROUTING;
      break;
    default:
      routing = STANDARD_IMAGE_ROUTING;
  }
  
  const providerId = routing[style] || routing['default'];
  return IMAGE_PROVIDERS[providerId] || IMAGE_PROVIDERS['flux-schnell'];
}

export function isLegNextProvider(providerId: string): boolean {
  const provider = IMAGE_PROVIDERS[providerId];
  return provider?.apiProvider === 'legnext';
}

export function getLegNextProviders(): ImageProvider[] {
  return Object.values(IMAGE_PROVIDERS).filter(p => p.apiProvider === 'legnext');
}
