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
import { ProductVideoCreator, VideoConfig } from '@/lib/simple-video-generator';
import { ContentGenerator } from '@/lib/content-generator';

export default function VideoCreator() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [contentGenerator] = useState(() => new ContentGenerator());
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
    style: 'pharmaceutical',
    healthConcern: '',
    benefits: [],
    ingredients: [],
    callToAction: ''
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
      
      // Simulate progress updates during generation
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 500);
      
      const result = await videoCreator.createVideo(config, (progress) => {
        clearInterval(progressInterval);
        setGenerationProgress(progress);
      });
      
      clearInterval(progressInterval);

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
            Professional Animated Video Creator
          </CardTitle>
          <CardDescription className="text-lg">
            Create professional pharmaceutical-style marketing videos with multiple animated scenes, smooth transitions, and medical industry styling
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

          {/* Step 3: Professional Marketing Content */}
          <div className="grid gap-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Professional Marketing Content
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="healthConcern">Health Concern/Problem</Label>
              <Input
                id="healthConcern"
                placeholder="e.g., Joint Pain, Low Energy, Poor Sleep"
                value={config.healthConcern}
                onChange={(e) => setConfig(prev => ({ ...prev, healthConcern: e.target.value }))}
              />
              <p className="text-sm text-gray-500">The health issue your product addresses</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="benefits">Product Benefits (one per line)</Label>
              <Textarea
                id="benefits"
                placeholder="Natural ingredients&#10;Fast-acting formula&#10;Clinically tested&#10;No side effects"
                value={config.benefits.join('\n')}
                onChange={(e) => setConfig(prev => ({ ...prev, benefits: e.target.value.split('\n').filter(b => b.trim()) }))}
                rows={4}
              />
              <p className="text-sm text-gray-500">Enter each benefit on a separate line</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ingredients">Key Ingredients (one per line)</Label>
              <Textarea
                id="ingredients"
                placeholder="Turmeric Extract&#10;Vitamin D3&#10;Omega-3 Fatty Acids&#10;Magnesium"
                value={config.ingredients.join('\n')}
                onChange={(e) => setConfig(prev => ({ ...prev, ingredients: e.target.value.split('\n').filter(i => i.trim()) }))}
                rows={3}
              />
              <p className="text-sm text-gray-500">Enter each ingredient on a separate line</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="callToAction">Call to Action</Label>
              <Input
                id="callToAction"
                placeholder="Order Now - Limited Time Offer"
                value={config.callToAction}
                onChange={(e) => setConfig(prev => ({ ...prev, callToAction: e.target.value }))}
              />
              <p className="text-sm text-gray-500">Your final call-to-action message</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="20"
                  max="60"
                  value={config.duration}
                  onChange={(e) => setConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                />
                <p className="text-sm text-gray-500">Recommended: 30 seconds</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="style">Video Style</Label>
                <Select 
                  value={config.style} 
                  onValueChange={(value) => setConfig(prev => ({ ...prev, style: value as 'pharmaceutical' | 'medical' | 'clinical' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pharmaceutical">Pharmaceutical Agency Style</SelectItem>
                    <SelectItem value="medical">Medical Professional</SelectItem>
                    <SelectItem value="clinical">Clinical Research</SelectItem>
                  </SelectContent>
                </Select>
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

          {/* Validation Status for Debugging */}
          {!isGenerating && (
            <div className="text-sm text-gray-600 space-y-1">
              <div className="font-medium">Form Validation:</div>
              <div className={config.productName.trim() ? "text-green-600" : "text-red-600"}>
                ✓ Product Name: {config.productName.trim() ? "Complete" : "Required"}
              </div>
              <div className={config.productImages.length > 0 ? "text-green-600" : "text-red-600"}>
                ✓ Product Images: {config.productImages.length > 0 ? `${config.productImages.length} uploaded` : "Required"}
              </div>
              <div className={config.healthConcern.trim() ? "text-green-600" : "text-red-600"}>
                ✓ Health Concern: {config.healthConcern.trim() ? "Complete" : "Required"}
              </div>
              <div className={config.benefits.length > 0 ? "text-green-600" : "text-red-600"}>
                ✓ Benefits: {config.benefits.length > 0 ? `${config.benefits.length} benefits` : "Required"}
              </div>
            </div>
          )}

          {/* Generate Button */}
          <Button
            onClick={handleGenerateVideo}
            disabled={isGenerating || !config.productName.trim() || config.productImages.length === 0 || !config.healthConcern.trim() || config.benefits.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Wand2 className="mr-2 h-5 w-5 animate-spin" />
                Generating Video... {generationProgress}%
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Generate Professional Marketing Video
              </>
            )}
          </Button>

          {/* Generated Video Display */}
          {generatedVideo && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle className="h-6 w-6" />
                  Professional Marketing Video Generated!
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <div className="font-semibold text-blue-800 mb-1">Professional Features Included:</div>
                  <ul className="text-blue-700 text-xs space-y-1">
                    <li>• Animated problem statement with health concern icons</li>
                    <li>• Product reveal with smooth slide-in animations</li>
                    <li>• 3-step "How It Works" infographic with progressive reveal</li>
                    <li>• Benefits showcase with animated checkmarks</li>
                    <li>• Ingredient grid with molecular animations</li>
                    <li>• Call-to-action with pulsing button effects</li>
                  </ul>
                </div>
                <p className="text-xs text-gray-500">
                  Video format: WebM • Professional pharmaceutical marketing style • Ready for social media and websites
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}