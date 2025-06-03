import { Request, Response, NextFunction } from 'express';

interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  slowQueries: number;
  memoryUsage: NodeJS.MemoryUsage;
  lastReset: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    slowQueries: 0,
    memoryUsage: process.memoryUsage(),
    lastReset: new Date()
  };
  
  private responseTimes: number[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private readonly MAX_RESPONSE_TIME_SAMPLES = 100;

  logRequest(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime);
      
      // Log slow queries for optimization
      if (responseTime > this.SLOW_QUERY_THRESHOLD) {
        console.warn(`Slow query detected: ${req.method} ${req.path} - ${responseTime}ms`);
        this.metrics.slowQueries++;
      }
    });
    
    next();
  }

  private updateMetrics(responseTime: number) {
    this.metrics.requestCount++;
    this.responseTimes.push(responseTime);
    
    // Keep only recent samples for rolling average
    if (this.responseTimes.length > this.MAX_RESPONSE_TIME_SAMPLES) {
      this.responseTimes.shift();
    }
    
    this.metrics.averageResponseTime = 
      this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    
    // Update memory usage every 10 requests
    if (this.metrics.requestCount % 10 === 0) {
      this.metrics.memoryUsage = process.memoryUsage();
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  resetMetrics() {
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowQueries: 0,
      memoryUsage: process.memoryUsage(),
      lastReset: new Date()
    };
    this.responseTimes = [];
  }

  // Database query performance monitoring
  logDatabaseQuery(query: string, duration: number) {
    if (duration > 500) { // 500ms threshold for database queries
      console.warn(`Slow database query: ${duration}ms - ${query.substring(0, 100)}...`);
    }
  }
}

export const performanceMonitor = new PerformanceMonitor();

export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  performanceMonitor.logRequest(req, res, next);
};

// API endpoint to get performance metrics
export const getPerformanceMetrics = (req: Request, res: Response) => {
  const metrics = performanceMonitor.getMetrics();
  
  // Add additional system metrics
  const systemMetrics = {
    ...metrics,
    uptime: process.uptime(),
    nodeVersion: process.version,
    platform: process.platform,
    cpuUsage: process.cpuUsage(),
    loadAverage: process.platform === 'linux' ? require('os').loadavg() : null
  };
  
  res.json(systemMetrics);
};

export const resetPerformanceMetrics = (req: Request, res: Response) => {
  performanceMonitor.resetMetrics();
  res.json({ message: 'Performance metrics reset successfully' });
};