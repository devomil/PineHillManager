import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Video, 
  Download, 
  Camera,
  Wand2,
  FileText,
  Clock,
  Image as ImageIcon,
  Sparkles,
  CheckCircle,
  PlayCircle,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ProductVideoCreator, VideoConfig } from '@/lib/video-generator';

export default function VideoCreator() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<{
    videoBlob: Blob;
    downloadUrl: string;
    fileName: string;
  } | null>(null);
  
  const [config, setConfig] = useState<VideoConfig>({
    productName: '',
    productDescription: '',
    productImages: [],
    duration: 30,
    style: 'professional',
    backgroundColor: '#f0f9ff',
    textColor: '#1e40af',
    fontSize: 48,
    voiceScript: ''
  });

  // Handle file upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      setConfig(prev => ({ ...prev, productImages: [...prev.productImages, ...imageFiles] }));
    }
  };

  // Remove uploaded image
  const removeImage = (index: number) => {
    setConfig(prev => ({
      ...prev,
      productImages: prev.productImages.filter((_, i) => i !== index)
    }));
  };

  // Generate video using client-side processing
  const handleGenerateVideo = async () => {
    if (!config.productName.trim()) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name to generate the video.",
        variant: "destructive",
      });
      return;
    }

    if (config.productImages.length === 0) {
      toast({
        title: "Product Images Required", 
        description: "Please upload at least one product image.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      const videoCreator = new ProductVideoCreator();
      
      const result = await videoCreator.createVideo(config, (progress) => {
        setGenerationProgress(progress);
      });

      setGeneratedVideo(result);
      
      toast({
        title: "Video Generated Successfully!",
        description: "Your product video has been created and is ready for download.",
      });
      
    } catch (error) {
      console.error('Video generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Download the generated video
  const downloadVideo = () => {
    if (generatedVideo) {
      const link = document.createElement('a');
      link.href = generatedVideo.downloadUrl;
      link.download = generatedVideo.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold" style={{fontFamily: 'Great Vibes, cursive'}}>
            <Video className="h-8 w-8 text-blue-600" />
            Product Video Creator
          </CardTitle>
          <CardDescription className="text-lg">
            Create professional marketing videos from your product images and descriptions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Product Information */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Product Information
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="productName">Product Name *</Label>
              <Input
                id="productName"
                placeholder="Enter your product name"
                value={config.productName}
                onChange={(e) => setConfig(prev => ({ ...prev, productName: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productDescription">Product Description *</Label>
              <Textarea
                id="productDescription"
                placeholder="Describe your product's key features and benefits"
                value={config.productDescription}
                onChange={(e) => setConfig(prev => ({ ...prev, productDescription: e.target.value }))}
              />
            </div>
          </div>

          {/* Step 2: Upload Images */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Product Images *
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <div className="text-lg font-medium">Upload Product Images</div>
                <div className="text-sm text-gray-500">
                  Upload 1-3 high-quality product images (PNG, JPG, GIF)
                </div>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="max-w-xs mx-auto"
                />
              </div>
            </div>

            {/* Display uploaded images */}
            {config.productImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {config.productImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <div className="absolute bottom-1 left-1 right-1 text-xs text-white bg-black bg-opacity-50 rounded px-1 py-0.5 truncate">
                      {image.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Step 3: Video Settings */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Video Settings
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Video Duration</Label>
                <Select value={config.duration.toString()} onValueChange={(value) => setConfig(prev => ({ ...prev, duration: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">60 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="style">Video Style</Label>
                <Select value={config.style} onValueChange={(value) => setConfig(prev => ({ ...prev, style: value as 'professional' | 'modern' | 'elegant' }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="elegant">Elegant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="backgroundColor">Background Color</Label>
                <Input
                  type="color"
                  value={config.backgroundColor}
                  onChange={(e) => setConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="textColor">Text Color</Label>
                <Input
                  type="color"
                  value={config.textColor}
                  onChange={(e) => setConfig(prev => ({ ...prev, textColor: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Generation Progress */}
          {isGenerating && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 animate-spin" />
                Generating Your Video...
              </h3>
              <Progress value={generationProgress} className="w-full" />
              <p className="text-sm text-gray-600 text-center">
                Creating video frames and processing... ({generationProgress}%)
              </p>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerateVideo}
            disabled={isGenerating || !config.productName || config.productImages.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
          >
            {isGenerating ? (
              <>
                <Wand2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Video... {generationProgress}%
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Generate Video
              </>
            )}
          </Button>

          {/* Generated Video Display */}
          {generatedVideo && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-6 w-6" />
                  Video Generated Successfully!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <video 
                  controls 
                  className="w-full rounded-lg shadow-lg"
                  src={generatedVideo.downloadUrl}
                >
                  Your browser does not support video playback.
                </video>
                
                <div className="flex gap-3">
                  <Button onClick={downloadVideo} className="flex-1">
                    <Download className="mr-2 h-4 w-4" />
                    Download Video
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setGeneratedVideo(null)}
                  >
                    Generate New Video
                  </Button>
                </div>
                
                <p className="text-sm text-gray-600">
                  File: {generatedVideo.fileName}
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}