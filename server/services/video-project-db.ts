import { db } from '../db';
import { universalVideoProjects } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import type {
  VideoProject,
  Scene,
  GeneratedAssets,
  ProductionProgress,
  OutputFormat,
  BrandSettings,
} from '../../shared/video-types';

export interface VideoQualityReport {
  [key: string]: any;
}

export type VideoProjectWithMeta = VideoProject & {
  ownerId: string;
  renderId?: string;
  bucketName?: string;
  outputUrl?: string | null;
  qualityReport?: VideoQualityReport;
};

export function dbRowToVideoProject(row: any): VideoProjectWithMeta {
  return {
    id: row.projectId,
    type: row.type as 'product' | 'script-based',
    title: row.title,
    description: row.description || '',
    targetAudience: row.targetAudience,
    totalDuration: row.totalDuration,
    fps: row.fps as 30,
    outputFormat: row.outputFormat as OutputFormat,
    brand: row.brand as BrandSettings,
    scenes: row.scenes as Scene[],
    assets: row.assets as GeneratedAssets,
    status: row.status as VideoProject['status'],
    progress: row.progress as ProductionProgress,
    createdAt: row.createdAt?.toISOString() || new Date().toISOString(),
    updatedAt: row.updatedAt?.toISOString() || new Date().toISOString(),
    ownerId: row.ownerId || '',
    renderId: row.renderId || undefined,
    bucketName: row.bucketName || undefined,
    outputUrl: row.outputUrl || undefined,
    history: row.history || undefined,
    qualityReport: row.qualityReport || undefined,
    qualityTier: row.qualityTier || 'premium',
  };
}

export async function saveProjectToDb(
  project: VideoProject & { qualityReport?: VideoQualityReport },
  ownerId: string,
  renderId?: string,
  bucketName?: string,
  outputUrl?: string
) {
  const existingProject = await db.select().from(universalVideoProjects)
    .where(eq(universalVideoProjects.projectId, project.id))
    .limit(1);

  if (existingProject.length > 0) {
    await db.update(universalVideoProjects)
      .set({
        type: project.type,
        title: project.title,
        description: project.description,
        targetAudience: project.targetAudience,
        totalDuration: project.totalDuration,
        fps: project.fps,
        outputFormat: project.outputFormat,
        brand: project.brand,
        scenes: project.scenes,
        assets: project.assets,
        progress: project.progress,
        status: project.status,
        history: project.history || null,
        qualityReport: project.qualityReport ?? existingProject[0].qualityReport,
        renderId: renderId ?? existingProject[0].renderId,
        bucketName: bucketName ?? existingProject[0].bucketName,
        outputUrl: outputUrl ?? existingProject[0].outputUrl,
        updatedAt: new Date(),
      })
      .where(eq(universalVideoProjects.projectId, project.id));
  } else {
    await db.insert(universalVideoProjects).values({
      projectId: project.id,
      ownerId,
      type: project.type,
      title: project.title,
      description: project.description,
      targetAudience: project.targetAudience,
      totalDuration: project.totalDuration,
      fps: project.fps,
      outputFormat: project.outputFormat,
      brand: project.brand,
      scenes: project.scenes,
      assets: project.assets,
      progress: project.progress,
      status: project.status,
      history: project.history || null,
      qualityReport: project.qualityReport || null,
      renderId,
      bucketName,
      outputUrl,
    });
  }
}

export async function getProjectFromDb(projectId: string): Promise<VideoProjectWithMeta | null> {
  const rows = await db.select().from(universalVideoProjects)
    .where(eq(universalVideoProjects.projectId, projectId))
    .limit(1);

  if (rows.length === 0) return null;

  return dbRowToVideoProject(rows[0]);
}
