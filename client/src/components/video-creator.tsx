import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Video, 
  Play, 
  Pause, 
  Download, 
  Settings, 
  Palette, 
  Music, 
  Type,
  Camera,
  Wand2,
  FileText,
  Clock,
  Mic,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface VideoConfig {
  productName: string;
  productDescription: string;
  category: string;
  keyPoints: string[];
  targetAudience: string;
  videoLength: number;
  videoStyle: string;
  animationType: string;
  cinemaStyle: string;
  script: string;
  voiceType: string;
  musicStyle: string;
  images: File[];
}

export default function VideoCreator() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [config, setConfig] = useState<VideoConfig>({
    productName: '',
    productDescription: '',
    category: '',
    keyPoints: [''],
    targetAudience: '',
    videoLength: 30,
    videoStyle: '',
    animationType: '',
    cinemaStyle: '',
    script: '',
    voiceType: '',
    musicStyle: '',
    images: []
  });

  // Video generation mutation
  const generateVideoMutation = useMutation({
    mutationFn: async (config: VideoConfig) => {
      setIsGenerating(true);
      setGenerationProgress(0);
      
      // Simulate progress updates
      const progressTimer = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressTimer);
            return 90;
          }
          return prev + 10;
        });
      }, 1000);

      console.log('Generating video with config:', config);
      
      const formData = new FormData();
      formData.append('config', JSON.stringify(config));
      config.images.forEach((image, index) => {
        formData.append(`images`, image);
      });

      console.log('FormData being sent:', {
        config: JSON.stringify(config),
        imageCount: config.images.length
      });

      const response = await apiRequest('POST', '/api/videos/generate', formData);
      
      clearInterval(progressTimer);
      setGenerationProgress(100);
      
      return response.json();
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      setGenerationProgress(0);
      toast({
        title: "Video Generated Successfully!",
        description: "Your product video is ready for download and use.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
    },
    onError: () => {
      setIsGenerating(false);
      setGenerationProgress(0);
      toast({
        title: "Generation Failed",
        description: "Failed to generate video. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (files: FileList | null) => {
    if (files) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      setConfig(prev => ({ ...prev, images: [...prev.images, ...imageFiles] }));
    }
  };

  const removeImage = (index: number) => {
    setConfig(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addKeyPoint = () => {
    setConfig(prev => ({
      ...prev,
      keyPoints: [...prev.keyPoints, '']
    }));
  };

  const updateKeyPoint = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      keyPoints: prev.keyPoints.map((point, i) => i === index ? value : point)
    }));
  };

  const removeKeyPoint = (index: number) => {
    setConfig(prev => ({
      ...prev,
      keyPoints: prev.keyPoints.filter((_, i) => i !== index)
    }));
  };

  const generateScript = async () => {
    try {
      const response = await apiRequest('POST', '/api/videos/generate-script', {
        productName: config.productName,
        productDescription: config.productDescription,
        keyPoints: config.keyPoints.filter(point => point.trim()),
        videoLength: config.videoLength,
        videoStyle: config.videoStyle
      });
      const data = await response.json();
      setConfig(prev => ({ ...prev, script: data.script }));
      toast({
        title: "Script Generated",
        description: "AI-generated script has been created based on your product information.",
      });
    } catch (error) {
      toast({
        title: "Script Generation Failed",
        description: "Could not generate script. Please write one manually.",
        variant: "destructive",
      });
    }
  };

  const canProceedToStep = (step: number) => {
    switch (step) {
      case 2:
        return config.productName && config.productDescription && config.images.length > 0;
      case 3:
        return config.videoLength && config.videoStyle && config.animationType && config.cinemaStyle;
      case 4:
        return config.script || config.voiceType;
      default:
        return true;
    }
  };

  const videoStyles = [
    { value: 'explainer', label: 'Explainer Videos', description: 'Educational and informative content' },
    { value: 'product-demo', label: 'Product Demos', description: 'Showcase product features and benefits' },
    { value: 'how-to', label: 'How-to Videos', description: 'Step-by-step instructional content' },
    { value: 'testimonial', label: 'Testimonial Videos', description: 'Customer reviews and experiences' },
    { value: 'promotional', label: 'Promotional Videos', description: 'Marketing and advertising focused' },
    { value: 'brand', label: 'Brand Videos', description: 'Company story and brand awareness' }
  ];

  const animationTypes = [
    { value: '2d', label: '2D Animation', description: 'Clean, modern 2D graphics' },
    { value: '3d', label: '3D Animation', description: 'Dynamic 3D rendered elements' },
    { value: 'realistic', label: 'Realistic/Live-action', description: 'Photorealistic style' },
    { value: 'mixed', label: 'Mixed Media', description: 'Combination of styles' }
  ];

  const cinemaStyles = [
    { value: 'professional', label: 'Professional/Corporate', description: 'Clean, business-focused' },
    { value: 'modern', label: 'Modern/Trendy', description: 'Contemporary and stylish' },
    { value: 'minimalist', label: 'Minimalist', description: 'Simple and elegant' },
    { value: 'vibrant', label: 'Vibrant/Energetic', description: 'Bold and dynamic' },
    { value: 'medical', label: 'Medical/Scientific', description: 'Professional healthcare style' }
  ];

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Product Video Creator</h2>
          <Badge variant="outline" className="text-sm">
            Step {currentStep} of 4
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4 mb-4">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 4 && (
                <div className={`w-16 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        <div className="text-sm text-gray-600">
          {currentStep === 1 && "Upload product images and provide basic information"}
          {currentStep === 2 && "Configure video style and animation settings"}
          {currentStep === 3 && "Create or generate your video script"}
          {currentStep === 4 && "Review settings and generate your video"}
        </div>
      </div>

      {isGenerating && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Sparkles className="h-8 w-8 text-blue-600 animate-spin" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900">Generating Your Video...</h3>
                <p className="text-sm text-blue-700 mb-2">AI is creating your professional product video</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${generationProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-600 mt-1">{generationProgress}% complete</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={`step-${currentStep}`} className="space-y-6">
        <TabsContent value="step-1" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Product Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Product Information
                </CardTitle>
                <CardDescription>
                  Provide details about your product for the video
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="productName">Product Name *</Label>
                  <Input
                    id="productName"
                    placeholder="Pine Hill Farm Organic Supplements"
                    value={config.productName}
                    onChange={(e) => setConfig(prev => ({ ...prev, productName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productDescription">Product Description *</Label>
                  <Textarea
                    id="productDescription"
                    placeholder="Describe your product's key features, benefits, and what makes it special..."
                    value={config.productDescription}
                    onChange={(e) => setConfig(prev => ({ ...prev, productDescription: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select onValueChange={(value) => setConfig(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select product category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplements">Health Supplements</SelectItem>
                      <SelectItem value="electronics">Electronics</SelectItem>
                      <SelectItem value="fashion">Fashion & Apparel</SelectItem>
                      <SelectItem value="beauty">Beauty & Cosmetics</SelectItem>
                      <SelectItem value="food">Food & Beverage</SelectItem>
                      <SelectItem value="home">Home & Garden</SelectItem>
                      <SelectItem value="sports">Sports & Fitness</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Target Audience</Label>
                  <Input
                    id="targetAudience"
                    placeholder="Health-conscious adults 25-55"
                    value={config.targetAudience}
                    onChange={(e) => setConfig(prev => ({ ...prev, targetAudience: e.target.value }))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Image Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Product Images
                </CardTitle>
                <CardDescription>
                  Upload high-quality images of your product (max 10 images)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500">PNG, JPG, WEBP up to 10MB each</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e.target.files)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>

                {config.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {config.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Product ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(index)}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Key Selling Points */}
          <Card>
            <CardHeader>
              <CardTitle>Key Selling Points</CardTitle>
              <CardDescription>
                List the main benefits and features you want to highlight
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {config.keyPoints.map((point, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Input
                    placeholder={`Key point ${index + 1}`}
                    value={point}
                    onChange={(e) => updateKeyPoint(index, e.target.value)}
                    className="flex-1"
                  />
                  {config.keyPoints.length > 1 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removeKeyPoint(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              
              <Button
                variant="outline"
                onClick={addKeyPoint}
                className="w-full"
                disabled={config.keyPoints.length >= 5}
              >
                Add Key Point
              </Button>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={!canProceedToStep(2)}
              className="flex items-center gap-2"
            >
              Next: Video Configuration
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="step-2" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Video Settings
                </CardTitle>
                <CardDescription>
                  Configure the basic video parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Video Length</Label>
                  <Select 
                    value={config.videoLength.toString()} 
                    onValueChange={(value) => setConfig(prev => ({ ...prev, videoLength: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select video length" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="45">45 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Video Style</Label>
                  <Select onValueChange={(value) => setConfig(prev => ({ ...prev, videoStyle: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select video style" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div>
                            <div className="font-medium">{style.label}</div>
                            <div className="text-xs text-gray-500">{style.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Visual Style */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Visual Style
                </CardTitle>
                <CardDescription>
                  Choose the look and feel of your video
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Animation Type</Label>
                  <Select onValueChange={(value) => setConfig(prev => ({ ...prev, animationType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select animation type" />
                    </SelectTrigger>
                    <SelectContent>
                      {animationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-xs text-gray-500">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cinema Style</Label>
                  <Select onValueChange={(value) => setConfig(prev => ({ ...prev, cinemaStyle: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cinema style" />
                    </SelectTrigger>
                    <SelectContent>
                      {cinemaStyles.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div>
                            <div className="font-medium">{style.label}</div>
                            <div className="text-xs text-gray-500">{style.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2"
            >
              Previous: Product Info
            </Button>
            <Button
              onClick={() => setCurrentStep(3)}
              disabled={!canProceedToStep(3)}
              className="flex items-center gap-2"
            >
              Next: Script & Audio
              <FileText className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="step-3" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Script Creation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Video Script
                </CardTitle>
                <CardDescription>
                  Create or generate the narration for your video
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    onClick={generateScript}
                    className="flex items-center gap-2"
                    variant="outline"
                  >
                    <Wand2 className="h-4 w-4" />
                    Generate AI Script
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="script">Script Content</Label>
                  <Textarea
                    id="script"
                    placeholder="Your video script will appear here..."
                    value={config.script}
                    onChange={(e) => setConfig(prev => ({ ...prev, script: e.target.value }))}
                    rows={8}
                  />
                  <p className="text-xs text-gray-500">
                    Character count: {config.script.length} (recommended: {config.videoLength * 15}-{config.videoLength * 20} chars)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Audio Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5" />
                  Audio Settings
                </CardTitle>
                <CardDescription>
                  Configure voice-over and background music
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Voice Type</Label>
                  <Select onValueChange={(value) => setConfig(prev => ({ ...prev, voiceType: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select voice type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male-professional">Male - Professional</SelectItem>
                      <SelectItem value="female-professional">Female - Professional</SelectItem>
                      <SelectItem value="male-friendly">Male - Friendly</SelectItem>
                      <SelectItem value="female-friendly">Female - Friendly</SelectItem>
                      <SelectItem value="male-authoritative">Male - Authoritative</SelectItem>
                      <SelectItem value="female-authoritative">Female - Authoritative</SelectItem>
                      <SelectItem value="text-only">Text Only (No Voice)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Background Music</Label>
                  <Select onValueChange={(value) => setConfig(prev => ({ ...prev, musicStyle: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select music style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="corporate">Corporate</SelectItem>
                      <SelectItem value="upbeat">Upbeat & Energetic</SelectItem>
                      <SelectItem value="calm">Calm & Relaxing</SelectItem>
                      <SelectItem value="modern">Modern & Trendy</SelectItem>
                      <SelectItem value="medical">Medical & Scientific</SelectItem>
                      <SelectItem value="none">No Background Music</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(2)}
              className="flex items-center gap-2"
            >
              Previous: Video Configuration
            </Button>
            <Button
              onClick={() => setCurrentStep(4)}
              disabled={!canProceedToStep(4)}
              className="flex items-center gap-2"
            >
              Next: Generate Video
              <Video className="h-4 w-4" />
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="step-4" className="space-y-6">
          {/* Final Review */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Video className="h-5 w-5" />
                Review & Generate
              </CardTitle>
              <CardDescription>
                Review your video configuration and generate your professional marketing video
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-medium">Product</Label>
                  <p className="text-sm text-gray-600">{config.productName}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Video Length</Label>
                  <p className="text-sm text-gray-600">{config.videoLength} seconds</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Style</Label>
                  <p className="text-sm text-gray-600">{videoStyles.find(s => s.value === config.videoStyle)?.label}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Animation</Label>
                  <p className="text-sm text-gray-600">{animationTypes.find(a => a.value === config.animationType)?.label}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Cinema Style</Label>
                  <p className="text-sm text-gray-600">{cinemaStyles.find(c => c.value === config.cinemaStyle)?.label}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-medium">Images</Label>
                  <p className="text-sm text-gray-600">{config.images.length} uploaded</p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• AI will analyze your product images and create scenes</li>
                  <li>• Script will be converted to voice-over audio</li>
                  <li>• Background music will be generated and synced</li>
                  <li>• Professional transitions and effects will be applied</li>
                  <li>• Final video will be rendered in high quality</li>
                </ul>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2"
                >
                  Previous: Script & Audio
                </Button>
                <Button
                  onClick={() => {
                    console.log('Button clicked, current config:', config);
                    generateVideoMutation.mutate(config);
                  }}
                  disabled={isGenerating || !canProceedToStep(4)}
                  className="flex items-center gap-2 flex-1"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate Professional Video
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}