# Phase 9: File Routes

## Task
Add API routes for file upload and management.

## Instructions
Add these routes to `server/routes/homer-routes.ts`

---

## Step 1: Add Imports

**Add these imports at the top of the file:**

```typescript
import { homerFileService } from '../services/homer-file-service';
import multer from 'multer';
```

---

## Step 2: Configure Multer

**Add this configuration after the imports, before the routes:**

```typescript
// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});
```

---

## Step 3: Add File Routes

**Add these routes BEFORE the `export default router;` line:**

```typescript
// ============================================
// FILE ENDPOINTS
// ============================================

/**
 * Upload a file
 */
router.post('/files/upload', isAuthenticated, requireRole(['admin', 'manager']), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { description, tags, isShared, conversationId, messageId } = req.body;

    const file = await homerFileService.uploadFile({
      userId,
      file: {
        buffer: req.file.buffer,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
      description,
      tags: tags ? JSON.parse(tags) : [],
      isShared: isShared === 'true',
      conversationId,
      messageId,
    });

    res.json({
      success: true,
      file: {
        fileId: file.fileId,
        originalName: file.originalName,
        mimeType: file.mimeType,
        fileSize: file.fileSize,
        url: homerFileService.getFileUrl(file.fileId),
      },
    });

  } catch (error: any) {
    console.error('[Homer Routes] Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

/**
 * Get user's files
 */
router.get('/files', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const files = await homerFileService.getFilesForUser(userId, limit);

    res.json({
      success: true,
      files: files.map(f => ({
        ...f,
        url: homerFileService.getFileUrl(f.fileId),
      })),
    });

  } catch (error: any) {
    console.error('[Homer Routes] Get files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

/**
 * Get a specific file (download/view)
 */
router.get('/files/:fileId', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const file = await homerFileService.getFile(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access
    if (file.uploadedBy !== userId && !file.isShared) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const buffer = await homerFileService.getFileBuffer(fileId);
    if (!buffer) {
      return res.status(404).json({ error: 'File data not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);

  } catch (error: any) {
    console.error('[Homer Routes] Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

/**
 * Get file metadata only
 */
router.get('/files/:fileId/info', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const file = await homerFileService.getFile(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.uploadedBy !== userId && !file.isShared) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      file: {
        ...file,
        url: homerFileService.getFileUrl(file.fileId),
      },
    });

  } catch (error: any) {
    console.error('[Homer Routes] Get file info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

/**
 * Share a file
 */
router.post('/files/:fileId/share', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const success = await homerFileService.shareFile(fileId, userId);
    if (!success) {
      return res.status(403).json({ error: 'Cannot share this file' });
    }

    res.json({
      success: true,
      message: 'File shared with all Homer users',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Share file error:', error);
    res.status(500).json({ error: 'Failed to share file' });
  }
});

/**
 * Delete a file
 */
router.delete('/files/:fileId', isAuthenticated, requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const success = await homerFileService.deleteFile(fileId, userId);
    if (!success) {
      return res.status(403).json({ error: 'Cannot delete this file' });
    }

    res.json({
      success: true,
      message: 'File deleted',
    });

  } catch (error: any) {
    console.error('[Homer Routes] Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});
```

---

## Step 4: Install Multer (if not present)

Run:
```bash
npm install multer @types/multer
```

---

## API Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/homer/files/upload` | Upload a file |
| GET | `/api/homer/files` | List user's files |
| GET | `/api/homer/files/:fileId` | Download/view file |
| GET | `/api/homer/files/:fileId/info` | Get file metadata |
| POST | `/api/homer/files/:fileId/share` | Share with team |
| DELETE | `/api/homer/files/:fileId` | Delete file |

---

## Verification
1. No TypeScript errors
2. Multer installed and configured
3. All 6 file routes added
4. File type validation in place

## Next
Proceed to Phase 10.
