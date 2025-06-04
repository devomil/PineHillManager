import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { performanceMiddleware } from "./performance-middleware";

// Set VAPID keys for push notifications
process.env.VAPID_PUBLIC_KEY = "BKVeBF9FrhiHDbvKQe8nojV_igVq_QzaWreyTU0Nr2oQmyU_j9gGJkCAQMtMLRr6toZ1v0tqdxgpf5pDdpiyPSg";
process.env.VAPID_PRIVATE_KEY = "pOqnB95DYmnfI5elizMXyIpq4LJA8EZEQHoyguwV1R4";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(performanceMiddleware);

// Enhanced logging for route debugging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  
  console.log(`🔄 ${req.method} ${path} - Processing...`);
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '↩️' : '✅';
    console.log(`${statusEmoji} ${req.method} ${path} ${status} in ${duration}ms`);
  });

  next();
});

function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Start pure Express server without any Vite interference
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`🚀 Pure Express server running on port ${port}`);
    log(`📄 All routes served by Express - NO Vite interference`);
    log(`🔗 Team Chat: http://localhost:${port}/team-chat`);
    log(`📚 Documents: http://localhost:${port}/documents`);
    log(`🔄 Shift Coverage: http://localhost:${port}/shift-coverage`);
    log(`🏠 Dashboard: http://localhost:${port}/dashboard`);
  });
})();