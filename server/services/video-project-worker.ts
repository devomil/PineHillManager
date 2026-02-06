import { fork, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

let workerProcess: ChildProcess | null = null;
let restartTimeout: NodeJS.Timeout | null = null;
let isShuttingDown = false;
const RESTART_DELAY_MS = 3000;
const MAX_RESTART_ATTEMPTS = 5;
let restartCount = 0;

function log(message: string) {
  console.log(`[VideoProjectWorker:Launcher] ${message}`);
}

function logError(message: string) {
  console.error(`[VideoProjectWorker:Launcher] ${message}`);
}

function getWorkerConfig(): { workerPath: string; execArgv: string[] } {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  if (isDev) {
    return {
      workerPath: path.resolve(process.cwd(), 'server/video-worker-process.ts'),
      execArgv: ['--import', 'tsx'],
    };
  }

  const prodPath = path.resolve(process.cwd(), 'dist/video-worker-process.js');
  if (fs.existsSync(prodPath)) {
    return {
      workerPath: prodPath,
      execArgv: [],
    };
  }

  log('Production JS not found, falling back to tsx loader');
  return {
    workerPath: path.resolve(process.cwd(), 'server/video-worker-process.ts'),
    execArgv: ['--import', 'tsx'],
  };
}

function spawnWorker(): ChildProcess {
  const config = getWorkerConfig();
  log(`Forking worker process: ${config.workerPath} (execArgv: ${JSON.stringify(config.execArgv)})`);

  const child = fork(config.workerPath, [], {
    execArgv: config.execArgv,
    stdio: ['pipe', 'inherit', 'inherit', 'ipc'],
    env: { ...process.env },
  });

  child.on('message', (msg: any) => {
    if (msg === 'ready') {
      log('Worker process reported ready');
      restartCount = 0;
    }
  });

  child.on('exit', (code, signal) => {
    log(`Worker process exited (code: ${code}, signal: ${signal})`);
    workerProcess = null;

    if (!isShuttingDown) {
      restartCount++;
      if (restartCount > MAX_RESTART_ATTEMPTS) {
        logError(`Worker failed ${restartCount} times. Stopping auto-restart.`);
        return;
      }
      const delay = RESTART_DELAY_MS * Math.min(restartCount, 5);
      log(`Restarting worker in ${delay}ms (attempt ${restartCount}/${MAX_RESTART_ATTEMPTS})...`);
      restartTimeout = setTimeout(() => {
        if (!isShuttingDown) {
          workerProcess = spawnWorker();
        }
      }, delay);
    }
  });

  child.on('error', (err) => {
    logError(`Worker process error: ${err.message}`);
  });

  log(`Worker process forked (PID: ${child.pid})`);
  return child;
}

export function startVideoProjectWorker() {
  if (workerProcess) {
    log('Worker already running');
    return;
  }

  isShuttingDown = false;
  restartCount = 0;
  workerProcess = spawnWorker();
}

export function stopVideoProjectWorker() {
  isShuttingDown = true;

  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }

  if (workerProcess) {
    log(`Stopping worker process (PID: ${workerProcess.pid})`);
    workerProcess.kill('SIGTERM');
    workerProcess = null;
  }

  log('Worker stopped');
}
