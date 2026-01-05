import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image, Camera, Paperclip, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedPdf {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
}

interface PhotoUploadProps {
  onPhotosUploaded: (imageUrls: string[]) => void;
  onPdfsUploaded?: (pdfs: UploadedPdf[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  maxPdfSizeMB?: number;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  allowPdf?: boolean;
}

interface UploadedImage {
  id: string;
  url: string;
  file: File;
  preview: string;
}

export function PhotoUpload({
  onPhotosUploaded,
  onPdfsUploaded,
  maxFiles = 5,
  maxSizeMB = 5,
  maxPdfSizeMB = 10,
  disabled = false,
  className,
  placeholder = "Drag photos here, paste from clipboard, or click to select",
  allowPdf = false
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedPdfs, setUploadedPdfs] = useState<UploadedPdf[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
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

  // PDF upload handling
  const processPdfFile = useCallback(async (file: File) => {
    if (disabled || isUploading) return;

    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast({
        title: "Invalid file type",
        description: "Only PDF files are allowed",
        variant: "destructive"
      });
      return;
    }

    // Validate file size
    const maxSizeBytes = maxPdfSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      toast({
        title: "File too large",
        description: `PDF must be less than ${maxPdfSizeMB}MB`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for PDF upload
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('/api/communications/upload-pdf', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const newPdf: UploadedPdf = {
          id: `pdf-${Date.now()}`,
          url: result.fileUrl,
          fileName: result.fileName,
          fileSize: result.fileSize
        };

        const updatedPdfs = [...uploadedPdfs, newPdf];
        setUploadedPdfs(updatedPdfs);
        
        // Notify parent component
        if (onPdfsUploaded) {
          onPdfsUploaded(updatedPdfs);
        }

        toast({
          title: "PDF uploaded",
          description: `${file.name} uploaded successfully`
        });
      } else {
        throw new Error(result.error || 'PDF upload failed');
      }
    } catch (error) {
      console.error('PDF upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'Failed to upload PDF',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [disabled, isUploading, uploadedPdfs, maxPdfSizeMB, onPdfsUploaded, toast]);

  const removePdf = useCallback((pdfId: string) => {
    setUploadedPdfs(prev => {
      const updated = prev.filter(pdf => pdf.id !== pdfId);
      if (onPdfsUploaded) {
        onPdfsUploaded(updated);
      }
      return updated;
    });
  }, [onPdfsUploaded]);

  const handlePdfSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processPdfFile(files[0]);
    }
    // Reset input so same file can be selected again
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  }, [processPdfFile]);

  const handlePdfClick = useCallback(() => {
    if (!disabled && pdfInputRef.current) {
      pdfInputRef.current.click();
    }
  }, [disabled]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

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
          (uploadedImages.length > 0 || uploadedPdfs.length > 0) && "border-solid"
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
            data-testid="input-image-upload"
          />
          {allowPdf && (
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfSelect}
              className="hidden"
              disabled={disabled}
              data-testid="input-pdf-upload"
            />
          )}
          
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <Camera className="h-8 w-8 text-muted-foreground" />
                <Paperclip className="h-8 w-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {allowPdf ? "Add photos to your message (drag, paste, or click)" : placeholder}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPG, PNG, GIF, WebP • Max {maxSizeMB}MB • Up to {maxFiles} images
                </p>
                {uploadedImages.length > 0 && (
                  <p className="text-xs text-primary">
                    {uploadedImages.length}/{maxFiles} images selected
                  </p>
                )}
              </div>
              {allowPdf && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePdfClick();
                  }}
                  disabled={disabled || isUploading}
                  className="mt-2"
                  data-testid="button-upload-pdf"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Attach PDF (Max {maxPdfSizeMB}MB)
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Image Preview Grid */}
      {uploadedImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {uploadedImages.map((image) => (
            <div key={image.id} className="relative group" data-testid={`image-preview-${image.id}`}>
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
                data-testid={`button-remove-image-${image.id}`}
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

      {/* PDF Preview List */}
      {uploadedPdfs.length > 0 && (
        <div className="space-y-2">
          {uploadedPdfs.map((pdf) => (
            <div 
              key={pdf.id} 
              className="flex items-center justify-between p-3 bg-muted rounded-lg group"
              data-testid={`pdf-preview-${pdf.id}`}
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-sm font-medium truncate max-w-[200px]">{pdf.fileName}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(pdf.fileSize)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={pdf.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`link-download-pdf-${pdf.id}`}
                >
                  <Download className="h-4 w-4" />
                </a>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePdf(pdf.id);
                  }}
                  disabled={disabled}
                  data-testid={`button-remove-pdf-${pdf.id}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export the UploadedPdf type for use in parent components
export type { UploadedPdf };