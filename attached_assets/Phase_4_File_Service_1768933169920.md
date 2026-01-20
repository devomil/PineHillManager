# Phase 4: File Service

## Task
Create a service for managing Homer's file uploads and sharing.

## Instructions
Create a new file: `server/services/homer-file-service.ts`

---

## File: `server/services/homer-file-service.ts`

```typescript
import { db } from '../db';
import { homerFiles, homerFileMessages } from '@shared/schema';
import { eq, and, or, desc, inArray } from 'drizzle-orm';
import { storage } from '../storage';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs';

export interface HomerFile {
  id: number;
  fileId: string;
  uploadedBy: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  description?: string;
  tags: string[];
  isShared: boolean;
  createdAt: Date;
}

export interface UploadFileInput {
  userId: string;
  file: {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
  };
  description?: string;
  tags?: string[];
  isShared?: boolean;
  conversationId?: string;
  messageId?: string;
}

class HomerFileService {
  private uploadDir: string;
  
  constructor() {
    this.uploadDir = process.env.HOMER_FILES_DIR || './uploads/homer';
    this.ensureUploadDir();
  }
  
  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      console.log('[Homer Files] Created upload directory:', this.uploadDir);
    }
  }
  
  /**
   * Upload a file
   */
  async uploadFile(input: UploadFileInput): Promise<HomerFile> {
    const fileId = randomUUID();
    const ext = path.extname(input.file.originalname);
    const storagePath = `homer/${fileId}${ext}`;
    
    // Save to local storage
    const fullPath = path.join(this.uploadDir, `${fileId}${ext}`);
    fs.writeFileSync(fullPath, input.file.buffer);
    
    // Create database record
    const [fileRecord] = await db.insert(homerFiles)
      .values({
        fileId,
        uploadedBy: input.userId,
        originalName: input.file.originalname,
        mimeType: input.file.mimetype,
        fileSize: input.file.size,
        storagePath,
        storageType: 'local',
        description: input.description,
        tags: input.tags || [],
        isShared: input.isShared || false,
      })
      .returning();
    
    // Link to conversation if provided
    if (input.conversationId && input.messageId) {
      await db.insert(homerFileMessages).values({
        fileId,
        conversationId: input.conversationId,
        messageId: input.messageId,
        direction: 'inbound',
      });
    }
    
    console.log(`[Homer Files] Uploaded: ${input.file.originalname} (${fileId})`);
    return fileRecord as HomerFile;
  }
  
  /**
   * Get a file by ID
   */
  async getFile(fileId: string): Promise<HomerFile | null> {
    const [file] = await db.select()
      .from(homerFiles)
      .where(eq(homerFiles.fileId, fileId));
    
    return file as HomerFile || null;
  }
  
  /**
   * Get file buffer for reading/sending
   */
  async getFileBuffer(fileId: string): Promise<Buffer | null> {
    const file = await this.getFile(fileId);
    if (!file) return null;
    
    const ext = path.extname(file.originalName);
    const fullPath = path.join(this.uploadDir, `${fileId}${ext}`);
    
    if (!fs.existsSync(fullPath)) {
      console.error(`[Homer Files] File not found on disk: ${fullPath}`);
      return null;
    }
    
    return fs.readFileSync(fullPath);
  }
  
  /**
   * Get files accessible to a user
   */
  async getFilesForUser(userId: string, limit = 20): Promise<HomerFile[]> {
    const files = await db.select()
      .from(homerFiles)
      .where(
        or(
          eq(homerFiles.uploadedBy, userId),
          eq(homerFiles.isShared, true)
        )
      )
      .orderBy(desc(homerFiles.createdAt))
      .limit(limit);
    
    return files as HomerFile[];
  }
  
  /**
   * Get files from a specific conversation
   */
  async getConversationFiles(conversationId: string): Promise<HomerFile[]> {
    const fileLinks = await db.select()
      .from(homerFileMessages)
      .where(eq(homerFileMessages.conversationId, conversationId));
    
    if (fileLinks.length === 0) return [];
    
    const fileIds = fileLinks.map(l => l.fileId);
    const files = await db.select()
      .from(homerFiles)
      .where(inArray(homerFiles.fileId, fileIds));
    
    return files as HomerFile[];
  }
  
  /**
   * Share a file with all Homer users
   */
  async shareFile(fileId: string, userId: string): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file || file.uploadedBy !== userId) {
      return false;
    }
    
    await db.update(homerFiles)
      .set({ isShared: true, updatedAt: new Date() })
      .where(eq(homerFiles.fileId, fileId));
    
    console.log(`[Homer Files] Shared file: ${fileId}`);
    return true;
  }
  
  /**
   * Update file description (can be AI-generated)
   */
  async updateDescription(fileId: string, description: string): Promise<void> {
    await db.update(homerFiles)
      .set({ description, updatedAt: new Date() })
      .where(eq(homerFiles.fileId, fileId));
  }
  
  /**
   * Update extracted text (for PDFs/docs)
   */
  async updateExtractedText(fileId: string, text: string): Promise<void> {
    await db.update(homerFiles)
      .set({ extractedText: text, updatedAt: new Date() })
      .where(eq(homerFiles.fileId, fileId));
  }
  
  /**
   * Delete a file
   */
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file || file.uploadedBy !== userId) {
      return false;
    }
    
    // Delete from disk
    const ext = path.extname(file.originalName);
    const fullPath = path.join(this.uploadDir, `${fileId}${ext}`);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    
    // Delete from database
    await db.delete(homerFileMessages)
      .where(eq(homerFileMessages.fileId, fileId));
    await db.delete(homerFiles)
      .where(eq(homerFiles.fileId, fileId));
    
    console.log(`[Homer Files] Deleted: ${fileId}`);
    return true;
  }
  
  /**
   * Get file URL for serving
   */
  getFileUrl(fileId: string): string {
    return `/api/homer/files/${fileId}`;
  }
  
  /**
   * Check if file is an image
   */
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }
  
  /**
   * Check if file is a document
   */
  isDocument(mimeType: string): boolean {
    const docTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument',
      'text/plain',
      'text/csv',
    ];
    return docTypes.some(t => mimeType.includes(t));
  }
}

export const homerFileService = new HomerFileService();
```

---

## Create Upload Directory

Add to `.gitignore`:
```
uploads/homer/
```

---

## Verification
1. No TypeScript errors
2. File created at `server/services/homer-file-service.ts`
3. Upload directory is created on service initialization

## Next
Proceed to Phase 5.
