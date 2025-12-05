import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Video, Package, FileText, Play, Sparkles, AlertTriangle,
  CheckCircle, Clock, Loader2, ImageIcon, Volume2, Clapperboard,
  Download, RefreshCw, Settings, ChevronDown, ChevronUp, Upload, X, Star,
  FolderOpen, Plus, Eye
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

function getImageDisplayUrl(image: ProductImage): string {
  if (image._blobUrl) return image._blobUrl;
  if (!image.url) return '';
  
  const url = image.url;
  
  if (url.startsWith('http')) return url;
  
  let normalizedPath = url.startsWith('/') ? url : `/${url}`;
  
  if (normalizedPath.startsWith('/objects')) return normalizedPath;
  
  return `/objects${normalizedPath}`;
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
            className="relative group aspect-square rounded-lg overflow-hidden border bg-muted"
          >
            <img
              src={getImageDisplayUrl(image)}
              alt={image.name}
              className="w-full h-full object-cover"
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

function ProgressTracker({ project }: { project: VideoProject }) {
  const steps = ["script", "voiceover", "images", "videos", "music", "assembly", "rendering"];
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Overall Progress</span>
        <span className="text-sm text-muted-foreground">{project.progress.overallPercent}%</span>
      </div>
      <Progress value={project.progress.overallPercent} className="h-2" />
      
      <div className="grid grid-cols-7 gap-1 mt-4">
        {steps.map((step) => {
          const stepData = project.progress.steps[step];
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

function ScenePreview({ scenes, assets }: { scenes: Scene[]; assets: VideoProject['assets'] }) {
  const [expandedScene, setExpandedScene] = useState<string | null>(null);
  
  return (
    <div className="space-y-3">
      {scenes.map((scene, index) => {
        const imageAsset = assets.images.find(img => img.sceneId === scene.id);
        const isExpanded = expandedScene === scene.id;
        
        return (
          <Card key={scene.id} className="overflow-hidden">
            <div 
              className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
              onClick={() => setExpandedScene(isExpanded ? null : scene.id)}
            >
              <div className="w-24 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
                {imageAsset?.url ? (
                  <img 
                    src={imageAsset.url} 
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
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs capitalize">
                    {scene.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {scene.duration}s
                  </span>
                </div>
                <p className="text-sm truncate mt-1">{scene.narration.substring(0, 60)}...</p>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
            
            {isExpanded && (
              <CardContent className="pt-0 pb-3">
                <Separator className="mb-3" />
                <div className="space-y-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Narration</Label>
                    <p className="text-sm">{scene.narration}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Visual Direction</Label>
                    <p className="text-sm">{scene.background.source}</p>
                  </div>
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
    
    const poll = async () => {
      try {
        const response = await apiRequest(
          "GET",
          `/api/universal-video/projects/${project.id}/render-status?renderId=${id}&bucketName=${bucket}`
        );
        const data = await response.json();
        
        if (data.success) {
          setProject(data.project);
          
          if (data.done && data.outputUrl) {
            setOutputUrl(data.outputUrl);
            toast({
              title: "Video Complete!",
              description: "Your video has been rendered successfully.",
            });
            return;
          }
          
          if (!data.done) {
            setTimeout(poll, 3000);
          }
        }
      } catch (error) {
        console.error("Poll error:", error);
      }
    };
    
    poll();
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
                  
                  {project.status === 'ready' && (
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
                      Render Video
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
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Scenes Preview</h4>
                <ScrollArea className="h-[400px] pr-4">
                  <ScenePreview scenes={project.scenes} assets={project.assets} />
                </ScrollArea>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
