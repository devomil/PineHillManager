import express, { type Request, Response, NextFunction } from "express";
import path from "path";
import { registerRoutes } from "./routes-clean";
import { performanceMiddleware, getPerformanceMetrics, resetPerformanceMetrics } from "./performance-middleware";

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

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

  // Setup Vite integration for React app
  if (process.env.NODE_ENV === "development") {
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
  });
})();
