# Phase 19A: Quick Create - Document to Video Pipeline

## Executive Summary

Add a "Quick Create" tab to the Universal Video Producer that allows executives to upload a Word document, PDF, or text file and receive a fully branded video with **one click**. No editing required.

**User Story:** "As a CMO, I want to upload a summary document and get a 4-minute branded video without touching any editing controls."

---

## Prerequisites

Before starting this phase, verify:
- [ ] Script parser service is working (`server/services/script-parser-service.ts`)
- [ ] T2V video generation works (Veo, Runway, Kling, etc.)
- [ ] ElevenLabs voiceover generation works
- [ ] Brand injection service exists (`server/services/brand-injection-service.ts`)
- [ ] Remotion render pipeline is functional (even if buggy - we'll fix as we go)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        QUICK CREATE PIPELINE                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. UPLOAD          2. EXTRACT         3. PARSE           4. GENERATE  │
│  ┌─────────┐       ┌─────────┐       ┌─────────┐        ┌─────────┐   │
│  │ .docx   │──────▶│ mammoth │──────▶│ script  │───────▶│  T2V    │   │
│  │ .pdf    │       │ pdf-parse│       │ parser  │        │ videos  │   │
│  │ .txt    │       │         │       │ service │        │         │   │
│  └─────────┘       └─────────┘       └─────────┘        └─────────┘   │
│                                                                │        │
│  5. VOICEOVER      6. BRAND          7. RENDER          8. DELIVER    │
│  ┌─────────┐       ┌─────────┐       ┌─────────┐        ┌─────────┐   │
│  │ Eleven  │──────▶│ Logo    │──────▶│ Remotion│───────▶│ Download│   │
│  │ Labs    │       │ Watermark│       │ Lambda  │        │ MP4     │   │
│  │         │       │ End Card │       │         │        │         │   │
│  └─────────┘       └─────────┘       └─────────┘        └─────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Install Dependencies

```bash
npm install mammoth pdf-parse
```

**Note:** `multer` should already be installed for file uploads. If not:
```bash
npm install multer @types/multer
```

---

## Step 2: Create Document Upload Service

Create `server/services/document-upload-service.ts`:

```typescript
// server/services/document-upload-service.ts

import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';

export interface DocumentSection {
  heading: string;
  content: string;
  bulletPoints: string[];
}

export interface ExtractedDocument {
  title: string;
  fullText: string;
  sections: DocumentSection[];
  estimatedReadingTimeMinutes: number;
}

class DocumentUploadService {
  
  /**
   * Extract content from uploaded document
   */
  async extractContent(filePath: string, mimeType: string): Promise<ExtractedDocument> {
    console.log(`[DocumentUpload] Extracting content from ${filePath} (${mimeType})`);
    
    let rawText: string;
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        filePath.endsWith('.docx')) {
      rawText = await this.extractDocx(filePath);
    } else if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      rawText = await this.extractPdf(filePath);
    } else {
      rawText = await this.extractText(filePath);
    }
    
    return this.parseStructure(rawText);
  }
  
  /**
   * Extract text from Word document
   */
  private async extractDocx(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.extractRawText({ buffer });
    console.log(`[DocumentUpload] Extracted ${result.value.length} characters from DOCX`);
    return result.value;
  }
  
  /**
   * Extract text from PDF
   */
  private async extractPdf(filePath: string): Promise<string> {
    const buffer = fs.readFileSync(filePath);
    const result = await pdfParse(buffer);
    console.log(`[DocumentUpload] Extracted ${result.text.length} characters from PDF`);
    return result.text;
  }
  
  /**
   * Read plain text file
   */
  private async extractText(filePath: string): Promise<string> {
    const content = fs.readFileSync(filePath, 'utf-8');
    console.log(`[DocumentUpload] Read ${content.length} characters from text file`);
    return content;
  }
  
  /**
   * Parse raw text into structured sections
   */
  private parseStructure(rawText: string): ExtractedDocument {
    const lines = rawText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Find title (first bold line or first line)
    let title = 'Untitled Document';
    const sections: DocumentSection[] = [];
    let currentSection: DocumentSection | null = null;
    
    for (const line of lines) {
      // Check if line looks like a heading (bold markers, all caps, or short standalone line)
      const isHeading = this.isLikelyHeading(line);
      
      if (isHeading) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // If no title yet, use first heading
        if (title === 'Untitled Document' && sections.length === 0) {
          title = this.cleanHeading(line);
          currentSection = null;
        } else {
          currentSection = {
            heading: this.cleanHeading(line),
            content: '',
            bulletPoints: [],
          };
        }
      } else if (currentSection) {
        // Check if bullet point
        if (this.isBulletPoint(line)) {
          currentSection.bulletPoints.push(this.cleanBulletPoint(line));
        } else {
          currentSection.content += (currentSection.content ? ' ' : '') + line;
        }
      } else {
        // Content before first section - create intro section
        if (!currentSection) {
          currentSection = {
            heading: 'Introduction',
            content: line,
            bulletPoints: [],
          };
        }
      }
    }
    
    // Don't forget last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // Calculate reading time (average 150 words per minute for video)
    const wordCount = rawText.split(/\s+/).length;
    const estimatedReadingTimeMinutes = Math.ceil(wordCount / 150);
    
    console.log(`[DocumentUpload] Parsed: "${title}" with ${sections.length} sections, ~${estimatedReadingTimeMinutes} min`);
    
    return {
      title,
      fullText: rawText,
      sections,
      estimatedReadingTimeMinutes,
    };
  }
  
  /**
   * Check if a line is likely a heading
   */
  private isLikelyHeading(line: string): boolean {
    // Remove markdown bold markers for checking
    const cleanLine = line.replace(/\*\*/g, '').trim();
    
    // Has bold markers
    if (line.startsWith('**') && line.endsWith('**')) return true;
    
    // Short line that's not a bullet (likely a heading)
    if (cleanLine.length < 60 && !this.isBulletPoint(line) && cleanLine.length > 3) {
      // Check if it ends with a colon or has title case
      if (cleanLine.endsWith(':')) return true;
      if (this.isTitleCase(cleanLine)) return true;
    }
    
    return false;
  }
  
  /**
   * Check if line has title case
   */
  private isTitleCase(line: string): boolean {
    const words = line.split(' ');
    if (words.length < 2) return false;
    
    const capitalizedWords = words.filter(w => w.length > 3 && w[0] === w[0].toUpperCase());
    return capitalizedWords.length / words.length > 0.5;
  }
  
  /**
   * Check if line is a bullet point
   */
  private isBulletPoint(line: string): boolean {
    return /^[-•*]\s/.test(line) || /^\d+[.)]\s/.test(line);
  }
  
  /**
   * Clean heading text
   */
  private cleanHeading(line: string): string {
    return line.replace(/\*\*/g, '').replace(/:$/, '').trim();
  }
  
  /**
   * Clean bullet point text
   */
  private cleanBulletPoint(line: string): string {
    return line.replace(/^[-•*]\s*/, '').replace(/^\d+[.)]\s*/, '').trim();
  }
  
  /**
   * Convert extracted document to video script format
   * This creates a script that can be fed to the existing script parser
   */
  formatAsVideoScript(doc: ExtractedDocument, targetDurationMinutes: number): string {
    const sections = doc.sections;
    const totalSections = sections.length;
    
    // Calculate time per section
    const secondsPerSection = Math.floor((targetDurationMinutes * 60) / Math.max(totalSections, 1));
    
    let script = `# ${doc.title}\n\n`;
    
    // Add hook/intro
    script += `[SCENE: HOOK - ${Math.min(secondsPerSection, 10)}s]\n`;
    script += `Today we're diving deep into ${doc.title.toLowerCase()}.\n\n`;
    
    // Add each section as a scene
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sceneType = this.determineSceneType(section.heading, i, sections.length);
      const duration = Math.min(secondsPerSection, 30); // Cap at 30s per scene
      
      script += `[SCENE: ${sceneType} - ${duration}s]\n`;
      script += `**${section.heading}**\n`;
      
      if (section.content) {
        script += `${section.content}\n`;
      }
      
      if (section.bulletPoints.length > 0) {
        // Include top 3 bullet points in narration
        const topBullets = section.bulletPoints.slice(0, 3);
        script += topBullets.map(bp => `- ${bp}`).join('\n');
        script += '\n';
      }
      
      script += '\n';
    }
    
    // Add CTA/outro
    script += `[SCENE: CTA - 10s]\n`;
    script += `For more information and personalized guidance, visit Pine Hill Farm. Your journey to better health starts here.\n`;
    
    console.log(`[DocumentUpload] Generated ${script.length} character script for ${targetDurationMinutes} minute video`);
    
    return script;
  }
  
  /**
   * Determine scene type based on section heading
   */
  private determineSceneType(heading: string, index: number, total: number): string {
    const lower = heading.toLowerCase();
    
    if (index === 0) return 'INTRO';
    if (index === total - 1) return 'CONCLUSION';
    
    if (lower.includes('problem') || lower.includes('issue') || lower.includes('impact')) return 'PROBLEM';
    if (lower.includes('solution') || lower.includes('strateg') || lower.includes('tip')) return 'SOLUTION';
    if (lower.includes('benefit') || lower.includes('advantage')) return 'BENEFIT';
    if (lower.includes('how') || lower.includes('what') || lower.includes('why')) return 'EXPLANATION';
    if (lower.includes('action') || lower.includes('step') || lower.includes('plan')) return 'ACTION';
    
    return 'CONTENT';
  }
}

export const documentUploadService = new DocumentUploadService();
```

---

## Step 3: Create Quick Create API Routes

Create `server/routes/quick-create-routes.ts`:

```typescript
// server/routes/quick-create-routes.ts

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { documentUploadService } from '../services/document-upload-service';
import { universalVideoService } from '../services/universal-video-service';
import { isAuthenticated } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/pdf',
      'text/plain',
    ];
    const allowedExtensions = ['.docx', '.pdf', '.txt'];
    
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload .docx, .pdf, or .txt files.'));
    }
  }
});

/**
 * POST /api/quick-create/upload
 * Upload document and extract content preview
 */
router.post('/upload', isAuthenticated, upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    console.log(`[QuickCreate] File uploaded: ${req.file.originalname}`);
    
    // Extract document content
    const extracted = await documentUploadService.extractContent(
      req.file.path,
      req.file.mimetype
    );
    
    res.json({
      success: true,
      document: {
        filename: req.file.originalname,
        filepath: req.file.path,
        title: extracted.title,
        sectionCount: extracted.sections.length,
        estimatedDuration: extracted.estimatedReadingTimeMinutes,
        sections: extracted.sections.map(s => ({
          heading: s.heading,
          contentPreview: s.content.substring(0, 100) + (s.content.length > 100 ? '...' : ''),
          bulletCount: s.bulletPoints.length,
        })),
      },
    });
    
  } catch (error: any) {
    console.error('[QuickCreate] Upload error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/quick-create/generate
 * Generate video from uploaded document
 */
router.post('/generate', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const {
      filepath,
      filename,
      targetDuration = 4,
      visualStyle = 'educational',
      platform = 'youtube',
      voiceId,
      voiceName,
      brandSettings = {
        includeIntroLogo: true,
        includeWatermark: true,
        includeCTAOutro: true,
      },
    } = req.body;
    
    if (!filepath) {
      return res.status(400).json({ success: false, error: 'No document filepath provided' });
    }
    
    console.log(`[QuickCreate] Generating ${targetDuration} minute video from ${filename}`);
    
    // Step 1: Extract document content
    const extracted = await documentUploadService.extractContent(filepath, '');
    
    // Step 2: Convert to video script format
    const script = documentUploadService.formatAsVideoScript(extracted, targetDuration);
    
    console.log(`[QuickCreate] Generated script with ${script.length} characters`);
    
    // Step 3: Create project using existing script-based workflow
    // This leverages all existing infrastructure
    const project = await universalVideoService.createProjectFromScript({
      title: extracted.title || filename.replace(/\.[^.]+$/, ''),
      script,
      platform,
      visualStyle,
      brandSettings,
      voiceId,
      voiceName,
      qualityTier: 'standard', // T2V only, no I2V
      musicEnabled: true,
      musicMood: 'educational',
    }, userId);
    
    console.log(`[QuickCreate] Created project ${project.id} with ${project.scenes.length} scenes`);
    
    // Step 4: Automatically trigger asset generation
    // This generates all videos, voiceovers, and music
    const generationResult = await universalVideoService.generateProjectAssets(
      project.id,
      userId,
      true // musicEnabled
    );
    
    console.log(`[QuickCreate] Asset generation started for project ${project.id}`);
    
    res.json({
      success: true,
      project: {
        id: project.id,
        title: project.title,
        sceneCount: project.scenes.length,
        estimatedDuration: project.totalDuration,
        status: 'generating',
      },
      message: 'Video generation started. You will be notified when ready.',
    });
    
  } catch (error: any) {
    console.error('[QuickCreate] Generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/quick-create/status/:projectId
 * Check generation status
 */
router.get('/status/:projectId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    const { projectId } = req.params;
    
    // Get project status from existing infrastructure
    const project = await universalVideoService.getProject(projectId, userId);
    
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    // Calculate progress
    const progress = project.progress || {};
    const steps = ['script', 'voiceover', 'images', 'videos', 'music', 'assembly', 'rendering'];
    const completedSteps = steps.filter(step => progress[step] === 'complete').length;
    const progressPercent = Math.round((completedSteps / steps.length) * 100);
    
    res.json({
      success: true,
      status: project.status,
      progress: progressPercent,
      currentStep: steps.find(step => progress[step] === 'in-progress') || 'pending',
      downloadUrl: project.status === 'complete' ? project.finalVideoUrl : null,
      scenes: project.scenes.map((s: any) => ({
        id: s.id,
        type: s.type,
        hasVideo: !!s.assets?.videoUrl,
        hasVoiceover: !!s.assets?.voiceoverUrl,
      })),
    });
    
  } catch (error: any) {
    console.error('[QuickCreate] Status check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
```

---

## Step 4: Register Routes

Update `server/routes/index.ts` or wherever routes are registered:

```typescript
import quickCreateRoutes from './quick-create-routes';

// Add to router registration
app.use('/api/quick-create', quickCreateRoutes);
```

---

## Step 5: Create Quick Create UI Component

Create `client/src/components/quick-create-tab.tsx`:

```tsx
// client/src/components/quick-create-tab.tsx

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQuery } from '@tanstack/react-query';
import { 
  Upload, FileText, Clock, Palette, Monitor, 
  CheckCircle, Loader2, Download, Play, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

interface DocumentPreview {
  filename: string;
  filepath: string;
  title: string;
  sectionCount: number;
  estimatedDuration: number;
  sections: { heading: string; contentPreview: string; bulletCount: number }[];
}

interface GenerationStatus {
  status: string;
  progress: number;
  currentStep: string;
  downloadUrl: string | null;
}

export function QuickCreateTab() {
  const { toast } = useToast();
  
  // State
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
          filepath: document.filepath,
          filename: document.filename,
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
  const statusQuery = useQuery({
    queryKey: ['quick-create-status', projectId],
    queryFn: async (): Promise<GenerationStatus> => {
      const response = await fetch(`/api/quick-create/status/${projectId}`, {
        credentials: 'include',
      });
      return response.json();
    },
    enabled: !!projectId,
    refetchInterval: (data) => {
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
  
  // Render based on state
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
                  {document.sectionCount} sections • ~{document.estimatedDuration} min read time
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
  const stepLabels: Record<string, string> = {
    script: 'Parsing script',
    voiceover: 'Generating voiceover',
    images: 'Creating images',
    videos: 'Generating videos',
    music: 'Adding music',
    assembly: 'Assembling scenes',
    rendering: 'Final rendering',
  };
  
  const isComplete = status.status === 'complete';
  const isFailed = status.status === 'failed';
  
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
          ) : (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              Creating Your Video
            </>
          )}
        </CardTitle>
        {!isComplete && !isFailed && (
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
          {isComplete ? 'Create Another Video' : 'Cancel'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default QuickCreateTab;
```

---

## Step 6: Add Tab to Universal Video Producer

Update `client/src/components/universal-video-producer.tsx`:

Find the Tabs component and add the new tab:

```tsx
import QuickCreateTab from './quick-create-tab';

// In the JSX, find the TabsList and add:
<TabsList className="grid w-full grid-cols-3">
  <TabsTrigger value="product" data-testid="tab-product">
    <Package className="w-4 h-4 mr-2" />
    Product Video
  </TabsTrigger>
  <TabsTrigger value="script" data-testid="tab-script">
    <FileText className="w-4 h-4 mr-2" />
    Script-Based
  </TabsTrigger>
  <TabsTrigger value="quick-create" data-testid="tab-quick-create">
    <Upload className="w-4 h-4 mr-2" />
    Quick Create
  </TabsTrigger>
</TabsList>

// Add the TabsContent:
<TabsContent value="quick-create" className="mt-4">
  <QuickCreateTab />
</TabsContent>
```

---

## Step 7: Install Frontend Dependencies

If not already installed:

```bash
npm install react-dropzone
```

---

## Verification Checklist

After implementation, verify:

- [ ] Can upload .docx file
- [ ] Can upload .pdf file
- [ ] Can upload .txt file
- [ ] Document content is extracted and previewed
- [ ] Section count and estimated duration shown
- [ ] Can select target duration (2, 4, 6, 8 minutes)
- [ ] Can select visual style
- [ ] Can select platform
- [ ] Brand checkboxes work
- [ ] "Create Video" button triggers generation
- [ ] Progress polling shows status updates
- [ ] Download link appears when complete
- [ ] Video contains logo intro (if selected)
- [ ] Video contains watermark (if selected)
- [ ] Video contains end card (if selected)

---

## Troubleshooting

### "mammoth is not defined"
```bash
npm install mammoth
```

### "pdf-parse is not defined"
```bash
npm install pdf-parse
```

### Upload fails with "Invalid file type"
Check that the file extension matches (.docx, .pdf, .txt) and the MIME type is correct.

### Generation hangs
Check the existing `universalVideoService.generateProjectAssets` function - this uses your existing pipeline. Debug from there.

### No brand elements appear
Verify that `brandSettings` is being passed through to the render pipeline and that `brand-injection-service.ts` is being called.

---

## Next Steps

Once Quick Create is working:

1. **Refine the script generation** - Improve how document sections map to video scenes
2. **Add voice selection** - Let users choose from ElevenLabs voices
3. **Add music style selection** - Match music mood to content type
4. **Implement render queue** - Handle multiple simultaneous generations
5. **Add email notification** - Notify user when video is ready

After Quick Create is stable, proceed to **Phase 19B: Canvas Storyboard** for the advanced editing interface.
