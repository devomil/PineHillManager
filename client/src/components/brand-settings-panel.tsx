import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Image, Check, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface BrandLogo {
  id: number;
  name: string;
  url: string;
  thumbnailUrl: string;
}

interface BrandPreview {
  brandName: string;
  tagline?: string;
  website?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    text: string;
    background: string;
  };
  logos: {
    main: BrandLogo | null;
    watermark: BrandLogo | null;
    intro: BrandLogo | null;
    outro: BrandLogo | null;
  };
  callToAction: {
    text: string;
    subtext?: string;
    url: string;
  };
  hasMinimumAssets: boolean;
}

export interface BrandSettings {
  includeIntroLogo: boolean;
  includeWatermark: boolean;
  includeCTAOutro: boolean;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkOpacity: number;
}

interface BrandSettingsPanelProps {
  settings: BrandSettings;
  onSettingsChange: (settings: BrandSettings) => void;
  defaultExpanded?: boolean;
}

const defaultSettings: BrandSettings = {
  includeIntroLogo: true,
  includeWatermark: true,
  includeCTAOutro: true,
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 0.7,
};

export const BrandSettingsPanel: React.FC<BrandSettingsPanelProps> = ({
  settings = defaultSettings,
  onSettingsChange,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { data: brandPreview, isLoading, error } = useQuery<BrandPreview>({
    queryKey: ['brand-preview'],
    queryFn: async () => {
      const response = await fetch('/api/brand-bible/preview');
      if (!response.ok) throw new Error('Failed to load brand preview');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleToggle = (key: keyof BrandSettings) => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key],
    });
  };

  const handlePositionChange = (position: BrandSettings['watermarkPosition']) => {
    onSettingsChange({
      ...settings,
      watermarkPosition: position,
    });
  };

  if (isLoading) {
    return (
      <Card className="mb-4" data-testid="card-brand-settings-loading">
        <CardHeader className="py-3 cursor-pointer">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4" />
              Brand Settings
            </CardTitle>
            <Skeleton className="h-4 w-4" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (error || !brandPreview) {
    return (
      <Card className="mb-4 border-yellow-200 bg-yellow-50" data-testid="card-brand-settings-error">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              Brand Settings
            </CardTitle>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Unable to load brand assets. Videos will generate without branding.
          </p>
        </CardHeader>
      </Card>
    );
  }

  if (!brandPreview.hasMinimumAssets) {
    return (
      <Card className="mb-4 border-orange-200 bg-orange-50" data-testid="card-brand-settings-no-assets">
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              Brand Settings
            </CardTitle>
          </div>
          <p className="text-xs text-orange-700 mt-1">
            No brand assets uploaded. Go to <a href="/assets" className="underline">Assets → Brand Media</a> to add logos.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="mb-4" data-testid="card-brand-settings">
        <CardHeader 
          className="py-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
          data-testid="button-toggle-brand-settings"
        >
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Image className="h-4 w-4 text-primary" />
              Brand Settings
              <span className="text-xs font-normal text-gray-500">
                ({brandPreview.brandName})
              </span>
            </CardTitle>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0 pb-4">
            <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
              {brandPreview.logos.main && (
                <img
                  src={brandPreview.logos.main.thumbnailUrl}
                  alt={brandPreview.brandName}
                  className="h-10 w-auto object-contain"
                  data-testid="img-brand-logo"
                />
              )}
              <div>
                <p className="font-medium text-sm" data-testid="text-brand-name">{brandPreview.brandName}</p>
                {brandPreview.tagline && (
                  <p className="text-xs text-gray-500">{brandPreview.tagline}</p>
                )}
              </div>
              <div className="ml-auto flex gap-1">
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: brandPreview.colors.primary }}
                      data-testid="color-primary"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Primary: {brandPreview.colors.primary}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: brandPreview.colors.secondary }}
                      data-testid="color-secondary"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Secondary: {brandPreview.colors.secondary}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      className="w-5 h-5 rounded-full border border-gray-200"
                      style={{ backgroundColor: brandPreview.colors.accent }}
                      data-testid="color-accent"
                    />
                  </TooltipTrigger>
                  <TooltipContent>Accent: {brandPreview.colors.accent}</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {brandPreview.logos.intro || brandPreview.logos.main ? (
                    <img
                      src={(brandPreview.logos.intro || brandPreview.logos.main)!.thumbnailUrl}
                      alt="Intro logo"
                      className="h-8 w-8 object-contain bg-gray-100 rounded p-1"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                      <Image className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Intro Logo Animation</p>
                    <p className="text-xs text-gray-500">Appears in first scene (3 seconds)</p>
                  </div>
                </div>
                <Switch
                  checked={settings.includeIntroLogo}
                  onCheckedChange={() => handleToggle('includeIntroLogo')}
                  data-testid="switch-intro-logo"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {brandPreview.logos.watermark || brandPreview.logos.main ? (
                    <img
                      src={(brandPreview.logos.watermark || brandPreview.logos.main)!.thumbnailUrl}
                      alt="Watermark"
                      className="h-8 w-8 object-contain bg-gray-100 rounded p-1 opacity-70"
                    />
                  ) : (
                    <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center">
                      <Image className="h-4 w-4 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">Corner Watermark</p>
                    <p className="text-xs text-gray-500">Appears in middle scenes (70% opacity)</p>
                  </div>
                </div>
                <Switch
                  checked={settings.includeWatermark}
                  onCheckedChange={() => handleToggle('includeWatermark')}
                  data-testid="switch-watermark"
                />
              </div>

              {settings.includeWatermark && (
                <div className="ml-11 pl-3 border-l-2 border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Watermark Position</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => handlePositionChange(pos)}
                        className={`
                          relative h-10 border rounded text-xs
                          ${settings.watermarkPosition === pos 
                            ? 'border-primary bg-primary/5' 
                            : 'border-gray-200 hover:border-gray-300'}
                        `}
                        data-testid={`button-position-${pos}`}
                      >
                        <div 
                          className={`
                            absolute w-2 h-2 rounded-full bg-gray-400
                            ${pos === 'top-left' ? 'top-1 left-1' : ''}
                            ${pos === 'top-right' ? 'top-1 right-1' : ''}
                            ${pos === 'bottom-left' ? 'bottom-1 left-1' : ''}
                            ${pos === 'bottom-right' ? 'bottom-1 right-1' : ''}
                            ${settings.watermarkPosition === pos ? 'bg-primary' : ''}
                          `}
                        />
                        {settings.watermarkPosition === pos && (
                          <Check className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-gray-100 rounded flex items-center justify-center text-xs font-medium"
                       style={{ backgroundColor: brandPreview.colors.primary, color: brandPreview.colors.text }}>
                    CTA
                  </div>
                  <div>
                    <p className="text-sm font-medium">CTA Outro</p>
                    <p className="text-xs text-gray-500">
                      "{brandPreview.callToAction.text}" + {brandPreview.callToAction.url}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.includeCTAOutro}
                  onCheckedChange={() => handleToggle('includeCTAOutro')}
                  data-testid="switch-cta-outro"
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500" data-testid="text-brand-summary">
                {[
                  settings.includeIntroLogo && 'Intro',
                  settings.includeWatermark && 'Watermark', 
                  settings.includeCTAOutro && 'CTA'
                ].filter(Boolean).join(', ') || 'No brand elements'} will be added to your video.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
};

export default BrandSettingsPanel;
