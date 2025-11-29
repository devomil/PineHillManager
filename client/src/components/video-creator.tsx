import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
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
  X,
  Edit3,
  Send,
  Copy,
  RotateCcw,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { ProductVideoCreator, VideoConfig } from '@/lib/simple-video-generator';
import { ContentGenerator } from '@/lib/content-generator';
import { ProfessionalVideoEngine } from '@/lib/professional-video-engine';
import { EnhancedContentGenerator } from '@/lib/enhanced-content-generator';
import { ProfessionalImageryService } from '@/lib/professional-imagery';
import { ProfessionalVoiceoverService } from '@/lib/professional-voiceover';
import { ProfessionalLottieService } from '@/lib/lottie-animations';

export default function VideoCreator() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('script');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [contentGenerator] = useState(() => new ContentGenerator());
  const [enhancedContentGenerator] = useState(() => new EnhancedContentGenerator());
  const [imageryService] = useState(() => new ProfessionalImageryService());
  const [voiceoverService] = useState(() => new ProfessionalVoiceoverService());
  const [lottieService] = useState(() => new ProfessionalLottieService());
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [enhancedContent, setEnhancedContent] = useState<any>(null);
  const [professionalImages, setProfessionalImages] = useState<any[]>([]);
  const [voiceoverReady, setVoiceoverReady] = useState(false);
  const [showContentPreview, setShowContentPreview] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<{
    videoBlob: Blob;
    downloadUrl: string;
    fileName: string;
  } | null>(null);

  // Script-based video state
  const [scriptMode, setScriptMode] = useState<'generate' | 'manual'>('generate');
  const [scriptPrompt, setScriptPrompt] = useState('');
  const [manualScript, setManualScript] = useState('');
  const [generatedScript, setGeneratedScript] = useState('');
  const [videoDuration, setVideoDuration] = useState(120); // Default 2 minutes
  const [videoStyle, setVideoStyle] = useState('professional');
  const [targetAudience, setTargetAudience] = useState('');
  const [scriptMetadata, setScriptMetadata] = useState<any>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  
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

  // Duration options with labels
  const durationOptions = [
    { value: 15, label: '15 seconds', wordCount: 38 },
    { value: 30, label: '30 seconds', wordCount: 75 },
    { value: 60, label: '1 minute', wordCount: 150 },
    { value: 120, label: '2 minutes', wordCount: 300 },
    { value: 180, label: '3 minutes', wordCount: 450 },
  ];

  const getCurrentDurationLabel = () => {
    const option = durationOptions.find(d => d.value === videoDuration);
    return option ? option.label : `${videoDuration} seconds`;
  };

  const getTargetWordCount = () => {
    const option = durationOptions.find(d => d.value === videoDuration);
    return option ? option.wordCount : Math.round((videoDuration / 60) * 150);
  };

  // Script generation mutation
  const generateScriptMutation = useMutation({
    mutationFn: async (data: {
      prompt?: string;
      productName?: string;
      productDescription?: string;
      keyPoints?: string[];
      videoDuration: number;
      videoStyle: string;
      targetAudience?: string;
    }) => {
      const response = await apiRequest('POST', '/api/videos/generate-script', data);
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedScript(data.script);
      setScriptMetadata(data.metadata);
      toast({
        title: "Script Generated",
        description: data.generatedBy === 'anthropic' 
          ? "AI-powered script created successfully!" 
          : "Script created using professional templates.",
      });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate script. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Generate script from prompt
  const handleGenerateScript = async () => {
    if (scriptMode === 'generate' && !scriptPrompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a prompt or topic for your video script.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingScript(true);
    try {
      await generateScriptMutation.mutateAsync({
        prompt: scriptPrompt.trim() || undefined,
        videoDuration,
        videoStyle,
        targetAudience: targetAudience.trim() || undefined,
      });
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Copy script to clipboard
  const copyScript = async () => {
    const scriptToCopy = scriptMode === 'manual' ? manualScript : generatedScript;
    if (scriptToCopy) {
      await navigator.clipboard.writeText(scriptToCopy);
      toast({
        title: "Copied",
        description: "Script copied to clipboard.",
      });
    }
  };

  // Get current script
  const getCurrentScript = () => {
    return scriptMode === 'manual' ? manualScript : generatedScript;
  };

  // Calculate script word count
  const getScriptWordCount = () => {
    const script = getCurrentScript();
    if (!script) return 0;
    return script.split(/\s+/).filter(word => word.length > 0).length;
  };

  // Estimate script duration
  const getEstimatedDuration = () => {
    const words = getScriptWordCount();
    const minutes = words / 150; // Average speaking rate
    if (minutes < 1) {
      return `${Math.round(minutes * 60)} seconds`;
    }
    return `${minutes.toFixed(1)} minutes`;
  };

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

  // Generate enhanced professional video with all APIs
  const handleGenerateEnhancedVideo = async () => {
    if (!config.productName.trim()) {
      toast({
        title: "Product Name Required",
        description: "Please enter a product name to generate the enhanced video.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      // Phase 1: Generate enhanced content with Hugging Face
      setGenerationProgress(5);
      console.log("Generating enhanced content with Hugging Face API...");
      const enhancedVideoContent = await enhancedContentGenerator.generateEnhancedContent(config);
      setEnhancedContent(enhancedVideoContent);
      
      setGenerationProgress(15);
      
      // Phase 2: Search for professional medical imagery
      console.log("Fetching professional medical imagery...");
      const imageResults = await imageryService.searchMedicalImages(
        config.healthConcern || 'health wellness',
        config.productName
      );
      setProfessionalImages(imageResults.images);
      
      setGenerationProgress(25);

      // Phase 3: Generate professional voiceover with ElevenLabs
      console.log("Generating professional voiceover with ElevenLabs...");
      const voiceoverBuffer = await voiceoverService.generateProfessionalVoiceover(
        enhancedVideoContent.voiceoverScript,
        voiceoverService.getRecommendedVoiceForHealthConcern(config.healthConcern || 'health').id
      );
      setVoiceoverReady(!!voiceoverBuffer);
      
      setGenerationProgress(35);

      // Phase 4: Create enhanced professional video with all APIs
      const canvas = document.createElement('canvas');
      const professionalEngine = new ProfessionalVideoEngine(canvas);
      
      // Enhanced configuration with API data
      const enhancedConfig = {
        ...config,
        enhancedContent: enhancedVideoContent,
        professionalImages: imageResults.images,
        voiceoverBuffer,
        lottieAnimations: lottieService.getAnimationsForHealthConcern(config.healthConcern || 'health')
      };
      
      // Show progress updates during enhanced rendering
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev < 85) return prev + 8;
          return prev;
        });
      }, 1000);
      
      console.log("Generating TV-commercial quality explainer video with enhanced APIs...");
      const videoBlob = await professionalEngine.generateEnhancedProfessionalVideo(enhancedConfig);
      
      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Create download URL
      const downloadUrl = URL.createObjectURL(videoBlob);
      const fileName = `${config.productName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_enhanced_commercial.webm`;

      setGeneratedVideo({
        videoBlob,
        downloadUrl,
        fileName
      });
      
      toast({
        title: "TV-Commercial Quality Video Generated!",
        description: "Your enhanced pharmaceutical-style video with AI content, professional imagery, and voiceover is ready.",
      });
      
    } catch (error) {
      console.error('Enhanced video generation failed:', error);
      toast({
        title: "Enhanced Generation Failed",
        description: "There was an issue generating the enhanced video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Generate professional explainer video using new engine
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
      // Phase 1: Generate professional content first
      setGenerationProgress(5);
      const content = await contentGenerator.generateProfessionalContent(config);
      setGeneratedContent(content);
      
      setGenerationProgress(15);
      
      // Phase 2: Use Professional Video Engine for animated explainer videos
      const canvas = document.createElement('canvas');
      const professionalEngine = new ProfessionalVideoEngine(canvas);
      
      // Show progress updates during animation rendering
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => {
          if (prev < 85) return prev + 8;
          return prev;
        });
      }, 800);
      
      console.log("Generating professional animated explainer video...");
      const videoBlob = await professionalEngine.generateProfessionalExplainerVideo(config);
      
      clearInterval(progressInterval);
      setGenerationProgress(100);

      // Create download URL
      const downloadUrl = URL.createObjectURL(videoBlob);
      const fileName = `${config.productName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_explainer_video.webm`;

      setGeneratedVideo({
        videoBlob,
        downloadUrl,
        fileName
      });
      
      toast({
        title: "Professional Explainer Video Generated!",
        description: "Your animated pharmaceutical-style video with dynamic graphics and animations is ready for download.",
      });
      
    } catch (error) {
      console.error('Professional video generation failed:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate animated explainer video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Preview generated content
  const previewContent = async () => {
    if (!config.productName.trim() || !config.healthConcern.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter a product name and health concern first.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Generating content preview with config:", config);
      const content = await contentGenerator.generateProfessionalContent(config);
      console.log("Generated content:", content);
      setGeneratedContent(content);
      setShowContentPreview(true);
      
      toast({
        title: "Content Preview Ready!",
        description: "Professional marketing content has been generated.",
      });
    } catch (error) {
      console.error("Content preview error:", error);
      toast({
        title: "Content Preview Failed",
        description: "Unable to generate content preview. Please try again.",
        variant: "destructive",
      });
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
            Marketing Video Creator
          </CardTitle>
          <CardDescription className="text-lg">
            Create professional marketing videos with AI-powered script generation or use your own scripts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="script" className="flex items-center gap-2" data-testid="tab-script">
                <FileText className="h-4 w-4" />
                Script-Based Video
              </TabsTrigger>
              <TabsTrigger value="product" className="flex items-center gap-2" data-testid="tab-product">
                <ImageIcon className="h-4 w-4" />
                Product Explainer
              </TabsTrigger>
            </TabsList>

            {/* Script-Based Video Tab */}
            <TabsContent value="script" className="space-y-6">
              {/* Duration Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Video Duration
                </h3>
                <div className="grid grid-cols-5 gap-2">
                  {durationOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={videoDuration === option.value ? "default" : "outline"}
                      className={`flex flex-col h-auto py-3 ${videoDuration === option.value ? 'bg-blue-600 text-white' : ''}`}
                      onClick={() => setVideoDuration(option.value)}
                      data-testid={`duration-${option.value}`}
                    >
                      <span className="font-semibold">{option.label}</span>
                      <span className="text-xs opacity-75">~{option.wordCount} words</span>
                    </Button>
                  ))}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    <strong>Selected:</strong> {getCurrentDurationLabel()} 
                    <span className="ml-2">•</span>
                    <span className="ml-2">Target: ~{getTargetWordCount()} words</span>
                    <span className="ml-2">•</span>
                    <span className="ml-2">Speaking rate: 150 words/minute</span>
                  </p>
                </div>
              </div>

              {/* Script Mode Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Script Source
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant={scriptMode === 'generate' ? "default" : "outline"}
                    className={`h-auto py-4 flex flex-col items-center gap-2 ${scriptMode === 'generate' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                    onClick={() => setScriptMode('generate')}
                    data-testid="btn-generate-mode"
                  >
                    <Sparkles className="h-6 w-6" />
                    <span className="font-semibold">AI Script Generation</span>
                    <span className="text-xs opacity-75">Generate from a prompt using AI</span>
                  </Button>
                  <Button
                    variant={scriptMode === 'manual' ? "default" : "outline"}
                    className={`h-auto py-4 flex flex-col items-center gap-2 ${scriptMode === 'manual' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    onClick={() => setScriptMode('manual')}
                    data-testid="btn-manual-mode"
                  >
                    <FileText className="h-6 w-6" />
                    <span className="font-semibold">Insert Your Script</span>
                    <span className="text-xs opacity-75">Paste or type your own script</span>
                  </Button>
                </div>
              </div>

              {/* AI Script Generation */}
              {scriptMode === 'generate' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="scriptPrompt">Script Prompt / Topic *</Label>
                    <Textarea
                      id="scriptPrompt"
                      placeholder="Describe what you want in your video script. For example:&#10;&#10;Create a video about our weight loss program that addresses the struggles people face when trying to lose weight despite doing everything 'right'. Highlight our whole body healing approach, FDA-approved BioScan technology, and personalized functional lab tests."
                      value={scriptPrompt}
                      onChange={(e) => setScriptPrompt(e.target.value)}
                      rows={5}
                      className="resize-none"
                      data-testid="input-script-prompt"
                    />
                    <p className="text-sm text-gray-500">
                      Be specific about the topic, key messages, and tone you want
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="videoStyle">Video Style</Label>
                      <Select value={videoStyle} onValueChange={setVideoStyle}>
                        <SelectTrigger data-testid="select-video-style">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional & Trustworthy</SelectItem>
                          <SelectItem value="empathetic">Empathetic & Supportive</SelectItem>
                          <SelectItem value="educational">Educational & Informative</SelectItem>
                          <SelectItem value="motivational">Motivational & Inspiring</SelectItem>
                          <SelectItem value="testimonial">Testimonial Style</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetAudience">Target Audience (optional)</Label>
                      <Input
                        id="targetAudience"
                        placeholder="e.g., Health-conscious adults 35-55"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        data-testid="input-target-audience"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleGenerateScript}
                    disabled={isGeneratingScript || !scriptPrompt.trim()}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3"
                    data-testid="btn-generate-script"
                  >
                    {isGeneratingScript ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Script with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate Script with AI
                      </>
                    )}
                  </Button>

                  {/* Generated Script Display */}
                  {generatedScript && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-lg font-semibold">Generated Script</Label>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {scriptMetadata?.generatedBy === 'anthropic' ? 'AI Generated' : 'Template'}
                          </Badge>
                          <Button variant="outline" size="sm" onClick={copyScript} data-testid="btn-copy-script">
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setGeneratedScript('')}
                            data-testid="btn-clear-script"
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Clear
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={generatedScript}
                        onChange={(e) => setGeneratedScript(e.target.value)}
                        rows={15}
                        className="font-mono text-sm resize-none"
                        data-testid="textarea-generated-script"
                      />
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>{getScriptWordCount()} words</span>
                        <span>Estimated duration: {getEstimatedDuration()}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Script Entry */}
              {scriptMode === 'manual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="manualScript" className="text-lg font-semibold">
                      Your Script *
                    </Label>
                    <p className="text-sm text-gray-500 mb-2">
                      Paste or type your script below. Use section markers like [OPENING - 0:00-0:15] for timing guidance.
                    </p>
                    <Textarea
                      id="manualScript"
                      placeholder="[OPENING - 0:00-0:15]&#10;Have you been doing everything 'right' but still struggling to lose weight?&#10;&#10;[SECTION 1: THE PROBLEM - 0:15-0:35]&#10;When your body is overwhelmed by toxins and stress...&#10;&#10;[SECTION 2: THE SOLUTION - 0:35-1:00]&#10;At Pine Hill Farm, we take a different approach...&#10;&#10;[CLOSING - 1:00-1:15]&#10;Ready to start your healing journey?"
                      value={manualScript}
                      onChange={(e) => setManualScript(e.target.value)}
                      rows={18}
                      className="font-mono text-sm resize-none"
                      data-testid="textarea-manual-script"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{getScriptWordCount()} words</span>
                      <span>Estimated duration: {getEstimatedDuration()}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={copyScript} data-testid="btn-copy-manual">
                        <Copy className="h-4 w-4 mr-1" />
                        Copy
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setManualScript('')}
                        data-testid="btn-clear-manual"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Clear
                      </Button>
                    </div>
                  </div>
                  
                  {/* Example Script Templates */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-700 mb-2">Quick Templates</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setManualScript(`[OPENING - 0:00-0:15]
Have you been doing everything "right" but still struggling to reach your health goals?

[SECTION 1: THE PROBLEM - 0:15-0:35]
When your body is overwhelmed by toxins and stress, it goes into survival mode.
Your metabolism slows. Inflammation increases. And progress stops.

[SECTION 2: THE SOLUTION - 0:35-1:00]
At Pine Hill Farm, we understand. Our whole body healing approach addresses the root causes, not just symptoms.

[SECTION 3: OUR DIFFERENCE - 1:00-1:30]
We use FDA-approved BioScan technology to identify your unique imbalances.
Our Functional Lab Tests ensure personalized support for your specific needs.

[CLOSING - 1:30-2:00]
Your body wants to heal. Let Pine Hill Farm guide you on your journey.
Visit us today to start your transformation.`)}
                        data-testid="btn-template-health"
                      >
                        Health & Wellness
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setManualScript(`[OPENING - 0:00-0:10]
Discover the power of natural wellness at Pine Hill Farm.

[MAIN MESSAGE - 0:10-0:25]
Our premium supplements are formulated with the highest quality ingredients for maximum results.

[CLOSING - 0:25-0:30]
Visit Pine Hill Farm today!`)}
                        data-testid="btn-template-short"
                      >
                        Short (30s)
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setManualScript('')}
                        data-testid="btn-template-blank"
                      >
                        Start Fresh
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Script Status & Actions */}
              {getCurrentScript() && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-semibold text-green-800">Script Ready</p>
                          <p className="text-sm text-green-600">
                            {getScriptWordCount()} words • {getEstimatedDuration()} estimated
                          </p>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`${
                          Math.abs(getScriptWordCount() - getTargetWordCount()) < 50 
                            ? 'border-green-500 text-green-700' 
                            : 'border-yellow-500 text-yellow-700'
                        }`}
                      >
                        {Math.abs(getScriptWordCount() - getTargetWordCount()) < 50 
                          ? 'Duration Match' 
                          : `${getScriptWordCount() > getTargetWordCount() ? '+' : ''}${getScriptWordCount() - getTargetWordCount()} words from target`
                        }
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Video Generation Placeholder - Future Integration */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-2">
                  <Video className="h-5 w-5" />
                  Video Generation Coming Soon
                </h4>
                <p className="text-sm text-blue-700">
                  Script-to-video generation using AI will be available in a future update. 
                  For now, you can generate and download your script to use with external video creation tools.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={copyScript}
                    disabled={!getCurrentScript()}
                    data-testid="btn-download-script"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Script as Text
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Product Explainer Tab - Existing functionality */}
            <TabsContent value="product" className="space-y-6">
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
                    data-testid="input-product-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="productDescription">Product Description *</Label>
                  <Textarea
                    id="productDescription"
                    placeholder="Describe your product's key features and benefits"
                    value={config.productDescription}
                    onChange={(e) => setConfig(prev => ({ ...prev, productDescription: e.target.value }))}
                    data-testid="input-product-description"
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
                      data-testid="input-image-upload"
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
                    data-testid="input-health-concern"
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
                    data-testid="input-benefits"
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
                    data-testid="input-ingredients"
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
                    data-testid="input-cta"
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
                      max="180"
                      value={config.duration}
                      onChange={(e) => setConfig(prev => ({ ...prev, duration: parseInt(e.target.value) || 30 }))}
                      data-testid="input-duration"
                    />
                    <p className="text-sm text-gray-500">15-180 seconds recommended</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="style">Video Style</Label>
                    <Select 
                      value={config.style} 
                      onValueChange={(value) => setConfig(prev => ({ ...prev, style: value as 'pharmaceutical' | 'medical' | 'clinical' | 'whiteboard' | '3d-explainer' }))}
                    >
                      <SelectTrigger data-testid="select-style">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whiteboard">2D Whiteboard Explainer</SelectItem>
                        <SelectItem value="3d-explainer">3D Explainer Video</SelectItem>
                        <SelectItem value="pharmaceutical">Pharmaceutical Agency Style</SelectItem>
                        <SelectItem value="medical">Medical Professional</SelectItem>
                        <SelectItem value="clinical">Clinical Research</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500">
                      {config.style === 'whiteboard' && 'Hand-drawn sketch animations with marker effects'}
                      {config.style === '3d-explainer' && '3D depth, shadows, and dimensional animations'}
                      {config.style === 'pharmaceutical' && 'Professional pharmaceutical industry styling'}
                      {config.style === 'medical' && 'Clean medical professional look'}
                      {config.style === 'clinical' && 'Research and clinical presentation style'}
                    </p>
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

              {/* API Status and Validation */}
              {!isGenerating && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-700">Form Validation:</div>
                    <div className={config.productName.trim() ? "text-green-600" : "text-red-600"}>
                      {config.productName.trim() ? "✓" : "✗"} Product Name: {config.productName.trim() ? "Complete" : "Required"}
                    </div>
                    <div className={config.productImages.length > 0 ? "text-green-600" : "text-red-600"}>
                      {config.productImages.length > 0 ? "✓" : "✗"} Product Images: {config.productImages.length > 0 ? `${config.productImages.length} uploaded` : "Required"}
                    </div>
                    <div className={config.healthConcern.trim() ? "text-green-600" : "text-red-600"}>
                      {config.healthConcern.trim() ? "✓" : "✗"} Health Concern: {config.healthConcern.trim() ? "Complete" : "Required"}
                    </div>
                    <div className={config.benefits.length > 0 ? "text-green-600" : "text-red-600"}>
                      {config.benefits.length > 0 ? "✓" : "✗"} Benefits: {config.benefits.length > 0 ? `${config.benefits.length} benefits` : "Required"}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-medium text-gray-700">Enhanced APIs:</div>
                    <div className="text-green-600">
                      ✓ Hugging Face: AI Content Generation
                    </div>
                    <div className="text-green-600">
                      ✓ ElevenLabs: Professional Voiceover
                    </div>
                    <div className="text-green-600">
                      ✓ Unsplash Premium: Medical Imagery
                    </div>
                    <div className="text-green-600">
                      ✓ Lottie: Professional Animations
                    </div>
                  </div>
                </div>
              )}

              {/* Content Preview and Generate Buttons */}
              <div className="space-y-3">
                <Button
                  onClick={previewContent}
                  disabled={!config.productName.trim() || !config.healthConcern.trim()}
                  variant="outline"
                  className="w-full py-2"
                  data-testid="btn-preview-content"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Preview Professional Marketing Content {contentGenerator.hasAPIAccess() ? '(AI-Generated)' : '(Template)'}
                </Button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={handleGenerateVideo}
                    disabled={isGenerating || !config.productName.trim() || config.productImages.length === 0 || !config.healthConcern.trim() || config.benefits.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    data-testid="btn-generate-standard"
                  >
                    {isGenerating ? (
                      <>
                        <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Standard Video
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleGenerateEnhancedVideo}
                    disabled={isGenerating || !config.productName.trim() || !config.healthConcern.trim() || config.benefits.length === 0}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 disabled:bg-gray-400 disabled:cursor-not-allowed relative"
                    data-testid="btn-generate-enhanced"
                  >
                    {isGenerating ? (
                      <>
                        <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                        Enhanced...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Enhanced with APIs
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">NEW</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

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
                      <Button onClick={downloadVideo} className="flex-1" data-testid="btn-download-video">
                        <Download className="mr-2 h-4 w-4" />
                        Download Video
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setGeneratedVideo(null)}
                        data-testid="btn-new-video"
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

              {/* Content Preview Dialog */}
              {showContentPreview && generatedContent && (
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-purple-800">
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Professional Marketing Content Preview
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setShowContentPreview(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <h4 className="font-semibold text-purple-800">Problem Statement (Scene 1):</h4>
                        <p className="text-sm bg-white p-3 rounded border">{generatedContent.problemStatement}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-purple-800">Product Introduction (Scene 2):</h4>
                        <p className="text-sm bg-white p-3 rounded border">{generatedContent.productIntroduction}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-purple-800">Enhanced Benefits (Scene 3):</h4>
                        <ul className="text-sm bg-white p-3 rounded border space-y-1">
                          {generatedContent.enhancedBenefits?.map((benefit: string, index: number) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-purple-800">How It Works (Scene 4):</h4>
                        <p className="text-sm bg-white p-3 rounded border">{generatedContent.howItWorks}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-purple-800">Call to Action (Scene 5):</h4>
                        <p className="text-sm bg-white p-3 rounded border font-semibold">{generatedContent.callToAction}</p>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="text-xs text-blue-700">
                        <strong>Content Generation Method:</strong> {contentGenerator.getGenerationMethod() === 'api' ? 'AI-powered via Hugging Face API' : 'Professional pharmaceutical templates'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
