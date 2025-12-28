# Phase 5D: Generation Preview Panel

## Objective

Create a Generation Preview Panel that shows users exactly what will be generated before they click "Generate Assets" - including which AI providers will be used, estimated cost, estimated time, and brand elements that will be added.

## Prerequisites

- Phase 5A complete (Brand Settings Panel working)
- Phase 5B complete (Visual Style Provider Mapping working)
- Phase 5C complete (Scene-Level Controls working)

## What This Phase Creates

- `client/src/components/generation-preview-panel.tsx` - NEW: Pre-generation summary
- API endpoint `GET /api/video-projects/:id/generation-estimate` - Cost/time estimation
- Integration with "Generate Assets" button

## What Success Looks Like

- Users see detailed breakdown before generating
- Shows which providers will be used per scene
- Displays estimated cost and time
- Lists brand elements that will be added
- Provides confidence to proceed or make changes

---

## Step 1: Create Generation Estimate API Endpoint

Add to `server/routes.ts`:

```typescript
import { getVisualStyleConfig } from '@shared/visual-style-config';
import { brandBibleService } from './services/brand-bible-service';

// GET /api/video-projects/:id/generation-estimate - Estimate generation cost/time
router.get('/api/video-projects/:id/generation-estimate', async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    
    // Get project
    const [project] = await db
      .select()
      .from(videoProjects)
      .where(eq(videoProjects.id, projectId));
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const scenes = project.scenes || [];
    const visualStyle = project.visualStyle || 'professional';
    const styleConfig = getVisualStyleConfig(visualStyle);
    const brandSettings = project.brandSettings || {
      includeIntroLogo: true,
      includeWatermark: true,
      includeCTAOutro: true,
    };
    
    // Get brand info
    const brandBible = await brandBibleService.getBrandBible();
    
    // Calculate provider assignments per scene
    const sceneProviders = scenes.map((scene: any, index: number) => {
      const contentType = scene.contentType || 
        styleConfig.defaultContentTypes[scene.type as keyof typeof styleConfig.defaultContentTypes] || 
        'lifestyle';
      
      // Determine primary provider based on style and content
      let primaryProvider = styleConfig.preferredVideoProviders[0];
      
      // Adjust for content type
      if (contentType === 'person') {
        primaryProvider = 'runway'; // Best for people
      } else if (contentType === 'abstract') {
        primaryProvider = styleConfig.preferredVideoProviders.includes('kling') ? 'kling' : primaryProvider;
      }
      
      return {
        sceneIndex: index,
        sceneType: scene.type,
        contentType,
        duration: scene.duration || 5,
        provider: primaryProvider,
        fallbackProvider: styleConfig.preferredVideoProviders[1] || 'kling',
      };
    });
    
    // Calculate costs
    const PROVIDER_COSTS = {
      runway: 0.05,      // $0.05 per second
      kling: 0.03,       // $0.03 per second
      hailuo: 0.02,      // $0.02 per second
      luma: 0.04,        // $0.04 per second
      piapi_kling: 0.03, // Via PiAPI
    };
    
    const VIDEO_COST = sceneProviders.reduce((sum: number, s: any) => {
      const costPerSec = PROVIDER_COSTS[s.provider as keyof typeof PROVIDER_COSTS] || 0.03;
      return sum + (s.duration * costPerSec);
    }, 0);
    
    const totalDuration = scenes.reduce((sum: number, s: any) => sum + (s.duration || 5), 0);
    
    // Calculate other costs
    const VOICEOVER_COST = 0.015 * totalDuration; // ~$0.015 per second (ElevenLabs)
    const MUSIC_COST = project.musicEnabled !== false ? 0.10 : 0; // Flat rate for Udio
    const SOUND_FX_COST = 0.05; // Sound effects
    const BRAND_CHECK_COST = scenes.length * 0.02; // Quality checks
    
    const totalCost = VIDEO_COST + VOICEOVER_COST + MUSIC_COST + SOUND_FX_COST + BRAND_CHECK_COST;
    
    // Estimate time (parallel processing helps)
    const avgSceneGenTime = 45; // seconds per scene
    const parallelFactor = 0.6; // Some parallelization
    const estimatedTimeMin = Math.ceil((scenes.length * avgSceneGenTime * parallelFactor) / 60);
    const estimatedTimeMax = Math.ceil((scenes.length * avgSceneGenTime) / 60);
    
    // Count provider usage
    const providerCounts: Record<string, number> = {};
    sceneProviders.forEach((s: any) => {
      providerCounts[s.provider] = (providerCounts[s.provider] || 0) + 1;
    });
    
    // Brand elements summary
    const brandElements = [];
    if (brandSettings.includeIntroLogo && (brandBible.logos.intro || brandBible.logos.main)) {
      brandElements.push({
        type: 'intro',
        name: 'Intro Logo Animation',
        description: '3 second logo with zoom effect',
        scene: 'Scene 1',
      });
    }
    if (brandSettings.includeWatermark && (brandBible.logos.watermark || brandBible.logos.main)) {
      brandElements.push({
        type: 'watermark',
        name: 'Corner Watermark',
        description: `${Math.round((brandSettings.watermarkOpacity || 0.7) * 100)}% opacity, ${brandSettings.watermarkPosition || 'bottom-right'}`,
        scene: `Scenes 2-${scenes.length - 1}`,
      });
    }
    if (brandSettings.includeCTAOutro) {
      brandElements.push({
        type: 'cta',
        name: 'CTA Outro',
        description: `"${brandBible.callToAction.text}" + ${brandBible.callToAction.url}`,
        scene: `Scene ${scenes.length}`,
      });
    }
    
    res.json({
      project: {
        title: project.title,
        sceneCount: scenes.length,
        totalDuration,
        visualStyle,
      },
      providers: {
        video: providerCounts,
        voiceover: 'ElevenLabs',
        music: project.musicEnabled !== false ? 'Udio AI (via PiAPI)' : 'Disabled',
        soundFx: 'Runway Sound',
      },
      sceneBreakdown: sceneProviders,
      costs: {
        video: VIDEO_COST.toFixed(2),
        voiceover: VOICEOVER_COST.toFixed(2),
        music: MUSIC_COST.toFixed(2),
        soundFx: SOUND_FX_COST.toFixed(2),
        qualityChecks: BRAND_CHECK_COST.toFixed(2),
        total: totalCost.toFixed(2),
      },
      time: {
        estimatedMinutes: `${estimatedTimeMin}-${estimatedTimeMax}`,
        perScene: avgSceneGenTime,
      },
      brandElements,
      brandName: brandBible.brandName,
      warnings: generateWarnings(scenes, brandSettings, brandBible),
    });
    
  } catch (error: any) {
    console.error('[API] Generation estimate failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper to generate warnings
function generateWarnings(
  scenes: any[],
  brandSettings: any,
  brandBible: any
): string[] {
  const warnings: string[] = [];
  
  // Check for missing brand assets
  if (brandSettings.includeIntroLogo && !brandBible.logos.intro && !brandBible.logos.main) {
    warnings.push('No logo found for intro animation - will be skipped');
  }
  
  // Check for long scenes
  const longScenes = scenes.filter((s: any) => (s.duration || 5) > 10);
  if (longScenes.length > 0) {
    warnings.push(`${longScenes.length} scene(s) are over 10 seconds - may require multiple video segments`);
  }
  
  // Check for many scenes
  if (scenes.length > 10) {
    warnings.push('Large number of scenes may increase generation time significantly');
  }
  
  // Check for missing content types
  const missingContentType = scenes.filter((s: any) => !s.contentType);
  if (missingContentType.length > 0) {
    warnings.push(`${missingContentType.length} scene(s) will use default content type based on style`);
  }
  
  return warnings;
}
```

---

## Step 2: Create Generation Preview Panel Component

Create `client/src/components/generation-preview-panel.tsx`:

```tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Video,
  Mic,
  Music,
  Volume2,
  Image,
  Clock,
  DollarSign,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface GenerationEstimate {
  project: {
    title: string;
    sceneCount: number;
    totalDuration: number;
    visualStyle: string;
  };
  providers: {
    video: Record<string, number>;
    voiceover: string;
    music: string;
    soundFx: string;
  };
  sceneBreakdown: Array<{
    sceneIndex: number;
    sceneType: string;
    contentType: string;
    duration: number;
    provider: string;
    fallbackProvider: string;
  }>;
  costs: {
    video: string;
    voiceover: string;
    music: string;
    soundFx: string;
    qualityChecks: string;
    total: string;
  };
  time: {
    estimatedMinutes: string;
    perScene: number;
  };
  brandElements: Array<{
    type: string;
    name: string;
    description: string;
    scene: string;
  }>;
  brandName: string;
  warnings: string[];
}

interface GenerationPreviewPanelProps {
  projectId: number;
  onGenerate: () => void;
  onCancel: () => void;
  isGenerating: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  runway: 'bg-purple-100 text-purple-800',
  kling: 'bg-blue-100 text-blue-800',
  hailuo: 'bg-green-100 text-green-800',
  luma: 'bg-orange-100 text-orange-800',
};

const PROVIDER_NAMES: Record<string, string> = {
  runway: 'Runway Gen-3',
  kling: 'Kling 1.6',
  hailuo: 'Hailuo MiniMax',
  luma: 'Luma Dream Machine',
};

export const GenerationPreviewPanel: React.FC<GenerationPreviewPanelProps> = ({
  projectId,
  onGenerate,
  onCancel,
  isGenerating,
}) => {
  const [showSceneDetails, setShowSceneDetails] = useState(false);

  const { data: estimate, isLoading, error } = useQuery<GenerationEstimate>({
    queryKey: ['generation-estimate', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/video-projects/${projectId}/generation-estimate`);
      if (!response.ok) throw new Error('Failed to load estimate');
      return response.json();
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Calculating generation preview...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !estimate) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-700">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load generation preview</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Generation Preview
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Provider Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Video */}
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Video className="h-4 w-4" />
              <span className="text-xs font-medium">Video</span>
            </div>
            <div className="space-y-1">
              {Object.entries(estimate.providers.video).map(([provider, count]) => (
                <div key={provider} className="flex items-center justify-between">
                  <Badge variant="secondary" className={`text-xs ${PROVIDER_COLORS[provider] || ''}`}>
                    {PROVIDER_NAMES[provider] || provider}
                  </Badge>
                  <span className="text-xs text-gray-500">{count} scenes</span>
                </div>
              ))}
            </div>
          </div>

          {/* Voiceover */}
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Mic className="h-4 w-4" />
              <span className="text-xs font-medium">Voiceover</span>
            </div>
            <p className="text-sm font-medium">{estimate.providers.voiceover}</p>
          </div>

          {/* Music */}
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Music className="h-4 w-4" />
              <span className="text-xs font-medium">Music</span>
            </div>
            <p className="text-sm font-medium">{estimate.providers.music}</p>
          </div>

          {/* Sound FX */}
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Volume2 className="h-4 w-4" />
              <span className="text-xs font-medium">Sound FX</span>
            </div>
            <p className="text-sm font-medium">{estimate.providers.soundFx}</p>
          </div>
        </div>

        {/* Brand Elements */}
        {estimate.brandElements.length > 0 && (
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Image className="h-4 w-4" />
              <span className="text-xs font-medium">Brand Elements ({estimate.brandName})</span>
            </div>
            <div className="space-y-2">
              {estimate.brandElements.map((element, idx) => (
                <div key={idx} className="flex items-start justify-between text-sm">
                  <div>
                    <span className="font-medium">{element.name}</span>
                    <span className="text-gray-500 text-xs block">{element.description}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {element.scene}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Scene Breakdown (Collapsible) */}
        <Collapsible open={showSceneDetails} onOpenChange={setShowSceneDetails}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full bg-white rounded-lg p-3 border hover:bg-gray-50 transition-colors">
              <span className="text-sm font-medium">
                Scene Breakdown ({estimate.project.sceneCount} scenes, {estimate.project.totalDuration}s)
              </span>
              {showSceneDetails ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 bg-white rounded-lg border divide-y">
              {estimate.sceneBreakdown.map((scene) => (
                <div key={scene.sceneIndex} className="flex items-center justify-between p-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 w-6">#{scene.sceneIndex + 1}</span>
                    <Badge variant="secondary" className="text-xs">
                      {scene.sceneType}
                    </Badge>
                    <span className="text-gray-500 text-xs">{scene.contentType}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{scene.duration}s</span>
                    <Badge variant="secondary" className={`text-xs ${PROVIDER_COLORS[scene.provider] || ''}`}>
                      {PROVIDER_NAMES[scene.provider] || scene.provider}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Cost & Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Estimated Cost</span>
            </div>
            <p className="text-2xl font-bold text-primary">${estimate.costs.total}</p>
            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Video generation</span>
                <span>${estimate.costs.video}</span>
              </div>
              <div className="flex justify-between">
                <span>Voiceover</span>
                <span>${estimate.costs.voiceover}</span>
              </div>
              <div className="flex justify-between">
                <span>Music</span>
                <span>${estimate.costs.music}</span>
              </div>
              <div className="flex justify-between">
                <span>Sound FX</span>
                <span>${estimate.costs.soundFx}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Estimated Time</span>
            </div>
            <p className="text-2xl font-bold">{estimate.time.estimatedMinutes} min</p>
            <p className="text-xs text-gray-500 mt-1">
              ~{estimate.time.perScene}s per scene
            </p>
          </div>
        </div>

        {/* Warnings */}
        {estimate.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Warnings</span>
            </div>
            <ul className="text-sm text-yellow-700 space-y-1">
              {estimate.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-yellow-500">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t">
          <Button variant="ghost" onClick={onCancel} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={onGenerate} disabled={isGenerating} className="gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Assets (${estimate.costs.total})
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default GenerationPreviewPanel;
```

---

## Step 3: Integrate Preview into Generate Flow

Update `universal-video-producer.tsx`:

```tsx
import { GenerationPreviewPanel } from './generation-preview-panel';

// Add state:
const [showGenerationPreview, setShowGenerationPreview] = useState(false);

// Replace the Generate Assets button logic:
const handleGenerateClick = () => {
  // Show preview instead of generating immediately
  setShowGenerationPreview(true);
};

const handleConfirmGenerate = async () => {
  setIsGenerating(true);
  try {
    await fetch(`/api/video-projects/${project.id}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visualStyle,
        musicEnabled,
        musicMood,
        brandSettings,
      }),
    });
    // Start polling for progress...
  } catch (error) {
    console.error('Generation failed:', error);
  }
};

// In the render, show preview panel when active:
{showGenerationPreview ? (
  <GenerationPreviewPanel
    projectId={project.id}
    onGenerate={handleConfirmGenerate}
    onCancel={() => setShowGenerationPreview(false)}
    isGenerating={isGenerating}
  />
) : (
  <Button onClick={handleGenerateClick} className="gap-2">
    <Sparkles className="h-4 w-4" />
    Generate Assets
  </Button>
)}
```

---

## Verification Checklist

Before moving to Phase 5E, confirm:

- [ ] API endpoint returns correct estimation data
- [ ] Provider counts are calculated correctly
- [ ] Cost calculation matches provider rates
- [ ] Time estimation is reasonable
- [ ] Brand elements are listed with correct scenes
- [ ] Warnings appear for relevant conditions
- [ ] Scene breakdown expands/collapses
- [ ] Provider badges show correct colors
- [ ] Generate button shows cost
- [ ] Cancel button closes preview
- [ ] Loading state displays during estimate fetch

---

## Cost Reference

| Provider | Cost per Second | Notes |
|----------|----------------|-------|
| Runway Gen-3 | $0.05 | Highest quality |
| Kling 1.6 | $0.03 | Good balance |
| Hailuo | $0.02 | Budget option |
| Luma | $0.04 | Motion focused |
| ElevenLabs (voice) | $0.015 | Per second of audio |
| Udio (music) | $0.10 | Flat rate per song |

---

## Troubleshooting

### "Estimate always shows $0.00"
- Check provider cost lookup
- Verify scene durations are being read
- Check for division errors

### "Provider breakdown is empty"
- Verify sceneProviders array is built
- Check style config has preferredVideoProviders

### "Brand elements not showing"
- Check brandBible is being loaded
- Verify brandSettings toggle values
- Check logos exist in brand bible

---

## Next Phase

Once Generation Preview Panel is working, proceed to **Phase 5E: Quality Dashboard** to display quality scores and brand compliance results after generation.
