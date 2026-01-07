import { useState, useRef, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Volume2,
  Move,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  Info,
  Video,
  Music,
  Mic,
  Waves,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface AudioSettings {
  enabled: boolean;
  voiceGeneration: boolean;
  soundEffects: boolean;
  ambientSound: boolean;
  language?: string;
}

export interface MotionControlSettings {
  enabled: boolean;
  referenceVideoUrl?: string;
  referenceVideoFile?: File;
  referenceVideoDuration?: number;
}

export interface VideoGenerationSettingsData {
  audio: AudioSettings;
  motionControl: MotionControlSettings;
  preferredProvider?: string;
}

interface VideoGenerationSettingsProps {
  settings: VideoGenerationSettingsData;
  onSettingsChange: (settings: VideoGenerationSettingsData) => void;
  selectedProvider?: string;
  supportsAudio?: boolean;
  supportsMotionControl?: boolean;
}

const SUPPORTED_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'zh', label: 'Chinese' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
];

export function VideoGenerationSettings({
  settings,
  onSettingsChange,
  selectedProvider,
  supportsAudio = false,
  supportsMotionControl = false,
}: VideoGenerationSettingsProps) {
  const [expanded, setExpanded] = useState(true);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const isKling26 = selectedProvider?.includes('kling-2.6');
  const isMotionControl = selectedProvider?.includes('motion-control');
  const showAudioSettings = supportsAudio || isKling26;
  const showMotionSettings = supportsMotionControl || isMotionControl;

  const handleAudioToggle = (enabled: boolean) => {
    onSettingsChange({
      ...settings,
      audio: { ...settings.audio, enabled },
    });
  };

  const handleAudioOptionChange = (key: keyof AudioSettings, value: boolean | string) => {
    onSettingsChange({
      ...settings,
      audio: { ...settings.audio, [key]: value },
    });
  };

  const handleMotionToggle = (enabled: boolean) => {
    onSettingsChange({
      ...settings,
      motionControl: { ...settings.motionControl, enabled },
    });
  };

  const handleReferenceVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a video file (MP4, MOV, WebM)',
        variant: 'destructive',
      });
      return;
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Reference video must be under 100MB',
        variant: 'destructive',
      });
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const duration = video.duration;
      if (duration < 3 || duration > 30) {
        toast({
          title: 'Invalid video duration',
          description: 'Reference video must be between 3 and 30 seconds',
          variant: 'destructive',
        });
        return;
      }
      
      setVideoDuration(duration);
      onSettingsChange({
        ...settings,
        motionControl: {
          ...settings.motionControl,
          enabled: true,
          referenceVideoFile: file,
          referenceVideoDuration: duration,
        },
      });
      
      toast({
        title: 'Reference video uploaded',
        description: `${file.name} (${duration.toFixed(1)}s)`,
      });
    };
    video.onerror = () => {
      toast({
        title: 'Failed to load video',
        description: 'Could not read video file metadata',
        variant: 'destructive',
      });
    };
    video.src = URL.createObjectURL(file);
  };

  const handleRemoveReferenceVideo = () => {
    setVideoDuration(null);
    onSettingsChange({
      ...settings,
      motionControl: {
        ...settings.motionControl,
        referenceVideoFile: undefined,
        referenceVideoUrl: undefined,
        referenceVideoDuration: undefined,
      },
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!showAudioSettings && !showMotionSettings) {
    return null;
  }

  return (
    <Card data-testid="video-generation-settings">
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Generation Settings
                {(settings.audio.enabled || settings.motionControl.enabled) && (
                  <Badge variant="secondary" className="text-xs">
                    {[
                      settings.audio.enabled && 'Audio',
                      settings.motionControl.enabled && 'Motion',
                    ].filter(Boolean).join(' + ')}
                  </Badge>
                )}
              </CardTitle>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {showAudioSettings && (
              <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg" data-testid="audio-settings-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-blue-600" />
                    <Label className="font-medium">Native Audio Generation</Label>
                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">
                      Kling 2.6+
                    </Badge>
                  </div>
                  <Switch
                    checked={settings.audio.enabled}
                    onCheckedChange={handleAudioToggle}
                    data-testid="audio-toggle"
                  />
                </div>
                
                {settings.audio.enabled && (
                  <div className="space-y-3 pl-6 border-l-2 border-blue-200 dark:border-blue-700">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Mic className="h-3.5 w-3.5" /> Voice Generation
                      </Label>
                      <Switch
                        checked={settings.audio.voiceGeneration}
                        onCheckedChange={(v) => handleAudioOptionChange('voiceGeneration', v)}
                        data-testid="voice-generation-toggle"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Music className="h-3.5 w-3.5" /> Sound Effects
                      </Label>
                      <Switch
                        checked={settings.audio.soundEffects}
                        onCheckedChange={(v) => handleAudioOptionChange('soundEffects', v)}
                        data-testid="sound-effects-toggle"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm flex items-center gap-1.5">
                        <Waves className="h-3.5 w-3.5" /> Ambient Sound
                      </Label>
                      <Switch
                        checked={settings.audio.ambientSound}
                        onCheckedChange={(v) => handleAudioOptionChange('ambientSound', v)}
                        data-testid="ambient-sound-toggle"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Language</Label>
                      <Select
                        value={settings.audio.language || 'en'}
                        onValueChange={(v) => handleAudioOptionChange('language', v)}
                      >
                        <SelectTrigger className="w-32" data-testid="audio-language-select">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_LANGUAGES.map(lang => (
                            <SelectItem key={lang.value} value={lang.value}>
                              {lang.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Alert className="bg-blue-100 dark:bg-blue-900/40 border-blue-200">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Native audio adds voice, sound effects, and ambient sounds directly during video generation. 
                        This eliminates the need for separate audio sync.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            )}
            
            {showMotionSettings && (
              <div className="space-y-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg" data-testid="motion-control-section">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Move className="h-4 w-4 text-purple-600" />
                    <Label className="font-medium">Motion Control</Label>
                    <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                      Video Reference
                    </Badge>
                  </div>
                  <Switch
                    checked={settings.motionControl.enabled}
                    onCheckedChange={handleMotionToggle}
                    data-testid="motion-control-toggle"
                  />
                </div>
                
                {settings.motionControl.enabled && (
                  <div className="space-y-3 pl-6 border-l-2 border-purple-200 dark:border-purple-700">
                    <div>
                      <Label className="text-sm mb-2 block">Reference Video (3-30 seconds)</Label>
                      
                      {settings.motionControl.referenceVideoFile ? (
                        <div className="flex items-center gap-2 p-2 bg-purple-100 dark:bg-purple-800/40 rounded">
                          <Video className="h-4 w-4 text-purple-600" />
                          <span className="text-sm flex-1 truncate">
                            {settings.motionControl.referenceVideoFile.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {videoDuration?.toFixed(1)}s
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveReferenceVideo}
                            className="h-6 w-6 p-0"
                            data-testid="remove-reference-video"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleReferenceVideoUpload}
                            className="hidden"
                            id="reference-video-upload"
                            data-testid="reference-video-input"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full"
                            data-testid="upload-reference-video-button"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Reference Video
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    <Alert className="bg-purple-100 dark:bg-purple-900/40 border-purple-200">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Motion Control transfers motion from a reference video to your generated content.
                        Ideal for choreography, dance, gestures, and complex movements.
                        Supports videos up to 30 seconds.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function getDefaultVideoGenerationSettings(): VideoGenerationSettingsData {
  return {
    audio: {
      enabled: false,
      voiceGeneration: true,
      soundEffects: true,
      ambientSound: true,
      language: 'en',
    },
    motionControl: {
      enabled: false,
    },
  };
}
