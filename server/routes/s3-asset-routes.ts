import { Router, Request, Response } from 'express';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { isAuthenticated, requireRole } from '../auth';

const router = Router();

const BUCKET = process.env.REMOTION_S3_BUCKET || 'remotionlambda-useast2-1vc2l6a56o';
const REGION = process.env.REMOTION_AWS_REGION || 'us-east-2';

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.REMOTION_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.REMOTION_AWS_SECRET_ACCESS_KEY || '',
  },
});

const ASSET_CATEGORIES = {
  'sfx': { prefix: 'audio/sfx/', label: 'Sound Effects', accept: '.mp3,.wav,.ogg' },
  'music': { prefix: 'audio/music/', label: 'Background Music', accept: '.mp3,.wav,.ogg' },
  'logos': { prefix: 'brand/logos/', label: 'Logos', accept: '.png,.jpg,.jpeg,.svg,.webp' },
  'badges': { prefix: 'brand/badges/', label: 'Awards & Badges', accept: '.png,.jpg,.jpeg,.svg,.webp' },
  'overlays': { prefix: 'brand/overlays/', label: 'Overlays & Watermarks', accept: '.png,.svg,.webp' },
  'end-cards': { prefix: 'brand/end-cards/', label: 'End Card Assets', accept: '.png,.jpg,.jpeg,.webp' },
  'fonts': { prefix: 'brand/fonts/', label: 'Custom Fonts', accept: '.ttf,.otf,.woff,.woff2' },
} as const;

type CategoryKey = keyof typeof ASSET_CATEGORIES;

router.use(isAuthenticated, requireRole(['admin']));

router.get('/categories', (_req: Request, res: Response) => {
  res.json(ASSET_CATEGORIES);
});

router.get('/list', async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;
    if (!category || !(category in ASSET_CATEGORIES)) {
      return res.status(400).json({ error: 'Invalid or missing category' });
    }

    const { prefix } = ASSET_CATEGORIES[category as CategoryKey];

    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    });

    const result = await s3.send(command);
    const files = (result.Contents || [])
      .filter(obj => obj.Key && obj.Key !== prefix)
      .map(obj => {
        const key = obj.Key!;
        const name = key.split('/').pop() || key;
        const ext = name.split('.').pop()?.toLowerCase() || '';
        const contentTypeMap: Record<string, string> = {
          mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
          png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
          svg: 'image/svg+xml', webp: 'image/webp',
          ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2',
        };
        return {
          key,
          name,
          size: obj.Size || 0,
          lastModified: obj.LastModified?.toISOString() || null,
          url: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`,
          contentType: contentTypeMap[ext] || 'application/octet-stream',
        };
      });

    res.json(files);
  } catch (error: any) {
    console.error('[S3Assets] List error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/upload-url', async (req: Request, res: Response) => {
  try {
    const { category, fileName, contentType } = req.body;

    if (!category || !(category in ASSET_CATEGORIES)) {
      return res.status(400).json({ error: 'Invalid or missing category' });
    }
    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    const { prefix } = ASSET_CATEGORIES[category as CategoryKey];
    const key = `${prefix}${fileName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    const publicUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;

    res.json({ uploadUrl, key, publicUrl });
  } catch (error: any) {
    console.error('[S3Assets] Upload URL error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/preview-url', async (req: Request, res: Response) => {
  try {
    const key = req.query.key as string;
    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    const allowedPrefixes = Object.values(ASSET_CATEGORIES).map(c => c.prefix);
    const isAllowed = allowedPrefixes.some(p => key.startsWith(p));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Key is not within an allowed prefix' });
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (error: any) {
    console.error('[S3Assets] Preview URL error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/delete', async (req: Request, res: Response) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'key is required' });
    }

    const allowedPrefixes = Object.values(ASSET_CATEGORIES).map(c => c.prefix);
    const isAllowed = allowedPrefixes.some(p => key.startsWith(p));
    if (!isAllowed) {
      return res.status(403).json({ error: 'Key is not within an allowed prefix' });
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    await s3.send(command);
    res.json({ success: true, key });
  } catch (error: any) {
    console.error('[S3Assets] Delete error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { category } = req.body;

    if (!category || !(category in ASSET_CATEGORIES)) {
      return res.status(400).json({ error: 'Invalid or missing category' });
    }

    const { prefix } = ASSET_CATEGORIES[category as CategoryKey];

    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    });

    const result = await s3.send(command);
    const objects = (result.Contents || []).filter(obj => obj.Key && obj.Key !== prefix);

    const files = await Promise.all(objects.map(async (obj) => {
      const name = obj.Key!.split('/').pop() || obj.Key!;
      const size = obj.Size || 0;
      const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${obj.Key!}`;

      if (size < 100) return { name, size, valid: false, reason: 'Too small' };

      const ext = name.split('.').pop()?.toLowerCase();
      if (ext === 'mp3' || ext === 'wav' || ext === 'ogg') {
        try {
          const resp = await fetch(url, { headers: { 'Range': 'bytes=0-511' } });
          if (!resp.ok && resp.status !== 206) return { name, size, valid: false, reason: 'Not accessible' };
          const buffer = await resp.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let zeroCount = 0;
          for (let i = 4; i < Math.min(bytes.length, 200); i++) {
            if (bytes[i] === 0) zeroCount++;
          }
          const zeroRatio = zeroCount / Math.min(bytes.length - 4, 196);
          if (zeroRatio >= 0.9) return { name, size, valid: false, reason: 'Placeholder (silent)' };
        } catch {
          return { name, size, valid: false, reason: 'Validation failed' };
        }
      }

      return { name, size, valid: true, reason: 'OK' };
    }));

    res.json({
      category,
      fileCount: files.length,
      files,
    });
  } catch (error: any) {
    console.error('[S3Assets] Validate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
