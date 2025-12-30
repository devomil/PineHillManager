import { useState } from 'react';
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
  Brain,
  CheckCircle,
  Layers,
  Eye,
  Type,
  Shuffle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface ProviderCostBreakdown {
  displayName: string;
  scenes: number;
  cost: string;
}

interface GenerationEstimate {
  project: {
    title: string;
    sceneCount: number;
    totalDuration: number;
    visualStyle: string;
  };
  providers: {
    video: Record<string, number>;
    videoCostByProvider?: Record<string, ProviderCostBreakdown>;
    images?: { flux: number; falai: number };
    imageCosts?: { 
      flux: { count: number; cost: string }; 
      falai: { count: number; cost: string };
    };
    voiceover: string;
    music: string;
    soundFx: string;
  };
  soundDesign?: {
    voiceover: { provider: string; voice: string; totalDuration: number };
    music: { provider: string; style: string; mood: string; duration: number };
    ambientCount: number;
    transitionCount: number;
    accentCount: number;
  };
  intelligence?: {
    sceneAnalysis: { provider: string; enabled: boolean };
    textPlacement: { enabled: boolean; overlayCount: number };
    transitions: { enabled: boolean; moodMatched: boolean };
  };
  transitions?: {
    total: number;
    summary: {
      cuts: number;
      fades: number;
      dissolves: number;
      wipes: number;
      zooms: number;
      slides: number;
    };
  };
  qualityAssurance?: {
    enabled: boolean;
    provider: string;
    checks: string[];
  };
  sceneBreakdown: Array<{
    sceneIndex: number;
    sceneType: string;
    contentType: string;
    duration: number;
    provider: string;
    providerName?: string;
    fallbackProvider: string;
    costPerSecond?: number;
    providerReason?: string;
    confidence?: number;
    alternatives?: string[];
    intelligence?: {
      analysisStatus: 'pending' | 'complete' | 'error';
      textPlacement?: {
        position: 'top' | 'center' | 'bottom' | 'lower-third';
        alignment: 'left' | 'center' | 'right';
      };
      transitionToNext?: {
        type: string;
        duration: number;
        moodMatch: string;
        reason?: string;
      };
    };
  }>;
  costs: {
    video: string;
    videoCostBreakdown?: Record<string, ProviderCostBreakdown>;
    images?: string;
    voiceover: string;
    music: string;
    soundFx: string;
    sceneAnalysis?: string;
    qualityAssurance?: string;
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
  projectId: string;
  onGenerate: () => void;
  onCancel: () => void;
  isGenerating: boolean;
}

const PROVIDER_COLORS: Record<string, string> = {
  runway: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  kling: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  hailuo: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  luma: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  hunyuan: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  veo: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  flux: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'fal.ai': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
};

const PROVIDER_NAMES: Record<string, string> = {
  runway: 'Runway Gen-3',
  kling: 'Kling 1.6',
  hailuo: 'Hailuo MiniMax',
  luma: 'Luma Dream Machine',
  hunyuan: 'Hunyuan',
  veo: 'Veo 3.1',
  flux: 'Flux.1',
  'fal.ai': 'fal.ai',
  falai: 'fal.ai',
};

const IMAGE_PROVIDER_INFO: Record<string, { displayName: string; useCase: string; colorClass: string }> = {
  flux: { displayName: 'Flux.1', useCase: 'products', colorClass: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' },
  falai: { displayName: 'fal.ai', useCase: 'lifestyle', colorClass: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200' },
};

export function GenerationPreviewPanel({
  projectId,
  onGenerate,
  onCancel,
  isGenerating,
}: GenerationPreviewPanelProps) {
  const [showSceneDetails, setShowSceneDetails] = useState(false);

  const { data: estimate, isLoading, error } = useQuery<GenerationEstimate>({
    queryKey: ['/api/universal-video/projects', projectId, 'generation-estimate'],
    queryFn: async () => {
      const response = await fetch(`/api/universal-video/projects/${projectId}/generation-estimate`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to load estimate');
      return response.json();
    },
    staleTime: 30 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="border-primary/50 bg-primary/5" data-testid="generation-preview-loading">
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
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950" data-testid="generation-preview-error">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span>Failed to load generation preview</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent" data-testid="generation-preview-panel">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          Generation Preview
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Provider Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="provider-summary">
          {/* Video - Enhanced with per-provider costs */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Video className="h-4 w-4" />
              <span className="text-xs font-medium">Video</span>
            </div>
            <div className="space-y-1">
              {estimate.providers.videoCostByProvider ? (
                Object.entries(estimate.providers.videoCostByProvider).map(([provider, info]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <Badge variant="secondary" className={`text-xs ${PROVIDER_COLORS[provider] || ''}`} data-testid={`provider-badge-${provider}`}>
                      {info.displayName}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {info.scenes} × ${info.cost}
                    </span>
                  </div>
                ))
              ) : (
                Object.entries(estimate.providers.video).map(([provider, count]) => (
                  <div key={provider} className="flex items-center justify-between">
                    <Badge variant="secondary" className={`text-xs ${PROVIDER_COLORS[provider] || ''}`} data-testid={`provider-badge-${provider}`}>
                      {PROVIDER_NAMES[provider] || provider}
                    </Badge>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{count} scenes</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Voiceover */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Mic className="h-4 w-4" />
              <span className="text-xs font-medium">Voiceover</span>
            </div>
            <p className="text-sm font-medium" data-testid="provider-voiceover">{estimate.providers.voiceover}</p>
          </div>

          {/* Music */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Music className="h-4 w-4" />
              <span className="text-xs font-medium">Music</span>
            </div>
            <p className="text-sm font-medium" data-testid="provider-music">{estimate.providers.music}</p>
          </div>

          {/* Sound FX - Enhanced with Kling Sound details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Volume2 className="h-4 w-4" />
              <span className="text-xs font-medium">Sound FX</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium" data-testid="provider-soundfx">{estimate.providers.soundFx}</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5">
                <div className="flex justify-between">
                  <span>Ambient sounds</span>
                  <span>{estimate.soundDesign?.ambientCount ?? estimate.project.sceneCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Transitions</span>
                  <span>{estimate.soundDesign?.transitionCount ?? Math.max(0, estimate.project.sceneCount - 1)}</span>
                </div>
                {(estimate.soundDesign?.accentCount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Accent sounds</span>
                    <span>{estimate.soundDesign?.accentCount}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Images Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border" data-testid="images-section">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <Image className="h-4 w-4" />
            <span className="text-xs font-medium">Image Generation</span>
          </div>
          {(estimate.providers.images?.flux ?? 0) > 0 || (estimate.providers.images?.falai ?? 0) > 0 ? (
            <div className="space-y-1.5">
              {(estimate.providers.images?.flux ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className={`text-xs ${IMAGE_PROVIDER_INFO.flux.colorClass}`}>
                    {IMAGE_PROVIDER_INFO.flux.displayName}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {estimate.providers.images?.flux ?? 0} images
                    </span>
                    <span className="text-xs text-gray-400">
                      ({IMAGE_PROVIDER_INFO.flux.useCase})
                    </span>
                    {estimate.providers.imageCosts?.flux && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ${estimate.providers.imageCosts.flux.cost}
                      </span>
                    )}
                  </div>
                </div>
              )}
              {(estimate.providers.images?.falai ?? 0) > 0 && (
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className={`text-xs ${IMAGE_PROVIDER_INFO.falai.colorClass}`}>
                    {IMAGE_PROVIDER_INFO.falai.displayName}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {estimate.providers.images?.falai ?? 0} images
                    </span>
                    <span className="text-xs text-gray-400">
                      ({IMAGE_PROVIDER_INFO.falai.useCase})
                    </span>
                    {estimate.providers.imageCosts?.falai && (
                      <span className="text-xs text-green-600 dark:text-green-400">
                        ${estimate.providers.imageCosts.falai.cost}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">No standalone images needed</p>
          )}
        </div>

        {/* Intelligence Features (Phase 7D) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border" data-testid="intelligence-section">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
            <Brain className="h-4 w-4" />
            <span className="text-xs font-medium">Intelligence</span>
          </div>
          <div className="space-y-2">
            {/* Scene Analysis */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-blue-500" />
                <span className="text-sm">Scene Analysis</span>
              </div>
              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                {estimate.intelligence?.sceneAnalysis?.provider || 'Claude Vision'}
              </Badge>
            </div>
            
            {/* Text Placement */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="h-3.5 w-3.5 text-purple-500" />
                <span className="text-sm">Text Placement</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Smart positioning ({estimate.intelligence?.textPlacement?.overlayCount || estimate.project.sceneCount} overlays)
              </span>
            </div>
            
            {/* Transitions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shuffle className="h-3.5 w-3.5 text-green-500" />
                <span className="text-sm">Transitions</span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Mood-matched ({estimate.transitions?.total ?? Math.max(0, estimate.project.sceneCount - 1)})
              </span>
            </div>
            
            {/* Transition breakdown */}
            {estimate.transitions && (estimate.transitions.summary.dissolves > 0 || estimate.transitions.summary.fades > 0 || estimate.transitions.summary.cuts > 0) && (
              <div className="pl-5 text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
                {estimate.transitions.summary.dissolves > 0 && (
                  <div>{estimate.transitions.summary.dissolves} dissolves</div>
                )}
                {estimate.transitions.summary.fades > 0 && (
                  <div>{estimate.transitions.summary.fades} fades</div>
                )}
                {estimate.transitions.summary.cuts > 0 && (
                  <div>{estimate.transitions.summary.cuts} cuts</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quality Assurance */}
        {estimate.qualityAssurance?.enabled && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border" data-testid="qa-section">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Quality Assurance</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-300">Provider</span>
                <Badge variant="outline" className="text-xs">{estimate.qualityAssurance.provider}</Badge>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {estimate.qualityAssurance.checks.map((check, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs">{check}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Brand Elements */}
        {estimate.brandElements.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border" data-testid="brand-elements-section">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Image className="h-4 w-4" />
              <span className="text-xs font-medium">Brand Elements ({estimate.brandName})</span>
            </div>
            <div className="space-y-2">
              {estimate.brandElements.map((element, idx) => (
                <div key={idx} className="flex items-start justify-between text-sm" data-testid={`brand-element-${element.type}`}>
                  <div>
                    <span className="font-medium">{element.name}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs block">{element.description}</span>
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
            <button 
              className="flex items-center justify-between w-full bg-white dark:bg-gray-800 rounded-lg p-3 border hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              data-testid="scene-breakdown-trigger"
            >
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
            <div className="mt-2 bg-white dark:bg-gray-800 rounded-lg border divide-y dark:divide-gray-700" data-testid="scene-breakdown-list">
              {estimate.sceneBreakdown.map((scene) => (
                <div key={scene.sceneIndex} className="p-2 text-sm" data-testid={`scene-breakdown-${scene.sceneIndex}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-6">#{scene.sceneIndex + 1}</span>
                      <Badge variant="secondary" className="text-xs">
                        {scene.sceneType}
                      </Badge>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">{scene.contentType}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400">{scene.duration}s</span>
                      <Badge variant="secondary" className={`text-xs ${PROVIDER_COLORS[scene.provider] || ''}`} title={scene.providerReason || ''}>
                        {scene.providerName || PROVIDER_NAMES[scene.provider] || scene.provider}
                      </Badge>
                      {scene.confidence !== undefined && (
                        <span className={`text-xs ${scene.confidence >= 80 ? 'text-green-600' : scene.confidence >= 60 ? 'text-yellow-600' : 'text-gray-400'}`}>
                          {scene.confidence}%
                        </span>
                      )}
                    </div>
                  </div>
                  {(scene.providerReason || (scene.alternatives && scene.alternatives.length > 0)) && (
                    <div className="ml-6 mt-1 flex items-center gap-2 text-xs text-gray-400">
                      {scene.providerReason && (
                        <span className="italic">{scene.providerReason}</span>
                      )}
                      {scene.alternatives && scene.alternatives.length > 0 && (
                        <span className="hidden md:inline">
                          Alt: {scene.alternatives.map(a => PROVIDER_NAMES[a] || a).join(', ')}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Phase 7D: Per-scene intelligence info */}
                  {scene.intelligence && (
                    <div className="ml-6 mt-1 space-y-1">
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {scene.intelligence.textPlacement && (
                          <span className="flex items-center gap-1">
                            <Type className="h-3 w-3 text-purple-400" />
                            Text: {scene.intelligence.textPlacement.position}
                          </span>
                        )}
                      </div>
                      {scene.intelligence.transitionToNext && (
                        <div className="text-xs text-gray-400 space-y-0.5 border-l-2 border-green-400/30 pl-2 ml-0.5">
                          <div className="flex items-center gap-2">
                            <Shuffle className="h-3 w-3 text-green-400" />
                            <span className="text-gray-500">Scene {scene.sceneIndex + 1} → Scene {scene.sceneIndex + 2} transition:</span>
                          </div>
                          <div className="pl-5">
                            <div>Type: <span className="text-green-500">{scene.intelligence.transitionToNext.type}</span> ({scene.intelligence.transitionToNext.duration}s)</div>
                            {scene.intelligence.transitionToNext.moodMatch && (
                              <div>Mood match: <span className="text-blue-400">{scene.intelligence.transitionToNext.moodMatch}</span></div>
                            )}
                            {scene.intelligence.transitionToNext.reason && (
                              <div className="text-gray-500 italic">Reason: {scene.intelligence.transitionToNext.reason}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Cost & Time */}
        <div className="grid grid-cols-2 gap-3" data-testid="cost-time-section">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Estimated Cost</span>
            </div>
            <p className="text-2xl font-bold text-primary" data-testid="total-cost">${estimate.costs.total}</p>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Video generation</span>
                <span>${estimate.costs.video}</span>
              </div>
              {estimate.costs.images && parseFloat(estimate.costs.images) > 0 && (
                <div className="flex justify-between">
                  <span>Image generation</span>
                  <span>${estimate.costs.images}</span>
                </div>
              )}
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
              {estimate.costs.sceneAnalysis && parseFloat(estimate.costs.sceneAnalysis) > 0 && (
                <div className="flex justify-between">
                  <span>Scene analysis</span>
                  <span>${estimate.costs.sceneAnalysis}</span>
                </div>
              )}
              {estimate.costs.qualityAssurance && parseFloat(estimate.costs.qualityAssurance) > 0 && (
                <div className="flex justify-between">
                  <span>Quality assurance</span>
                  <span>${estimate.costs.qualityAssurance}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Estimated Time</span>
            </div>
            <p className="text-2xl font-bold" data-testid="estimated-time">{estimate.time.estimatedMinutes} min</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              ~{estimate.time.perScene}s per scene
            </p>
          </div>
        </div>

        {/* Warnings */}
        {estimate.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3" data-testid="warnings-section">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Warnings</span>
            </div>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              {estimate.warnings.map((warning, idx) => (
                <li key={idx} className="flex items-start gap-2" data-testid={`warning-${idx}`}>
                  <span className="text-yellow-500">•</span>
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t" data-testid="action-buttons">
          <Button variant="ghost" onClick={onCancel} disabled={isGenerating} data-testid="button-cancel">
            Cancel
          </Button>
          <Button onClick={onGenerate} disabled={isGenerating} className="gap-2" data-testid="button-generate">
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
}

export default GenerationPreviewPanel;
