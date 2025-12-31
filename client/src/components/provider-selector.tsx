import { Sparkles, Folder, Archive } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export const VIDEO_PROVIDERS = [
  {
    id: 'kling',
    name: 'Kling 1.6',
    description: 'Human faces, lifestyle scenes',
    bestFor: ['person', 'lifestyle', 'testimonial'],
    icon: '🎭',
    color: 'purple',
  },
  {
    id: 'runway',
    name: 'Runway Gen-3',
    description: 'Cinematic, dramatic shots',
    bestFor: ['cinematic', 'dramatic', 'hook'],
    icon: '🎬',
    color: 'blue',
  },
  {
    id: 'luma',
    name: 'Luma Dream Machine',
    description: 'Product reveals, smooth motion',
    bestFor: ['product', 'reveal', 'showcase'],
    icon: '✨',
    color: 'pink',
  },
  {
    id: 'hailuo',
    name: 'Hailuo MiniMax',
    description: 'B-roll, nature, backgrounds',
    bestFor: ['broll', 'nature', 'ambient', 'background'],
    icon: '🌿',
    color: 'teal',
  },
];

export const IMAGE_PROVIDERS = [
  {
    id: 'flux',
    name: 'Flux.1',
    description: 'Product shots, food, objects',
    bestFor: ['product', 'food', 'object', 'still'],
    icon: '📸',
    color: 'orange',
  },
  {
    id: 'falai',
    name: 'fal.ai',
    description: 'Lifestyle, people, natural scenes',
    bestFor: ['lifestyle', 'person', 'nature', 'scene'],
    icon: '🎨',
    color: 'indigo',
  },
];

const OTHER_SOURCES = [
  {
    id: 'brand_media',
    name: 'Brand Media',
    description: 'Your uploaded brand assets',
    icon: <Folder className="h-4 w-4" />,
  },
  {
    id: 'asset_library',
    name: 'Asset Library',
    description: 'Previously generated assets',
    icon: <Archive className="h-4 w-4" />,
  },
];

interface ProviderSelectorProps {
  type: 'image' | 'video';
  selectedProvider: string;
  onSelectProvider: (provider: string) => void;
  recommendedProvider?: string;
  sceneContentType?: string;
  disabled?: boolean;
}

function determineRecommended(providers: typeof VIDEO_PROVIDERS, contentType?: string): string {
  if (!contentType) return providers[0].id;
  
  for (const provider of providers) {
    if (provider.bestFor.some(type => contentType.toLowerCase().includes(type))) {
      return provider.id;
    }
  }
  
  return providers[0].id;
}

export const ProviderSelector: React.FC<ProviderSelectorProps> = ({
  type,
  selectedProvider,
  onSelectProvider,
  recommendedProvider,
  sceneContentType,
  disabled = false,
}) => {
  const providers = type === 'video' ? VIDEO_PROVIDERS : IMAGE_PROVIDERS;
  
  const recommended = recommendedProvider || determineRecommended(providers, sceneContentType);
  
  const colorClasses: Record<string, string> = {
    purple: 'border-purple-300 bg-purple-50 dark:border-purple-600 dark:bg-purple-900/30',
    blue: 'border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30',
    pink: 'border-pink-300 bg-pink-50 dark:border-pink-600 dark:bg-pink-900/30',
    teal: 'border-teal-300 bg-teal-50 dark:border-teal-600 dark:bg-teal-900/30',
    orange: 'border-orange-300 bg-orange-50 dark:border-orange-600 dark:bg-orange-900/30',
    indigo: 'border-indigo-300 bg-indigo-50 dark:border-indigo-600 dark:bg-indigo-900/30',
  };
  
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {type === 'video' ? 'VIDEO PROVIDERS' : 'IMAGE PROVIDERS'}
      </div>
      
      <RadioGroup 
        value={selectedProvider} 
        onValueChange={onSelectProvider}
        disabled={disabled}
      >
        {providers.map((provider) => {
          const isRecommended = provider.id === recommended;
          const isSelected = provider.id === selectedProvider;
          
          return (
            <div
              key={provider.id}
              className={`
                flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer
                transition-all duration-150
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isSelected ? colorClasses[provider.color] : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}
              `}
              onClick={() => !disabled && onSelectProvider(provider.id)}
              data-testid={`provider-${provider.id}`}
            >
              <RadioGroupItem 
                value={provider.id} 
                id={`provider-${provider.id}`} 
                className="mt-1" 
              />
              
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg">{provider.icon}</span>
                  <Label 
                    htmlFor={`provider-${provider.id}`} 
                    className="font-medium cursor-pointer"
                  >
                    {provider.name}
                  </Label>
                  {isRecommended && (
                    <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Best for this scene
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {provider.description}
                </p>
              </div>
            </div>
          );
        })}
        
        <div className="border-t my-2 dark:border-gray-700" />
        
        {OTHER_SOURCES.map((source) => (
          <div
            key={source.id}
            className={`
              flex items-start gap-3 p-3 rounded-lg border cursor-pointer
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              ${selectedProvider === source.id 
                ? 'border-gray-400 bg-gray-50 dark:border-gray-500 dark:bg-gray-800' 
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'}
            `}
            onClick={() => !disabled && onSelectProvider(source.id)}
            data-testid={`provider-${source.id}`}
          >
            <RadioGroupItem 
              value={source.id} 
              id={`provider-${source.id}`} 
              className="mt-1" 
            />
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                {source.icon}
                <Label 
                  htmlFor={`provider-${source.id}`} 
                  className="font-medium cursor-pointer"
                >
                  {source.name}
                </Label>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {source.description}
              </p>
            </div>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};

export function getRecommendedProvider(
  type: 'image' | 'video', 
  sceneType?: string,
  contentType?: string
): string {
  const content = `${sceneType || ''} ${contentType || ''}`.toLowerCase();
  
  if (type === 'video') {
    if (content.includes('person') || content.includes('testimonial') || content.includes('lifestyle')) {
      return 'kling';
    }
    if (content.includes('product') || content.includes('reveal')) {
      return 'luma';
    }
    if (content.includes('broll') || content.includes('nature')) {
      return 'hailuo';
    }
    if (content.includes('cinematic') || content.includes('dramatic') || content.includes('hook')) {
      return 'runway';
    }
    return 'kling';
  } else {
    if (content.includes('product') || content.includes('food') || content.includes('object')) {
      return 'flux';
    }
    return 'falai';
  }
}

export function getProviderName(providerId: string): string {
  const allProviders = [...VIDEO_PROVIDERS, ...IMAGE_PROVIDERS, ...OTHER_SOURCES];
  const provider = allProviders.find(p => p.id === providerId);
  return provider?.name || providerId;
}
