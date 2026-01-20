import { db } from '../db';
import { homerFiles, homerFileMessages } from '@shared/schema';
import { eq, or, desc, inArray } from 'drizzle-orm';
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
  
  async uploadFile(input: UploadFileInput): Promise<HomerFile> {
    const fileId = randomUUID();
    const ext = path.extname(input.file.originalname);
    const storagePath = `homer/${fileId}${ext}`;
    
    const fullPath = path.join(this.uploadDir, `${fileId}${ext}`);
    fs.writeFileSync(fullPath, input.file.buffer);
    
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
  
  async getFile(fileId: string): Promise<HomerFile | null> {
    const [file] = await db.select()
      .from(homerFiles)
      .where(eq(homerFiles.fileId, fileId));
    
    return file as HomerFile || null;
  }
  
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
  
  async updateDescription(fileId: string, description: string): Promise<void> {
    await db.update(homerFiles)
      .set({ description, updatedAt: new Date() })
      .where(eq(homerFiles.fileId, fileId));
  }
  
  async updateExtractedText(fileId: string, text: string): Promise<void> {
    await db.update(homerFiles)
      .set({ extractedText: text, updatedAt: new Date() })
      .where(eq(homerFiles.fileId, fileId));
  }
  
  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file || file.uploadedBy !== userId) {
      return false;
    }
    
    const ext = path.extname(file.originalName);
    const fullPath = path.join(this.uploadDir, `${fileId}${ext}`);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    
    await db.delete(homerFileMessages)
      .where(eq(homerFileMessages.fileId, fileId));
    await db.delete(homerFiles)
      .where(eq(homerFiles.fileId, fileId));
    
    console.log(`[Homer Files] Deleted: ${fileId}`);
    return true;
  }
  
  getFileUrl(fileId: string): string {
    return `/api/homer/files/${fileId}`;
  }
  
  isImage(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }
  
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
