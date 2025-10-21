import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image, Camera, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PhotoUploadProps {
  onPhotosUploaded: (imageUrls: string[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

interface UploadedImage {
  id: string;
  url: string;
  file: File;
  preview: string;
}

export function PhotoUpload({
  onPhotosUploaded,
  maxFiles = 5,
  maxSizeMB = 5,
  disabled = false,
  className,
  placeholder = "Drag photos here, paste from clipboard, or click to select"
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const validateFile = useCallback((file: File): boolean => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: `${file.name} is not an image file`,
        variant: "destructive"
      });
      return false;
    }

    // Check file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "File too large",
        description: `${file.name} is larger than ${maxSizeMB}MB`,
        variant: "destructive"
      });
      return false;
    }

    return true;
  }, [maxSizeMB, toast]);

  const processFiles = useCallback(async (files: File[]) => {
    if (disabled || isUploading) return;

    // Validate total number of files
    if (uploadedImages.length + files.length > maxFiles) {
      toast({
        title: "Too many files",
        description: `Maximum ${maxFiles} images allowed`,
        variant: "destructive"
      });
      return;
    }

    // Filter and validate files
    const validFiles = files.filter(validateFile);
    if (validFiles.length === 0) return;

    setIsUploading(true);

    try {
      // Upload each file to Object Storage using presigned URLs
      const uploadedUrls: string[] = [];

      for (const file of validFiles) {
        // Step 1: Get presigned URL from backend
        const uploadUrlResponse = await apiRequest('POST', '/api/objects/upload');
        const { uploadURL } = await uploadUrlResponse.json();

        // Step 2: Upload file directly to Object Storage
        const uploadResponse = await fetch(uploadURL, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Failed to upload ${file.name} to storage`);
        }

        // Store the upload URL (will be normalized on finalize)
        uploadedUrls.push(uploadURL.split('?')[0]); // Remove query params
      }

      // Step 3: Finalize upload and set ACL policies
      const finalizeResponse = await apiRequest('POST', '/api/communications/finalize-upload', {
        imageUrls: uploadedUrls
      });

      const result = await finalizeResponse.json();

      if (result.success && result.imageUrls) {
        // Create local preview objects
        const newImages: UploadedImage[] = validFiles.map((file, index) => ({
          id: `${Date.now()}-${index}`,
          url: result.imageUrls[index],
          file,
          preview: URL.createObjectURL(file)
        }));

        const updatedImages = [...uploadedImages, ...newImages];
        setUploadedImages(updatedImages);
        
        // Notify parent component
        onPhotosUploaded(updatedImages.map(img => img.url));

        toast({
          title: "Upload successful",
          description: `${validFiles.length} image(s) uploaded successfully to permanent storage`
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to upload images',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, uploadedImages, maxFiles, validateFile, onPhotosUploaded, toast]);

  const removeImage = useCallback((imageId: string) => {
    setUploadedImages(prev => {
      const updated = prev.filter(img => img.id !== imageId);
      // Clean up preview URL
      const removedImage = prev.find(img => img.id === imageId);
      if (removedImage) {
        URL.revokeObjectURL(removedImage.preview);
      }
      // Update parent component
      onPhotosUploaded(updated.map(img => img.url));
      return updated;
    });
  }, [onPhotosUploaded]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone itself
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      processFiles(files);
    }
  }, [disabled, processFiles]);

  // File input handler
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  }, [processFiles]);

  // Paste handler
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    if (disabled) return;

    const items = Array.from(e.clipboardData.items);
    const imageFiles = items
      .filter(item => item.type.startsWith('image/'))
      .map(item => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (imageFiles.length > 0) {
      processFiles(imageFiles);
    }
  }, [disabled, processFiles]);

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      <Card 
        ref={dropZoneRef}
        className={cn(
          "border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragging 
            ? "border-primary bg-primary/5 scale-[1.02]" 
            : "border-muted-foreground/25 hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed",
          uploadedImages.length > 0 && "border-solid"
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={handleClick}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Uploading images...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <Camera className="h-8 w-8 text-muted-foreground" />
                <Paperclip className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">{placeholder}</p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, PNG, GIF, WebP • Max {maxSizeMB}MB • Up to {maxFiles} images
                </p>
                {uploadedImages.length > 0 && (
                  <p className="text-xs text-primary">
                    {uploadedImages.length}/{maxFiles} images selected
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group">
              <div className="aspect-square bg-muted rounded-lg overflow-hidden">
                <img
                  src={image.preview}
                  alt={image.file.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(image.id);
                }}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                {image.file.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}