import { Video, Image, Film, ImagePlay } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MediaType = 't2v' | 'i2v' | 'image-motion' | 'stock';

interface MediaTypeIndicatorProps {
  mediaType: MediaType;
  provider?: string;
  className?: string;
  showDescription?: boolean;
}

const CONFIGS: Record<MediaType, {
  label: string;
  icon: typeof Video;
  color: string;
  description: string;
}> = {
  't2v': {
    label: 'AI Video',
    icon: Video,
    color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950',
    description: 'Real AI-generated motion',
  },
  'i2v': {
    label: 'Brand Video',
    icon: ImagePlay,
    color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950',
    description: 'Animated brand photo',
  },
  'image-motion': {
    label: 'Image + Motion',
    icon: Image,
    color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950',
    description: 'Ken Burns effect',
  },
  'stock': {
    label: 'Stock',
    icon: Film,
    color: 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900',
    description: 'Stock footage',
  },
};

export function MediaTypeIndicator({ 
  mediaType, 
  provider, 
  className,
  showDescription = false 
}: MediaTypeIndicatorProps) {
  const config = CONFIGS[mediaType] || CONFIGS['t2v'];
  const Icon = config.icon;
  
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded text-xs', config.color, className)}>
      <Icon className="w-3 h-3" />
      <span className="font-medium">{config.label}</span>
      {showDescription && (
        <span className="text-gray-500 dark:text-gray-400 ml-1">({config.description})</span>
      )}
      {provider && (
        <span className="text-gray-400 dark:text-gray-500 ml-1 text-[10px]">via {provider}</span>
      )}
    </div>
  );
}

export function getMediaTypeLabel(mediaType: MediaType): string {
  return CONFIGS[mediaType]?.label || mediaType;
}

export function getMediaTypeDescription(mediaType: MediaType): string {
  return CONFIGS[mediaType]?.description || '';
}

export default MediaTypeIndicator;
