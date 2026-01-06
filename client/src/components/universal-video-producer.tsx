import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { VoiceSelector } from "./voice-selector";
import { QualityReport } from "./quality-report";
import { QADashboard } from "./qa-dashboard";
import { BrandSettingsPanel, BrandSettings as UIBrandSettings } from "./brand-settings-panel";
import { MusicStyleSelector } from "./music-style-selector";
import { ProviderSelector, getRecommendedProvider, getProviderName, VIDEO_PROVIDERS, IMAGE_PROVIDERS } from "./provider-selector";
import { getAvailableStyles } from "@shared/visual-style-config";
import { ContentTypeSelector, ContentType, getContentTypeIcon } from "./content-type-selector";
import { GenerationPreviewPanel } from "./generation-preview-panel";
import { OverlayEditor, OverlayConfig, defaultOverlayConfig, getDefaultOverlayConfig } from "./overlay-editor";
import { OverlayPreview } from "./overlay-preview";
import { BrandMediaSelector, BrandAsset } from "./brand-media-selector";
import type { AnimationSettings } from "@shared/video-types";
import { 
  Video, Package, FileText, Play, Sparkles, AlertTriangle,
  CheckCircle, Clock, Loader2, ImageIcon, Volume2, Clapperboard,
  Download, RefreshCw, Settings, ChevronDown, ChevronUp, Upload, X, Star,
  FolderOpen, Plus, Eye, Layers, Pencil, Save, Music, Mic, VolumeX,
  Undo2, Redo2, GripVertical, ThumbsUp, ThumbsDown, XCircle, ShieldCheck, Copy
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { 
  VideoProject as SharedVideoProject, 
  Scene as SharedScene,
  ProductImage as SharedProductImage,
  ServiceFailure,
  VideoProjectStatus
} from "@shared/video-types";
import { SCENE_OVERLAY_DEFAULTS } from "@shared/video-types";

interface ProductImage extends SharedProductImage {
  _blobUrl?: string;
}

type WorkflowType = "product" | "script";

type Scene = SharedScene;

interface VideoProject extends SharedVideoProject {
  assets: SharedVideoProject['assets'] & {
    productImages: ProductImage[];
  };
}

interface ProductFormData {
  productName: string;
  productDescription: string;
  targetAudience: string;
  benefits: string[];
  duration: 30 | 60 | 90;
  platform: "youtube" | "tiktok" | "instagram" | "facebook" | "website";
  style: "professional" | "friendly" | "energetic" | "calm";
  callToAction: string;
  voiceId?: string;
  voiceName?: string;
}

interface ScriptFormData {
  title: string;
  script: string;
  platform: "youtube" | "tiktok" | "instagram" | "facebook" | "website";
  style: "professional" | "casual" | "energetic" | "calm" | "cinematic" | "documentary";
  brandSettings?: UIBrandSettings;
}

const STEP_ICONS: Record<string, any> = {
  script: FileText,
  voiceover: Volume2,
  images: ImageIcon,
  videos: Video,
  music: Clapperboard,
  assembly: Sparkles,
  qa: ShieldCheck,
  rendering: Play,
};

function convertToDisplayUrl(url: string): string {
  if (!url) return '';
  
  if (url.startsWith('http')) return url;
  
  if (url.startsWith('/objects')) return url;
  
  // API URLs (like /api/brand-assets/file/7) should be used as-is
  if (url.startsWith('/api/')) return url;
  
  if (url.startsWith('/replit-objstore-')) {
    return `/objects${url}`;
  }
  
  let normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `/objects${normalizedPath}`;
}

function getImageDisplayUrl(image: ProductImage): string {
  if (image._blobUrl) return image._blobUrl;
  return convertToDisplayUrl(image.url);
}

// Phase 9A: Quality score and status helper functions
function getScoreColor(score: number): string {
  if (score >= 85) return 'bg-green-100 text-green-700';
  if (score >= 70) return 'bg-yellow-100 text-yellow-700';
  if (score >= 50) return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

function getProviderDisplayName(provider: string | undefined): string | null {
  if (!provider) return null;
  const providerNames: Record<string, string> = {
    'kling': 'Kling 1.6',
    'kling-1.6': 'Kling 1.6',
    'runway': 'Runway',
    'luma': 'Luma',
    'hailuo': 'Hailuo',
    'flux': 'Flux.1',
    'flux-pro': 'Flux.1',
    'falai': 'fal.ai',
    'fal.ai': 'fal.ai',
  };
  return providerNames[provider.toLowerCase()] || provider;
}

function getProviderBadgeStyle(provider: string | undefined): string {
  if (!provider) return 'bg-gray-100 text-gray-600';
  const providerStyles: Record<string, string> = {
    'kling': 'bg-purple-100 text-purple-700',
    'kling-1.6': 'bg-purple-100 text-purple-700',
    'runway': 'bg-blue-100 text-blue-700',
    'luma': 'bg-pink-100 text-pink-700',
    'hailuo': 'bg-teal-100 text-teal-700',
    'flux': 'bg-orange-100 text-orange-700',
    'flux-pro': 'bg-orange-100 text-orange-700',
    'falai': 'bg-indigo-100 text-indigo-700',
    'fal.ai': 'bg-indigo-100 text-indigo-700',
    'pexels': 'bg-green-100 text-green-700',
    'unsplash': 'bg-gray-100 text-gray-700',
  };
  return providerStyles[provider.toLowerCase()] || 'bg-gray-100 text-gray-600';
}

function ProductImageUpload({
  projectId,
  images,
  onImagesChange,
}: {
  projectId: string | null;
  images: ProductImage[];
  onImagesChange: (images: ProductImage[]) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    
    const newImages: ProductImage[] = [];
    const startingCount = images.length;
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const uploadUrlRes = await apiRequest("POST", "/api/universal-video/upload-url");
        const uploadUrlData = await uploadUrlRes.json();
        
        if (!uploadUrlData.success) {
          throw new Error(uploadUrlData.error || "Failed to get upload URL");
        }

        const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file");
        }

        if (projectId) {
          const addImageRes = await apiRequest("POST", `/api/universal-video/projects/${projectId}/product-images`, {
            objectPath: uploadUrlData.objectPath,
            name: file.name,
            isPrimary: startingCount + newImages.length === 0,
          });
          const addImageData = await addImageRes.json();
          
          if (addImageData.success) {
            newImages.push(addImageData.image);
          }
        } else {
          const tempImage: ProductImage = {
            id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: uploadUrlData.objectPath,
            name: file.name,
            isPrimary: startingCount + newImages.length === 0,
            _blobUrl: URL.createObjectURL(file),
          };
          newImages.push(tempImage);
        }
      } catch (error: any) {
        toast({
          title: "Upload Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }

    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
      toast({
        title: "Images Uploaded",
        description: `${newImages.length} image${newImages.length > 1 ? 's' : ''} added successfully.`,
      });
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = async (imageId: string) => {
    if (projectId) {
      try {
        const res = await apiRequest("DELETE", `/api/universal-video/projects/${projectId}/product-images/${imageId}`);
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error);
        }
      } catch (error: any) {
        toast({
          title: "Delete Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }
    }
    
    const newImages = images.filter(img => img.id !== imageId);
    if (images.find(img => img.id === imageId)?.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    onImagesChange(newImages);
  };

  const setPrimary = (imageId: string) => {
    const newImages = images.map(img => ({
      ...img,
      isPrimary: img.id === imageId,
    }));
    onImagesChange(newImages);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Product Images (Optional)</Label>
        <Badge variant="outline" className="text-xs">
          {images.length} image{images.length !== 1 ? 's' : ''} uploaded
        </Badge>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Upload photos of your product. These will be used in scenes where your product appears. 
        AI will generate lifestyle imagery for other scenes.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        data-testid="input-product-images"
      />
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {images.map((image) => (
          <div 
            key={image.id} 
            className="relative group aspect-square rounded-lg overflow-hidden border checkerboard-bg"
          >
            <img
              src={getImageDisplayUrl(image)}
              alt={image.name}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:text-yellow-400"
                onClick={() => setPrimary(image.id)}
                data-testid={`button-set-primary-${image.id}`}
              >
                <Star className={`w-4 h-4 ${image.isPrimary ? 'fill-yellow-400 text-yellow-400' : ''}`} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-white hover:text-red-400"
                onClick={() => removeImage(image.id)}
                data-testid={`button-remove-image-${image.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            {image.isPrimary && (
              <Badge className="absolute top-1 left-1 text-xs bg-yellow-500">
                Primary
              </Badge>
            )}
          </div>
        ))}
        
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
          data-testid="button-upload-image"
        >
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span className="text-xs">Add Image</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ProductVideoForm({ 
  onSubmit, 
  isLoading 
}: { 
  onSubmit: (data: ProductFormData & { productImages?: ProductImage[] }) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<ProductFormData>({
    productName: "",
    productDescription: "",
    targetAudience: "",
    benefits: [""],
    duration: 60,
    platform: "youtube",
    style: "professional",
    callToAction: "Visit pinehillfarm.com",
    voiceId: "21m00Tcm4TlvDq8ikWAM",  // Rachel - default
    voiceName: "Rachel",
  });
  const [productImages, setProductImages] = useState<ProductImage[]>([]);

  const addBenefit = () => {
    setFormData(prev => ({
      ...prev,
      benefits: [...prev.benefits, ""]
    }));
  };

  const updateBenefit = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => i === index ? value : b)
    }));
  };

  const removeBenefit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = () => {
    const filteredBenefits = formData.benefits.filter(b => b.trim());
    if (filteredBenefits.length === 0) {
      return;
    }
    onSubmit({ ...formData, benefits: filteredBenefits, productImages });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="productName">Product Name</Label>
          <Input
            id="productName"
            data-testid="input-product-name"
            placeholder="e.g., Weight Loss Support Capsules"
            value={formData.productName}
            onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetAudience">Target Audience</Label>
          <Input
            id="targetAudience"
            data-testid="input-target-audience"
            placeholder="e.g., Health-conscious adults 35-55"
            value={formData.targetAudience}
            onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="productDescription">Product Description</Label>
        <Textarea
          id="productDescription"
          data-testid="textarea-product-description"
          placeholder="Describe your product's features and benefits..."
          value={formData.productDescription}
          onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Key Benefits</Label>
        {formData.benefits.map((benefit, index) => (
          <div key={index} className="flex gap-2">
            <Input
              data-testid={`input-benefit-${index}`}
              placeholder={`Benefit ${index + 1}`}
              value={benefit}
              onChange={(e) => updateBenefit(index, e.target.value)}
            />
            {formData.benefits.length > 1 && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => removeBenefit(index)}
                data-testid={`button-remove-benefit-${index}`}
              >
                ×
              </Button>
            )}
          </div>
        ))}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addBenefit}
          data-testid="button-add-benefit"
        >
          + Add Benefit
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Video Duration</Label>
          <Select
            value={String(formData.duration)}
            onValueChange={(val) => setFormData(prev => ({ ...prev, duration: Number(val) as 30 | 60 | 90 }))}
          >
            <SelectTrigger data-testid="select-duration">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">60 seconds</SelectItem>
              <SelectItem value="90">90 seconds</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Platform</Label>
          <Select
            value={formData.platform}
            onValueChange={(val) => setFormData(prev => ({ ...prev, platform: val as any }))}
          >
            <SelectTrigger data-testid="select-platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="website">Website</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Style</Label>
          <Select
            value={formData.style}
            onValueChange={(val) => setFormData(prev => ({ ...prev, style: val as any }))}
          >
            <SelectTrigger data-testid="select-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="energetic">Energetic</SelectItem>
              <SelectItem value="calm">Calm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="callToAction">Call to Action</Label>
        <Input
          id="callToAction"
          data-testid="input-cta"
          placeholder="e.g., Visit pinehillfarm.com today!"
          value={formData.callToAction}
          onChange={(e) => setFormData(prev => ({ ...prev, callToAction: e.target.value }))}
        />
      </div>

      <Separator className="my-4" />

      <VoiceSelector
        selectedVoiceId={formData.voiceId}
        onSelect={(voiceId, voiceName) => 
          setFormData(prev => ({ ...prev, voiceId, voiceName }))
        }
      />

      <Separator className="my-4" />

      <ProductImageUpload
        projectId={null}
        images={productImages}
        onImagesChange={setProductImages}
      />

      <Button 
        className="w-full" 
        onClick={handleSubmit}
        disabled={isLoading || !formData.productName || !formData.productDescription}
        data-testid="button-create-project"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Creating Project...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Create Product Video
          </>
        )}
      </Button>
    </div>
  );
}

function ScriptVideoForm({
  onSubmit,
  isLoading
}: {
  onSubmit: (data: ScriptFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<ScriptFormData>({
    title: "",
    script: "",
    platform: "youtube",
    style: "professional",
  });

  const [brandSettings, setBrandSettings] = useState<UIBrandSettings>({
    includeIntroLogo: true,
    includeWatermark: true,
    includeCTAOutro: true,
    watermarkPosition: 'bottom-right',
    watermarkOpacity: 0.7,
  });

  const [musicEnabled, setMusicEnabled] = useState(true);
  const [musicMood, setMusicMood] = useState<string>('');
  
  const visualStyles = getAvailableStyles();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Video Title</Label>
        <Input
          id="title"
          data-testid="input-script-title"
          placeholder="e.g., Weight Loss: The Hidden Toxin Connection"
          value={formData.title}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="script">Full Script</Label>
        <Textarea
          id="script"
          data-testid="textarea-script"
          placeholder="Paste your full video script here..."
          value={formData.script}
          onChange={(e) => setFormData(prev => ({ ...prev, script: e.target.value }))}
          rows={10}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Word count: {formData.script.split(/\s+/).filter(Boolean).length} | 
          Estimated duration: {Math.ceil(formData.script.split(/\s+/).filter(Boolean).length / 2.5)} seconds
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select
            value={formData.platform}
            onValueChange={(val) => setFormData(prev => ({ ...prev, platform: val as any }))}
          >
            <SelectTrigger data-testid="select-script-platform">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="tiktok">TikTok</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="website">Website</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 col-span-2">
          <Label>Visual Style</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {visualStyles.map((style) => (
              <button
                key={style.id}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, style: style.id as any }))}
                className={`
                  p-3 rounded-lg border text-left transition-all
                  ${formData.style === style.id 
                    ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                    : 'border-gray-200 hover:border-gray-300'}
                `}
                data-testid={`button-style-${style.id}`}
              >
                <p className="font-medium text-sm">{style.name}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {style.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Music Style Selector (Phase 5B) */}
      <MusicStyleSelector
        enabled={musicEnabled}
        onEnabledChange={setMusicEnabled}
        visualStyle={formData.style}
        customMood={musicMood}
        onMoodChange={setMusicMood}
      />

      {/* Brand Settings Panel (Phase 5A) */}
      <BrandSettingsPanel
        settings={brandSettings}
        onSettingsChange={setBrandSettings}
        defaultExpanded={false}
      />

      <Button 
        className="w-full" 
        onClick={() => onSubmit({ ...formData, brandSettings, musicEnabled, musicMood } as any)}
        disabled={isLoading || !formData.title || formData.script.length < 50}
        data-testid="button-parse-script"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Parsing Script...
          </>
        ) : (
          <>
            <FileText className="w-4 h-4 mr-2" />
            Parse Script & Create Project
          </>
        )}
      </Button>
    </div>
  );
}

type StepKey = keyof typeof STEP_ICONS;

interface QAReportSummary {
  overallScore: number;
  approvedCount: number;
  needsReviewCount: number;
  rejectedCount: number;
}

interface ProgressTrackerProps {
  project: VideoProject;
  qaScore?: number;
  qaStatus?: 'pending' | 'analyzing' | 'completed';
  qaReport?: QAReportSummary;
  onQAClick?: () => void;
}

function getQAScoreLabel(score: number): string {
  if (score >= 85) return 'Passed';
  if (score >= 70) return 'Review';
  return 'Issues';
}

function getQAScoreColors(score: number) {
  if (score >= 85) return { bg: 'bg-green-500', text: 'text-white', label: 'text-green-600' };
  if (score >= 70) return { bg: 'bg-yellow-500', text: 'text-white', label: 'text-yellow-600' };
  return { bg: 'bg-red-500', text: 'text-white', label: 'text-red-600' };
}

function ProgressTracker({ project, qaScore, qaStatus = 'pending', qaReport, onQAClick }: ProgressTrackerProps) {
  const steps: StepKey[] = ["script", "voiceover", "images", "videos", "music", "assembly", "qa", "rendering"];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Overall Progress</span>
        <span className="text-sm text-muted-foreground">{project.progress.overallPercent}%</span>
      </div>
      <Progress value={project.progress.overallPercent} className="h-2" />
      
      <div className="grid grid-cols-8 gap-1 mt-4">
        {steps.map((step) => {
          const isQA = step === 'qa';
          const Icon = STEP_ICONS[step] || Settings;
          
          // Handle QA step separately
          if (isQA) {
            const qaIsCompleted = qaStatus === 'completed' && qaScore !== undefined;
            const qaIsAnalyzing = qaStatus === 'analyzing';
            const scoreColors = qaScore !== undefined ? getQAScoreColors(qaScore) : null;
            
            const qaStepContent = (
              <div 
                className={`flex flex-col items-center ${onQAClick ? 'cursor-pointer hover:opacity-80' : ''}`}
                onClick={onQAClick}
                data-testid="step-qa"
              >
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center mb-1 border-2
                  ${qaIsCompleted && scoreColors ? `${scoreColors.bg} border-current` :
                    qaIsAnalyzing ? 'bg-blue-100 text-blue-600 border-blue-500' :
                    'bg-gray-100 text-gray-400 border-gray-300'}
                `}>
                  {qaIsCompleted && qaScore !== undefined ? (
                    <span className={`text-xs font-bold ${scoreColors?.text}`}>{qaScore}</span>
                  ) : qaIsAnalyzing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                </div>
                <span className={`text-[10px] text-center capitalize ${
                  qaIsCompleted && scoreColors ? scoreColors.label :
                  qaIsAnalyzing ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {step}
                </span>
                {qaIsCompleted && qaScore !== undefined && (
                  <span className={`text-[9px] ${scoreColors?.label}`}>
                    {getQAScoreLabel(qaScore)}
                  </span>
                )}
              </div>
            );
            
            // Wrap with HoverCard if completed with report
            if (qaIsCompleted && qaReport) {
              return (
                <HoverCard key={step} openDelay={200}>
                  <HoverCardTrigger asChild>
                    {qaStepContent}
                  </HoverCardTrigger>
                  <HoverCardContent className="w-64" side="bottom">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Quality Score</span>
                        <span className={`font-bold text-lg ${
                          qaScore >= 85 ? 'text-green-600' :
                          qaScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {qaScore}/100
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1.5">
                        <div className="flex justify-between">
                          <span>Approved:</span>
                          <span className="text-green-600 font-medium">{qaReport.approvedCount} scenes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Needs Review:</span>
                          <span className="text-yellow-600 font-medium">{qaReport.needsReviewCount} scenes</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Rejected:</span>
                          <span className="text-red-600 font-medium">{qaReport.rejectedCount} scenes</span>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200">
                        <span className="text-xs text-blue-600">Click to open QA Dashboard</span>
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              );
            }
            
            return <div key={step}>{qaStepContent}</div>;
          }
          
          // Regular steps
          const stepData = project.progress.steps[step as keyof typeof project.progress.steps];
          if (!stepData) return null;
          
          return (
            <div key={step} className="flex flex-col items-center" data-testid={`step-${step}`}>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center mb-1
                ${stepData.status === 'complete' ? 'bg-green-100 text-green-600' :
                  stepData.status === 'in-progress' ? 'bg-blue-100 text-blue-600' :
                  stepData.status === 'error' ? 'bg-red-100 text-red-600' :
                  stepData.status === 'skipped' ? 'bg-gray-100 text-gray-400' :
                  'bg-gray-100 text-gray-400'}
              `}>
                {stepData.status === 'in-progress' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : stepData.status === 'complete' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Icon className="w-4 h-4" />
                )}
              </div>
              <span className="text-[10px] text-center capitalize">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MUSIC_STYLES = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'energetic', label: 'Energetic' },
  { value: 'calm', label: 'Calm' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'health', label: 'Health' },
];

// Phase 4: Undo/Redo Controls Component
function UndoRedoControls({ 
  projectId,
  onProjectUpdate,
  refreshKey
}: { 
  projectId: string;
  onProjectUpdate: (project: VideoProject) => void;
  refreshKey?: number;
}) {
  const { toast } = useToast();
  const [historyStatus, setHistoryStatus] = useState<{
    canUndo: boolean;
    canRedo: boolean;
    undoAction?: string;
    redoAction?: string;
  }>({ canUndo: false, canRedo: false });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch history status
  const fetchHistoryStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/universal-video/${projectId}/history`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        setHistoryStatus({
          canUndo: data.canUndo,
          canRedo: data.canRedo,
          undoAction: data.undoAction,
          redoAction: data.redoAction,
        });
      }
    } catch (err) {
      console.error('Failed to fetch history status:', err);
    }
  }, [projectId]);

  // Refresh on mount and when refreshKey changes
  useEffect(() => {
    fetchHistoryStatus();
  }, [fetchHistoryStatus, refreshKey]);

  const handleUndo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/undo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Undone: ${data.undoneAction}` });
        if (data.project) onProjectUpdate(data.project);
        if (data.historyStatus) {
          setHistoryStatus({
            canUndo: data.historyStatus.canUndo,
            canRedo: data.historyStatus.canRedo,
            undoAction: data.historyStatus.undoAction,
            redoAction: data.historyStatus.redoAction,
          });
        }
      } else {
        toast({ title: 'Cannot undo', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedo = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/redo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: `Redone: ${data.redoneAction}` });
        if (data.project) onProjectUpdate(data.project);
        if (data.historyStatus) {
          setHistoryStatus({
            canUndo: data.historyStatus.canUndo,
            canRedo: data.historyStatus.canRedo,
            undoAction: data.historyStatus.undoAction,
            redoAction: data.historyStatus.redoAction,
          });
        }
      } else {
        toast({ title: 'Cannot redo', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          if (historyStatus.canRedo) handleRedo();
        } else {
          e.preventDefault();
          if (historyStatus.canUndo) handleUndo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStatus.canUndo, historyStatus.canRedo]);

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleUndo}
        disabled={!historyStatus.canUndo || isLoading}
        title={historyStatus.undoAction ? `Undo: ${historyStatus.undoAction} (Ctrl+Z)` : 'Nothing to undo'}
        data-testid="button-undo"
      >
        <Undo2 className="h-4 w-4" />
        <span className="sr-only">Undo</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleRedo}
        disabled={!historyStatus.canRedo || isLoading}
        title={historyStatus.redoAction ? `Redo: ${historyStatus.redoAction} (Ctrl+Shift+Z)` : 'Nothing to redo'}
        data-testid="button-redo"
      >
        <Redo2 className="h-4 w-4" />
        <span className="sr-only">Redo</span>
      </Button>
    </div>
  );
}

function MusicControlsPanel({ 
  projectId, 
  musicVolume, 
  onUpdate 
}: { 
  projectId: string; 
  musicVolume: number; 
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [volume, setVolume] = useState(Math.round(musicVolume * 100));
  const [selectedStyle, setSelectedStyle] = useState('professional');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isUpdatingVolume, setIsUpdatingVolume] = useState(false);

  const handleVolumeChange = async (newValue: number[]) => {
    const volumePercent = newValue[0];
    setVolume(volumePercent);
  };

  const handleVolumeCommit = async () => {
    setIsUpdatingVolume(true);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/music-volume`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ volume: volume / 100 })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Volume updated' });
        onUpdate();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdatingVolume(false);
    }
  };

  const handleRegenerateMusic = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/regenerate-music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ style: selectedStyle })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Music regenerated', description: 'New background music has been generated.' });
        onUpdate();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Music className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium whitespace-nowrap">Music Controls</span>
        </div>
        
        <div className="flex items-center gap-2 flex-1">
          <VolumeX className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[volume]}
            onValueChange={handleVolumeChange}
            onValueCommit={handleVolumeCommit}
            min={0}
            max={100}
            step={5}
            className="w-24"
            data-testid="slider-music-volume"
          />
          <span className="text-xs text-muted-foreground w-8">{volume}%</span>
        </div>
        
        <Select value={selectedStyle} onValueChange={setSelectedStyle}>
          <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-music-style">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MUSIC_STYLES.map(style => (
              <SelectItem key={style.value} value={style.value}>
                {style.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleRegenerateMusic}
          disabled={isRegenerating}
          data-testid="button-regenerate-music"
        >
          {isRegenerating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
        </Button>
        
        {isUpdatingVolume && (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        )}
      </div>
    </Card>
  );
}

const VOICE_OPTIONS = [
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Warm & calm - ideal for wellness' },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', description: 'Soft & friendly' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Warm British accent' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep & trustworthy male' },
  { id: 'GBv7mTt0atIp3Br8iCZE', name: 'Thomas', description: 'Calm & professional male' },
  { id: 'Yko7PKHZNXotIFUBG7I9', name: 'Aria', description: 'Expressive female' },
  { id: 'jsCqWAovK2LkecY7zXl4', name: 'Freya', description: 'Young & warm' },
  { id: 'oWAxZDx7w5VEj9dCyTzz', name: 'Grace', description: 'Mature & comforting' },
  { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'British authoritative' },
  { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', description: 'Hoarse & mature' },
  { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual Australian' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', description: 'Young American male' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', description: 'Young & friendly' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', description: 'Expressive American' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', description: 'Upbeat American' },
  { id: 'XrExE9yKIg1WjnnlVkGX', name: 'Matilda', description: 'Warm Australian' },
  { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', description: 'Warm British' },
  { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River', description: 'Non-binary American' },
  { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', description: 'Confident American male' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', description: 'Deep American male' },
];

function VoiceoverControlsPanel({ 
  projectId, 
  currentVoiceId,
  currentVoiceName,
  onUpdate 
}: { 
  projectId: string; 
  currentVoiceId?: string;
  currentVoiceName?: string;
  onUpdate: () => void;
}) {
  const { toast } = useToast();
  const [selectedVoiceId, setSelectedVoiceId] = useState(currentVoiceId || '21m00Tcm4TlvDq8ikWAM');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const selectedVoice = VOICE_OPTIONS.find(v => v.id === selectedVoiceId) || VOICE_OPTIONS[0];

  const handleRegenerateVoiceover = async () => {
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/regenerate-voiceover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ voiceId: selectedVoiceId })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Voiceover regenerated', description: 'New voiceover has been generated with the selected voice.' });
        onUpdate();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card className="p-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium whitespace-nowrap">Voiceover</span>
        </div>
        
        <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
          <SelectTrigger className="flex-1 h-8 text-xs" data-testid="select-voice">
            <SelectValue>
              {selectedVoice.name} - {selectedVoice.description}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {VOICE_OPTIONS.map(voice => (
              <SelectItem key={voice.id} value={voice.id}>
                <span className="font-medium">{voice.name}</span>
                <span className="text-muted-foreground ml-2">- {voice.description}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Button
          size="sm"
          onClick={handleRegenerateVoiceover}
          disabled={isRegenerating}
          data-testid="button-regenerate-voiceover"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-1" />
              Regenerate All
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function ServiceFailureAlert({ failures }: { failures: ServiceFailure[] }) {
  if (failures.length === 0) return null;
  
  const paidServiceFailures = failures.filter(f => 
    f.service === 'fal.ai' || f.service === 'elevenlabs'
  );
  
  if (paidServiceFailures.length === 0) return null;
  
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Paid Service Issues</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside mt-2">
          {paidServiceFailures.map((f, i) => (
            <li key={i} className="text-sm">
              <strong>{f.service}</strong>: {f.error}
              {f.fallbackUsed && <span className="text-muted-foreground"> (Used: {f.fallbackUsed})</span>}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

type OverlayPosition = { x: 'left' | 'center' | 'right'; y: 'top' | 'center' | 'bottom' };
type OverlayAnimation = 'fade' | 'zoom' | 'slide' | 'none';

function ScenePreview({ 
  scenes, 
  assets,
  projectId,
  projectTitle,
  onToggleProductOverlay,
  onSceneUpdate,
  onProjectUpdate
}: { 
  scenes: Scene[]; 
  assets: VideoProject['assets'];
  projectId?: string;
  projectTitle?: string;
  onToggleProductOverlay?: (sceneId: string, useOverlay: boolean) => void;
  onSceneUpdate?: () => void;
  onProjectUpdate?: (project: VideoProject) => void;
}) {
  const [sceneEditorOpen, setSceneEditorOpen] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<Record<string, string>>({});
  const [editingNarration, setEditingNarration] = useState<string | null>(null);
  const [editedNarration, setEditedNarration] = useState<Record<string, string>>({});
  const [savingNarration, setSavingNarration] = useState<string | null>(null);
  const [editingVisualDirection, setEditingVisualDirection] = useState<string | null>(null);
  const [editedVisualDirection, setEditedVisualDirection] = useState<Record<string, string>>({});
  const [editedSearchQueries, setEditedSearchQueries] = useState<Record<string, { searchQuery?: string; fallbackQuery?: string }>>({});
  const [savingVisualDirection, setSavingVisualDirection] = useState<string | null>(null);
  const [askingSuzzie, setAskingSuzzie] = useState<string | null>(null);
  const [savingOverlay, setSavingOverlay] = useState<string | null>(null);
  const [overlaySettings, setOverlaySettings] = useState<Record<string, {
    x: 'left' | 'center' | 'right';
    y: 'top' | 'center' | 'bottom';
    scale: number;
    animation: OverlayAnimation;
  }>>({});
  const [isReordering, setIsReordering] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState<string | null>(null);
  const [mediaPickerType, setMediaPickerType] = useState<'image' | 'video'>('image');
  const [mediaPickerSource, setMediaPickerSource] = useState<'brand' | 'library'>('brand');
  const [applyingMedia, setApplyingMedia] = useState<string | null>(null);
  const [brandMediaSelectorOpen, setBrandMediaSelectorOpen] = useState<string | null>(null);
  const [sceneActionPending, setSceneActionPending] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState<{ sceneIndex: number; sceneId: string } | null>(null);
  const [selectedProviders, setSelectedProviders] = useState<Record<string, string>>({});
  const [sceneMediaType, setSceneMediaType] = useState<Record<string, 'image' | 'video'>>({});
  const [rejectReason, setRejectReason] = useState('');
  const [sceneFilter, setSceneFilter] = useState<'all' | 'needs_review' | 'approved' | 'rejected'>('all');
  const [activeJobPolling, setActiveJobPolling] = useState<Record<string, { jobId: string; progress: number }>>({});
  const [overlayPreviewMode, setOverlayPreviewMode] = useState<Record<string, boolean>>({});
  const [previewOverlayConfig, setPreviewOverlayConfig] = useState<Record<string, OverlayConfig>>({});
  const pollingTimeoutRefs = useRef<Record<string, NodeJS.Timeout>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Cleanup polling timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingTimeoutRefs.current).forEach(timeout => clearTimeout(timeout));
      pollingTimeoutRefs.current = {};
    };
  }, []);
  
  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  
  // Handle drag end for scene reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !projectId) return;
    
    const oldIndex = scenes.findIndex(s => s.id === active.id);
    const newIndex = scenes.findIndex(s => s.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;
    
    // Calculate new order
    const newSceneOrder = arrayMove(scenes.map(s => s.id), oldIndex, newIndex);
    
    setIsReordering(true);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/reorder-scenes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sceneOrder: newSceneOrder })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Scenes reordered' });
        if (data.project) onProjectUpdate?.(data.project);
        onSceneUpdate?.();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsReordering(false);
    }
  };
  
  const getOverlaySettings = (scene: Scene) => {
    if (overlaySettings[scene.id]) {
      return overlaySettings[scene.id];
    }
    return {
      x: scene.assets?.productOverlayPosition?.x || 'center',
      y: scene.assets?.productOverlayPosition?.y || 'center',
      scale: scene.assets?.productOverlayPosition?.scale || 0.4,
      animation: scene.assets?.productOverlayPosition?.animation || 'fade'
    };
  };
  
  const updateLocalOverlay = (sceneId: string, updates: Partial<typeof overlaySettings[string]>) => {
    setOverlaySettings(prev => ({
      ...prev,
      [sceneId]: { ...getOverlaySettings(scenes.find(s => s.id === sceneId)!), ...updates }
    }));
  };

  const updateProductOverlay = async (
    sceneId: string, 
    settings: { 
      position?: OverlayPosition; 
      scale?: number; 
      animation?: OverlayAnimation;
      enabled?: boolean;
    }
  ) => {
    if (!projectId) return;
    setSavingOverlay(sceneId);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/scenes/${sceneId}/product-overlay`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Overlay updated' });
        if (data.project) {
          onProjectUpdate?.(data.project);
        }
        onSceneUpdate?.();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingOverlay(null);
    }
  };
  
  // Phase 9A: Scene approval, rejection, and regeneration handlers
  const handleSceneApprove = async (sceneIndex: number) => {
    if (!projectId) return;
    const scene = scenes[sceneIndex];
    if (!scene) return;
    
    setSceneActionPending(scene.id);
    try {
      const res = await fetch(`/api/universal-video/projects/${projectId}/scenes/${sceneIndex}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Scene Approved', description: 'Scene manually approved for final render.' });
        queryClient.invalidateQueries({ queryKey: ['/api/universal-video', projectId] });
        onSceneUpdate?.();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSceneActionPending(null);
    }
  };
  
  const handleSceneReject = async (sceneIndex: number, reason: string) => {
    if (!projectId) return;
    const scene = scenes[sceneIndex];
    if (!scene) return;
    
    setSceneActionPending(scene.id);
    try {
      const res = await fetch(`/api/universal-video/projects/${projectId}/scenes/${sceneIndex}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Scene Rejected', description: 'Scene marked for regeneration.' });
        queryClient.invalidateQueries({ queryKey: ['/api/universal-video', projectId] });
        onSceneUpdate?.();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSceneActionPending(null);
    }
  };
  
  const handleSceneRegenerate = async (sceneIndex: number) => {
    if (!projectId) return;
    const scene = scenes[sceneIndex];
    if (!scene) return;
    
    setSceneActionPending(scene.id);
    try {
      toast({ 
        title: 'Running Quality Analysis', 
        description: `Analyzing scene ${sceneIndex + 1} with Claude Vision...` 
      });
      
      const res = await fetch(`/api/universal-video/${projectId}/analyze-quality`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success) {
        const sceneResult = data.sceneReports?.[sceneIndex];
        const score = sceneResult?.analysis?.overallScore ?? data.overallScore ?? 0;
        toast({ 
          title: 'Quality Analysis Complete', 
          description: `Scene ${sceneIndex + 1} scored ${score}/100` 
        });
        queryClient.invalidateQueries({ queryKey: ['/api/universal-video', projectId] });
        onSceneUpdate?.();
      } else {
        toast({ 
          title: 'Analysis Failed', 
          description: data.error || 'Quality analysis failed. Please try again.', 
          variant: 'destructive' 
        });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSceneActionPending(null);
    }
  };

  const saveNarration = async (sceneId: string) => {
    if (!projectId) return;
    const newNarration = editedNarration[sceneId];
    if (!newNarration?.trim()) {
      toast({ title: 'Error', description: 'Narration cannot be empty', variant: 'destructive' });
      return;
    }
    setSavingNarration(sceneId);
    try {
      const res = await fetch(`/api/universal-video/projects/${projectId}/scenes/${sceneId}/narration`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ narration: newNarration })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Narration saved', description: 'Regenerate voiceover to update audio.' });
        setEditingNarration(null);
        if (data.project) {
          onProjectUpdate?.(data.project);
        }
        onSceneUpdate?.();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingNarration(null);
    }
  };

  const saveVisualDirection = async (sceneId: string) => {
    if (!projectId) return;
    const newVisualDirection = editedVisualDirection[sceneId];
    if (!newVisualDirection?.trim()) {
      toast({ title: 'Error', description: 'Visual direction cannot be empty', variant: 'destructive' });
      return;
    }
    setSavingVisualDirection(sceneId);
    try {
      // Include search queries if they were generated by Ask Suzzie
      const searchQueries = editedSearchQueries[sceneId] || {};
      const res = await fetch(`/api/universal-video/projects/${projectId}/scenes/${sceneId}/visual-direction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          visualDirection: newVisualDirection,
          searchQuery: searchQueries.searchQuery,
          fallbackQuery: searchQueries.fallbackQuery
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Visual direction saved', description: 'Regenerate image/video to apply changes.' });
        setEditingVisualDirection(null);
        // Clear the search queries state for this scene
        setEditedSearchQueries(prev => {
          const { [sceneId]: _, ...rest } = prev;
          return rest;
        });
        if (data.project) {
          onProjectUpdate?.(data.project);
        }
        onSceneUpdate?.();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSavingVisualDirection(null);
    }
  };

  // Ask Suzzie (Claude AI) to generate visual direction idea
  const askSuzzie = async (sceneId: string, narration: string, sceneType: string) => {
    if (!projectId) return;
    setAskingSuzzie(sceneId);
    try {
      const res = await fetch(`/api/universal-video/ask-suzzie`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          narration, 
          sceneType,
          projectTitle: projectTitle || 'Marketing Video'
        })
      });
      const data = await res.json();
      if (data.success && data.visualDirection) {
        // Put user into edit mode with the generated suggestion
        setEditingVisualDirection(sceneId);
        setEditedVisualDirection(prev => ({ ...prev, [sceneId]: data.visualDirection }));
        // Store the optimized search queries for when user saves
        if (data.searchQuery || data.fallbackQuery) {
          setEditedSearchQueries(prev => ({ 
            ...prev, 
            [sceneId]: { 
              searchQuery: data.searchQuery, 
              fallbackQuery: data.fallbackQuery 
            } 
          }));
        }
        toast({ 
          title: 'Suzzie has an idea!', 
          description: 'Review and edit the suggestion, then save.' 
        });
      } else {
        toast({ title: 'Failed', description: data.error || 'Could not generate suggestion', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setAskingSuzzie(null);
    }
  };

  const regenerateImage = async (sceneId: string, provider?: string) => {
    if (!projectId) return;
    setRegenerating(`image-${sceneId}`);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/scenes/${sceneId}/regenerate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          prompt: customPrompt[sceneId] || undefined,
          provider: provider || undefined 
        })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Image regenerated', description: `New image from ${data.source}` });
        if (data.project) {
          onProjectUpdate?.(data.project);
        }
        onSceneUpdate?.();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRegenerating(null);
    }
  };

  const regenerateVideo = async (sceneId: string, provider?: string) => {
    console.log('[regenerateVideo] FUNCTION CALLED with sceneId:', sceneId, 'provider:', provider, 'projectId:', projectId);
    if (!projectId) {
      console.error('[regenerateVideo] EARLY RETURN - projectId is undefined');
      toast({ title: 'Error', description: 'Project ID is missing', variant: 'destructive' });
      return;
    }
    console.log('[regenerateVideo] Setting regenerating state...');
    setRegenerating(`video-${sceneId}`);
    const url = `/api/universal-video/${projectId}/scenes/${sceneId}/regenerate-video`;
    const body = { 
      query: customPrompt[sceneId] || undefined,
      provider: provider || undefined 
    };
    console.log('[regenerateVideo] About to fetch:', url, 'with body:', JSON.stringify(body));
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      });
      console.log('[regenerateVideo] Fetch response status:', res.status);
      const data = await res.json();
      console.log('[regenerateVideo] Response data:', data);
      
      if (data.success && data.jobId) {
        toast({ 
          title: 'Video generation started', 
          description: 'This may take 3-5 minutes. Progress will update automatically.' 
        });
        
        // Track active job
        setActiveJobPolling(prev => ({ 
          ...prev, 
          [sceneId]: { jobId: data.jobId, progress: 0 } 
        }));
        
        // Clear any existing polling for this scene
        if (pollingTimeoutRefs.current[sceneId]) {
          clearTimeout(pollingTimeoutRefs.current[sceneId]);
        }
        
        // Start polling for job status
        const pollJobStatus = () => {
          const maxPolls = 120; // 10 minutes max (5 second intervals)
          let pollCount = 0;
          
          const cleanupPolling = () => {
            delete pollingTimeoutRefs.current[sceneId];
            setActiveJobPolling(prev => {
              const next = { ...prev };
              delete next[sceneId];
              return next;
            });
            setRegenerating(null);
          };
          
          const poll = async (): Promise<void> => {
            pollCount++;
            if (pollCount > maxPolls) {
              toast({ 
                title: 'Video generation timeout', 
                description: 'The job is taking longer than expected. It may still complete.', 
                variant: 'destructive' 
              });
              cleanupPolling();
              return;
            }
            
            try {
              const statusRes = await fetch(
                `/api/universal-video/${projectId}/scenes/${sceneId}/video-job/${data.jobId}`,
                { credentials: 'include' }
              );
              const statusData = await statusRes.json();
              
              if (statusData.success && statusData.job) {
                const job = statusData.job;
                console.log(`[regenerateVideo] Job ${data.jobId} status: ${job.status}, progress: ${job.progress}%`);
                
                // Update progress in state
                setActiveJobPolling(prev => ({ 
                  ...prev, 
                  [sceneId]: { jobId: data.jobId, progress: job.progress } 
                }));
                
                if (job.status === 'succeeded') {
                  toast({ title: 'Video generated successfully!' });
                  if (statusData.project) {
                    onProjectUpdate?.(statusData.project);
                  }
                  onSceneUpdate?.();
                  cleanupPolling();
                  return;
                } else if (job.status === 'failed') {
                  toast({ 
                    title: 'Video generation failed', 
                    description: job.errorMessage || 'Unknown error', 
                    variant: 'destructive' 
                  });
                  cleanupPolling();
                  return;
                } else if (job.status === 'cancelled') {
                  toast({ title: 'Video generation cancelled' });
                  cleanupPolling();
                  return;
                }
                
                // Still pending or running - continue polling with tracked timeout
                pollingTimeoutRefs.current[sceneId] = setTimeout(poll, 5000);
              } else {
                console.error('[regenerateVideo] Failed to get job status');
                pollingTimeoutRefs.current[sceneId] = setTimeout(poll, 5000);
              }
            } catch (pollErr) {
              console.error('[regenerateVideo] Poll error:', pollErr);
              pollingTimeoutRefs.current[sceneId] = setTimeout(poll, 5000);
            }
          };
          
          // Start polling after initial delay
          pollingTimeoutRefs.current[sceneId] = setTimeout(poll, 3000);
        };
        
        pollJobStatus();
      } else if (data.success && data.newVideoUrl) {
        // Fallback for direct response (legacy)
        toast({ title: 'Video regenerated', description: `New video from ${data.source}` });
        if (data.project) {
          onProjectUpdate?.(data.project);
        }
        onSceneUpdate?.();
        setRegenerating(null);
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
        setRegenerating(null);
      }
    } catch (err: any) {
      console.error('[regenerateVideo] FETCH ERROR:', err);
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      setRegenerating(null);
    }
  };

  const switchBackground = async (sceneId: string, preferVideo: boolean) => {
    if (!projectId) return;
    setRegenerating(`switch-${sceneId}`);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/scenes/${sceneId}/switch-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ preferVideo })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: preferVideo ? 'Switched to video' : 'Switched to image' });
        if (data.project) {
          onProjectUpdate?.(data.project);
        }
        onSceneUpdate?.();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setRegenerating(null);
    }
  };

  // Apply media from library/source to scene
  const applyMediaToScene = async (sceneId: string, mediaUrl: string, mediaType: 'image' | 'video', sourceName: string) => {
    if (!projectId) return;
    setApplyingMedia(sceneId);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/scenes/${sceneId}/set-media`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ mediaUrl, mediaType, source: sourceName })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Media applied', description: `Scene updated with ${sourceName} content.` });
        setMediaPickerOpen(null);
        // Update project immediately with returned data for instant UI refresh
        if (data.project) {
          onProjectUpdate?.(data.project);
        }
        onSceneUpdate?.();
      } else {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setApplyingMedia(null);
    }
  };
  
  // Phase 11D: Apply brand media with animation settings
  const applyBrandMedia = async (sceneId: string, asset: BrandAsset, animationSettings?: AnimationSettings) => {
    if (!projectId) return;
    setApplyingMedia(sceneId);
    try {
      const isVideo = ['video', 'broll', 'intro', 'outro'].includes(asset.mediaType);
      
      // Find the current scene to preserve all non-media-url fields
      const currentScene = scenes.find(s => s.id === sceneId);
      const existingAssets = currentScene?.assets ? { ...currentScene.assets } : {};
      
      // Clone existing assets and only modify media-related keys
      const updatedAssets = { ...existingAssets };
      
      if (isVideo) {
        // Set video, clear image fields
        updatedAssets.videoUrl = asset.url;
        updatedAssets.videoSource = 'brand';
        updatedAssets.imageUrl = null;
        updatedAssets.imageSource = null;
      } else {
        // Set image, clear video fields
        updatedAssets.imageUrl = asset.url;
        updatedAssets.imageSource = 'brand';
        updatedAssets.videoUrl = null;
        updatedAssets.videoSource = null;
      }
      
      // Build updates object
      const updates: Record<string, any> = {
        mediaSource: 'brand',
        brandAssetId: asset.id,
        brandAssetUrl: asset.url,
        brandAssetType: isVideo ? 'video' : 'image',
        assets: updatedAssets,
      };
      
      // Only include animationSettings when applicable
      if (isVideo) {
        // Videos don't use Ken Burns - clear animation settings
        updates.animationSettings = null;
      } else if (animationSettings) {
        // Images with animation settings
        updates.animationSettings = animationSettings;
      }
      // If image without animation settings, don't modify existing animationSettings
      
      await apiRequest('PATCH', `/api/universal-video/projects/${projectId}/scenes/${sceneId}`, updates);
      
      toast({ 
        title: 'Brand media applied', 
        description: animationSettings && !isVideo 
          ? `${asset.name} with ${animationSettings.type} animation` 
          : asset.name 
      });
      setBrandMediaSelectorOpen(null);
      onSceneUpdate?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setApplyingMedia(null);
    }
  };

  // Open media picker for a scene
  const openMediaPicker = (sceneId: string, type: 'image' | 'video', source: 'brand' | 'library') => {
    setMediaPickerOpen(sceneId);
    setMediaPickerType(type);
    setMediaPickerSource(source);
  };
  
  // Sortable scene item wrapper
  const SortableSceneItem = ({ scene, index, children }: { scene: Scene; index: number; children: (dragHandle: JSX.Element) => JSX.Element }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: scene.id });
    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
      zIndex: isDragging ? 100 : 'auto',
    };
    
    const dragHandle = (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-2 hover:bg-primary/10 rounded-md border border-transparent hover:border-primary/30 transition-all flex flex-col items-center gap-0.5"
              onClick={(e) => e.stopPropagation()}
              data-testid={`drag-handle-scene-${scene.id}`}
            >
              <GripVertical className="w-5 h-5 text-muted-foreground hover:text-primary" />
              <span className="text-[9px] text-muted-foreground font-medium">DRAG</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Drag to reorder scenes</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    return (
      <div ref={setNodeRef} style={style as any}>
        {children(dragHandle)}
      </div>
    );
  };

  // Filter scenes based on selected filter
  const filteredScenes = scenes.filter(scene => {
    if (sceneFilter === 'all') return true;
    if (sceneFilter === 'needs_review') return scene.analysisResult?.recommendation === 'needs_review';
    if (sceneFilter === 'approved') return scene.analysisResult?.recommendation === 'approved';
    if (sceneFilter === 'rejected') return scene.analysisResult?.recommendation === 'regenerate' || scene.analysisResult?.recommendation === 'critical_fail';
    return true;
  });
  
  // Count scenes by status
  const statusCounts = {
    all: scenes.length,
    needs_review: scenes.filter(s => s.analysisResult?.recommendation === 'needs_review').length,
    approved: scenes.filter(s => s.analysisResult?.recommendation === 'approved').length,
    rejected: scenes.filter(s => s.analysisResult?.recommendation === 'regenerate' || s.analysisResult?.recommendation === 'critical_fail').length,
  };
  
  // Handle reject with dialog
  const handleRejectWithDialog = (sceneIndex: number, sceneId: string) => {
    setRejectDialogOpen({ sceneIndex, sceneId });
    setRejectReason('');
  };
  
  const submitRejection = () => {
    if (rejectDialogOpen) {
      handleSceneReject(rejectDialogOpen.sceneIndex, rejectReason || 'Manual rejection');
      setRejectDialogOpen(null);
      setRejectReason('');
    }
  };

  return (
    <>
    {/* Phase 9A: Scene Filter Controls */}
    <div className="flex items-center gap-2 mb-4 flex-wrap" data-testid="scene-filter-controls">
      <span className="text-sm font-medium text-muted-foreground">Filter:</span>
      <Button
        size="sm"
        variant={sceneFilter === 'all' ? 'default' : 'outline'}
        onClick={() => setSceneFilter('all')}
        data-testid="filter-all"
      >
        All ({statusCounts.all})
      </Button>
      <Button
        size="sm"
        variant={sceneFilter === 'needs_review' ? 'default' : 'outline'}
        className={sceneFilter === 'needs_review' ? '' : 'border-yellow-400 text-yellow-700 hover:bg-yellow-50'}
        onClick={() => setSceneFilter('needs_review')}
        data-testid="filter-needs-review"
      >
        <AlertTriangle className="w-3 h-3 mr-1" /> Needs Review ({statusCounts.needs_review})
      </Button>
      <Button
        size="sm"
        variant={sceneFilter === 'approved' ? 'default' : 'outline'}
        className={sceneFilter === 'approved' ? '' : 'border-green-400 text-green-700 hover:bg-green-50'}
        onClick={() => setSceneFilter('approved')}
        data-testid="filter-approved"
      >
        <CheckCircle className="w-3 h-3 mr-1" /> Approved ({statusCounts.approved})
      </Button>
      <Button
        size="sm"
        variant={sceneFilter === 'rejected' ? 'default' : 'outline'}
        className={sceneFilter === 'rejected' ? '' : 'border-red-400 text-red-700 hover:bg-red-50'}
        onClick={() => setSceneFilter('rejected')}
        data-testid="filter-rejected"
      >
        <XCircle className="w-3 h-3 mr-1" /> Rejected ({statusCounts.rejected})
      </Button>
    </div>
    
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={filteredScenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {isReordering && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving new order...
            </div>
          )}
          {filteredScenes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No scenes match the selected filter.
            </div>
          )}
          {filteredScenes.map((scene) => {
            const index = scenes.findIndex(s => s.id === scene.id);
            const imageAsset = assets.images.find(img => img.sceneId === scene.id);
            const isEditing = sceneEditorOpen === scene.id;
            const hasAIBackground = scene.assets?.backgroundUrl;
            const hasProductOverlay = scene.assets?.productOverlayUrl && scene.assets?.useProductOverlay !== false;
            const hasBrollVideo = scene.background?.type === 'video' && scene.background?.videoUrl;
            const defaultOverlay = SCENE_OVERLAY_DEFAULTS[scene.type] ?? false;
            const showsProductOverlay = scene.assets?.useProductOverlay ?? defaultOverlay;
            
            // Phase 9A: Determine border styling based on analysis status
            const borderClass = scene.analysisResult?.recommendation === 'needs_review' 
              ? 'border-2 border-yellow-400' 
              : (scene.analysisResult?.recommendation === 'regenerate' || scene.analysisResult?.recommendation === 'critical_fail')
                ? 'border-2 border-red-400'
                : scene.analysisResult?.recommendation === 'approved'
                  ? 'border-2 border-green-400'
                  : '';
            
            return (
              <SortableSceneItem key={scene.id} scene={scene} index={index}>
                {(dragHandle) => (
                  <Card className={`overflow-hidden ${borderClass}`} data-testid={`card-scene-${scene.id}`}>
                    <div 
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSceneEditorOpen(scene.id)}
                    >
                      {dragHandle}
              <div className="w-28 h-16 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                {hasBrollVideo ? (
                  <div className="relative w-full h-full">
                    <video 
                      key={scene.background!.videoUrl}
                      src={convertToDisplayUrl(scene.background!.videoUrl!)}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Video className="w-5 h-5 text-white drop-shadow" />
                    </div>
                  </div>
                ) : hasAIBackground ? (
                  <>
                    <img 
                      src={convertToDisplayUrl(scene.assets!.backgroundUrl!)} 
                      alt={`Scene ${index + 1} background`}
                      className="w-full h-full object-cover"
                    />
                    {hasProductOverlay && showsProductOverlay && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <img 
                          src={convertToDisplayUrl(scene.assets!.productOverlayUrl!)} 
                          alt="Product overlay"
                          className="max-w-[60%] max-h-[80%] object-contain drop-shadow-lg"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                  </>
                ) : imageAsset?.url ? (
                  <img 
                    src={convertToDisplayUrl(imageAsset.url)} 
                    alt={`Scene ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs capitalize" data-testid={`badge-scene-type-${scene.id}`}>
                    {scene.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground" data-testid={`scene-duration-${scene.id}`}>
                    {scene.duration}s
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`content-type-icon-${scene.id}`}>
                    {getContentTypeIcon((scene as any).contentType || 'lifestyle')}
                  </span>
                  {hasBrollVideo && (
                    <Badge className="text-xs bg-blue-500">
                      <Video className="w-3 h-3 mr-1" /> B-Roll
                    </Badge>
                  )}
                  {hasAIBackground && (
                    <Badge className={`text-xs ${showsProductOverlay ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-purple-500'}`}>
                      {showsProductOverlay ? 'AI + Product' : 'AI Background'}
                    </Badge>
                  )}
                  {/* Phase 9A: Quality Score Badge - Phase 10A: Added simulated indicator */}
                  {scene.qualityScore !== undefined && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge 
                            className={`text-xs ${
                              scene.analysisResult?.analysisModel?.includes('simulated') 
                                ? 'bg-orange-500 border-orange-600' 
                                : getScoreColor(scene.qualityScore)
                            }`} 
                            data-testid={`badge-quality-${scene.id}`}
                          >
                            {scene.analysisResult?.analysisModel?.includes('simulated') ? '⚠️ ' : ''}
                            Q: {scene.qualityScore}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          {scene.analysisResult?.analysisModel?.includes('simulated') ? (
                            <div className="text-orange-300">
                              <p className="font-bold">⚠️ SIMULATED SCORE</p>
                              <p>This is a fake score - Claude Vision not configured.</p>
                              <p className="text-xs mt-1">Configure ANTHROPIC_API_KEY for real analysis.</p>
                            </div>
                          ) : (
                            <p>Quality Score: {scene.qualityScore}/100</p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Phase 9A: Status Indicator */}
                  {scene.analysisResult?.recommendation && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center" data-testid={`status-indicator-${scene.id}`}>
                            {scene.analysisResult.recommendation === 'approved' && (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            )}
                            {scene.analysisResult.recommendation === 'needs_review' && (
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            )}
                            {(scene.analysisResult.recommendation === 'regenerate' || scene.analysisResult.recommendation === 'critical_fail') && (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{scene.analysisResult.recommendation === 'approved' ? 'Approved' : 
                              scene.analysisResult.recommendation === 'needs_review' ? 'Needs Review' : 
                              'Regeneration Needed'}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {/* Phase 9A: Provider Badge */}
                  {scene.assets?.videoSource && getProviderDisplayName(scene.assets.videoSource) && (
                    <Badge className={`text-xs ${getProviderBadgeStyle(scene.assets.videoSource)}`} data-testid={`badge-provider-${scene.id}`}>
                      {getProviderDisplayName(scene.assets.videoSource)}
                    </Badge>
                  )}
                </div>
                <p className="text-sm truncate mt-1">{scene.narration.substring(0, 60)}...</p>
              </div>
              <ChevronDown className="w-4 h-4" />
            </div>
            
            {/* Scene content is now in modal - see SceneEditorModal below */}
                  </Card>
                )}
              </SortableSceneItem>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
    
    {/* Scene Editor Modal */}
    {sceneEditorOpen && (() => {
      const scene = scenes.find(s => s.id === sceneEditorOpen);
      if (!scene) return null;
      const index = scenes.findIndex(s => s.id === sceneEditorOpen);
      const imageAsset = assets.images.find(img => img.sceneId === scene.id);
      const hasAIBackground = scene.assets?.backgroundUrl;
      const hasProductOverlay = scene.assets?.productOverlayUrl && scene.assets?.useProductOverlay !== false;
      const hasBrollVideo = scene.background?.type === 'video' && scene.background?.videoUrl;
      const defaultOverlay = SCENE_OVERLAY_DEFAULTS[scene.type] ?? false;
      const showsProductOverlay = scene.assets?.useProductOverlay ?? defaultOverlay;
      
      return (
        <Dialog open={true} onOpenChange={(open) => !open && setSceneEditorOpen(null)}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs capitalize">
                  {scene.type}
                </Badge>
                Scene {index + 1} - {scene.duration}s
                {hasBrollVideo && (
                  <Badge className="text-xs bg-blue-500">
                    <Video className="w-3 h-3 mr-1" /> B-Roll
                  </Badge>
                )}
                {hasAIBackground && (
                  <Badge className={`text-xs ${showsProductOverlay ? 'bg-gradient-to-r from-purple-500 to-blue-500' : 'bg-purple-500'}`}>
                    {showsProductOverlay ? 'AI + Product' : 'AI Background'}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>
                Edit scene content, media sources, and overlay settings
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Left Column: Large Media Preview */}
              <div className="space-y-4">
                {/* Preview Mode Toggle */}
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Preview Mode</Label>
                  <div className="flex border rounded-md overflow-hidden">
                    <Button
                      size="sm"
                      variant={!overlayPreviewMode[scene.id] ? 'default' : 'ghost'}
                      className="h-7 text-xs rounded-none"
                      onClick={() => setOverlayPreviewMode(prev => ({ ...prev, [scene.id]: false }))}
                      data-testid={`button-preview-media-${scene.id}`}
                    >
                      <ImageIcon className="w-3 h-3 mr-1" /> Media
                    </Button>
                    <Button
                      size="sm"
                      variant={overlayPreviewMode[scene.id] ? 'default' : 'ghost'}
                      className="h-7 text-xs rounded-none"
                      onClick={() => setOverlayPreviewMode(prev => ({ ...prev, [scene.id]: true }))}
                      data-testid={`button-preview-overlay-${scene.id}`}
                    >
                      <Layers className="w-3 h-3 mr-1" /> With Overlays
                    </Button>
                  </div>
                </div>
                
                {/* Overlay Preview Mode */}
                {overlayPreviewMode[scene.id] && (hasBrollVideo || hasAIBackground || imageAsset?.url) ? (
                  <OverlayPreview
                    mediaUrl={convertToDisplayUrl(
                      hasBrollVideo ? scene.background!.videoUrl! :
                      hasAIBackground ? scene.assets!.backgroundUrl! :
                      imageAsset!.url
                    )}
                    mediaType={hasBrollVideo ? 'video' : 'image'}
                    config={previewOverlayConfig[scene.id] || (scene.overlayConfig as OverlayConfig) || getDefaultOverlayConfig(scene.type || 'general')}
                    convertUrl={convertToDisplayUrl}
                  />
                ) : hasBrollVideo ? (
                  <div>
                    <Label className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <Video className="w-4 h-4" /> B-Roll Video
                    </Label>
                    <div className="w-full rounded-lg overflow-hidden border bg-black" style={{ aspectRatio: '16/9' }}>
                      <video 
                        key={scene.background!.videoUrl}
                        src={convertToDisplayUrl(scene.background!.videoUrl!)}
                        className="w-full h-full object-contain"
                        controls
                        muted
                        playsInline
                        data-testid={`video-broll-modal-${scene.id}`}
                      />
                    </div>
                  </div>
                ) : hasAIBackground ? (
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2">AI Background</Label>
                    <div className="w-full rounded-lg overflow-hidden border relative bg-black" style={{ aspectRatio: '16/9' }}>
                      <img 
                        src={convertToDisplayUrl(scene.assets!.backgroundUrl!)} 
                        alt="AI background"
                        className="w-full h-full object-contain"
                      />
                      {showsProductOverlay && scene.assets?.productOverlayUrl && (() => {
                        const settings = getOverlaySettings(scene);
                        const positionStyles: React.CSSProperties = {
                          position: 'absolute',
                          transform: `scale(${settings.scale})`,
                          transformOrigin: `${settings.x} ${settings.y}`,
                          maxWidth: '45%',
                          maxHeight: '60%',
                          objectFit: 'contain' as const,
                          ...(settings.x === 'left' ? { left: '5%' } : settings.x === 'right' ? { right: '5%' } : { left: '50%', marginLeft: '-22.5%' }),
                          ...(settings.y === 'top' ? { top: '5%' } : settings.y === 'bottom' ? { bottom: '5%' } : { top: '50%', marginTop: '-30%' }),
                        };
                        return (
                          <img 
                            src={convertToDisplayUrl(scene.assets!.productOverlayUrl!)} 
                            alt="Product overlay"
                            className="drop-shadow-lg"
                            style={positionStyles}
                          />
                        );
                      })()}
                    </div>
                  </div>
                ) : imageAsset?.url ? (
                  <div>
                    <Label className="text-sm text-muted-foreground mb-2">Scene Image</Label>
                    <div className="w-full rounded-lg overflow-hidden border bg-black" style={{ aspectRatio: '16/9' }}>
                      <img 
                        src={convertToDisplayUrl(imageAsset.url)} 
                        alt={`Scene ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="w-full rounded-lg border bg-muted flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                  </div>
                )}
                
                {/* Media Source Selector Controls */}
                {projectId && (
                  <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                    <Label className="text-sm font-medium">Media Source Controls</Label>
                    
                    {/* Custom prompt and type toggles */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        placeholder="Custom prompt (optional)"
                        value={customPrompt[scene.id] || ''}
                        onChange={(e) => setCustomPrompt(prev => ({ ...prev, [scene.id]: e.target.value }))}
                        className="text-sm h-9 flex-1 min-w-[150px]"
                        data-testid={`input-custom-prompt-modal-${scene.id}`}
                      />
                      <div className="flex border rounded-md overflow-hidden">
                        <Button
                          size="sm"
                          variant={scene.background?.type !== 'video' ? 'default' : 'ghost'}
                          className="h-9 text-sm rounded-none"
                          onClick={() => switchBackground(scene.id, false)}
                          disabled={!!regenerating}
                          data-testid={`button-type-image-modal-${scene.id}`}
                        >
                          <ImageIcon className="w-4 h-4 mr-1" /> Image
                        </Button>
                        <Button
                          size="sm"
                          variant={scene.background?.type === 'video' ? 'default' : 'ghost'}
                          className="h-9 text-sm rounded-none"
                          onClick={() => switchBackground(scene.id, true)}
                          disabled={!!regenerating}
                          data-testid={`button-type-video-modal-${scene.id}`}
                        >
                          <Video className="w-4 h-4 mr-1" /> Video
                        </Button>
                      </div>
                    </div>
                    
                    {/* Phase 9B: Provider Selector */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Image Providers */}
                      <ProviderSelector
                        type="image"
                        selectedProvider={sceneMediaType[scene.id] === 'image' ? (selectedProviders[`image-${scene.id}`] || getRecommendedProvider('image', scene.type)) : undefined}
                        onSelectProvider={(provider) => {
                          const newProviders = { ...selectedProviders };
                          newProviders[`image-${scene.id}`] = provider;
                          delete newProviders[`video-${scene.id}`];
                          setSelectedProviders(newProviders);
                          setSceneMediaType(prev => ({ ...prev, [scene.id]: 'image' }));
                          if (provider === 'brand_media') {
                            setBrandMediaSelectorOpen(scene.id);
                          } else if (provider === 'asset_library') {
                            openMediaPicker(scene.id, 'image', 'library');
                          }
                        }}
                        recommendedProvider={getRecommendedProvider('image', scene.type)}
                        sceneContentType={scene.type}
                        disabled={!!regenerating || !!applyingMedia}
                      />
                      
                      {/* Video Providers */}
                      <ProviderSelector
                        type="video"
                        selectedProvider={sceneMediaType[scene.id] === 'video' ? (selectedProviders[`video-${scene.id}`] || getRecommendedProvider('video', scene.type)) : undefined}
                        onSelectProvider={(provider) => {
                          const newProviders = { ...selectedProviders };
                          newProviders[`video-${scene.id}`] = provider;
                          delete newProviders[`image-${scene.id}`];
                          setSelectedProviders(newProviders);
                          setSceneMediaType(prev => ({ ...prev, [scene.id]: 'video' }));
                          if (provider === 'brand_media') {
                            setBrandMediaSelectorOpen(scene.id);
                          } else if (provider === 'asset_library') {
                            openMediaPicker(scene.id, 'video', 'library');
                          }
                        }}
                        recommendedProvider={getRecommendedProvider('video', scene.type)}
                        sceneContentType={scene.type}
                        disabled={!!regenerating || !!applyingMedia}
                      />
                    </div>
                    
                    {/* Generate Button */}
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={() => {
                          const mediaType = sceneMediaType[scene.id] || (scene.background?.type === 'video' ? 'video' : 'image');
                          const provider = selectedProviders[`${mediaType}-${scene.id}`] || getRecommendedProvider(mediaType, scene.type);
                          console.log('[Generate Click] sceneId:', scene.id, 'mediaType:', mediaType, 'provider:', provider, 'projectId:', projectId, 'sceneMediaType:', sceneMediaType, 'selectedProviders:', selectedProviders);
                          if (mediaType === 'video') {
                            regenerateVideo(scene.id, provider);
                          } else {
                            regenerateImage(scene.id, provider);
                          }
                        }}
                        disabled={!!regenerating || !!applyingMedia}
                        className="flex-1"
                        data-testid={`button-generate-with-provider-${scene.id}`}
                      >
                        {regenerating === `image-${scene.id}` || regenerating === `video-${scene.id}` ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
                        ) : (
                          <><Sparkles className="w-4 h-4 mr-2" /> Generate with {getProviderName(
                            selectedProviders[`${sceneMediaType[scene.id] || (scene.background?.type === 'video' ? 'video' : 'image')}-${scene.id}`] || 
                            getRecommendedProvider(sceneMediaType[scene.id] || (scene.background?.type === 'video' ? 'video' : 'image'), scene.type)
                          )}</>
                        )}
                      </Button>
                    </div>
                    
                    {/* Provider info */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Selected: {getProviderName(
                          selectedProviders[`${sceneMediaType[scene.id] || (scene.background?.type === 'video' ? 'video' : 'image')}-${scene.id}`] || 
                          getRecommendedProvider(sceneMediaType[scene.id] || (scene.background?.type === 'video' ? 'video' : 'image'), scene.type)
                        )}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                        {(() => {
                          const mediaType = sceneMediaType[scene.id] || (scene.background?.type === 'video' ? 'video' : 'image');
                          const provider = selectedProviders[`${mediaType}-${scene.id}`] || getRecommendedProvider(mediaType, scene.type);
                          const recommended = getRecommendedProvider(mediaType, scene.type);
                          return provider === recommended 
                            ? "This is the recommended provider for this scene type"
                            : "You can override the recommended provider if needed";
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Right Column: Text Content & Settings */}
              <div className="space-y-4">
                {/* Narration Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Narration</Label>
                    {projectId && editingNarration !== scene.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setEditingNarration(scene.id);
                          setEditedNarration(prev => ({ ...prev, [scene.id]: scene.narration }));
                        }}
                        data-testid={`button-edit-narration-modal-${scene.id}`}
                      >
                        <Pencil className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingNarration === scene.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedNarration[scene.id] || ''}
                        onChange={(e) => setEditedNarration(prev => ({ ...prev, [scene.id]: e.target.value }))}
                        className="text-sm min-h-[100px]"
                        placeholder="Enter narration text..."
                        data-testid={`textarea-narration-modal-${scene.id}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveNarration(scene.id)}
                          disabled={savingNarration === scene.id}
                          data-testid={`button-save-narration-modal-${scene.id}`}
                        >
                          {savingNarration === scene.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3 mr-1" />
                          )}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingNarration(null)}
                          disabled={savingNarration === scene.id}
                          data-testid={`button-cancel-narration-modal-${scene.id}`}
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        After saving, regenerate voiceover to update audio.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm bg-muted/50 p-3 rounded">{scene.narration}</p>
                  )}
                </div>
                
                {/* Visual Direction Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Visual Direction</Label>
                    {projectId && editingVisualDirection !== scene.id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-700"
                          onClick={() => askSuzzie(scene.id, scene.narration, scene.type)}
                          disabled={!!askingSuzzie}
                          data-testid={`button-ask-suzzie-modal-${scene.id}`}
                        >
                          {askingSuzzie === scene.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Sparkles className="w-3 h-3 mr-1" />
                          )}
                          Ask Suzzie
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditingVisualDirection(scene.id);
                            setEditedVisualDirection(prev => ({ ...prev, [scene.id]: scene.background.source }));
                          }}
                          data-testid={`button-edit-visual-direction-modal-${scene.id}`}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingVisualDirection === scene.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedVisualDirection[scene.id] || ''}
                        onChange={(e) => setEditedVisualDirection(prev => ({ ...prev, [scene.id]: e.target.value }))}
                        className="text-sm min-h-[100px]"
                        placeholder="Describe the visual scene..."
                        data-testid={`textarea-visual-direction-modal-${scene.id}`}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveVisualDirection(scene.id)}
                          disabled={savingVisualDirection === scene.id}
                          data-testid={`button-save-visual-direction-modal-${scene.id}`}
                        >
                          {savingVisualDirection === scene.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="w-3 h-3 mr-1" />
                          )}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingVisualDirection(null)}
                          disabled={savingVisualDirection === scene.id}
                          data-testid={`button-cancel-visual-direction-modal-${scene.id}`}
                        >
                          Cancel
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        After saving, regenerate image/video to update visuals.
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm bg-muted/50 p-3 rounded">{scene.background.source}</p>
                  )}
                  
                  {/* Suggested Improved Prompt from Claude Vision */}
                  {scene.analysisResult?.improvedPrompt && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-800">Suggested Improvement</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-700"
                          onClick={() => {
                            navigator.clipboard.writeText(scene.analysisResult?.improvedPrompt || '');
                            toast({ title: 'Copied!', description: 'Suggested prompt copied to clipboard.' });
                          }}
                          data-testid={`button-copy-suggested-prompt-${scene.id}`}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </Button>
                      </div>
                      <p className="text-sm text-amber-900">{scene.analysisResult.improvedPrompt}</p>
                    </div>
                  )}
                </div>
                
                {/* Product Overlay Settings */}
                {hasAIBackground && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <Label className="text-sm font-medium">Show Product Overlay</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        {!defaultOverlay && (
                          <span className="text-xs text-muted-foreground">(Off by default for {scene.type})</span>
                        )}
                        <Switch 
                          checked={showsProductOverlay}
                          onCheckedChange={(checked) => {
                            if (onToggleProductOverlay) {
                              onToggleProductOverlay(scene.id, checked);
                            }
                          }}
                          data-testid={`switch-product-overlay-modal-${scene.id}`}
                        />
                      </div>
                    </div>
                    
                    {showsProductOverlay && projectId && scene.assets?.productOverlayUrl && (
                      <div className="p-4 bg-muted/30 rounded-lg border space-y-4">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          <Settings className="w-4 h-4" /> Overlay Settings
                          {savingOverlay === scene.id && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
                        </Label>
                        
                        <div className="grid grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs">Horizontal</Label>
                            <Select 
                              value={getOverlaySettings(scene).x}
                              onValueChange={(val) => {
                                const newX = val as 'left' | 'center' | 'right';
                                updateLocalOverlay(scene.id, { x: newX });
                                updateProductOverlay(scene.id, { 
                                  position: { x: newX, y: getOverlaySettings(scene).y }
                                });
                              }}
                            >
                              <SelectTrigger className="h-9" data-testid={`select-overlay-x-modal-${scene.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="left">Left</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="right">Right</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs">Vertical</Label>
                            <Select 
                              value={getOverlaySettings(scene).y}
                              onValueChange={(val) => {
                                const newY = val as 'top' | 'center' | 'bottom';
                                updateLocalOverlay(scene.id, { y: newY });
                                updateProductOverlay(scene.id, { 
                                  position: { x: getOverlaySettings(scene).x, y: newY }
                                });
                              }}
                            >
                              <SelectTrigger className="h-9" data-testid={`select-overlay-y-modal-${scene.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="top">Top</SelectItem>
                                <SelectItem value="center">Center</SelectItem>
                                <SelectItem value="bottom">Bottom</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs">Animation</Label>
                            <Select 
                              value={getOverlaySettings(scene).animation}
                              onValueChange={(val) => {
                                const newAnim = val as OverlayAnimation;
                                updateLocalOverlay(scene.id, { animation: newAnim });
                                updateProductOverlay(scene.id, { animation: newAnim });
                              }}
                            >
                              <SelectTrigger className="h-9" data-testid={`select-overlay-animation-modal-${scene.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="fade">Fade</SelectItem>
                                <SelectItem value="zoom">Zoom</SelectItem>
                                <SelectItem value="slide">Slide</SelectItem>
                                <SelectItem value="none">None</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Scale</Label>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(getOverlaySettings(scene).scale * 100)}%
                            </span>
                          </div>
                          <Slider
                            value={[getOverlaySettings(scene).scale * 100]}
                            onValueChange={(val) => updateLocalOverlay(scene.id, { scale: val[0] / 100 })}
                            onValueCommit={(val) => updateProductOverlay(scene.id, { scale: val[0] / 100 })}
                            min={10}
                            max={80}
                            step={5}
                            className="w-full"
                            data-testid={`slider-overlay-scale-modal-${scene.id}`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Phase 11C: Overlay Editor */}
                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Scene Overlays</Label>
                  </div>
                  <OverlayEditor
                    config={(scene.overlayConfig as OverlayConfig) ?? getDefaultOverlayConfig(scene.type || 'general')}
                    onChange={async (config) => {
                      if (projectId) {
                        try {
                          await apiRequest('PATCH', `/api/universal-video/projects/${projectId}/scenes/${scene.id}`, { overlayConfig: config });
                          setPreviewOverlayConfig(prev => ({ ...prev, [scene.id]: config }));
                          onSceneUpdate?.();
                          toast({
                            title: 'Saved',
                            description: 'Overlay settings saved successfully',
                          });
                        } catch (err) {
                          console.error('Failed to update overlay config:', err);
                          toast({
                            title: 'Error',
                            description: 'Failed to save overlay settings',
                            variant: 'destructive',
                          });
                        }
                      }
                    }}
                    onPreview={(config) => {
                      setPreviewOverlayConfig(prev => ({ ...prev, [scene.id]: config }));
                      if (!overlayPreviewMode[scene.id]) {
                        setOverlayPreviewMode(prev => ({ ...prev, [scene.id]: true }));
                      }
                    }}
                    extractedText={scene.extractedOverlayText ?? []}
                    sceneType={scene.type ?? 'general'}
                  />
                </div>
              </div>
            </div>
            
            {/* Phase 9A: Quality Review Section */}
            {(scene.analysisResult || scene.qualityScore !== undefined) && (
              <div className="mt-6 pt-4 border-t">
                <Label className="text-sm font-medium mb-3 block">Quality & Review</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Quality Scores */}
                  <div className="space-y-2">
                    {scene.qualityScore !== undefined && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground w-28">Overall Score:</span>
                        <Badge className={`${getScoreColor(scene.qualityScore)}`} data-testid={`modal-quality-score-${scene.id}`}>
                          {scene.qualityScore}/100
                        </Badge>
                        {scene.analysisResult?.recommendation && (
                          <Badge variant="outline" className="capitalize" data-testid={`modal-recommendation-${scene.id}`}>
                            {scene.analysisResult.recommendation.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    )}
                    {scene.analysisResult && (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-28">Technical:</span>
                          <Progress value={scene.analysisResult.technicalScore} className="w-20 h-2" />
                          <span className="text-xs">{scene.analysisResult.technicalScore}/100</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-28">Content Match:</span>
                          <Progress value={scene.analysisResult.contentMatchScore} className="w-20 h-2" />
                          <span className="text-xs">{scene.analysisResult.contentMatchScore}/100</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-28">Composition:</span>
                          <Progress value={scene.analysisResult.compositionScore} className="w-20 h-2" />
                          <span className="text-xs">{scene.analysisResult.compositionScore}/100</span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Issues List */}
                  {scene.analysisResult?.issues && scene.analysisResult.issues.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Issues Found:</span>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {scene.analysisResult.issues.map((issue, idx) => (
                          <div key={idx} className={`text-xs p-2 rounded ${
                            issue.severity === 'critical' ? 'bg-red-50 text-red-700' :
                            issue.severity === 'major' ? 'bg-orange-50 text-orange-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            <span className="font-medium capitalize">[{issue.severity}]</span> {issue.description}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Action Buttons */}
                {scene.analysisResult?.recommendation === 'needs_review' && projectId && (
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      onClick={() => handleSceneApprove(index)}
                      disabled={!!sceneActionPending}
                      data-testid={`button-approve-scene-${scene.id}`}
                    >
                      {sceneActionPending === scene.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <ThumbsUp className="w-4 h-4 mr-1" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                      onClick={() => handleRejectWithDialog(index, scene.id)}
                      disabled={!!sceneActionPending}
                      data-testid={`button-reject-scene-${scene.id}`}
                    >
                      <ThumbsDown className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleSceneRegenerate(index)}
                      disabled={!!sceneActionPending}
                      data-testid={`button-regenerate-scene-${scene.id}`}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      Regenerate
                    </Button>
                  </div>
                )}
                {(scene.analysisResult?.recommendation === 'regenerate' || scene.analysisResult?.recommendation === 'critical_fail') && projectId && (
                  <div className="flex gap-2 mt-4">
                    <Alert variant="destructive" className="flex-1">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Quality analysis failed. Use AI providers above to generate video, then re-analyze.
                      </AlertDescription>
                    </Alert>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleSceneRegenerate(index)}
                      disabled={!!sceneActionPending}
                      data-testid={`button-regenerate-critical-${scene.id}`}
                    >
                      {sceneActionPending === scene.id ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-1" />
                      )}
                      Re-analyze
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      );
    })()}
    
    {/* Media Picker Dialog */}
    <MediaPickerDialog
      open={!!mediaPickerOpen}
      onClose={() => setMediaPickerOpen(null)}
      sceneId={mediaPickerOpen || ''}
      mediaType={mediaPickerType}
      source={mediaPickerSource}
      onSourceChange={setMediaPickerSource}
      onMediaSelect={(url, type, source) => {
        if (mediaPickerOpen) {
          applyMediaToScene(mediaPickerOpen, url, type, source);
        }
      }}
      isApplying={!!applyingMedia}
    />
    
    {/* Phase 11D: Brand Media Selector with Animation Controls */}
    {brandMediaSelectorOpen && (
      <BrandMediaSelector
        isOpen={!!brandMediaSelectorOpen}
        onClose={() => setBrandMediaSelectorOpen(null)}
        onSelect={(asset, animationSettings) => {
          if (brandMediaSelectorOpen) {
            applyBrandMedia(brandMediaSelectorOpen, asset, animationSettings);
          }
        }}
        isApplying={!!applyingMedia}
        mediaType="all"
      />
    )}
    
    {/* Phase 9A: Reject Reason Dialog */}
    <Dialog open={!!rejectDialogOpen} onOpenChange={(open) => !open && setRejectDialogOpen(null)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThumbsDown className="w-5 h-5 text-red-500" />
            Reject Scene
          </DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this scene. This helps improve future generations.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection Reason</Label>
            <Textarea
              id="reject-reason"
              placeholder="e.g., Incorrect product placement, poor lighting, doesn't match brand style..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              data-testid="input-reject-reason"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(null)}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={submitRejection}
              disabled={!!sceneActionPending}
              data-testid="button-submit-reject"
            >
              {sceneActionPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <ThumbsDown className="w-4 h-4 mr-1" />
              )}
              Reject Scene
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

// Media Picker Dialog Component
function MediaPickerDialog({
  open,
  onClose,
  sceneId,
  mediaType,
  source,
  onSourceChange,
  onMediaSelect,
  isApplying
}: {
  open: boolean;
  onClose: () => void;
  sceneId: string;
  mediaType: 'image' | 'video';
  source: 'brand' | 'library';
  onSourceChange: (source: 'brand' | 'library') => void;
  onMediaSelect: (url: string, type: 'image' | 'video', source: string) => void;
  isApplying: boolean;
}) {
  
  // Fetch brand media library
  const { data: brandMediaData } = useQuery<{ success: boolean; assets: any[] }>({
    queryKey: ['/api/brand-media-library'],
    enabled: open && source === 'brand',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  
  // Fetch asset library (Phase 11E - AI-generated assets)
  const { data: assetLibraryData } = useQuery<any[]>({
    queryKey: ['/api/asset-library', { type: mediaType }],
    enabled: open && source === 'library',
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
  
  const brandAssets = brandMediaData?.assets || [];
  const libraryAssets = assetLibraryData || [];
  
  // Filter brand assets by media type
  const filteredBrandAssets = brandAssets.filter(a => {
    if (mediaType === 'video') return a.mediaType === 'video';
    return a.mediaType === 'photo' || a.mediaType === 'image';
  });
  
  // Filter library assets by type  
  const filteredLibraryAssets = libraryAssets.filter(a => {
    if (mediaType === 'video') return a.assetType === 'video';
    return a.assetType === 'image';
  });
  
  const getSourceLabel = () => {
    switch (source) {
      case 'brand': return 'Brand Media Library';
      case 'library': return 'Asset Library';
      default: return 'Select Source';
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mediaType === 'video' ? <Video className="w-5 h-5" /> : <ImageIcon className="w-5 h-5" />}
            Select {mediaType === 'video' ? 'Video' : 'Image'} from {getSourceLabel()}
          </DialogTitle>
          <DialogDescription>
            Choose media to use for this scene. Click on an item to apply it.
          </DialogDescription>
        </DialogHeader>
        
        {/* Source Tabs */}
        <div className="flex gap-1 flex-wrap border-b pb-2">
          {(['brand', 'library'] as const).map((s) => (
            <Button
              key={s}
              size="sm"
              variant={source === s ? 'default' : 'outline'}
              className="h-7 text-xs"
              onClick={() => onSourceChange(s)}
            >
              {s === 'brand' ? 'Brand Media' : 'Asset Library'}
            </Button>
          ))}
        </div>
        
        {/* Results Grid */}
        <ScrollArea className="flex-1 min-h-[300px]">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 p-1">
            {/* Brand Media Results */}
            {source === 'brand' && filteredBrandAssets.map((item) => (
              <div
                key={item.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                onClick={() => onMediaSelect(item.url, mediaType, 'Brand Media')}
              >
                <div className="aspect-video bg-gray-200">
                  <img 
                    src={item.thumbnailUrl || item.url} 
                    alt={item.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="p-1.5">
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.entityType}</p>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button size="sm" variant="secondary" disabled={isApplying}>
                    {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Use This'}
                  </Button>
                </div>
              </div>
            ))}
            
            {/* Asset Library Results (Phase 11E) */}
            {source === 'library' && filteredLibraryAssets.map((item) => (
              <div
                key={item.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                onClick={() => onMediaSelect(item.assetUrl, mediaType, 'Asset Library')}
                data-testid={`asset-library-item-${item.id}`}
              >
                <div className="aspect-video bg-gray-200">
                  {item.assetType === 'video' ? (
                    <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
                      <Video className="w-8 h-8 text-white/70" />
                      {item.thumbnailUrl && (
                        <img 
                          src={item.thumbnailUrl} 
                          alt="" 
                          className="absolute inset-0 w-full h-full object-cover opacity-70" 
                        />
                      )}
                    </div>
                  ) : (
                    <img 
                      src={item.thumbnailUrl || item.assetUrl} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
                <div className="p-1.5">
                  <p className="text-xs font-medium truncate">{item.visualDirection || item.prompt || 'AI Generated'}</p>
                  <div className="flex items-center gap-1">
                    <p className="text-[10px] text-muted-foreground">{item.provider || 'Unknown'}</p>
                    {item.qualityScore && (
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${item.qualityScore >= 85 ? 'border-green-500 text-green-600' : item.qualityScore >= 70 ? 'border-yellow-500 text-yellow-600' : 'border-red-500 text-red-600'}`}>
                        Q:{item.qualityScore}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button size="sm" variant="secondary" disabled={isApplying}>
                    {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Use This'}
                  </Button>
                </div>
                {item.isFavorite && (
                  <div className="absolute top-1 right-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  </div>
                )}
              </div>
            ))}
            
            {/* Empty states */}
            {source === 'brand' && filteredBrandAssets.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No {mediaType}s in Brand Media Library</p>
              </div>
            )}
            {source === 'library' && filteredLibraryAssets.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No {mediaType}s in Asset Library</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface ProjectWithMeta extends VideoProject {
  renderId?: string;
  bucketName?: string;
  outputUrl?: string;
}

function ProjectsList({ onSelectProject, onCreateNew }: { 
  onSelectProject: (project: ProjectWithMeta) => void; 
  onCreateNew: () => void;
}) {
  const { data: projectsData, isLoading } = useQuery<{ success: boolean; projects: ProjectWithMeta[] }>({
    queryKey: ['/api/universal-video/projects'],
  });

  const projects: ProjectWithMeta[] = projectsData?.projects || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Complete</Badge>;
      case 'rendering':
        return <Badge className="bg-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Rendering</Badge>;
      case 'ready':
        return <Badge className="bg-yellow-500"><Play className="w-3 h-3 mr-1" /> Ready to Render</Badge>;
      case 'generating':
        return <Badge className="bg-purple-500"><Sparkles className="w-3 h-3 mr-1" /> Generating</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" /> Error</Badge>;
      default:
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">My Video Projects</h3>
        <Button onClick={onCreateNew} data-testid="button-create-new-project">
          <Plus className="w-4 h-4 mr-2" /> New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-8 text-center">
          <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">You don't have any video projects yet.</p>
          <Button onClick={onCreateNew}>Create Your First Video</Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
            <Card 
              key={project.id} 
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => onSelectProject(project)}
              data-testid={`card-project-${project.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.title}</CardTitle>
                  {getStatusBadge(project.status)}
                </div>
                <CardDescription className="text-xs">
                  Created {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true })}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clapperboard className="w-4 h-4" />
                    {project.scenes.length} scenes
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {Math.round(project.totalDuration)}s
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    {project.outputFormat.aspectRatio}
                  </span>
                </div>
                
                {project.status === 'complete' && project.outputUrl && (
                  <div className="mt-3 flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(project.outputUrl, '_blank');
                      }}
                      data-testid={`button-download-${project.id}`}
                    >
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(project);
                      }}
                      data-testid={`button-view-${project.id}`}
                    >
                      <Eye className="w-4 h-4 mr-1" /> View
                    </Button>
                  </div>
                )}

                {project.status === 'rendering' && project.renderId && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Rendering in progress...</span>
                    </div>
                    <Progress value={project.progress.steps.rendering?.progress || 0} className="mt-2" />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type ViewMode = 'list' | 'create' | 'edit';

export default function UniversalVideoProducer() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [workflowType, setWorkflowType] = useState<WorkflowType>("product");
  const [project, setProject] = useState<VideoProject | null>(null);
  const [renderId, setRenderId] = useState<string | null>(null);
  const [bucketName, setBucketName] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewSceneIndex, setPreviewSceneIndex] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [showGenerationPreview, setShowGenerationPreview] = useState(false);
  const [showQADashboard, setShowQADashboard] = useState(false);
  const [qaReport, setQAReport] = useState<{
    projectId: string;
    overallScore: number;
    sceneStatuses: Array<{
      sceneIndex: number;
      score: number;
      status: 'approved' | 'needs_review' | 'rejected' | 'pending';
      issues: Array<{ severity: string; description: string }>;
      userApproved: boolean;
      autoApproved?: boolean;
      regenerationCount?: number;
    }>;
    approvedCount: number;
    needsReviewCount: number;
    rejectedCount: number;
    pendingCount: number;
    criticalIssueCount: number;
    majorIssueCount: number;
    minorIssueCount: number;
    passesThreshold: boolean;
    canRender: boolean;
    blockingReasons: string[];
    lastAnalyzedAt: string;
  } | null>(null);
  const [isAnalyzingQA, setIsAnalyzingQA] = useState(false);
  const previewTimerRef = useRef<NodeJS.Timeout | null>(null);

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const response = await apiRequest("POST", "/api/universal-video/projects/product", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setProject(data.project);
        setViewMode('edit');
        toast({
          title: "Project Created",
          description: `Generated ${data.project.scenes.length} scenes for your video.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Creation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createScriptMutation = useMutation({
    mutationFn: async (data: ScriptFormData) => {
      const response = await apiRequest("POST", "/api/universal-video/projects/script", data);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setProject(data.project);
        setViewMode('edit');
        toast({
          title: "Script Parsed",
          description: `Identified ${data.project.scenes.length} scenes from your script.`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Parsing Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateAssetsMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project");
      const response = await apiRequest("POST", `/api/universal-video/projects/${project.id}/generate-assets`, {
        skipMusic: !musicEnabled
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setProject(data.project);
        if (data.paidServiceFailures) {
          toast({
            title: "Assets Generated with Issues",
            description: "Some paid services failed. Check the notifications.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Assets Generated",
            description: "All assets have been generated successfully.",
          });
        }
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Asset Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const renderMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project");
      const response = await apiRequest("POST", `/api/universal-video/projects/${project.id}/render`);
      const data = await response.json();
      
      // Phase 10D: Handle QA gate blocked response
      if (!response.ok && data.qaGateBlocked) {
        throw new Error(`QA_GATE_BLOCKED:${JSON.stringify(data)}`);
      }
      
      if (!response.ok) {
        throw new Error(data.error || 'Render failed');
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        setRenderId(data.renderId);
        setBucketName(data.bucketName);
        toast({
          title: "Render Started",
          description: "Your video is being rendered on AWS Lambda.",
        });
        pollRenderStatus(data.renderId, data.bucketName);
      }
    },
    onError: (error: Error) => {
      // Phase 10D: Handle QA gate blocked errors specially
      if (error.message.startsWith('QA_GATE_BLOCKED:')) {
        try {
          const data = JSON.parse(error.message.replace('QA_GATE_BLOCKED:', ''));
          toast({
            title: "Rendering Blocked",
            description: data.blockingReasons?.join(', ') || data.error || 'Quality gate not passed',
            variant: "destructive",
          });
          setShowQADashboard(true);
          return;
        } catch {
          // Fall through to generic error handling
        }
      }
      
      toast({
        title: "Render Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Phase 4: Preview mutation
  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project");
      const response = await apiRequest("POST", `/api/universal-video/projects/${project.id}/preview`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPreviewSceneIndex(0);
        setShowPreviewModal(true);
        setIsPreviewPlaying(true);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Preview Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Preview playback effect - auto-advance scenes
  useEffect(() => {
    if (!isPreviewPlaying || !project || !showPreviewModal) {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      return;
    }

    const currentScene = project.scenes[previewSceneIndex];
    if (!currentScene) return;

    const duration = (currentScene.duration || 5) * 1000;
    previewTimerRef.current = setTimeout(() => {
      if (previewSceneIndex < project.scenes.length - 1) {
        setPreviewSceneIndex(prev => prev + 1);
      } else {
        setIsPreviewPlaying(false);
        setPreviewSceneIndex(0);
      }
    }, duration);

    return () => {
      if (previewTimerRef.current) {
        clearTimeout(previewTimerRef.current);
      }
    };
  }, [isPreviewPlaying, previewSceneIndex, project, showPreviewModal]);

  const pollRenderStatus = async (id: string, bucket: string) => {
    if (!project) return;
    
    let pollInterval = 5000; // Start with 5 second intervals
    
    const poll = async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/universal-video/projects/${project.id}/render-status?renderId=${id}&bucketName=${bucket}`
        );
        const data = await response.json();
        
        // Update project state from response
        if (data.project) {
          setProject(data.project);
        }
        
        // Handle rate limiting - slow down polling
        if (data.rateLimited) {
          pollInterval = Math.min(pollInterval * 1.5, 15000); // Increase delay, max 15s
          console.log(`Rate limited, slowing poll to ${pollInterval}ms`);
          setTimeout(poll, pollInterval);
          return;
        }
        
        // Reset poll interval on successful response
        pollInterval = 5000;
        
        // Handle timeout or errors
        if (data.timeout || (data.errors && data.errors.length > 0)) {
          toast({
            title: "Render Failed",
            description: data.errors?.[0] || "Render timed out. Please try again.",
            variant: "destructive",
          });
          return;
        }
        
        // Handle success with output
        if (data.success && data.done && data.outputUrl) {
          setOutputUrl(data.outputUrl);
          toast({
            title: "Video Complete!",
            description: "Your video has been rendered successfully.",
          });
          return;
        }
        
        // Continue polling if not done and no errors
        if (data.success && !data.done) {
          setTimeout(poll, pollInterval);
        }
      } catch (error) {
        console.error("Poll error:", error);
        // On error, slow down but keep trying
        pollInterval = Math.min(pollInterval * 2, 20000);
        setTimeout(poll, pollInterval);
      }
    };
    
    poll();
  };

  const redeployLambdaSiteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/remotion/redeploy-site");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Lambda Site Redeployed",
          description: "Video rendering compositions have been updated.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Redeployment Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetStatusMutation = useMutation({
    mutationFn: async () => {
      if (!project) throw new Error("No project");
      const response = await apiRequest("POST", `/api/universal-video/projects/${project.id}/reset-status`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setProject(data.project);
        setRenderId(null);
        setBucketName(null);
        setOutputUrl(null);
        queryClient.invalidateQueries({ queryKey: ['/api/universal-video/projects'] });
        toast({
          title: "Project Reset",
          description: "You can now retry rendering.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleProductOverlayMutation = useMutation({
    mutationFn: async ({ sceneId, useOverlay }: { sceneId: string; useOverlay: boolean }) => {
      if (!project) throw new Error("No project selected");
      const response = await apiRequest("PATCH", `/api/universal-video/${project.id}/scenes/${sceneId}/product-overlay`, {
        enabled: useOverlay
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.project) {
        setProject(data.project);
        toast({
          title: "Scene Updated",
          description: data.message || "Product overlay setting updated.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggleProductOverlay = (sceneId: string, useOverlay: boolean) => {
    toggleProductOverlayMutation.mutate({ sceneId, useOverlay });
  };

  const resetProject = () => {
    setProject(null);
    setRenderId(null);
    setBucketName(null);
    setOutputUrl(null);
    setViewMode('list');
    queryClient.invalidateQueries({ queryKey: ['/api/universal-video/projects'] });
  };

  const handleSelectProject = (selectedProject: ProjectWithMeta) => {
    setProject(selectedProject);
    setRenderId(selectedProject.renderId || null);
    setBucketName(selectedProject.bucketName || null);
    setOutputUrl(selectedProject.outputUrl || null);
    setViewMode('edit');
    
    if (selectedProject.status === 'rendering' && selectedProject.renderId && selectedProject.bucketName) {
      pollRenderStatus(selectedProject.renderId, selectedProject.bucketName);
    }
  };

  const handleCreateNew = () => {
    setProject(null);
    setRenderId(null);
    setBucketName(null);
    setOutputUrl(null);
    setViewMode('create');
  };

  const handleBackToList = () => {
    setViewMode('list');
    queryClient.invalidateQueries({ queryKey: ['/api/universal-video/projects'] });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Universal Video Producer
              </CardTitle>
              <CardDescription>
                Create professional marketing videos using AI-powered generation
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => redeployLambdaSiteMutation.mutate()}
                disabled={redeployLambdaSiteMutation.isPending}
                title="Update Lambda rendering compositions"
                data-testid="button-redeploy-lambda"
              >
                {redeployLambdaSiteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              {viewMode !== 'list' && (
                <Button variant="outline" onClick={handleBackToList} data-testid="button-back-to-projects">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  My Projects
                </Button>
              )}
              {project && (
                <Button variant="outline" onClick={handleCreateNew} data-testid="button-new-project">
                  <Plus className="w-4 h-4 mr-2" />
                  New Project
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'list' ? (
            <ProjectsList onSelectProject={handleSelectProject} onCreateNew={handleCreateNew} />
          ) : !project ? (
            <Tabs value={workflowType} onValueChange={(v) => setWorkflowType(v as WorkflowType)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="product" data-testid="tab-product">
                  <Package className="w-4 h-4 mr-2" />
                  Product Video
                </TabsTrigger>
                <TabsTrigger value="script" data-testid="tab-script">
                  <FileText className="w-4 h-4 mr-2" />
                  Script-Based
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="product" className="mt-4">
                <ProductVideoForm 
                  onSubmit={(data) => createProductMutation.mutate(data)}
                  isLoading={createProductMutation.isPending}
                />
              </TabsContent>
              
              <TabsContent value="script" className="mt-4">
                <ScriptVideoForm
                  onSubmit={(data) => createScriptMutation.mutate(data)}
                  isLoading={createScriptMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-6">
              <ServiceFailureAlert failures={project.progress.serviceFailures} />
              
              {/* Generation Preview Panel - Phase 5D + Phase 9E enhancements */}
              {showGenerationPreview && project.status === 'draft' && (
                <GenerationPreviewPanel
                  projectId={project.id}
                  onGenerate={() => {
                    setShowGenerationPreview(false);
                    generateAssetsMutation.mutate();
                  }}
                  onCancel={() => setShowGenerationPreview(false)}
                  isGenerating={generateAssetsMutation.isPending}
                  qaStats={qaReport ? {
                    approved: qaReport.approvedCount,
                    needsReview: qaReport.needsReviewCount,
                    rejected: qaReport.rejectedCount,
                    score: qaReport.overallScore,
                  } : null}
                  onOpenQADashboard={() => setShowQADashboard(true)}
                />
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{project.title}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>{project.scenes.length} scenes | {project.totalDuration}s</span>
                    <Badge variant="outline" className="ml-2 capitalize">{project.status}</Badge>
                  </div>
                </div>
                
                <div className="flex gap-2 items-center">
                  {project.status === 'draft' && !showGenerationPreview && (
                    <>
                      <div className="flex items-center gap-2 px-3 py-1 border rounded-md bg-muted/30">
                        <Music className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="music-toggle" className="text-sm cursor-pointer">Music</Label>
                        <Switch
                          id="music-toggle"
                          checked={musicEnabled}
                          onCheckedChange={setMusicEnabled}
                          data-testid="switch-music-enabled"
                        />
                      </div>
                      <Button 
                        onClick={() => setShowGenerationPreview(true)}
                        disabled={generateAssetsMutation.isPending}
                        data-testid="button-generate-assets"
                      >
                        {generateAssetsMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Generate Assets
                      </Button>
                    </>
                  )}
                  
                  {(project.status === 'ready' || project.status === 'error' || project.status === 'complete') && (
                    <Button
                      variant="outline"
                      onClick={() => previewMutation.mutate()}
                      disabled={previewMutation.isPending}
                      data-testid="button-preview-video"
                    >
                      {previewMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4 mr-2" />
                      )}
                      Quick Preview
                    </Button>
                  )}
                  
                  {(project.status === 'ready' || project.status === 'error') && (
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          // Phase 10D: Check QA gate before rendering
                          if (qaReport && !qaReport.canRender) {
                            toast({
                              variant: 'destructive',
                              title: 'Cannot render',
                              description: qaReport.blockingReasons?.join(', ') || 'Quality gate not passed. Review and approve scenes first.',
                            });
                            setShowQADashboard(true);
                            return;
                          }
                          renderMutation.mutate();
                        }}
                        disabled={renderMutation.isPending || !!(qaReport && qaReport.canRender === false)}
                        className={qaReport && !qaReport.canRender ? 'bg-gray-400 cursor-not-allowed' : ''}
                        data-testid="button-render-video"
                      >
                        {renderMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : qaReport && !qaReport.canRender ? (
                          <AlertTriangle className="w-4 h-4 mr-2" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        {qaReport && !qaReport.canRender 
                          ? 'Cannot Render - QA Issues' 
                          : project.status === 'error' 
                            ? 'Retry Render' 
                            : 'Render Video'}
                      </Button>
                      
                      {qaReport && !qaReport.canRender && qaReport.blockingReasons && qaReport.blockingReasons.length > 0 && (
                        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-2">
                          <div className="text-xs font-medium text-red-800 dark:text-red-200 mb-1">
                            Rendering blocked:
                          </div>
                          <ul className="text-xs text-red-700 dark:text-red-300 space-y-0.5">
                            {qaReport.blockingReasons.map((reason, i) => (
                              <li key={i}>• {reason}</li>
                            ))}
                          </ul>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2 text-xs"
                            onClick={() => setShowQADashboard(true)}
                          >
                            Review Issues in QA Dashboard
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {project.status === 'rendering' && (
                    <Button
                      variant="outline"
                      onClick={() => resetStatusMutation.mutate()}
                      disabled={resetStatusMutation.isPending}
                      data-testid="button-reset-render"
                    >
                      {resetStatusMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      Reset & Retry
                    </Button>
                  )}
                  
                  {project.status === 'complete' && outputUrl && (
                    <Button asChild data-testid="button-download-video">
                      <a href={outputUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" />
                        Download Video
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              
              <ProgressTracker 
                project={project}
                qaScore={qaReport?.overallScore}
                qaStatus={isAnalyzingQA ? 'analyzing' : qaReport ? 'completed' : 'pending'}
                qaReport={qaReport ? {
                  overallScore: qaReport.overallScore,
                  approvedCount: qaReport.approvedCount,
                  needsReviewCount: qaReport.needsReviewCount,
                  rejectedCount: qaReport.rejectedCount,
                } : undefined}
                onQAClick={() => setShowQADashboard(true)}
              />
              
              {project.status !== 'draft' && project.assets?.music && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <MusicControlsPanel 
                    projectId={project.id}
                    musicVolume={project.assets.music.volume || 0.3}
                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ['/api/universal-video/projects', project.id] })}
                  />
                  <VoiceoverControlsPanel
                    projectId={project.id}
                    currentVoiceId={project.voiceId}
                    currentVoiceName={project.voiceName}
                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ['/api/universal-video/projects', project.id] })}
                  />
                </div>
              )}
              
              {/* Quality Report - shown for completed videos */}
              <QualityReport 
                projectId={project.id}
                projectStatus={project.status}
                onRegenerateComplete={() => queryClient.invalidateQueries({ queryKey: ['/api/universal-video/projects', project.id] })}
              />
              
              {project.status === 'rendering' && (
                <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <AlertTitle className="text-blue-800 dark:text-blue-200">Video is rendering</AlertTitle>
                  <AlertDescription className="text-blue-700 dark:text-blue-300">
                    You can navigate away from this page - your video will continue rendering in the background. 
                    Come back anytime to check progress or download when complete.
                    {project.progress.steps.rendering?.progress > 0 && (
                      <span className="block mt-1 font-medium">
                        Progress: {Math.round(project.progress.steps.rendering.progress)}%
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}
              
              <Separator />
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Scenes Preview</h4>
                  <UndoRedoControls 
                    projectId={project.id}
                    onProjectUpdate={(updatedProject) => setProject(updatedProject)}
                    refreshKey={Date.parse(project.updatedAt)}
                  />
                </div>
                <ScrollArea className="h-[550px] pr-4">
                  <ScenePreview 
                    scenes={project.scenes} 
                    assets={project.assets}
                    projectId={project.id}
                    projectTitle={project.title}
                    onToggleProductOverlay={handleToggleProductOverlay}
                    onSceneUpdate={() => queryClient.invalidateQueries({ queryKey: ['/api/universal-video/projects', project.id] })}
                    onProjectUpdate={(updatedProject) => setProject(updatedProject)}
                  />
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={(open) => {
        setShowPreviewModal(open);
        if (!open) {
          setIsPreviewPlaying(false);
          setPreviewSceneIndex(0);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Quick Preview
            </DialogTitle>
            <DialogDescription>
              Scene-by-scene preview of your video ({project?.scenes.length || 0} scenes, {project?.totalDuration || 0}s total)
            </DialogDescription>
          </DialogHeader>
          
          {project && project.scenes[previewSceneIndex] && (
            <div className="space-y-4">
              {/* Scene Progress */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Scene {previewSceneIndex + 1} of {project.scenes.length}</span>
                <Progress value={((previewSceneIndex + 1) / project.scenes.length) * 100} className="flex-1" />
              </div>

              {/* Preview Display */}
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                {(() => {
                  const scene = project.scenes[previewSceneIndex];
                  const videoUrl = scene.assets?.videoUrl ? convertToDisplayUrl(scene.assets.videoUrl) : null;
                  const imageUrl = scene.assets?.imageUrl ? convertToDisplayUrl(scene.assets.imageUrl) : null;
                  
                  if (videoUrl) {
                    return (
                      <video
                        key={`preview-video-${scene.id}`}
                        src={videoUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        loop={false}
                        playsInline
                      />
                    );
                  } else if (imageUrl) {
                    return (
                      <img
                        key={`preview-img-${scene.id}`}
                        src={imageUrl}
                        alt={`Scene ${scene.order}`}
                        className="w-full h-full object-cover"
                      />
                    );
                  } else {
                    return (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-900 to-green-700">
                        <div className="text-center text-white">
                          <ImageIcon className="w-16 h-16 mx-auto opacity-50 mb-2" />
                          <p className="text-lg font-medium">Scene {scene.order}: {scene.type}</p>
                        </div>
                      </div>
                    );
                  }
                })()}
                
                {/* Product Overlay */}
                {(() => {
                  const scene = project.scenes[previewSceneIndex];
                  if (!scene.assets?.useProductOverlay) return null;
                  
                  // Resolve product overlay URL
                  let overlayUrl = scene.assets.productOverlayUrl;
                  if (!overlayUrl && scene.assets.assignedProductImageId) {
                    const assignedImage = project.assets.productImages?.find(
                      img => img.id === scene.assets?.assignedProductImageId
                    );
                    if (assignedImage) overlayUrl = assignedImage.url;
                  }
                  if (!overlayUrl && project.assets.productImages?.length) {
                    overlayUrl = project.assets.productImages[0].url;
                  }
                  if (!overlayUrl) return null;
                  
                  const displayUrl = convertToDisplayUrl(overlayUrl);
                  const pos = scene.assets.productOverlayPosition || { x: 'right', y: 'bottom', scale: 0.25 };
                  
                  // Calculate position styles
                  const positionStyles: React.CSSProperties = {
                    position: 'absolute',
                    maxWidth: `${(pos.scale || 0.25) * 100}%`,
                    maxHeight: `${(pos.scale || 0.25) * 100}%`,
                    objectFit: 'contain',
                  };
                  
                  // Horizontal position
                  if (pos.x === 'left') {
                    positionStyles.left = '5%';
                  } else if (pos.x === 'center') {
                    positionStyles.left = '50%';
                    positionStyles.transform = 'translateX(-50%)';
                  } else {
                    positionStyles.right = '5%';
                  }
                  
                  // Vertical position
                  if (pos.y === 'top') {
                    positionStyles.top = '5%';
                  } else if (pos.y === 'center') {
                    positionStyles.top = '50%';
                    positionStyles.transform = positionStyles.transform 
                      ? 'translate(-50%, -50%)' 
                      : 'translateY(-50%)';
                  } else {
                    positionStyles.bottom = '20%'; // Above the info overlay
                  }
                  
                  return (
                    <img
                      key={`preview-overlay-${scene.id}`}
                      src={displayUrl}
                      alt="Product overlay"
                      style={positionStyles}
                      className="drop-shadow-lg"
                      data-testid="preview-product-overlay"
                    />
                  );
                })()}
                
                {/* Scene Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">{project.scenes[previewSceneIndex].type}</Badge>
                    <span className="text-white/70 text-xs">{project.scenes[previewSceneIndex].duration}s</span>
                  </div>
                  <h3 className="text-white font-medium">Scene {project.scenes[previewSceneIndex].order}: {project.scenes[previewSceneIndex].type}</h3>
                  <p className="text-white/80 text-sm line-clamp-2">{project.scenes[previewSceneIndex].narration}</p>
                </div>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewSceneIndex(Math.max(0, previewSceneIndex - 1))}
                  disabled={previewSceneIndex === 0}
                  data-testid="button-preview-prev"
                >
                  Previous
                </Button>
                
                <Button
                  variant={isPreviewPlaying ? "secondary" : "default"}
                  size="sm"
                  onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                  data-testid="button-preview-play"
                >
                  {isPreviewPlaying ? (
                    <>Pause</>
                  ) : (
                    <><Play className="w-4 h-4 mr-1" /> Play</>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewSceneIndex(Math.min(project.scenes.length - 1, previewSceneIndex + 1))}
                  disabled={previewSceneIndex === project.scenes.length - 1}
                  data-testid="button-preview-next"
                >
                  Next
                </Button>
              </div>

              {/* Scene Thumbnails */}
              <ScrollArea className="h-20">
                <div className="flex gap-2">
                  {project.scenes.map((scene, index) => {
                    const thumbUrl = scene.assets?.imageUrl ? convertToDisplayUrl(scene.assets.imageUrl) : null;
                    return (
                      <button
                        key={scene.id}
                        onClick={() => {
                          setPreviewSceneIndex(index);
                          setIsPreviewPlaying(false);
                        }}
                        className={`relative flex-shrink-0 w-24 h-14 rounded overflow-hidden border-2 transition-all ${
                          index === previewSceneIndex ? 'border-primary ring-2 ring-primary/30' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                        data-testid={`button-preview-scene-${index}`}
                      >
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={`Scene ${scene.order}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-800 to-green-600 flex items-center justify-center">
                            <span className="text-white text-xs">{index + 1}</span>
                          </div>
                        )}
                        {index === previewSceneIndex && isPreviewPlaying && (
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Play className="w-4 h-4 text-white" fill="white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QA Dashboard Modal - Full Screen */}
      <Dialog open={showQADashboard} onOpenChange={setShowQADashboard}>
        <DialogContent className="w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Quality Assurance Dashboard
            </DialogTitle>
            <DialogDescription>
              Review and approve scenes before rendering
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto">
          <QADashboard
            report={qaReport}
            isLoading={isAnalyzingQA}
            onRunAnalysis={async () => {
              if (!project) return;
              setIsAnalyzingQA(true);
              try {
                const res = await fetch(`/api/universal-video/${project.id}/analyze-quality`, {
                  method: 'POST',
                  credentials: 'include'
                });
                const data = await res.json();
                if (data.success) {
                  // Backend returns report fields directly on response, not nested under 'report'
                  const report = {
                    projectId: data.projectId || project.id,
                    overallScore: data.overallScore,
                    sceneStatuses: data.sceneStatuses || data.sceneResults || [],
                    approvedCount: data.approvedCount || 0,
                    needsReviewCount: data.needsReviewCount || 0,
                    rejectedCount: data.rejectedCount || 0,
                    pendingCount: data.pendingCount || 0,
                    criticalIssueCount: data.criticalIssueCount || 0,
                    majorIssueCount: data.majorIssueCount || 0,
                    minorIssueCount: data.minorIssueCount || 0,
                    passesThreshold: data.passesThreshold,
                    canRender: data.canRender,
                    blockingReasons: data.blockingReasons || [],
                    lastAnalyzedAt: data.lastAnalyzedAt || new Date().toISOString(),
                  };
                  setQAReport(report);
                  toast({
                    title: "Analysis Complete",
                    description: `Quality score: ${report.overallScore}/100`,
                  });
                } else {
                  toast({
                    title: "Analysis Failed",
                    description: data.error || "Could not run quality analysis",
                    variant: "destructive",
                  });
                }
              } catch (err) {
                toast({
                  title: "Analysis Failed",
                  description: "Could not run quality analysis",
                  variant: "destructive",
                });
              } finally {
                setIsAnalyzingQA(false);
              }
            }}
            onApproveScene={async (sceneIndex) => {
              if (!project || !qaReport) return;
              try {
                const res = await fetch(`/api/universal-video/${project.id}/approve-scene/${sceneIndex}`, {
                  method: 'POST',
                  credentials: 'include'
                });
                const data = await res.json();
                if (data.success) {
                  setQAReport(data.report);
                  toast({ title: "Scene Approved" });
                }
              } catch (err) {
                toast({
                  title: "Approval Failed",
                  variant: "destructive",
                });
              }
            }}
            onRejectScene={async (sceneIndex, reason) => {
              if (!project || !qaReport) return;
              try {
                const res = await fetch(`/api/universal-video/${project.id}/reject-scene/${sceneIndex}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reason }),
                  credentials: 'include'
                });
                const data = await res.json();
                if (data.success) {
                  setQAReport(data.report);
                  toast({ title: "Scene Rejected" });
                }
              } catch (err) {
                toast({
                  title: "Rejection Failed",
                  variant: "destructive",
                });
              }
            }}
            onRegenerateScene={async (sceneIndex) => {
              if (!project) return;
              try {
                const res = await fetch(`/api/universal-video/${project.id}/regenerate-scene/${sceneIndex}`, {
                  method: 'POST',
                  credentials: 'include'
                });
                const data = await res.json();
                if (data.success) {
                  if (data.project) setProject(data.project);
                  toast({ title: "Scene Regenerating" });
                }
              } catch (err) {
                toast({
                  title: "Regeneration Failed",
                  variant: "destructive",
                });
              }
            }}
            onApproveAll={async () => {
              if (!project || !qaReport) return;
              try {
                const res = await fetch(`/api/universal-video/${project.id}/approve-all-scenes`, {
                  method: 'POST',
                  credentials: 'include'
                });
                const data = await res.json();
                if (data.success) {
                  setQAReport(data.report);
                  toast({ title: "All Scenes Approved" });
                }
              } catch (err) {
                toast({
                  title: "Approval Failed",
                  variant: "destructive",
                });
              }
            }}
            onProceedToRender={() => {
              setShowQADashboard(false);
              renderMutation.mutate();
            }}
          />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
