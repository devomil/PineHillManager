import { db } from './db';
import { universalVideoProjects } from '../shared/schema';
import { eq, and, lt, inArray } from 'drizzle-orm';
import { universalVideoService } from './services/universal-video-service';
import { sceneAnalysisService } from './services/scene-analysis-service';
import { chunkedRenderService } from './services/chunked-render-service';
import type { ChunkedRenderProgress } from './services/chunked-render-service';
import {
  saveProjectToDb,
  dbRowToVideoProject,
  getProjectFromDb,
  type VideoProjectWithMeta,
} from './services/video-project-db';

const POLL_INTERVAL_MS = 5000;
const STALL_THRESHOLD_MS = 5 * 60 * 1000;
const RENDER_STALL_THRESHOLD_MS = 10 * 60 * 1000;
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

    const renderStallCutoff = new Date(Date.now() - RENDER_STALL_THRESHOLD_MS);
    const stalledRenders = await db.select({
      projectId: universalVideoProjects.projectId,
      status: universalVideoProjects.status,
      updatedAt: universalVideoProjects.updatedAt,
    })
    .from(universalVideoProjects)
    .where(
      and(
        eq(universalVideoProjects.status, 'rendering'),
        lt(universalVideoProjects.updatedAt, renderStallCutoff)
      )
    );

    if (stalledRenders.length > 0) {
      log(`Found ${stalledRenders.length} stalled render(s), resetting to render_queued for retry...`);
      for (const project of stalledRenders) {
        await db.update(universalVideoProjects)
          .set({
            status: 'render_queued',
            updatedAt: new Date(),
          })
          .where(eq(universalVideoProjects.projectId, project.projectId));
        log(`Re-queued stalled render: ${project.projectId} (last update: ${project.updatedAt})`);
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

async function processChunkedRender(projectData: VideoProjectWithMeta) {
  const projectId = projectData.id;
  currentProjectId = projectId;

  log(`=== CHUNKED RENDER STARTED (worker process) ===`);
  log(`Project: ${projectId} (${projectData.title})`);

  const progress = projectData.progress as any;
  const inputProps = progress?.renderInputProps;
  const compositionId = progress?.renderCompositionId;
  const startTime = Date.now();

  if (!inputProps || !compositionId) {
    logError(`Missing render input props or compositionId for ${projectId}`);
    try {
      const project = await getProjectFromDb(projectId);
      if (project) {
        project.status = 'error';
        project.progress.steps.rendering = project.progress.steps.rendering || {};
        project.progress.steps.rendering.status = 'error';
        project.progress.steps.rendering.message = 'Missing render configuration. Please re-initiate render.';
        project.progress.errors = project.progress.errors || [];
        project.progress.errors.push('Worker: Missing renderInputProps or renderCompositionId');
        (project.progress as any).renderStatus = {
          phase: 'error',
          totalChunks: (project.progress as any).renderStatus?.totalChunks || 0,
          completedChunks: 0,
          percent: 0,
          message: 'Missing render configuration. Please re-initiate render.',
          startedAt: startTime,
          lastUpdateAt: Date.now(),
          elapsedMs: 0,
          error: 'Missing renderInputProps or renderCompositionId',
        };
        await saveProjectToDb(project, projectData.ownerId);
      }
    } catch (e: any) {
      logError(`Failed to save error for missing props: ${e.message}`);
    }
    currentProjectId = null;
    return;
  }

  let lastKnownTotalChunks = (progress?.renderStatus?.totalChunks as number) || 0;

  try {
    await db.update(universalVideoProjects)
      .set({
        status: 'rendering',
        updatedAt: new Date(),
      })
      .where(eq(universalVideoProjects.projectId, projectId));

    const progressCallback = async (renderProgress: ChunkedRenderProgress) => {
      if (renderProgress.totalChunks > 0) {
        lastKnownTotalChunks = renderProgress.totalChunks;
      }
      log(`Chunked progress: ${renderProgress.phase} - ${renderProgress.overallPercent}% - ${renderProgress.message}`);
      try {
        const currentProject = await getProjectFromDb(projectId);
        if (currentProject) {
          currentProject.progress.steps.rendering.progress = renderProgress.overallPercent;
          currentProject.progress.steps.rendering.message = renderProgress.message;
          currentProject.progress.overallPercent = 85 + Math.round(renderProgress.overallPercent * 0.15);

          const elapsedMs = Date.now() - startTime;
          (currentProject.progress as any).renderStatus = {
            phase: renderProgress.phase,
            totalChunks: renderProgress.totalChunks,
            completedChunks: renderProgress.completedChunks,
            currentChunk: renderProgress.currentChunk,
            percent: renderProgress.overallPercent,
            message: renderProgress.message,
            startedAt: startTime,
            lastUpdateAt: Date.now(),
            elapsedMs,
            error: renderProgress.error || null,
          };

          if (renderProgress.phase === 'error') {
            currentProject.status = 'error';
            currentProject.progress.steps.rendering.status = 'error';
          }
          await saveProjectToDb(currentProject, projectData.ownerId);
        }
      } catch (e) {
        log(`Failed to save render progress update: ${e}`);
      }
    };

    const outputUrl = await chunkedRenderService.renderLongVideo(
      projectId,
      inputProps,
      compositionId,
      progressCallback
    );

    const elapsedMs = Date.now() - startTime;
    log(`=== CHUNKED RENDER COMPLETE ===`);
    log(`Project: ${projectId}, Time: ${(elapsedMs / 1000).toFixed(1)}s, Output: ${outputUrl}`);

    const latestProject = await getProjectFromDb(projectId);
    if (latestProject) {
      latestProject.status = 'complete';
      latestProject.progress.steps.rendering.status = 'complete';
      latestProject.progress.steps.rendering.progress = 100;
      latestProject.progress.steps.rendering.message = 'Video rendering complete!';
      latestProject.progress.overallPercent = 100;
      latestProject.outputUrl = outputUrl;

      (latestProject.progress as any).renderStatus = {
        phase: 'complete',
        totalChunks: lastKnownTotalChunks,
        completedChunks: lastKnownTotalChunks,
        percent: 100,
        message: 'Video rendering complete!',
        startedAt: startTime,
        lastUpdateAt: Date.now(),
        elapsedMs: elapsedMs,
        error: null,
      };

      delete (latestProject.progress as any).renderInputProps;

      await saveProjectToDb(latestProject, projectData.ownerId, 'chunked', 'chunked', outputUrl);
      log(`Final state saved to DB with output URL`);
    } else {
      logError(`CRITICAL: Could not reload project ${projectId} from DB after render`);
    }
  } catch (error: any) {
    const elapsedMs = Date.now() - (progress?.renderStartedAt || Date.now());
    logError(`=== CHUNKED RENDER FAILED ===`);
    logError(`Project: ${projectId}, Time: ${(elapsedMs / 1000).toFixed(1)}s`);
    logError(`Error: ${error.message}`);

    try {
      const latestProject = await getProjectFromDb(projectId);
      if (latestProject) {
        latestProject.status = 'error';
        latestProject.progress.steps.rendering = latestProject.progress.steps.rendering || {};
        latestProject.progress.steps.rendering.status = 'error';
        latestProject.progress.steps.rendering.message = error.message || 'Chunked render failed';
        latestProject.progress.errors = latestProject.progress.errors || [];
        latestProject.progress.errors.push(`Chunked render failed: ${error.message}`);
        latestProject.progress.serviceFailures = latestProject.progress.serviceFailures || [];
        latestProject.progress.serviceFailures.push({
          service: 'chunked-render',
          timestamp: new Date().toISOString(),
          error: error.message || 'Unknown error',
        });

        const prevRenderStatus = (latestProject.progress as any).renderStatus;
        (latestProject.progress as any).renderStatus = {
          phase: 'error',
          totalChunks: lastKnownTotalChunks || prevRenderStatus?.totalChunks || 0,
          completedChunks: prevRenderStatus?.completedChunks || 0,
          percent: prevRenderStatus?.percent || 0,
          message: error.message || 'Chunked render failed',
          startedAt: prevRenderStatus?.startedAt || startTime,
          lastUpdateAt: Date.now(),
          elapsedMs: Date.now() - startTime,
          error: error.message || 'Unknown error',
        };

        delete (latestProject.progress as any).renderInputProps;

        await saveProjectToDb(latestProject, projectData.ownerId);
        log(`Error state persisted to DB`);
      }
    } catch (dbError: any) {
      logError(`CRITICAL: Failed to persist render error status: ${dbError.message}`);
    }
  } finally {
    currentProjectId = null;
  }
}

async function pollForJobs() {
  if (isProcessing) return;

  try {
    isProcessing = true;

    const renderJobs = await db.select()
      .from(universalVideoProjects)
      .where(eq(universalVideoProjects.status, 'render_queued'))
      .orderBy(universalVideoProjects.createdAt)
      .limit(1);

    if (renderJobs.length > 0) {
      const job = renderJobs[0];
      const projectData = dbRowToVideoProject(job);
      await processChunkedRender(projectData);
      return;
    }

    const generateJobs = await db.select()
      .from(universalVideoProjects)
      .where(eq(universalVideoProjects.status, 'queued'))
      .orderBy(universalVideoProjects.createdAt)
      .limit(1);

    if (generateJobs.length === 0) return;

    const job = generateJobs[0];
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
  log('Chunked render support: ENABLED (render_queued jobs)');

  await recoverStalledProjects();

  setInterval(pollForJobs, POLL_INTERVAL_MS);
  log('Job polling started - waiting for queued/render_queued projects...');

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
