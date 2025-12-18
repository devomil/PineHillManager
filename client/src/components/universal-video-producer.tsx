import { useState, useRef, useEffect, useCallback } from "react";
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
import { VoiceSelector } from "./voice-selector";
import { 
  Video, Package, FileText, Play, Sparkles, AlertTriangle,
  CheckCircle, Clock, Loader2, ImageIcon, Volume2, Clapperboard,
  Download, RefreshCw, Settings, ChevronDown, ChevronUp, Upload, X, Star,
  FolderOpen, Plus, Eye, Layers, Pencil, Save, Music, Mic, VolumeX,
  Undo2, Redo2, GripVertical
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
}

const STEP_ICONS: Record<string, any> = {
  script: FileText,
  voiceover: Volume2,
  images: ImageIcon,
  videos: Video,
  music: Clapperboard,
  assembly: Sparkles,
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

        <div className="space-y-2">
          <Label>Visual Style</Label>
          <Select
            value={formData.style}
            onValueChange={(val) => setFormData(prev => ({ ...prev, style: val as any }))}
          >
            <SelectTrigger data-testid="select-script-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="energetic">Energetic</SelectItem>
              <SelectItem value="calm">Calm</SelectItem>
              <SelectItem value="cinematic">Cinematic</SelectItem>
              <SelectItem value="documentary">Documentary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button 
        className="w-full" 
        onClick={() => onSubmit(formData)}
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

function ProgressTracker({ project }: { project: VideoProject }) {
  const steps: StepKey[] = ["script", "voiceover", "images", "videos", "music", "assembly", "rendering"];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Overall Progress</span>
        <span className="text-sm text-muted-foreground">{project.progress.overallPercent}%</span>
      </div>
      <Progress value={project.progress.overallPercent} className="h-2" />
      
      <div className="grid grid-cols-7 gap-1 mt-4">
        {steps.map((step) => {
          const stepData = project.progress.steps[step as keyof typeof project.progress.steps];
          const Icon = STEP_ICONS[step] || Settings;
          
          return (
            <div key={step} className="flex flex-col items-center">
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
  const [mediaPickerSource, setMediaPickerSource] = useState<'ai' | 'pexels' | 'unsplash' | 'brand' | 'library'>('ai');
  const [applyingMedia, setApplyingMedia] = useState<string | null>(null);
  const { toast } = useToast();
  
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
      const res = await fetch(`/api/universal-video/projects/${projectId}/scenes/${sceneId}/visual-direction`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ visualDirection: newVisualDirection })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Visual direction saved', description: 'Regenerate image/video to apply changes.' });
        setEditingVisualDirection(null);
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

  const regenerateImage = async (sceneId: string) => {
    if (!projectId) return;
    setRegenerating(`image-${sceneId}`);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/scenes/${sceneId}/regenerate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: customPrompt[sceneId] || undefined })
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

  const regenerateVideo = async (sceneId: string) => {
    if (!projectId) return;
    setRegenerating(`video-${sceneId}`);
    try {
      const res = await fetch(`/api/universal-video/${projectId}/scenes/${sceneId}/regenerate-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: customPrompt[sceneId] || undefined })
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: 'Video regenerated', description: `New video from ${data.source}` });
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

  // Open media picker for a scene
  const openMediaPicker = (sceneId: string, type: 'image' | 'video', source: 'ai' | 'pexels' | 'unsplash' | 'brand' | 'library') => {
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

  return (
    <>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={scenes.map(s => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {isReordering && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted/50 rounded">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving new order...
            </div>
          )}
          {scenes.map((scene, index) => {
            const imageAsset = assets.images.find(img => img.sceneId === scene.id);
            const isEditing = sceneEditorOpen === scene.id;
            const hasAIBackground = scene.assets?.backgroundUrl;
            const hasProductOverlay = scene.assets?.productOverlayUrl && scene.assets?.useProductOverlay !== false;
            const hasBrollVideo = scene.background?.type === 'video' && scene.background?.videoUrl;
            const defaultOverlay = SCENE_OVERLAY_DEFAULTS[scene.type] ?? false;
            const showsProductOverlay = scene.assets?.useProductOverlay ?? defaultOverlay;
            
            return (
              <SortableSceneItem key={scene.id} scene={scene} index={index}>
                {(dragHandle) => (
                  <Card className="overflow-hidden">
                    <div 
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => setSceneEditorOpen(scene.id)}
                    >
                      {dragHandle}
              <div className="w-28 h-16 bg-muted rounded overflow-hidden flex-shrink-0 relative">
                {hasBrollVideo ? (
                  <div className="relative w-full h-full">
                    <video 
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
                  <Badge variant="outline" className="text-xs capitalize">
                    {scene.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {scene.duration}s
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
                {hasBrollVideo ? (
                  <div>
                    <Label className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                      <Video className="w-4 h-4" /> B-Roll Video
                    </Label>
                    <div className="w-full rounded-lg overflow-hidden border bg-black" style={{ aspectRatio: '16/9' }}>
                      <video 
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
                    
                    {/* Media Source Buttons */}
                    <div className="grid grid-cols-2 gap-4">
                      {/* Image Sources */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Image Sources</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm"
                            onClick={() => regenerateImage(scene.id)}
                            disabled={!!regenerating}
                            data-testid={`button-source-ai-image-modal-${scene.id}`}
                          >
                            {regenerating === `image-${scene.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" /> AI</>}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm"
                            onClick={() => openMediaPicker(scene.id, 'image', 'pexels')}
                            disabled={!!regenerating || !!applyingMedia}
                            data-testid={`button-source-pexels-image-modal-${scene.id}`}
                          >
                            Pexels
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm"
                            onClick={() => openMediaPicker(scene.id, 'image', 'unsplash')}
                            disabled={!!regenerating || !!applyingMedia}
                            data-testid={`button-source-unsplash-image-modal-${scene.id}`}
                          >
                            Unsplash
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm"
                            onClick={() => openMediaPicker(scene.id, 'image', 'brand')}
                            disabled={!!regenerating || !!applyingMedia}
                            data-testid={`button-source-brand-image-modal-${scene.id}`}
                          >
                            Brand Media
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm"
                            onClick={() => openMediaPicker(scene.id, 'image', 'library')}
                            disabled={!!regenerating || !!applyingMedia}
                            data-testid={`button-source-library-image-modal-${scene.id}`}
                          >
                            Asset Library
                          </Button>
                        </div>
                      </div>
                      
                      {/* Video Sources */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Video Sources</Label>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm"
                            onClick={() => regenerateVideo(scene.id)}
                            disabled={!!regenerating}
                            data-testid={`button-source-ai-video-modal-${scene.id}`}
                          >
                            {regenerating === `video-${scene.id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4 mr-1" /> AI</>}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm"
                            onClick={() => openMediaPicker(scene.id, 'video', 'pexels')}
                            disabled={!!regenerating || !!applyingMedia}
                            data-testid={`button-source-pexels-video-modal-${scene.id}`}
                          >
                            Pexels
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm"
                            onClick={() => openMediaPicker(scene.id, 'video', 'brand')}
                            disabled={!!regenerating || !!applyingMedia}
                            data-testid={`button-source-brand-video-modal-${scene.id}`}
                          >
                            Brand Media
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-sm"
                            onClick={() => openMediaPicker(scene.id, 'video', 'library')}
                            disabled={!!regenerating || !!applyingMedia}
                            data-testid={`button-source-library-video-modal-${scene.id}`}
                          >
                            Asset Library
                          </Button>
                        </div>
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
              </div>
            </div>
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
  source: 'ai' | 'pexels' | 'unsplash' | 'brand' | 'library';
  onSourceChange: (source: 'ai' | 'pexels' | 'unsplash' | 'brand' | 'library') => void;
  onMediaSelect: (url: string, type: 'image' | 'video', source: string) => void;
  isApplying: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pexelsResults, setPexelsResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Fetch brand media library
  const { data: brandMediaData } = useQuery<{ success: boolean; assets: any[] }>({
    queryKey: ['/api/brand-media-library'],
    enabled: open && source === 'brand',
  });
  
  // Fetch asset library (general assets)
  const { data: assetLibraryData } = useQuery<{ success: boolean; assets: any[] }>({
    queryKey: ['/api/videos/assets', { type: mediaType === 'video' ? 'video' : 'all' }],
    enabled: open && source === 'library',
  });
  
  const brandAssets = brandMediaData?.assets || [];
  const libraryAssets = assetLibraryData?.assets || [];
  
  // Filter brand assets by media type
  const filteredBrandAssets = brandAssets.filter(a => {
    if (mediaType === 'video') return a.mediaType === 'video';
    return a.mediaType === 'photo' || a.mediaType === 'image';
  });
  
  // Filter library assets by type  
  const filteredLibraryAssets = libraryAssets.filter(a => {
    if (mediaType === 'video') return a.type === 'video';
    return a.type === 'image';
  });
  
  // Search Pexels/Unsplash
  const searchStock = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const endpoint = source === 'pexels' 
        ? `/api/stock/${mediaType === 'video' ? 'videos' : 'images'}/search?query=${encodeURIComponent(searchQuery)}&source=pexels`
        : `/api/stock/images/search?query=${encodeURIComponent(searchQuery)}&source=unsplash`;
      const res = await fetch(endpoint, { credentials: 'include' });
      const data = await res.json();
      setPexelsResults(data.results || data.photos || data.videos || []);
    } catch (err) {
      console.error('Stock search error:', err);
    } finally {
      setIsSearching(false);
    }
  };
  
  const getSourceLabel = () => {
    switch (source) {
      case 'pexels': return 'Pexels Stock';
      case 'unsplash': return 'Unsplash Stock';
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
          {['pexels', 'unsplash', 'brand', 'library'].map((s) => {
            if (s === 'unsplash' && mediaType === 'video') return null;
            return (
              <Button
                key={s}
                size="sm"
                variant={source === s ? 'default' : 'outline'}
                className="h-7 text-xs"
                onClick={() => onSourceChange(s as any)}
              >
                {s === 'pexels' ? 'Pexels' : s === 'unsplash' ? 'Unsplash' : s === 'brand' ? 'Brand Media' : 'Asset Library'}
              </Button>
            );
          })}
        </div>
        
        {/* Search for stock sources */}
        {(source === 'pexels' || source === 'unsplash') && (
          <div className="flex gap-2">
            <Input
              placeholder={`Search ${source === 'pexels' ? 'Pexels' : 'Unsplash'} for ${mediaType}s...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchStock()}
              className="flex-1"
            />
            <Button onClick={searchStock} disabled={isSearching}>
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
        )}
        
        {/* Results Grid */}
        <ScrollArea className="flex-1 min-h-[300px]">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-3 p-1">
            {/* Pexels/Unsplash Results */}
            {(source === 'pexels' || source === 'unsplash') && pexelsResults.map((item, idx) => {
              const url = mediaType === 'video' 
                ? (item.video_files?.[0]?.link || item.url)
                : (item.src?.large || item.urls?.regular || item.url);
              const thumbnail = mediaType === 'video'
                ? (item.image || item.video_pictures?.[0]?.picture)
                : (item.src?.medium || item.urls?.thumb || item.url);
              
              return (
                <div
                  key={idx}
                  className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                  onClick={() => onMediaSelect(url, mediaType, source)}
                >
                  <div className="aspect-video bg-gray-200">
                    {mediaType === 'video' ? (
                      <div className="relative w-full h-full">
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="w-8 h-8 text-white drop-shadow-lg" />
                        </div>
                      </div>
                    ) : (
                      <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Button size="sm" variant="secondary" disabled={isApplying}>
                      {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Use This'}
                    </Button>
                  </div>
                </div>
              );
            })}
            
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
            
            {/* Asset Library Results */}
            {source === 'library' && filteredLibraryAssets.map((item) => (
              <div
                key={item.id}
                className="relative group cursor-pointer rounded-lg overflow-hidden border hover:border-primary transition-colors"
                onClick={() => onMediaSelect(item.url, mediaType, 'Asset Library')}
              >
                <div className="aspect-video bg-gray-200">
                  {item.type === 'video' ? (
                    <div className="relative w-full h-full bg-gray-900 flex items-center justify-center">
                      <Video className="w-8 h-8 text-white/70" />
                    </div>
                  ) : (
                    <img 
                      src={item.thumbnail_url || item.url} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
                <div className="p-1.5">
                  <p className="text-xs font-medium truncate">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">{item.source}</p>
                </div>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Button size="sm" variant="secondary" disabled={isApplying}>
                    {isApplying ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Use This'}
                  </Button>
                </div>
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
            {(source === 'pexels' || source === 'unsplash') && pexelsResults.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Search for {mediaType}s above</p>
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
      return response.json();
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
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{project.title}</h3>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>{project.scenes.length} scenes | {project.totalDuration}s</span>
                    <Badge variant="outline" className="ml-2 capitalize">{project.status}</Badge>
                  </div>
                </div>
                
                <div className="flex gap-2 items-center">
                  {project.status === 'draft' && (
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
                        onClick={() => generateAssetsMutation.mutate()}
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
                    <Button
                      onClick={() => renderMutation.mutate()}
                      disabled={renderMutation.isPending}
                      data-testid="button-render-video"
                    >
                      {renderMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      {project.status === 'error' ? 'Retry Render' : 'Render Video'}
                    </Button>
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
              
              <ProgressTracker project={project} />
              
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
    </div>
  );
}
