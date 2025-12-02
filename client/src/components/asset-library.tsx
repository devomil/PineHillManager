import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Image, 
  Video, 
  Music, 
  Upload, 
  Search, 
  Filter, 
  Grid3X3, 
  List,
  Download,
  Trash2,
  Plus,
  Tag,
  Clock,
  FileType,
  Sparkles
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

type AssetType = 'image' | 'video' | 'music' | 'all';
type ViewMode = 'grid' | 'list';

interface MediaAsset {
  id: number;
  type: 'image' | 'video' | 'music';
  name: string;
  url: string;
  thumbnail_url?: string;
  source: string;
  category?: string;
  mood?: string;
  width?: number;
  height?: number;
  duration?: number;
  file_size?: number;
  prompt?: string;
  description?: string;
  tags: string[];
  created_at: string;
  usage_count: number;
  is_favorite: boolean;
}

interface UserUpload {
  id: number;
  type: 'image' | 'video' | 'music' | 'logo' | 'testimonial';
  name: string;
  url: string;
  description?: string;
  tags: string[];
  created_at: string;
}

const ASSET_CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'product', label: 'Product' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'nature', label: 'Nature' },
  { value: 'people', label: 'People' },
  { value: 'abstract', label: 'Abstract' },
  { value: 'technology', label: 'Technology' },
  { value: 'health', label: 'Health & Wellness' },
];

const MOOD_OPTIONS = [
  { value: 'all', label: 'All Moods' },
  { value: 'uplifting', label: 'Uplifting' },
  { value: 'calm', label: 'Calm' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'inspiring', label: 'Inspiring' },
  { value: 'professional', label: 'Professional' },
  { value: 'playful', label: 'Playful' },
];

const SOURCE_OPTIONS = [
  { value: 'all', label: 'All Sources' },
  { value: 'stability_ai', label: 'Stability AI' },
  { value: 'huggingface', label: 'HuggingFace' },
  { value: 'runway', label: 'Runway' },
  { value: 'pexels', label: 'Pexels' },
  { value: 'pixabay', label: 'Pixabay' },
  { value: 'unsplash', label: 'Unsplash' },
  { value: 'elevenlabs', label: 'ElevenLabs' },
  { value: 'upload', label: 'User Upload' },
];

export default function AssetLibrary() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'library' | 'uploads'>('library');
  const [assetType, setAssetType] = useState<AssetType>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [moodFilter, setMoodFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const { data: assetsData, isLoading: isLoadingAssets } = useQuery<{ assets: MediaAsset[]; total: number }>({
    queryKey: ['/api/videos/assets', { type: assetType, search: searchQuery, category: categoryFilter, mood: moodFilter, source: sourceFilter }],
    enabled: activeTab === 'library',
  });

  const { data: uploadsData, isLoading: isLoadingUploads } = useQuery<{ uploads: UserUpload[]; total: number }>({
    queryKey: ['/api/videos/uploads'],
    enabled: activeTab === 'uploads',
  });

  const assets: MediaAsset[] = assetsData?.assets || [];
  const uploads: UserUpload[] = uploadsData?.uploads || [];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', getFileType(file.type));
        formData.append('name', file.name);

        const response = await fetch('/api/videos/uploads', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }

      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${files.length} file(s)`,
      });

      queryClient.invalidateQueries({ queryKey: ['/api/videos/uploads'] });
    } catch (error) {
      toast({
        title: 'Upload Failed',
        description: error instanceof Error ? error.message : 'Failed to upload files',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'music';
    return 'image';
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getAssetTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'music': return <Music className="h-4 w-4" />;
      default: return <FileType className="h-4 w-4" />;
    }
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'stability_ai':
      case 'huggingface':
      case 'runway':
        return 'bg-purple-100 text-purple-800';
      case 'pexels':
      case 'pixabay':
      case 'unsplash':
        return 'bg-blue-100 text-blue-800';
      case 'elevenlabs':
        return 'bg-green-100 text-green-800';
      case 'upload':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-600" />
                Asset Library
              </CardTitle>
              <CardDescription>
                Browse and manage your video production assets including AI-generated images, stock footage, and custom uploads.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
                data-testid="view-mode-grid"
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                data-testid="view-mode-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'library' | 'uploads')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="library" className="flex items-center gap-2" data-testid="tab-asset-library">
                <Image className="h-4 w-4" />
                Asset Library
              </TabsTrigger>
              <TabsTrigger value="uploads" className="flex items-center gap-2" data-testid="tab-my-uploads">
                <Upload className="h-4 w-4" />
                My Uploads
              </TabsTrigger>
            </TabsList>

            <TabsContent value="library" className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search assets..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="asset-search-input"
                    />
                  </div>
                </div>

                <Select value={assetType} onValueChange={(v) => setAssetType(v as AssetType)}>
                  <SelectTrigger className="w-[150px]" data-testid="filter-type">
                    <SelectValue placeholder="Asset Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="image">Images</SelectItem>
                    <SelectItem value="video">Videos</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="filter-category">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={moodFilter} onValueChange={setMoodFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="filter-mood">
                    <SelectValue placeholder="Mood" />
                  </SelectTrigger>
                  <SelectContent>
                    {MOOD_OPTIONS.map((mood) => (
                      <SelectItem key={mood.value} value={mood.value}>{mood.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="filter-source">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((src) => (
                      <SelectItem key={src.value} value={src.value}>{src.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isLoadingAssets ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading assets...</p>
                  </div>
                </div>
              ) : assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Image className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No assets found</h3>
                  <p className="text-gray-500 mb-4">
                    Assets will appear here after you generate videos with the AI Producer.
                  </p>
                  <Button variant="outline">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start AI Production
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="relative group cursor-pointer rounded-lg overflow-hidden border bg-gray-50 hover:border-primary transition-colors"
                          onClick={() => setSelectedAsset(asset)}
                          data-testid={`asset-card-${asset.id}`}
                        >
                          <div className="aspect-video bg-gray-200 relative">
                            {asset.type === 'image' && (
                              <img
                                src={asset.thumbnail_url || asset.url}
                                alt={asset.name}
                                className="w-full h-full object-cover"
                              />
                            )}
                            {asset.type === 'video' && (
                              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                <Video className="h-8 w-8 text-white/70" />
                              </div>
                            )}
                            {asset.type === 'music' && (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                <Music className="h-8 w-8 text-white" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <Button size="sm" variant="secondary">
                                View
                              </Button>
                            </div>
                          </div>
                          <div className="p-2">
                            <p className="text-xs font-medium truncate">{asset.name}</p>
                            <div className="flex items-center gap-1 mt-1">
                              <Badge variant="secondary" className={`text-xs ${getSourceBadgeColor(asset.source)}`}>
                                {asset.source}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedAsset(asset)}
                          data-testid={`asset-row-${asset.id}`}
                        >
                          <div className="w-20 h-12 rounded overflow-hidden bg-gray-200 flex-shrink-0">
                            {asset.type === 'image' && (
                              <img src={asset.thumbnail_url || asset.url} alt={asset.name} className="w-full h-full object-cover" />
                            )}
                            {asset.type === 'video' && (
                              <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                <Video className="h-4 w-4 text-white/70" />
                              </div>
                            )}
                            {asset.type === 'music' && (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                                <Music className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{asset.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {getAssetTypeIcon(asset.type)}
                              <span>{asset.type}</span>
                              <span>•</span>
                              <span>{formatFileSize(asset.file_size)}</span>
                              {asset.duration && (
                                <>
                                  <span>•</span>
                                  <span>{formatDuration(asset.duration)}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge variant="secondary" className={getSourceBadgeColor(asset.source)}>
                            {asset.source}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="uploads" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Upload custom assets like logos, testimonials, and brand images for use in your video productions.
                </p>
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                >
                  <Upload className="h-4 w-4" />
                  Upload Files
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept="image/*,video/*,audio/*"
                    className="hidden"
                    onChange={handleFileUpload}
                    data-testid="file-upload-input"
                  />
                </Label>
              </div>

              {isUploading && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                    <span className="text-sm font-medium">Uploading files...</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {isLoadingUploads ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading uploads...</p>
                  </div>
                </div>
              ) : uploads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                  <Upload className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No uploads yet</h3>
                  <p className="text-gray-500 mb-4 max-w-md">
                    Upload your company logos, customer testimonials, product images, and other custom assets to use in your video productions.
                  </p>
                  <Label
                    htmlFor="file-upload-empty"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Upload
                    <input
                      id="file-upload-empty"
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </Label>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="relative group cursor-pointer rounded-lg overflow-hidden border bg-gray-50 hover:border-primary transition-colors"
                      data-testid={`upload-card-${upload.id}`}
                    >
                      <div className="aspect-video bg-gray-200 relative">
                        {upload.type === 'image' || upload.type === 'logo' || upload.type === 'testimonial' ? (
                          <img
                            src={upload.url}
                            alt={upload.name}
                            className="w-full h-full object-cover"
                          />
                        ) : upload.type === 'video' ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-900">
                            <Video className="h-8 w-8 text-white/70" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
                            <Music className="h-8 w-8 text-white" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                          <Button size="sm" variant="secondary">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{upload.name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                            {upload.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selectedAsset} onOpenChange={() => setSelectedAsset(null)}>
        <DialogContent className="max-w-3xl">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getAssetTypeIcon(selectedAsset.type)}
                  {selectedAsset.name}
                </DialogTitle>
                <DialogDescription>
                  Asset details and metadata
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6">
                <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  {selectedAsset.type === 'image' && (
                    <img src={selectedAsset.url} alt={selectedAsset.name} className="w-full h-full object-contain" />
                  )}
                  {selectedAsset.type === 'video' && (
                    <video src={selectedAsset.url} controls className="w-full h-full" />
                  )}
                  {selectedAsset.type === 'music' && (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      <Music className="h-16 w-16 mb-4" />
                      <audio src={selectedAsset.url} controls className="w-4/5" />
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-gray-500">Source</Label>
                    <Badge className={getSourceBadgeColor(selectedAsset.source)}>
                      {selectedAsset.source}
                    </Badge>
                  </div>
                  {selectedAsset.width && selectedAsset.height && (
                    <div>
                      <Label className="text-xs text-gray-500">Dimensions</Label>
                      <p className="font-medium">{selectedAsset.width} x {selectedAsset.height}</p>
                    </div>
                  )}
                  {selectedAsset.duration && (
                    <div>
                      <Label className="text-xs text-gray-500">Duration</Label>
                      <p className="font-medium">{formatDuration(selectedAsset.duration)}</p>
                    </div>
                  )}
                  {selectedAsset.file_size && (
                    <div>
                      <Label className="text-xs text-gray-500">File Size</Label>
                      <p className="font-medium">{formatFileSize(selectedAsset.file_size)}</p>
                    </div>
                  )}
                  {selectedAsset.prompt && (
                    <div>
                      <Label className="text-xs text-gray-500">AI Prompt</Label>
                      <p className="text-sm text-gray-700">{selectedAsset.prompt}</p>
                    </div>
                  )}
                  {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-500">Tags</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedAsset.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-4">
                    <Button className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" className="flex-1">
                      Use in Production
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
