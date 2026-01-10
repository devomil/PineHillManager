import { Crown, Zap, Check, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { type QualityTier } from '@shared/quality-tiers';

export { QualityTier };

interface TierSummary {
  total: number;
  video: number;
  images: number;
  voiceover: number;
  music: number;
  soundFx: number;
  sceneAnalysis: number;
  qualityAssurance: number;
  topVideoProviders: string[];
  imageProviders: string[];
}

interface QualityTierSelectorProps {
  value: QualityTier;
  onChange: (value: QualityTier) => void;
  sceneDuration: number;
  sceneCount: number;
  compact?: boolean;
  tierSummaries?: {
    ultra: TierSummary;
    premium: TierSummary;
    standard: TierSummary;
  };
}

const TIERS = [
  {
    id: 'ultra' as const,
    label: 'Ultra Premium',
    shortLabel: 'Ultra',
    icon: Sparkles,
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950',
    textColor: 'text-purple-700 dark:text-purple-300',
    iconColor: 'text-purple-500',
    checkBg: 'bg-purple-500',
    badge: 'Best Quality',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
    features: [
      'Multi-pass generation (3x, picks best)',
      '4K AI upscaling',
      'Cinematic color grading',
      '60fps frame interpolation',
      'AI audio enhancement',
    ],
    providers: 'Veo 3.1, Kling 2.6, Midjourney',
    costMultiplier: 3.5,
  },
  {
    id: 'premium' as const,
    label: 'Premium',
    shortLabel: 'Premium',
    icon: Crown,
    borderColor: 'border-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950',
    textColor: 'text-amber-700 dark:text-amber-300',
    iconColor: 'text-amber-500',
    checkBg: 'bg-amber-500',
    badge: 'Recommended',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
    features: [
      'Top-tier AI providers',
      'Native audio generation',
      '1080p/4K output',
      'Cinematic motion quality',
    ],
    providers: 'Kling 2.6, Runway, Flux Pro',
    costMultiplier: 2.0,
  },
  {
    id: 'standard' as const,
    label: 'Standard',
    shortLabel: 'Standard',
    icon: Zap,
    borderColor: 'border-gray-300 dark:border-gray-600',
    bgColor: 'bg-gray-50 dark:bg-gray-900',
    textColor: 'text-gray-700 dark:text-gray-300',
    iconColor: 'text-gray-500',
    checkBg: 'bg-gray-500',
    badge: null,
    badgeClass: '',
    features: [
      'Good quality providers',
      '720p/1080p output',
      'Faster generation',
    ],
    providers: 'Kling AI, Wan 2.1, fal.ai',
    costMultiplier: 1.0,
  },
];

export function QualityTierSelector({
  value,
  onChange,
  sceneDuration,
  sceneCount,
  compact = false,
  tierSummaries,
}: QualityTierSelectorProps) {
  // Use backend tier summaries if available, otherwise calculate fallback
  const getTierCost = (tier: QualityTier): number => {
    if (tierSummaries && tierSummaries[tier]) {
      return tierSummaries[tier].total;
    }
    // Fallback to rough estimate if no backend data
    const baseCost = sceneDuration * 0.03 + sceneCount * 0.05;
    const multipliers: Record<QualityTier, number> = { ultra: 3.5, premium: 2.0, standard: 1.0 };
    return baseCost * multipliers[tier];
  };
  
  const getTierProviders = (tier: QualityTier): string => {
    if (tierSummaries && tierSummaries[tier] && tierSummaries[tier].topVideoProviders.length > 0) {
      return tierSummaries[tier].topVideoProviders.join(', ');
    }
    // Fallback static providers
    const tierConfig = TIERS.find(t => t.id === tier);
    return tierConfig?.providers || '';
  };
  
  const selectedTier = TIERS.find(t => t.id === value);
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Quality Tier</h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">Select before generating</span>
      </div>
      
      <div className={cn("grid gap-2", compact ? "grid-cols-1" : "grid-cols-3")}>
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isSelected = value === tier.id;
          const estimatedCost = getTierCost(tier.id);
          const displayProviders = getTierProviders(tier.id);
          
          return (
            <button
              key={tier.id}
              type="button"
              onClick={() => onChange(tier.id)}
              className={cn(
                'relative p-3 rounded-lg border-2 text-left transition-all',
                isSelected
                  ? `${tier.borderColor} ${tier.bgColor}`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              )}
            >
              {isSelected && (
                <div className={cn(
                  'absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center',
                  tier.checkBg
                )}>
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
              
              {tier.badge && (
                <Badge 
                  className={cn(
                    'absolute -top-2 left-2 text-[10px] px-1.5 py-0',
                    tier.badgeClass
                  )}
                >
                  {tier.badge}
                </Badge>
              )}
              
              <div className="flex items-center gap-2 mb-1 mt-1">
                <Icon className={cn('w-4 h-4', isSelected ? tier.iconColor : 'text-gray-400')} />
                <span className={cn(
                  'font-medium text-sm',
                  isSelected ? tier.textColor : 'text-gray-700 dark:text-gray-300'
                )}>
                  {tier.shortLabel}
                </span>
              </div>
              
              <div className={cn(
                'text-lg font-bold',
                isSelected ? tier.textColor : 'text-gray-900 dark:text-gray-100'
              )}>
                ${estimatedCost.toFixed(2)}
              </div>
              
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                {displayProviders}
              </div>
            </button>
          );
        })}
      </div>
      
      {selectedTier && !compact && (
        <div className={cn(
          'p-3 rounded-lg text-sm',
          value === 'ultra' ? 'bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800' :
          value === 'premium' ? 'bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800' :
          'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700'
        )}>
          <div className="font-medium mb-2">
            {selectedTier.label} includes:
          </div>
          <ul className="space-y-1">
            {selectedTier.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-2 text-xs">
                <Check className={cn(
                  'w-3 h-3',
                  value === 'ultra' ? 'text-purple-500' :
                  value === 'premium' ? 'text-amber-500' :
                  'text-gray-500'
                )} />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default QualityTierSelector;
