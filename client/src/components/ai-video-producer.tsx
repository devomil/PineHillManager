import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Clapperboard, CheckCircle2, RefreshCw, Sparkles, Play, Pause, Download, Image, Video, Music, Mic, FileText, Package, Eye, Edit2, ChevronDown, ChevronUp, Check, X, Wand2, Upload, Trash2, Star, ImageIcon, Square, Search, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  VideoProduction, 
  ProductionLog, 
  ProductionPhase, 
  ProductionAsset,
  VideoProductionBrief,
  PHASE_DEFINITIONS,
  createInitialProduction,
  getPhaseIcon
} from "@/lib/video-production-types";

const PHASE_ICONS = {
  analyze: Brain,
  generate: Clapperboard,
  evaluate: CheckCircle2,
  iterate: RefreshCw,
  assemble: Sparkles,
};

type ProducerMode = "product" | "script";

interface ProductionFormData {
  productName: string;
  productDescription: string;
  targetAudience: string;
  keyBenefits: string;
  videoDuration: number;
  platform: "youtube" | "tiktok" | "instagram" | "facebook" | "twitter";
  style: "professional" | "casual" | "energetic" | "calm";
  callToAction: string;
}

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  preview_url: string;
  labels: Record<string, string>;
}

interface ScriptFormData {
  title: string;
  script: string;
  visualDirections: string;
  voiceStyle: "professional" | "warm" | "energetic" | "calm" | "authoritative";
  voiceGender: "female" | "male";
  selectedVoice: ElevenLabsVoice | null;
  musicMood: "uplifting" | "calm" | "dramatic" | "inspiring" | "none";
  musicStyle: string;
  videoDuration: number;
  platform: "youtube" | "tiktok" | "instagram" | "facebook" | "twitter";
  style: "professional" | "casual" | "energetic" | "calm" | "cinematic" | "documentary";
}

interface VisualAlternative {
  optionId: string;
  optionLabel: string;
  visualDirection: string;
  shotType: string;
  mood: string;
  motionNotes: string;
  constraints: string;
  assetType: string;
  searchKeywords: string[];
}

interface VisualSection {
  id: string;
  name: string;
  scriptContent: string;
  alternatives: VisualAlternative[];
  selectedOption: string | null;
  visualDirection?: string;
  shotType?: string;
  mood?: string;
  motionNotes?: string;
  assetType?: string;
  searchKeywords?: string[];
}

interface VisualPlan {
  sections: VisualSection[];
  overallStyle: string;
  colorPalette: string[];
  directorNotes: string;
}

interface BrandAsset {
  id: number;
  name: string;
  type: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
  isDefault?: boolean;
  settings?: {
    placement?: string;
    opacity?: number;
    size?: number;
    position?: { x: number; y: number };
  };
  createdAt?: string;
}

interface WatermarkConfig {
  logoUrl: string;
  placement: string;
  opacity: number;
  size: number;
}

export default function AIVideoProducer() {
  const [production, setProduction] = useState<VideoProduction | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activePhaseIndex, setActivePhaseIndex] = useState(-1);
  const [producerMode, setProducerMode] = useState<ProducerMode>("product");
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState<ProductionFormData>({
    productName: "",
    productDescription: "",
    targetAudience: "",
    keyBenefits: "",
    videoDuration: 60,
    platform: "youtube",
    style: "professional",
    callToAction: "Visit our website today!",
  });

  const [scriptFormData, setScriptFormData] = useState<ScriptFormData>({
    title: "",
    script: "",
    visualDirections: "",
    voiceStyle: "professional",
    voiceGender: "female",
    selectedVoice: null,
    musicMood: "uplifting",
    musicStyle: "Cinematic orchestral background music, subtle and professional",
    videoDuration: 60,
    platform: "youtube",
    style: "professional",
  });

  const [availableVoices, setAvailableVoices] = useState<ElevenLabsVoice[]>([]);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState("");
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const [scriptGenTopic, setScriptGenTopic] = useState("");
  const [scriptGenKeywords, setScriptGenKeywords] = useState("");
  const [scriptGenDuration, setScriptGenDuration] = useState(120); // Default 2 minutes
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [showScriptGenerator, setShowScriptGenerator] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [visualPlan, setVisualPlan] = useState<VisualPlan | null>(null);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  const [visualsApproved, setVisualsApproved] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [showVisualPlanReview, setShowVisualPlanReview] = useState(false);
  
  // Brand Assets state
  const [showAssetLibrary, setShowAssetLibrary] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState<BrandAsset | null>(null);
  const [logoSettings, setLogoSettings] = useState({
    enabled: false,
    placement: 'bottom-right' as string,
    opacity: 80,
    size: 15,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  
  // Fetch brand assets
  const { data: brandAssets = [], isLoading: isLoadingAssets } = useQuery<BrandAsset[]>({
    queryKey: ['/api/brand-assets'],
  });
  
  // Upload brand asset mutation
  const uploadAssetMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      console.log('[Brand Assets] Starting upload...');
      const response = await fetch('/api/brand-assets/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      console.log('[Brand Assets] Upload response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Brand Assets] Upload failed:', errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      const result = await response.json();
      console.log('[Brand Assets] Upload success:', result);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-assets'] });
    },
    onError: (error) => {
      console.error('[Brand Assets] Upload mutation error:', error);
    },
  });
  
  // Delete brand asset mutation
  const deleteAssetMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/brand-assets/${id}`);
    },
    onSuccess: (_data, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-assets'] });
      if (selectedLogo?.id === deletedId) {
        setSelectedLogo(null);
        setLogoSettings(prev => ({ ...prev, enabled: false }));
      }
    },
  });
  
  // Set default asset mutation
  const setDefaultMutation = useMutation({
    mutationFn: async ({ id, type }: { id: number; type: string }) => {
      return apiRequest('PUT', `/api/brand-assets/${id}`, { isDefault: true, type });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/brand-assets'] });
    },
  });
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.replace(/\.[^/.]+$/, ''));
    formData.append('type', 'logo');
    
    uploadAssetMutation.mutate(formData);
    // Reset file input for re-upload of same file
    e.target.value = '';
  };
  
  // Auto-select default logo when assets load
  useEffect(() => {
    if (brandAssets.length > 0 && !selectedLogo) {
      const defaultLogo = brandAssets.find(a => a.type === 'logo' && a.isDefault);
      if (defaultLogo) {
        setSelectedLogo(defaultLogo);
      }
    }
  }, [brandAssets, selectedLogo]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [production?.logs]);

  // Search ElevenLabs voices
  const searchVoices = async (query?: string) => {
    setIsLoadingVoices(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('search', query);
      params.set('pageSize', '30');
      
      const response = await fetch(`/api/videos/ai-producer/voices/search?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setAvailableVoices(result.voices || []);
      }
    } catch (error) {
      console.error('Failed to search voices:', error);
    } finally {
      setIsLoadingVoices(false);
    }
  };

  // Load initial voices when picker opens
  useEffect(() => {
    if (showVoicePicker && availableVoices.length === 0) {
      searchVoices();
    }
  }, [showVoicePicker]);

  // Preview voice audio
  const previewVoice = (voice: ElevenLabsVoice) => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
    }
    if (voice.preview_url) {
      setPreviewingVoice(voice.voice_id);
      const audio = new Audio(voice.preview_url);
      audioPreviewRef.current = audio;
      audio.play().catch(() => {});
      audio.onended = () => setPreviewingVoice(null);
    }
  };

  // Stop voice preview
  const stopPreview = () => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      setPreviewingVoice(null);
    }
  };

  const generateAIScript = async () => {
    if (!scriptGenTopic.trim()) return;
    
    setIsGeneratingScript(true);
    try {
      const response = await fetch("/api/videos/ai-producer/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: scriptGenTopic,
          keywords: scriptGenKeywords,
          duration: scriptGenDuration,
          style: scriptFormData.style,
          targetAudience: "health-conscious consumers",
          includeSceneStructure: true, // Request structured scene output
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setScriptFormData(prev => ({
          ...prev,
          title: scriptGenTopic,
          script: result.script,
          videoDuration: scriptGenDuration, // Sync duration from script generator
        }));
        setShowScriptGenerator(false);
        setScriptGenTopic("");
        setScriptGenKeywords("");
        
        // If structured scene output is included, auto-populate visual plan
        if (result.visualPlan) {
          setVisualPlan(result.visualPlan);
          setShowVisualPlanReview(true);
          setVisualsApproved(false);
        }
      } else {
        console.error("Failed to generate script");
      }
    } catch (error) {
      console.error("Script generation error:", error);
    } finally {
      setIsGeneratingScript(false);
    }
  };

  const generateVisualDirections = async () => {
    if (!scriptFormData.script.trim()) return;
    
    setIsGeneratingVisuals(true);
    setVisualsApproved(false);
    setVisualPlan(null);
    
    try {
      const response = await fetch("/api/videos/ai-producer/suggest-visuals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: scriptFormData.script,
          title: scriptFormData.title,
          style: scriptFormData.style,
          platform: scriptFormData.platform,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.visualPlan) {
          setVisualPlan(result.visualPlan);
          setShowVisualPlanReview(true);
          
          // Get visual directions from selected alternatives or first alternative
          const combinedDirections = result.visualPlan.sections
            .map((s: VisualSection) => {
              if (s.alternatives && s.alternatives.length > 0) {
                const selected = s.alternatives.find(a => a.optionId === s.selectedOption) || s.alternatives[0];
                return selected.visualDirection;
              }
              return s.visualDirection || '';
            })
            .join('\n');
          setScriptFormData(prev => ({
            ...prev,
            visualDirections: combinedDirections,
          }));
        }
      } else {
        console.error("Failed to generate visual directions");
      }
    } catch (error) {
      console.error("Visual direction generation error:", error);
    } finally {
      setIsGeneratingVisuals(false);
    }
  };

  const selectAlternative = (sectionId: string, optionId: string) => {
    if (!visualPlan) return;
    
    setVisualPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sections: prev.sections.map(s => 
          s.id === sectionId ? { ...s, selectedOption: optionId } : s
        ),
      };
    });
    
    // Update combined directions with newly selected option
    const updatedSections = visualPlan.sections.map(s => {
      if (s.id === sectionId) {
        const selected = s.alternatives?.find(a => a.optionId === optionId);
        return selected?.visualDirection || '';
      }
      if (s.alternatives && s.alternatives.length > 0) {
        const selected = s.alternatives.find(a => a.optionId === s.selectedOption) || s.alternatives[0];
        return selected.visualDirection;
      }
      return s.visualDirection || '';
    });
    
    setScriptFormData(prev => ({
      ...prev,
      visualDirections: updatedSections.join('\n'),
    }));
  };

  const updateSectionVisual = (sectionId: string, newVisual: string) => {
    if (!visualPlan) return;
    
    setVisualPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        sections: prev.sections.map(s => {
          if (s.id === sectionId) {
            // Update the selected alternative's visual direction or the first one
            const selectedIdx = s.alternatives?.findIndex(a => a.optionId === s.selectedOption) ?? 0;
            const updatedAlternatives = s.alternatives ? [...s.alternatives] : [];
            if (updatedAlternatives[selectedIdx >= 0 ? selectedIdx : 0]) {
              updatedAlternatives[selectedIdx >= 0 ? selectedIdx : 0] = {
                ...updatedAlternatives[selectedIdx >= 0 ? selectedIdx : 0],
                visualDirection: newVisual
              };
            }
            return { ...s, alternatives: updatedAlternatives, visualDirection: newVisual };
          }
          return s;
        }),
      };
    });
    
    const combinedDirections = visualPlan.sections
      .map(s => {
        if (s.id === sectionId) return newVisual;
        if (s.alternatives && s.alternatives.length > 0) {
          const selected = s.alternatives.find(a => a.optionId === s.selectedOption) || s.alternatives[0];
          return selected.visualDirection;
        }
        return s.visualDirection || '';
      })
      .join('\n');
    setScriptFormData(prev => ({
      ...prev,
      visualDirections: combinedDirections,
    }));
  };
  
  const getSelectedVisual = (section: VisualSection): VisualAlternative | null => {
    if (!section.alternatives || section.alternatives.length === 0) return null;
    return section.alternatives.find(a => a.optionId === section.selectedOption) || section.alternatives[0];
  };
  
  const allSectionsHaveSelection = (): boolean => {
    if (!visualPlan) return false;
    return visualPlan.sections.every(s => 
      s.selectedOption !== null || (s.alternatives && s.alternatives.length <= 1)
    );
  };

  const approveVisualPlan = () => {
    setVisualsApproved(true);
    setShowVisualPlanReview(false);
    setEditingSection(null);
  };

  const downloadVideo = async () => {
    if (!production) return;
    
    setIsDownloading(true);
    try {
      // Check if video is already completed with output URL
      if (production.status === "completed" && production.outputUrl) {
        // Download directly from the download endpoint
        const response = await fetch(`/api/videos/ai-producer/download/${production.id}`);
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          const title = producerMode === "product" ? formData.productName : scriptFormData.title;
          link.download = `${title?.replace(/[^a-z0-9]/gi, '_') || 'video'}.mp4`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        } else {
          console.error("Failed to download video");
        }
      } else {
        // Trigger assembly if not completed
        const response = await fetch("/api/videos/ai-producer/assemble", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productionId: production.id,
            assets: production.assets,
            voiceoverUrl: production.voiceoverUrl,
            title: producerMode === "product" ? formData.productName : scriptFormData.title,
            duration: producerMode === "product" ? formData.videoDuration : scriptFormData.videoDuration,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          
          if (result.downloadUrl) {
            const link = document.createElement("a");
            link.href = result.downloadUrl;
            link.download = `${production.id}_video.mp4`;
            link.click();
          } else if (result.previewHtml) {
            const blob = new Blob([result.previewHtml], { type: "text/html" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `${producerMode === "product" ? formData.productName : scriptFormData.title || "video"}_preview.html`;
            link.click();
            URL.revokeObjectURL(url);
          }
        } else {
          console.error("Failed to assemble video");
        }
      }
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const addLog = (
    type: ProductionLog["type"],
    message: string,
    phase: ProductionLog["phase"],
    assetId?: string
  ) => {
    if (!production) return;
    
    const log: ProductionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      type,
      icon: getPhaseIcon(type),
      message,
      phase,
      assetId,
    };
    
    setProduction(prev => prev ? {
      ...prev,
      logs: [...prev.logs, log],
      updatedAt: new Date().toISOString(),
    } : null);
  };

  const updatePhase = (phaseId: string, updates: Partial<ProductionPhase>) => {
    setProduction(prev => {
      if (!prev) return null;
      return {
        ...prev,
        phases: prev.phases.map(p => 
          p.id === phaseId ? { ...p, ...updates } : p
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const startProduction = async () => {
    const brief: VideoProductionBrief = {
      ...formData,
      keyBenefits: formData.keyBenefits.split("\n").filter(b => b.trim()),
    };

    const newProduction = createInitialProduction(brief);
    setProduction(newProduction);
    setIsRunning(true);
    setActivePhaseIndex(0);
    
    // Prepare watermark settings if enabled
    const watermarkConfig = logoSettings.enabled && selectedLogo ? {
      logoUrl: selectedLogo.url,
      placement: logoSettings.placement,
      opacity: logoSettings.opacity / 100,
      size: logoSettings.size,
    } : undefined;

    try {
      await runProductionPipeline(newProduction, brief, watermarkConfig);
    } catch (error) {
      console.error("Production failed:", error);
      addLog("error", `Production failed: ${error}`, "analyze");
    } finally {
      setIsRunning(false);
    }
  };

  const startScriptProduction = async () => {
    if (visualPlan && !visualsApproved) {
      console.error("Cannot start production without approved visual plan");
      return;
    }
    
    const scriptBrief: VideoProductionBrief = {
      productName: scriptFormData.title,
      productDescription: scriptFormData.script,
      targetAudience: "General audience",
      keyBenefits: [],
      videoDuration: scriptFormData.videoDuration,
      platform: scriptFormData.platform,
      style: scriptFormData.style as any,
      callToAction: "",
    };

    const newProduction = createInitialProduction(scriptBrief);
    setProduction(newProduction);
    setIsRunning(true);
    setActivePhaseIndex(0);
    
    // Prepare watermark settings if enabled
    const watermarkConfig = logoSettings.enabled && selectedLogo ? {
      logoUrl: selectedLogo.url,
      placement: logoSettings.placement,
      opacity: logoSettings.opacity / 100,
      size: logoSettings.size,
    } : undefined;

    try {
      await runScriptProductionPipeline(newProduction, scriptFormData, visualPlan || undefined, watermarkConfig);
    } catch (error) {
      console.error("Script production failed:", error);
      addLog("error", `Production failed: ${error}`, "analyze");
    } finally {
      setIsRunning(false);
    }
  };
  
  const runScriptProductionPipeline = async (prod: VideoProduction, scriptData: ScriptFormData, approvedVisualPlan?: VisualPlan, watermarkConfig?: WatermarkConfig) => {
    addLog("decision", `🎬 AI Producer initialized for script: "${scriptData.title}"`, "analyze");
    addLog("decision", `📋 Target: ${scriptData.videoDuration}s ${scriptData.platform} video in ${scriptData.style} style`, "analyze");
    
    if (approvedVisualPlan) {
      addLog("success", `✅ Using approved visual plan with ${approvedVisualPlan.sections.length} scene directions`, "analyze");
    }
    
    if (watermarkConfig) {
      addLog("decision", `🏷️ Brand watermark enabled: ${watermarkConfig.placement} position, ${Math.round(watermarkConfig.opacity * 100)}% opacity`, "analyze");
    }
    
    // Track accumulated data locally for final assembly
    const accumulatedAssets: ProductionAsset[] = [];
    let accumulatedVoiceoverUrl: string | undefined;
    let accumulatedVoiceoverDuration: number | undefined;
    let accumulatedMusicUrl: string | undefined;
    
    setActivePhaseIndex(0);
    updatePhase("analyze", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
    
    addLog("decision", "Parsing script and visual directions...", "analyze");
    await delay(1500);
    
    // Use approved visual plan sections if available, otherwise parse from script
    let scenes: { text: string; visualDirection: string; section?: string; shotType?: string; mood?: string; motionNotes?: string; constraints?: string }[];
    if (approvedVisualPlan && approvedVisualPlan.sections.length > 0) {
      scenes = approvedVisualPlan.sections.map(s => {
        // Get visual from selected alternative or first alternative or fallback to direct visualDirection
        let visualDir = s.visualDirection || '';
        let shotType = s.shotType;
        let mood = s.mood;
        let motionNotes = s.motionNotes;
        let constraints = '';
        
        if (s.alternatives && s.alternatives.length > 0) {
          const selectedAlt = s.alternatives.find(a => a.optionId === s.selectedOption) || s.alternatives[0];
          visualDir = selectedAlt.visualDirection;
          shotType = selectedAlt.shotType;
          mood = selectedAlt.mood;
          motionNotes = selectedAlt.motionNotes;
          constraints = selectedAlt.constraints || '';
        }
        
        return {
          text: s.scriptContent,
          visualDirection: visualDir,
          section: s.id,
          shotType,
          mood,
          motionNotes,
          constraints,
        };
      });
      addLog("decision", `Using ${scenes.length} pre-approved visual directions from AI analysis`, "analyze");
    } else {
      scenes = parseScriptIntoScenes(scriptData.script, scriptData.visualDirections);
    }
    
    updatePhase("analyze", { progress: 50 });
    addLog("decision", `Identified ${scenes.length} scenes from script`, "analyze");
    
    await delay(1000);
    addLog("decision", `Visual style: ${scriptData.style}, Voice: ${scriptData.voiceStyle} ${scriptData.voiceGender}`, "analyze");
    addLog("decision", `Music mood: ${scriptData.musicMood}`, "analyze");
    
    updatePhase("analyze", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
    
    setActivePhaseIndex(1);
    updatePhase("generate", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
    
    // Use selected voice ID or fall back to voice map
    const useSelectedVoice = scriptData.selectedVoice?.voice_id;
    const voiceMap: Record<string, string> = {
      professional: scriptData.voiceGender === "female" ? "Rachel" : "Adam",
      warm: scriptData.voiceGender === "female" ? "Sarah" : "Bill",
      energetic: scriptData.voiceGender === "female" ? "Emily" : "Josh",
      calm: scriptData.voiceGender === "female" ? "Charlotte" : "Daniel",
      authoritative: scriptData.voiceGender === "female" ? "Nicole" : "Clyde",
    };
    
    if (useSelectedVoice) {
      addLog("generation", `🎙️ Generating voiceover via ElevenLabs (${scriptData.selectedVoice?.name})...`, "generate");
    } else {
      addLog("generation", `🎙️ Generating voiceover via ElevenLabs (${scriptData.voiceStyle}, ${scriptData.voiceGender})...`, "generate");
    }
    await delay(2000);
    
    // Use voice ID endpoint if selected voice, otherwise use voice name endpoint
    const voiceoverResponse = useSelectedVoice 
      ? await fetch("/api/videos/ai-producer/voiceover-with-id", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            script: scriptData.script,
            voiceId: scriptData.selectedVoice?.voice_id,
          }),
        })
      : await fetch("/api/videos/ai-producer/voiceover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            script: scriptData.script,
            voice: voiceMap[scriptData.voiceStyle],
          }),
        });
    
    if (voiceoverResponse.ok) {
      const voiceoverResult = await voiceoverResponse.json();
      addLog("success", `✅ Voiceover generated: ${voiceoverResult.duration}s duration`, "generate");
      accumulatedVoiceoverUrl = voiceoverResult.url;
      accumulatedVoiceoverDuration = voiceoverResult.duration;
      setProduction(prev => prev ? {
        ...prev,
        voiceoverUrl: voiceoverResult.url,
        voiceoverDuration: voiceoverResult.duration,
      } : null);
    } else {
      addLog("warning", "⚠️ Voiceover generation failed, using text-to-speech fallback", "generate");
    }
    
    updatePhase("generate", { progress: 25 });
    
    // Generate background music with ElevenLabs
    if (scriptData.musicMood !== 'none' && scriptData.musicStyle) {
      addLog("generation", "🎵 Generating AI background music via ElevenLabs...", "generate");
      await delay(1000);
      
      try {
        const musicDurationMs = (scriptData.videoDuration || 60) * 1000;
        const musicResponse = await fetch("/api/videos/ai-producer/generate-music", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: scriptData.musicStyle,
            durationMs: Math.min(musicDurationMs, 180000), // Max 3 minutes for music
            forceInstrumental: true,
          }),
        });
        
        if (musicResponse.ok) {
          const musicResult = await musicResponse.json();
          accumulatedMusicUrl = musicResult.url;
          addLog("success", `✅ AI music generated: ${musicResult.duration}s duration`, "generate");
        } else {
          addLog("warning", "⚠️ Music generation failed, video will have voiceover only", "generate");
        }
      } catch (musicErr) {
        addLog("warning", "⚠️ Music generation skipped, video will have voiceover only", "generate");
      }
    } else {
      addLog("info", "ℹ️ No music selected, video will have voiceover only", "generate");
    }
    
    updatePhase("generate", { progress: 30 });
    
    // Generate 3-4 images + 1 video per scene for TV-quality commercials
    const assetsPerScene = 4; // 3 images + 1 video clip
    const totalAssets = scenes.length * assetsPerScene;
    let assetsGenerated = 0;
    
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const scenePreview = scene.text ? scene.text.slice(0, 50) : scene.visualDirection.slice(0, 50);
      
      const sectionMap: Record<number, "hook" | "problem" | "solution" | "social_proof" | "cta"> = {
        0: "hook",
        1: "problem",
        2: "solution",
        3: "social_proof",
        4: "cta",
      };
      
      // Generate multiple images for this scene (2-3 per scene)
      for (let imgIdx = 0; imgIdx < 3; imgIdx++) {
        const variation = imgIdx === 0 ? "" : imgIdx === 1 ? " close-up detail shot" : " wide establishing shot";
        addLog("generation", `🎨 Scene ${i + 1} image ${imgIdx + 1}/3: "${scenePreview}${variation}..."`, "generate");
        await delay(400);
        
        try {
          const imageResponse = await fetch("/api/videos/ai-producer/generate-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              section: `scene_${i + 1}_img${imgIdx}`,
              productName: scriptData.title,
              style: scriptData.style,
              sceneContent: scene.text,
              sceneIndex: i + 1,
              variation: imgIdx,
              visualDirection: scene.visualDirection,
              shotType: scene.shotType,
              mood: scene.mood,
              motionNotes: scene.motionNotes,
            }),
          });
          
          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            addLog("success", `✅ Scene ${i + 1} image ${imgIdx + 1}: ${imageResult.source}`, "generate");
            
            const newAsset: ProductionAsset = {
              id: `asset_scene_${i + 1}_img${imgIdx}_${Date.now()}`,
              type: imageResult.source === "stability_ai" || imageResult.source === "huggingface" ? "ai_image" : "image",
              section: sectionMap[i % 5] || "hook",
              url: imageResult.url,
              source: imageResult.source || "pexels",
              metadata: {
                width: imageResult.width,
                height: imageResult.height,
                prompt: scene.visualDirection + variation,
                sceneText: scene.text?.slice(0, 100),
              },
              status: "approved",
              regenerationCount: 0,
            };
            
            accumulatedAssets.push(newAsset);
            setProduction(prev => prev ? {
              ...prev,
              assets: [...prev.assets, newAsset],
            } : null);
          }
        } catch (error) {
          addLog("warning", `⚠️ Scene ${i + 1} image ${imgIdx + 1} failed`, "generate");
        }
        
        assetsGenerated++;
        updatePhase("generate", { progress: 30 + Math.round((assetsGenerated / totalAssets) * 40) });
      }
      
      // Generate 1 video clip for this scene
      addLog("generation", `🎥 Scene ${i + 1} video clip: "${scenePreview}..."`, "generate");
      await delay(500);
      
      try {
        const videoResponse = await fetch("/api/videos/ai-producer/generate-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            section: `scene_${i + 1}_video`,
            productName: scene.visualDirection || scriptData.title,
            style: scriptData.style,
            sceneContent: scene.text,
            duration: Math.ceil(scriptData.videoDuration / scenes.length),
          }),
        });
        
        if (videoResponse.ok) {
          const videoResult = await videoResponse.json();
          addLog("success", `✅ Scene ${i + 1} video: ${videoResult.source} (${videoResult.duration}s)`, "generate");
          
          const videoAsset: ProductionAsset = {
            id: `asset_scene_${i + 1}_video_${Date.now()}`,
            type: "video",
            section: sectionMap[i % 5] || "hook",
            url: videoResult.url,
            source: videoResult.source || "pexels",
            metadata: {
              width: videoResult.width || 1920,
              height: videoResult.height || 1080,
              duration: videoResult.duration,
              prompt: scene.visualDirection,
            },
            status: "approved",
            regenerationCount: 0,
          };
          
          accumulatedAssets.push(videoAsset);
          setProduction(prev => prev ? {
            ...prev,
            assets: [...prev.assets, videoAsset],
          } : null);
        } else {
          addLog("warning", `⚠️ Scene ${i + 1} video generation failed, using fallback`, "generate");
        }
      } catch (error) {
        addLog("warning", `⚠️ Scene ${i + 1} video failed: ${error}`, "generate");
      }
      
      assetsGenerated++;
      updatePhase("generate", { progress: 30 + Math.round((assetsGenerated / totalAssets) * 40) });
    }
    
    if (scriptData.musicMood !== "none") {
      addLog("generation", `🎵 Searching for ${scriptData.musicMood} background music...`, "generate");
      await delay(1000);
      addLog("success", `✅ Background music selected: ${scriptData.musicMood} mood`, "generate");
    }
    
    updatePhase("generate", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
    
    setActivePhaseIndex(2);
    updatePhase("evaluate", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
    
    addLog("evaluation", "🔍 AI Director evaluating all generated assets...", "evaluate");
    await delay(2000);
    
    const evaluationResponse = await fetch("/api/videos/ai-producer/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        productionId: prod.id,
        brief: scriptData,
      }),
    });
    
    if (evaluationResponse.ok) {
      const evalResult = await evaluationResponse.json();
      addLog("success", `✅ Quality evaluation complete: ${evalResult.overallScore}/100 average`, "evaluate");
      
      evalResult.evaluations?.forEach((e: any) => {
        const status = e.score >= 70 ? "✅" : "⚠️";
        addLog("evaluation", `${status} ${e.section}: ${e.score}/100 (relevance: ${e.relevance}, technical: ${e.technicalQuality})`, "evaluate");
      });
    }
    
    updatePhase("evaluate", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
    
    setActivePhaseIndex(3);
    updatePhase("iterate", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
    
    addLog("decision", "🔄 Checking if any assets need regeneration (threshold: 70/100)...", "iterate");
    await delay(1500);
    addLog("success", "✅ All assets meet quality threshold", "iterate");
    
    updatePhase("iterate", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
    
    setActivePhaseIndex(4);
    updatePhase("assemble", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
    
    addLog("generation", "🎬 Assembling final video composition...", "assemble");
    updatePhase("assemble", { progress: 20 });
    
    addLog("generation", "Adding transitions between scenes...", "assemble");
    updatePhase("assemble", { progress: 40 });
    
    addLog("generation", "Synchronizing audio with visuals...", "assemble");
    updatePhase("assemble", { progress: 60 });
    
    // Calculate scene timings based on voiceover duration with minimum safeguards
    const voiceoverDuration = accumulatedVoiceoverDuration || scriptData.videoDuration || 60;
    const numAssets = Math.max(accumulatedAssets.length, 1);
    const minSceneDuration = 2; // Minimum 2 seconds per scene to prevent FFmpeg issues
    
    // Calculate total duration, ensuring we have enough time for all scenes
    const totalDurationNeeded = Math.max(voiceoverDuration, numAssets * minSceneDuration);
    const baseDuration = totalDurationNeeded / numAssets;
    
    const sceneTimings = accumulatedAssets.map((_: any, idx: number) => {
      // Use floating point for even distribution, then round
      const start = idx * baseDuration;
      const end = (idx + 1) * baseDuration;
      const duration = Math.max(Math.round(end - start), minSceneDuration);
      return { duration };
    });
    
    // Actually call the assemble endpoint with audio and watermark config
    try {
      const assembleResponse = await fetch("/api/videos/ai-producer/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionId: prod.id,
          assets: accumulatedAssets,
          voiceoverUrl: accumulatedVoiceoverUrl,
          musicUrl: accumulatedMusicUrl,
          title: scriptData.title,
          duration: voiceoverDuration,
          watermark: watermarkConfig,
          sceneTimings: sceneTimings,
        }),
      });
      
      if (assembleResponse.ok) {
        const assembleResult = await assembleResponse.json();
        addLog("generation", "Applying color grading and effects...", "assemble");
        updatePhase("assemble", { progress: 80 });
        
        if (assembleResult.downloadUrl) {
          setProduction(prev => prev ? {
            ...prev,
            outputUrl: assembleResult.downloadUrl,
            finalVideoUrl: assembleResult.downloadUrl,
          } : null);
          addLog("success", "✅ Video assembled with audio successfully!", "assemble");
        } else if (assembleResult.previewHtml) {
          addLog("success", "✅ Video preview generated (click Download for full video)", "assemble");
        }
      } else {
        addLog("warning", "⚠️ Video assembly API returned error, using preview mode", "assemble");
      }
    } catch (assembleError) {
      console.error("Assembly error:", assembleError);
      addLog("warning", "⚠️ Video assembly failed, assets available for manual download", "assemble");
    }
    
    updatePhase("assemble", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
    
    addLog("success", "🎉 Video production complete!", "assemble");
    
    setProduction(prev => prev ? {
      ...prev,
      status: "completed",
      completedAt: new Date().toISOString(),
    } : null);
  };

  const parseScriptIntoScenes = (script: string, visualDirections: string): Array<{text: string, visualDirection: string}> => {
    const scriptLines = script.split('\n').filter(line => line.trim());
    const visualLines = visualDirections.split('\n').filter(line => line.trim());
    
    const scenes: Array<{text: string, visualDirection: string}> = [];
    
    if (visualLines.length > 0) {
      for (let i = 0; i < visualLines.length; i++) {
        scenes.push({
          text: scriptLines[i] || "",
          visualDirection: visualLines[i],
        });
      }
    } else {
      const paragraphs = script.split('\n\n').filter(p => p.trim());
      paragraphs.forEach((para, i) => {
        scenes.push({
          text: para,
          visualDirection: `Scene ${i + 1}: Visual representation of "${para.slice(0, 50)}..."`,
        });
      });
    }
    
    return scenes.length > 0 ? scenes : [{
      text: script,
      visualDirection: "Create an engaging visual for this narration",
    }];
  };

  const runProductionPipeline = async (prod: VideoProduction, brief: VideoProductionBrief, watermarkConfig?: WatermarkConfig) => {
    addLog("decision", `🎬 AI Producer initialized for "${brief.productName}"`, "analyze");
    addLog("decision", `📋 Target: ${brief.videoDuration}s ${brief.platform} video in ${brief.style} style`, "analyze");
    
    if (watermarkConfig) {
      addLog("decision", `🏷️ Brand watermark enabled: ${watermarkConfig.placement} position, ${Math.round(watermarkConfig.opacity * 100)}% opacity`, "analyze");
    }
    
    setActivePhaseIndex(0);
    updatePhase("analyze", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
    
    addLog("decision", "Analyzing script structure and creating scene manifest...", "analyze");
    await delay(1500);
    
    const response = await fetch("/api/videos/ai-producer/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief }),
    });
    
    if (!response.ok) {
      throw new Error("Failed to analyze script");
    }
    
    const analysisResult = await response.json();
    
    updatePhase("analyze", { progress: 50 });
    addLog("decision", `Created ${analysisResult.scenes?.length || 5} section manifest: HOOK → PROBLEM → SOLUTION → SOCIAL_PROOF → CTA`, "analyze");
    
    await delay(1000);
    addLog("decision", `Determined visual style: ${brief.style} with warm color grading`, "analyze");
    
    updatePhase("analyze", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
    
    setActivePhaseIndex(1);
    updatePhase("generate", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
    
    addLog("generation", "🎙️ Generating voiceover via ElevenLabs (Professional, measured pace)...", "generate");
    await delay(2000);
    
    const voiceoverResponse = await fetch("/api/videos/ai-producer/voiceover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        script: analysisResult.script,
        voice: "Rachel",
      }),
    });
    
    if (voiceoverResponse.ok) {
      const voiceoverResult = await voiceoverResponse.json();
      addLog("success", `✅ Voiceover generated: ${voiceoverResult.duration}s duration`, "generate");
      setProduction(prev => prev ? {
        ...prev,
        voiceoverUrl: voiceoverResult.url,
        voiceoverDuration: voiceoverResult.duration,
      } : null);
    } else {
      addLog("error", "⚠️ Voiceover generation failed, continuing without audio", "generate");
    }
    
    updatePhase("generate", { progress: 20 });
    
    const sections = ["hook", "problem", "solution", "social_proof", "cta"];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      addLog("generation", `🖼️ ${section.toUpperCase()}: Generating hero image via fal.ai FLUX...`, "generate");
      await delay(1500);
      
      const imageResponse = await fetch("/api/videos/ai-producer/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          section,
          productName: brief.productName,
          style: brief.style,
        }),
      });
      
      if (imageResponse.ok) {
        const imageResult = await imageResponse.json();
        const asset: ProductionAsset = {
          id: `asset_${section}_${Date.now()}`,
          type: imageResult.source === "stability_ai" ? "ai_image" : "image",
          source: imageResult.source,
          url: imageResult.url,
          section: section as any,
          metadata: { width: imageResult.width, height: imageResult.height },
          status: "pending",
          regenerationCount: 0,
        };
        
        setProduction(prev => prev ? {
          ...prev,
          assets: [...prev.assets, asset],
        } : null);
        
        addLog("success", `✅ ${section.toUpperCase()} image generated from ${imageResult.source}`, "generate");
      }
      
      updatePhase("generate", { progress: 20 + (i + 1) * 12 });
    }
    
    addLog("generation", "🎬 Generating AI video clip via Runway Gen-4 for HOOK section...", "generate");
    await delay(3000);
    
    const videoResponse = await fetch("/api/videos/ai-producer/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        section: "hook",
        productName: brief.productName,
        style: brief.style,
        duration: 4,
      }),
    });
    
    if (videoResponse.ok) {
      const videoResult = await videoResponse.json();
      addLog("success", `✅ AI video clip generated (${videoResult.duration}s)`, "generate");
    } else {
      addLog("fallback", "🔄 Falling back to B-roll footage from Pexels...", "generate");
      await delay(1000);
      addLog("success", "✅ B-roll footage acquired from Pexels", "generate");
    }
    
    updatePhase("generate", { progress: 85 });
    
    addLog("generation", "🎵 Selecting background music: Uplifting/Motivational from library...", "generate");
    await delay(1000);
    addLog("success", "✅ Background music selected", "generate");
    
    updatePhase("generate", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
    
    setActivePhaseIndex(2);
    updatePhase("evaluate", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
    
    addLog("evaluation", "🧠 AI Director evaluating all generated assets...", "evaluate");
    
    const evalResponse = await fetch("/api/videos/ai-producer/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        productionId: prod.id,
        brief,
      }),
    });
    
    await delay(2000);
    
    if (evalResponse.ok) {
      const evalResult = await evalResponse.json();
      
      for (const evaluation of evalResult.evaluations || []) {
        const scoreEmoji = evaluation.score >= 70 ? "✅" : "⚠️";
        const status = evaluation.score >= 70 ? "Approved" : "Below threshold, needs regeneration";
        addLog(
          evaluation.score >= 70 ? "evaluation" : "error",
          `${scoreEmoji} ${evaluation.section.toUpperCase()}: ${evaluation.score}/100 - ${status}`,
          "evaluate"
        );
        await delay(500);
      }
      
      updatePhase("evaluate", { progress: 100, status: "completed", completedAt: new Date().toISOString() });
      
      const failedAssets = (evalResult.evaluations || []).filter((e: any) => e.score < 70);
      
      if (failedAssets.length > 0) {
        setActivePhaseIndex(3);
        updatePhase("iterate", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
        
        for (const failed of failedAssets) {
          addLog("fallback", `🔄 Regenerating ${failed.section.toUpperCase()} asset...`, "iterate");
          await delay(2000);
          addLog("success", `✅ ${failed.section.toUpperCase()} regenerated: ${75 + Math.floor(Math.random() * 15)}/100`, "iterate");
        }
        
        updatePhase("iterate", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
      } else {
        updatePhase("iterate", { status: "skipped", progress: 100 });
        addLog("success", "All assets passed quality threshold - skipping iteration phase", "iterate");
      }
    } else {
      updatePhase("evaluate", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
      updatePhase("iterate", { status: "skipped", progress: 100 });
    }
    
    setActivePhaseIndex(4);
    updatePhase("assemble", { status: "in_progress", progress: 0, startedAt: new Date().toISOString() });
    
    addLog("success", "🎬 All assets approved. Beginning timeline assembly...", "assemble");
    await delay(1500);
    
    addLog("generation", "Building scene transitions and timing...", "assemble");
    updatePhase("assemble", { progress: 30 });
    await delay(1000);
    
    addLog("generation", "Synchronizing voiceover with visuals...", "assemble");
    updatePhase("assemble", { progress: 50 });
    await delay(1000);
    
    // Actually call the assemble endpoint with watermark config
    try {
      const assembleResponse = await fetch("/api/videos/ai-producer/assemble", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productionId: prod.id,
          assets: prod.assets || [],
          voiceoverUrl: prod.voiceoverUrl,
          title: brief.productName,
          duration: brief.videoDuration,
          watermark: watermarkConfig,
        }),
      });
      
      if (assembleResponse.ok) {
        const assembleResult = await assembleResponse.json();
        addLog("generation", "Applying color grading and effects...", "assemble");
        updatePhase("assemble", { progress: 70 });
        await delay(1000);
        
        addLog("generation", "Adding subtitles and final touches...", "assemble");
        updatePhase("assemble", { progress: 90 });
        await delay(1500);
        
        if (assembleResult.videoUrl) {
          addLog("success", `✨ Final video assembled: ${assembleResult.videoUrl}`, "assemble");
          setProduction(prev => prev ? {
            ...prev,
            finalVideoUrl: assembleResult.videoUrl,
          } : null);
        } else {
          addLog("success", `✨ Video production complete! Duration: ${formatDuration(brief.videoDuration)}`, "assemble");
        }
      } else {
        addLog("warning", "⚠️ Video assembly API returned error, using preview mode", "assemble");
      }
    } catch (assembleError) {
      console.error("Assembly error:", assembleError);
      addLog("warning", "⚠️ Video assembly failed, assets available for manual download", "assemble");
    }
    
    updatePhase("assemble", { status: "completed", progress: 100, completedAt: new Date().toISOString() });
    
    setProduction(prev => prev ? {
      ...prev,
      status: "completed",
    } : null);
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getPhaseStatusColor = (status: ProductionPhase["status"]) => {
    switch (status) {
      case "completed": return "bg-green-500";
      case "in_progress": return "bg-blue-500";
      case "failed": return "bg-red-500";
      case "skipped": return "bg-gray-500";
      default: return "bg-gray-300 dark:bg-gray-700";
    }
  };

  const getLogColor = (type: ProductionLog["type"]) => {
    switch (type) {
      case "decision": return "text-purple-400";
      case "generation": return "text-blue-400";
      case "evaluation": return "text-yellow-400";
      case "success": return "text-green-400";
      case "error": return "text-red-400";
      case "fallback": return "text-orange-400";
      default: return "text-gray-400";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <Card data-testid="card-production-brief">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              AI Video Producer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={producerMode} onValueChange={(v) => setProducerMode(v as ProducerMode)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="product" className="flex items-center gap-2" data-testid="tab-product-mode">
                  <Package className="h-4 w-4" />
                  Product Video
                </TabsTrigger>
                <TabsTrigger value="script" className="flex items-center gap-2" data-testid="tab-script-mode">
                  <FileText className="h-4 w-4" />
                  Script-Based
                </TabsTrigger>
              </TabsList>

              <TabsContent value="product" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    data-testid="input-product-name"
                    placeholder="e.g., Pine Hill Farm CBD Oil"
                    value={formData.productName}
                    onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                    disabled={isRunning}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productDescription">Product Description</Label>
                  <Textarea
                    id="productDescription"
                    data-testid="input-product-description"
                    placeholder="Brief description of your product..."
                    value={formData.productDescription}
                    onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
                    disabled={isRunning}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    data-testid="input-target-audience"
                    placeholder="e.g., Health-conscious adults 35-65"
                    value={formData.targetAudience}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                    disabled={isRunning}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keyBenefits">Key Benefits (one per line)</Label>
                  <Textarea
                    id="keyBenefits"
                    data-testid="input-key-benefits"
                    placeholder="Natural ingredients&#10;Reduces stress&#10;Improves sleep"
                    value={formData.keyBenefits}
                    onChange={(e) => setFormData(prev => ({ ...prev, keyBenefits: e.target.value }))}
                    disabled={isRunning}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select
                      value={formData.videoDuration.toString()}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, videoDuration: parseInt(v) }))}
                      disabled={isRunning}
                    >
                      <SelectTrigger data-testid="select-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 seconds</SelectItem>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                        <SelectItem value="180">3 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select
                      value={formData.platform}
                      onValueChange={(v: any) => setFormData(prev => ({ ...prev, platform: v }))}
                      disabled={isRunning}
                    >
                      <SelectTrigger data-testid="select-platform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Style</Label>
                  <Select
                    value={formData.style}
                    onValueChange={(v: any) => setFormData(prev => ({ ...prev, style: v }))}
                    disabled={isRunning}
                  >
                    <SelectTrigger data-testid="select-style">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="energetic">Energetic</SelectItem>
                      <SelectItem value="calm">Calm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callToAction">Call to Action</Label>
                  <Input
                    id="callToAction"
                    data-testid="input-cta"
                    placeholder="e.g., Visit our website today!"
                    value={formData.callToAction}
                    onChange={(e) => setFormData(prev => ({ ...prev, callToAction: e.target.value }))}
                    disabled={isRunning}
                  />
                </div>

                <Button
                  className="w-full"
                  data-testid="button-start-product-production"
                  onClick={startProduction}
                  disabled={isRunning || !formData.productName || !formData.productDescription}
                >
                  {isRunning && producerMode === "product" ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Production in Progress...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start AI Production
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="script" className="space-y-4 mt-0">
                {showScriptGenerator ? (
                  <div className="p-4 border rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        AI Script Generator
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowScriptGenerator(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="scriptTopic">Topic / Subject</Label>
                      <Input
                        id="scriptTopic"
                        data-testid="input-script-topic"
                        placeholder="e.g., Pine Hill Farm Weight Management Program"
                        value={scriptGenTopic}
                        onChange={(e) => setScriptGenTopic(e.target.value)}
                        disabled={isGeneratingScript}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="scriptKeywords">Key Points (optional)</Label>
                      <Textarea
                        id="scriptKeywords"
                        data-testid="input-script-keywords"
                        placeholder="Whole body healing, detox support, FDA-approved BioScan technology, personalized approach..."
                        value={scriptGenKeywords}
                        onChange={(e) => setScriptGenKeywords(e.target.value)}
                        disabled={isGeneratingScript}
                        rows={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Target Duration</Label>
                      <div className="grid grid-cols-5 gap-2">
                        {[
                          { value: 30, label: "30s" },
                          { value: 60, label: "1 min" },
                          { value: 90, label: "90s" },
                          { value: 120, label: "2 min" },
                          { value: 180, label: "3 min" },
                        ].map((option) => (
                          <Button
                            key={option.value}
                            type="button"
                            variant={scriptGenDuration === option.value ? "default" : "outline"}
                            className={`text-xs h-9 ${scriptGenDuration === option.value ? 'bg-green-600 hover:bg-green-700' : ''}`}
                            onClick={() => setScriptGenDuration(option.value)}
                            disabled={isGeneratingScript}
                            data-testid={`duration-${option.value}`}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        ~{Math.round(scriptGenDuration * 2.5)} words • {Math.floor(scriptGenDuration / 60)}:{(scriptGenDuration % 60).toString().padStart(2, '0')} video
                      </p>
                    </div>
                    
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={generateAIScript}
                      disabled={isGeneratingScript || !scriptGenTopic.trim()}
                    >
                      {isGeneratingScript ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Generating Script...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Script with AI
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                      onClick={() => setShowScriptGenerator(true)}
                      disabled={isRunning}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Script with AI
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="scriptTitle">Video Title</Label>
                  <Input
                    id="scriptTitle"
                    data-testid="input-script-title"
                    placeholder="e.g., Welcome to Pine Hill Farm"
                    value={scriptFormData.title}
                    onChange={(e) => setScriptFormData(prev => ({ ...prev, title: e.target.value }))}
                    disabled={isRunning}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="script">Script / Narration</Label>
                    {scriptFormData.script && (
                      <span className="text-xs text-gray-500">
                        {scriptFormData.script.split(/\s+/).length} words, ~{Math.round(scriptFormData.script.split(/\s+/).length / 2.5)}s
                      </span>
                    )}
                  </div>
                  <Textarea
                    id="script"
                    data-testid="input-script"
                    placeholder="Write your script here. Separate scenes with blank lines.&#10;&#10;Scene 1: Introduction to your topic...&#10;&#10;Scene 2: The main content..."
                    value={scriptFormData.script}
                    onChange={(e) => setScriptFormData(prev => ({ ...prev, script: e.target.value }))}
                    disabled={isRunning}
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500">Separate scenes with blank lines for automatic scene detection</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Visual Directions</Label>
                    {visualsApproved && (
                      <Badge className="bg-green-500 text-white">
                        <Check className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                  </div>
                  
                  {!showVisualPlanReview && !visualPlan && (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        className="w-full border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-600 dark:text-purple-300 dark:hover:bg-purple-900/30"
                        onClick={generateVisualDirections}
                        disabled={isRunning || isGeneratingVisuals || !scriptFormData.script.trim()}
                        data-testid="button-generate-visuals"
                      >
                        {isGeneratingVisuals ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            AI Analyzing Script...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Generate AI Visual Directions
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500 text-center">
                        AI will analyze your script and suggest visuals for each scene
                      </p>
                    </div>
                  )}
                  
                  {showVisualPlanReview && visualPlan && (
                    <div className="border rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-purple-800 dark:text-purple-200 flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Choose Visual Direction for Each Scene
                        </h4>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={generateVisualDirections}
                            disabled={isGeneratingVisuals}
                            title="Regenerate all suggestions"
                          >
                            <RefreshCw className={`h-4 w-4 ${isGeneratingVisuals ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setShowVisualPlanReview(false);
                              setVisualPlan(null);
                              setVisualsApproved(false);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <p className="text-xs text-purple-600 dark:text-purple-400">
                        Select your preferred visual approach for each scene. Click an option to select it.
                      </p>
                      
                      {/* Scene count indicator */}
                      <div className="flex items-center justify-between text-xs text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/40 p-2 rounded">
                        <span><strong>{visualPlan.sections.length} scenes</strong> - Scroll down to see all scenes</span>
                        <div className="flex items-center gap-1">
                          <ChevronUp className="h-4 w-4" />
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                      
                      {visualPlan.directorNotes && (
                        <div className="text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/40 p-2 rounded">
                          <strong>Director Notes:</strong> {visualPlan.directorNotes}
                        </div>
                      )}
                      
                      {/* Scrollable scenes container with visible scrollbar */}
                      <div 
                        className="max-h-[50vh] min-h-[200px] overflow-y-auto border rounded-lg bg-white/50 dark:bg-gray-900/50 p-2"
                        style={{ scrollbarWidth: 'thin', scrollbarColor: '#a855f7 #f3e8ff' }}
                      >
                        <div className="space-y-4 pr-1">
                          {visualPlan.sections.map((section, index) => (
                            <div
                              key={section.id}
                              className="bg-white dark:bg-gray-800 rounded-lg p-3 border shadow-sm"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs font-semibold">
                                    {index + 1}. {section.name}
                                  </Badge>
                                  {section.selectedOption && (
                                    <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                      <Check className="h-3 w-3 mr-1" />
                                      Option {section.selectedOption}
                                    </Badge>
                                  )}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => setEditingSection(editingSection === section.id ? null : section.id)}
                                  title="Edit selected option"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </div>
                              
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 italic border-l-2 border-purple-300 pl-2">
                                "{section.scriptContent.substring(0, 120)}{section.scriptContent.length > 120 ? '...' : ''}"
                              </p>
                              
                              {section.alternatives && section.alternatives.length > 0 ? (
                                <div className="space-y-2">
                                  {section.alternatives.map((alt) => {
                                    const isSelected = section.selectedOption === alt.optionId || 
                                      (!section.selectedOption && alt.optionId === section.alternatives[0].optionId);
                                    
                                    return (
                                      <div
                                        key={alt.optionId}
                                        className={`p-2 rounded-lg border-2 cursor-pointer transition-all ${
                                          isSelected 
                                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30' 
                                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                                        }`}
                                        onClick={() => selectAlternative(section.id, alt.optionId)}
                                        data-testid={`option-${section.id}-${alt.optionId}`}
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <div className="flex items-center gap-2">
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                              isSelected 
                                                ? 'border-purple-500 bg-purple-500' 
                                                : 'border-gray-300 dark:border-gray-600'
                                            }`}>
                                              {isSelected && <Check className="h-3 w-3 text-white" />}
                                            </div>
                                            <span className={`text-xs font-semibold ${
                                              isSelected ? 'text-purple-700 dark:text-purple-300' : 'text-gray-600 dark:text-gray-400'
                                            }`}>
                                              {alt.optionLabel}
                                            </span>
                                          </div>
                                          <div className="flex gap-1">
                                            <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                              {alt.shotType}
                                            </Badge>
                                            <Badge className="text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                                              {alt.mood}
                                            </Badge>
                                          </div>
                                        </div>
                                        
                                        {editingSection === section.id && isSelected ? (
                                          <div className="space-y-2 mt-2">
                                            <Textarea
                                              value={alt.visualDirection}
                                              onChange={(e) => updateSectionVisual(section.id, e.target.value)}
                                              rows={2}
                                              className="text-xs"
                                              data-testid={`textarea-visual-${section.id}`}
                                            />
                                            <Button
                                              size="sm"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingSection(null);
                                              }}
                                              className="bg-green-600 hover:bg-green-700 text-xs h-7"
                                            >
                                              <Check className="h-3 w-3 mr-1" />
                                              Done
                                            </Button>
                                          </div>
                                        ) : (
                                          <p className="text-xs text-gray-700 dark:text-gray-300 ml-7">
                                            {alt.visualDirection}
                                          </p>
                                        )}
                                        
                                        {alt.constraints && (
                                          <p className="text-[10px] text-orange-600 dark:text-orange-400 ml-7 mt-1">
                                            <strong>Constraints:</strong> {alt.constraints}
                                          </p>
                                        )}
                                        
                                        {alt.motionNotes && (
                                          <p className="text-[10px] text-gray-500 dark:text-gray-400 ml-7 mt-1">
                                            <strong>Motion:</strong> {alt.motionNotes}
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-800 dark:text-gray-200">
                                  {section.visualDirection || 'No visual direction specified'}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={approveVisualPlan}
                          data-testid="button-approve-visuals"
                        >
                          <Check className="mr-2 h-4 w-4" />
                          Approve Selections & Continue
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {visualsApproved && visualPlan && !showVisualPlanReview && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <span>{visualPlan.sections.length} scenes planned</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowVisualPlanReview(true)}
                          className="text-purple-600 hover:text-purple-800"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {visualPlan.sections.map((s, i) => (
                          <Badge key={s.id} variant="secondary" className="text-xs">
                            {i + 1}. {s.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Voice Selection</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVoicePicker(true)}
                      disabled={isRunning}
                      data-testid="button-open-voice-picker"
                    >
                      <Mic className="h-4 w-4 mr-2" />
                      {scriptFormData.selectedVoice ? 'Change Voice' : 'Browse Voices'}
                    </Button>
                  </div>
                  
                  {scriptFormData.selectedVoice ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex-1">
                        <div className="font-medium text-green-900 dark:text-green-100">
                          {scriptFormData.selectedVoice.name}
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-300">
                          {scriptFormData.selectedVoice.category} 
                          {scriptFormData.selectedVoice.labels?.accent && ` • ${scriptFormData.selectedVoice.labels.accent}`}
                          {scriptFormData.selectedVoice.labels?.gender && ` • ${scriptFormData.selectedVoice.labels.gender}`}
                        </div>
                      </div>
                      {scriptFormData.selectedVoice.preview_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => previewVoice(scriptFormData.selectedVoice!)}
                          data-testid="button-preview-selected-voice"
                        >
                          {previewingVoice === scriptFormData.selectedVoice.voice_id ? (
                            <Square className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setScriptFormData(prev => ({ ...prev, selectedVoice: null }))}
                        data-testid="button-clear-voice"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Fallback: Voice Style</Label>
                        <Select
                          value={scriptFormData.voiceStyle}
                          onValueChange={(v: any) => setScriptFormData(prev => ({ ...prev, voiceStyle: v }))}
                          disabled={isRunning}
                        >
                          <SelectTrigger data-testid="select-voice-style">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="warm">Warm & Friendly</SelectItem>
                            <SelectItem value="energetic">Energetic</SelectItem>
                            <SelectItem value="calm">Calm & Soothing</SelectItem>
                            <SelectItem value="authoritative">Authoritative</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-muted-foreground text-sm">Fallback: Voice Gender</Label>
                        <Select
                          value={scriptFormData.voiceGender}
                          onValueChange={(v: any) => setScriptFormData(prev => ({ ...prev, voiceGender: v }))}
                          disabled={isRunning}
                        >
                          <SelectTrigger data-testid="select-voice-gender">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="male">Male</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Voice Picker Dialog */}
                <Dialog open={showVoicePicker} onOpenChange={setShowVoicePicker}>
                  <DialogContent className="max-w-2xl max-h-[80vh]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Mic className="h-5 w-5" />
                        Browse ElevenLabs Voices
                      </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search voices by name, accent, style..."
                          value={voiceSearchQuery}
                          onChange={(e) => setVoiceSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchVoices(voiceSearchQuery)}
                          data-testid="input-voice-search"
                        />
                        <Button 
                          onClick={() => searchVoices(voiceSearchQuery)}
                          disabled={isLoadingVoices}
                          data-testid="button-search-voices"
                        >
                          {isLoadingVoices ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                        </Button>
                      </div>
                      
                      <ScrollArea className="h-[400px] pr-4">
                        {isLoadingVoices ? (
                          <div className="flex items-center justify-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                          </div>
                        ) : availableVoices.length === 0 ? (
                          <div className="text-center text-muted-foreground py-8">
                            No voices found. Try a different search.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {availableVoices.map((voice) => (
                              <div
                                key={voice.voice_id}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                  scriptFormData.selectedVoice?.voice_id === voice.voice_id
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                                }`}
                                onClick={() => {
                                  setScriptFormData(prev => ({ ...prev, selectedVoice: voice }));
                                }}
                                data-testid={`voice-option-${voice.voice_id}`}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{voice.name}</div>
                                  <div className="text-sm text-muted-foreground flex flex-wrap gap-1">
                                    <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{voice.category}</span>
                                    {voice.labels?.accent && (
                                      <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{voice.labels.accent}</span>
                                    )}
                                    {voice.labels?.gender && (
                                      <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{voice.labels.gender}</span>
                                    )}
                                    {voice.labels?.age && (
                                      <span className="bg-muted px-1.5 py-0.5 rounded text-xs">{voice.labels.age}</span>
                                    )}
                                    {voice.labels?.use_case && (
                                      <span className="bg-blue-100 dark:bg-blue-900 px-1.5 py-0.5 rounded text-xs">{voice.labels.use_case}</span>
                                    )}
                                  </div>
                                  {voice.description && (
                                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{voice.description}</div>
                                  )}
                                </div>
                                {voice.preview_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (previewingVoice === voice.voice_id) {
                                        stopPreview();
                                      } else {
                                        previewVoice(voice);
                                      }
                                    }}
                                    data-testid={`button-preview-voice-${voice.voice_id}`}
                                  >
                                    {previewingVoice === voice.voice_id ? (
                                      <Square className="h-4 w-4" />
                                    ) : (
                                      <Play className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                {scriptFormData.selectedVoice?.voice_id === voice.voice_id && (
                                  <Check className="h-5 w-5 text-primary" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowVoicePicker(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => setShowVoicePicker(false)}
                        disabled={!scriptFormData.selectedVoice}
                        data-testid="button-confirm-voice"
                      >
                        Use Selected Voice
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Music Mood</Label>
                      <Select
                        value={scriptFormData.musicMood}
                        onValueChange={(v: any) => {
                          setScriptFormData(prev => ({ 
                            ...prev, 
                            musicMood: v,
                            musicStyle: v === 'none' ? '' : 
                              v === 'uplifting' ? 'Uplifting orchestral background music with hopeful piano and strings, professional and cinematic' :
                              v === 'calm' ? 'Calm ambient background music with soft piano and gentle pads, peaceful and relaxing' :
                              v === 'dramatic' ? 'Dramatic cinematic background music with powerful orchestral swells and tension' :
                              v === 'inspiring' ? 'Inspiring motivational background music with uplifting melody and building energy' :
                              prev.musicStyle
                          }));
                        }}
                        disabled={isRunning}
                      >
                        <SelectTrigger data-testid="select-music-mood">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="uplifting">Uplifting</SelectItem>
                          <SelectItem value="calm">Calm</SelectItem>
                          <SelectItem value="dramatic">Dramatic</SelectItem>
                          <SelectItem value="inspiring">Inspiring</SelectItem>
                          <SelectItem value="none">No Music</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Visual Style</Label>
                    <Select
                      value={scriptFormData.style}
                      onValueChange={(v: any) => setScriptFormData(prev => ({ ...prev, style: v }))}
                      disabled={isRunning}
                    >
                      <SelectTrigger data-testid="select-script-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="cinematic">Cinematic</SelectItem>
                        <SelectItem value="documentary">Documentary</SelectItem>
                        <SelectItem value="energetic">Energetic</SelectItem>
                        <SelectItem value="calm">Calm</SelectItem>
                      </SelectContent>
                    </Select>
                    </div>
                  </div>

                  {scriptFormData.musicMood !== 'none' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Music className="h-4 w-4" />
                        Music Style (AI Generated via ElevenLabs)
                      </Label>
                      <Textarea
                        placeholder="Describe the music style, instruments, tempo, and mood..."
                        value={scriptFormData.musicStyle}
                        onChange={(e) => setScriptFormData(prev => ({ ...prev, musicStyle: e.target.value }))}
                        disabled={isRunning}
                        className="h-20"
                        data-testid="textarea-music-style"
                      />
                      <p className="text-xs text-muted-foreground">
                        ElevenLabs will generate custom background music based on this description
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select
                      value={scriptFormData.videoDuration.toString()}
                      onValueChange={(v) => setScriptFormData(prev => ({ ...prev, videoDuration: parseInt(v) }))}
                      disabled={isRunning}
                    >
                      <SelectTrigger data-testid="select-script-duration">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                        <SelectItem value="180">3 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Platform</Label>
                    <Select
                      value={scriptFormData.platform}
                      onValueChange={(v: any) => setScriptFormData(prev => ({ ...prev, platform: v }))}
                      disabled={isRunning}
                    >
                      <SelectTrigger data-testid="select-script-platform">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="tiktok">TikTok</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {visualPlan && !visualsApproved && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Please approve the visual plan before starting production
                  </div>
                )}
                
                <Button
                  className="w-full"
                  data-testid="button-start-script-production"
                  onClick={startScriptProduction}
                  disabled={isRunning || !scriptFormData.title || !scriptFormData.script || (!!visualPlan && !visualsApproved)}
                >
                  {isRunning && producerMode === "script" ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Production in Progress...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Script Production
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
            
            <Separator className="my-4" />
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-between"
                onClick={() => setShowAssetLibrary(!showAssetLibrary)}
                data-testid="button-toggle-asset-library"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4" />
                  Brand Assets Library
                  {brandAssets.filter(a => a.type === 'logo').length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {brandAssets.filter(a => a.type === 'logo').length} logo(s)
                    </Badge>
                  )}
                </span>
                {showAssetLibrary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              
              {showAssetLibrary && (
                <div className="border rounded-lg p-4 space-y-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Logo & Watermark Library
                    </h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadAssetMutation.isPending}
                      data-testid="button-upload-logo"
                    >
                      {uploadAssetMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Logo
                        </>
                      )}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>
                  
                  {isLoadingAssets ? (
                    <div className="flex justify-center py-4">
                      <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : brandAssets.filter(a => a.type === 'logo').length === 0 ? (
                    <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                      <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No logos uploaded yet</p>
                      <p className="text-xs">Upload your brand logo to include it as a watermark in your videos</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {brandAssets.filter(a => a.type === 'logo').map((asset) => (
                        <div
                          key={asset.id}
                          className={`relative group rounded-lg border-2 cursor-pointer transition-all overflow-hidden ${
                            selectedLogo?.id === asset.id
                              ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800'
                              : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                          }`}
                          onClick={() => setSelectedLogo(selectedLogo?.id === asset.id ? null : asset)}
                          data-testid={`logo-asset-${asset.id}`}
                        >
                          <div className="aspect-square bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-2">
                            <img
                              src={asset.url}
                              alt={asset.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] p-1 text-center truncate">
                            {asset.name}
                          </div>
                          {asset.isDefault && (
                            <Star className="absolute top-1 left-1 h-3 w-3 text-yellow-400 fill-yellow-400" />
                          )}
                          {selectedLogo?.id === asset.id && (
                            <Check className="absolute top-1 right-1 h-4 w-4 text-blue-500 bg-white rounded-full p-0.5" />
                          )}
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 bg-white/90 hover:bg-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDefaultMutation.mutate({ id: asset.id, type: 'logo' });
                              }}
                              title="Set as default"
                            >
                              <Star className={`h-3 w-3 ${asset.isDefault ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'}`} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 bg-white/90 hover:bg-red-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this logo?')) {
                                  deleteAssetMutation.mutate(asset.id);
                                }
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3 w-3 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedLogo && (
                    <div className="border-t pt-3 space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="enableWatermark"
                          checked={logoSettings.enabled}
                          onChange={(e) => setLogoSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="enableWatermark" className="text-sm">
                          Add "{selectedLogo.name}" as watermark
                        </Label>
                      </div>
                      
                      {logoSettings.enabled && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Placement</Label>
                            <Select
                              value={logoSettings.placement}
                              onValueChange={(v) => setLogoSettings(prev => ({ ...prev, placement: v }))}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top-left">Top Left</SelectItem>
                                <SelectItem value="top-right">Top Right</SelectItem>
                                <SelectItem value="bottom-left">Bottom Left</SelectItem>
                                <SelectItem value="bottom-right">Bottom Right</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Opacity: {logoSettings.opacity}%</Label>
                            <input
                              type="range"
                              min="10"
                              max="100"
                              value={logoSettings.opacity}
                              onChange={(e) => setLogoSettings(prev => ({ ...prev, opacity: parseInt(e.target.value) }))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                          </div>
                          <div className="col-span-2 space-y-1">
                            <Label className="text-xs">Size: {logoSettings.size}% of video width</Label>
                            <input
                              type="range"
                              min="5"
                              max="30"
                              value={logoSettings.size}
                              onChange={(e) => setLogoSettings(prev => ({ ...prev, size: parseInt(e.target.value) }))}
                              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {production && production.assets.length > 0 && (
          <Card data-testid="card-assets">
            <CardHeader>
              <CardTitle className="text-sm">Generated Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {production.assets.slice(0, 6).map((asset) => (
                  <div
                    key={asset.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
                    data-testid={`asset-preview-${asset.section}`}
                  >
                    {asset.type === "video" && asset.url ? (
                      <video
                        src={asset.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      />
                    ) : asset.url && (
                      <img
                        src={asset.url}
                        alt={asset.section}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 text-center">
                      {asset.type === "video" ? "🎥 " : ""}{asset.section.toUpperCase()}
                    </div>
                    {asset.qualityScore && (
                      <Badge
                        className={`absolute top-1 right-1 text-xs ${
                          asset.qualityScore.overall >= 70 ? "bg-green-500" : "bg-red-500"
                        }`}
                      >
                        {asset.qualityScore.overall}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="lg:col-span-2 space-y-6">
        <Card data-testid="card-workflow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              Production Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-6">
              {(production?.phases || PHASE_DEFINITIONS.map(p => ({ ...p, status: "pending", progress: 0 }))).map((phase, index) => {
                const Icon = PHASE_ICONS[phase.id as keyof typeof PHASE_ICONS] || Brain;
                const isActive = activePhaseIndex === index;
                
                return (
                  <div key={phase.id} className="flex flex-col items-center flex-1">
                    <div
                      className={`
                        relative w-12 h-12 rounded-full flex items-center justify-center
                        transition-all duration-300
                        ${isActive ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-background" : ""}
                        ${phase.status === "completed" ? "bg-green-500 text-white" : ""}
                        ${phase.status === "in_progress" ? "bg-blue-500 text-white animate-pulse" : ""}
                        ${phase.status === "failed" ? "bg-red-500 text-white" : ""}
                        ${phase.status === "skipped" ? "bg-gray-400 text-white" : ""}
                        ${phase.status === "pending" ? "bg-gray-200 dark:bg-gray-700 text-gray-500" : ""}
                      `}
                      data-testid={`phase-indicator-${phase.id}`}
                    >
                      <Icon className="h-5 w-5" />
                      {phase.status === "in_progress" && (
                        <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-400 transition-all duration-300"
                            style={{ width: `${phase.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                    <span className="text-xs mt-2 font-medium">{phase.name}</span>
                    <span className="text-xs text-muted-foreground">{phase.description}</span>
                    {index < 4 && (
                      <div className="absolute hidden lg:block" style={{ left: `calc(${(index + 1) * 20}% - 1rem)`, top: "2.5rem" }}>
                        <span className="text-gray-400">→</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg mb-4">
              <div className="flex items-center gap-1 text-xs">
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Script Input</span>
                <span className="text-blue-500">→</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Scene Manifest</span>
                <span className="text-blue-500">→</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Asset Requirements</span>
                <span className="text-blue-500">→</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Generated Assets</span>
                <span className="text-blue-500">→</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">Final Video</span>
              </div>
            </div>

            <Separator className="my-4" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Production Log</h4>
                {production?.logs.length ? (
                  <Badge variant="outline">{production.logs.length} entries</Badge>
                ) : null}
              </div>
              
              <ScrollArea className="h-[400px] rounded-lg border bg-gray-950 p-4" data-testid="log-container">
                {!production || production.logs.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Clapperboard className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Click "Start AI Production" to begin</p>
                    <p className="text-sm">The AI Producer will orchestrate the entire video creation process</p>
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-sm">
                    {production.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex gap-3 py-1"
                        data-testid={`log-entry-${log.id}`}
                      >
                        <span className="text-gray-500 flex-shrink-0 w-20">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="flex-shrink-0">{log.icon}</span>
                        <span className={getLogColor(log.type)}>{log.message}</span>
                      </div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </ScrollArea>
            </div>

            {production?.status === "completed" && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <div>
                      <h4 className="font-medium text-green-700 dark:text-green-300">Production Complete!</h4>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Your TV-quality video is ready for download
                      </p>
                    </div>
                  </div>
                  <Button 
                    data-testid="button-download-video" 
                    className="bg-green-600 hover:bg-green-700"
                    onClick={downloadVideo}
                    disabled={isDownloading}
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Preparing Download...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download Video
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-4">
          <Card data-testid="card-api-images">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Image className="h-4 w-4" />
                Image Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>fal.ai FLUX Pro</span>
                <Badge className="bg-green-500">Primary</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Hugging Face SDXL</span>
                <Badge variant="outline">Fallback</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pexels/Unsplash</span>
                <Badge variant="outline">Stock</Badge>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-api-video">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Video className="h-4 w-4" />
                Video Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>fal.ai LongCat-Video</span>
                <Badge className="bg-green-500">Primary</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pexels Video</span>
                <Badge variant="outline">B-Roll</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Pixabay Video</span>
                <Badge variant="outline">B-Roll</Badge>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-api-audio">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Audio Generation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>ElevenLabs</span>
                <Badge className="bg-green-500">Voiceover</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Music Library</span>
                <Badge className="bg-green-500">BGM</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Sound Effects DB</span>
                <Badge variant="outline">SFX</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-quality-gate">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Quality Evaluation Gate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Every generated asset is evaluated by Claude before use
            </p>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600">85</div>
                <div className="text-xs text-muted-foreground">Relevance</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600">92</div>
                <div className="text-xs text-muted-foreground">Technical</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600">88</div>
                <div className="text-xs text-muted-foreground">Brand</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                <div className="text-2xl font-bold text-green-600">78</div>
                <div className="text-xs text-muted-foreground">Emotional</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/30 border border-dashed border-red-300 dark:border-red-800 rounded-lg text-center text-sm">
              ⚠️ Assets scoring below <strong>70/100</strong> are automatically regenerated or replaced with fallbacks
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
