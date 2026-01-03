import { db } from '../db';
import { assetLibrary } from '@shared/schema';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';

interface SceneForLibrary {
  id: string;
  type?: string;
  visualDirection?: string;
  sanitizedPrompt?: string;
  videoUrl?: string;
  imageUrl?: string;
  provider?: string;
  duration?: number;
  analysisResult?: {
    overallScore?: number;
    contentMatchDetails?: {
      presentElements?: string[];
    };
  };
}

interface ProjectForLibrary {
  projectId: string;
}

export async function saveToLibrary(
  scene: SceneForLibrary, 
  project: ProjectForLibrary,
  userId?: string
): Promise<number | null> {
  try {
    if (!scene.analysisResult || (scene.analysisResult.overallScore ?? 0) < 70) {
      console.log(`[AssetLibrary] Skipping scene ${scene.id} - quality score below 70`);
      return null;
    }
    
    const assetUrl = scene.videoUrl || scene.imageUrl;
    if (!assetUrl) {
      console.log(`[AssetLibrary] Skipping scene ${scene.id} - no asset URL`);
      return null;
    }
    
    const existing = await db.select()
      .from(assetLibrary)
      .where(eq(assetLibrary.assetUrl, assetUrl));
    
    if (existing.length > 0) {
      console.log(`[AssetLibrary] Asset already exists in library: ${assetUrl.substring(0, 50)}`);
      return existing[0].id;
    }
    
    const contentType = detectContentType(scene.analysisResult);
    const tags = generateAutoTags(scene);
    
    const [inserted] = await db.insert(assetLibrary).values({
      projectId: project.projectId,
      sceneId: scene.id,
      assetUrl,
      thumbnailUrl: scene.imageUrl || undefined,
      assetType: scene.videoUrl ? 'video' : 'image',
      provider: scene.provider || undefined,
      prompt: scene.sanitizedPrompt || undefined,
      visualDirection: scene.visualDirection || undefined,
      duration: scene.duration?.toString() || undefined,
      qualityScore: scene.analysisResult.overallScore,
      contentType,
      tags,
      createdBy: userId || undefined,
    }).returning();
    
    console.log(`[AssetLibrary] Saved asset to library: ID ${inserted.id}, type: ${inserted.assetType}`);
    return inserted.id;
  } catch (error) {
    console.error('[AssetLibrary] Error saving to library:', error);
    return null;
  }
}

function detectContentType(analysis: any): string {
  const presentElements = analysis?.contentMatchDetails?.presentElements || [];
  
  for (const element of presentElements) {
    const lower = element.toLowerCase();
    if (lower.includes('person') || lower.includes('face') || lower.includes('woman') || lower.includes('man')) {
      return 'person';
    }
  }
  
  for (const element of presentElements) {
    const lower = element.toLowerCase();
    if (lower.includes('product') || lower.includes('bottle') || lower.includes('package')) {
      return 'product';
    }
  }
  
  for (const element of presentElements) {
    const lower = element.toLowerCase();
    if (lower.includes('nature') || lower.includes('plant') || lower.includes('forest') || lower.includes('garden')) {
      return 'nature';
    }
  }
  
  for (const element of presentElements) {
    const lower = element.toLowerCase();
    if (lower.includes('abstract') || lower.includes('pattern') || lower.includes('geometric')) {
      return 'abstract';
    }
  }
  
  return 'other';
}

function generateAutoTags(scene: SceneForLibrary): string[] {
  const tags: string[] = [];
  
  if (scene.type) tags.push(scene.type);
  if (scene.provider) tags.push(scene.provider);
  
  const keywords = ['wellness', 'health', 'nature', 'professional', 'kitchen', 'office', 
                    'product', 'lifestyle', 'relaxation', 'healing', 'holistic', 'organic'];
  
  const direction = scene.visualDirection?.toLowerCase() || '';
  for (const keyword of keywords) {
    if (direction.includes(keyword)) {
      tags.push(keyword);
    }
  }
  
  return Array.from(new Set(tags));
}

export async function getAssetLibrary(options: {
  type?: 'all' | 'image' | 'video';
  favorite?: boolean;
  search?: string;
  contentType?: string;
  provider?: string;
  limit?: number;
  offset?: number;
}) {
  const { type = 'all', favorite, search, contentType, provider, limit = 50, offset = 0 } = options;
  
  let query = db.select().from(assetLibrary);
  
  const conditions = [];
  
  if (type !== 'all') {
    conditions.push(eq(assetLibrary.assetType, type));
  }
  
  if (favorite) {
    conditions.push(eq(assetLibrary.isFavorite, true));
  }
  
  if (contentType) {
    conditions.push(eq(assetLibrary.contentType, contentType));
  }
  
  if (provider) {
    conditions.push(eq(assetLibrary.provider, provider));
  }
  
  if (search) {
    conditions.push(
      or(
        ilike(assetLibrary.visualDirection, `%${search}%`),
        ilike(assetLibrary.prompt, `%${search}%`)
      )
    );
  }
  
  const assets = await db.select()
    .from(assetLibrary)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(assetLibrary.createdAt))
    .limit(limit)
    .offset(offset);
  
  return assets;
}

export async function toggleFavorite(assetId: number): Promise<boolean> {
  const [asset] = await db.select().from(assetLibrary).where(eq(assetLibrary.id, assetId));
  
  if (!asset) return false;
  
  await db.update(assetLibrary)
    .set({ isFavorite: !asset.isFavorite, updatedAt: new Date() })
    .where(eq(assetLibrary.id, assetId));
  
  return !asset.isFavorite;
}

export async function updateTags(assetId: number, tags: string[]): Promise<void> {
  await db.update(assetLibrary)
    .set({ tags, updatedAt: new Date() })
    .where(eq(assetLibrary.id, assetId));
}

export async function recordUsage(assetId: number): Promise<void> {
  await db.update(assetLibrary)
    .set({ 
      useCount: sql`${assetLibrary.useCount} + 1`,
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(assetLibrary.id, assetId));
}

export async function getAssetById(assetId: number) {
  const [asset] = await db.select().from(assetLibrary).where(eq(assetLibrary.id, assetId));
  return asset || null;
}

export async function deleteAsset(assetId: number): Promise<boolean> {
  const result = await db.delete(assetLibrary).where(eq(assetLibrary.id, assetId));
  return true;
}
