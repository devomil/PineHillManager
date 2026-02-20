import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { performanceMiddleware, getPerformanceMetrics, resetPerformanceMetrics } from "./performance-middleware";

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = "development";
}

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Set VAPID keys for push notifications
process.env.VAPID_PUBLIC_KEY = "BKVeBF9FrhiHDbvKQe8nojV_igVq_QzaWreyTU0Nr2oQmyU_j9gGJkCAQMtMLRr6toZ1v0tqdxgpf5pDdpiyPSg";
process.env.VAPID_PRIVATE_KEY = "pOqnB95DYmnfI5elizMXyIpq4LJA8EZEQHoyguwV1R4";

// Phase 10A: Diagnostic logging for AI services
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('[Phase10A DIAGNOSTIC] AI Service Configuration Check');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('[Phase10A] ANTHROPIC_API_KEY configured:', !!process.env.ANTHROPIC_API_KEY);
if (process.env.ANTHROPIC_API_KEY) {
  console.log('[Phase10A] ANTHROPIC_API_KEY present: YES (key masked for security)');
} else {
  console.warn('[Phase10A] WARNING: ANTHROPIC_API_KEY is NOT set - Claude Vision will NOT work!');
  console.warn('[Phase10A] Quality analysis will return SIMULATED scores (fake 75-90 values)');
}
console.log('[Phase10A] PIAPI_API_KEY configured:', !!process.env.PIAPI_API_KEY);
console.log('═══════════════════════════════════════════════════════════════════════════════');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Ensure standard Chart of Accounts exists
  const { storage } = await import('./storage');
  await storage.ensureStandardAccounts();
  log('📊 Standard Chart of Accounts initialized', 'accounting');
  
  // Sync Chart of Accounts with live data on startup
  const currentMonth = new Date();
  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];
  
  try {
    await storage.syncAccountBalancesWithLiveData(monthStart, today);
    log(`✅ Chart of Accounts synced with live data (${monthStart} to ${today})`, 'accounting');
  } catch (error) {
    log('⚠️ Initial Chart of Accounts sync failed: ' + (error instanceof Error ? error.message : String(error)), 'accounting');
  }

  // Schedule daily Chart of Accounts sync at 12:01 AM CT
  const startChartOfAccountsSync = () => {
    const checkAndSync = async () => {
      const now = new Date();
      const ctHour = parseInt(now.toLocaleString('en-US', { 
        hour: '2-digit', 
        hour12: false,
        timeZone: 'America/Chicago'
      }));
      const ctMinute = parseInt(now.toLocaleString('en-US', { 
        minute: '2-digit',
        timeZone: 'America/Chicago'
      }));
      
      // Run sync at 12:01 AM CT
      if (ctHour === 0 && ctMinute === 1) {
        const currentMonth = new Date();
        const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().split('T')[0];
        const today = now.toISOString().split('T')[0];
        
        log('🕛 Scheduler checking at: ' + now.toLocaleString('en-US', { timeZone: 'America/Chicago' }) + ' CT', 'sync-chart');
        log(`🔄 Starting daily Chart of Accounts sync for ${monthStart} to ${today}`, 'sync-chart');
        
        try {
          await storage.syncAccountBalancesWithLiveData(monthStart, today);
          log('✅ Chart of Accounts sync completed successfully', 'sync-chart');
        } catch (error) {
          log('❌ Chart of Accounts sync failed: ' + (error instanceof Error ? error.message : String(error)), 'sync-chart');
        }
      }
    };
    
    // Check every minute
    setInterval(checkAndSync, 60 * 1000);
    log('📅 Chart of Accounts daily sync scheduler initialized (12:01 AM CT)', 'sync-chart');
  };
  
  startChartOfAccountsSync();

  // Import and initialize the message scheduler
  const { startMessageScheduler } = await import('./messageScheduler');
  startMessageScheduler();

  // Import and initialize the sync scheduler
  const { startSyncScheduler } = await import('./services/sync-scheduler');
  startSyncScheduler();

  // Import and initialize the Clover sync job worker
  const { cloverSyncJobService } = await import('./services/clover-sync-job-service');
  await cloverSyncJobService.startWorker(5000); // Check for jobs every 5 seconds
  log('🔄 Clover sync job worker initialized', 'sync-job-worker');

  // Import and initialize the inventory sync scheduler (runs every 15 minutes)
  const { startInventorySyncScheduler } = await import('./services/inventory-sync-scheduler');
  startInventorySyncScheduler();
  log('📦 Inventory sync scheduler initialized (every 15 minutes)', 'inventory-sync');

  // Import and initialize the marketplace sync scheduler (runs every 15 minutes)
  const { startMarketplaceSyncScheduler } = await import('./services/marketplace-sync-scheduler');
  startMarketplaceSyncScheduler();
  log('🛒 Marketplace sync scheduler initialized (every 15 minutes)', 'marketplace-sync');

  // Import and initialize the BigCommerce inventory sync scheduler (runs at configured time daily)
  const { bigcommerceInventorySyncService } = await import('./services/bigcommerce-inventory-sync-service');
  bigcommerceInventorySyncService.startScheduledSync();
  log('📦 BigCommerce inventory sync scheduler initialized', 'bigcommerce-sync');

  // Spawn dedicated video service as detached process (survives main server restarts)
  const net = await import('net');
  const isVideoServiceRunning = await new Promise<boolean>((resolve) => {
    const sock = new net.Socket();
    sock.setTimeout(1000);
    sock.on('connect', () => { sock.destroy(); resolve(true); });
    sock.on('error', () => { sock.destroy(); resolve(false); });
    sock.on('timeout', () => { sock.destroy(); resolve(false); });
    sock.connect(5001, '127.0.0.1');
  });

  if (isVideoServiceRunning) {
    log('📹 Video service already running on port 5001 (reusing)', 'video-service');
  } else {
    const { spawn } = await import('child_process');
    const videoProc = spawn('npx', ['tsx', 'server/video-service.ts'], {
      detached: true,
      stdio: 'inherit',
      env: { ...process.env },
    });
    videoProc.unref();
    log(`📹 Video service spawned as detached process (PID: ${videoProc.pid})`, 'video-service');
  }

  // Setup Vite integration for React app
  if (process.env.NODE_ENV !== "production") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    // In production, serve static files
    app.use(express.static("dist/public"));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        return next();
      }
      res.sendFile(path.join(process.cwd(), 'dist', 'public', 'index.html'));
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`Server with Vite integration serving on port ${port}`);
    log(`📅 Message scheduler initialized`, "scheduler");
    log(`🔄 Sync scheduler initialized`, "sync-scheduler");
  });
})();
