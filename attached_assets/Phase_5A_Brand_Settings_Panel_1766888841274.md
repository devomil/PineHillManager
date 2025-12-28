# Phase 5A: Brand Settings Panel

## Objective

Create a Brand Settings Panel component that allows users to view the active brand, toggle brand elements (intro logo, watermark, CTA), and preview brand assets before video generation.

## Prerequisites

- Phase 4A-4F complete (brand bible service working)
- Brand Media Library has assets uploaded
- API endpoint `/api/brand-media-library` returns brand assets

## What This Phase Creates

- `client/src/components/brand-settings-panel.tsx` - New component
- API endpoint `GET /api/brand-bible/preview` - Brand preview data
- Integration with `universal-video-producer.tsx`

## What Success Looks Like

- Users see "Brand Settings" panel on project setup/dashboard
- Users can toggle intro logo, watermark, CTA on/off
- Users see thumbnail previews of brand assets
- Settings are saved with the project

---

## Step 1: Create Brand Preview API Endpoint

Add to `server/routes.ts`:

```typescript
import { brandBibleService } from './services/brand-bible-service';

// GET /api/brand-bible/preview - Get brand preview data for UI
router.get('/api/brand-bible/preview', async (req, res) => {
  try {
    const bible = await brandBibleService.getBrandBible();
    
    // Return UI-friendly preview data
    res.json({
      brandName: bible.brandName,
      tagline: bible.tagline,
      website: bible.website,
      colors: bible.colors,
      logos: {
        main: bible.logos.main ? {
          id: bible.logos.main.id,
          name: bible.logos.main.name,
          url: bible.logos.main.url,
          thumbnailUrl: bible.logos.main.thumbnailUrl || bible.logos.main.url,
        } : null,
        watermark: bible.logos.watermark ? {
          id: bible.logos.watermark.id,
          name: bible.logos.watermark.name,
          url: bible.logos.watermark.url,
          thumbnailUrl: bible.logos.watermark.thumbnailUrl || bible.logos.watermark.url,
        } : null,
        intro: bible.logos.intro ? {
          id: bible.logos.intro.id,
          name: bible.logos.intro.name,
          url: bible.logos.intro.url,
          thumbnailUrl: bible.logos.intro.thumbnailUrl || bible.logos.intro.url,
        } : null,
        outro: bible.logos.outro ? {
          id: bible.logos.outro.id,
          name: bible.logos.outro.name,
          url: bible.logos.outro.url,
          thumbnailUrl: bible.logos.outro.thumbnailUrl || bible.logos.outro.url,
        } : null,
      },
      callToAction: bible.callToAction,
      hasMinimumAssets: await brandBibleService.hasMinimumAssets(),
    });
  } catch (error: any) {
    console.error('[API] Brand preview failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 2: Create Brand Settings Panel Component

Create `client/src/components/brand-settings-panel.tsx`:

```tsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Image, Check, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

  // Fetch brand preview data
  const { data: brandPreview, isLoading, error } = useQuery<BrandPreview>({
    queryKey: ['brand-preview'],
    queryFn: async () => {
      const response = await fetch('/api/brand-bible/preview');
      if (!response.ok) throw new Error('Failed to load brand preview');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
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

  // Render loading state
  if (isLoading) {
    return (
      <Card className="mb-4">
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

  // Render error state
  if (error || !brandPreview) {
    return (
      <Card className="mb-4 border-yellow-200 bg-yellow-50">
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

  // Render no assets warning
  if (!brandPreview.hasMinimumAssets) {
    return (
      <Card className="mb-4 border-orange-200 bg-orange-50">
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
    <Card className="mb-4">
      <CardHeader 
        className="py-3 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
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
          {/* Brand Identity Preview */}
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            {brandPreview.logos.main && (
              <img
                src={brandPreview.logos.main.thumbnailUrl}
                alt={brandPreview.brandName}
                className="h-10 w-auto object-contain"
              />
            )}
            <div>
              <p className="font-medium text-sm">{brandPreview.brandName}</p>
              {brandPreview.tagline && (
                <p className="text-xs text-gray-500">{brandPreview.tagline}</p>
              )}
            </div>
            {/* Color swatches */}
            <div className="ml-auto flex gap-1">
              <Tooltip>
                <TooltipTrigger>
                  <div 
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: brandPreview.colors.primary }}
                  />
                </TooltipTrigger>
                <TooltipContent>Primary: {brandPreview.colors.primary}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <div 
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: brandPreview.colors.secondary }}
                  />
                </TooltipTrigger>
                <TooltipContent>Secondary: {brandPreview.colors.secondary}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger>
                  <div 
                    className="w-5 h-5 rounded-full border border-gray-200"
                    style={{ backgroundColor: brandPreview.colors.accent }}
                  />
                </TooltipTrigger>
                <TooltipContent>Accent: {brandPreview.colors.accent}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Brand Element Toggles */}
          <div className="space-y-3">
            {/* Intro Logo Toggle */}
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
              />
            </div>

            {/* Watermark Toggle */}
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
              />
            </div>

            {/* Watermark Position (only show if watermark enabled) */}
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

            {/* CTA Outro Toggle */}
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
              />
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
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
  );
};

export default BrandSettingsPanel;
```

---

## Step 3: Integrate into Universal Video Producer

Update `client/src/components/universal-video-producer.tsx`:

### Add import:
```tsx
import { BrandSettingsPanel, BrandSettings } from './brand-settings-panel';
```

### Add state for brand settings:
```tsx
const [brandSettings, setBrandSettings] = useState<BrandSettings>({
  includeIntroLogo: true,
  includeWatermark: true,
  includeCTAOutro: true,
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 0.7,
});
```

### Add the panel to the UI (after Visual Style selector, before Parse Script button):
```tsx
{/* Brand Settings Panel */}
<BrandSettingsPanel
  settings={brandSettings}
  onSettingsChange={setBrandSettings}
  defaultExpanded={false}
/>
```

### Pass brand settings when creating project:
```tsx
const createProject = async () => {
  const response = await fetch('/api/video-projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: videoTitle,
      script: fullScript,
      platform,
      visualStyle,
      brandSettings, // ADD THIS
    }),
  });
  // ... rest of handler
};
```

---

## Step 4: Update Project Schema (if needed)

Ensure your project schema includes brand settings. Add to `shared/schema.ts` if not present:

```typescript
// In the video_projects table definition
brandSettings: jsonb('brand_settings').$type<{
  includeIntroLogo: boolean;
  includeWatermark: boolean;
  includeCTAOutro: boolean;
  watermarkPosition: string;
  watermarkOpacity: number;
}>(),
```

---

## Step 5: Update Universal Video Service to Use Settings

In `server/services/universal-video-service.ts`, update brand instruction generation to respect settings:

```typescript
// In generateProjectAssets method, when generating brand instructions:
const projectBrandSettings = project.brandSettings || {
  includeIntroLogo: true,
  includeWatermark: true,
  includeCTAOutro: true,
  watermarkPosition: 'bottom-right',
  watermarkOpacity: 0.7,
};

// Only generate brand instructions if at least one element is enabled
if (projectBrandSettings.includeIntroLogo || 
    projectBrandSettings.includeWatermark || 
    projectBrandSettings.includeCTAOutro) {
  
  const brandInstructions = await brandInjectionService.generateBrandInstructions(
    scenesForBrand,
    projectBrandSettings // Pass settings to respect toggles
  );
  
  // Apply settings filters
  if (!projectBrandSettings.includeIntroLogo) {
    brandInstructions.introAnimation = undefined;
  }
  if (!projectBrandSettings.includeWatermark) {
    brandInstructions.watermark = undefined;
  }
  if (!projectBrandSettings.includeCTAOutro) {
    brandInstructions.outroSequence = undefined;
  }
  
  // Update watermark position/opacity if watermark is included
  if (brandInstructions.watermark && projectBrandSettings.includeWatermark) {
    brandInstructions.watermark.position.anchor = projectBrandSettings.watermarkPosition;
    brandInstructions.watermark.opacity = projectBrandSettings.watermarkOpacity;
  }
  
  updatedProject.brandInstructions = brandInstructions;
}
```

---

## Verification Checklist

Before moving to Phase 5B, confirm:

- [ ] API endpoint `/api/brand-bible/preview` returns brand data
- [ ] `BrandSettingsPanel` component renders correctly
- [ ] Brand name and logo preview display properly
- [ ] Toggle switches work for all three elements
- [ ] Watermark position selector appears when watermark is enabled
- [ ] Color swatches display correct brand colors
- [ ] Settings are passed when creating project
- [ ] Settings are respected during asset generation
- [ ] No brand assets shows helpful warning with link to Assets page
- [ ] Loading and error states display appropriately

---

## Troubleshooting

### "Brand preview not loading"
- Check API endpoint is registered in routes
- Verify brand bible service is imported
- Check for CORS or authentication issues

### "Toggles not saving"
- Verify `onSettingsChange` is connected
- Check state is being passed to API call
- Confirm project schema has brandSettings field

### "Brand elements still appearing when disabled"
- Check settings are being read in universal-video-service
- Verify brandInstructions is being filtered correctly

---

## Next Phase

Once Brand Settings Panel is working, proceed to **Phase 5B: Visual Style Provider Mapping** to connect the style dropdown to AI provider selection.
