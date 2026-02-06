import { db } from './db';
import { universalVideoProjects } from '../shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { universalVideoService } from './services/universal-video-service';
import { sceneAnalysisService } from './services/scene-analysis-service';
import {
  saveProjectToDb,
  dbRowToVideoProject,
  getProjectFromDb,
  type VideoProjectWithMeta,
} from './services/video-project-db';

const POLL_INTERVAL_MS = 5000;
const STALL_THRESHOLD_MS = 5 * 60 * 1000;
const WORKER_ID = `worker_${process.pid}_${Date.now()}`;

let isProcessing = false;
let currentProjectId: string | null = null;

function log(message: string, ...args: any[]) {
  console.log(`[VideoWorker ${WORKER_ID}] ${message}`, ...args);
}

function logError(message: string, ...args: any[]) {
  console.error(`[VideoWorker ${WORKER_ID}] ${message}`, ...args);
}

async function recoverStalledProjects() {
  try {
    const stallCutoff = new Date(Date.now() - STALL_THRESHOLD_MS);

    const stalledProjects = await db.select({
      projectId: universalVideoProjects.projectId,
      status: universalVideoProjects.status,
      updatedAt: universalVideoProjects.updatedAt,
    })
    .from(universalVideoProjects)
    .where(
      and(
        eq(universalVideoProjects.status, 'generating'),
        lt(universalVideoProjects.updatedAt, stallCutoff)
      )
    );

    if (stalledProjects.length > 0) {
      log(`Found ${stalledProjects.length} stalled project(s), requeuing...`);
      for (const project of stalledProjects) {
        await db.update(universalVideoProjects)
          .set({
            status: 'queued',
            updatedAt: new Date(),
          })
          .where(eq(universalVideoProjects.projectId, project.projectId));
        log(`Requeued stalled project: ${project.projectId} (last update: ${project.updatedAt})`);
      }
    }
  } catch (err: any) {
    logError('Error recovering stalled projects:', err.message);
  }
}

async function processProject(projectData: VideoProjectWithMeta) {
  const projectId = projectData.id;
  currentProjectId = projectId;

  log(`Processing project: ${projectId} (${projectData.title})`);

  try {
    await db.update(universalVideoProjects)
      .set({
        status: 'generating',
        updatedAt: new Date(),
      })
      .where(eq(universalVideoProjects.projectId, projectId));

    universalVideoService.clearNotifications();

    const onProgress = async (p: any) => {
      try {
        await saveProjectToDb(p, projectData.ownerId);
      } catch (err: any) {
        log(`Progress save warning for ${projectId}: ${err.message}`);
      }
    };

    const skipMusic = projectData.assets?.music?.url ? true : false;

    const updatedProject = await universalVideoService.generateProjectAssets(
      projectData,
      { skipMusic, onProgress }
    );

    await saveProjectToDb(updatedProject, projectData.ownerId);

    if (sceneAnalysisService.isAvailable()) {
      log(`Triggering scene analysis for ${projectId}`);
      try {
        const freshProject = await getProjectFromDb(projectId);
        if (freshProject && freshProject.scenes) {
          for (let i = 0; i < freshProject.scenes.length; i++) {
            const scene = freshProject.scenes[i] as any;
            const imageUrl = scene.assets?.imageUrl || scene.background?.mediaUrl;
            if (imageUrl) {
              try {
                const analysis = await sceneAnalysisService.analyzeScene(imageUrl, scene);
                if (analysis) {
                  (freshProject.scenes[i] as any).analysis = analysis;
                }
              } catch (analysisErr: any) {
                log(`Scene analysis failed for scene ${i}: ${analysisErr.message}`);
              }
            }
          }
          await saveProjectToDb(freshProject, projectData.ownerId);
        }
      } catch (analysisErr: any) {
        log(`Scene analysis error for ${projectId}: ${analysisErr.message}`);
      }
    }

    log(`Completed project: ${projectId}`);
  } catch (error: any) {
    logError(`Error processing project ${projectId}:`, error.message);

    try {
      const failedProject = await getProjectFromDb(projectId);
      if (failedProject) {
        failedProject.status = 'error';
        if (failedProject.progress) {
          failedProject.progress.errors = failedProject.progress.errors || [];
          failedProject.progress.errors.push(`Worker error: ${error.message}`);
        }
        await saveProjectToDb(failedProject, projectData.ownerId);
      }
    } catch (dbErr: any) {
      logError(`Failed to save error status for ${projectId}:`, dbErr.message);
    }
  } finally {
    currentProjectId = null;
  }
}

async function pollForJobs() {
  if (isProcessing) return;

  try {
    isProcessing = true;

    const jobs = await db.select()
      .from(universalVideoProjects)
      .where(eq(universalVideoProjects.status, 'queued'))
      .orderBy(universalVideoProjects.createdAt)
      .limit(1);

    if (jobs.length === 0) return;

    const job = jobs[0];
    const projectData = dbRowToVideoProject(job);
    await processProject(projectData);
  } catch (error: any) {
    logError('Poll error:', error.message);
  } finally {
    isProcessing = false;
  }
}

async function startWorker() {
  log('Starting dedicated video worker process...');
  log(`Poll interval: ${POLL_INTERVAL_MS}ms, Stall threshold: ${STALL_THRESHOLD_MS}ms`);

  await recoverStalledProjects();

  setInterval(pollForJobs, POLL_INTERVAL_MS);
  log('Job polling started - waiting for queued projects...');

  setInterval(recoverStalledProjects, 60000);
  log('Stall recovery check scheduled (every 60s)');

  if (process.send) {
    process.send('ready');
  }
}

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down...');
  if (currentProjectId) {
    log(`Warning: Project ${currentProjectId} was in progress`);
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Received SIGTERM, shutting down...');
  if (currentProjectId) {
    log(`Warning: Project ${currentProjectId} was in progress`);
  }
  process.exit(0);
});

startWorker().catch((err) => {
  logError('Failed to start worker:', err);
  process.exit(1);
});
