import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Upload, 
  Beef, 
  Flower, 
  Heart, 
  Leaf, 
  Apple, 
  Milk,
  Wheat,
  Egg,
  Cherry,
  Carrot,
  Fish,
  Salad,
  Pizza,
  Soup,
  Cookie,
  Wine,
  Coffee,
  IceCream,
  Candy,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";

interface AvatarCustomizationProps {
  isOpen: boolean;
  onClose: () => void;
  currentAvatarUrl?: string;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const farmHealthIcons = [
  { icon: Beef, name: "beef", color: "#ef4444" },
  { icon: Flower, name: "flower", color: "#ec4899" },
  { icon: Heart, name: "heart", color: "#f43f5e" },
  { icon: Leaf, name: "leaf", color: "#10b981" },
  { icon: Apple, name: "apple", color: "#dc2626" },
  { icon: Milk, name: "milk", color: "#60a5fa" },
  { icon: Wheat, name: "wheat", color: "#f59e0b" },
  { icon: Egg, name: "egg", color: "#fbbf24" },
  { icon: Cherry, name: "cherry", color: "#dc2626" },
  { icon: Carrot, name: "carrot", color: "#f97316" },
  { icon: Fish, name: "fish", color: "#06b6d4" },
  { icon: Salad, name: "salad", color: "#22c55e" },
  { icon: Pizza, name: "pizza", color: "#f59e0b" },
  { icon: Soup, name: "soup", color: "#f97316" },
  { icon: Cookie, name: "cookie", color: "#d97706" },
  { icon: Wine, name: "wine", color: "#7c3aed" },
  { icon: Coffee, name: "coffee", color: "#78716c" },
  { icon: IceCream, name: "ice-cream", color: "#f472b6" },
  { icon: Candy, name: "candy", color: "#ec4899" },
  { icon: User, name: "user", color: "#6366f1" },
];

export default function AvatarCustomization({ isOpen, onClose, currentAvatarUrl }: AvatarCustomizationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<"upload" | "icon">("upload");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string);
      });
      reader.readAsDataURL(file);
    }
  };

  const createImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.src = url;
    });
  };

  const getCroppedImg = async (imageSrc: string, pixelCrop: CropArea): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/jpeg', 0.95);
    });
  };

  const handleSavePhoto = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast({
        title: "No image selected",
        description: "Please select and crop an image first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      
      const formData = new FormData();
      formData.append('avatar', croppedImageBlob, 'avatar.jpg');

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        
        toast({
          title: "Avatar updated!",
          description: "Your profile photo has been updated successfully.",
        });
        
        onClose();
      } else {
        throw new Error('Failed to upload avatar');
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload your avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveIcon = async () => {
    if (!selectedIcon) {
      toast({
        title: "No icon selected",
        description: "Please select an icon first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      const response = await apiRequest('PATCH', '/api/user/avatar', {
        iconType: selectedIcon,
      });

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        
        toast({
          title: "Avatar updated!",
          description: "Your profile icon has been updated successfully.",
        });
        
        onClose();
      } else {
        throw new Error('Failed to update avatar');
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update your avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Customize Your Avatar</DialogTitle>
          <DialogDescription>
            Upload a photo or choose a fun farm/health icon
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "upload" | "icon")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" data-testid="tab-upload-photo">
              <Upload className="w-4 h-4 mr-2" />
              Upload Photo
            </TabsTrigger>
            <TabsTrigger value="icon" data-testid="tab-choose-icon">
              <Leaf className="w-4 h-4 mr-2" />
              Choose Icon
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div>
              <Label htmlFor="avatar-upload">Select a photo</Label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="mt-2"
                data-testid="input-avatar-upload"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max file size: 5MB. Supported formats: JPG, PNG, GIF
              </p>
            </div>

            {imageSrc && (
              <>
                <div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Zoom</Label>
                  <Slider
                    value={[zoom]}
                    min={1}
                    max={3}
                    step={0.1}
                    onValueChange={(value) => setZoom(value[0])}
                    data-testid="slider-zoom"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleSavePhoto}
                    disabled={isUploading}
                    className="flex-1"
                    data-testid="button-save-photo"
                  >
                    {isUploading ? "Uploading..." : "Save Photo"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setImageSrc(null)}
                    data-testid="button-cancel-upload"
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="icon" className="space-y-4">
            <div>
              <Label>Select an icon</Label>
              <div className="grid grid-cols-5 gap-3 mt-3">
                {farmHealthIcons.map(({ icon: Icon, name, color }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedIcon(name)}
                    className={`
                      flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all
                      ${selectedIcon === name 
                        ? 'border-primary bg-primary/10' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }
                    `}
                    data-testid={`icon-${name}`}
                  >
                    <Icon className="w-8 h-8" style={{ color }} />
                    <span className="text-xs mt-1 capitalize">{name}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSaveIcon}
              disabled={!selectedIcon || isUploading}
              className="w-full"
              data-testid="button-save-icon"
            >
              {isUploading ? "Saving..." : "Save Icon"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
