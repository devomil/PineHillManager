// client/src/components/quick-create-tab.tsx

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Upload, FileText, Clock, Palette, Monitor, 
  CheckCircle, Loader2, Download, Play, AlertCircle,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface DocumentPreview {
  documentId: string;
  filename: string;
  title: string;
  sectionCount: number;
  estimatedDuration: number;
  sections: { heading: string; contentPreview: string; bulletCount: number }[];
}

interface GenerationStatus {
  success: boolean;
  status: string;
  progress: number;
  currentStep: string;
  isStalled?: boolean;
  downloadUrl: string | null;
  scenes?: { id: string; type: string; hasVideo: boolean; hasVoiceover: boolean }[];
}

interface QuickCreateTabProps {
  onProjectCreated?: (projectId: string) => void;
}

export function QuickCreateTab({ onProjectCreated }: QuickCreateTabProps) {
  const { toast } = useToast();
  
  const [document, setDocument] = useState<DocumentPreview | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    targetDuration: 4,
    visualStyle: 'educational',
    platform: 'youtube',
    includeIntroLogo: true,
    includeWatermark: true,
    includeCTAOutro: true,
  });
  
  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      
      const response = await fetch('/api/quick-create/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setDocument(data.document);
      toast({ title: 'Document uploaded', description: `Found ${data.document.sectionCount} sections` });
    },
    onError: (error: Error) => {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    },
  });
  
  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!document) throw new Error('No document uploaded');
      
      const response = await fetch('/api/quick-create/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          documentId: document.documentId,
          targetDuration: settings.targetDuration,
          visualStyle: settings.visualStyle,
          platform: settings.platform,
          brandSettings: {
            includeIntroLogo: settings.includeIntroLogo,
            includeWatermark: settings.includeWatermark,
            includeCTAOutro: settings.includeCTAOutro,
          },
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Generation failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProjectId(data.project.id);
      toast({ title: 'Video generation started', description: 'This may take several minutes' });
    },
    onError: (error: Error) => {
      toast({ title: 'Generation failed', description: error.message, variant: 'destructive' });
    },
  });
  
  // Status polling
  const statusQuery = useQuery<GenerationStatus>({
    queryKey: ['quick-create-status', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/quick-create/status/${projectId}`, {
        credentials: 'include',
      });
      return response.json();
    },
    enabled: !!projectId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'complete' || data?.status === 'failed') return false;
      return 5000; // Poll every 5 seconds
    },
  });
  
  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadMutation.mutate(acceptedFiles[0]);
    }
  }, [uploadMutation]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });
  
  // Reset to start over
  const handleReset = () => {
    setDocument(null);
    setProjectId(null);
  };
  
  // Render progress view
  if (projectId && statusQuery.data) {
    return (
      <GenerationProgress 
        status={statusQuery.data} 
        onReset={handleReset}
        projectId={projectId}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold">Quick Create</h2>
        <p className="text-muted-foreground mt-1">
          Upload a document and get a branded video in minutes
        </p>
      </div>
      
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Document
          </CardTitle>
          <CardDescription>
            Supported formats: Word (.docx), PDF, or Text files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              ${uploadMutation.isPending ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            <input {...getInputProps()} />
            
            {uploadMutation.isPending ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p>Processing document...</p>
              </div>
            ) : document ? (
              <div className="flex flex-col items-center gap-2">
                <CheckCircle className="w-10 h-10 text-green-500" />
                <p className="font-medium">{document.filename}</p>
                <p className="text-sm text-muted-foreground">
                  {document.sectionCount} sections &bull; ~{document.estimatedDuration} min read time
                </p>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setDocument(null); }}>
                  Change file
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-10 h-10 text-muted-foreground" />
                <p className="font-medium">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop or click to upload'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Max file size: 10MB
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Settings - Only show after upload */}
      {document && (
        <>
          {/* Document Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Document Preview</CardTitle>
              <CardDescription>{document.title}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {document.sections.map((section, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="font-medium text-primary">{i + 1}.</span>
                    <div>
                      <span className="font-medium">{section.heading}</span>
                      {section.bulletCount > 0 && (
                        <span className="text-muted-foreground ml-2">
                          ({section.bulletCount} points)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          {/* Video Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Video Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Target Duration
                  </Label>
                  <Select
                    value={settings.targetDuration.toString()}
                    onValueChange={(v) => setSettings(s => ({ ...s, targetDuration: parseInt(v) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 minutes</SelectItem>
                      <SelectItem value="4">4 minutes</SelectItem>
                      <SelectItem value="6">6 minutes</SelectItem>
                      <SelectItem value="8">8 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Visual Style */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Visual Style
                  </Label>
                  <Select
                    value={settings.visualStyle}
                    onValueChange={(v) => setSettings(s => ({ ...s, visualStyle: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="educational">Educational</SelectItem>
                      <SelectItem value="lifestyle">Lifestyle</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="hero">Hero (Cinematic)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Platform */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Monitor className="w-4 h-4" />
                  Platform
                </Label>
                <Select
                  value={settings.platform}
                  onValueChange={(v) => setSettings(s => ({ ...s, platform: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="youtube">YouTube (16:9)</SelectItem>
                    <SelectItem value="tiktok">TikTok (9:16)</SelectItem>
                    <SelectItem value="instagram">Instagram (1:1)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Brand Settings */}
              <div className="space-y-3 pt-2">
                <Label>Brand Elements</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="logo"
                      checked={settings.includeIntroLogo}
                      onCheckedChange={(checked) => 
                        setSettings(s => ({ ...s, includeIntroLogo: !!checked }))
                      }
                    />
                    <label htmlFor="logo" className="text-sm cursor-pointer">
                      Include Pine Hill Farm logo intro
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="watermark"
                      checked={settings.includeWatermark}
                      onCheckedChange={(checked) => 
                        setSettings(s => ({ ...s, includeWatermark: !!checked }))
                      }
                    />
                    <label htmlFor="watermark" className="text-sm cursor-pointer">
                      Include watermark throughout video
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="endcard"
                      checked={settings.includeCTAOutro}
                      onCheckedChange={(checked) => 
                        setSettings(s => ({ ...s, includeCTAOutro: !!checked }))
                      }
                    />
                    <label htmlFor="endcard" className="text-sm cursor-pointer">
                      Include end card with call-to-action
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Generate Button */}
          <Button
            size="lg"
            className="w-full"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Starting generation...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Create Video
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}

/**
 * Generation Progress Component
 */
function GenerationProgress({ 
  status, 
  onReset,
  projectId,
}: { 
  status: GenerationStatus; 
  onReset: () => void;
  projectId: string;
}) {
  const { toast } = useToast();
  const [isRetrying, setIsRetrying] = useState(false);
  
  const stepLabels: Record<string, string> = {
    pending: 'Preparing...',
    script: 'Parsing script',
    voiceover: 'Generating voiceover',
    images: 'Creating images',
    videos: 'Generating videos',
    music: 'Adding music',
    assembly: 'Assembling scenes',
    rendering: 'Final rendering',
    render_queued: 'Queued for rendering',
  };
  
  const isComplete = status.status === 'complete';
  const isFailed = status.status === 'failed' || status.status === 'error';
  const isStalled = status.isStalled && !isRetrying;
  
  useEffect(() => {
    if (!status.isStalled && !isFailed && isRetrying) {
      setIsRetrying(false);
    }
  }, [status.isStalled, isFailed, isRetrying]);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      const response = await fetch(`/api/quick-create/retry/${projectId}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        toast({ title: 'Generation restarted', description: 'Progress will update shortly' });
        setTimeout(() => setIsRetrying(false), 10000);
      } else {
        toast({ title: 'Retry failed', description: data.error, variant: 'destructive' });
        setIsRetrying(false);
      }
    } catch {
      toast({ title: 'Retry failed', description: 'Could not reach server', variant: 'destructive' });
      setIsRetrying(false);
    }
  };
  
  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {isComplete ? (
            <>
              <CheckCircle className="w-6 h-6 text-green-500" />
              Video Ready!
            </>
          ) : isFailed ? (
            <>
              <AlertCircle className="w-6 h-6 text-red-500" />
              Generation Failed
            </>
          ) : isStalled ? (
            <>
              <AlertCircle className="w-6 h-6 text-amber-500" />
              Generation Stalled
            </>
          ) : (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              Creating Your Video
            </>
          )}
        </CardTitle>
        {isStalled ? (
          <CardDescription>
            Generation was interrupted. Click retry to resume.
          </CardDescription>
        ) : !isComplete && !isFailed && (
          <CardDescription>
            {stepLabels[status.currentStep] || status.currentStep}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={status.progress} className="h-2" />
        <p className="text-center text-sm text-muted-foreground">
          {status.progress}% complete
        </p>
        
        {(isStalled || isFailed) && (
          <Button 
            className="w-full" 
            onClick={handleRetry} 
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Restarting...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry Generation
              </>
            )}
          </Button>
        )}
        
        {status.scenes && status.scenes.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto">
            {status.scenes.map((scene, i) => (
              <div key={scene.id} className="flex items-center gap-2">
                <span>{i + 1}.</span>
                <span className="capitalize">{scene.type}</span>
                {scene.hasVideo && <CheckCircle className="w-3 h-3 text-green-500" />}
                {scene.hasVoiceover && <span className="text-blue-500 text-xs">VO</span>}
              </div>
            ))}
          </div>
        )}
        
        {isComplete && status.downloadUrl && (
          <div className="space-y-2">
            <Button asChild className="w-full">
              <a href={status.downloadUrl} download>
                <Download className="w-4 h-4 mr-2" />
                Download Video
              </a>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <a href={`/admin/marketing?project=${projectId}`}>
                View in Editor
              </a>
            </Button>
          </div>
        )}
        
        <Button variant="ghost" onClick={onReset} className="w-full">
          <RotateCcw className="w-4 h-4 mr-2" />
          {isComplete ? 'Create Another Video' : 'Start Over'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default QuickCreateTab;
