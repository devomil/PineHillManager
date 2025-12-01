import { useState, useEffect } from 'react';
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
import { scriptPipeline, Platform, PLATFORM_SPECS } from '@/lib/script-pipeline';
import { AnimatedVideoEngine } from '@/lib/animated-video-engine';
import { RunwayVideoService } from '@/lib/runway-video-service';
import { StableDiffusionService } from '@/lib/stable-diffusion-service';
import { BackgroundMusicService } from '@/lib/background-music-service';
import { SoundEffectsService } from '@/lib/sound-effects-service';
import { SubtitleGenerator } from '@/lib/subtitle-generator';
import { VisualEffectsEngine } from '@/lib/visual-effects-engine';
import { BrollService } from '@/lib/broll-service';

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
  const [runwayService] = useState(() => new RunwayVideoService());
  const [stableDiffusionService] = useState(() => new StableDiffusionService());
  const [musicService] = useState(() => new BackgroundMusicService());
  const [soundEffectsService] = useState(() => new SoundEffectsService());
  const [subtitleGenerator] = useState(() => new SubtitleGenerator());
  const [brollService] = useState(() => new BrollService());
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [enhancedContent, setEnhancedContent] = useState<any>(null);
  const [professionalImages, setProfessionalImages] = useState<any[]>([]);
  const [voiceoverReady, setVoiceoverReady] = useState(false);
  const [showContentPreview, setShowContentPreview] = useState(false);
  
  // AI Service availability state
  const [runwayAvailable, setRunwayAvailable] = useState(false);
  const [sdAvailable, setSdAvailable] = useState(false);
  const [useRunwayClips, setUseRunwayClips] = useState(false);
  const [useSDImages, setUseSDImages] = useState(false);
  const [runwayModel, setRunwayModel] = useState<'gen4_turbo' | 'veo3.1'>('gen4_turbo');
  const [runwayTaskStatus, setRunwayTaskStatus] = useState<string>('');
  const [generatedAIImage, setGeneratedAIImage] = useState<string | null>(null);
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
  const [videoDuration, setVideoDuration] = useState(60); // Default 1 minute
  const [videoStyle, setVideoStyle] = useState('professional');
  const [targetAudience, setTargetAudience] = useState('');
  const [scriptMetadata, setScriptMetadata] = useState<any>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [videoPlatform, setVideoPlatform] = useState<Platform>('youtube');
  const [scriptValidation, setScriptValidation] = useState<{
    passed: boolean;
    checks: Array<{ name: string; passed: boolean; message: string }>;
  } | null>(null);
  const [parsedScript, setParsedScript] = useState<any>(null);
  const [generationPhase, setGenerationPhase] = useState('');

  // New feature states
  const [enableBackgroundMusic, setEnableBackgroundMusic] = useState(true);
  const [musicMood, setMusicMood] = useState<'corporate' | 'uplifting' | 'calm' | 'energetic' | 'medical' | 'inspirational'>('corporate');
  const [musicVolume, setMusicVolume] = useState(0.25);
  const [enableSoundEffects, setEnableSoundEffects] = useState(false);
  const [enableSubtitles, setEnableSubtitles] = useState(true);
  const [subtitleStyle, setSubtitleStyle] = useState<'tiktok' | 'traditional' | 'karaoke' | 'modern' | 'minimal'>('tiktok');
  const [enableVisualEffects, setEnableVisualEffects] = useState(true);
  const [colorGradingPreset, setColorGradingPreset] = useState('natural');
  const [enableBroll, setEnableBroll] = useState(false);

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

  // Check AI service availability on mount
  useEffect(() => {
    const checkServices = async () => {
      try {
        const runwayStatus = await runwayService.isServiceAvailable();
        setRunwayAvailable(runwayStatus);
        
        const sdStatus = await stableDiffusionService.isServiceAvailable();
        setSdAvailable(sdStatus);
        
        console.log('AI Services:', { runway: runwayStatus, stableDiffusion: sdStatus });
      } catch (error) {
        console.warn('Failed to check AI service availability:', error);
      }
    };
    checkServices();
  }, []);

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

  // Validate script before video generation
  const validateCurrentScript = () => {
    const script = getCurrentScript();
    if (!script.trim()) {
      setScriptValidation(null);
      setParsedScript(null);
      return null;
    }

    const parsed = scriptPipeline.parseScript(script, videoDuration, videoPlatform);
    setParsedScript(parsed);
    
    const validation = scriptPipeline.validateScript(parsed);
    setScriptValidation(validation);
    
    return { parsed, validation };
  };

  // Helper function to combine video and audio using Web APIs
  const combineVideoAndAudio = async (videoBlob: Blob, audioBlob: Blob): Promise<Blob> => {
    // Since MediaRecorder can't easily mux separate streams post-hoc,
    // we'll create an approach that plays both and re-records
    return new Promise((resolve, reject) => {
      try {
        // Create video and audio elements
        const video = document.createElement('video');
        const audio = document.createElement('audio');
        
        video.src = URL.createObjectURL(videoBlob);
        audio.src = URL.createObjectURL(audioBlob);
        
        video.muted = true; // Mute original video
        
        // Create canvas for re-recording
        const canvas = document.createElement('canvas');
        canvas.width = 1920;
        canvas.height = 1080;
        const ctx = canvas.getContext('2d')!;
        
        // Create audio context to capture audio
        const audioContext = new AudioContext();
        const audioSource = audioContext.createMediaElementSource(audio);
        const destination = audioContext.createMediaStreamDestination();
        audioSource.connect(destination);
        audioSource.connect(audioContext.destination); // Also play locally
        
        // Combine video canvas stream with audio stream
        const canvasStream = canvas.captureStream(30);
        const audioTrack = destination.stream.getAudioTracks()[0];
        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }
        
        const mediaRecorder = new MediaRecorder(canvasStream, {
          mimeType: 'video/webm;codecs=vp8,opus',
          videoBitsPerSecond: 8000000
        });
        
        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };
        
        mediaRecorder.onstop = () => {
          // Clean up
          URL.revokeObjectURL(video.src);
          URL.revokeObjectURL(audio.src);
          audioContext.close();
          
          const finalBlob = new Blob(chunks, { type: 'video/webm' });
          resolve(finalBlob);
        };
        
        // Start recording when video and audio are ready
        let videoReady = false;
        let audioReady = false;
        
        const startRecording = () => {
          if (!videoReady || !audioReady) return;
          
          mediaRecorder.start(100);
          video.play();
          audio.play();
          
          // Draw video frames to canvas
          const drawFrame = () => {
            if (video.ended || video.paused) {
              mediaRecorder.stop();
              return;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            requestAnimationFrame(drawFrame);
          };
          drawFrame();
        };
        
        video.oncanplay = () => {
          videoReady = true;
          startRecording();
        };
        
        audio.oncanplay = () => {
          audioReady = true;
          startRecording();
        };
        
        video.onerror = reject;
        audio.onerror = reject;
        
        // Timeout fallback - if combination fails, return original video
        setTimeout(() => {
          if (chunks.length === 0) {
            console.warn("Audio combination timed out, using video without audio");
            resolve(videoBlob);
          }
        }, 120000); // 2 minute timeout
        
      } catch (error) {
        console.error("Error combining video and audio:", error);
        resolve(videoBlob); // Fallback to video without audio
      }
    });
  };

  // Generate video from script with new animated engine
  const handleGenerateScriptVideo = async () => {
    const script = getCurrentScript();
    if (!script.trim()) {
      toast({
        title: "Script Required",
        description: "Please enter or generate a script first.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationPhase('Initializing...');

    try {
      // Phase 1: Parse and validate script
      setGenerationPhase('Parsing script...');
      setGenerationProgress(5);
      console.log("Phase 1: Parsing and validating script...");
      
      const parsed = scriptPipeline.parseScript(script, videoDuration, videoPlatform);
      setParsedScript(parsed);
      
      if (!parsed.isValid) {
        console.warn("Script validation warnings:", parsed.validationErrors);
      }
      
      const validation = scriptPipeline.validateScript(parsed);
      setScriptValidation(validation);
      
      if (!validation.passed) {
        toast({
          title: "Script Quality Check",
          description: "Some sections could be improved, but we'll proceed with generation.",
        });
      }
      
      setGenerationProgress(10);
      console.log(`Script parsed: ${parsed.sections.length} sections, ${parsed.totalDuration}s total`);

      // Generate subtitles if enabled
      console.log(`[Subtitles] Enabled: ${enableSubtitles}, Style: ${subtitleStyle}`);
      let subtitleSegments: any[] = [];
      if (enableSubtitles) {
        try {
          subtitleSegments = subtitleGenerator.generateSubtitles(parsed, videoDuration);
          console.log(`[Subtitles] Generated ${subtitleSegments.length} segments`);
        } catch (subError) {
          console.error('[Subtitles] Failed to generate:', subError);
        }
      }

      // Phase 2: Fetch or generate images for each section
      setGenerationPhase(useSDImages ? 'Generating AI images...' : 'Fetching images...');
      setGenerationProgress(15);
      console.log("Phase 2:", useSDImages ? "Generating AI images with Stable Diffusion..." : "Fetching stock images...");
      
      const sectionImages: { sectionType: string; url: string }[] = [];
      const sectionTypes = ['hook', 'problem', 'solution', 'social_proof', 'cta'];
      
      try {
        const healthConcern = scriptPrompt || 'health wellness';
        const productType = 'supplement herbal';
        
        if (useSDImages && sdAvailable) {
          // Generate images with Stable Diffusion
          const sectionPrompts = {
            hook: `Eye-catching marketing visual for ${healthConcern}, vibrant and attention-grabbing, professional advertisement`,
            problem: `Person experiencing health challenge related to ${healthConcern}, empathetic mood, soft lighting`,
            solution: `Premium organic ${productType} products, natural ingredients, clean professional photography`,
            social_proof: `Happy healthy people enjoying wellness lifestyle, testimonial style, warm lighting`,
            cta: `Call to action visual for health products, inviting and professional, Pine Hill Farm branding`
          };
          
          for (const sectionType of sectionTypes) {
            setGenerationPhase(`Generating ${sectionType} image...`);
            const prompt = sectionPrompts[sectionType as keyof typeof sectionPrompts];
            const result = await stableDiffusionService.generateImage({ prompt });
            
            if (result.success && result.image) {
              sectionImages.push({
                sectionType,
                url: result.image
              });
              console.log(`Generated AI image for ${sectionType}`);
            }
          }
        } else {
          // Use Unsplash stock images
          const imageResult = await imageryService.searchMedicalImages(healthConcern, productType);
          
          if (imageResult.success && imageResult.images.length > 0) {
            for (let i = 0; i < sectionTypes.length && i < imageResult.images.length; i++) {
              sectionImages.push({
                sectionType: sectionTypes[i],
                url: imageResult.images[i].urls.regular
              });
            }
            console.log(`Loaded ${sectionImages.length} section images from Unsplash`);
          } else {
            console.log("Using gradient backgrounds (no images available)");
          }
        }
      } catch (imageError) {
        console.warn("Could not fetch/generate images, using gradients:", imageError);
      }
      
      setGenerationProgress(25);

      // Phase 2.5: Generate AI video clip with Runway (optional)
      let runwayVideoUrl: string | null = null;
      if (useRunwayClips && runwayAvailable) {
        setGenerationPhase('Generating AI video clip...');
        setGenerationProgress(27);
        console.log("Phase 2.5: Generating AI video clip with Runway...");
        
        try {
          const hookImage = sectionImages.find(img => img.sectionType === 'hook');
          const clipPrompt = `Cinematic motion for ${scriptPrompt || 'health wellness'} advertisement, professional marketing quality, smooth camera movement`;
          
          if (hookImage) {
            // Use image-to-video if we have an image
            setRunwayTaskStatus('Starting video generation...');
            const result = await runwayService.generateImageToVideo(clipPrompt, hookImage.url);
            
            if (result.success && result.taskId) {
              // Use the built-in waitForCompletion method
              const completionResult = await runwayService.waitForCompletion(
                result.taskId,
                (progress, status) => {
                  setRunwayTaskStatus(`Video generation: ${status} (${Math.round(progress)}%)`);
                },
                180000 // 3 minute timeout
              );
              
              if (completionResult.success && completionResult.videoUrl) {
                runwayVideoUrl = completionResult.videoUrl;
                console.log('Runway video clip generated:', runwayVideoUrl);
              } else {
                console.warn('Runway video generation failed:', completionResult.error);
              }
            }
          } else {
            // Use text-to-video if no image available
            setRunwayTaskStatus('Starting text-to-video generation...');
            const result = await runwayService.generateTextToVideo(clipPrompt, { model: 'veo3.1' });
            
            if (result.success && result.taskId) {
              const completionResult = await runwayService.waitForCompletion(
                result.taskId,
                (progress, status) => {
                  setRunwayTaskStatus(`Video generation: ${status} (${Math.round(progress)}%)`);
                },
                180000
              );
              
              if (completionResult.success && completionResult.videoUrl) {
                runwayVideoUrl = completionResult.videoUrl;
                console.log('Runway video clip generated:', runwayVideoUrl);
              } else {
                console.warn('Runway video generation failed:', completionResult.error);
              }
            }
          }
          setRunwayTaskStatus('');
        } catch (runwayError) {
          console.warn("Runway video generation failed:", runwayError);
          setRunwayTaskStatus('');
        }
      }
      
      setGenerationProgress(30);

      // Phase 3: Generate voiceover
      setGenerationPhase('Generating voiceover...');
      setGenerationProgress(30);
      console.log("Phase 3: Generating voiceover with ElevenLabs...");
      
      let audioBlob: Blob | null = null;
      
      try {
        // Clean script for voiceover (remove ALL section markers including timestamps)
        const cleanScript = script
          // Remove **[SECTION 1: THE PROBLEM - 0:15-0:30]** style markers (asterisks around brackets)
          .replace(/\*\*\s*\[(?:SECTION\s*\d+\s*:\s*)?(?:THE\s+)?[^\]]*\]\s*\*\*/gi, '')
          // Remove [SECTION 1: THE PROBLEM - 0:15-0:30] style markers  
          .replace(/\[(?:SECTION\s*\d+\s*:\s*)?(?:THE\s+)?(?:HOOK|OPENING|PROBLEM|CHALLENGE|SOLUTION|SOCIAL[\s_]?PROOF|CTA|CLOSING|CALL[\s_]?TO[\s_]?ACTION|TESTIMONIAL|DIFFERENCE|BENEFIT)[^\]]*\]/gi, '')
          // Remove ** SECTION ** style markers
          .replace(/\*\*\s*(?:SECTION\s*\d+\s*:\s*)?(?:THE\s+)?(?:HOOK|OPENING|PROBLEM|CHALLENGE|SOLUTION|SOCIAL[\s_]?PROOF|CTA|CLOSING|CALL[\s_]?TO[\s_]?ACTION|TESTIMONIAL|DIFFERENCE|BENEFIT)[^\*]*\*\*/gi, '')
          // Remove standalone **** markers  
          .replace(/\*{4}/g, '')
          // Remove ## Section headers
          .replace(/^##\s+[^\n]+$/gm, '')
          // Remove "Here's your refined marketing video script for..." intro
          .replace(/Here's your refined marketing video script[^:]*:/gi, '')
          // Remove timing markers like (0:15-0:30) or - 0:15-0:30
          .replace(/[-–]\s*\d+:\d+\s*[-–]\s*\d+:\d+/g, '')
          .replace(/\(\d+:\d+\s*[-–]\s*\d+:\d+\)/g, '')
          // Clean up extra whitespace
          .replace(/\n{3,}/g, '\n\n')
          .replace(/\s+/g, ' ')
          .trim();
        
        console.log("Clean voiceover script:", cleanScript.substring(0, 200) + "...");
        
        const voiceResult = await voiceoverService.generateProfessionalVoiceover(
          cleanScript,
          voiceoverService.getRecommendedVoiceForHealthConcern(scriptPrompt || 'health').id
        );
        
        if (voiceResult.blob) {
          audioBlob = voiceResult.blob;
          console.log("Voiceover generated successfully");
        }
      } catch (voiceError) {
        console.warn("Could not generate voiceover:", voiceError);
      }

      setGenerationProgress(40);

      // Phase 3.5: Fetch background music
      let musicBlob: Blob | null = null;
      if (enableBackgroundMusic) {
        try {
          setGenerationPhase('Fetching background music...');
          setGenerationProgress(42);
          console.log(`[Music] Fetching ${musicMood} music for ${videoDuration}s video...`);

          const musicTracks = await musicService.searchMusic(musicMood, videoDuration);
          if (musicTracks.length > 0) {
            const selectedTrack = musicTracks[0];
            console.log(`[Music] Selected track: ${selectedTrack.name} (${selectedTrack.duration}s)`);
            musicBlob = await musicService.downloadTrack(selectedTrack);
            console.log('[Music] Background music downloaded successfully');
          } else {
            console.warn('[Music] No tracks found, video will have voiceover only');
          }
        } catch (musicError) {
          console.error('[Music] Failed to load background music:', musicError);
          toast({
            title: "Music Unavailable",
            description: "Could not load background music. Video will have voiceover only.",
          });
        }
      }

      // Mix audio tracks if we have both voiceover and music
      let finalAudioBlob: Blob | null = audioBlob;

      if (audioBlob && musicBlob) {
        try {
          setGenerationPhase('Mixing audio tracks...');
          setGenerationProgress(43);
          console.log('[Audio] Mixing voiceover with background music...');

          const musicConfig = musicService.createDefaultConfig(videoDuration, videoStyle);
          musicConfig.volume = musicVolume;
          musicConfig.mood = musicMood;

          finalAudioBlob = await musicService.mixAudioTracks(musicBlob, audioBlob, musicConfig);
          console.log('[Audio] Successfully mixed voiceover and background music');
        } catch (mixError) {
          console.error('[Audio] Failed to mix audio:', mixError);
          console.log('[Audio] Using voiceover only');
          finalAudioBlob = audioBlob;
        }
      } else if (musicBlob && !audioBlob) {
        // Only music, no voiceover
        finalAudioBlob = musicBlob;
        console.log('[Audio] Using background music only (no voiceover)');
      } else if (audioBlob && !musicBlob) {
        console.log('[Audio] Using voiceover only (no music)');
      }

      console.log(`[Audio] Final audio: ${finalAudioBlob ? 'Ready' : 'None'}`);

      // Phase 4: Build video timeline
      setGenerationPhase('Building timeline...');
      setGenerationProgress(45);
      console.log("Phase 4: Building video timeline...");
      
      const canvas = document.createElement('canvas');
      const animatedEngine = new AnimatedVideoEngine(canvas, videoPlatform);
      
      // Set target duration
      animatedEngine.setTargetDuration(videoDuration);
      
      // Load section images
      if (sectionImages.length > 0) {
        setGenerationPhase('Loading images...');
        await animatedEngine.loadSectionImages(sectionImages);
      }
      
      // Load Runway video clip if available (will be used as background for hook section)
      if (runwayVideoUrl) {
        setGenerationPhase('Loading AI video clip...');
        console.log("Loading Runway video clip for hook section...");
        await animatedEngine.loadVideoClip('hook', runwayVideoUrl);
      }

      // Set audio buffer (voiceover + music mix)
      if (finalAudioBlob) {
        animatedEngine.setAudioBuffer(finalAudioBlob);
        console.log('[Engine] Audio buffer set');
      }

      // Configure subtitles
      if (enableSubtitles && subtitleSegments.length > 0) {
        try {
          const subtitleConfig = subtitleGenerator.createDefaultConfig(subtitleStyle);
          animatedEngine.setSubtitleConfig(subtitleGenerator, subtitleConfig);
          (animatedEngine as any).subtitleSegments = subtitleSegments;
          console.log(`[Engine] Subtitles configured: ${subtitleStyle} style`);
        } catch (subError) {
          console.error('[Engine] Failed to configure subtitles:', subError);
        }
      }

      // Configure visual effects
      if (enableVisualEffects) {
        try {
          const platformSpec = PLATFORM_SPECS[videoPlatform];
          const visualEffects = new VisualEffectsEngine(
            platformSpec.resolution.width,
            platformSpec.resolution.height
          );

          const presets = VisualEffectsEngine.getColorGradingPresets();
          const selectedPreset = presets[colorGradingPreset] || presets.natural;

          (animatedEngine as any).setVisualEffects?.(visualEffects, selectedPreset);

          // Initialize subtle background particles
          visualEffects.initializeParticles({
            type: 'health-icons',
            count: 12,
            color: '#7cb342',
            size: 18,
            speed: 0.8,
            opacity: 0.25
          });

          console.log(`[Engine] Visual effects configured: ${colorGradingPreset} preset`);
        } catch (vfxError) {
          console.error('[Engine] Failed to configure visual effects:', vfxError);
        }
      }

      // Set progress callback
      animatedEngine.setProgressCallback((progress) => {
        setGenerationProgress(50 + (progress * 0.45)); // Scale 0-100 to 50-95
      });
      
      const timeline = animatedEngine.buildTimeline(parsed);
      console.log(`Timeline built: ${timeline.sections.length} sections, ${timeline.totalDuration}s`);
      
      // Phase 5: Render video frames
      setGenerationPhase('Rendering frames...');
      setGenerationProgress(50);
      console.log("Phase 5: Rendering animated video frames...");
      
      const videoBlob = await animatedEngine.renderVideo();
      
      // Phase 6: Combine with audio if available
      let finalBlob = videoBlob;

      if (finalAudioBlob) {
        setGenerationPhase('Adding audio...');
        setGenerationProgress(96);
        console.log('[Final] Combining video with audio...');

        try {
          finalBlob = await combineVideoAndAudio(videoBlob, finalAudioBlob);
          console.log('[Final] Video and audio combined successfully');
        } catch (combineError) {
          console.error('[Final] Could not combine audio:', combineError);
          console.log('[Final] Using video without audio');
        }
      }
      
      setGenerationProgress(98);
      setGenerationPhase('Finalizing...');
      
      // Phase 7: Create output
      const timestamp = Date.now();
      const platformSpec = PLATFORM_SPECS[videoPlatform];
      const downloadUrl = URL.createObjectURL(finalBlob);
      const fileName = `pine_hill_farm_${videoPlatform}_${timestamp}.webm`;

      setGenerationProgress(100);
      setGenerationPhase('Complete!');

      setGeneratedVideo({
        videoBlob: finalBlob,
        downloadUrl,
        fileName
      });
      
      toast({
        title: "Video Generated Successfully!",
        description: `Your ${platformSpec.aspectRatio} ${videoPlatform} video is ready. Scroll down to preview and download.`,
      });
      
      // Auto-scroll to the video
      setTimeout(() => {
        const videoElement = document.querySelector('[data-testid="script-video-result"]');
        if (videoElement) {
          videoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      
    } catch (error) {
      console.error('Video generation failed:', error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "There was an issue generating the video.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationPhase('');
    }
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
              {/* Platform Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Video Platform
                </h3>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  {(['youtube', 'tiktok', 'instagram_reels', 'instagram_feed', 'linkedin', 'facebook'] as Platform[]).map((platform) => {
                    const spec = PLATFORM_SPECS[platform];
                    const labels: Record<Platform, string> = {
                      youtube: 'YouTube',
                      tiktok: 'TikTok',
                      instagram_reels: 'IG Reels',
                      instagram_feed: 'IG Feed',
                      linkedin: 'LinkedIn',
                      facebook: 'Facebook'
                    };
                    return (
                      <Button
                        key={platform}
                        variant={videoPlatform === platform ? "default" : "outline"}
                        className={`flex flex-col h-auto py-2 ${videoPlatform === platform ? 'bg-green-600 text-white' : ''}`}
                        onClick={() => setVideoPlatform(platform)}
                        data-testid={`platform-${platform}`}
                      >
                        <span className="font-semibold text-sm">{labels[platform]}</span>
                        <span className="text-xs opacity-75">{spec.aspectRatio}</span>
                      </Button>
                    );
                  })}
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-700">
                    <strong>{PLATFORM_SPECS[videoPlatform].aspectRatio}</strong> format 
                    <span className="ml-2">•</span>
                    <span className="ml-2">{PLATFORM_SPECS[videoPlatform].resolution.width}x{PLATFORM_SPECS[videoPlatform].resolution.height}</span>
                    <span className="ml-2">•</span>
                    <span className="ml-2">Max: {PLATFORM_SPECS[videoPlatform].maxDuration}s</span>
                  </p>
                </div>
              </div>

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
                      disabled={option.value > PLATFORM_SPECS[videoPlatform].maxDuration}
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

                  {/* AI Enhancement Options */}
                  {(runwayAvailable || sdAvailable) && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                      <h4 className="font-semibold text-purple-700 dark:text-purple-300 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        AI Enhancement Options
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        {runwayAvailable && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="useRunway" className="text-sm flex items-center gap-2">
                                <Video className="w-4 h-4 text-purple-600" />
                                Runway AI Video Clips
                              </Label>
                              <input
                                type="checkbox"
                                id="useRunway"
                                checked={useRunwayClips}
                                onChange={(e) => setUseRunwayClips(e.target.checked)}
                                className="rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                                data-testid="checkbox-runway"
                              />
                            </div>
                            {useRunwayClips && (
                              <Select value={runwayModel} onValueChange={(v) => setRunwayModel(v as 'gen4_turbo' | 'veo3.1')}>
                                <SelectTrigger className="text-sm" data-testid="select-runway-model">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="gen4_turbo">Gen-4 Turbo (4s clips, fast)</SelectItem>
                                  <SelectItem value="veo3.1">VEO 3.1 (8s clips, premium)</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <p className="text-xs text-gray-500">Generate AI video clips (takes 1-2 min per clip)</p>
                          </div>
                        )}
                        {sdAvailable && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label htmlFor="useSD" className="text-sm flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-blue-600" />
                                Stable Diffusion Images
                              </Label>
                              <input
                                type="checkbox"
                                id="useSD"
                                checked={useSDImages}
                                onChange={(e) => setUseSDImages(e.target.checked)}
                                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                                data-testid="checkbox-sd"
                              />
                            </div>
                            <p className="text-xs text-gray-500">Generate custom AI images for each section</p>
                          </div>
                        )}
                      </div>
                      {runwayTaskStatus && (
                        <div className="mt-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded text-sm">
                          <span className="text-purple-600 dark:text-purple-400">{runwayTaskStatus}</span>
                        </div>
                      )}
                    </div>
                  )}

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

              {/* Video Generation Progress */}
              {isGenerating && activeTab === 'script' && (
                <div className="space-y-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 animate-spin text-purple-600" />
                    Generating Your Video...
                  </h3>
                  <Progress value={generationProgress} className="w-full h-3" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-purple-700 font-medium">{generationPhase || 'Initializing...'}</span>
                    <span className="text-gray-600">{Math.round(generationProgress)}%</span>
                  </div>
                  {parsedScript && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Sections: {parsedScript.sections?.length || 0} | Duration: {parsedScript.totalDuration}s | Platform: {videoPlatform}</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Script Validation Feedback */}
              {scriptValidation && !isGenerating && getCurrentScript().trim() && (
                <div className={`p-4 rounded-lg border ${scriptValidation.passed ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <h4 className={`font-semibold mb-2 flex items-center gap-2 ${scriptValidation.passed ? 'text-green-700' : 'text-yellow-700'}`}>
                    {scriptValidation.passed ? <CheckCircle className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                    Script Quality Check
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {scriptValidation.checks.map((check, index) => (
                      <div key={index} className={`flex items-start gap-2 ${check.passed ? 'text-green-600' : 'text-yellow-600'}`}>
                        <span>{check.passed ? '✓' : '!'}</span>
                        <span>{check.name}</span>
                      </div>
                    ))}
                  </div>
                  {!scriptValidation.passed && (
                    <p className="text-xs text-yellow-600 mt-2">
                      Some sections could be improved, but you can still generate a video.
                    </p>
                  )}
                </div>
              )}

              {/* Video Generation Buttons */}
              {!isGenerating && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={validateCurrentScript}
                      disabled={!getCurrentScript().trim()}
                      className="flex-1"
                      data-testid="btn-validate-script"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Validate Script
                    </Button>
                    <Button
                      onClick={handleGenerateScriptVideo}
                      disabled={!getCurrentScript().trim() || isGenerating}
                      className="flex-[2] bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 text-lg"
                      data-testid="btn-generate-script-video"
                    >
                      <Video className="mr-2 h-5 w-5" />
                      Generate {PLATFORM_SPECS[videoPlatform].aspectRatio} Video
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 justify-center">
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
              )}
              
              {/* Generated Script Video Display */}
              {generatedVideo && activeTab === 'script' && (
                <Card className="border-green-200 bg-green-50" data-testid="script-video-result">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="h-6 w-6" />
                      Marketing Video Generated!
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
                      <Button onClick={downloadVideo} className="flex-1" data-testid="btn-download-script-video">
                        <Download className="mr-2 h-4 w-4" />
                        Download Video
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setGeneratedVideo(null)}
                        data-testid="btn-new-script-video"
                      >
                        Generate New Video
                      </Button>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      File: {generatedVideo.fileName}
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                      <div className="font-semibold text-blue-800 mb-1">Video Features:</div>
                      <div className="grid grid-cols-2 gap-2 text-blue-700 text-xs">
                        <span>Platform: {videoPlatform.replace('_', ' ')}</span>
                        <span>Aspect Ratio: {PLATFORM_SPECS[videoPlatform].aspectRatio}</span>
                        <span>Resolution: {PLATFORM_SPECS[videoPlatform].resolution.width}x{PLATFORM_SPECS[videoPlatform].resolution.height}</span>
                        <span>Duration: {videoDuration}s</span>
                        {parsedScript && <span>Sections: {parsedScript.sections?.length || 5}</span>}
                        <span>Animated transitions</span>
                      </div>
                    </div>
                    <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-sm text-green-800">
                      <strong>Tip:</strong> For best results, upload to {videoPlatform.replace('_', ' ')} in {PLATFORM_SPECS[videoPlatform].aspectRatio} format.
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Video format: WebM • Ready for social media
                    </p>
                  </CardContent>
                </Card>
              )}
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
