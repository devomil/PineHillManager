import { AlertTriangle, Video, Check } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { type QualityTier } from '@shared/quality-tiers';

interface QualityWarningProps {
  tier: QualityTier;
  imageMotionScenes: number;
  totalScenes: number;
  className?: string;
}

export function QualityWarning({ tier, imageMotionScenes, totalScenes, className }: QualityWarningProps) {
  if (tier === 'standard') {
    if (imageMotionScenes > 0) {
      return (
        <Alert className={cn('bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-700', className)}>
          <AlertTriangle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <AlertDescription className="text-gray-700 dark:text-gray-300">
            <strong>Standard tier:</strong>{' '}
            {imageMotionScenes} of {totalScenes} scenes will use image + motion effects.
            Upgrade to Premium for real AI video in every scene.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }
  
  const tierLabel = tier === 'ultra' ? 'Ultra Premium' : 'Premium';
  const tierColor = tier === 'ultra' 
    ? 'bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800' 
    : 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800';
  const textColor = tier === 'ultra'
    ? 'text-purple-700 dark:text-purple-300'
    : 'text-amber-700 dark:text-amber-300';
  const iconColor = tier === 'ultra'
    ? 'text-purple-600 dark:text-purple-400'
    : 'text-amber-600 dark:text-amber-400';
  
  return (
    <Alert className={cn(tierColor, className)}>
      <Video className={cn('h-4 w-4', iconColor)} />
      <AlertDescription className={textColor}>
        <div className="flex items-center gap-2">
          <Check className={cn('h-4 w-4', iconColor)} />
          <span>
            <strong>{tierLabel} tier:</strong>{' '}
            All {totalScenes} scenes will use real AI video generation.
            No slideshow effects - broadcast-quality motion guaranteed.
          </span>
        </div>
      </AlertDescription>
    </Alert>
  );
}

export function QualityTierInfo({ qualityTier }: { qualityTier: QualityTier }) {
  if (qualityTier === 'standard') {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Standard tier may use image + motion effects for simple scenes
      </div>
    );
  }
  
  const tierLabel = qualityTier === 'ultra' ? 'Ultra Premium' : 'Premium';
  const color = qualityTier === 'ultra' ? 'text-purple-600 dark:text-purple-400' : 'text-amber-600 dark:text-amber-400';
  
  return (
    <div className={cn('text-xs font-medium flex items-center gap-1', color)}>
      <Video className="h-3 w-3" />
      {tierLabel}: All scenes use real AI video
    </div>
  );
}

export default QualityWarning;
