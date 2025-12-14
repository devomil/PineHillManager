import { useState, useRef } from "react";
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
import { VoiceSelector } from "./voice-selector";
import { 
  Video, Package, FileText, Play, Sparkles, AlertTriangle,
  CheckCircle, Clock, Loader2, ImageIcon, Volume2, Clapperboard,
  Download, RefreshCw, Settings, ChevronDown, ChevronUp, Upload, X, Star,
  FolderOpen, Plus, Eye, Layers, Pencil, Save, Music, Mic, VolumeX
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
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Music className="w-5 h-5" />
        <h4 className="font-medium">Music Controls</h4>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Volume</Label>
            <span className="text-sm text-muted-foreground">{volume}%</span>
          </div>
          <div className="flex items-center gap-3">
            <VolumeX className="w-4 h-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              onValueCommit={handleVolumeCommit}
              min={0}
              max={100}
              step={5}
              className="flex-1"
              data-testid="slider-music-volume"
            />
            <Volume2 className="w-4 h-4 text-muted-foreground" />
          </div>
          {isUpdatingVolume && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              Updating...
            </div>
          )}
        </div>
        
        <div className="space-y-3">
          <Label className="text-sm">Music Style</Label>
          <div className="flex gap-2">
            <Select value={selectedStyle} onValueChange={setSelectedStyle}>
              <SelectTrigger className="flex-1" data-testid="select-music-style">
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
              onClick={handleRegenerateMusic}
              disabled={isRegenerating}
              data-testid="button-regenerate-music"
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

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
  const [selectedVoiceName, setSelectedVoiceName] = useState(currentVoiceName || 'Rachel');
  const [isRegenerating, setIsRegenerating] = useState(false);

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
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Mic className="w-5 h-5" />
        <h4 className="font-medium">Voiceover Controls</h4>
      </div>
      
      <div className="space-y-3">
        <VoiceSelector
          selectedVoiceId={selectedVoiceId}
          onSelect={(voiceId, voiceName) => {
            setSelectedVoiceId(voiceId);
            setSelectedVoiceName(voiceName);
          }}
        />
        
        <Button
          onClick={handleRegenerateVoiceover}
          disabled={isRegenerating}
          className="w-full"
          data-testid="button-regenerate-voiceover"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Regenerating Voiceover...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate All Voiceover
            </>
          )}
        </Button>
        
        <p className="text-xs text-muted-foreground">
          This will regenerate voiceover for all scenes using the selected voice.
        </p>
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
  onToggleProductOverlay,
  onSceneUpdate 
}: { 
  scenes: Scene[]; 
  assets: VideoProject['assets'];
  projectId?: string;
  onToggleProductOverlay?: (sceneId: string, useOverlay: boolean) => void;
  onSceneUpdate?: () => void;
}) {
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<Record<string, string>>({});
  const [editingNarration, setEditingNarration] = useState<string | null>(null);
  const [editedNarration, setEditedNarration] = useState<Record<string, string>>({});
  const [savingNarration, setSavingNarration] = useState<string | null>(null);
  const [savingOverlay, setSavingOverlay] = useState<string | null>(null);
  const { toast } = useToast();

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
  
  return (
    <div className="space-y-3">
      {scenes.map((scene, index) => {
        const imageAsset = assets.images.find(img => img.sceneId === scene.id);
        const isExpanded = expandedScene === scene.id;
        const hasAIBackground = scene.assets?.backgroundUrl;
        const hasProductOverlay = scene.assets?.productOverlayUrl && scene.assets?.useProductOverlay !== false;
        const hasBrollVideo = scene.background?.type === 'video' && scene.background?.videoUrl;
        const defaultOverlay = SCENE_OVERLAY_DEFAULTS[scene.type] ?? false;
        const showsProductOverlay = scene.assets?.useProductOverlay ?? defaultOverlay;
        
        return (
          <Card key={scene.id} className="overflow-hidden">
            <div 
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
            >
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
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            
            {isExpanded && (
              <CardContent className="pt-0 pb-3">
                <Separator className="mb-3" />
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs text-muted-foreground">Narration</Label>
                      {projectId && editingNarration !== scene.id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            setEditingNarration(scene.id);
                            setEditedNarration(prev => ({ ...prev, [scene.id]: scene.narration }));
                          }}
                          data-testid={`button-edit-narration-${scene.id}`}
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
                          data-testid={`textarea-narration-${scene.id}`}
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveNarration(scene.id)}
                            disabled={savingNarration === scene.id}
                            data-testid={`button-save-narration-${scene.id}`}
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
                            data-testid={`button-cancel-narration-${scene.id}`}
                          >
                            Cancel
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          After saving, regenerate voiceover to update the audio.
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm">{scene.narration}</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Visual Direction</Label>
                    <p className="text-sm">{scene.background.source}</p>
                  </div>
                  
                  {hasBrollVideo && (
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Video className="w-3 h-3" /> B-Roll Video
                      </Label>
                      <div className="w-full aspect-video rounded-lg overflow-hidden mt-2 border bg-black">
                        <video 
                          src={convertToDisplayUrl(scene.background!.videoUrl!)}
                          className="w-full h-full object-contain"
                          controls
                          muted
                          playsInline
                          data-testid={`video-broll-${scene.id}`}
                        />
                      </div>
                    </div>
                  )}
                  
                  {projectId && (
                    <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Regenerate Assets
                      </Label>
                      <Input
                        placeholder="Custom prompt/query (optional)"
                        value={customPrompt[scene.id] || ''}
                        onChange={(e) => setCustomPrompt(prev => ({ ...prev, [scene.id]: e.target.value }))}
                        className="text-sm h-8"
                        data-testid={`input-custom-prompt-${scene.id}`}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regenerateImage(scene.id)}
                          disabled={!!regenerating}
                          data-testid={`button-regenerate-image-${scene.id}`}
                        >
                          {regenerating === `image-${scene.id}` ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <ImageIcon className="w-3 h-3 mr-1" />
                          )}
                          New Image
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => regenerateVideo(scene.id)}
                          disabled={!!regenerating}
                          data-testid={`button-regenerate-video-${scene.id}`}
                        >
                          {regenerating === `video-${scene.id}` ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Video className="w-3 h-3 mr-1" />
                          )}
                          New Video
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => switchBackground(scene.id, !(scene.background?.type === 'video'))}
                          disabled={!!regenerating}
                          data-testid={`button-switch-background-${scene.id}`}
                        >
                          {regenerating === `switch-${scene.id}` ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : scene.background?.type === 'video' ? (
                            <ImageIcon className="w-3 h-3 mr-1" />
                          ) : (
                            <Video className="w-3 h-3 mr-1" />
                          )}
                          {scene.background?.type === 'video' ? 'Use Image' : 'Use Video'}
                        </Button>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Current: {scene.background?.type === 'video' ? '🎬 Video' : '🖼️ Image'}
                      </div>
                    </div>
                  )}
                  
                  {hasAIBackground && (
                    <>
                      <div className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
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
                            data-testid={`switch-product-overlay-${scene.id}`}
                          />
                        </div>
                      </div>
                      
                      {showsProductOverlay && projectId && scene.assets?.productOverlayUrl && (
                        <div className="p-3 bg-muted/30 rounded-lg border space-y-3">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Settings className="w-3 h-3" /> Overlay Settings
                            {savingOverlay === scene.id && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
                          </Label>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Horizontal</Label>
                              <Select 
                                value={scene.assets?.productOverlayPosition?.x || 'center'}
                                onValueChange={(val) => updateProductOverlay(scene.id, { 
                                  position: { 
                                    x: val as 'left' | 'center' | 'right', 
                                    y: scene.assets?.productOverlayPosition?.y || 'center' 
                                  }
                                })}
                              >
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-overlay-x-${scene.id}`}>
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
                                value={scene.assets?.productOverlayPosition?.y || 'center'}
                                onValueChange={(val) => updateProductOverlay(scene.id, { 
                                  position: { 
                                    x: scene.assets?.productOverlayPosition?.x || 'center', 
                                    y: val as 'top' | 'center' | 'bottom' 
                                  }
                                })}
                              >
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-overlay-y-${scene.id}`}>
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
                                value={scene.assets?.productOverlayPosition?.animation || 'fade'}
                                onValueChange={(val) => updateProductOverlay(scene.id, { 
                                  animation: val as OverlayAnimation 
                                })}
                              >
                                <SelectTrigger className="h-8 text-xs" data-testid={`select-overlay-animation-${scene.id}`}>
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
                          
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Scale</Label>
                              <span className="text-xs text-muted-foreground">
                                {Math.round((scene.assets?.productOverlayPosition?.scale || 0.4) * 100)}%
                              </span>
                            </div>
                            <Slider
                              value={[(scene.assets?.productOverlayPosition?.scale || 0.4) * 100]}
                              onValueCommit={(val) => updateProductOverlay(scene.id, { scale: val[0] / 100 })}
                              min={10}
                              max={80}
                              step={5}
                              className="w-full"
                              data-testid={`slider-overlay-scale-${scene.id}`}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">AI Background</Label>
                          <div className="w-full aspect-video rounded-lg overflow-hidden mt-2 border">
                            <img 
                              src={convertToDisplayUrl(scene.assets!.backgroundUrl!)} 
                              alt="AI background"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                        {scene.assets?.productOverlayUrl && (
                          <div className={`${!showsProductOverlay ? 'opacity-50' : ''}`}>
                            <Label className="text-xs text-muted-foreground">
                              Product {!showsProductOverlay && '(Disabled)'}
                            </Label>
                            <div className="w-full aspect-video rounded-lg overflow-hidden mt-2 border checkerboard-bg flex items-center justify-center">
                              <img 
                                src={convertToDisplayUrl(scene.assets!.productOverlayUrl!)} 
                                alt="Product"
                                className="max-w-[90%] max-h-[90%] object-contain"
                                onError={(e) => { 
                                  e.currentTarget.parentElement!.innerHTML = '<span class="text-xs text-muted-foreground">Image not loaded</span>';
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
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
      const response = await apiRequest("POST", `/api/universal-video/projects/${project.id}/generate-assets`);
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
                
                <div className="flex gap-2">
                  {project.status === 'draft' && (
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
                <h4 className="font-medium mb-3">Scenes Preview</h4>
                <ScrollArea className="h-[400px] pr-4">
                  <ScenePreview 
                    scenes={project.scenes} 
                    assets={project.assets}
                    projectId={project.id}
                    onToggleProductOverlay={handleToggleProductOverlay}
                    onSceneUpdate={() => queryClient.invalidateQueries({ queryKey: ['/api/universal-video/projects', project.id] })}
                  />
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
