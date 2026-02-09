import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Upload,
  Trash2,
  RefreshCw,
  Music,
  Image,
  FileText,
  CloudUpload,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  HardDrive,
  Volume2,
  Award,
  Layers,
  Type,
  Film,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface S3File {
  key: string;
  name: string;
  size: number;
  lastModified: string | null;
  url: string;
  contentType: string;
}

interface AssetCategory {
  prefix: string;
  label: string;
  accept: string;
}

type CategoryKey = 'sfx' | 'music' | 'logos' | 'badges' | 'overlays' | 'end-cards' | 'fonts';

const CATEGORY_ICONS: Record<CategoryKey, typeof Music> = {
  'sfx': Volume2,
  'music': Music,
  'logos': Image,
  'badges': Award,
  'overlays': Layers,
  'end-cards': Film,
  'fonts': Type,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function AudioPreview({ fileKey, name }: { fileKey: string; name: string }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = useCallback(async () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    if (!audioRef.current.src || audioRef.current.src === window.location.href) {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/admin/s3-assets/preview-url?key=${encodeURIComponent(fileKey)}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to get preview URL');
        const data = await res.json();
        audioRef.current.src = data.url;
        audioRef.current.load();
      } catch {
        setError(true);
        setLoading(false);
        return;
      }
    }

    try {
      await audioRef.current.play();
      setPlaying(true);
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [playing, fileKey]);

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        onEnded={() => setPlaying(false)}
        onError={() => { setPlaying(false); setError(true); setLoading(false); }}
        onCanPlayThrough={() => setLoading(false)}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={toggle}
        disabled={loading}
        className={`h-8 w-8 p-0 ${error ? 'text-red-400' : ''}`}
        title={error ? 'Could not play - file may be a silent placeholder' : 'Play audio'}
      >
        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : playing ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <span className="text-sm truncate max-w-[200px]">{name}</span>
      {error && <span className="text-xs text-red-400">(silent/placeholder)</span>}
    </div>
  );
}

interface ValidationResult {
  name: string;
  size: number;
  valid: boolean;
  reason: string;
}

function FileRow({ file, category, onDelete, validation }: { file: S3File; category: CategoryKey; onDelete: (key: string) => void; validation?: ValidationResult }) {
  const isAudio = file.contentType.startsWith('audio/');
  const isImage = file.contentType.startsWith('image/');
  const isInvalid = validation && !validation.valid;

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${isInvalid ? 'border-red-300 bg-red-50 dark:bg-red-950/20' : 'border-gray-200 dark:border-gray-700'}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isImage && (
          <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-100">
            <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
          </div>
        )}
        {isAudio ? (
          <AudioPreview fileKey={file.key} name={file.name} />
        ) : (
          !isImage && <span className="text-sm truncate">{file.name}</span>
        )}
        {!isAudio && isImage && <span className="text-sm truncate">{file.name}</span>}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {validation && (
          isInvalid ? (
            <Badge variant="outline" className="text-red-600 border-red-300">
              <XCircle className="h-3 w-3 mr-1" />
              {validation.reason}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-300">
              <CheckCircle className="h-3 w-3 mr-1" />
              Valid
            </Badge>
          )
        )}
        <span className="text-xs text-gray-500 w-16 text-right">{formatFileSize(file.size)}</span>
        <span className="text-xs text-gray-400 w-32 text-right hidden md:block">{formatDate(file.lastModified)}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => onDelete(file.key)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function S3AssetManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('sfx');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [validationResults, setValidationResults] = useState<Record<string, ValidationResult>>({});
  const [validating, setValidating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categoriesQuery = useQuery<Record<CategoryKey, AssetCategory>>({
    queryKey: ['/api/admin/s3-assets/categories'],
  });

  const filesQuery = useQuery<S3File[]>({
    queryKey: ['/api/admin/s3-assets/list', activeCategory],
    queryFn: async () => {
      const res = await fetch(`/api/admin/s3-assets/list?category=${activeCategory}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load files');
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await apiRequest('POST', '/api/admin/s3-assets/delete', { key });
      return res.json();
    },
    onSuccess: (_, key) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/s3-assets/list', activeCategory] });
      toast({ title: 'File Deleted', description: `Removed ${key.split('/').pop()}` });
      setDeleteKey(null);
    },
    onError: (err: any) => {
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' });
    },
  });

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const category = categoriesQuery.data?.[activeCategory];
    if (!category) return;

    setUploading(true);
    setUploadProgress(0);
    const fileNames = Array.from(files).map(f => f.name);
    setUploadingFiles(fileNames);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const urlRes = await apiRequest('POST', '/api/admin/s3-assets/upload-url', {
          category: activeCategory,
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
        });
        const { uploadUrl } = await urlRes.json();

        const uploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });

        if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);
        successCount++;
      } catch (err: any) {
        console.error(`[S3Upload] Failed: ${file.name}`, err);
        failCount++;
      }
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setUploading(false);
    setUploadingFiles([]);
    queryClient.invalidateQueries({ queryKey: ['/api/admin/s3-assets/list', activeCategory] });

    if (failCount === 0) {
      toast({
        title: 'Upload Complete',
        description: `${successCount} file${successCount > 1 ? 's' : ''} uploaded to ${category.label}`,
      });
    } else {
      toast({
        title: 'Upload Partially Failed',
        description: `${successCount} uploaded, ${failCount} failed`,
        variant: 'destructive',
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [activeCategory, categoriesQuery.data, queryClient, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const handleValidate = useCallback(async () => {
    setValidating(true);
    try {
      const res = await apiRequest('POST', '/api/admin/s3-assets/validate', { category: activeCategory });
      const data = await res.json();
      const map: Record<string, ValidationResult> = {};
      for (const f of data.files) {
        map[f.name] = f;
      }
      setValidationResults(map);
      const invalidCount = data.files.filter((f: ValidationResult) => !f.valid).length;
      if (invalidCount === 0) {
        toast({ title: 'All Files Valid', description: `${data.fileCount} files passed validation` });
      } else {
        toast({ title: 'Validation Complete', description: `${invalidCount} of ${data.fileCount} files need replacement`, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Validation Failed', description: err.message, variant: 'destructive' });
    }
    setValidating(false);
  }, [activeCategory, toast]);

  const categories = categoriesQuery.data || {} as Record<CategoryKey, AssetCategory>;
  const files = filesQuery.data || [];
  const currentCategory = (categories as Record<string, AssetCategory>)[activeCategory];
  const invalidCount = Object.values(validationResults).filter(v => !v.valid).length;
  const validCount = Object.values(validationResults).filter(v => v.valid).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              S3 Render Assets
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Manage files on AWS S3 used by the video rendering pipeline (sound effects, logos, badges, etc.)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleValidate}
              disabled={validating || files.length === 0}
            >
              {validating ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              Validate Files
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { filesQuery.refetch(); setValidationResults({}); }}
              disabled={filesQuery.isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${filesQuery.isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeCategory} onValueChange={(v) => { setActiveCategory(v as CategoryKey); setValidationResults({}); }}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {(Object.entries(categories) as [CategoryKey, AssetCategory][]).map(([key, cat]) => {
              const Icon = CATEGORY_ICONS[key] || FileText;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-1.5 text-xs px-3 py-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {(Object.keys(categories) as CategoryKey[]).map(key => (
            <TabsContent key={key} value={key} className="space-y-4">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary">{files.length} file{files.length !== 1 ? 's' : ''}</Badge>
                {Object.keys(validationResults).length > 0 && validCount > 0 && (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {validCount} valid
                  </Badge>
                )}
                {Object.keys(validationResults).length > 0 && invalidCount > 0 && (
                  <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <XCircle className="h-3 w-3 mr-1" />
                    {invalidCount} need replacement
                  </Badge>
                )}
              </div>

              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept={currentCategory?.accept || '*'}
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
                {uploading ? (
                  <div className="space-y-3">
                    <CloudUpload className="h-8 w-8 mx-auto text-blue-500 animate-pulse" />
                    <p className="text-sm font-medium">Uploading {uploadingFiles.length} file{uploadingFiles.length > 1 ? 's' : ''}...</p>
                    <Progress value={uploadProgress} className="max-w-xs mx-auto" />
                    <p className="text-xs text-gray-500">{uploadProgress}% complete</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 mx-auto text-gray-400" />
                    <p className="text-sm font-medium">Drag & drop files here, or click to browse</p>
                    <p className="text-xs text-gray-400">
                      Accepted: {currentCategory?.accept || 'any'}
                    </p>
                  </div>
                )}
              </div>

              {filesQuery.isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading files...</div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No files in this category yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map(file => (
                    <FileRow
                      key={file.key}
                      file={file}
                      category={activeCategory}
                      onDelete={(k) => setDeleteKey(k)}
                      validation={validationResults[file.name]}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        <Dialog open={!!deleteKey} onOpenChange={() => setDeleteKey(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete <strong>{deleteKey?.split('/').pop()}</strong>? This cannot be undone and may affect video rendering if this file is currently in use.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteKey(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteKey && deleteMutation.mutate(deleteKey)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
