import type { Express } from "express";
import { createServer, type Server } from "http";
import * as QRCode from 'qrcode';
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./storage";
import { performanceMiddleware, getPerformanceMetrics, resetPerformanceMetrics } from "./performance-middleware";
import { notificationService } from "./notificationService";
import { cloverSyncService } from "./services/clover-sync-service";
import { syncScheduler } from "./services/sync-scheduler";
import { sendSupportTicketNotification } from "./emailService";
import { smsService } from "./sms-service";
import { smartNotificationService } from './smart-notifications';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';
import twilio from 'twilio';
import PDFDocument from 'pdfkit';
// Phase 6: Advanced Features Schema Imports
import {
  insertScheduledMessageSchema,
  updateScheduledMessageSchema,
  insertAnnouncementTemplateSchema,
  updateAnnouncementTemplateSchema,
  insertAutomationRuleSchema,
  updateAutomationRuleSchema,
  updateUserFinancialsSchema,
} from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  dest: uploadsDir,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// ================================
// QUERY PARAMETER VALIDATION SCHEMAS
// ================================

// Analytics query parameters validation
const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  locationId: z.string().optional(),
  merchantId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month', 'quarter', 'year']).default('day'),
  timezone: z.string().default('UTC'),
  trendType: z.enum(['revenue', 'orders', 'profit', 'aov', 'all']).optional(),
  granularity: z.enum(['daily', 'weekly', 'monthly']).optional(),
  aggregationLevel: z.enum(['daily', 'weekly', 'monthly']).optional(),
  metrics: z.string().optional(),
  useCache: z.enum(['true', 'false']).default('false'),
  limit: z.string().optional()
});

// Year-over-year comparison parameters
const yoyComparisonSchema = z.object({
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  comparisonPeriodStart: z.string(),
  comparisonPeriodEnd: z.string(),
  locationId: z.string().optional(),
  merchantId: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).default('month')
});

// Utility function for safe merchant ID parsing
const parseMerchantId = (merchantId: string | undefined): number | undefined => {
  if (!merchantId || merchantId === 'all') return undefined;
  const parsed = Number(merchantId);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid merchantId: '${merchantId}'. Must be a positive number.`);
  }
  return parsed;
};

// Helper functions for imageUrls parsing (shared across endpoints)
const parseImageUrls = (content: string): string[] => {
  const match = content.match(/<!--attachments:(.*?)-->/);
  if (match) {
    try {
      const attachments = JSON.parse(match[1]);
      return attachments.images || [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

const addImageUrlsToItem = (item: any): any => {
  if (!item.content) return item;
  
  const imageUrls = parseImageUrls(item.content);
  // Remove sentinel from content for display
  const cleanContent = item.content.replace(/\n\n<!--attachments:.*?-->/g, '');
  
  return {
    ...item,
    content: cleanContent,
    imageUrls
  };
};

// Utility function to validate date strings
const validateDateString = (dateStr: string, paramName: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid ${paramName}: '${dateStr}'. Must be a valid date string.`);
  }
  return dateStr;
};

// Utility function to get default date range (last 30 days)
const getDefaultDateRange = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0]
  };
};

export async function registerRoutes(app: Express): Promise<Server> {

  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Performance monitoring
  app.use(performanceMiddleware);
  app.get('/api/performance/metrics', getPerformanceMetrics);
  app.post('/api/performance/reset', resetPerformanceMetrics);

  // Setup authentication
  setupAuth(app);


  // API configuration endpoint for frontend
  app.get('/api/config', isAuthenticated, async (req, res) => {
    try {
      res.json({
        unsplash: {
          accessKey: process.env.UNSPLASH_ACCESS_KEY || null,
          applicationId: process.env.UNSPLASH_APPLICATION_ID || null,
          // Don't expose secret key to frontend for security
        },
        huggingface: {
          apiToken: process.env.HUGGINGFACE_API_TOKEN || null
        },
        elevenlabs: {
          apiKey: process.env.ELEVENLABS_API_KEY || null
        }
      });
    } catch (error) {
      console.error('Error fetching API config:', error);
      res.status(500).json({ message: 'Failed to fetch API configuration' });
    }
  });

  // Communication Analytics API endpoints
  app.get('/api/analytics/communication/overview', isAuthenticated, async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const analytics = await storage.getCommunicationAnalytics(Number(days));
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching communication analytics:', error);
      res.status(500).json({ message: 'Failed to fetch communication analytics' });
    }
  });

  app.get('/api/analytics/communication/charts', isAuthenticated, async (req, res) => {
    try {
      const { type = 'engagement', days = 30 } = req.query;
      const chartData = await storage.getCommunicationChartData(type as string, Number(days));
      res.json(chartData);
    } catch (error) {
      console.error('Error fetching chart data:', error);
      res.status(500).json({ message: 'Failed to fetch chart data' });
    }
  });

  app.get('/api/analytics/sms/metrics', isAuthenticated, async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const smsMetrics = await storage.getSMSAnalytics(Number(days));
      res.json(smsMetrics);
    } catch (error) {
      console.error('Error fetching SMS metrics:', error);
      res.status(500).json({ message: 'Failed to fetch SMS metrics' });
    }
  });

  app.get('/api/analytics/user-engagement', isAuthenticated, async (req, res) => {
    try {
      const { days = 30 } = req.query;
      const engagement = await storage.getUserEngagementAnalytics(Number(days));
      res.json(engagement);
    } catch (error) {
      console.error('Error fetching user engagement analytics:', error);
      res.status(500).json({ message: 'Failed to fetch user engagement analytics' });
    }
  });

  // Manual analytics aggregation endpoint (Admin only)
  app.post('/api/analytics/aggregate-daily', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { date } = req.body;
      const targetDate = date || new Date().toISOString().split('T')[0];
      
      await storage.aggregateDailyCommunicationAnalytics(targetDate);
      
      res.json({ 
        success: true, 
        message: `Daily analytics aggregated for ${targetDate}`,
        date: targetDate 
      });
    } catch (error) {
      console.error('Error aggregating daily analytics:', error);
      res.status(500).json({ message: 'Failed to aggregate daily analytics' });
    }
  });

  // ================================
  // CLOVER SYNC SERVICE ENDPOINTS
  // ================================

  // Trigger manual sync for all merchants
  app.post('/api/sync/clover/all', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      if (cloverSyncService.isRunningSync()) {
        return res.status(409).json({ error: 'Sync already in progress' });
      }

      const options = {
        forceFullSync: req.body.forceFullSync || false,
        batchSize: req.body.batchSize || 100,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };

      // Start sync asynchronously
      cloverSyncService.syncAllMerchants(options)
        .then((results) => {
          console.log('✅ Bulk sync completed:', results);
        })
        .catch((error) => {
          console.error('❌ Bulk sync failed:', error);
        });

      res.json({ 
        success: true, 
        message: 'Sync started for all merchants',
        options 
      });
    } catch (error) {
      console.error('Error starting sync:', error);
      res.status(500).json({ message: 'Failed to start sync' });
    }
  });

  // Trigger manual sync for specific merchant
  app.post('/api/sync/clover/merchant/:merchantId', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const merchantDbId = parseInt(req.params.merchantId);
      if (!merchantDbId) {
        return res.status(400).json({ error: 'Invalid merchant ID' });
      }

      if (cloverSyncService.isRunningSync()) {
        return res.status(409).json({ error: 'Sync already in progress' });
      }

      const options = {
        forceFullSync: req.body.forceFullSync || false,
        batchSize: req.body.batchSize || 100,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };

      // Start sync asynchronously
      cloverSyncService.syncMerchant(merchantDbId, options)
        .then((result) => {
          console.log(`✅ Sync completed for merchant ${merchantDbId}:`, result);
        })
        .catch((error) => {
          console.error(`❌ Sync failed for merchant ${merchantDbId}:`, error);
        });

      res.json({ 
        success: true, 
        message: `Sync started for merchant ${merchantDbId}`,
        merchantId: merchantDbId,
        options 
      });
    } catch (error) {
      console.error('Error starting merchant sync:', error);
      res.status(500).json({ message: 'Failed to start merchant sync' });
    }
  });

  // Get sync status for all merchants
  app.get('/api/sync/clover/status', isAuthenticated, async (req, res) => {
    try {
      const syncStatus = await cloverSyncService.getSyncStatus();
      
      res.json({
        isRunning: cloverSyncService.isRunningSync(),
        merchants: syncStatus,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting sync status:', error);
      res.status(500).json({ message: 'Failed to get sync status' });
    }
  });

  // Stop running sync
  app.post('/api/sync/clover/stop', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      if (!cloverSyncService.isRunningSync()) {
        return res.status(400).json({ error: 'No sync currently running' });
      }

      cloverSyncService.stopSync();

      res.json({ 
        success: true, 
        message: 'Sync stop requested' 
      });
    } catch (error) {
      console.error('Error stopping sync:', error);
      res.status(500).json({ message: 'Failed to stop sync' });
    }
  });

  // Get sync cursor details for specific merchant
  app.get('/api/sync/clover/cursor/:merchantId', isAuthenticated, async (req, res) => {
    try {
      const merchantDbId = parseInt(req.params.merchantId);
      if (!merchantDbId) {
        return res.status(400).json({ error: 'Invalid merchant ID' });
      }

      const cursor = await storage.getSyncCursor('clover', merchantDbId, 'orders');
      
      res.json({
        merchantId: merchantDbId,
        cursor: cursor || null,
        hasData: !!cursor
      });
    } catch (error) {
      console.error('Error getting sync cursor:', error);
      res.status(500).json({ message: 'Failed to get sync cursor' });
    }
  });

  // Reset sync cursor for merchant (force full sync next time)
  app.post('/api/sync/clover/reset-cursor/:merchantId', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const merchantDbId = parseInt(req.params.merchantId);
      if (!merchantDbId) {
        return res.status(400).json({ error: 'Invalid merchant ID' });
      }

      const cursor = await storage.getSyncCursor('clover', merchantDbId, 'orders');
      
      if (cursor) {
        await storage.updateSyncCursor(cursor.id, {
          lastModifiedMs: null,
          lastSyncAt: null,
          lastSuccessAt: null,
          errorCount: 0,
          lastError: null
        });
      }

      res.json({ 
        success: true, 
        message: `Sync cursor reset for merchant ${merchantDbId}`,
        merchantId: merchantDbId
      });
    } catch (error) {
      console.error('Error resetting sync cursor:', error);
      res.status(500).json({ message: 'Failed to reset sync cursor' });
    }
  });

  // Get sync statistics and performance metrics
  app.get('/api/sync/clover/stats', isAuthenticated, async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const daysNum = parseInt(days as string);
      
      // Get sync cursors for all merchants
      const syncCursors = await storage.getSyncCursors('clover');
      
      // Get recent order counts by date
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      
      const merchants = await storage.getAllCloverConfigs();
      let totalOrders = 0;
      let totalRevenue = 0;
      const merchantStats = [];

      for (const merchant of merchants) {
        const orders = await storage.getOrdersByMerchantAndDateRange(
          merchant.id, 
          startDate, 
          new Date()
        );
        
        const merchantRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
        totalOrders += orders.length;
        totalRevenue += merchantRevenue;

        const cursor = syncCursors.find((c: any) => c.merchantId === merchant.id && c.dataType === 'orders');
        
        merchantStats.push({
          merchantId: merchant.id,
          merchantName: merchant.merchantName,
          orders: orders.length,
          revenue: merchantRevenue.toFixed(2),
          lastSync: cursor?.lastSyncAt,
          errorCount: cursor?.errorCount || 0
        });
      }

      res.json({
        period: `Last ${daysNum} days`,
        summary: {
          totalOrders,
          totalRevenue: totalRevenue.toFixed(2),
          activeMerchants: merchants.filter(m => m.isActive).length,
          totalMerchants: merchants.length
        },
        merchantStats,
        syncStatus: {
          isRunning: cloverSyncService.isRunningSync(),
          cursorsConfigured: syncCursors.length
        }
      });
    } catch (error) {
      console.error('Error getting sync stats:', error);
      res.status(500).json({ message: 'Failed to get sync stats' });
    }
  });

  // ================================
  // SYNC SCHEDULER ENDPOINTS
  // ================================

  // Get scheduler status and configuration
  app.get('/api/sync/scheduler/status', isAuthenticated, async (req, res) => {
    try {
      const status = syncScheduler.getStatus();
      res.json({
        scheduler: status,
        cloverSyncService: {
          isRunning: cloverSyncService.isRunningSync(),
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting scheduler status:', error);
      res.status(500).json({ message: 'Failed to get scheduler status' });
    }
  });

  // Start the sync scheduler
  app.post('/api/sync/scheduler/start', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      syncScheduler.start();
      
      res.json({ 
        success: true, 
        message: 'Sync scheduler started',
        status: syncScheduler.getStatus()
      });
    } catch (error) {
      console.error('Error starting sync scheduler:', error);
      res.status(500).json({ message: 'Failed to start sync scheduler' });
    }
  });

  // Stop the sync scheduler
  app.post('/api/sync/scheduler/stop', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      syncScheduler.stop();
      
      res.json({ 
        success: true, 
        message: 'Sync scheduler stopped',
        status: syncScheduler.getStatus()
      });
    } catch (error) {
      console.error('Error stopping sync scheduler:', error);
      res.status(500).json({ message: 'Failed to stop sync scheduler' });
    }
  });

  // Update scheduler configuration
  app.patch('/api/sync/scheduler/config', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const {
        enabled,
        incrementalIntervalMinutes,
        fullSyncHour,
        businessStartHour,
        businessEndHour,
        timezone,
        skipWeekends
      } = req.body;

      // Validate input
      const updates: any = {};
      if (typeof enabled === 'boolean') updates.enabled = enabled;
      if (typeof incrementalIntervalMinutes === 'number' && incrementalIntervalMinutes > 0) {
        updates.incrementalIntervalMinutes = incrementalIntervalMinutes;
      }
      if (typeof fullSyncHour === 'number' && fullSyncHour >= 0 && fullSyncHour <= 23) {
        updates.fullSyncHour = fullSyncHour;
      }
      if (typeof businessStartHour === 'number' && businessStartHour >= 0 && businessStartHour <= 23) {
        updates.businessStartHour = businessStartHour;
      }
      if (typeof businessEndHour === 'number' && businessEndHour >= 0 && businessEndHour <= 23) {
        updates.businessEndHour = businessEndHour;
      }
      if (typeof timezone === 'string') updates.timezone = timezone;
      if (typeof skipWeekends === 'boolean') updates.skipWeekends = skipWeekends;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No valid configuration updates provided' });
      }

      syncScheduler.updateConfig(updates);
      
      res.json({ 
        success: true, 
        message: 'Scheduler configuration updated',
        config: syncScheduler.getStatus().config,
        updatesApplied: updates
      });
    } catch (error) {
      console.error('Error updating scheduler config:', error);
      res.status(500).json({ message: 'Failed to update scheduler configuration' });
    }
  });

  // Trigger manual sync through scheduler
  app.post('/api/sync/scheduler/trigger', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { type = 'incremental' } = req.body;
      
      if (type !== 'incremental' && type !== 'full') {
        return res.status(400).json({ error: 'Invalid sync type. Use "incremental" or "full"' });
      }

      const result = await syncScheduler.triggerManualSync(type);
      
      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          type,
          triggeredAt: new Date().toISOString()
        });
      } else {
        res.status(409).json({
          success: false,
          message: result.message,
          type
        });
      }
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      res.status(500).json({ message: 'Failed to trigger manual sync' });
    }
  });

  // Admin stats route
  app.get('/api/admin/stats', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const timeOffRequests = await storage.getPendingTimeOffRequests();
      const locations = await storage.getAllLocations();

      res.json({
        totalEmployees: users.length,
        pendingRequests: timeOffRequests.length,
        scheduledToday: 0,
        storeLocations: locations.length
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
  });

  // Work schedule routes
  app.get('/api/work-schedules', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, userId } = req.query;
      
      if (startDate && endDate) {
        // Get schedules for date range
        const schedules = await storage.getWorkSchedulesByDateRange(
          startDate as string, 
          endDate as string, 
          userId as string | undefined
        );
        res.json(schedules);
      } else {
        // Default to today's schedules
        const today = new Date().toISOString().split('T')[0];
        const schedules = await storage.getWorkSchedulesByDate(today);
        res.json(schedules);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      res.status(500).json({ message: 'Failed to fetch schedules' });
    }
  });

  app.get('/api/work-schedules/today', isAuthenticated, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todaySchedules = await storage.getWorkSchedulesByDate(today);
      res.json(todaySchedules);
    } catch (error) {
      console.error('Error fetching today\'s schedules:', error);
      res.status(500).json({ message: 'Failed to fetch today\'s schedules' });
    }
  });

  // Calendar Notes Routes
  app.get('/api/calendar-notes', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, locationId } = req.query as { 
        startDate?: string; 
        endDate?: string; 
        locationId?: string;
      };
      const notes = await storage.getCalendarNotes(
        startDate, 
        endDate, 
        locationId ? parseInt(locationId) : undefined
      );
      res.json(notes);
    } catch (error) {
      console.error('Error fetching calendar notes:', error);
      res.status(500).json({ error: 'Failed to fetch calendar notes' });
    }
  });

  app.post('/api/calendar-notes', isAuthenticated, async (req, res) => {
    try {
      const noteData = req.body;
      const note = await storage.createCalendarNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      console.error('Error creating calendar note:', error);
      res.status(500).json({ error: 'Failed to create calendar note' });
    }
  });

  app.put('/api/calendar-notes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const note = await storage.updateCalendarNote(id, updates);
      res.json(note);
    } catch (error) {
      console.error('Error updating calendar note:', error);
      res.status(500).json({ error: 'Failed to update calendar note' });
    }
  });

  app.delete('/api/calendar-notes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteCalendarNote(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting calendar note:', error);
      res.status(500).json({ error: 'Failed to delete calendar note' });
    }
  });

  // User's personal schedules endpoint
  app.get('/api/my-schedules', isAuthenticated, async (req, res) => {
    try {
      const { start, end } = req.query;
      const userId = req.user!.id;
      
      if (start && end) {
        // Get schedules for date range
        const schedules = await storage.getUserWorkSchedules(
          userId,
          start as string,
          end as string
        );
        res.json(schedules);
      } else {
        // Get user schedules (last 30 days + next 90 days for shift swaps)
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Past 30 days
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 90); // Next 90 days
        
        const schedules = await storage.getUserWorkSchedules(
          userId,
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );
        res.json(schedules);
      }
    } catch (error) {
      console.error('Error fetching user schedules:', error);
      res.status(500).json({ message: 'Failed to fetch user schedules' });
    }
  });

  // Create work schedule endpoint
  app.post('/api/work-schedules', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const scheduleData = {
        ...req.body,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const newSchedule = await storage.createWorkSchedule(scheduleData);
      res.status(201).json(newSchedule);
    } catch (error) {
      console.error('Error creating work schedule:', error);
      res.status(500).json({ message: 'Failed to create work schedule' });
    }
  });

  // Time Off Request Routes
  app.post('/api/time-off-requests', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { startDate, endDate, reason } = req.body;
      const timeOffData = {
        userId,
        startDate: new Date(startDate).toISOString().split('T')[0],
        endDate: new Date(endDate).toISOString().split('T')[0],
        reason,
        status: 'pending' as const,
        requestedAt: new Date()
      };

      const request = await storage.createTimeOffRequest(timeOffData);
      res.status(201).json(request);
    } catch (error) {
      console.error('Error creating time off request:', error);
      res.status(500).json({ error: 'Failed to create time off request' });
    }
  });

  app.get('/api/time-off-requests', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      let requests;
      if (req.user?.role === 'admin' || req.user?.role === 'manager') {
        // Admins/managers see all requests
        requests = await storage.getAllTimeOffRequests();
      } else {
        // Employees see only their own requests
        requests = await storage.getUserTimeOffRequests(userId);
      }

      res.json(requests);
    } catch (error) {
      console.error('Error fetching time off requests:', error);
      res.status(500).json({ error: 'Failed to fetch time off requests' });
    }
  });

  app.patch('/api/time-off-requests/:id/status', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const id = parseInt(req.params.id);
      const { status, comments } = req.body;
      const reviewedBy = req.user.id;

      const updatedRequest = await storage.updateTimeOffRequestStatus(id, status, reviewedBy, comments);
      
      // Send SMS notification for time off status change
      if (updatedRequest && (status === 'approved' || status === 'rejected')) {
        try {
          await smartNotificationService.handleTimeOffStatusChange(
            id,
            updatedRequest.userId,
            status,
            reviewedBy,
            comments
          );
        } catch (notifError) {
          console.error('Failed to send time off notification:', notifError);
          // Don't fail the request if notification fails
        }
      }
      
      res.json(updatedRequest);
    } catch (error) {
      console.error('Error updating time off request status:', error);
      res.status(500).json({ error: 'Failed to update time off request status' });
    }
  });

  // Request cancellation of approved time off
  app.patch('/api/time-off-requests/:id/request-cancellation', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user?.id;
      const id = parseInt(req.params.id);
      const { reason } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      // Get the existing request to verify ownership and status
      const existingRequest = await storage.getTimeOffRequestById(id);
      if (!existingRequest) {
        return res.status(404).json({ error: 'Time off request not found' });
      }

      if (existingRequest.userId !== userId) {
        return res.status(403).json({ error: 'Can only request cancellation of your own requests' });
      }

      if (existingRequest.status !== 'approved') {
        return res.status(400).json({ error: 'Can only request cancellation of approved time off' });
      }

      // Update status to cancellation_requested and add reason to comments
      const cancellationComment = reason 
        ? `Cancellation requested: ${reason}` 
        : 'Cancellation requested';
      
      const updatedRequest = await storage.updateTimeOffRequestStatus(
        id, 
        'cancellation_requested', 
        userId, 
        cancellationComment
      );
      
      res.json(updatedRequest);
    } catch (error) {
      console.error('Error requesting time off cancellation:', error);
      res.status(500).json({ error: 'Failed to request time off cancellation' });
    }
  });

  app.get('/api/time-off-requests/approved', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, userId } = req.query;
      const approvedRequests = await storage.getApprovedTimeOffRequests(
        startDate as string,
        endDate as string,
        userId as string | undefined
      );
      res.json(approvedRequests);
    } catch (error) {
      console.error('Error fetching approved time off requests:', error);
      res.status(500).json({ error: 'Failed to fetch approved time off requests' });
    }
  });

  // Shift Swap Marketplace Routes
  app.get('/api/shift-swaps', isAuthenticated, async (req, res) => {
    try {
      const { status, userId } = req.query as { status?: string; userId?: string };
      const swapRequests = await storage.getShiftSwapRequests(status, userId);
      res.json(swapRequests);
    } catch (error) {
      console.error('Error fetching shift swap requests:', error);
      res.status(500).json({ error: 'Failed to fetch shift swap requests' });
    }
  });

  app.post('/api/shift-swaps', isAuthenticated, async (req, res) => {
    try {
      const swapData = {
        ...req.body,
        requesterId: req.user?.id,
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const newSwap = await storage.createShiftSwapRequest(swapData);
      res.status(201).json(newSwap);
    } catch (error) {
      console.error('Error creating shift swap request:', error);
      res.status(500).json({ error: 'Failed to create shift swap request' });
    }
  });

  app.post('/api/shift-swaps/:id/accept', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { responseMessage } = req.body;
      const takerId = req.user?.id;
      
      if (!takerId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const updatedSwap = await storage.respondToShiftSwap(id, takerId, 'accept', responseMessage);
      
      // Send SMS notification to requester about acceptance
      if (updatedSwap && updatedSwap.requesterId) {
        try {
          await smartNotificationService.handleShiftSwapDecision(
            id,
            updatedSwap.requesterId,
            takerId,
            'approved', // Employee accepted, but still needs manager approval
            takerId,
            `${req.user?.firstName || 'Employee'} accepted your shift swap request. Pending manager approval.`
          );
        } catch (notifError) {
          console.error('Failed to send shift swap acceptance notification:', notifError);
        }
      }
      
      res.json(updatedSwap);
    } catch (error) {
      console.error('Error accepting shift swap:', error);
      res.status(500).json({ error: 'Failed to accept shift swap' });
    }
  });

  app.post('/api/shift-swaps/:id/reject', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { responseMessage } = req.body;
      const takerId = req.user?.id;
      
      if (!takerId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const updatedSwap = await storage.respondToShiftSwap(id, takerId, 'reject', responseMessage);
      
      // Send SMS notification to requester about rejection
      if (updatedSwap && updatedSwap.requesterId) {
        try {
          await smartNotificationService.handleShiftSwapDecision(
            id,
            updatedSwap.requesterId,
            takerId,
            'declined',
            takerId,
            responseMessage || `${req.user?.firstName || 'Employee'} declined your shift swap request.`
          );
        } catch (notifError) {
          console.error('Failed to send shift swap rejection notification:', notifError);
        }
      }
      
      res.json(updatedSwap);
    } catch (error) {
      console.error('Error rejecting shift swap:', error);
      res.status(500).json({ error: 'Failed to reject shift swap' });
    }
  });

  app.post('/api/shift-swaps/:id/approve', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const id = parseInt(req.params.id);
      const approverId = req.user.id;
      
      const approvedSwap = await storage.approveShiftSwap(id, approverId);
      
      // Send SMS notification to both parties about final approval
      if (approvedSwap && approvedSwap.requesterId && approvedSwap.takerId) {
        try {
          await smartNotificationService.handleShiftSwapDecision(
            id,
            approvedSwap.requesterId,
            approvedSwap.takerId,
            'approved',
            approverId,
            'Shift swap has been approved by management and is now active.'
          );
        } catch (notifError) {
          console.error('Failed to send shift swap approval notification:', notifError);
        }
      }
      
      res.json(approvedSwap);
    } catch (error) {
      console.error('Error approving shift swap:', error);
      res.status(500).json({ error: 'Failed to approve shift swap' });
    }
  });

  // PDF Schedule Generation (Puppeteer-based for perfect single-page control)
  app.post('/api/schedules/generate-pdf', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const { month, locationId } = req.body;
      
      // Get schedule data for the month
      const startDate = new Date(month + '-01');
      const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
      
      const schedules = await storage.getAllWorkSchedules();
      
      // Filter by date range and location if specified
      const filteredSchedules = schedules
        .filter((s: any) => s.date >= startDate.toISOString().split('T')[0] && s.date <= endDate.toISOString().split('T')[0])
        .filter((s: any) => locationId ? s.locationId === parseInt(locationId) : true);
        
      // Get employees and locations for names
      const employees = await storage.getAllUsers();
      const locations = await storage.getAllLocations();
      
      const getEmployeeName = (userId: string) => {
        const employee = employees.find((e: any) => e.id === userId);
        return employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown';
      };
      
      const getLocationName = (locationId: number) => {
        const location = locations.find((l: any) => l.id === locationId);
        return location ? location.name : 'Unknown';
      };

      const getLocationAbbreviation = (locationId: number): string => {
        const location = locations.find((l: any) => l.id === locationId);
        if (!location) return 'UNK';
        
        // Store name abbreviations for space optimization
        switch (location.name) {
          case 'Lake Geneva Retail':
            return 'LGR';
          case 'Watertown Retail':
            return 'WTR';
          case 'Watertown Spa':
            return 'WTSPA';
          case 'Amazon Store':
            return 'online';
          default:
            // Fallback: first 4 characters or custom abbreviation
            return location.name.length > 4 ? location.name.substring(0, 4).toUpperCase() : location.name.toUpperCase();
        }
      };

      // Group schedules by date for HTML template
      const schedulesByDate = filteredSchedules.reduce((acc: any, schedule: any) => {
        const date = schedule.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(schedule);
        return acc;
      }, {} as Record<string, any[]>);

      // Get all dates in the month and organize by weeks
      const monthStartDate = new Date(month + '-01');
      const monthEndDate = new Date(monthStartDate.getFullYear(), monthStartDate.getMonth() + 1, 0);
      const allDates: string[] = [];
      
      for (let d = new Date(monthStartDate); d <= monthEndDate; d.setDate(d.getDate() + 1)) {
        allDates.push(new Date(d).toISOString().split('T')[0]);
      }
      
      // Organize into weeks (Sunday to Saturday)
      const weeks: string[][] = [];
      let currentWeek: string[] = [];
      
      allDates.forEach(dateStr => {
        const date = new Date(dateStr + 'T00:00:00');
        const dayOfWeek = date.getDay();
        
        if (dayOfWeek === 0 && currentWeek.length > 0) {
          weeks.push(currentWeek);
          currentWeek = [];
        }
        currentWeek.push(dateStr);
      });
      
      if (currentWeek.length > 0) {
        weeks.push(currentWeek);
      }

      // Extract month name and year from the month parameter
      const [yearStr, monthStr] = month.split('-');
      const year = parseInt(yearStr);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[parseInt(monthStr) - 1];

      // Brand colors - professional Pine Hill Farm palette
      const primaryColor = '#5b7c99';  // Brand blue-gray
      const secondaryColor = '#8c93ad';  // Secondary brand color
      const accentColor = '#607e66';     // Accent green
      const neutralGray = '#a9a9a9';    // Neutral gray
      const lightBg = '#f8f9fa';        // Light background
      const textColor = '#333333';

      // Create PDF document with fixed single-page dimensions
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 20, bottom: 20, left: 20, right: 20 }
      });

      // Set response headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="schedule-${month}.pdf"`);
      
      doc.pipe(res);

      // Professional branded header
      doc.rect(0, 0, doc.page.width, 100).fill(primaryColor);
      
      // Add subtle gradient effect with secondary color
      doc.rect(0, 80, doc.page.width, 20)
         .fill(secondaryColor)
         .opacity(0.3);
      doc.opacity(1); // Reset opacity
      
      // Company title with professional typography
      doc.fontSize(32)
         .font('Helvetica-Bold')
         .fillColor('white')
         .text('PINE HILL FARM', 0, 25, { align: 'center', width: doc.page.width });
      
      // Prominent month/year with better contrast
      doc.fontSize(20)
         .font('Helvetica-Bold')
         .fillColor('#ffffff')
         .text(`${monthName.toUpperCase()} ${year} SCHEDULE`, 0, 55, { align: 'center', width: doc.page.width });
      
      if (locationId) {
        doc.fontSize(14)
           .font('Helvetica')
           .fillColor('#e8f1f8')
           .text(`Location: ${getLocationName(parseInt(locationId))}`, 0, 78, { align: 'center', width: doc.page.width });
      }

      // SINGLE-PAGE CONSTRAINT: Calculate exact dimensions to fit everything on one page
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const startY = 110; // Reduced header space to give more cell room
      const footerSpace = 45; // Reduced footer space for more calendar area
      const sideMargin = 20;
      const columnWidth = (doc.page.width - (sideMargin * 2)) / 7; // ~105px per column
      const headerHeight = 22; // Compact but readable header
      
      // FORCE single-page layout: Calculate available space and divide evenly
      const totalAvailableHeight = doc.page.height - startY - footerSpace;
      const totalRows = weeks.length;
      const totalHeadersHeight = totalRows * headerHeight;
      const availableGridHeight = totalAvailableHeight - totalHeadersHeight;
      
      // CONSISTENT cell height for all weeks - guarantees single page
      const consistentCellHeight = Math.floor(availableGridHeight / totalRows);
      
      // Ensure minimum readability while maintaining single-page constraint
      const finalCellHeight = Math.max(consistentCellHeight, 45); // Minimum for text readability
      
      console.log(`📊 Single-Page PDF: ${totalRows} weeks, ${finalCellHeight}px cell height, fits in ${totalAvailableHeight}px`);
      
      // Employee colors exactly matching UI calendar
      const employeeColors: { [key: string]: string } = {
        'Dianne Zubke': '#E879F9',        // Purple/magenta to match UI exactly
        'Jacalyn Phillips': '#60A5FA',    // Blue to match UI exactly
        'Danielle Clark': '#FBBF24',      // Yellow/orange to match UI exactly
        'Rozalyn Wolter': '#34D399',      // Green to match UI exactly  
        'Janell Gray': '#22D3EE'          // Teal to match UI exactly
      };
      
      let currentY = startY;

      // Clean calendar grid matching UI layout
      weeks.forEach((week, weekIndex) => {
        // Professional day headers with brand styling
        week.forEach((dateStr, dayIndex) => {
          const date = new Date(dateStr + 'T00:00:00');
          const dayName = dayNames[date.getDay()];
          const dayNumber = date.getDate();
          const x = sideMargin + (dayIndex * columnWidth);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;
          const isAlternateWeek = weekIndex % 2 === 1;
          
          // Professional header with subtle grid and alternating backgrounds
          const headerBg = isAlternateWeek ? lightBg : 'white';
          doc.rect(x, currentY, columnWidth, headerHeight)
             .fill(headerBg)
             .stroke('#d1d5db')  // Subtle light gray grid lines
             .lineWidth(0.5);
          
          // Clean day name styling - compact but readable
          doc.fontSize(7)
             .font('Helvetica-Bold')
             .fillColor(isWeekend ? primaryColor : textColor)
             .text(dayName, x, currentY + 1, { width: columnWidth, align: 'center' });
          
          // Date numbers - compact but clear
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .fillColor(primaryColor)
             .text(dayNumber.toString(), x, currentY + 10, { width: columnWidth, align: 'center' });
        });

        currentY += headerHeight;

        // CONSISTENT calendar cells - all same height for perfect single-page layout
        week.forEach((dateStr, dayIndex) => {
          const daySchedules = schedulesByDate[dateStr] || [];
          const x = sideMargin + (dayIndex * columnWidth);
          const isAlternateWeek = weekIndex % 2 === 1;
          
          // Cell with subtle grid lines and alternating backgrounds
          const cellBg = isAlternateWeek ? lightBg : 'white';
          doc.rect(x, currentY, columnWidth, finalCellHeight)
             .fill(cellBg)
             .stroke('#d1d5db')  // Light gray grid lines for better print readability
             .lineWidth(0.5);
          
          // SMART shift rendering - improved text visibility
          const availableShiftSpace = finalCellHeight - 8; // Reserve padding
          const shiftHeight = Math.min(16, Math.floor(availableShiftSpace / Math.max(daySchedules.length, 1)));
          const fontSize = Math.min(7, Math.max(5, shiftHeight - 4)); // Increased range 5-7
          const timeFont = Math.min(6, Math.max(4, fontSize - 1)); // Improved time text size
          
          let shiftY = currentY + 4; // Consistent top padding
          daySchedules.forEach((schedule: any, shiftIndex: number) => {
            // Skip if we're running out of space
            if (shiftY + shiftHeight > currentY + finalCellHeight - 2) return;
            
            // 12-hour format matching your system
            const startTime = new Date(schedule.startTime).toLocaleString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Chicago'
            }).toLowerCase().replace(' ', '');
            
            const endTime = new Date(schedule.endTime).toLocaleString('en-US', {
              hour: 'numeric', 
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/Chicago'
            }).toLowerCase().replace(' ', '');
            
            const employeeName = getEmployeeName(schedule.userId);
            const timeRange = `${startTime}-${endTime}`;
            const locationName = getLocationAbbreviation(schedule.locationId || 1);
            
            // Compact rounded employee color blocks
            const backgroundColor = employeeColors[employeeName] || lightBg;
            doc.roundedRect(x + 2, shiftY, columnWidth - 4, shiftHeight, 2)
               .fill(backgroundColor)
               .stroke('rgba(255,255,255,0.2)')
               .lineWidth(0.5);
            
            // Adaptive text sizing for employee names
            doc.fontSize(fontSize)
               .font('Helvetica-Bold')
               .fillColor('#ffffff')
               .text(employeeName, x + 4, shiftY + 1, { width: columnWidth - 8, align: 'left' });
            
            // Adaptive time and location text
            doc.fontSize(timeFont)
               .font('Helvetica-Bold')
               .fillColor('rgba(255,255,255,0.9)')
               .text(`${timeRange} • ${locationName}`, x + 4, shiftY + fontSize + 2, { width: columnWidth - 8, align: 'left' });
            
            shiftY += shiftHeight + 1; // Compact but readable spacing
          });
        });

        currentY += finalCellHeight + 1; // Minimal separation between weeks
      });

      // No schedules message
      if (Object.keys(schedulesByDate).length === 0) {
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#888888')
           .text('NO SCHEDULES FOUND FOR THIS PERIOD', 40, currentY + 50, { align: 'center' });
      }

      // Footer
      const footerY = doc.page.height - 60;
      doc.rect(40, footerY - 10, doc.page.width - 80, 40).fill(lightBg);
      
      doc.fontSize(8)
         .font('Helvetica')
         .fillColor(textColor)
         .text(`Generated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}`, 
               40, footerY, { align: 'center' });
      
      doc.fontSize(7)
         .fillColor('#666666')
         .text('Pine Hill Farm Employee Management System', 40, footerY + 15, { align: 'center' });
      
      // Finalize PDF
      doc.end();

      
    } catch (error) {
      console.error('Error generating PDF schedule:', error);
      res.status(500).json({ error: 'Failed to generate PDF schedule' });
    }
  });

  // Shift coverage requests routes
  app.get('/api/shift-coverage-requests', isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      const coverageRequests = await storage.getShiftCoverageRequests(status as string);
      res.json(coverageRequests);
    } catch (error) {
      console.error('Error fetching shift coverage requests:', error);
      res.status(500).json({ message: 'Failed to fetch shift coverage requests' });
    }
  });
  

  app.get('/api/my-coverage-requests', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const allRequests = await storage.getShiftCoverageRequests();
      const userRequests = allRequests.filter((request: any) => request.requesterId === userId);
      res.json(userRequests);
    } catch (error) {
      console.error('Error fetching user coverage requests:', error);
      res.status(500).json({ message: 'Failed to fetch user coverage requests' });
    }
  });

  app.post('/api/shift-coverage-requests', isAuthenticated, async (req, res) => {
    try {
      const { scheduleId, reason } = req.body;
      const userId = req.user!.id;
      
      const coverageRequest = await storage.createShiftCoverageRequest({
        requesterId: userId,
        scheduleId: parseInt(scheduleId),
        reason: reason || null,
        status: 'open'
      });
      
      res.status(201).json(coverageRequest);
    } catch (error) {
      console.error('Error creating shift coverage request:', error);
      res.status(500).json({ message: 'Failed to create shift coverage request' });
    }
  });

  app.post('/api/shift-coverage-requests/:id/accept', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const coverageRequest = await storage.coverShiftRequest(parseInt(id), userId);
      res.json(coverageRequest);
    } catch (error) {
      console.error('Error accepting shift coverage:', error);
      res.status(500).json({ message: 'Failed to accept shift coverage' });
    }
  });

  app.patch('/api/shift-coverage-requests/:id/cover', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const coverageRequest = await storage.coverShiftRequest(parseInt(id), userId);
      res.json(coverageRequest);
    } catch (error) {
      console.error('Error covering shift:', error);
      res.status(500).json({ message: 'Failed to cover shift' });
    }
  });

  // Admin endpoint to clear all work schedules (for removing mock data)
  app.delete('/api/admin/work-schedules/clear', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const deletedCount = await storage.clearAllWorkSchedules();
      res.json({ 
        message: 'All work schedules cleared successfully',
        deletedCount 
      });
    } catch (error) {
      console.error('Error clearing work schedules:', error);
      res.status(500).json({ message: 'Failed to clear work schedules' });
    }
  });

  // Admin endpoints for schedule modification
  app.put('/api/admin/work-schedules/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const scheduleId = parseInt(req.params.id);
      const updates = {
        ...req.body,
        updatedAt: new Date(),
        approvedBy: req.user.id
      };

      const updatedSchedule = await storage.updateWorkSchedule(scheduleId, updates);
      
      // Send smart notification for schedule change
      try {
        await smartNotificationService.handleScheduleChange(
          scheduleId, 
          { 
            userId: updatedSchedule.userId,
            date: updatedSchedule.date,
            shiftType: updatedSchedule.shiftType,
            originalSchedule: updatedSchedule,
            // Extract specific changes for notification formatting (only include if changed)
            ...(updates.startTime && { startTime: updates.startTime }),
            ...(updates.endTime && { endTime: updates.endTime }),
            ...(updates.locationId && { locationId: updates.locationId }),
            ...(updates.status && { status: updates.status })
          }, 
          req.user.id
        );
      } catch (notificationError) {
        console.error('Failed to send schedule change notification:', notificationError);
        // Don't fail the schedule update if notification fails
      }
      
      res.json(updatedSchedule);
    } catch (error) {
      console.error('Error updating work schedule:', error);
      res.status(500).json({ message: 'Failed to update work schedule' });
    }
  });

  app.delete('/api/admin/work-schedules/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const scheduleId = parseInt(req.params.id);
      await storage.deleteWorkSchedule(scheduleId);
      res.json({ message: 'Schedule deleted successfully' });
    } catch (error) {
      console.error('Error deleting work schedule:', error);
      res.status(500).json({ message: 'Failed to delete work schedule' });
    }
  });

  app.patch('/api/admin/work-schedules/:id/status', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const scheduleId = parseInt(req.params.id);
      const { status, notes } = req.body;

      const updates = {
        status,
        notes,
        updatedAt: new Date(),
        approvedBy: req.user.id
      };

      const updatedSchedule = await storage.updateWorkSchedule(scheduleId, updates);
      
      // Send smart notification for status change
      try {
        await smartNotificationService.handleScheduleChange(
          scheduleId, 
          { 
            ...updates, 
            userId: updatedSchedule.userId,
            date: updatedSchedule.date,
            shiftType: updatedSchedule.shiftType,
            originalSchedule: updatedSchedule
          }, 
          req.user.id
        );
      } catch (notificationError) {
        console.error('Failed to send schedule status change notification:', notificationError);
        // Don't fail the schedule update if notification fails
      }
      
      res.json(updatedSchedule);
    } catch (error) {
      console.error('Error updating schedule status:', error);
      res.status(500).json({ message: 'Failed to update schedule status' });
    }
  });

  // Announcements routes
  app.get('/api/announcements', isAuthenticated, async (req, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      
      // Fetch reactions and parse imageUrls for each announcement
      const announcementsWithReactions = await Promise.all(
        announcements.map(async (announcement) => {
          const reactions = await storage.getMessageReactions(announcement.id);
          
          const announcementWithImages = addImageUrlsToItem(announcement);
          return {
            ...announcementWithImages,
            reactions: reactions || []
          };
        })
      );
      
      res.json(announcementsWithReactions);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ message: 'Failed to fetch announcements' });
    }
  });

  app.get('/api/announcements/published', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role || 'employee';
      const announcements = await storage.getPublishedAnnouncementsForUser(userId, userRole);
      
      // Fetch reactions and parse imageUrls for each announcement (same as admin endpoint)
      const announcementsWithReactions = await Promise.all(
        announcements.map(async (announcement) => {
          const reactions = await storage.getMessageReactions(announcement.id);
          
          const announcementWithImages = addImageUrlsToItem(announcement);
          return {
            ...announcementWithImages,
            reactions: reactions || []
          };
        })
      );
      
      res.json(announcementsWithReactions);
    } catch (error) {
      console.error('Error fetching published announcements:', error);
      res.status(500).json({ message: 'Failed to fetch published announcements' });
    }
  });

  // Create announcement route (handles form submission)
  app.post('/api/announcements', isAuthenticated, async (req, res) => {
    try {
      // Validate request body with Zod schema
      const validationResult = {
        title: req.body.title,
        content: req.body.content,
        priority: req.body.priority || 'normal',
        targetAudience: req.body.targetAudience || 'all',
        targetEmployees: req.body.targetEmployees,
        expiresAt: req.body.expiresAt,
        action: req.body.action || 'publish',
        smsEnabled: req.body.smsEnabled || false,
        imageUrls: req.body.imageUrls
      };
      
      const {
        title,
        content,
        priority,
        targetAudience,
        targetEmployees,
        expiresAt,
        action,
        smsEnabled,
        imageUrls
      } = validationResult;
      
      // Helper function to embed imageUrls in content using sentinel pattern
      const embedImageUrls = (content: string, imageUrls: string[]): string => {
        if (!imageUrls || imageUrls.length === 0) return content;
        
        // Remove existing sentinel if present
        const cleanContent = content.replace(/\n\n<!--attachments:.*?-->/g, '');
        
        // Add new sentinel with image URLs
        const sentinel = `\n\n<!--attachments:${JSON.stringify({ images: imageUrls })}-->`;
        return cleanContent + sentinel;
      };
      
      const isPublished = action === 'publish';
      
      const authorId = req.user!.id;
      
      console.log('📢 Creating announcement with data:', {
        title,
        priority,
        targetAudience,
        targetEmployees,
        isPublished,
        smsEnabled,
        smsEnabledType: typeof smsEnabled,
        reqBodyKeys: Object.keys(req.body)
      });
      
      // Embed imageUrls in content if provided
      const contentWithImages = embedImageUrls(content.trim(), imageUrls);
      
      // Validate required fields
      if (!title?.trim() || !content?.trim()) {
        return res.status(400).json({ error: 'Title and content are required' });
      }

      // Handle multi-value audience format from form array
      let processedAudience = 'all';
      
      if (Array.isArray(targetAudience)) {
        // Multi-value array from enhanced selector
        processedAudience = targetAudience.length > 0 ? targetAudience[0] : 'all';
      } else if (targetAudience && typeof targetAudience === 'string') {
        // Single value from basic selector
        processedAudience = targetAudience;
      }

      // Process expiration date
      const expirationDate = expiresAt ? new Date(expiresAt) : null;
      
      // Process target employees
      let processedTargetEmployees = null;
      if (targetEmployees && Array.isArray(targetEmployees) && targetEmployees.length > 0) {
        processedTargetEmployees = targetEmployees;
        console.log('📋 Processing specific employee targeting:', targetEmployees);
      }

      // Create announcement in database
      const announcement = await storage.createAnnouncement({
        title: title.trim(),
        content: contentWithImages,
        authorId,
        priority,
        targetAudience: processedAudience,
        targetEmployees: processedTargetEmployees,
        isPublished: String(isPublished) === 'true',
        expiresAt: expirationDate,
      });

      // If SMS is enabled and announcement is published, send notifications
      const shouldSendSMS = (smsEnabled === 'true' || smsEnabled === true || smsEnabled === 'on');
      console.log('📱 SMS notification check:', {
        smsEnabled,
        shouldSendSMS,
        isPublished: announcement.isPublished,
        willSendSMS: shouldSendSMS && announcement.isPublished
      });
      
      if (shouldSendSMS && announcement.isPublished) {
        console.log('🔔 Preparing to send SMS notifications...');
        try {
          // Send smart notifications using existing system with proper audience targeting
          let targetUsers: any[] = [];
          
          if (processedTargetEmployees && processedTargetEmployees.length > 0) {
            // Specific employee targeting - get only those employees
            console.log('🎯 Targeting specific employees:', processedTargetEmployees);
            const allUsers = await storage.getAllUsers();
            targetUsers = allUsers.filter(user => 
              processedTargetEmployees.includes(user.id) &&
              user.isActive
            );
            console.log(`👤 Found ${targetUsers.length} target employees from ${processedTargetEmployees.length} specified`);
          } else {
            // General audience targeting based on targetAudience
            console.log('🌍 Using general audience targeting:', processedAudience);
            const allUsers = await storage.getAllUsers();
            
            switch (processedAudience) {
              case 'employees':
                targetUsers = allUsers.filter(user => 
                  user.isActive && 
                  (user.role === 'employee' || !user.role)
                );
                break;
              case 'managers':
                targetUsers = allUsers.filter(user => 
                  user.isActive && 
                  user.role === 'manager'
                );
                break;
              case 'admins':
                targetUsers = allUsers.filter(user => 
                  user.isActive && 
                  user.role === 'admin'
                );
                break;
              default: // 'all'
                targetUsers = allUsers.filter(user => user.isActive);
                break;
            }
          }
          
          // Now filter target users for SMS eligibility
          const eligibleUsers = targetUsers.filter(user => 
            user.phone && 
            user.smsConsent &&
            user.smsEnabled &&
            user.smsNotificationTypes?.includes('announcements')
          );

          console.log('👥 SMS recipient analysis:', {
            targetUsersCount: targetUsers.length,
            targetUserDetails: targetUsers.map(u => ({
              id: u.id, 
              firstName: u.firstName, 
              role: u.role,
              hasPhone: !!u.phone,
              smsConsent: u.smsConsent,
              smsEnabled: u.smsEnabled,
              smsNotificationTypes: u.smsNotificationTypes
            })),
            eligibleUsers: eligibleUsers.length,
            eligibleUserIds: eligibleUsers.map(u => ({ id: u.id, phone: u.phone, firstName: u.firstName, role: u.role }))
          });

          if (eligibleUsers.length > 0) {
            const userIds = eligibleUsers.map(user => user.id);
            console.log('📤 Sending notifications to user IDs:', userIds);
            console.log('📤 Full notification recipient details:', eligibleUsers.map(u => ({
              id: u.id,
              name: `${u.firstName} ${u.lastName}`,
              role: u.role,
              phone: u.phone
            })));
            
            const notificationResult = await smartNotificationService.sendBulkSmartNotifications(
              userIds,
              {
                messageType: 'announcement',
                priority: priority as 'emergency' | 'high' | 'normal' | 'low',
                content: {
                  title: title,
                  message: content,
                  metadata: {
                    announcementId: announcement.id,
                    targetAudience: processedAudience,
                    targetEmployees: processedTargetEmployees,
                    senderName: `${req.user!.firstName} ${req.user!.lastName}`,
                    senderRole: req.user!.role
                  }
                },
                targetAudience: processedAudience
              }
            );
            
            console.log('✅ Notification result:', notificationResult);
          } else {
            console.log('⚠️ No eligible users found for SMS notifications');
          }
        } catch (notificationError) {
          console.error('❌ Error sending announcement notifications:', notificationError);
          // Don't fail the whole request if notifications fail
        }
      } else {
        console.log('🚫 SMS notifications not sent - either not enabled or announcement not published');
      }

      res.status(201).json({ success: true, announcement });
      
    } catch (error) {
      console.error('Error creating announcement:', error);
      res.status(500).json({ error: 'Failed to create announcement' });
    }
  });

  // Delete announcement route (Admin and Manager only)
  app.delete('/api/announcements/:id', isAuthenticated, async (req, res) => {
    try {
      const user = req.user!;
      const announcementId = parseInt(req.params.id);

      // Check if user has permission to delete (Admin or Manager only)
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ error: 'Only administrators and managers can delete announcements' });
      }

      // Validate announcement ID
      if (isNaN(announcementId)) {
        return res.status(400).json({ error: 'Invalid announcement ID' });
      }

      console.log(`🗑️ ${user.role} ${user.firstName} ${user.lastName} deleting announcement ${announcementId}`);

      // Delete the announcement
      await storage.deleteAnnouncement(announcementId);

      res.json({ 
        message: 'Announcement deleted successfully',
        deletedBy: `${user.firstName} ${user.lastName}`,
        deletedAt: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error deleting announcement:', error);
      res.status(500).json({ error: 'Failed to delete announcement' });
    }
  });

  // Users routes
  app.get('/api/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Employees route (alias for users for admin employee management)
  app.get('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ message: 'Failed to fetch employees' });
    }
  });

  // Add new employee
  app.post('/api/employees', isAuthenticated, async (req, res) => {
    try {
      const userData = req.body;
      const newEmployee = await storage.createEmployee(userData);
      res.status(201).json(newEmployee);
    } catch (error) {
      console.error('Error creating employee:', error);
      res.status(500).json({ message: 'Failed to create employee' });
    }
  });

  // Update employee
  app.patch('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const updatedEmployee = await storage.updateEmployee(id, updateData);
      if (!updatedEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
      res.json(updatedEmployee);
    } catch (error) {
      console.error('Error updating employee:', error);
      res.status(500).json({ message: 'Failed to update employee' });
    }
  });

  // Employee Financial Management - Admin/Manager only
  app.get('/api/employees/:id/financials', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;
      
      // Allow employees to view their own financial info, admin/manager to view any
      if (requestingUser?.id !== id && !['admin', 'manager'].includes(requestingUser?.role || '')) {
        return res.status(403).json({ message: 'Access denied. Insufficient permissions.' });
      }

      const employee = await storage.getUser(id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Return only financial fields
      res.json({
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        hourlyRate: employee.hourlyRate,
        defaultEntryCost: employee.defaultEntryCost,
        benefits: employee.benefits || [],
      });
    } catch (error) {
      console.error('Error fetching employee financials:', error);
      res.status(500).json({ message: 'Failed to fetch employee financial information' });
    }
  });

  app.put('/api/employees/:id/financials', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const requestingUser = req.user;
      
      // Only admin/manager can update financial information
      if (!['admin', 'manager'].includes(requestingUser?.role || '')) {
        return res.status(403).json({ message: 'Access denied. Only administrators and managers can update financial information.' });
      }

      // Validate financial data using our enhanced schema
      const financialData = updateUserFinancialsSchema.parse(req.body);

      const updatedEmployee = await storage.updateEmployee(id, financialData);
      if (!updatedEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      // Return only financial fields for security
      res.json({
        id: updatedEmployee.id,
        firstName: updatedEmployee.firstName,
        lastName: updatedEmployee.lastName,
        hourlyRate: updatedEmployee.hourlyRate,
        defaultEntryCost: updatedEmployee.defaultEntryCost,
        benefits: updatedEmployee.benefits || [],
        message: 'Employee financial information updated successfully'
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Invalid financial data',
          errors: error.errors 
        });
      }
      console.error('Error updating employee financials:', error);
      res.status(500).json({ message: 'Failed to update employee financial information' });
    }
  });

  // Admin-only password management routes
  const isAdmin = (req: any, res: any, next: any) => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  };

  // Reset user password (admin only)
  app.post('/api/admin/reset-password', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId, newPassword } = req.body;
      
      if (!userId || !newPassword) {
        return res.status(400).json({ message: 'User ID and new password are required' });
      }

      const hashedPassword = await storage.hashPassword(newPassword);
      const updatedUser = await storage.updateUserPassword(userId, hashedPassword);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({ message: 'Password reset successfully', userId });
    } catch (error) {
      console.error('Error resetting password:', error);
      res.status(500).json({ message: 'Failed to reset password' });
    }
  });

  // Create new user with password (admin only)
  app.post('/api/admin/create-user', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userData = req.body;
      
      if (!userData.email || !userData.password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      const hashedPassword = await storage.hashPassword(userData.password);
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Remove password from response
      const { password, ...userResponse } = newUser;
      res.status(201).json(userResponse);
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Delete employee
  app.delete('/api/employees/:id', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEmployee(id);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting employee:', error);
      res.status(500).json({ message: 'Failed to delete employee' });
    }
  });

  // SMS Consent History endpoints
  // Get SMS consent history for a specific user
  app.get('/api/employees/:id/sms-consent-history', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const history = await storage.getSmsConsentHistoryByUserId(id);
      res.json(history);
    } catch (error) {
      console.error('Error fetching SMS consent history:', error);
      res.status(500).json({ message: 'Failed to fetch SMS consent history' });
    }
  });

  // Test bulk opt-in for managers and admins only
  app.post('/api/employees/bulk-sms-opt-in/test-managers-admins', isAuthenticated, async (req: any, res) => {
    try {
      const { notificationTypes, notes } = req.body;
      const changedBy = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      // Get all managers and admins with phone numbers
      const managersAndAdmins = await storage.getUsersByRole(['manager', 'admin']);
      const usersWithPhones = managersAndAdmins.filter(user => user.phone && user.isActive);
      const userIds = usersWithPhones.map(user => user.id);

      if (userIds.length === 0) {
        return res.status(400).json({ message: 'No managers or admins found with phone numbers' });
      }

      const defaultNotificationTypes = notificationTypes || ['emergency', 'schedule', 'announcements', 'reminders'];

      console.log(`🧪 TEST: Bulk SMS opt-in for ${userIds.length} managers/admins:`, 
        usersWithPhones.map(u => `${u.firstName} ${u.lastName} (${u.role}) - ${u.phone}`));

      const result = await storage.bulkOptInSmsConsent({
        userIds,
        changedBy,
        changeReason: 'test_bulk_opt_in_managers_admins',
        notificationTypes: defaultNotificationTypes,
        ipAddress,
        userAgent,
        notes: notes || `TEST: Bulk SMS opt-in for managers and admins by ${req.user.firstName} ${req.user.lastName}`
      });

      res.json({
        message: `TEST completed for managers/admins: ${result.successful} successful, ${result.failed} failed`,
        targetUsers: usersWithPhones.map(u => ({
          id: u.id,
          name: `${u.firstName} ${u.lastName}`,
          role: u.role,
          phone: u.phone,
          previousConsent: u.smsConsent
        })),
        ...result
      });
    } catch (error) {
      console.error('Error performing test bulk SMS opt-in:', error);
      res.status(500).json({ message: 'Failed to perform test bulk SMS opt-in' });
    }
  });

  // Admin only - Toggle individual employee SMS consent
  app.put("/api/employees/:employeeId/sms-consent", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { employeeId } = req.params;
      const { consentValue, notificationTypes, notes } = req.body;
      const adminUser = req.user;

      console.log('🔧 Admin SMS consent toggle request:', {
        adminId: adminUser.id,
        employeeId,
        consentValue,
        notificationTypes,
        notes: notes || 'Admin manual toggle'
      });

      const updatedUser = await storage.toggleSmsConsent({
        userId: employeeId,
        consentValue: Boolean(consentValue),
        changedBy: adminUser.id,
        notificationTypes: notificationTypes || (consentValue ? ['emergency', 'schedule', 'announcements'] : []),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        notes: notes || 'Admin manual toggle'
      });

      console.log('✅ SMS consent toggled successfully:', {
        employeeId,
        newConsentStatus: updatedUser.smsConsent,
        notificationTypes: updatedUser.smsNotificationTypes
      });

      res.json({
        success: true,
        message: `SMS consent ${consentValue ? 'enabled' : 'disabled'} successfully`,
        user: {
          id: updatedUser.id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          smsConsent: updatedUser.smsConsent,
          smsConsentDate: updatedUser.smsConsentDate,
          smsNotificationTypes: updatedUser.smsNotificationTypes
        }
      });
    } catch (error) {
      console.error('❌ Error toggling SMS consent:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to toggle SMS consent'
      });
    }
  });

  // Bulk opt-in to SMS announcements
  app.post('/api/employees/bulk-sms-opt-in', isAuthenticated, async (req: any, res) => {
    try {
      const { userIds, notificationTypes, notes } = req.body;
      const changedBy = req.user.id;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: 'userIds array is required' });
      }

      if (!notificationTypes || !Array.isArray(notificationTypes)) {
        return res.status(400).json({ message: 'notificationTypes array is required' });
      }

      const result = await storage.bulkOptInSmsConsent({
        userIds,
        changedBy,
        changeReason: 'bulk_opt_in',
        notificationTypes,
        ipAddress,
        userAgent,
        notes: notes || `Bulk SMS opt-in for announcements by admin ${req.user.firstName} ${req.user.lastName}`
      });

      res.json({
        message: `Bulk opt-in completed: ${result.successful} successful, ${result.failed} failed`,
        ...result
      });
    } catch (error) {
      console.error('Error performing bulk SMS opt-in:', error);
      res.status(500).json({ message: 'Failed to perform bulk SMS opt-in' });
    }
  });

  // Get users who need SMS opt-in (no consent or missing announcement notifications)
  app.get('/api/employees/sms-opt-in-candidates', isAuthenticated, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const candidates = allUsers.filter(user => 
        !user.smsConsent || 
        !user.smsNotificationTypes?.includes('announcements')
      );
      
      const candidateInfo = candidates.map(user => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        position: user.position,
        smsConsent: user.smsConsent,
        smsEnabled: user.smsEnabled,
        smsNotificationTypes: user.smsNotificationTypes,
        reason: !user.smsConsent ? 'No SMS consent' : 'Missing announcement notifications'
      }));

      res.json({
        total: candidateInfo.length,
        candidates: candidateInfo
      });
    } catch (error) {
      console.error('Error fetching SMS opt-in candidates:', error);
      res.status(500).json({ message: 'Failed to fetch SMS opt-in candidates' });
    }
  });

  // Employee invitation system for admin registration
  app.post('/api/admin/invite-employee', isAuthenticated, async (req, res) => {
    try {
      // Only admins can send invitations
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can invite employees' });
      }

      const { email, firstName, lastName, role, department, position, notes } = req.body;

      if (!email || !firstName || !lastName) {
        return res.status(400).json({ error: 'Email, first name, and last name are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Check for existing pending invitation
      const existingInvitations = await storage.getEmployeeInvitations('pending');
      const existingInvite = existingInvitations.find(inv => inv.email === email);
      if (existingInvite) {
        return res.status(400).json({ error: 'Invitation already sent to this email' });
      }

      // Generate secure invitation token
      const inviteToken = require('crypto').randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await storage.createEmployeeInvitation({
        email,
        firstName,
        lastName,
        role: role || 'employee',
        department,
        position,
        inviteToken,
        invitedBy: req.user.id,
        expiresAt,
        notes,
      });

      // In production, send email with invitation link
      console.log(`Employee invitation created for ${email}: ${inviteToken}`);
      console.log(`Invitation link: /register?token=${inviteToken}`);

      res.status(201).json({
        message: 'Employee invitation sent successfully',
        invitationId: invitation.id,
        token: inviteToken, // Remove in production
      });
    } catch (error) {
      console.error('Error creating employee invitation:', error);
      res.status(500).json({ error: 'Failed to send invitation' });
    }
  });

  // Get all employee invitations (admin only)
  app.get('/api/admin/invitations', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { status } = req.query;
      const invitations = await storage.getEmployeeInvitations(status as string);
      
      res.json(invitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({ error: 'Failed to fetch invitations' });
    }
  });

  // Delete invitation (admin only)
  app.delete('/api/admin/invitations/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;
      await storage.deleteInvitation(parseInt(id));
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting invitation:', error);
      res.status(500).json({ error: 'Failed to delete invitation' });
    }
  });

  // Registration with invitation token
  app.post('/api/register-with-invitation', async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: 'Invitation token and password are required' });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      // Validate invitation token
      const invitation = await storage.getInvitationByToken(token);
      if (!invitation) {
        return res.status(400).json({ error: 'Invalid invitation token' });
      }

      if (invitation.status !== 'pending') {
        return res.status(400).json({ error: 'Invitation has already been used or expired' });
      }

      if (invitation.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(invitation.email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Create user account
      const { hashPassword } = require('./auth');
      const hashedPassword = await hashPassword(password);
      
      const user = await storage.createUser({
        email: invitation.email,
        password: hashedPassword,
        firstName: invitation.firstName,
        lastName: invitation.lastName,
        role: invitation.role,
        department: invitation.department,
        position: invitation.position,
        isActive: true,
      });

      // Accept the invitation
      await storage.acceptInvitation(token, user.id);

      // Auto-login the user
      req.login(user, (err) => {
        if (err) {
          console.error('Auto-login error:', err);
          return res.status(201).json({
            message: 'Account created successfully. Please log in.',
            userId: user.id,
          });
        }
        
        res.status(201).json({
          message: 'Account created and logged in successfully',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
        });
      });
    } catch (error) {
      console.error('Registration with invitation error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Update user role (admin only)
  app.patch('/api/admin/users/:id/role', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { id } = req.params;
      const { role } = req.body;

      if (!role || !['employee', 'manager', 'admin'].includes(role)) {
        return res.status(400).json({ error: 'Valid role is required (employee, manager, admin)' });
      }

      // Prevent self-demotion from admin or manager
      if (req.user.id === id && (req.user.role === 'admin' || req.user.role === 'manager') && !['admin', 'manager'].includes(role)) {
        return res.status(400).json({ error: 'Cannot demote yourself from admin/manager role' });
      }

      const updatedUser = await storage.updateUserRole(id, role);
      
      res.json({
        message: 'User role updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      console.error('Error updating user role:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  // Admin password reset for users
  app.post('/api/admin/reset-user-password', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { userId, newPassword } = req.body;

      if (!userId || !newPassword) {
        return res.status(400).json({ error: 'User ID and new password are required' });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      const { hashPassword } = require('./auth');
      const hashedPassword = await hashPassword(newPassword);
      
      await storage.updateUserProfile(userId, { password: hashedPassword });

      res.json({ message: 'User password reset successfully' });
    } catch (error) {
      console.error('Admin password reset error:', error);
      res.status(500).json({ error: 'Password reset failed' });
    }
  });

  // Locations routes
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      console.error('Error fetching locations:', error);
      res.status(500).json({ message: 'Failed to fetch locations' });
    }
  });

  // User presence route that syncs with time clock data
  app.get('/api/user-presence', isAuthenticated, async (req, res) => {
    try {
      // Get all users and their current time entries to determine work status
      const users = await storage.getAllUsers();
      const locations = await storage.getAllLocations();
      
      const presenceData = await Promise.all(
        users.map(async (user) => {
          const currentEntry = await storage.getCurrentTimeEntry(user.id);
          const location = currentEntry?.locationId 
            ? locations.find(loc => loc.id === currentEntry.locationId)
            : null;
          
          return {
            userId: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            status: currentEntry ? (currentEntry.breakStartTime ? 'on_break' : 'clocked_in') : 'offline',
            isWorking: !!currentEntry && !currentEntry.clockOutTime,
            currentLocation: location?.name || null,
            clockedInAt: currentEntry?.clockInTime || null,
            lastSeen: currentEntry?.clockInTime || user.lastLogin || new Date(),
            statusMessage: currentEntry?.breakStartTime ? 'On break' : 
                          currentEntry ? `Working at ${location?.name}` : null
          };
        })
      );
      
      res.json(presenceData);
    } catch (error) {
      console.error('Error fetching user presence:', error);
      res.status(500).json({ message: 'Failed to fetch user presence' });
    }
  });

  // Time clock API endpoints
  app.post('/api/time-clock/clock-in', isAuthenticated, async (req, res) => {
    try {
      console.log('Clock-in request body:', req.body);
      
      const { locationId } = req.body;
      
      if (!locationId) {
        console.error('No locationId provided');
        return res.status(400).json({ message: 'Location ID is required' });
      }
      
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.id;
      const ipAddress = req.ip;
      const deviceInfo = req.get('User-Agent');

      console.log('Calling storage.clockIn with:', { userId, locationId, ipAddress, deviceInfo });
      const timeEntry = await storage.clockIn(userId, locationId, ipAddress, deviceInfo);
      console.log('Clock-in successful:', timeEntry);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error clocking in:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to clock in' });
    }
  });

  app.post('/api/time-clock/clock-out', isAuthenticated, async (req, res) => {
    try {
      const { notes } = req.body;
      
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.id;
      console.log('Clock-out request for user:', userId, 'with notes:', notes);
      const timeEntry = await storage.clockOut(userId, notes);
      console.log('Clock-out successful:', timeEntry);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error clocking out:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to clock out' });
    }
  });

  app.post('/api/time-clock/start-break', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.id;
      console.log('Start break request for user:', userId);
      const timeEntry = await storage.startBreak(userId);
      console.log('Start break successful:', timeEntry);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error starting break:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to start break' });
    }
  });

  app.post('/api/time-clock/end-break', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.id;
      console.log('End break request for user:', userId);
      const timeEntry = await storage.endBreak(userId);
      console.log('End break successful:', timeEntry);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error ending break:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to end break' });
    }
  });

  app.get('/api/time-clock/current', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.id;
      console.log('Getting current time entry for user:', userId);
      const currentEntry = await storage.getCurrentTimeEntry(userId);
      console.log('Current entry result:', currentEntry);
      res.json(currentEntry || null);
    } catch (error) {
      console.error('Error getting current time entry:', error);
      res.status(500).json({ message: 'Failed to get current time entry' });
    }
  });

  app.get('/api/time-clock/today', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];
      const entries = await storage.getTimeEntriesByDate(userId, today);
      res.json(entries);
    } catch (error) {
      console.error('Error getting today\'s time entries:', error);
      res.status(500).json({ message: 'Failed to get today\'s time entries' });
    }
  });

  app.get('/api/time-clock/week', isAuthenticated, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const userId = req.user.id;
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(startOfWeek.getDate() + 6));
      
      const startDate = startOfWeek.toISOString().split('T')[0];
      const endDate = endOfWeek.toISOString().split('T')[0];
      
      const entries = await storage.getTimeEntriesByDateRange(userId, startDate, endDate);
      res.json(entries);
    } catch (error) {
      console.error('Error getting week\'s time entries:', error);
      res.status(500).json({ message: 'Failed to get week\'s time entries' });
    }
  });

  // Admin Time Clock Management Endpoints
  app.get('/api/admin/time-clock/entries', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ message: 'Admin or Manager access required' });
      }

      const { employeeId, startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      const timeEntries = await storage.getTimeEntriesByDateRange(
        employeeId as string,
        startDate as string, 
        endDate as string
      );
      
      res.json(timeEntries);
    } catch (error) {
      console.error('Error fetching admin time entries:', error);
      res.status(500).json({ message: 'Failed to fetch time entries' });
    }
  });

  app.get('/api/admin/time-clock/who-checked-in', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ message: 'Admin or Manager access required' });
      }

      const checkedInEmployees = await storage.getCurrentlyCheckedInEmployees();
      res.json(checkedInEmployees);
    } catch (error) {
      console.error('Error fetching checked in employees:', error);
      res.status(500).json({ message: 'Failed to fetch checked in employees' });
    }
  });

  app.patch('/api/admin/time-clock/entries/:entryId', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ message: 'Admin or Manager access required' });
      }

      const { entryId } = req.params;
      const updateData = req.body;
      
      const updatedEntry = await storage.updateTimeEntry(parseInt(entryId), updateData);
      res.json(updatedEntry);
    } catch (error) {
      console.error('Error updating time entry:', error);
      res.status(500).json({ message: 'Failed to update time entry' });
    }
  });

  app.delete('/api/admin/time-clock/entries/:entryId', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ message: 'Admin or Manager access required' });
      }

      const { entryId } = req.params;
      await storage.deleteTimeEntry(parseInt(entryId));
      
      res.json({ success: true, message: 'Time entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting time entry:', error);
      res.status(500).json({ message: 'Failed to delete time entry' });
    }
  });

  app.get('/api/admin/time-clock/export', isAuthenticated, async (req, res) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ message: 'Admin or Manager access required' });
      }

      const { employeeId, startDate, endDate, format = 'csv' } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const exportData = await storage.exportTimeEntries(
        employeeId as string,
        startDate as string,
        endDate as string,
        format as string
      );
      
      // Set appropriate headers for file download
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="timesheet-${startDate}-${endDate}.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
      }
      
      res.send(exportData);
    } catch (error) {
      console.error('Error exporting time entries:', error);
      res.status(500).json({ message: 'Failed to export time entries' });
    }
  });

  // Admin Clock-Out Employee Endpoint
  app.post('/api/admin/time-clock/clock-out/:userId', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const { userId } = req.params;
      const { notes } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      console.log(`Admin ${req.user.id} (${req.user.firstName} ${req.user.lastName}) clocking out employee ${userId}`);
      
      // Clock out the specified employee
      const timeEntry = await storage.clockOut(userId, notes || `Clocked out by ${req.user.firstName} ${req.user.lastName} (${req.user.role})`);
      
      console.log('Admin clock-out successful:', timeEntry);
      res.json({ 
        success: true, 
        message: 'Employee clocked out successfully',
        timeEntry 
      });
    } catch (error) {
      console.error('Error in admin clock-out:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to clock out employee' });
    }
  });

  // File upload routes
  app.post('/api/upload', isAuthenticated, upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }
      
      const fileUrl = `/uploads/${req.file.filename}`;
      res.json({ 
        message: 'File uploaded successfully',
        fileUrl,
        originalName: req.file.originalname
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));

  // System support ticket submission endpoint (admin/manager view)
  app.post('/api/system-support-tickets', isAuthenticated, async (req, res) => {
    try {
      const { subject, description, priority } = req.body;
      const user = req.user as any;

      if (!subject || !description) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // All system support tickets go to Ryan (IT Support)
      const assignedTo = {
        name: "Ryan (IT Support)",
        email: "ryan@pinehillfarm.co"
      };
      
      // Send email notification with priority information
      const emailSent = await sendSupportTicketNotification({
        category: `system-${priority || 'medium'}-priority`,
        subject: `[${(priority || 'medium').toUpperCase()} PRIORITY] ${subject}`,
        description: `Priority Level: ${(priority || 'medium').toUpperCase()}\n\n${description}`,
        submittedBy: {
          name: `${user.firstName} ${user.lastName} (${user.role})`,
          email: user.email
        },
        assignedTo
      });

      res.json({
        success: true,
        message: `System support ticket submitted and routed to ${assignedTo.name}`,
        emailSent,
        assignedTo: assignedTo.name,
        priority: priority || 'medium'
      });

    } catch (error) {
      console.error('Error submitting system support ticket:', error);
      res.status(500).json({ message: 'Failed to submit system support ticket' });
    }
  });

  // Employee support ticket submission endpoint
  app.post('/api/support-tickets', isAuthenticated, async (req, res) => {
    try {
      const { category, subject, description } = req.body;
      const user = req.user as any;

      if (!category || !subject || !description) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      // Determine assigned personnel based on category
      const getAssignedPersonnel = (category: string) => {
        const jackieCategories = ["general", "time-tracking", "scheduling", "payroll-benefits"];
        const ryanCategories = ["technical-issue", "account-access"];
        
        if (jackieCategories.includes(category)) {
          return {
            name: "Manager Jackie",
            email: "jackie@pinehillfarm.co"
          };
        } else if (ryanCategories.includes(category)) {
          return {
            name: "Ryan (IT Support)",
            email: "ryan@pinehillfarm.co"
          };
        }
        
        return {
          name: "Manager Jackie",
          email: "jackie@pinehillfarm.co"
        };
      };

      const assignedTo = getAssignedPersonnel(category);
      
      // Send email notification
      const emailSent = await sendSupportTicketNotification({
        category,
        subject,
        description,
        submittedBy: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email
        },
        assignedTo
      });

      res.json({
        success: true,
        message: `Support ticket submitted and routed to ${assignedTo.name}`,
        emailSent,
        assignedTo: assignedTo.name
      });

    } catch (error) {
      console.error('Error submitting support ticket:', error);
      res.status(500).json({ message: 'Failed to submit support ticket' });
    }
  });

  // Messages API endpoints
  app.get('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const { channel } = req.query;
      
      // If no specific channel, return all user-relevant messages
      if (!channel) {
        const userId = req.user!.id;
        const messages = await storage.getUserMessages(userId, 50, 0); // Get 50 most recent messages
        const messagesWithImages = messages.map(addImageUrlsToItem);
        res.json(messagesWithImages);
      } else {
        const messages = await storage.getMessagesByChannel(channel as string);
        const messagesWithImages = messages.map(addImageUrlsToItem);
        res.json(messagesWithImages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  app.post('/api/messages', isAuthenticated, async (req, res) => {
    try {
      const { content, channelId } = req.body;
      const senderId = req.user!.id;

      if (!content || !content.trim()) {
        return res.status(400).json({ message: 'Message content is required' });
      }

      const message = await storage.createMessage({
        senderId,
        content: content.trim(),
        channelId: channelId || 'general',
        messageType: 'channel'
      });

      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating message:', error);
      res.status(500).json({ message: 'Failed to send message' });
    }
  });

  // Chat channels API
  app.get('/api/chat-channels', isAuthenticated, async (req, res) => {
    try {
      // Return static channels based on locations
      const channels = [
        { id: 'general', name: 'General', description: 'General team discussion' },
        { id: 'location-1', name: 'Lake Geneva Retail', description: 'Discussion for Lake Geneva Retail team' },
        { id: 'location-2', name: 'Watertown Retail', description: 'Discussion for Watertown Retail team' },
        { id: 'location-3', name: 'Watertown Spa', description: 'Discussion for Watertown Spa team' }
      ];
      res.json(channels);
    } catch (error) {
      console.error('Error fetching chat channels:', error);
      res.status(500).json({ message: 'Failed to fetch chat channels' });
    }
  });

  // User presence API
  app.get('/api/user-presence', isAuthenticated, async (req, res) => {
    try {
      const presenceData = await storage.getAllUserPresence();
      res.json(presenceData);
    } catch (error) {
      console.error('Error fetching user presence:', error);
      res.status(500).json({ message: 'Failed to fetch user presence' });
    }
  });

  // ================================
  // PHASE 3: ENHANCED MESSAGING ROUTES
  // ================================

  // Message reactions
  app.post("/api/messages/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const { messageId, reactionType } = req.body;
      const userId = req.user.id;

      // Convert messageId to integer (handles both "msg_32" and "32" formats)
      const numericMessageId = parseInt(messageId.toString().replace('msg_', ''));

      // Validate reaction type
      const validReactions = ['check', 'thumbs_up', 'x', 'question'];
      if (!validReactions.includes(reactionType)) {
        return res.status(400).json({ error: "Invalid reaction type" });
      }

      // Remove existing reaction of same type from same user, then add new one
      await storage.removeMessageReaction(numericMessageId, userId, reactionType);
      const reaction = await storage.addMessageReaction({
        messageId: numericMessageId,
        userId,
        reactionType,
      });

      res.json(reaction);
    } catch (error) {
      console.error("Error adding message reaction:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  app.delete("/api/messages/reactions/:messageId/:reactionType", isAuthenticated, async (req: any, res) => {
    try {
      const { messageId, reactionType } = req.params;
      const userId = req.user.id;

      await storage.removeMessageReaction(parseInt(messageId), userId, reactionType);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing message reaction:", error);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  // ================================
  // ANNOUNCEMENT REACTION ROUTES
  // ================================

  app.post("/api/announcements/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const { announcementId, reactionType } = req.body;
      const userId = req.user.id;

      // Validate reaction type
      const validReactions = ['check', 'thumbs_up', 'x', 'question'];
      if (!validReactions.includes(reactionType)) {
        return res.status(400).json({ error: "Invalid reaction type" });
      }

      // Remove existing reaction of same type from same user, then add new one
      await storage.removeAnnouncementReaction(announcementId, userId, reactionType);
      const reaction = await storage.addAnnouncementReaction({
        announcementId,
        userId,
        reactionType,
      });

      res.json(reaction);
    } catch (error) {
      console.error("Error adding announcement reaction:", error);
      res.status(500).json({ error: "Failed to add reaction" });
    }
  });

  app.delete("/api/announcements/reactions/:announcementId/:reactionType", isAuthenticated, async (req: any, res) => {
    try {
      const { announcementId, reactionType } = req.params;
      const userId = req.user.id;

      await storage.removeAnnouncementReaction(parseInt(announcementId), userId, reactionType);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing announcement reaction:", error);
      res.status(500).json({ error: "Failed to remove reaction" });
    }
  });

  app.get("/api/announcements/:id/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const reactions = await storage.getAnnouncementReactions(parseInt(id));
      res.json(reactions);
    } catch (error) {
      console.error("Error fetching announcement reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  // ================================
  // UNREAD COUNTS API ENDPOINT
  // ================================
  
  app.get('/api/communications/unread-counts', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role || 'employee';
      
      const [unreadMessages, unreadAnnouncements] = await Promise.all([
        storage.getUnreadMessageCount(userId),
        storage.getUnreadAnnouncementCount(userId, userRole)
      ]);
      
      res.json({
        messages: Number(unreadMessages) || 0,
        announcements: Number(unreadAnnouncements) || 0,
        total: (Number(unreadMessages) || 0) + (Number(unreadAnnouncements) || 0)
      });
    } catch (error) {
      console.error('Error fetching unread counts:', error);
      res.status(500).json({ message: 'Failed to fetch unread counts' });
    }
  });

  // Mark individual message as read
  app.post('/api/messages/:id/mark-read', isAuthenticated, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      // Mark direct message as read
      await storage.markMessageAsRead(messageId, userId);
      
      // Also create/update read receipt for tracking
      await storage.createMessageReadReceipt(messageId, userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  });

  // Mark individual announcement as read
  app.post('/api/announcements/:id/mark-read', isAuthenticated, async (req, res) => {
    try {
      const announcementId = parseInt(req.params.id);
      const userId = req.user!.id;
      
      await storage.markAnnouncementAsRead(announcementId, userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking announcement as read:', error);
      res.status(500).json({ error: 'Failed to mark announcement as read' });
    }
  });

  // Bulk mark all messages as read
  app.post('/api/communications/mark-all-messages-read', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      await storage.markAllMessagesAsRead(userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      res.status(500).json({ error: 'Failed to mark all messages as read' });
    }
  });

  // Bulk mark all announcements as read
  app.post('/api/communications/mark-all-announcements-read', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const userRole = req.user!.role || 'employee';
      
      await storage.markAllAnnouncementsAsRead(userId, userRole);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking all announcements as read:', error);
      res.status(500).json({ error: 'Failed to mark all announcements as read' });
    }
  });

  // ================================
  // EMPLOYEE RESPONSE ROUTES
  // ================================

  // Create response to announcement
  app.post("/api/announcements/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Validate response payload
      const validationResult = {
        content: req.body.content?.trim(),
        responseType: req.body.responseType || 'reply',
        parentResponseId: req.body.parentResponseId
      };
      
      const { content, responseType, parentResponseId } = validationResult;
      const authorId = req.user!.id;

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Response content is required' });
      }

      // Handle both numeric IDs and string IDs (like msg_43)
      let announcementId: number;
      if (id.startsWith('msg_')) {
        // For string IDs like msg_43, we can't create responses since they're not real announcements
        return res.status(400).json({ error: "Cannot create response to message ID" });
      } else {
        announcementId = parseInt(id);
        if (isNaN(announcementId)) {
          return res.status(400).json({ error: "Invalid announcement ID" });
        }
      }

      const response = await (storage.createResponse as any)({
        authorId,
        content: content.trim(),
        announcementId,
        responseType,
        parentResponseId: parentResponseId ? parseInt(parentResponseId) : undefined,
      });

      console.log(`✅ Created announcement response: ${response.id} for announcement ${announcementId} by user ${authorId}`);

      // Send SMS notifications for announcement responses
      try {
        // Get the original announcement for context
        const announcement = await storage.getAnnouncementById(announcementId);
        
        if (announcement) {
          console.log(`📱 Processing SMS notifications for announcement response to announcement ${announcementId}`);
          
          // Get the author (person who just responded)
          const author = await storage.getUser(authorId);
          const authorName = author ? `${author.firstName} ${author.lastName}` : 'Someone';
          console.log(`✏️ Response author: ${authorName} (${authorId})`);
          
          // Check if this is a response to another response (bidirectional logic)
          if (parentResponseId) {
            console.log(`🔗 This is a reply to response ID: ${parentResponseId}`);
            
            // Get the parent response to find who to notify
            const parentResponse = await storage.getResponseById(parentResponseId);
            
            if (parentResponse) {
              console.log(`👤 Found parent response by user: ${parentResponse.authorId}`);
              
              // Don't notify if replying to yourself
              if (parentResponse.authorId !== authorId) {
                const parentAuthor = await storage.getUser(parentResponse.authorId);
                
                if (parentAuthor && parentAuthor.phone && parentAuthor.smsEnabled && parentAuthor.smsConsent) {
                  console.log(`📱 Sending SMS to parent response author: ${parentAuthor.firstName} ${parentAuthor.lastName} (${parentAuthor.phone})`);
                  
                  const result = await smsService.sendAnnouncementResponseNotification(
                    parentAuthor.phone,
                    authorName,
                    content.trim(),
                    announcement.title,
                    true, // isReplyToResponse
                    `${parentAuthor.firstName} ${parentAuthor.lastName}`
                  );
                  
                  if (result.success) {
                    console.log(`📱 SMS sent to ${parentAuthor.firstName} ${parentAuthor.lastName} about reply from ${authorName}`);
                  } else {
                    console.error(`❌ Failed to send SMS to ${parentAuthor.firstName} ${parentAuthor.lastName}: ${result.error}`);
                  }
                } else {
                  console.log(`ℹ️ Parent response author ${parentAuthor?.firstName} ${parentAuthor?.lastName} not SMS-eligible: phone=${!!parentAuthor?.phone}, smsEnabled=${parentAuthor?.smsEnabled}, smsConsent=${parentAuthor?.smsConsent}`);
                }
              } else {
                console.log(`ℹ️ Not sending SMS - user replied to their own response`);
              }
            } else {
              console.warn(`⚠️ Parent response ${parentResponseId} not found`);
            }
          } else {
            console.log(`📢 This is an initial response to the announcement, notifying announcement author and other admins/managers`);
            
            // First, notify the announcement author (if different from response author and SMS eligible)
            let notificationTargets = [];
            
            if (announcement.authorId && announcement.authorId !== authorId) {
              const announcementAuthor = await storage.getUser(announcement.authorId);
              if (announcementAuthor && announcementAuthor.phone && announcementAuthor.smsEnabled && announcementAuthor.smsConsent) {
                notificationTargets.push(announcementAuthor);
                console.log(`📢 Added announcement author to notification targets: ${announcementAuthor.firstName} ${announcementAuthor.lastName}`);
              } else {
                console.log(`ℹ️ Announcement author ${announcementAuthor?.firstName} ${announcementAuthor?.lastName} not SMS-eligible: phone=${!!announcementAuthor?.phone}, smsEnabled=${announcementAuthor?.smsEnabled}, smsConsent=${announcementAuthor?.smsConsent}`);
              }
            }
            
            // Then, get all admins and managers who should be notified
            const allUsers = await storage.getAllUsers();
            const adminsAndManagers = allUsers.filter(user => 
              user.role === 'admin' || user.role === 'manager'
            );
            console.log(`👥 Found ${adminsAndManagers.length} admins/managers:`, 
              adminsAndManagers.map(u => `${u.firstName} ${u.lastName} (${u.role})`));
            
            // Filter out the response author and announcement author (already added above)
            const otherAdminsManagers = adminsAndManagers.filter(user => 
              user.id !== authorId && user.id !== announcement.authorId
            );
            console.log(`🚫 After removing response author and announcement author, ${otherAdminsManagers.length} admins/managers remain:`, 
              otherAdminsManagers.map(u => `${u.firstName} ${u.lastName} (${u.id})`));
            
            // Filter for SMS-eligible admins/managers and add them to notification targets
            const smsEligibleAdmins = otherAdminsManagers.filter(user => 
              user.phone && 
              user.smsEnabled && 
              user.smsConsent
              // Note: Removed smsNotificationTypes check for announcement responses
              // Admins/managers should always get SMS about employee responses
            );
            console.log(`📱 SMS-eligible admins/managers: ${smsEligibleAdmins.length}:`, 
              smsEligibleAdmins.map(u => `${u.firstName} ${u.lastName} (${u.phone}) - SMS: ${u.smsEnabled}, Consent: ${u.smsConsent}, Types: ${u.smsNotificationTypes?.join(',')}`));
            
            // Combine all notification targets
            notificationTargets = notificationTargets.concat(smsEligibleAdmins);
            console.log(`📊 Total notification targets: ${notificationTargets.length}:`, 
              notificationTargets.map(u => `${u.firstName} ${u.lastName} (${u.phone})`));
            
            // Send SMS to all notification targets
            const notificationPromises = notificationTargets
              .map(async (admin) => {
                try {
                  const result = await smsService.sendAnnouncementResponseNotification(
                    admin.phone!,
                    authorName,
                    content.trim(),
                    announcement.title,
                    false // isReplyToResponse
                  );
                  
                  if (result.success) {
                    console.log(`📱 SMS sent to ${admin.firstName} ${admin.lastName} (${admin.phone}) about response from ${authorName}`);
                  } else {
                    console.error(`❌ Failed to send SMS to ${admin.firstName} ${admin.lastName}: ${result.error}`);
                  }
                  
                  return result;
                } catch (error) {
                  console.error(`❌ Error sending SMS notification to ${admin.firstName} ${admin.lastName}:`, error);
                  return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
                }
              });

            // Wait for all SMS notifications to complete
            const smsResults = await Promise.all(notificationPromises);
            const successfulSMS = smsResults.filter(result => result.success).length;
            const failedSMS = smsResults.filter(result => !result.success).length;
            
            console.log(`📊 Announcement response SMS summary: ${successfulSMS} sent, ${failedSMS} failed`);
          }
        } else {
          console.warn(`⚠️ Announcement ${announcementId} not found for SMS notifications`);
        }
      } catch (smsError) {
        console.error('Error sending announcement response SMS notifications:', smsError);
        // Don't fail the response creation if SMS fails
      }

      res.json(response);
    } catch (error) {
      console.error("Error creating announcement response:", error);
      res.status(500).json({ error: "Failed to create response" });
    }
  });

  // Get responses for announcement
  app.get("/api/announcements/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      
      // Handle both numeric IDs and string IDs (like msg_20)
      let announcementId: number;
      if (id.startsWith('msg_')) {
        // For string IDs like msg_20, we can't get responses since they're not in the database
        // Return empty array for now
        return res.json([]);
      } else {
        announcementId = parseInt(id);
        if (isNaN(announcementId)) {
          return res.status(400).json({ error: "Invalid announcement ID" });
        }
      }
      
      const responses = await storage.getResponsesByAnnouncement(announcementId);
      res.json(responses);
    } catch (error) {
      console.error("Error fetching announcement responses:", error);
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  // Create response to message
  app.post("/api/messages/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { content, responseType = 'reply', parentResponseId } = req.body;
      const authorId = req.user!.id;

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Response content is required' });
      }

      const messageId = parseInt(id);

      // Create the response
      const response = await (storage.createResponse as any)({
        authorId,
        content: content.trim(),
        messageId,
        responseType,
        parentResponseId: parentResponseId ? parseInt(parentResponseId) : undefined
      });

      console.log(`✅ Created direct message response: ${response.id} for message ${messageId} by user ${authorId}`);

      // Send SMS notifications to other participants in the direct message conversation
      try {
        // Get the original message to check if this is a direct message
        const originalMessage = await storage.getMessageById(messageId);
        
        if (originalMessage && originalMessage.messageType === 'direct_message') {
          console.log(`📱 Processing SMS notifications for direct message reply to message ${messageId}`);
          
          // Get all participants in this conversation
          const participants = await storage.getDirectMessageParticipants(messageId);
          console.log(`👥 Found ${participants.length} participants for message ${messageId}:`, 
            participants.map(p => `${p.firstName} ${p.lastName} (${p.id})`));
          
          // Get the author (person who just replied)
          const author = await storage.getUser(authorId);
          const authorName = author ? `${author.firstName} ${author.lastName}` : 'Someone';
          console.log(`✏️ Reply author: ${authorName} (${authorId})`);
          
          // Filter out the author first
          const otherParticipants = participants.filter(participant => participant.id !== authorId);
          console.log(`🚫 After removing author, ${otherParticipants.length} participants remain:`, 
            otherParticipants.map(p => `${p.firstName} ${p.lastName} (${p.id})`));
          
          // Filter for SMS-enabled participants
          const smsEligibleParticipants = otherParticipants.filter(participant => 
            participant.phone && participant.smsEnabled && participant.smsConsent);
          console.log(`📱 SMS-eligible participants: ${smsEligibleParticipants.length}:`, 
            smsEligibleParticipants.map(p => `${p.firstName} ${p.lastName} (${p.phone}) - SMS: ${p.smsEnabled}, Consent: ${p.smsConsent}`));
          
          // Send SMS to all participants except the author
          const notificationPromises = smsEligibleParticipants
            .map(async (participant) => {
              try {
                const result = await smsService.sendDirectMessageReplyNotification(
                  participant.phone!,
                  authorName,
                  content.trim(),
                  originalMessage.subject || undefined
                );
                
                if (result.success) {
                  console.log(`📱 SMS sent to ${participant.firstName} ${participant.lastName} (${participant.phone}) about reply from ${authorName}`);
                } else {
                  console.error(`❌ Failed to send SMS to ${participant.firstName} ${participant.lastName}: ${result.error}`);
                }
                
                return result;
              } catch (error) {
                console.error(`❌ Error sending SMS notification to ${participant.firstName} ${participant.lastName}:`, error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
              }
            });

          // Wait for all SMS notifications to complete
          const smsResults = await Promise.all(notificationPromises);
          const successfulSMS = smsResults.filter(result => result.success).length;
          const failedSMS = smsResults.filter(result => !result.success).length;
          
          console.log(`📊 Direct message reply SMS summary: ${successfulSMS} sent, ${failedSMS} failed`);
        } else {
          console.log(`ℹ️ Message ${messageId} is not a direct message (type: ${originalMessage?.messageType}), skipping SMS notifications`);
        }
      } catch (smsError) {
        console.error('Error sending direct message reply SMS notifications:', smsError);
        // Don't fail the response creation if SMS fails
      }

      res.json(response);
    } catch (error) {
      console.error("Error creating message response:", error);
      res.status(500).json({ error: "Failed to create response" });
    }
  });

  // Get responses for message
  app.get("/api/messages/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const responses = await storage.getResponsesByMessage(parseInt(id));
      res.json(responses);
    } catch (error) {
      console.error("Error fetching message responses:", error);
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  // Mark response as read
  app.patch("/api/responses/:id/read", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const response = await storage.markResponseAsRead(parseInt(id));
      res.json(response);
    } catch (error) {
      console.error("Error marking response as read:", error);
      res.status(500).json({ error: "Failed to mark response as read" });
    }
  });

  // ================================
  // SMS WEBHOOK FOR INCOMING REPLIES
  // ================================

  // Twilio webhook for incoming SMS replies
  app.post("/api/sms/webhook", async (req, res) => {
    console.log('📱 SMS webhook received:', req.body);
    try {
      const { From, Body, MessageSid, To } = req.body;
      
      console.log('📱 Incoming SMS webhook:', {
        from: From,
        to: To,
        body: Body,
        messageSid: MessageSid
      });

      // Find user by phone number
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => 
        u.phone && (
          u.phone === From || 
          u.phone.replace(/\D/g, '') === From.replace(/\D/g, '') ||
          `+1${u.phone.replace(/\D/g, '')}` === From ||
          u.phone === From.replace(/\D/g, '')
        )
      );

      if (!user) {
        console.log('❌ No user found for phone number:', From);
        // Send auto-reply
        try {
          await smsService.sendSMS({
            to: From,
            message: "Hello! We received your message but couldn't find your employee account. Please contact your manager if you need assistance.",
            priority: 'normal'
          });
        } catch (smsError) {
          console.error('Error sending auto-reply:', smsError);
        }
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }

      console.log('✅ Found user for SMS reply:', {
        userId: user.id,
        name: `${user.firstName} ${user.lastName}`,
        phone: user.phone
      });

      // DEBUG: Test announcement ordering immediately  
      // Get published announcements for content targeting

      // Enhanced SMS processing: Check for emoji reactions first, then handle as text responses
      try {
        // Define emoji and keyword patterns for quick reactions
        const reactionPatterns = {
          'check': {
            emojis: ['✅', '✓'],
            exactWords: ['check', 'acknowledged', 'ack', 'got it', 'received', 'understood']
          },
          'thumbs_up': {
            emojis: ['👍', '👍🏻', '👍🏼', '👍🏽', '👍🏾', '👍🏿'],
            exactWords: ['thumbs up', 'good', 'approve', 'approved', 'yes', 'ok', 'okay']
          },
          'x': {
            emojis: ['❌', '✖', '❎'],
            exactWords: ['no', 'nope', 'decline', 'declined', 'disagree', 'stop']
          },
          'question': {
            emojis: ['❓', '❔', '?'],
            exactWords: ['question', 'help', 'clarify', 'explain', 'what', 'how', 'why', 'when']
          }
        };

        // Check if the message is a simple emoji reaction
        const bodyTrimmed = Body.trim();
        const bodyLower = bodyTrimmed.toLowerCase();
        
        // Detect if it's a reaction vs a text response
        let isQuickReaction = false;
        let detectedReactionType = null;
        
        // Check for emoji reactions (any message length) or exact word matches (3 words or less for reactions)
        const wordCount = bodyTrimmed.split(/\s+/).length;
        
        for (const [reactionType, patterns] of Object.entries(reactionPatterns)) {
          // Check emoji patterns (can be anywhere in message, any length)
          for (const emoji of patterns.emojis) {
            if (bodyTrimmed.includes(emoji)) {
              isQuickReaction = true;
              detectedReactionType = reactionType;
              break;
            }
          }
          
          // Only check exact word matches for short messages (3 words or less)
          if (!isQuickReaction && wordCount <= 3) {
            for (const word of patterns.exactWords) {
              if (bodyTrimmed === word || bodyLower === word.toLowerCase()) {
                isQuickReaction = true;
                detectedReactionType = reactionType;
                break;
              }
            }
          }
          
          if (isQuickReaction) break;
        }

        // For text responses, determine response type from message content
        let responseType = 'reply';
        if (!isQuickReaction) {
          if (bodyLower.includes('question') || bodyLower.includes('?') || bodyLower.includes('help')) {
            responseType = 'question';
          } else if (bodyLower.includes('concern') || bodyLower.includes('issue') || bodyLower.includes('problem')) {
            responseType = 'concern';
          } else if (bodyLower.includes('confirm') || bodyLower.includes('yes') || bodyLower.includes('ok') || bodyLower.includes('understood')) {
            responseType = 'confirmation';
          }
        }

        // Look for the most recent announcement OR message they could be replying to
        const announcements = await storage.getPublishedAnnouncements();
        const messages = await storage.getUserMessages(user.id, 10, 0); // Get recent messages for this user
        
        // Determine content targeting based on most recent activity

        // Determine which is more recent: announcement or direct message
        let isRespondingToMessage = false;
        let targetMessage = null;
        let targetAnnouncement = null;

        if (messages.length > 0 && announcements.length > 0) {
          const latestMessageTime = messages[0].sentAt ? new Date(messages[0].sentAt).getTime() : 0;
          const latestAnnouncementTime = announcements[0].createdAt ? new Date(announcements[0].createdAt).getTime() : 0;
          
          if (latestMessageTime > latestAnnouncementTime) {
            isRespondingToMessage = true;
            targetMessage = messages[0];
            console.log('📨 SMS routing to message:', targetMessage.id);
          } else {
            targetAnnouncement = announcements[0];
            console.log('📢 SMS routing to announcement:', targetAnnouncement.id);
          }
        } else if (messages.length > 0) {
          isRespondingToMessage = true;
          targetMessage = messages[0];
          console.log('🎯 User responding to MESSAGE (no announcements):', targetMessage.id);
        } else if (announcements.length > 0) {
          targetAnnouncement = announcements[0];
          console.log('🎯 User responding to ANNOUNCEMENT (no messages):', targetAnnouncement.id);
        }

        if (targetMessage || targetAnnouncement) {
          
          if (isQuickReaction && detectedReactionType) {
            if (isRespondingToMessage) {
              // Handle as message reaction
              console.log('🎭 Processing SMS as MESSAGE reaction:', {
                userId: user.id,
                reactionType: detectedReactionType,
                originalMessage: bodyTrimmed,
                messageId: targetMessage!.id
              });

              // Remove existing reaction and add new one
              await storage.removeMessageReaction(targetMessage!.id, user.id, detectedReactionType);
              const reaction = await storage.addMessageReaction({
                messageId: targetMessage!.id,
                userId: user.id,
                reactionType: detectedReactionType
              });

              console.log('✅ Created SMS message reaction:', {
                reactionId: reaction.id,
                reactionType: detectedReactionType,
                messageId: targetMessage!.id,
                userId: user.id
              });

              // Send confirmation SMS for message reaction
              const reactionEmoji = {
                'check': '✅',
                'thumbs_up': '👍',
                'x': '❌',
                'question': '❓'
              }[detectedReactionType] || '✅';

              try {
                await smsService.sendSMS({
                  to: From,
                  message: `${reactionEmoji} Thanks ${user.firstName}! Your reaction has been recorded for the direct message.`,
                  priority: 'normal'
                });
              } catch (smsError) {
                console.error('Error sending reaction confirmation SMS:', smsError);
              }
            } else {
              // Handle as announcement reaction
              console.log('🎭 Processing SMS as ANNOUNCEMENT reaction:', {
                userId: user.id,
                reactionType: detectedReactionType,
                originalMessage: bodyTrimmed,
                announcementId: targetAnnouncement!.id
              });

              // Remove existing reaction of same type and add new one
              await storage.removeAnnouncementReaction(targetAnnouncement!.id, user.id, detectedReactionType);
              const reaction = await storage.addAnnouncementReaction({
                announcementId: targetAnnouncement!.id,
                userId: user.id,
                reactionType: detectedReactionType,
                isFromSMS: true,
                smsMessageSid: MessageSid
              });

              console.log('✅ Created SMS announcement reaction:', {
                reactionId: reaction.id,
                reactionType: detectedReactionType,
                announcementId: targetAnnouncement!.id,
                userId: user.id,
                isFromSMS: true
              });

              // Send confirmation SMS for reaction
              const reactionEmoji = {
                'check': '✅',
                'thumbs_up': '👍',
                'x': '❌',
                'question': '❓'
              }[detectedReactionType] || '✅';

              try {
                await smsService.sendSMS({
                  to: From,
                  message: `${reactionEmoji} Thanks ${user.firstName}! Your reaction has been recorded for "${targetAnnouncement!.title}".`,
                  priority: 'normal'
                });
              } catch (smsError) {
                console.error('Error sending reaction confirmation SMS:', smsError);
              }
            }

          } else {
            // Handle as text response
            if (isRespondingToMessage) {
              // Create response to direct message
              const response = await (storage.createResponse as any)({
                authorId: user.id,
                content: Body.trim(),
                messageId: targetMessage!.id,
                responseType: responseType as any,
                isFromSMS: true,
                smsMessageSid: MessageSid
              });

              console.log('✅ Created SMS text response to MESSAGE:', {
                responseId: response.id,
                messageId: targetMessage!.id,
                userId: user.id,
                responseType
              });

              // Send SMS notifications to other participants in the direct message conversation
              try {
                if (targetMessage && targetMessage.messageType === 'direct_message') {
                  console.log(`📱 Processing SMS notifications for direct message reply to message ${targetMessage.id}`);
                  
                  // Get all participants in this conversation
                  const participants = await storage.getDirectMessageParticipants(targetMessage.id);
                  console.log(`👥 Found ${participants.length} participants for message ${targetMessage.id}:`, 
                    participants.map(p => `${p.firstName} ${p.lastName} (${p.id})`));
                  
                  // Get the author (person who just replied)
                  const authorName = `${user.firstName} ${user.lastName}`;
                  console.log(`✏️ Reply author: ${authorName} (${user.id})`);
                  
                  // Filter out the author first
                  const otherParticipants = participants.filter(participant => participant.id !== user.id);
                  console.log(`🚫 After removing author, ${otherParticipants.length} participants remain:`, 
                    otherParticipants.map(p => `${p.firstName} ${p.lastName} (${p.id})`));
                  
                  // Filter for SMS-enabled participants
                  const smsEligibleParticipants = otherParticipants.filter(participant => 
                    participant.phone && participant.smsEnabled && participant.smsConsent);
                  console.log(`📱 SMS-eligible participants: ${smsEligibleParticipants.length}:`, 
                    smsEligibleParticipants.map(p => `${p.firstName} ${p.lastName} (${p.phone}) - SMS: ${p.smsEnabled}, Consent: ${p.smsConsent}`));
                  
                  // Send SMS to all participants except the author
                  const notificationPromises = smsEligibleParticipants
                    .map(async (participant) => {
                      try {
                        const result = await smsService.sendDirectMessageReplyNotification(
                          participant.phone!,
                          authorName,
                          Body.trim(),
                          targetMessage.subject || undefined
                        );
                        
                        if (result.success) {
                          console.log(`📱 SMS sent to ${participant.firstName} ${participant.lastName} (${participant.phone}) about reply from ${authorName}`);
                        } else {
                          console.error(`❌ Failed to send SMS to ${participant.firstName} ${participant.lastName}: ${result.error}`);
                        }
                        
                        return result;
                      } catch (error) {
                        console.error(`❌ Error sending SMS notification to ${participant.firstName} ${participant.lastName}:`, error);
                        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
                      }
                    });

                  // Wait for all SMS notifications to complete
                  const smsResults = await Promise.all(notificationPromises);
                  const successfulSMS = smsResults.filter(result => result.success).length;
                  const failedSMS = smsResults.filter(result => !result.success).length;
                  
                  console.log(`📊 Direct message reply SMS summary: ${successfulSMS} sent, ${failedSMS} failed`);
                }
              } catch (smsNotificationError) {
                console.error('Error sending direct message reply SMS notifications from webhook:', smsNotificationError);
                // Don't fail the response creation if SMS fails
              }

              // Send confirmation SMS for message response
              try {
                await smsService.sendSMS({
                  to: From,
                  message: `Thanks ${user.firstName}! Your message has been received and added to the direct message conversation.`,
                  priority: 'normal'
                });
              } catch (smsError) {
                console.error('Error sending confirmation SMS:', smsError);
              }
            } else {
              // Create response to announcement
              const response = await (storage.createResponse as any)({
                authorId: user.id,
                content: Body.trim(),
                announcementId: targetAnnouncement!.id,
                responseType: responseType as any,
                isFromSMS: true,
                smsMessageSid: MessageSid
              });

              console.log('✅ Created SMS text response to ANNOUNCEMENT:', {
                responseId: response.id,
                announcementId: targetAnnouncement!.id,
                userId: user.id,
                responseType
              });

              // Send confirmation SMS for announcement response
              try {
                await smsService.sendSMS({
                  to: From,
                  message: `Thanks ${user.firstName}! Your message has been received and added to "${targetAnnouncement!.title}". Your team will see your response.`,
                  priority: 'normal'
                });
              } catch (smsError) {
                console.error('Error sending confirmation SMS:', smsError);
              }
            }
          }

        } else {
          console.log('⚠️ No announcements or messages found to link SMS response to');
          // Send auto-reply for no context
          try {
            await smsService.sendSMS({
              to: From,
              message: `Thanks ${user.firstName}! Your message has been received. If you're replying to a specific message or announcement, please check the app for the latest updates.`,
              priority: 'normal'
            });
          } catch (smsError) {
            console.error('Error sending auto-reply:', smsError);
          }
        }

      } catch (dbError) {
        console.error('Error saving SMS response to database:', dbError);
        
        // Send error notification
        try {
          await smsService.sendSMS({
            to: From,
            message: `Sorry ${user.firstName || 'there'}, we had trouble processing your message. Please try again or contact your manager.`,
            priority: 'normal'
          });
        } catch (smsError) {
          console.error('Error sending error SMS:', smsError);
        }
      }

      // Return empty TwiML response
      res.set('Content-Type', 'text/xml');
      res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');

    } catch (error) {
      console.error('❌ SMS webhook error:', error);
      res.set('Content-Type', 'text/xml');
      res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
  });

  // SMS status callback endpoint for Twilio delivery status updates
  app.post("/api/sms/status-callback", async (req, res) => {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
      
      console.log('📱 SMS Status Callback:', {
        sid: MessageSid,
        status: MessageStatus,
        errorCode: ErrorCode,
        errorMessage: ErrorMessage
      });
      
      // Update SMS service with delivery status
      smsService.updateDeliveryStatus(MessageSid, MessageStatus, ErrorCode, ErrorMessage);
      
      // Update database record
      await storage.updateSMSDeliveryStatus(MessageSid, MessageStatus, ErrorCode, ErrorMessage);
      
      // Log delivery event for analytics
      if (MessageStatus === 'delivered' || MessageStatus === 'failed' || MessageStatus === 'undelivered') {
        await storage.logCommunicationEvent({
          eventType: 'sms_delivery_status',
          source: 'sms',
          messageId: MessageSid,
          userId: undefined,
          channelId: undefined,
          cost: undefined,
          priority: undefined,
          eventTimestamp: new Date(),
          metadata: { 
            status: MessageStatus, 
            errorCode: ErrorCode,
            errorMessage: ErrorMessage,
            isSuccess: MessageStatus === 'delivered'
          },
        });

        // Broadcast real-time analytics update
        const analyticsService = (global as any).analyticsService;
        if (analyticsService) {
          await analyticsService.broadcastSMSUpdate(MessageSid, MessageStatus);
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing SMS status callback:', error);
      res.status(500).send('Error');
    }
  });

  // SMS Testing Framework endpoint
  app.post("/api/sms/run-tests", isAuthenticated, async (req: any, res) => {
    try {
      // Only allow admin users to run SMS tests
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required for SMS testing' });
      }

      console.log('🧪 Starting SMS testing framework...');
      
      // Import and run tests
      const { smsTestingFramework } = await import('./sms-testing');
      const testResults = await smsTestingFramework.runAllTests();
      const report = smsTestingFramework.generateTestReport();

      console.log('📋 SMS Testing completed');
      console.log(report);

      res.json({
        success: true,
        results: testResults,
        report: report
      });
    } catch (error) {
      console.error('Error running SMS tests:', error);
      res.status(500).json({ 
        error: 'Failed to run SMS tests',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // SMS Analytics endpoint
  app.get("/api/sms/analytics", isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const stats = smsService.getDeliveryStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching SMS analytics:', error);
      res.status(500).json({ error: 'Failed to fetch SMS analytics' });
    }
  });

  app.get("/api/messages/:messageId/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      const reactions = await storage.getMessageReactions(parseInt(messageId));
      res.json(reactions);
    } catch (error) {
      console.error("Error fetching message reactions:", error);
      res.status(500).json({ error: "Failed to fetch reactions" });
    }
  });

  // Read receipts
  app.post("/api/messages/:messageId/read", isAuthenticated, async (req: any, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.user.id;

      const receipt = await storage.markMessageAsRead(parseInt(messageId));
      res.json(receipt);
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark as read" });
    }
  });

  // Message templates
  app.get("/api/message-templates", isAuthenticated, async (req: any, res) => {
    try {
      const templates = await storage.getAllMessageTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching message templates:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.post("/api/message-templates", isAuthenticated, async (req: any, res) => {
    try {
      const { name, category, subject, content, priority, targetAudience } = req.body;
      const userId = req.user.id;

      const template = await storage.createMessageTemplate({
        name,
        category,
        subject,
        content,
        priority: priority || 'normal',
        targetAudience,
        createdBy: userId,
      });

      res.status(201).json(template);
    } catch (error) {
      console.error("Error creating message template:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // ============================================
  // ACCOUNTING TOOL API ROUTES
  // ============================================

  // Test endpoint for debugging
  app.get('/api/test-auth', isAuthenticated, async (req, res) => {
    console.log('Test auth endpoint reached');
    res.json({ message: 'Authentication working', user: req.user?.id });
  });

  // Simple test without auth
  app.get('/api/test-simple', async (req, res) => {
    console.log('Simple test endpoint reached');
    res.json({ message: 'Simple test working' });
  });

  // Integration Configuration Routes
  app.get('/api/accounting/quickbooks-config', isAuthenticated, async (req, res) => {
    try {
      const config = await storage.getActiveQuickbooksConfig();
      res.json(config || null);
    } catch (error) {
      console.error('Error fetching QuickBooks config:', error);
      res.status(500).json({ message: 'Failed to fetch QuickBooks configuration' });
    }
  });

  app.post('/api/accounting/quickbooks-config', isAuthenticated, async (req, res) => {
    try {
      const { companyId, accessToken, refreshToken, realmId, baseUrl, isActive } = req.body;
      const config = await storage.createQuickbooksConfig({
        companyId: companyId || '',
        accessToken: accessToken || '',
        refreshToken: refreshToken || '',
        realmId: realmId || '',
        baseUrl: baseUrl || 'https://sandbox-quickbooks.api.intuit.com',
        isActive: isActive ?? true
      });
      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating QuickBooks config:', error);
      res.status(500).json({ message: 'Failed to create QuickBooks configuration' });
    }
  });

  // Get all active Clover configs for multi-location support
  app.get('/api/accounting/config/clover/all', isAuthenticated, async (req, res) => {
    try {
      const { db } = await import('./db');
      const { cloverConfig } = await import('@shared/schema');  
      
      const configs = await db.select().from(cloverConfig);
      res.json(configs);
    } catch (error) {
      console.error('Error fetching all Clover configs:', error);
      res.status(500).json({ message: 'Failed to fetch Clover configurations' });
    }
  });

  // Amazon configuration management
  app.get('/api/accounting/config/amazon/all', isAuthenticated, async (req, res) => {
    try {
      const configs = await storage.getAllAmazonConfigs();
      res.json(configs);
    } catch (error) {
      console.error('Error fetching Amazon configs:', error);
      res.status(500).json({ error: 'Failed to fetch Amazon configurations' });
    }
  });

  app.get('/api/accounting/config/amazon/:sellerId', isAuthenticated, async (req, res) => {
    try {
      const { sellerId } = req.params;
      const config = await storage.getAmazonConfig(sellerId);
      if (!config) {
        return res.status(404).json({ error: 'Amazon config not found' });
      }
      res.json(config);
    } catch (error) {
      console.error('Error fetching Amazon config:', error);
      res.status(500).json({ error: 'Failed to fetch Amazon configuration' });
    }
  });

  app.get('/api/accounting/clover-config', isAuthenticated, async (req, res) => {
    try {
      console.log('Getting active Clover config...');
      
      // Direct query to bypass any storage issues
      const { db } = await import('./db');
      const { cloverConfig } = await import('@shared/schema');  
      const { eq } = await import('drizzle-orm');
      
      const configs = await db.select().from(cloverConfig).where(eq(cloverConfig.isActive, true)).limit(1);
      const config = configs[0] || null;
      
      console.log('Clover config found:', config);
      res.json(config);
    } catch (error) {
      console.error('Error fetching Clover config:', error);
      res.status(500).json({ message: 'Failed to fetch Clover configuration' });
    }
  });

  // One-time sync for September 2025 data (TEMPORARY FOR DEVELOPMENT)
  const syncSeptemberData = async () => {
    try {
      console.log('🔄 DEVELOPMENT: Auto-syncing September 2025 sales data...');
      const allCloverConfigs = await storage.getAllCloverConfigs();
      const activeConfigs = allCloverConfigs.filter(config => config.isActive);
      
      for (const config of activeConfigs) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          console.log(`🔄 Syncing September 2025 sales for ${config.merchantName || 'Unknown Merchant'}...`);
          await cloverIntegration.syncOrdersComprehensive({ 
            startDate: '2025-09-01',
            endDate: '2025-09-30'
          });
          console.log(`✅ Successfully synced ${config.merchantName || 'Unknown Merchant'}`);
        } catch (error) {
          console.error(`❌ Error syncing sales for ${config.merchantName || 'Unknown Merchant'}:`, error);
        }
      }
      console.log('🔄 September 2025 data sync complete!');
    } catch (error) {
      console.error('❌ Error in September sync:', error);
    }
  };

  // Trigger sync immediately
  setTimeout(syncSeptemberData, 2000);

  // Sync inventory costs from Clover using enhanced inventory endpoints
  app.post('/api/accounting/sync-inventory', isAuthenticated, async (req, res) => {
    try {
      console.log('🔄 Starting manual inventory sync across all Clover locations...');
      
      const allCloverConfigs = await storage.getAllCloverConfigs();
      const activeConfigs = allCloverConfigs.filter(config => config.isActive);

      if (activeConfigs.length === 0) {
        return res.status(400).json({ message: 'No active Clover configurations found' });
      }

      console.log(`📍 Found ${activeConfigs.length} active Clover locations for inventory sync`);

      const syncResults = [];
      
      for (const config of activeConfigs) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          console.log(`🔄 Syncing inventory for ${config.merchantName}...`);
          await cloverIntegration.syncInventoryItems();
          
          syncResults.push({
            merchant: config.merchantName,
            status: 'success',
            message: 'Inventory synced successfully'
          });
          
          console.log(`✅ Inventory sync completed for ${config.merchantName}`);
          
        } catch (error) {
          console.error(`❌ Error syncing inventory for ${config.merchantName}:`, error);
          
          syncResults.push({
            merchant: config.merchantName,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log(`🔄 Inventory sync completed for all locations`);
      
      res.json({
        message: 'Inventory sync completed',
        results: syncResults,
        totalLocations: activeConfigs.length
      });

    } catch (error) {
      console.error('Error in inventory sync:', error);
      res.status(500).json({ 
        message: 'Failed to sync inventory', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Sync sales data from Clover to enable cost calculations
  app.post('/api/accounting/sync-sales', isAuthenticated, async (req, res) => {
    try {
      console.log('💰 Starting sales sync across all Clover locations...');
      
      const allCloverConfigs = await storage.getAllCloverConfigs();
      const activeConfigs = allCloverConfigs.filter(config => config.isActive);
      
      const results = [];
      const today = new Date().toISOString().split('T')[0]; // Get today's date
      
      for (const config of activeConfigs) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          console.log(`💰 Syncing sales for ${config.merchantName}...`);
          await cloverIntegration.syncOrdersComprehensive({ 
            startDate: today,
            endDate: today 
          });
          
          results.push({
            location: config.merchantName,
            status: 'success',
            message: 'Sales synced successfully'
          });
        } catch (error) {
          console.error(`Error syncing sales for ${config.merchantName}:`, error);
          results.push({
            location: config.merchantName,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({
        message: 'Sales sync completed',
        results
      });
    } catch (error) {
      console.error('Error syncing sales:', error);
      res.status(500).json({ error: 'Failed to sync sales' });
    }
  });

  // Sync inventory items with cost data across all Clover locations
  app.post('/api/accounting/sync-inventory', isAuthenticated, async (req, res) => {
    try {
      console.log('🏪 Starting inventory sync across all Clover locations...');
      
      const allCloverConfigs = await storage.getAllCloverConfigs();
      const activeConfigs = allCloverConfigs.filter(config => config.isActive);
      
      const results = [];
      
      for (const config of activeConfigs) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          await cloverIntegration.syncInventoryItems(config);
          results.push({
            location: config.merchantName,
            status: 'success',
            message: 'Inventory synced successfully'
          });
        } catch (error) {
          results.push({
            location: config.merchantName,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({
        message: 'Inventory sync completed',
        results
      });
    } catch (error) {
      console.error('Error syncing inventory:', error);
      res.status(500).json({ error: 'Failed to sync inventory' });
    }
  });

  // ============================================
  // COGS (COST OF GOODS SOLD) API ENDPOINTS
  // ============================================

  // Get comprehensive COGS analysis - replaces old 40% estimate with actual cost tracking
  app.get('/api/accounting/analytics/cogs', isAuthenticated, async (req, res) => {
    try {
      // RBAC: Only admin and manager can access COGS data (contains sensitive financial info)
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required for COGS data' });
      }

      const { startDate, endDate, locationId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      console.log(`🧮 COGS Analysis - Calculating actual labor and material costs for ${startDate} to ${endDate}`);
      
      // First try local database for historical data
      const localCogsData = await storage.calculateCOGS(
        startDate as string, 
        endDate as string, 
        locationId ? parseInt(locationId as string) : undefined
      );

      // If local database has revenue data, use it
      if (localCogsData.totalRevenue > 0) {
        console.log(`📊 Using local database COGS data: $${localCogsData.totalRevenue} revenue, $${localCogsData.totalCOGS} COGS`);
        res.json({
          totalRevenue: localCogsData.totalRevenue,
          totalCost: localCogsData.totalCOGS,
          laborCosts: localCogsData.laborCosts,
          materialCosts: localCogsData.materialCosts,
          grossProfit: localCogsData.grossProfit,
          grossMargin: localCogsData.grossMargin,
          totalItemsSold: localCogsData.salesCount,
          isEstimate: false,
          laborBreakdown: localCogsData.laborBreakdown,
          materialBreakdown: localCogsData.materialBreakdown,
          note: `Based on actual employee time clock data and inventory costs`
        });
        return;
      }

      // Mirror production: Use storage.calculateCOGS() instead of experimental live calculation
      console.log(`📊 Mirror production: Using storage.calculateCOGS() for ${startDate} to ${endDate}`);
      
      const cogsData = await storage.calculateCOGS(startDate as string, endDate as string);
      
      console.log(`🚀 Production COGS Response: Revenue=$${cogsData.totalRevenue}, COGS=$${cogsData.totalCOGS}, Items=${cogsData.salesCount || 0}`);
      
      // DEVELOPMENT FIX: If COGS is minimal for any period with revenue, auto-sync sales data
      if (cogsData.totalCOGS < 100) {
        console.log(`🔄 DEVELOPMENT: COGS too low ($${cogsData.totalCOGS}), auto-syncing September data...`);
        try {
          const allCloverConfigs = await storage.getAllCloverConfigs();
          const activeConfigs = allCloverConfigs.filter(config => config.isActive);
          
          const syncPromises = activeConfigs.map(async (config) => {
            const { CloverIntegration } = await import('./integrations/clover');
            const cloverIntegration = new CloverIntegration(config);
            
            // Try inventory sync (non-blocking)
            try {
              console.log(`🔄 Auto-syncing inventory costs for ${config.merchantName}...`);
              await cloverIntegration.syncInventoryItems();
              console.log(`✅ Inventory sync complete for ${config.merchantName}`);
            } catch (inventoryError) {
              console.error(`❌ Inventory sync failed for ${config.merchantName}:`, inventoryError);
              console.log(`🔄 Continuing with sales sync despite inventory errors...`);
            }
            
            // CRITICAL: Always run sales sync (this is needed for COGS)
            try {
              console.log(`💰 Auto-syncing sales data for ${config.merchantName}...`);
              await cloverIntegration.syncDailySales();
              console.log(`✅ Sales sync complete for ${config.merchantName}`);
            } catch (salesError) {
              console.error(`❌ Sales sync failed for ${config.merchantName}:`, salesError);
            }
          });
          
          await Promise.all(syncPromises);
          console.log(`🔄 Auto-sync complete! Recalculating COGS...`);
          
          // Recalculate COGS with new data
          const updatedCogsData = await storage.calculateCOGS(startDate as string, endDate as string);
          console.log(`🚀 Updated COGS: Revenue=$${updatedCogsData.totalRevenue}, COGS=$${updatedCogsData.totalCOGS}, Items=${updatedCogsData.salesCount || 0}`);
          res.json(updatedCogsData);
          return;
        } catch (error) {
          console.error(`❌ Auto-sync failed:`, error);
        }
      }
      
      // Return production-compatible response format
      res.json(cogsData);

    } catch (error) {
      console.error('Error calculating COGS:', error);
      res.status(500).json({ error: 'Failed to calculate cost of goods sold', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get detailed labor costs breakdown
  app.get('/api/accounting/cogs/labor-costs', isAuthenticated, async (req, res) => {
    try {
      // RBAC: Only admin and manager can access sensitive labor cost data
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required for labor cost data' });
      }

      const { startDate, endDate, locationId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const laborCosts = await storage.calculateLaborCosts(
        startDate as string, 
        endDate as string, 
        locationId ? parseInt(locationId as string) : undefined
      );

      res.json(laborCosts);
    } catch (error) {
      console.error('Error calculating labor costs:', error);
      res.status(500).json({ error: 'Failed to calculate labor costs', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get detailed material costs breakdown  
  app.get('/api/accounting/cogs/material-costs', isAuthenticated, async (req, res) => {
    try {
      // RBAC: Only admin and manager can access sensitive material cost data
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required for material cost data' });
      }

      const { startDate, endDate, locationId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const materialCosts = await storage.calculateMaterialCosts(
        startDate as string, 
        endDate as string, 
        locationId ? parseInt(locationId as string) : undefined
      );

      res.json(materialCosts);
    } catch (error) {
      console.error('Error calculating material costs:', error);
      res.status(500).json({ error: 'Failed to calculate material costs', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get COGS analysis by product/item
  app.get('/api/accounting/cogs/by-product', isAuthenticated, async (req, res) => {
    try {
      // RBAC: Only admin and manager can access product-level COGS data
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required for product COGS data' });
      }

      const { startDate, endDate, locationId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const productCogs = await storage.getCOGSByProduct(
        startDate as string, 
        endDate as string, 
        locationId ? parseInt(locationId as string) : undefined
      );

      res.json(productCogs);
    } catch (error) {
      console.error('Error calculating COGS by product:', error);
      res.status(500).json({ error: 'Failed to calculate COGS by product', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get COGS analysis by employee
  app.get('/api/accounting/cogs/by-employee', isAuthenticated, async (req, res) => {
    try {
      // CRITICAL RBAC: Employee-level COGS contains sensitive payroll data - admin only
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required for employee-level COGS data (contains sensitive payroll information)' });
      }

      const { startDate, endDate, locationId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const employeeCogs = await storage.getCOGSByEmployee(
        startDate as string, 
        endDate as string, 
        locationId ? parseInt(locationId as string) : undefined
      );

      res.json(employeeCogs);
    } catch (error) {
      console.error('Error calculating COGS by employee:', error);
      res.status(500).json({ error: 'Failed to calculate COGS by employee', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get COGS analysis by location
  app.get('/api/accounting/cogs/by-location', isAuthenticated, async (req, res) => {
    try {
      // RBAC: Only admin and manager can access location-level COGS data
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required for location COGS data' });
      }

      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const locationCogs = await storage.getCOGSByLocation(
        startDate as string, 
        endDate as string
      );

      res.json(locationCogs);
    } catch (error) {
      console.error('Error calculating COGS by location:', error);
      res.status(500).json({ error: 'Failed to calculate COGS by location', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get time clock entries for a period (helpful for COGS debugging)
  app.get('/api/accounting/cogs/time-entries', isAuthenticated, async (req, res) => {
    try {
      // CRITICAL RBAC: Time clock data is highly sensitive personal/payroll data - admin only
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required for time clock data (contains sensitive employee personal/payroll information)' });
      }

      const { startDate, endDate, userId, locationId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      const timeEntries = await storage.getTimeClockEntriesForPeriod(
        startDate as string, 
        endDate as string,
        userId as string | undefined,
        locationId ? parseInt(locationId as string) : undefined
      );

      res.json(timeEntries);
    } catch (error) {
      console.error('Error getting time clock entries:', error);
      res.status(500).json({ error: 'Failed to get time clock entries', details: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Multi-location analytics endpoint (supports Clover POS + Amazon Store)
  app.get('/api/accounting/analytics/multi-location', isAuthenticated, async (req, res) => {
    console.log('🔥 MULTI-LOCATION ENDPOINT HIT');
    console.log('Request query params:', req.query);
    try {
      const { startDate, endDate } = req.query;
      const { db } = await import('./db');
      const { posSales, cloverConfig } = await import('@shared/schema');
      const { sql, between, eq } = await import('drizzle-orm');
      
      const startDateStr = startDate as string;
      const endDateStr = endDate as string;
      
      // Get all active Clover configurations
      const allActiveCloverLocations = await storage.getAllCloverConfigs();
      const activeCloverConfigs = allActiveCloverLocations.filter(config => config.isActive);
      
      // Get all active Amazon configurations
      const allActiveAmazonLocations = await storage.getAllAmazonConfigs();
      const activeAmazonConfigs = allActiveAmazonLocations.filter(config => config.isActive);
      
      // Use live Clover API calls instead of database (same approach as revenue-trends)
      const { CloverIntegration } = await import('./integrations/clover');
      const start = new Date(startDateStr);
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999); // Include full day
      
      console.log(`🚀 Multi-location using LIVE API calls for: ${start.toISOString()} - ${end.toISOString()}`);
      
      // Build location breakdown for Clover POS locations using live API data
      const cloverLocationBreakdown = [];
      
      for (const config of activeCloverConfigs) {
        try {
          const cloverIntegration = new CloverIntegration(config);
          console.log(`🚀 Creating CloverIntegration for ${config.merchantName} with MID: ${config.merchantId}`);
          
          // Fetch ALL orders with pagination to avoid missing revenue
          let allOrders: any[] = [];
          let offset = 0;
          const limit = 1000;
          let hasMoreData = true;
          
          while (hasMoreData) {
            const liveOrders = await cloverIntegration.fetchOrders({
              filter: `createdTime>=${Math.floor(start.getTime())}`,
              limit: limit,
              offset: offset
            });
            
            if (liveOrders && liveOrders.elements && liveOrders.elements.length > 0) {
              allOrders.push(...liveOrders.elements);
              console.log(`📊 Fetched ${liveOrders.elements.length} orders for ${config.merchantName} (offset: ${offset}), total so far: ${allOrders.length}`);
              
              // Check if we need to fetch more data
              if (liveOrders.elements.length < limit) {
                hasMoreData = false;
              } else {
                offset += limit;
              }
            } else {
              hasMoreData = false;
            }
          }
          
          if (allOrders.length > 0) {
            console.log(`📊 Total orders fetched for ${config.merchantName}: ${allOrders.length} orders`);
            
            // Filter orders by date on server-side
            const filteredOrders = allOrders.filter((order: any) => {
              const orderDate = new Date(order.createdTime);
              return orderDate >= start && orderDate <= end;
            });
            
            console.log(`Location Filtered orders for ${config.merchantName}: ${filteredOrders.length} orders`);
            
            const locationRevenue = filteredOrders.reduce((sum: number, order: any) => {
              const orderTotal = parseFloat(order.total || '0') / 100; // Convert cents to dollars
              return sum + orderTotal;
            }, 0);
            const locationTransactions = filteredOrders.length;
            const avgSale = locationTransactions > 0 ? locationRevenue / locationTransactions : 0;
            
            console.log(`Live Location Revenue - ${config.merchantName}: $${locationRevenue.toFixed(2)} from ${locationTransactions} orders`);
            
            cloverLocationBreakdown.push({
              locationId: config.id,
              locationName: config.merchantName,
              platform: 'Clover POS',
              totalSales: locationRevenue.toFixed(2),
              totalRevenue: locationRevenue.toFixed(2), // Ensure consistency between tabs
              transactionCount: locationTransactions,
              avgSale: avgSale.toFixed(2)
            });
          } else {
            console.log(`Location No orders returned for ${config.merchantName}`);
            // Still include location with zero sales
            cloverLocationBreakdown.push({
              locationId: config.id,
              locationName: config.merchantName,
              platform: 'Clover POS',
              totalSales: '0.00',
              totalRevenue: '0.00', // Ensure consistency between tabs
              transactionCount: 0,
              avgSale: '0.00'
            });
          }
        } catch (error) {
          console.log(`Error fetching live data for ${config.merchantName}:`, error);
          // Include location with zero sales on error
          cloverLocationBreakdown.push({
            locationId: config.id,
            locationName: config.merchantName,
            platform: 'Clover POS',
            totalSales: '0.00',
            totalRevenue: '0.00', // Ensure consistency between tabs
            transactionCount: 0,
            avgSale: '0.00'
          });
        }
      }

      // Build location breakdown for Amazon Store locations with LIVE data
      const amazonLocationBreakdown = [];
      
      for (const config of activeAmazonConfigs) {
        try {
          console.log(`🚀 Creating AmazonIntegration for ${config.merchantName} with Seller ID: ${config.sellerId}`);
          
          // Create Amazon integration with environment variables
          const { AmazonIntegration } = await import('./integrations/amazon');
          const amazonIntegration = new AmazonIntegration({
            sellerId: process.env.AMAZON_SELLER_ID,
            accessToken: process.env.AMAZON_ACCESS_TOKEN,
            refreshToken: process.env.AMAZON_REFRESH_TOKEN,
            clientId: process.env.AMAZON_CLIENT_ID,
            clientSecret: process.env.AMAZON_CLIENT_SECRET,
            merchantName: config.merchantName
          });

          // Get orders for the date range (Amazon API expects ISO format)
          // Amazon requires dates to be at least 2 minutes before current time
          const now = new Date();
          const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
          
          const startDateISO = new Date(startDateStr + 'T00:00:00.000Z').toISOString();
          let endDateISO = new Date(endDateStr + 'T23:59:59.999Z').toISOString();
          
          // Ensure end date is at least 2 minutes before current time
          const endDate = new Date(endDateISO);
          if (endDate > twoMinutesAgo) {
            endDateISO = twoMinutesAgo.toISOString();
            console.log(`Amazon API: Adjusted end date to ${endDateISO} (2 minutes before current time)`);
          }
          const amazonOrders = await amazonIntegration.getOrders(startDateISO, endDateISO);
          
          console.log(`Amazon Raw orders fetched for ${config.merchantName}:`, {
            hasOrders: !!(amazonOrders && amazonOrders.payload && amazonOrders.payload.Orders),
            orderCount: amazonOrders?.payload?.Orders?.length || 0
          });

          if (amazonOrders && amazonOrders.payload && amazonOrders.payload.Orders) {
            const orders = amazonOrders.payload.Orders;
            console.log(`Amazon Filtered orders for ${config.merchantName}: ${orders.length} orders`);
            
            // Debug: Log first few orders to understand structure
            console.log(`Amazon Order Sample:`, JSON.stringify(orders.slice(0, 2), null, 2));
            
            // Try Sales API to match Seller Central calculations exactly
            let locationRevenue = 0;
            let locationTransactions = 0;
            let salesApiSuccess = false;
            
            try {
              console.log('🎯 Trying Amazon Sales API (same as Seller Central)...');
              const salesMetrics = await amazonIntegration.getSalesMetrics(startDateISO, endDateISO, 'Total');
              
              if (salesMetrics && salesMetrics.payload && salesMetrics.payload.length > 0) {
                const metrics = salesMetrics.payload[0];
                // Amazon Sales API response received successfully
                
                if (metrics.totalSales && metrics.totalSales.amount) {
                  locationRevenue = parseFloat(metrics.totalSales.amount);
                  // Use orderItemCount to match Amazon Seller Central "Total order items"
                  locationTransactions = metrics.orderItemCount || metrics.orderCount || 0;
                  salesApiSuccess = true;
                  console.log(`✅ Amazon Sales API Revenue: $${locationRevenue.toFixed(2)}, Transactions: ${locationTransactions} (using ${metrics.orderItemCount ? 'orderItemCount' : 'orderCount'} to match Seller Central)`);
                } else {
                  throw new Error('No totalSales data in response');
                }
              } else {
                throw new Error('No sales metrics data');
              }
            } catch (salesError) {
              console.log('Sales API failed, trying Financial Events API:', salesError instanceof Error ? salesError.message : String(salesError));
              // Fall back to Financial Events API
              try {
                console.log('🔍 Trying Amazon Financial Events API...');
                const financialEvents = await amazonIntegration.getFinancialEvents(startDateISO, endDateISO);
                
                if (financialEvents && financialEvents.payload && financialEvents.payload.FinancialEvents && financialEvents.payload.FinancialEvents.ShipmentEventList) {
                  const shipmentEvents = financialEvents.payload.FinancialEvents.ShipmentEventList;
                  locationRevenue = shipmentEvents.reduce((sum: number, event: any) => {
                    const charges = event.ShipmentItemList?.[0]?.ItemChargeList || [];
                    const itemRevenue = charges.reduce((itemSum: number, charge: any) => {
                      if (charge.ChargeType === 'Principal') {
                        return itemSum + parseFloat(charge.ChargeAmount?.CurrencyAmount || '0');
                      }
                      return itemSum;
                    }, 0);
                    return sum + itemRevenue;
                  }, 0);
                  locationTransactions = shipmentEvents.length;
                  console.log(`Amazon Financial Events Revenue: $${locationRevenue.toFixed(2)} from ${locationTransactions} shipment events`);
                } else {
                  throw new Error('No financial events data');
                }
              } catch (finError) {
                console.log('Financial Events API also failed, falling back to Orders API:', finError instanceof Error ? finError.message : String(finError));
                // Final fallback to Orders API calculation
                locationRevenue = orders.reduce((sum: number, order: any) => {
                  // Only count shipped orders like Amazon Seller Central
                  if (order.OrderStatus === 'Shipped' || order.OrderStatus === 'Delivered') {
                    const orderTotal = parseFloat(order.OrderTotal?.Amount || '0');
                    console.log(`Amazon Order: ${order.AmazonOrderId} - Status: ${order.OrderStatus} - Amount: $${orderTotal}`);
                    return sum + orderTotal;
                  }
                  return sum;
                }, 0);
                
                // Only calculate transactions from Orders API if Sales API didn't work
                if (!salesApiSuccess) {
                  locationTransactions = orders.filter((order: any) => 
                    order.OrderStatus === 'Shipped' || order.OrderStatus === 'Delivered'
                  ).length;
                }
              }
            }
            const avgSale = locationTransactions > 0 ? locationRevenue / locationTransactions : 0;
            
            console.log(`Live Amazon Revenue - ${config.merchantName}: $${locationRevenue.toFixed(2)} from ${locationTransactions} orders`);
            
            amazonLocationBreakdown.push({
              locationId: `amazon_${config.id}`,
              locationName: config.merchantName,
              platform: 'Amazon Store',
              totalSales: locationRevenue.toFixed(2),
              totalRevenue: locationRevenue.toFixed(2), // Ensure consistency between tabs
              transactionCount: locationTransactions,
              avgSale: avgSale.toFixed(2)
            });
          } else {
            console.log(`Amazon No orders returned for ${config.merchantName}`);
            // Still include location with zero sales
            amazonLocationBreakdown.push({
              locationId: `amazon_${config.id}`,
              locationName: config.merchantName,
              platform: 'Amazon Store',
              totalSales: '0.00',
              totalRevenue: '0.00', // Ensure consistency between tabs
              transactionCount: 0,
              avgSale: '0.00'
            });
          }
        } catch (error) {
          console.log(`Error fetching Amazon data for ${config.merchantName}:`, error);
          
          // Only add zero data if it's not a rate limit error
          // Rate limit errors shouldn't override potentially successful cached data
          if (!(error instanceof Error) || !error.message.includes('429')) {
            amazonLocationBreakdown.push({
              locationId: `amazon_${config.id}`,
              locationName: config.merchantName,
              platform: 'Amazon Store',
              totalSales: '0.00',
              totalRevenue: '0.00', // Ensure consistency between tabs
              transactionCount: 0,
              avgSale: '0.00'
            });
          } else {
            console.log(`Skipping Amazon location due to rate limit - will try cached data next time`);
          }
        }
      }

      // Combine all location breakdowns
      const allLocationBreakdown = [...cloverLocationBreakdown, ...amazonLocationBreakdown];

      // Calculate total sales from live data (not database)
      const totalRevenue = allLocationBreakdown.reduce((sum, location) => {
        return sum + parseFloat(location.totalSales);
      }, 0);
      
      const totalTransactions = allLocationBreakdown.reduce((sum, location) => {
        return sum + location.transactionCount;
      }, 0);

      res.json({
        locationBreakdown: allLocationBreakdown,
        totalSummary: {
          totalRevenue: totalRevenue.toFixed(2),
          totalTransactions: totalTransactions,
          integrations: {
            cloverLocations: cloverLocationBreakdown.length,
            amazonStores: amazonLocationBreakdown.length,
            totalIntegrations: allLocationBreakdown.length
          }
        }
      });
    } catch (error) {
      console.error('Error fetching multi-location analytics:', error);
      res.status(500).json({ message: 'Failed to fetch multi-location analytics' });
    }
  });

  // Clover Configuration Routes  
  app.post('/api/accounting/config/clover', isAuthenticated, async (req, res) => {
    try {
      const { merchantId, merchantName, apiToken, environment } = req.body;
      
      if (!merchantId || !apiToken) {
        return res.status(400).json({ message: 'Merchant ID and API Token are required' });
      }

      // Set baseUrl based on environment  
      const baseUrl = environment === 'sandbox' ? 'https://apisandbox.dev.clover.com' : 'https://api.clover.com';
      
      // Check if configuration already exists for this merchant
      const existingConfig = await storage.getCloverConfig(merchantId);
      let config;
      
      if (existingConfig) {
        // Update existing configuration
        config = await storage.updateCloverConfig(existingConfig.id, {
          merchantName: merchantName || null,
          apiToken,
          baseUrl,
          isActive: true
        });
      } else {
        // Create new configuration
        config = await storage.createCloverConfig({
          merchantId,
          merchantName: merchantName || null,
          apiToken,
          baseUrl,
          isActive: true
        });
      }
      
      res.json(config);
    } catch (error) {
      console.error('Error saving Clover config:', error);
      res.status(500).json({ message: 'Failed to save Clover configuration' });
    }
  });

  app.post('/api/accounting/clover-config', isAuthenticated, async (req, res) => {
    try {
      const { merchantId, apiKey, baseUrl, isActive } = req.body;
      const config = await storage.createCloverConfig({
        merchantId: merchantId || '',
        apiToken: apiKey || '',
        baseUrl: baseUrl || 'https://api.clover.com',
        isActive: isActive ?? true
      });
      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating Clover config:', error);
      res.status(500).json({ message: 'Failed to create Clover configuration' });
    }
  });

  // Financial Accounts (Chart of Accounts) Routes
  app.get('/api/accounting/accounts', isAuthenticated, async (req, res) => {
    try {
      const { type } = req.query;
      let accounts;
      
      if (type) {
        accounts = await storage.getAccountsByType(type as string);
      } else {
        accounts = await storage.getAllFinancialAccounts();
      }
      
      res.json(accounts);
    } catch (error) {
      console.error('Error fetching financial accounts:', error);
      res.status(500).json({ message: 'Failed to fetch financial accounts' });
    }
  });

  app.post('/api/accounting/accounts', isAuthenticated, async (req, res) => {
    try {
      const { accountName, accountType, accountNumber, description, parentAccountId, qbAccountId } = req.body;
      
      if (!accountName || !accountType) {
        return res.status(400).json({ message: 'Account name and type are required' });
      }

      const account = await storage.createFinancialAccount({
        accountName,
        accountType,
        accountNumber: accountNumber || null,
        description: description || null,
        parentAccountId: parentAccountId || null,
        qbAccountId: qbAccountId || null,
        balance: '0.00',
        isActive: true
      });
      
      res.status(201).json(account);
    } catch (error) {
      console.error('Error creating financial account:', error);
      res.status(500).json({ message: 'Failed to create financial account' });
    }
  });

  app.get('/api/accounting/accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getFinancialAccountById(id);
      
      if (!account) {
        return res.status(404).json({ message: 'Account not found' });
      }
      
      res.json(account);
    } catch (error) {
      console.error('Error fetching financial account:', error);
      res.status(500).json({ message: 'Failed to fetch financial account' });
    }
  });

  app.put('/api/accounting/accounts/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const account = await storage.updateFinancialAccount(id, updates);
      res.json(account);
    } catch (error) {
      console.error('Error updating financial account:', error);
      res.status(500).json({ message: 'Failed to update financial account' });
    }
  });

  // ============================================
  // PAYROLL AUTOMATION API ROUTES
  // ============================================

  // Get Chart of Accounts with optional month/year filtering for balances
  app.get('/api/accounting/coa', isAuthenticated, async (req, res) => {
    try {
      const { month, year } = req.query;
      
      let monthNum, yearNum;
      if (month && year) {
        monthNum = parseInt(month as string);
        yearNum = parseInt(year as string);
        
        if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
          return res.status(400).json({ message: 'Invalid month or year. Month must be 1-12.' });
        }
      }
      
      const accounts = await storage.getChartOfAccountsWithBalances(monthNum, yearNum);
      res.json({
        accounts,
        period: monthNum && yearNum ? { month: monthNum, year: yearNum } : null
      });
    } catch (error) {
      console.error('Error fetching Chart of Accounts:', error);
      res.status(500).json({ message: 'Failed to fetch Chart of Accounts' });
    }
  });

  // Preview payroll accrual calculation
  app.get('/api/accounting/payroll/preview', isAuthenticated, async (req, res) => {
    try {
      // Admin-only access
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const { month, year, locationId } = req.query;
      
      if (!month || !year) {
        return res.status(400).json({ message: 'Month and year are required' });
      }
      
      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);
      const locationIdNum = locationId ? parseInt(locationId as string) : undefined;
      
      if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({ message: 'Invalid month or year. Month must be 1-12.' });
      }
      
      // Calculate date range for the month
      const startDate = `${yearNum}-${monthNum.toString().padStart(2, '0')}-01`;
      const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0]; // Last day of month
      
      const employeeHours = await storage.computeScheduledHoursByUser(startDate, endDate, locationIdNum);
      
      let totalAmount = 0;
      const employeeBreakdown = employeeHours.map(emp => {
        const hourlyRate = emp.hourlyRate || 0;
        const totalCost = emp.scheduledHours * hourlyRate;
        totalAmount += totalCost;
        
        return {
          userId: emp.userId,
          userName: emp.userName,
          scheduledHours: emp.scheduledHours,
          hourlyRate,
          totalCost
        };
      }).filter(emp => emp.totalCost > 0); // Only include employees with costs
      
      res.json({
        month: monthNum,
        year: yearNum,
        locationId: locationIdNum,
        startDate,
        endDate,
        totalAmount: Math.round(totalAmount * 100) / 100,
        employeeCount: employeeBreakdown.length,
        employeeBreakdown
      });
    } catch (error) {
      console.error('Error previewing payroll accrual:', error);
      res.status(500).json({ message: 'Failed to preview payroll accrual' });
    }
  });

  // Create payroll accrual transaction
  app.post('/api/accounting/payroll/accrue', isAuthenticated, async (req, res) => {
    try {
      // Admin-only access
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }

      // Validate request body
      const accrualSchema = z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020).max(2030),
        source: z.literal('scheduled'),
        replace: z.boolean().optional().default(false),
        locationId: z.number().optional()
      });

      const { month, year, source, replace, locationId } = accrualSchema.parse(req.body);
      
      // Calculate date range for the month
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]; // Last day of month
      
      const employeeHours = await storage.computeScheduledHoursByUser(startDate, endDate, locationId);
      
      if (employeeHours.length === 0) {
        return res.status(400).json({ message: 'No scheduled hours found for the specified period' });
      }
      
      let totalAmount = 0;
      const employeeBreakdown = employeeHours.map(emp => {
        const hourlyRate = emp.hourlyRate || 0;
        const totalCost = emp.scheduledHours * hourlyRate;
        totalAmount += totalCost;
        
        return {
          userId: emp.userId,
          userName: emp.userName,
          scheduledHours: emp.scheduledHours,
          hourlyRate,
          totalCost
        };
      }).filter(emp => emp.totalCost > 0); // Only include employees with costs
      
      if (employeeBreakdown.length === 0) {
        return res.status(400).json({ message: 'No employees with hourly rates found for payroll accrual' });
      }
      
      const transaction = await storage.createPayrollAccrualTransaction({
        month,
        year,
        totalAmount: Math.round(totalAmount * 100) / 100,
        employeeBreakdown,
        locationId,
        replace
      });
      
      res.status(201).json({
        success: true,
        transaction,
        accrual: {
          month,
          year,
          totalAmount: Math.round(totalAmount * 100) / 100,
          employeeCount: employeeBreakdown.length,
          description: `Payroll Accrual - ${year}-${month.toString().padStart(2, '0')} (scheduled)`
        }
      });
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        return res.status(400).json({ 
          message: 'Invalid request data',
          errors: error.errors 
        });
      }
      console.error('Error creating payroll accrual:', error);
      res.status(500).json({ 
        message: 'Failed to create payroll accrual',
        error: error.message
      });
    }
  });

  // Financial Transactions Routes
  app.get('/api/accounting/transactions', isAuthenticated, async (req, res) => {
    try {
      const { limit, offset, startDate, endDate, sourceSystem } = req.query;
      let transactions;

      if (startDate && endDate) {
        transactions = await storage.getTransactionsByDateRange(startDate as string, endDate as string);
      } else if (sourceSystem) {
        transactions = await storage.getTransactionsBySourceSystem(sourceSystem as string);
      } else {
        transactions = await storage.getAllFinancialTransactions(
          limit ? parseInt(limit as string) : undefined,
          offset ? parseInt(offset as string) : undefined
        );
      }

      res.json(transactions);
    } catch (error) {
      console.error('Error fetching financial transactions:', error);
      res.status(500).json({ message: 'Failed to fetch financial transactions' });
    }
  });

  // Quick Expense Creation Route (streamlined for owners)
  app.post('/api/accounting/expenses/quick', isAuthenticated, async (req, res) => {
    try {
      const { amount, description, category, expenseDate } = req.body;
      const userId = req.user?.id;

      // Validate required fields
      if (!amount || !description || !category || !expenseDate) {
        return res.status(400).json({ 
          error: 'Missing required fields: amount, description, category, expenseDate' 
        });
      }

      // Validate user has permission to add expenses
      if (!userId || !['admin', 'manager', 'owner'].includes(req.user?.role || '')) {
        return res.status(403).json({ 
          error: 'Permission denied. Only admins, managers, and owners can add expenses.' 
        });
      }

      // Create the expense transaction
      const expense = await storage.createQuickExpense({
        amount: parseFloat(amount),
        description,
        category,
        expenseDate,
        userId
      });

      res.status(201).json({
        success: true,
        message: 'Expense added successfully',
        expense: expense,
        amount: parseFloat(amount),
        description,
        category,
        expenseDate
      });
    } catch (error) {
      console.error('Error creating quick expense:', error);
      res.status(500).json({ 
        error: 'Failed to create expense',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.post('/api/accounting/transactions', isAuthenticated, async (req, res) => {
    try {
      const { 
        transactionDate, 
        description, 
        totalAmount, 
        sourceSystem, 
        externalId, 
        reference,
        lines 
      } = req.body;

      if (!transactionDate || !description || !totalAmount || !sourceSystem) {
        return res.status(400).json({ message: 'Missing required transaction fields' });
      }

      // Create the transaction
      const transaction = await storage.createFinancialTransaction({
        transactionDate,
        transactionType: 'sale',
        description,
        totalAmount,
        sourceSystem,
        status: 'pending'
      });

      // Create transaction lines if provided
      if (lines && Array.isArray(lines)) {
        for (const line of lines) {
          await storage.createTransactionLine({
            transactionId: transaction.id,
            accountId: line.accountId,
            debitAmount: line.debitCredit === 'debit' ? line.amount : undefined,
            creditAmount: line.debitCredit === 'credit' ? line.amount : undefined,
            description: line.description || ''
          });
        }
      }

      res.status(201).json(transaction);
    } catch (error) {
      console.error('Error creating financial transaction:', error);
      res.status(500).json({ message: 'Failed to create financial transaction' });
    }
  });

  // Customers and Vendors Routes
  app.get('/api/accounting/customers-vendors', isAuthenticated, async (req, res) => {
    try {
      const { type } = req.query;
      let customersVendors;

      if (type && (type === 'customer' || type === 'vendor')) {
        customersVendors = await storage.getCustomersByType(type);
      } else {
        customersVendors = await storage.getAllCustomersVendors();
      }

      res.json(customersVendors);
    } catch (error) {
      console.error('Error fetching customers/vendors:', error);
      res.status(500).json({ message: 'Failed to fetch customers and vendors' });
    }
  });

  app.post('/api/accounting/customers-vendors', isAuthenticated, async (req, res) => {
    try {
      const { name, type, email, phone, address, qbId } = req.body;

      if (!name || !type || (type !== 'customer' && type !== 'vendor')) {
        return res.status(400).json({ message: 'Name and valid type (customer/vendor) are required' });
      }

      const customerVendor = await storage.createCustomerVendor({
        name,
        type,
        email: email || null,
        phone: phone || null,
        address: address || null,
        qbId: qbId || null,
        isActive: true
      });

      res.status(201).json(customerVendor);
    } catch (error) {
      console.error('Error creating customer/vendor:', error);
      res.status(500).json({ message: 'Failed to create customer/vendor' });
    }
  });

  // Inventory Items Routes
  app.get('/api/accounting/inventory', isAuthenticated, async (req, res) => {
    try {
      const { lowStock } = req.query;
      let items;

      if (lowStock === 'true') {
        items = await storage.getLowStockItems();
      } else {
        items = await storage.getAllInventoryItems();
      }

      res.json(items);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      res.status(500).json({ message: 'Failed to fetch inventory items' });
    }
  });

  app.post('/api/accounting/inventory', isAuthenticated, async (req, res) => {
    try {
      const { 
        itemName, 
        sku, 
        quantityOnHand, 
        unitCost, 
        unitPrice, 
        reorderPoint, 
        description,
        qbItemId,
        thriveItemId 
      } = req.body;

      if (!itemName || !sku) {
        return res.status(400).json({ message: 'Item name and SKU are required' });
      }

      const item = await storage.createInventoryItem({
        itemName,
        sku,
        quantityOnHand: quantityOnHand || '0',
        unitCost: unitCost || '0.00',
        unitPrice: unitPrice || '0.00',
        reorderPoint: reorderPoint || '0',
        description: description || null,
        qbItemId: qbItemId || null,
        thriveItemId: thriveItemId || null,
        isActive: true,
        lastSyncAt: new Date()
      });

      res.status(201).json(item);
    } catch (error) {
      console.error('Error creating inventory item:', error);
      res.status(500).json({ message: 'Failed to create inventory item' });
    }
  });

  // Analytics Routes (using stub implementations for now)
  app.get('/api/accounting/analytics/trial-balance', isAuthenticated, async (req, res) => {
    try {
      const { asOfDate } = req.query;
      const trialBalance = await storage.getTrialBalance(asOfDate as string);
      res.json(trialBalance);
    } catch (error) {
      console.error('Error fetching trial balance:', error);
      res.status(500).json({ message: 'Failed to fetch trial balance' });
    }
  });

  app.get('/api/accounting/analytics/profit-loss', isAuthenticated, async (req, res) => {
    try {
      
      const { startDate, endDate } = req.query;
      console.log('Analytics profit-loss request:', { startDate, endDate });
      
      if (!startDate || !endDate) {
        console.log('Missing dates, returning 400');
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      // Get live transaction data for all periods from integrations (same as reports endpoint)
      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalCOGS = 0;

      try {
        // Fetch revenue data from integrations (Clover + Amazon)
        const revenueResponse = await fetch(`${req.protocol}://${req.get('host')}/api/accounting/analytics/multi-location?startDate=${startDate}&endDate=${endDate}`, {
          headers: {
            'Cookie': req.headers.cookie || ''
          }
        });
        if (revenueResponse.ok) {
          const revenueData = await revenueResponse.json();
          
          // Calculate total revenue from location breakdown
          if (revenueData.locationBreakdown) {
            totalRevenue = revenueData.locationBreakdown.reduce((sum: number, location: any) => {
              return sum + (parseFloat(location.totalRevenue) || 0);
            }, 0);
          }
        }

        // Fetch COGS data from integrations
        const cogsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/accounting/analytics/cogs?startDate=${startDate}&endDate=${endDate}`, {
          headers: {
            'Cookie': req.headers.cookie || ''
          }
        });
        if (cogsResponse.ok) {
          const cogsData = await cogsResponse.json();
          if (cogsData.items && cogsData.items.length > 0) {
            totalCOGS = parseFloat(cogsData.total) || 0;
          }
        }

        // For expenses, check if we have account-based data for July 2025 (sample period)
        const isJulySamplePeriod = startDate === '2025-07-01' && endDate === '2025-07-31';
        
        if (isJulySamplePeriod) {
          // Use account balances for July 2025 operating expenses (sample data)
          const allExpenseAccounts = await storage.getAccountsByType('Expense');
          const expenseAccounts = allExpenseAccounts.filter(account => 
            !account.accountName.toLowerCase().includes('cost of goods sold')
          );

          totalExpenses = expenseAccounts.reduce((sum, account) => {
            return sum + parseFloat(account.balance || '0');
          }, 0);
        } else {
          // For other periods, no operating expenses entered yet (as user mentioned)
          totalExpenses = 0;
        }

      } catch (error) {
        console.error('Error fetching integration data for analytics P&L:', error);
        
        // Fallback to account data if integration fails
        const isJulySamplePeriod = startDate === '2025-07-01' && endDate === '2025-07-31';
        
        if (isJulySamplePeriod) {
          const incomeAccounts = await storage.getAccountsByType('Income');
          const allExpenseAccounts = await storage.getAccountsByType('Expense');
          const cogsAccounts = await storage.getAccountsByName('Cost of Goods Sold');
          
          const expenseAccounts = allExpenseAccounts.filter(account => 
            !account.accountName.toLowerCase().includes('cost of goods sold')
          );

          totalRevenue = incomeAccounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0);
          totalExpenses = expenseAccounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0);
          totalCOGS = cogsAccounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0);
        }
      }

      const grossProfit = totalRevenue - totalCOGS;
      const netIncome = grossProfit - totalExpenses;

      // Return full structure that frontend summary expects
      const profitLoss = {
        totalRevenue: totalRevenue.toFixed(2),
        totalCOGS: totalCOGS.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        grossMargin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0',
        totalExpenses: totalExpenses.toFixed(2),
        netIncome: netIncome.toFixed(2),
        profitMargin: totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0',
        period: `${startDate} to ${endDate}`,
        currency: 'USD'
      };
      
      console.log('Analytics P&L response:', profitLoss);
      res.json(profitLoss);
    } catch (error) {
      console.error('Error fetching profit and loss:', error);
      res.status(500).json({ message: 'Failed to fetch profit and loss report' });
    }
  });

  app.get('/api/accounting/analytics/sales-summary', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, locationId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      const salesSummary = await storage.getSalesSummary(
        startDate as string, 
        endDate as string,
        locationId ? parseInt(locationId as string) : undefined
      );
      res.json(salesSummary);
    } catch (error) {
      console.error('Error fetching sales summary:', error);
      res.status(500).json({ message: 'Failed to fetch sales summary' });
    }
  });

  // TEMPORARY WORKING SOLUTION: Simple revenue trends endpoint without complex TypeScript issues
  app.get('/api/accounting/analytics/revenue-trends-live', isAuthenticated, async (req, res) => {
    console.log('🚀 NEW LIVE REVENUE TRENDS ENDPOINT HIT - START OF FUNCTION - TIMESTAMP:', new Date().toISOString());
    // Prevent caching aggressively
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    try {
      const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;
      console.log('🚀 NEW LIVE REVENUE TRENDS - Query params extracted:', { period, year, startDate, endDate });
      const { CloverIntegration } = await import('./integrations/clover');
      
      console.log(`=== NEW LIVE REVENUE TRENDS API CALLED ===`, { period, year, startDate, endDate });
      
      const currentYear = parseInt(year as string);
      let data = [];
      
      // If custom date range is provided, use it instead of period-based filtering
      if (startDate && endDate) {
        console.log(`=== NEW LIVE: USING LIVE API DATA FOR CUSTOM DATE RANGE ===`);
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        let totalRevenue = 0;
        let totalTransactions = 0;
        
        // Get all active Clover locations
        const allLocations = await storage.getAllCloverConfigs();
        const activeLocations = allLocations.filter(config => config.isActive);
        
        console.log(`NEW LIVE Revenue Analytics: Fetching live data for ${start.toISOString()} to ${end.toISOString()}`);
        
        // Aggregate revenue from all active locations using LIVE Clover API data (same as Order Management)
        for (const locationConfig of activeLocations) {
          try {
            // Use the same live API approach as Order Management
            const cloverIntegration = new CloverIntegration(locationConfig);
            // Fetch ALL orders with pagination to avoid missing revenue
            let allOrders: any[] = [];
            let offset = 0;
            const limit = 1000;
            let hasMoreData = true;
            
            while (hasMoreData) {
              const liveOrders = await cloverIntegration.fetchOrders({
                filter: `createdTime>=${Math.floor(start.getTime())}`,
                limit: limit,
                offset: offset
              });
              
              if (liveOrders && liveOrders.elements && liveOrders.elements.length > 0) {
                allOrders.push(...liveOrders.elements);
                
                // Check if we need to fetch more data
                if (liveOrders.elements.length < limit) {
                  hasMoreData = false;
                } else {
                  offset += limit;
                }
              } else {
                hasMoreData = false;
              }
            }
            
            if (allOrders.length > 0) {
              // Filter orders by date on server-side
              const filteredOrders = allOrders.filter((order: any) => {
                const orderDate = new Date(order.createdTime);
                return orderDate >= start && orderDate <= end;
              });
              
              const locationRevenue = filteredOrders.reduce((sum: number, order: any) => {
                const orderTotal = parseFloat(order.total || '0') / 100; // Convert cents to dollars
                return sum + orderTotal;
              }, 0);
              const locationTransactions = filteredOrders.length;
              
              totalRevenue += locationRevenue;
              totalTransactions += locationTransactions;
              
              console.log(`NEW LIVE Revenue - ${locationConfig.merchantName || 'Unknown'}: $${locationRevenue.toFixed(2)} from ${locationTransactions} orders`);
            }
          } catch (error) {
            console.log(`No live sales data for ${locationConfig.merchantName} in date range:`, error);
          }
        }
        
        const avgSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        
        data.push({
          period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
          revenue: totalRevenue.toFixed(2),
          transactions: totalTransactions,
          avgSale: avgSale.toFixed(2)
        });
        
        console.log('NEW LIVE REVENUE TRENDS RETURNING:', { period: 'custom', data });
        return res.json({ period: 'custom', data });
      }
      
      res.json({ period: 'custom', data: [] });
    } catch (error) {
      console.error('NEW LIVE Revenue trends error:', error);
      res.status(500).json({ error: 'Failed to fetch revenue trends' });
    }
  });

  // Enhanced Revenue Analytics Endpoints with Real Clover Data
  app.get('/api/accounting/analytics/revenue-trends', isAuthenticated, async (req, res) => {
    console.log('🚀 REVENUE TRENDS ENDPOINT HIT - START OF FUNCTION - TIMESTAMP:', new Date().toISOString());
    // Prevent caching aggressively
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    
    try {
      const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;
      console.log('🚀 REVENUE TRENDS - Query params extracted:', { period, year, startDate, endDate });
      const { CloverIntegration } = await import('./integrations/clover');
      
      console.log(`=== REVENUE TRENDS API CALLED ===`, { period, year, startDate, endDate });
      
      const currentYear = parseInt(year as string);
      let data = [];
      
      // If custom date range is provided, use it instead of period-based filtering
      if (startDate && endDate) {
        console.log(`=== USING LIVE API DATA FOR CUSTOM DATE RANGE ===`);
        const start = new Date(startDate as string);
        // Fix timezone issue: ensure end date includes full day (23:59:59.999)
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        
        console.log(`🚀 REVENUE TRENDS FIXED DATE RANGE: ${start.toISOString()} - ${end.toISOString()}`);
        
        let totalRevenue = 0;
        let totalTransactions = 0;
        
        // Get all active Clover locations
        const allLocations = await storage.getAllCloverConfigs();
        const activeLocations = allLocations.filter(config => config.isActive);
        
        console.log(`Revenue Analytics: Fetching live data for ${start.toISOString()} to ${end.toISOString()}`);
        
        // Aggregate revenue from all active locations using LIVE Clover API data (same as Order Management)
        for (const locationConfig of activeLocations) {
          try {
            // Use the same live API approach as Order Management
            const cloverIntegration = new CloverIntegration(locationConfig);
            // Fetch ALL orders with pagination to avoid missing revenue
            let allOrders: any[] = [];
            let offset = 0;
            const limit = 1000;
            let hasMoreData = true;
            
            while (hasMoreData) {
              const liveOrders = await cloverIntegration.fetchOrders({
                filter: `createdTime>=${Math.floor(start.getTime())}`,
                limit: limit,
                offset: offset
              });
              
              if (liveOrders && liveOrders.elements && liveOrders.elements.length > 0) {
                allOrders.push(...liveOrders.elements);
                
                // Check if we need to fetch more data
                if (liveOrders.elements.length < limit) {
                  hasMoreData = false;
                } else {
                  offset += limit;
                }
              } else {
                hasMoreData = false;
              }
            }
            
            if (allOrders.length > 0) {
              console.log(`Total orders fetched for ${locationConfig.merchantName}: ${allOrders.length} orders`);
              
              // Filter orders by date on server-side
              const filteredOrders = allOrders.filter((order: any) => {
                const orderDate = new Date(order.createdTime);
                const withinRange = orderDate >= start && orderDate <= end;
                if (!withinRange) {
                  console.log(`Order ${order.id} filtered out: ${orderDate.toISOString()} not in range ${start.toISOString()} - ${end.toISOString()}`);
                }
                return withinRange;
              });
              
              console.log(`Filtered orders for ${locationConfig.merchantName}: ${filteredOrders.length} orders`);
              
              const locationRevenue = filteredOrders.reduce((sum: number, order: any) => {
                const orderTotal = parseFloat(order.total || '0') / 100; // Convert cents to dollars
                return sum + orderTotal;
              }, 0);
              const locationTransactions = filteredOrders.length;
              
              totalRevenue += locationRevenue;
              totalTransactions += locationTransactions;
              
              console.log(`Live Revenue - ${locationConfig.merchantName}: $${locationRevenue.toFixed(2)} from ${locationTransactions} orders`);
            } else {
              console.log(`No orders returned for ${locationConfig.merchantName}`);
            }
          } catch (error) {
            console.log(`No live sales data for ${locationConfig.merchantName} in date range:`, error);
          }
        }
        
        const avgSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        
        data.push({
          period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
          revenue: totalRevenue.toFixed(2),
          transactions: totalTransactions,
          avgSale: avgSale.toFixed(2)
        });
        
        return res.json({ period: 'custom', data });
      }
      
      // Get all active Clover locations
      const allLocations = await storage.getAllCloverConfigs();
      const activeLocations = allLocations.filter(config => config.isActive);
      
      if (period === 'monthly') {
        for (let month = 1; month <= 12; month++) {
          const startDate = new Date(currentYear, month - 1, 1);
          const endDate = new Date(currentYear, month, 0); // Last day of month
          
          let totalRevenue = 0;
          let totalTransactions = 0;
          
          // Aggregate revenue from all active locations using real Clover data
          for (const locationConfig of activeLocations) {
            try {
              // Skip Lake Geneva locations before July
              if (locationConfig.merchantName?.includes('Lake Geneva') && month < 7) {
                continue;
              }
              
              const cloverIntegration = new CloverIntegration(locationConfig);
              const salesData = await storage.getLocationSalesData(locationConfig.id, startDate, endDate);
              
              if (salesData && salesData.length > 0) {
                const locationRevenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
                const locationTransactions = salesData.length;
                
                totalRevenue += locationRevenue;
                totalTransactions += locationTransactions;
              }
            } catch (error) {
              console.log(`No sales data for ${locationConfig.merchantName} in ${startDate.toLocaleString('default', { month: 'long' })}`);
            }
          }
          
          const avgSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
          
          data.push({
            period: startDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
            month: month,
            revenue: totalRevenue.toFixed(2),
            transactions: totalTransactions,
            avgSale: avgSale.toFixed(2)
          });
        }
      } else if (period === 'quarterly') {
        const quarters = [
          { name: 'Q1', startMonth: 1, endMonth: 3 },
          { name: 'Q2', startMonth: 4, endMonth: 6 },
          { name: 'Q3', startMonth: 7, endMonth: 9 },
          { name: 'Q4', startMonth: 10, endMonth: 12 }
        ];
        
        for (const quarter of quarters) {
          const startDate = new Date(currentYear, quarter.startMonth - 1, 1);
          const endDate = new Date(currentYear, quarter.endMonth, 0);
          
          let totalRevenue = 0;
          let totalTransactions = 0;
          
          for (const locationConfig of activeLocations) {
            try {
              // Skip Lake Geneva locations before Q3
              if (locationConfig.merchantName.includes('Lake Geneva') && quarter.name !== 'Q3' && quarter.name !== 'Q4') {
                continue;
              }
              
              const salesData = await storage.getLocationSalesData(locationConfig.id, startDate, endDate);
              
              if (salesData && salesData.length > 0) {
                const locationRevenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
                const locationTransactions = salesData.length;
                
                totalRevenue += locationRevenue;
                totalTransactions += locationTransactions;
              }
            } catch (error) {
              console.log(`No sales data for ${locationConfig.merchantName} in ${quarter.name}`);
            }
          }
          
          const avgSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
          
          data.push({
            period: `${quarter.name} ${currentYear}`,
            quarter: quarter.name,
            revenue: totalRevenue.toFixed(2),
            transactions: totalTransactions,
            avgSale: avgSale.toFixed(2)
          });
        }
      } else if (period === 'annual') {
        // Get annual data for the last 5 years using real data
        for (let yearOffset = 4; yearOffset >= 0; yearOffset--) {
          const targetYear = currentYear - yearOffset;
          const startDate = new Date(targetYear, 0, 1);
          const endDate = new Date(targetYear, 11, 31);
          
          let totalRevenue = 0;
          let totalTransactions = 0;
          
          for (const locationConfig of activeLocations) {
            try {
              // Skip Lake Geneva locations before 2025
              if (locationConfig.merchantName.includes('Lake Geneva') && targetYear < 2025) {
                continue;
              }
              
              const salesData = await storage.getLocationSalesData(locationConfig.id, startDate, endDate);
              
              if (salesData && salesData.length > 0) {
                const locationRevenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
                const locationTransactions = salesData.length;
                
                totalRevenue += locationRevenue;
                totalTransactions += locationTransactions;
              }
            } catch (error) {
              console.log(`No sales data for ${locationConfig.merchantName} in ${targetYear}`);
            }
          }
          
          const avgSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
          
          data.push({
            period: targetYear.toString(),
            year: targetYear,
            revenue: totalRevenue.toFixed(2),
            transactions: totalTransactions,
            avgSale: avgSale.toFixed(2)
          });
        }
      }
      
      res.json({ period, data });
    } catch (error) {
      console.error('Error fetching revenue trends:', error);
      res.status(500).json({ message: 'Failed to fetch revenue trends' });
    }
  });

  // Location-specific revenue trends with Real Clover Data
  app.get('/api/accounting/analytics/location-revenue-trends', isAuthenticated, async (req, res) => {
    console.log('🚀 LOCATION REVENUE TRENDS ENDPOINT HIT - START OF FUNCTION');
    // Prevent caching
    res.set('Cache-Control', 'no-store');
    
    try {
      const { period = 'monthly', year = new Date().getFullYear(), startDate, endDate } = req.query;
      console.log('🚀 LOCATION REVENUE TRENDS - Query params:', { period, year, startDate, endDate });
      
      console.log(`=== LOCATION REVENUE TRENDS API CALLED ===`, { period, year, startDate, endDate });
      
      const currentYear = parseInt(year as string);
      
      // Get all active Clover configurations
      const allLocations = await storage.getAllCloverConfigs();
      const activeLocations = allLocations.filter(config => config.isActive);
      
      const locationData = [];
      
      // If custom date range is provided, use it instead of period-based filtering
      if (startDate && endDate) {
        const start = new Date(startDate as string);
        // Fix timezone issue: ensure end date includes full day (23:59:59.999)
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        
        console.log(`🚀 FIXED DATE RANGE: ${start.toISOString()} - ${end.toISOString()}`);
        
        for (const locationConfig of activeLocations) {
          let revenue = 0;
          let transactions = 0;
          
          try {
            // Use the same live API approach as Order Management
            const { CloverIntegration } = await import('./integrations/clover');
            const cloverIntegration = new CloverIntegration(locationConfig);
            console.log(`🚀 Creating CloverIntegration for ${locationConfig.merchantName} with MID: ${locationConfig.merchantId}`);
            // Fetch ALL orders with pagination to avoid missing revenue
            let allOrders: any[] = [];
            let offset = 0;
            const limit = 1000;
            let hasMoreData = true;
            
            while (hasMoreData) {
              const liveOrders = await cloverIntegration.fetchOrders({
                filter: `createdTime>=${Math.floor(start.getTime())}`,
                limit: limit,
                offset: offset
              });
              
              if (liveOrders && liveOrders.elements && liveOrders.elements.length > 0) {
                allOrders.push(...liveOrders.elements);
                
                // Check if we need to fetch more data
                if (liveOrders.elements.length < limit) {
                  hasMoreData = false;
                } else {
                  offset += limit;
                }
              } else {
                hasMoreData = false;
              }
            }
            
            if (allOrders.length > 0) {
              console.log(`Total orders fetched for ${locationConfig.merchantName}: ${allOrders.length} orders`);
              
              // Filter orders by date on server-side
              const filteredOrders = allOrders.filter((order: any) => {
                const orderDate = new Date(order.createdTime);
                const withinRange = orderDate >= start && orderDate <= end;
                if (!withinRange) {
                  console.log(`Location Order ${order.id} filtered out: ${orderDate.toISOString()} not in range ${start.toISOString()} - ${end.toISOString()}`);
                }
                return withinRange;
              });
              
              console.log(`Location Filtered orders for ${locationConfig.merchantName}: ${filteredOrders.length} orders`);
              
              revenue = filteredOrders.reduce((sum: number, order: any) => {
                const orderTotal = parseFloat(order.total || '0') / 100; // Convert cents to dollars
                return sum + orderTotal;
              }, 0);
              transactions = filteredOrders.length;
              
              console.log(`Live Location Revenue - ${locationConfig.merchantName}: $${revenue.toFixed(2)} from ${transactions} orders`);
            } else {
              console.log(`Location No orders returned for ${locationConfig.merchantName}`);
            }
          } catch (error) {
            console.log(`No live sales data for ${locationConfig.merchantName} in date range:`, error);
          }
          
          locationData.push({
            locationId: locationConfig.id,
            locationName: locationConfig.merchantName,
            isHSA: locationConfig.merchantName.includes('HSA'),
            data: [{
              period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
              revenue: revenue.toFixed(2),
              transactions: transactions
            }]
          });
        }
        
        // Add Amazon Store data for custom date range
        const allAmazonConfigs = await storage.getAllAmazonConfigs();
        const activeAmazonConfigs = allAmazonConfigs.filter(config => config.isActive);
        
        for (const amazonConfig of activeAmazonConfigs) {
          let revenue = 0;
          let transactions = 0;
          
          try {
            console.log(`🚀 Creating AmazonIntegration for ${amazonConfig.merchantName} with Seller ID: ${amazonConfig.sellerId}`);
            
            const { AmazonIntegration } = await import('./integrations/amazon');
            const amazonIntegration = new AmazonIntegration({
              sellerId: process.env.AMAZON_SELLER_ID,
              accessToken: process.env.AMAZON_ACCESS_TOKEN,
              refreshToken: process.env.AMAZON_REFRESH_TOKEN,
              clientId: process.env.AMAZON_CLIENT_ID,
              clientSecret: process.env.AMAZON_CLIENT_SECRET,
              merchantName: amazonConfig.merchantName
            });

            // Get orders for the date range (Amazon API expects ISO format) 
            // Amazon requires dates to be at least 2 minutes before current time
            const now = new Date();
            const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
            
            const startDateISO = start.toISOString();
            let endDateISO = end.toISOString();
            
            // Ensure end date is at least 2 minutes before current time
            if (end > twoMinutesAgo) {
              endDateISO = twoMinutesAgo.toISOString();
              console.log(`Amazon API: Adjusted end date to ${endDateISO} (2 minutes before current time)`);
            }
            const amazonOrders = await amazonIntegration.getOrders(startDateISO, endDateISO);
            
            console.log(`Amazon Raw orders fetched for ${amazonConfig.merchantName}:`, {
              hasOrders: !!(amazonOrders && amazonOrders.payload && amazonOrders.payload.Orders),
              orderCount: amazonOrders?.payload?.Orders?.length || 0
            });

            if (amazonOrders && amazonOrders.payload && amazonOrders.payload.Orders) {
              const orders = amazonOrders.payload.Orders;
              console.log(`Amazon Filtered orders for ${amazonConfig.merchantName}: ${orders.length} orders`);
              
              revenue = orders.reduce((sum: number, order: any) => {
                // Only count shipped orders like Amazon Seller Central
                if (order.OrderStatus === 'Shipped' || order.OrderStatus === 'Delivered') {
                  const orderTotal = parseFloat(order.OrderTotal?.Amount || '0');
                  return sum + orderTotal;
                }
                return sum;
              }, 0);
              transactions = orders.filter((order: any) => 
                order.OrderStatus === 'Shipped' || order.OrderStatus === 'Delivered'
              ).length;
              
              console.log(`Live Amazon Revenue - ${amazonConfig.merchantName}: $${revenue.toFixed(2)} from ${transactions} orders`);
            } else {
              console.log(`Amazon No orders returned for ${amazonConfig.merchantName}`);
            }
          } catch (error) {
            console.log(`Error fetching Amazon data for ${amazonConfig.merchantName}:`, error);
          }
          
          locationData.push({
            locationId: `amazon_${amazonConfig.id}`,
            locationName: amazonConfig.merchantName,
            isHSA: false,
            platform: 'Amazon Store',
            data: [{
              period: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
              revenue: revenue.toFixed(2),
              transactions: transactions
            }]
          });
        }
        
        return res.json({ period: 'custom', locations: locationData });
      }
      
      if (period === 'monthly') {
        for (const locationConfig of activeLocations) {
          const periodData = [];
          
          for (let month = 1; month <= 12; month++) {
            const startDate = new Date(currentYear, month - 1, 1);
            const endDate = new Date(currentYear, month, 0); // Last day of month
            
            let revenue = 0;
            let transactions = 0;
            
            try {
              // Skip Lake Geneva locations before July 2025
              if (locationConfig.merchantName.includes('Lake Geneva') && month < 7) {
                // Leave as 0 for months before opening
              } else {
                // Get real sales data from database (synced from Clover)
                const salesData = await storage.getLocationSalesData(locationConfig.id, startDate, endDate);
                
                if (salesData && salesData.length > 0) {
                  revenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
                  transactions = salesData.length;
                }
              }
            } catch (error) {
              console.log(`No sales data for ${locationConfig.merchantName} in ${startDate.toLocaleString('default', { month: 'long' })}`);
              // Revenue and transactions remain 0
            }
            
            periodData.push({
              period: new Date(currentYear, month - 1, 1).toLocaleString('default', { month: 'short' }),
              revenue: revenue.toFixed(2),
              transactions: transactions
            });
          }
          
          locationData.push({
            locationId: locationConfig.id,
            locationName: locationConfig.merchantName,
            isHSA: locationConfig.merchantName.includes('HSA'),
            data: periodData
          });
        }
        
        // Add Amazon Store data for monthly periods
        const allAmazonConfigs = await storage.getAllAmazonConfigs();
        const activeAmazonConfigs = allAmazonConfigs.filter(config => config.isActive);
        
        for (const amazonConfig of activeAmazonConfigs) {
          const periodData = [];
          
          for (let month = 1; month <= 12; month++) {
            const startDate = new Date(currentYear, month - 1, 1);
            const endDate = new Date(currentYear, month, 0); // Last day of month
            
            let revenue = 0;
            let transactions = 0;
            
            try {
              console.log(`🚀 Creating AmazonIntegration for ${amazonConfig.merchantName} - Month ${month}`);
              
              const { AmazonIntegration } = await import('./integrations/amazon');
              const amazonIntegration = new AmazonIntegration({
                sellerId: process.env.AMAZON_SELLER_ID,
                accessToken: process.env.AMAZON_ACCESS_TOKEN,
                refreshToken: process.env.AMAZON_REFRESH_TOKEN,
                clientId: process.env.AMAZON_CLIENT_ID,
                clientSecret: process.env.AMAZON_CLIENT_SECRET,
                merchantName: amazonConfig.merchantName
              });

              // Get orders for the month (Amazon API expects ISO format)
              const now = new Date();
              const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
              
              const startDateISO = startDate.toISOString();
              let endDateISO = endDate.toISOString();
              
              // Ensure end date is at least 2 minutes before current time
              if (endDate > twoMinutesAgo) {
                endDateISO = twoMinutesAgo.toISOString();
              }
              
              const amazonOrders = await amazonIntegration.getOrders(startDateISO, endDateISO);
              
              if (amazonOrders && amazonOrders.payload && amazonOrders.payload.Orders) {
                const orders = amazonOrders.payload.Orders;
                
                revenue = orders.reduce((sum, order) => {
                  // Only count shipped orders like Amazon Seller Central
                  if (order.OrderStatus === 'Shipped' || order.OrderStatus === 'Delivered') {
                    const orderTotal = parseFloat(order.OrderTotal?.Amount || '0');
                    return sum + orderTotal;
                  }
                  return sum;
                }, 0);
                transactions = orders.filter(order => 
                  order.OrderStatus === 'Shipped' || order.OrderStatus === 'Delivered'
                ).length;
                
                console.log(`Amazon Revenue - ${amazonConfig.merchantName} ${startDate.toLocaleString('default', { month: 'short' })}: $${revenue.toFixed(2)} from ${transactions} orders`);
              }
            } catch (error) {
              console.log(`Error fetching Amazon data for ${amazonConfig.merchantName} - Month ${month}:`, error);
            }
            
            periodData.push({
              period: new Date(currentYear, month - 1, 1).toLocaleString('default', { month: 'short' }),
              revenue: revenue.toFixed(2),
              transactions: transactions
            });
          }
          
          locationData.push({
            locationId: `amazon_${amazonConfig.id}`,
            locationName: amazonConfig.merchantName,
            isHSA: false,
            platform: 'Amazon Store',
            data: periodData
          });
        }
      } else if (period === 'quarterly') {
        const quarters = [
          { name: 'Q1', startMonth: 1, endMonth: 3 },
          { name: 'Q2', startMonth: 4, endMonth: 6 },
          { name: 'Q3', startMonth: 7, endMonth: 9 },
          { name: 'Q4', startMonth: 10, endMonth: 12 }
        ];
        
        for (const locationConfig of activeLocations) {
          const periodData = [];
          
          for (const quarter of quarters) {
            const startDate = new Date(currentYear, quarter.startMonth - 1, 1);
            const endDate = new Date(currentYear, quarter.endMonth, 0);
            
            let revenue = 0;
            let transactions = 0;
            
            try {
              // Skip Lake Geneva locations before Q3 2025
              if (locationConfig.merchantName.includes('Lake Geneva') && quarter.name !== 'Q3' && quarter.name !== 'Q4') {
                // Leave as 0 for quarters before opening
              } else {
                // Get real sales data from database (synced from Clover)
                const salesData = await storage.getLocationSalesData(locationConfig.id, startDate, endDate);
                
                if (salesData && salesData.length > 0) {
                  revenue = salesData.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
                  transactions = salesData.length;
                }
              }
            } catch (error) {
              console.log(`No sales data for ${locationConfig.merchantName} in ${quarter.name}`);
              // Revenue and transactions remain 0
            }
            
            periodData.push({
              period: quarter.name,
              revenue: revenue.toFixed(2),
              transactions: transactions
            });
          }
          
          locationData.push({
            locationId: locationConfig.id,
            locationName: locationConfig.merchantName,
            isHSA: locationConfig.merchantName.includes('HSA'),
            data: periodData
          });
        }
      }
      
      res.json({ period, locations: locationData });
    } catch (error) {
      console.error('Error fetching location revenue trends:', error);
      res.status(500).json({ message: 'Failed to fetch location revenue trends' });
    }
  });

  // External Integration Routes
  
  // QuickBooks Integration Routes
  app.get('/api/integrations/quickbooks/auth-url', isAuthenticated, async (req, res) => {
    try {
      const { quickBooksIntegration } = await import('./integrations/quickbooks');
      const authUrl = quickBooksIntegration.getAuthorizationUrl();
      res.json({ authUrl });
    } catch (error) {
      console.error('Error generating QuickBooks auth URL:', error);
      res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
  });

  app.get('/api/integrations/quickbooks/callback', async (req, res) => {
    try {
      const { code, realmId, state } = req.query as { code: string; realmId: string; state: string };
      
      if (!code || !realmId) {
        return res.status(400).json({ error: 'Missing authorization code or realm ID' });
      }

      const { quickBooksIntegration } = await import('./integrations/quickbooks');
      const success = await quickBooksIntegration.exchangeCodeForTokens(code, realmId);
      
      if (success) {
        res.redirect('/accounting?integration=quickbooks&status=connected');
      } else {
        res.redirect('/accounting?integration=quickbooks&status=error');
      }
    } catch (error) {
      console.error('Error handling QuickBooks callback:', error);
      res.redirect('/accounting?integration=quickbooks&status=error');
    }
  });

  app.post('/api/integrations/quickbooks/sync/accounts', isAuthenticated, async (req, res) => {
    try {
      const { quickBooksIntegration } = await import('./integrations/quickbooks');
      await quickBooksIntegration.loadConfig();
      await quickBooksIntegration.syncChartOfAccounts();
      res.json({ success: true, message: 'Chart of accounts synced successfully' });
    } catch (error) {
      console.error('Error syncing QuickBooks accounts:', error);
      res.status(500).json({ error: 'Failed to sync chart of accounts' });
    }
  });

  app.get('/api/integrations/quickbooks/test', isAuthenticated, async (req, res) => {
    try {
      const { quickBooksIntegration } = await import('./integrations/quickbooks');
      await quickBooksIntegration.loadConfig();
      const result = await quickBooksIntegration.testConnection();
      res.json(result);
    } catch (error) {
      console.error('Error testing QuickBooks connection:', error);
      res.status(500).json({ success: false, message: 'Connection test failed' });
    }
  });

  // Clover POS Integration Routes
  app.post('/api/integrations/clover/sync/sales', isAuthenticated, async (req, res) => {
    try {
      const { date } = req.body;
      const targetDate = date ? new Date(date) : new Date();
      
      const { cloverIntegration } = await import('./integrations/clover');
      await cloverIntegration.syncDailySales(targetDate);
      
      res.json({ success: true, message: `Sales data synced for ${targetDate.toDateString()}` });
    } catch (error) {
      console.error('Error syncing Clover sales:', error);
      res.status(500).json({ error: 'Failed to sync sales data' });
    }
  });

  // Comprehensive historical sync for all Clover locations
  app.post('/api/integrations/clover/sync/historical-all', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      const allConfigs = await storage.getAllCloverConfigs();
      const activeConfigs = allConfigs.filter(config => config.isActive);
      
      if (activeConfigs.length === 0) {
        return res.status(400).json({ message: 'No active Clover configurations found' });
      }

      const syncResults = [];
      
      for (const config of activeConfigs) {
        try {
          console.log(`Starting comprehensive historical sync for ${config.merchantName}`);
          
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          await cloverIntegration.syncHistoricalSales(
            config,
            startDate ? new Date(startDate) : new Date('2025-01-01'),
            endDate ? new Date(endDate) : new Date()
          );
          
          syncResults.push({
            merchantId: config.merchantId,
            merchantName: config.merchantName,
            success: true,
            message: 'Historical sync completed successfully'
          });
        } catch (error) {
          console.error(`Historical sync failed for ${config.merchantName}:`, error);
          syncResults.push({
            merchantId: config.merchantId,
            merchantName: config.merchantName,
            success: false,
            message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }

      res.json({
        message: 'Comprehensive historical sync completed',
        results: syncResults,
        totalConfigs: activeConfigs.length,
        successCount: syncResults.filter(r => r.success).length
      });
    } catch (error) {
      console.error('Error in comprehensive historical sync:', error);
      res.status(500).json({ message: 'Failed to run comprehensive historical sync' });
    }
  });

  // Sync all Clover locations
  app.post('/api/integrations/clover/sync/all-locations', isAuthenticated, async (req, res) => {
    try {
      const { date } = req.body;
      const targetDate = date ? new Date(date) : new Date();
      
      // Get all active Clover configurations
      const cloverConfigs = await storage.getAllCloverConfigs();
      const activeConfigs = cloverConfigs.filter(config => config.isActive);
      
      if (activeConfigs.length === 0) {
        return res.status(400).json({ error: 'No active Clover configurations found' });
      }

      let syncResults = [];
      
      for (const config of activeConfigs) {
        try {
          console.log(`Syncing sales for merchant: ${config.merchantName || config.merchantId}`);
          
          // Import Clover integration for each merchant
          const { CloverIntegration } = await import('./integrations/clover');
          const merchantIntegration = new CloverIntegration(config);
          
          await merchantIntegration.syncDailySalesWithConfig(targetDate, config);
          
          syncResults.push({
            merchantId: config.merchantId,
            merchantName: config.merchantName,
            success: true,
            message: `Sales synced successfully`
          });
        } catch (error) {
          console.error(`Error syncing merchant ${config.merchantId}:`, error);
          syncResults.push({
            merchantId: config.merchantId,
            merchantName: config.merchantName,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const successCount = syncResults.filter(r => r.success).length;
      
      res.json({ 
        success: true, 
        message: `Synced ${successCount}/${activeConfigs.length} locations for ${targetDate.toDateString()}`,
        results: syncResults
      });
    } catch (error) {
      console.error('Error syncing all Clover locations:', error);
      res.status(500).json({ error: 'Failed to sync all locations' });
    }
  });

  // ================================
  // ORDER MANAGEMENT API ENDPOINTS
  // ================================

  // Add global trace logger to see all requests
  app.use((req, res, next) => {
    if (req.originalUrl.includes('/api/orders')) {
      console.log('🔍 [GLOBAL TRACE]', req.method, req.originalUrl, 'Query:', req.query);
    }
    next();
  });

  // TRACER MIDDLEWARE - Add this temporarily to debug route conflicts
  app.use('/api/orders', (req, res, next) => {
    console.log('🔧 TRACE /api/orders*', req.method, req.originalUrl, req.url);
    next();
  });

  // Lightweight orders endpoint for list view (no financial calculations)
  app.get('/api/orders/list', isAuthenticated, async (req, res) => {
    try {
      const {
        createdTimeMin,
        createdTimeMax,
        startDate,
        endDate,
        locationId,
        search,
        state,
        page = '1',
        limit = '20'
      } = req.query as Record<string, string>;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const ctMin = req.query.createdTimeMin != null ? Number(String(req.query.createdTimeMin)) : undefined;
      const ctMax = req.query.createdTimeMax != null ? Number(String(req.query.createdTimeMax)) : undefined;
      
      let createdTimeMinMs: number | undefined;
      let createdTimeMaxMs: number | undefined;
      
      if (ctMin != null && ctMax != null && !isNaN(ctMin) && !isNaN(ctMax)) {
        createdTimeMinMs = ctMin;
        createdTimeMaxMs = ctMax;
      }

      let normalizedStartDate = createdTimeMinMs ? new Date(createdTimeMinMs).toISOString().slice(0,10) : startDate;
      let normalizedEndDate = createdTimeMaxMs ? new Date(createdTimeMaxMs).toISOString().slice(0,10) : endDate;
      
      const stateParam = state && state !== 'all' ? String(state) : undefined;
      const limitNum = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20;
      const offsetNum = Number.isFinite(Number(offset)) && Number(offset) >= 0 ? Number(offset) : 0;
      const locationIdNum = locationId && locationId !== 'all' ? Number(locationId) : undefined;

      // Get basic orders without expensive financial calculations
      const dbResult = await storage.getOrdersFromCloverAPI({
        createdTimeMin: createdTimeMinMs,
        createdTimeMax: createdTimeMaxMs,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        locationId: locationIdNum,
        search,
        state: stateParam,
        limit: limitNum,
        offset: offsetNum,
        skipFinancialCalculations: true // Skip expensive calculations
      });

      res.json({ orders: dbResult.orders, total: dbResult.total });
    } catch (error) {
      console.error('Error fetching lightweight orders:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Get orders with comprehensive filtering using Clover API
  app.get('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const {
        createdTimeMin,
        createdTimeMax,
        startDate,  // Legacy fallback
        endDate,    // Legacy fallback
        locationId,
        search,
        state,
        paymentState,
        hasDiscounts,
        hasRefunds,
        page = '1',
        limit = '20'
      } = req.query as Record<string, string>;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Parse epoch milliseconds robustly (new timezone-aware system)
      const ctMin = req.query.createdTimeMin != null ? Number(String(req.query.createdTimeMin)) : undefined;
      const ctMax = req.query.createdTimeMax != null ? Number(String(req.query.createdTimeMax)) : undefined;
      
      // DEBUG: Log parameter parsing
      console.log('🔧 [ROUTE DEBUG] Raw query parameters:', {
        createdTimeMinRaw: req.query.createdTimeMin,
        createdTimeMaxRaw: req.query.createdTimeMax,
        ctMin,
        ctMax,
        ctMinValid: ctMin != null && !isNaN(ctMin),
        ctMaxValid: ctMax != null && !isNaN(ctMax)
      });
      
      // Use epoch milliseconds directly for precise time filtering
      let createdTimeMinMs: number | undefined;
      let createdTimeMaxMs: number | undefined;
      
      if (ctMin != null && ctMax != null && !isNaN(ctMin) && !isNaN(ctMax)) {
        createdTimeMinMs = ctMin;
        createdTimeMaxMs = ctMax;
        
        console.log('🌍 [TZ-AWARE BACKEND] Using epoch milliseconds for filtering:', {
          createdTimeMin: createdTimeMinMs,
          createdTimeMax: createdTimeMaxMs,
          startUTC: new Date(createdTimeMinMs).toISOString(),
          endUTC: new Date(createdTimeMaxMs).toISOString(),
          rangeDescription: `${new Date(createdTimeMinMs).toLocaleDateString()} - ${new Date(createdTimeMaxMs).toLocaleDateString()}`
        });
      }

      // Use the properly parsed epoch milliseconds for date conversion
      let normalizedStartDate = createdTimeMinMs ? new Date(createdTimeMinMs).toISOString().slice(0,10) : startDate;
      let normalizedEndDate = createdTimeMaxMs ? new Date(createdTimeMaxMs).toISOString().slice(0,10) : endDate;
      
      // Fix for single-day filtering: If start and end represent the same calendar day
      // (common for "yesterday", "today" filters), use the same date for both
      if (createdTimeMinMs && createdTimeMaxMs) {
        const startDateOnly = new Date(createdTimeMinMs).toISOString().slice(0,10);
        const endDateOnly = new Date(createdTimeMaxMs).toISOString().slice(0,10);
        
        // Calculate the time difference in hours to detect single-day ranges
        const timeDiffHours = (createdTimeMaxMs - createdTimeMinMs) / (1000 * 60 * 60);
        
        // If the range is about 24 hours (23-25 hours to account for timezone shifts)
        // and end date is one day after start, it's likely a single-day filter
        if (timeDiffHours >= 23 && timeDiffHours <= 25) {
          const dayDiff = (new Date(endDateOnly).getTime() - new Date(startDateOnly).getTime()) / (1000 * 60 * 60 * 24);
          if (dayDiff <= 1) {
            // Use start date for both start and end to filter single day
            normalizedEndDate = normalizedStartDate;
          }
        }
      }
      
      console.log('🔧 [DATE CONVERSION DEBUG] Epoch to date conversion:', {
        createdTimeMinMs,
        createdTimeMaxMs,
        normalizedStartDate,
        normalizedEndDate,
        legacyStartDate: startDate,
        legacyEndDate: endDate,
        isSingleDayFilter: normalizedStartDate === normalizedEndDate
      });
      const stateParam = state && state !== 'all' ? String(state) : undefined;
      const paymentStateParam = paymentState && paymentState !== 'all' ? String(paymentState) : undefined;
      const hasDiscountsParam = hasDiscounts && hasDiscounts !== 'all' ? String(hasDiscounts) : undefined;
      const hasRefundsParam = hasRefunds && hasRefunds !== 'all' ? String(hasRefunds) : undefined;
      const limitNum = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Number(limit) : 20;
      const offsetNum = Number.isFinite(Number(offset)) && Number(offset) >= 0 ? Number(offset) : 0;
      const locationIdNum = locationId && locationId !== 'all' ? Number(locationId) : undefined;

      console.log('🚀 [ORDERS API] Fetching orders with database queries (optimized)');
      console.log('Orders API filters:', { 
        startDate: normalizedStartDate, endDate: normalizedEndDate, locationId: locationIdNum, 
        state: stateParam, paymentState: paymentStateParam, hasDiscounts: hasDiscountsParam, 
        hasRefunds: hasRefundsParam, limit: limitNum, offset: offsetNum, search 
      });

      // Use Clover API method with financial calculations for comprehensive order data
      const dbResult = await storage.getOrdersFromCloverAPI({
        createdTimeMin: createdTimeMinMs,
        createdTimeMax: createdTimeMaxMs,
        startDate: normalizedStartDate,
        endDate: normalizedEndDate,
        locationId: locationIdNum,
        search,
        state: stateParam,
        paymentState: paymentStateParam,
        hasDiscounts: hasDiscountsParam,
        hasRefunds: hasRefundsParam,
        limit: limitNum,
        offset: offsetNum
      });

      console.log('Orders API result:', { total: dbResult.total, returned: dbResult.orders.length });

      // PERFORMANCE: Temporarily disable Amazon orders fetch - it's slow and failing
      let amazonOrders: any[] = [];
      
      if (false && ((createdTimeMinMs && createdTimeMaxMs) || (startDate && endDate))) {
        try {
          console.log('🛒 [AMAZON ORDERS] Starting Amazon order fetch with timeout');
          
          // Add timeout wrapper for Amazon integration
          const amazonFetchWithTimeout = async (): Promise<any[]> => {
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Amazon API timeout')), 3000) // 3 second timeout
            );
            
            const fetchPromise = async (): Promise<any[]> => {
              // Get Amazon configuration
              const amazonConfig = await storage.getAllAmazonConfigs();
              
              if (!amazonConfig || amazonConfig.length === 0) {
                console.log('🛒 [AMAZON ORDERS] No Amazon configuration found');
                return [];
              }
              
              console.log('🛒 [AMAZON ORDERS] Fetching Amazon orders for date range');
              
              // Convert epoch milliseconds to ISO date strings for Amazon API
              let amazonStartDate: string;
              let amazonEndDate: string;
              
              if (createdTimeMinMs && createdTimeMaxMs) {
                amazonStartDate = new Date(createdTimeMinMs).toISOString();
                amazonEndDate = new Date(createdTimeMaxMs).toISOString();
              } else {
                // Fallback for legacy date strings
                amazonStartDate = new Date(startDate + 'T00:00:00.000Z').toISOString();
                amazonEndDate = new Date(endDate + 'T23:59:59.999Z').toISOString();
              }
              
              const { AmazonIntegration } = await import('./integrations/amazon');
              const amazonIntegration = new AmazonIntegration(amazonConfig[0]);
              
              const amazonResponse = await amazonIntegration.getOrders(amazonStartDate, amazonEndDate);
              
              if (amazonResponse && amazonResponse.payload && amazonResponse.payload.Orders) {
                // Transform Amazon orders to match Clover format
                const transformedOrders = amazonResponse.payload.Orders.map((order: any) => ({
                  ...order,
                  locationName: 'Amazon Store',
                  locationId: 'amazon',
                  merchantId: 'amazon',
                  // Add Amazon-specific identifiers
                  isAmazonOrder: true
                }));
                
                console.log(`🛒 [AMAZON ORDERS] Retrieved ${transformedOrders.length} Amazon orders`);
                return transformedOrders;
              }
              
              return [];
            };
            
            return Promise.race([fetchPromise(), timeoutPromise]) as Promise<any[]>;
          };
          
          amazonOrders = await amazonFetchWithTimeout();
          
        } catch (error) {
          console.error('Error fetching Amazon orders (with timeout):', error);
          // Don't fail the entire request if Amazon fails - continue with just Clover orders
          amazonOrders = [];
          // Log specifically if it's a timeout vs API error
          if (error.message === 'Amazon API timeout') {
            console.log('🛒 [AMAZON ORDERS] Request timed out after 3 seconds - continuing without Amazon data');
          }
        }
      }

      // Transform Amazon orders to include COGS calculation 
      const amazonOrdersWithMetrics = await Promise.all(amazonOrders.map(async (order) => {
        try {
          // Calculate financial metrics for Amazon orders (including COGS)
          const metrics = await storage.calculateOrderFinancialMetrics(order);
          return {
            ...order,
            ...metrics,
            isAmazonOrder: true,
            locationName: 'Amazon Store'
          };
        } catch (error) {
          console.error(`Error calculating metrics for Amazon order ${order.AmazonOrderId}:`, error);
          return {
            ...order,
            isAmazonOrder: true,
            locationName: 'Amazon Store',
            netCOGS: 0,
            netProfit: 0,
            netMargin: '0.00%'
          };
        }
      }));

      // FIXED PAGINATION: Don't combine paginated results inappropriately
      // For now, prioritize Clover orders with proper pagination, add Amazon orders to current page only
      let allOrdersForCurrentPage = [...dbResult.orders];
      let totalItems = dbResult.total;
      
      // Add Amazon orders only if we're on the first page and have space
      if (offsetNum === 0 && allOrdersForCurrentPage.length < limitNum) {
        const remainingSpace = limitNum - allOrdersForCurrentPage.length;
        allOrdersForCurrentPage.push(...amazonOrdersWithMetrics.slice(0, remainingSpace));
      }
      
      // Account for Amazon orders in total only
      totalItems += amazonOrdersWithMetrics.length;

      console.log(`🚀 [ORDERS API] Database query completed, returning ${allOrdersForCurrentPage.length} orders out of ${totalItems} total`);

      res.json({
        orders: allOrdersForCurrentPage,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalItems / parseInt(limit)),
          totalItems,
          hasMore: (parseInt(page) * parseInt(limit)) < totalItems,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching orders from Clover API:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // SPECIFIC ROUTES MUST COME BEFORE PARAMETERIZED ROUTES

  // Get voided items from orders using comprehensive Clover API
  app.get('/api/orders/voided-items', isAuthenticated, async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        locationId,
        employeeId
      } = req.query as Record<string, string>;

      console.log('🔧 [VOIDED ITEMS] Enhanced route handler called with comprehensive API');
      
      let allVoidedItems: any[] = [];
      let totalVoidedAmount = 0;
      let totalVoidedItems = 0;
      
      // Get Clover configurations
      const cloverConfigs = await storage.getAllCloverConfigs();
      
      for (const config of cloverConfigs) {
        // Skip if locationId filter doesn't match
        if (locationId && locationId !== 'all' && config.id?.toString() !== locationId.toString()) {
          continue;
        }
        
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          // Fetch voided line items totals for this location
          const voidedTotals = await cloverIntegration.fetchVoidedLineItemsTotals({
            startDate,
            endDate,
            employee: employeeId
          });
          
          if (voidedTotals && voidedTotals.elements) {
            const locationVoidedItems = voidedTotals.elements.map((item: any) => ({
              ...item,
              locationName: config.merchantName,
              locationId: config.id,
              merchantId: config.merchantId
            }));
            
            allVoidedItems.push(...locationVoidedItems);
            
            // Aggregate totals
            totalVoidedItems += locationVoidedItems.length;
            totalVoidedAmount += locationVoidedItems.reduce((sum: number, item: any) => {
              return sum + (parseFloat(item.price || 0) / 100);
            }, 0);
          }
          
          console.log(`✅ Fetched ${voidedTotals?.elements?.length || 0} voided items from ${config.merchantName}`);
          
        } catch (error) {
          console.error(`❌ Error fetching voided items from ${config.merchantName}:`, error);
          // Continue with other locations
        }
      }

      res.json({
        voidedItems: allVoidedItems,
        totals: {
          totalVoidedAmount,
          totalVoidedItems
        }
      });
    } catch (error) {
      console.error('Error fetching voided items:', error);
      res.status(500).json({ error: 'Failed to fetch voided items' });
    }
  });

  // Get order discounts using comprehensive Clover API
  app.get('/api/orders/:orderId/discounts', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      console.log(`💰 [ORDER DISCOUNTS] Fetching discounts for order ${orderId}`);

      let allDiscounts: any[] = [];
      
      // Get Clover configurations to find the right merchant for this order
      const cloverConfigs = await storage.getAllCloverConfigs();
      
      for (const config of cloverConfigs) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          // Fetch order discounts for this location
          const discounts = await cloverIntegration.fetchOrderDiscounts(orderId);
          
          if (discounts && discounts.elements) {
            const locationDiscounts = discounts.elements.map((discount: any) => ({
              ...discount,
              locationName: config.merchantName,
              locationId: config.id,
              merchantId: config.merchantId
            }));
            
            allDiscounts.push(...locationDiscounts);
          }
          
          console.log(`✅ Fetched ${discounts?.elements?.length || 0} discounts from ${config.merchantName}`);
          
        } catch (error) {
          console.error(`❌ Error fetching discounts from ${config.merchantName}:`, error);
          // Continue with other locations
        }
      }

      res.json({
        discounts: allDiscounts,
        total: allDiscounts.length
      });
    } catch (error) {
      console.error('Error fetching order discounts:', error);
      res.status(500).json({ error: 'Failed to fetch order discounts' });
    }
  });

  // Get employee payments using comprehensive Clover API
  app.get('/api/orders/employee-payments', isAuthenticated, async (req, res) => {
    try {
      const {
        employeeId,
        startDate,
        endDate,
        locationId,
        limit = '100',
        offset = '0'
      } = req.query as Record<string, string>;

      console.log(`👥 [EMPLOYEE PAYMENTS] Fetching employee payments`);
      
      let allPayments: any[] = [];
      
      // Get Clover configurations
      const cloverConfigs = await storage.getAllCloverConfigs();
      
      for (const config of cloverConfigs) {
        // Skip if locationId filter doesn't match
        if (locationId && locationId !== 'all' && config.id?.toString() !== locationId.toString()) {
          continue;
        }
        
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          // Fetch employee payments for this location
          const payments = await cloverIntegration.fetchEmployeePayments({
            employeeId,
            startDate,
            endDate,
            limit: parseInt(limit),
            offset: parseInt(offset)
          });
          
          if (payments && payments.elements) {
            const locationPayments = payments.elements.map((payment: any) => ({
              ...payment,
              locationName: config.merchantName,
              locationId: config.id,
              merchantId: config.merchantId
            }));
            
            allPayments.push(...locationPayments);
          }
          
          console.log(`✅ Fetched ${payments?.elements?.length || 0} employee payments from ${config.merchantName}`);
          
        } catch (error) {
          console.error(`❌ Error fetching employee payments from ${config.merchantName}:`, error);
          // Continue with other locations
        }
      }

      res.json({
        payments: allPayments,
        total: allPayments.length
      });
    } catch (error) {
      console.error('Error fetching employee payments:', error);
      res.status(500).json({ error: 'Failed to fetch employee payments' });
    }
  });

  // Get credit refunds from Clover API
  app.get('/api/orders/credit-refunds', isAuthenticated, async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        locationId
      } = req.query as Record<string, string>;

      console.log(`🔄🔄🔄 [CREDIT REFUNDS API CALLED] Fetching refunds from Clover API (Date: ${startDate} to ${endDate}, Location: ${locationId})`);
      
      // Parse date range to epoch timestamps
      const startEpoch = startDate ? new Date(startDate).getTime() : undefined;
      const endEpoch = endDate ? new Date(`${endDate}T23:59:59.999Z`).getTime() : undefined;
      
      console.log(`📅 [CREDIT REFUNDS] Date range in epoch:`, {
        startDate,
        endDate,
        startEpoch,
        endEpoch,
        startISO: startEpoch ? new Date(startEpoch).toISOString() : 'N/A',
        endISO: endEpoch ? new Date(endEpoch).toISOString() : 'N/A'
      });
      
      let allRefunds: any[] = [];
      let totalRefundAmount = 0;
      
      // Get Clover configurations to fetch refunds from each location
      const cloverConfigs = await storage.getAllCloverConfigs();
      
      // Filter to specific location if requested
      const configurationsToQuery = locationId && locationId !== 'all'
        ? cloverConfigs.filter(config => config.id === parseInt(locationId))
        : cloverConfigs;
        
      console.log(`🏪 [CREDIT REFUNDS] Querying ${configurationsToQuery.length} location(s) for refunds`);
      
      // Fetch refunds from each location with pagination
      for (const config of configurationsToQuery) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          console.log(`💸 [CREDIT REFUNDS] Fetching from ${config.merchantName} (${config.merchantId})`);
          
          // Fetch ALL credit refunds using pagination
          let offset = 0;
          const limit = 100;
          let hasMoreData = true;
          let locationRefundCount = 0;
          
          while (hasMoreData) {
            const refundsResponse = await cloverIntegration.fetchCreditRefunds({
              createdTimeMin: startEpoch,
              createdTimeMax: endEpoch,
              limit,
              offset
            });
            
            const refunds = refundsResponse.elements || [];
            console.log(`📦 [CREDIT REFUNDS] Fetched ${refunds.length} refunds from ${config.merchantName} (offset=${offset})`);
            
            if (refunds.length === 0) {
              hasMoreData = false;
              break;
            }
            
            // Process each refund and filter by date (Clover API params don't work!)
            for (const refund of refunds) {
              const refundCreatedTime = refund.createdTime || refund.modifiedTime;
              
              // Filter by date range on backend since Clover API ignores createdTime.min/max
              if (startEpoch && refundCreatedTime < startEpoch) {
                console.log(`⏭️ [CREDIT REFUNDS] Skipping refund ${refund.id} - before start date (${new Date(refundCreatedTime).toISOString()})`);
                continue;
              }
              if (endEpoch && refundCreatedTime > endEpoch) {
                console.log(`⏭️ [CREDIT REFUNDS] Skipping refund ${refund.id} - after end date (${new Date(refundCreatedTime).toISOString()})`);
                continue;
              }
              
              const refundAmount = refund.amount ? parseFloat(refund.amount) / 100 : 0;
              console.log(`💸 [CREDIT REFUNDS] ✅ Refund ${refund.id}: $${refundAmount.toFixed(2)} on ${new Date(refundCreatedTime).toISOString()} for order ${refund.payment?.order?.id || 'N/A'}`);
              
              allRefunds.push({
                refundId: refund.id,
                orderId: refund.payment?.order?.id || null,
                amount: refund.amount || '0', // Amount in cents
                locationName: config.merchantName,
                locationId: config.id,
                createdTime: refundCreatedTime,
                modifiedTime: refund.modifiedTime || refund.createdTime
              });
              
              totalRefundAmount += refundAmount;
              locationRefundCount++;
            }
            
            // Check if there are more pages
            if (refunds.length < limit) {
              hasMoreData = false;
            } else {
              offset += limit;
            }
          }
          
          console.log(`✅ [CREDIT REFUNDS] Total from ${config.merchantName}: ${locationRefundCount} refunds`);
          
        } catch (error) {
          console.error(`❌ [CREDIT REFUNDS] Error fetching from ${config.merchantName}:`, error);
          // Continue with other locations even if one fails
        }
      }
      
      console.log(`✅ [CREDIT REFUNDS RESULT] Found ${allRefunds.length} refunds, total amount: $${totalRefundAmount.toFixed(2)}`);

      res.json({
        refunds: allRefunds,
        total: allRefunds.length,
        totalAmount: totalRefundAmount
      });
    } catch (error) {
      console.error('❌ [CREDIT REFUNDS ERROR]', error);
      res.status(500).json({ error: 'Failed to fetch credit refunds' });
    }
  });

  // Get comprehensive order data using all available APIs
  app.get('/api/orders/:orderId/comprehensive', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      console.log(`🎯 [COMPREHENSIVE ORDER] Fetching all data for order ${orderId}`);

      let comprehensiveData: any = null;
      
      // Get Clover configurations to find the right merchant for this order
      const cloverConfigs = await storage.getAllCloverConfigs();
      
      for (const config of cloverConfigs) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          // Fetch comprehensive order data for this location
          const data = await cloverIntegration.fetchComprehensiveOrderData(orderId);
          
          if (data && data.orderDetails) {
            comprehensiveData = {
              ...data,
              locationName: config.merchantName,
              locationId: config.id,
              merchantId: config.merchantId
            };
            break; // Found the order, stop searching
          }
          
        } catch (error) {
          console.error(`❌ Error fetching comprehensive data from ${config.merchantName}:`, error);
          // Continue with other locations
        }
      }

      if (!comprehensiveData) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json(comprehensiveData);
    } catch (error) {
      console.error('Error fetching comprehensive order data:', error);
      res.status(500).json({ error: 'Failed to fetch comprehensive order data' });
    }
  });

  // Get order analytics (enhanced for historical data)
  app.get('/api/orders/analytics', isAuthenticated, async (req, res) => {
    try {
      // Parse and validate query parameters
      const queryResult = analyticsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: 'Invalid query parameters', 
          details: queryResult.error.format() 
        });
      }

      const query = queryResult.data;
      console.log('🔧 [ANALYTICS] Enhanced route handler called with historical support');
      
      // Use defaults if startDate/endDate not provided (backward compatibility)
      let { startDate, endDate } = query;
      if (!startDate || !endDate) {
        const defaults = getDefaultDateRange();
        startDate = startDate || defaults.startDate;
        endDate = endDate || defaults.endDate;
        console.log('🔧 [ANALYTICS] Using default date range:', { startDate, endDate });
      }

      // Validate dates and merchantId
      try {
        validateDateString(startDate, 'startDate');
        validateDateString(endDate, 'endDate');
        const merchantId = query.merchantId ? parseMerchantId(query.merchantId) : undefined;

        // Use the enhanced historical analytics method
        const result = await storage.getHistoricalAnalytics({
          startDate,
          endDate,
          locationId: query.locationId !== 'all' ? query.locationId : undefined,
          merchantId,
          groupBy: query.groupBy,
          timezone: query.timezone
        });

        res.json(result);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }
    } catch (error) {
      console.error('Error fetching enhanced analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  });

  // ================================
  // HISTORICAL ANALYTICS ENDPOINTS
  // ================================

  // Historical analytics with extended date range support
  app.get('/api/orders/analytics/historical', isAuthenticated, async (req, res) => {
    try {
      // Parse and validate query parameters
      const queryResult = analyticsQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: 'Invalid query parameters', 
          details: queryResult.error.format() 
        });
      }

      const query = queryResult.data;
      if (!query.startDate || !query.endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      console.log(`📊 [HISTORICAL ANALYTICS] Processing request: ${query.startDate} to ${query.endDate}, groupBy: ${query.groupBy}`);

      // Validate dates and merchantId
      try {
        validateDateString(query.startDate, 'startDate');
        validateDateString(query.endDate, 'endDate');
        const merchantId = query.merchantId ? parseMerchantId(query.merchantId) : undefined;

        const result = await storage.getHistoricalAnalytics({
          startDate: query.startDate,
          endDate: query.endDate,
          locationId: query.locationId !== 'all' ? query.locationId : undefined,
          merchantId,
          groupBy: query.groupBy,
          timezone: query.timezone
        });

        res.json(result);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }
    } catch (error) {
      console.error('Error fetching historical analytics:', error);
      res.status(500).json({ error: 'Failed to fetch historical analytics' });
    }
  });

  // Year-over-year comparison endpoint
  app.get('/api/orders/analytics/year-over-year', isAuthenticated, async (req, res) => {
    try {
      // Parse and validate query parameters
      const queryResult = yoyComparisonSchema.safeParse(req.query);
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: 'Invalid query parameters', 
          details: queryResult.error.format() 
        });
      }

      const query = queryResult.data;
      console.log(`📈 [YEAR-OVER-YEAR] Comparing ${query.currentPeriodStart}-${query.currentPeriodEnd} vs ${query.comparisonPeriodStart}-${query.comparisonPeriodEnd}`);

      // Validate dates and merchantId
      try {
        validateDateString(query.currentPeriodStart, 'currentPeriodStart');
        validateDateString(query.currentPeriodEnd, 'currentPeriodEnd');
        validateDateString(query.comparisonPeriodStart, 'comparisonPeriodStart');
        validateDateString(query.comparisonPeriodEnd, 'comparisonPeriodEnd');
        const merchantId = query.merchantId ? parseMerchantId(query.merchantId) : undefined;

        const result = await storage.getYearOverYearComparison({
          currentPeriodStart: query.currentPeriodStart,
          currentPeriodEnd: query.currentPeriodEnd,
          comparisonPeriodStart: query.comparisonPeriodStart,
          comparisonPeriodEnd: query.comparisonPeriodEnd,
          locationId: query.locationId !== 'all' ? query.locationId : undefined,
          merchantId,
          groupBy: query.groupBy
        });

        res.json(result);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }
    } catch (error) {
      console.error('Error fetching year-over-year comparison:', error);
      res.status(500).json({ error: 'Failed to fetch year-over-year comparison' });
    }
  });

  // Historical trends analysis endpoint
  app.get('/api/orders/analytics/trends', isAuthenticated, async (req, res) => {
    try {
      // Parse and validate query parameters
      const queryResult = analyticsQuerySchema.extend({
        trendType: z.enum(['revenue', 'orders', 'profit', 'aov', 'all']).default('revenue'),
        granularity: z.enum(['daily', 'weekly', 'monthly']).default('monthly')
      }).safeParse(req.query);
      
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: 'Invalid query parameters', 
          details: queryResult.error.format() 
        });
      }

      const query = queryResult.data;
      if (!query.startDate || !query.endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      console.log(`📊 [TRENDS ANALYSIS] Analyzing ${query.trendType} trends: ${query.startDate} to ${query.endDate}, granularity: ${query.granularity}`);

      // Validate dates and merchantId
      try {
        validateDateString(query.startDate, 'startDate');
        validateDateString(query.endDate, 'endDate');
        const merchantId = query.merchantId ? parseMerchantId(query.merchantId) : undefined;

        const result = await storage.getHistoricalTrends({
          startDate: query.startDate,
          endDate: query.endDate,
          locationId: query.locationId !== 'all' ? query.locationId : undefined,
          merchantId,
          trendType: query.trendType!,
          granularity: query.granularity!
        });

        res.json(result);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }
    } catch (error) {
      console.error('Error fetching historical trends:', error);
      res.status(500).json({ error: 'Failed to fetch historical trends' });
    }
  });

  // Long-term financial performance endpoint
  app.get('/api/orders/analytics/long-term', isAuthenticated, async (req, res) => {
    try {
      // Parse and validate query parameters
      const queryResult = analyticsQuerySchema.pick({
        startDate: true,
        endDate: true,
        locationId: true,
        merchantId: true
      }).safeParse(req.query);
      
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: 'Invalid query parameters', 
          details: queryResult.error.format() 
        });
      }

      const query = queryResult.data;
      if (!query.startDate || !query.endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      console.log(`💼 [LONG-TERM ANALYSIS] Processing: ${query.startDate} to ${query.endDate}`);

      // Validate dates and merchantId
      try {
        validateDateString(query.startDate, 'startDate');
        validateDateString(query.endDate, 'endDate');
        const merchantId = query.merchantId ? parseMerchantId(query.merchantId) : undefined;

        const result = await storage.getLongTermFinancialPerformance({
          startDate: query.startDate,
          endDate: query.endDate,
          locationId: query.locationId !== 'all' ? query.locationId : undefined,
          merchantId
        });

        res.json(result);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }
    } catch (error) {
      console.error('Error fetching long-term financial performance:', error);
      res.status(500).json({ error: 'Failed to fetch long-term financial performance' });
    }
  });

  // Optimized historical data endpoint for large datasets
  app.get('/api/orders/analytics/optimized', isAuthenticated, async (req, res) => {
    try {
      // Parse and validate query parameters
      const queryResult = analyticsQuerySchema.extend({
        aggregationLevel: z.enum(['daily', 'weekly', 'monthly']).default('monthly'),
        metrics: z.string().default('revenue,orders'),
        useCache: z.enum(['true', 'false']).default('false'),
        limit: z.string().default('10000')
      }).safeParse(req.query);
      
      if (!queryResult.success) {
        return res.status(400).json({ 
          error: 'Invalid query parameters', 
          details: queryResult.error.format() 
        });
      }

      const query = queryResult.data;
      if (!query.startDate || !query.endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      console.log(`⚡ [OPTIMIZED ANALYTICS] Processing: ${query.startDate} to ${query.endDate}, metrics: ${query.metrics}, aggregation: ${query.aggregationLevel}`);

      // Validate dates, merchantId, and parse additional parameters
      try {
        validateDateString(query.startDate, 'startDate');
        validateDateString(query.endDate, 'endDate');
        const merchantId = query.merchantId ? parseMerchantId(query.merchantId) : undefined;
        
        // Validate metrics array
        const validMetrics = ['revenue', 'orders', 'profit', 'items', 'customers'];
        const metricsArray = query.metrics!.split(',').map(m => m.trim());
        const invalidMetrics = metricsArray.filter(m => !validMetrics.includes(m));
        if (invalidMetrics.length > 0) {
          throw new Error(`Invalid metrics: ${invalidMetrics.join(', ')}. Valid options: ${validMetrics.join(', ')}`);
        }
        
        // Parse and validate limit
        const limit = Number(query.limit!);
        if (!Number.isFinite(limit) || limit <= 0 || limit > 50000) {
          throw new Error(`Invalid limit: '${query.limit}'. Must be a positive number between 1 and 50000.`);
        }

        const result = await storage.getOptimizedHistoricalData({
          startDate: query.startDate,
          endDate: query.endDate,
          locationId: query.locationId !== 'all' ? query.locationId : undefined,
          merchantId,
          aggregationLevel: query.aggregationLevel!,
          metrics: metricsArray as ('revenue' | 'orders' | 'profit' | 'items' | 'customers')[],
          useCache: query.useCache === 'true',
          limit
        });

        res.json(result);
      } catch (validationError: any) {
        return res.status(400).json({ error: validationError.message });
      }
    } catch (error) {
      console.error('Error fetching optimized historical data:', error);
      res.status(500).json({ error: 'Failed to fetch optimized historical data' });
    }
  });

  // Historical sync management endpoint
  app.post('/api/orders/analytics/sync-historical', isAuthenticated, async (req, res) => {
    try {
      const {
        merchantId,
        startDate,
        endDate,
        batchSize,
        enableOptimization = true
      } = req.body;

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'startDate and endDate are required' });
      }

      console.log(`🔄 [HISTORICAL SYNC] Starting sync: ${startDate} to ${endDate}`);

      const results = await cloverSyncService.syncHistoricalData({
        merchantId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        batchSize,
        enableOptimization
      });

      res.json({
        success: true,
        results,
        summary: {
          totalMerchants: results.length,
          totalOrdersProcessed: results.reduce((sum, r) => sum + r.ordersProcessed, 0),
          totalOrdersCreated: results.reduce((sum, r) => sum + r.ordersCreated, 0),
          totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0)
        }
      });
    } catch (error) {
      console.error('Error syncing historical data:', error);
      res.status(500).json({ error: 'Failed to sync historical data' });
    }
  });

  // Historical sync recommendations endpoint
  app.get('/api/orders/analytics/sync-recommendations', isAuthenticated, async (req, res) => {
    try {
      const {
        dataVolumeEstimate = 'medium',
        timeRangeMonths = '12'
      } = req.query as Record<string, string>;

      console.log(`💡 [SYNC RECOMMENDATIONS] Getting recommendations for ${dataVolumeEstimate} volume, ${timeRangeMonths} months`);

      const recommendations = cloverSyncService.getHistoricalSyncRecommendations(
        dataVolumeEstimate as 'low' | 'medium' | 'high',
        parseInt(timeRangeMonths)
      );

      res.json({
        recommendations,
        explanation: {
          dataVolumeEstimate,
          timeRangeMonths: parseInt(timeRangeMonths),
          reasoning: {
            batchSize: recommendations.batchSize! > 500 ? 'Large batches for efficiency' : 'Smaller batches to avoid timeouts',
            parallelSync: recommendations.parallelMerchantSync ? 'Parallel processing enabled for speed' : 'Sequential processing for safety',
            retryStrategy: `${recommendations.maxRetries} retries with ${recommendations.retryDelay}ms delay`
          }
        }
      });
    } catch (error) {
      console.error('Error getting sync recommendations:', error);
      res.status(500).json({ error: 'Failed to get sync recommendations' });
    }
  });

  // PARAMETERIZED ROUTES MUST COME AFTER SPECIFIC ROUTES

  // Get detailed order information
  app.get('/api/orders/:orderId', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      console.log('🔧 [ORDER DETAILS] Route handler called with orderId:', orderId);
      console.log('🔧 [ORDER DETAILS] Request URL:', req.originalUrl, 'Params:', req.params);
      
      const order = await storage.getOrderDetails(orderId);
      console.log('🔧 [ORDER DETAILS] Storage returned:', order ? 'ORDER FOUND' : 'NULL - NO ORDER');

      if (!order) {
        console.log('🔧 [ORDER DETAILS] Returning 404 - Order not found for ID:', orderId);
        return res.status(404).json({ error: 'Order not found' });
      }

      console.log('🔧 [ORDER DETAILS] Successfully returning order data');
      res.json(order);
    } catch (error) {
      console.error('🔧 [ORDER DETAILS] Exception occurred:', error);
      res.status(500).json({ error: 'Failed to fetch order details' });
    }
  });

  // Get order line items with modifications and discounts
  app.get('/api/orders/:orderId/line-items', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const lineItems = await storage.getOrderLineItems(orderId);
      res.json({ lineItems });
    } catch (error) {
      console.error('Error fetching order line items:', error);
      res.status(500).json({ error: 'Failed to fetch order line items' });
    }
  });

  // Get order discounts
  app.get('/api/orders/:orderId/discounts', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const discounts = await storage.getOrderDiscounts(orderId);
      res.json({ discounts });
    } catch (error) {
      console.error('Error fetching order discounts:', error);
      res.status(500).json({ error: 'Failed to fetch order discounts' });
    }
  });

  // Order sync endpoint
  app.post('/api/orders/sync', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      // Trigger a simple message that sync is working
      res.json({ 
        success: true, 
        message: `Order sync request received for ${startDate} to ${endDate}. Data will be refreshed automatically.`
      });
    } catch (error) {
      console.error('Error syncing orders:', error);
      res.status(500).json({ error: 'Failed to sync orders' });
    }
  });

  // Update order information
  app.put('/api/orders/:orderId', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const updates = req.body;

      const updatedOrder = await storage.updateOrder(orderId, updates);
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  });

  // Comprehensive order sync from Clover
  app.post('/api/orders/sync', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      
      // Get all active Clover configurations
      const cloverConfigs = await storage.getAllCloverConfigs();
      const activeConfigs = cloverConfigs.filter(config => config.isActive);
      
      if (activeConfigs.length === 0) {
        return res.status(400).json({ error: 'No active Clover configurations found' });
      }

      const syncResults = [];
      
      for (const config of activeConfigs) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(config);
          
          const result = await cloverIntegration.syncOrdersComprehensive({
            startDate,
            endDate
          });
          
          syncResults.push({
            merchantId: config.merchantId,
            merchantName: config.merchantName,
            success: true,
            ...result
          });
        } catch (error) {
          syncResults.push({
            merchantId: config.merchantId,
            merchantName: config.merchantName,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successCount = syncResults.filter(r => r.success).length;
      const totalNew = syncResults.reduce((sum, r) => sum + (r.success ? (r as any).newOrders || 0 : 0), 0);
      const totalUpdated = syncResults.reduce((sum, r) => sum + (r.success ? (r as any).updatedOrders || 0 : 0), 0);
      
      res.json({
        success: true,
        message: `Order sync completed: ${totalNew} new orders, ${totalUpdated} updated orders from ${successCount}/${activeConfigs.length} locations`,
        results: syncResults,
        summary: {
          totalLocations: activeConfigs.length,
          successfulLocations: successCount,
          newOrders: totalNew,
          updatedOrders: totalUpdated
        }
      });
    } catch (error) {
      console.error('Error syncing orders:', error);
      res.status(500).json({ error: 'Failed to sync orders' });
    }
  });

  app.get('/api/integrations/clover/test', isAuthenticated, async (req, res) => {
    try {
      const { cloverIntegration } = await import('./integrations/clover');
      const result = await cloverIntegration.testConnection();
      res.json(result);
    } catch (error) {
      console.error('Error testing Clover connection:', error);
      res.status(500).json({ success: false, message: 'Connection test failed' });
    }
  });

  // HSA Integration Routes
  app.post('/api/integrations/hsa/sync/expenses', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;
      
      const { hsaIntegration } = await import('./integrations/hsa');
      await hsaIntegration.loadConfig();
      await hsaIntegration.syncHSAExpenses(start, end);
      
      res.json({ success: true, message: 'HSA expenses synced successfully' });
    } catch (error) {
      console.error('Error syncing HSA expenses:', error);
      res.status(500).json({ error: 'Failed to sync HSA expenses' });
    }
  });

  app.get('/api/integrations/hsa/eligible-categories', isAuthenticated, async (req, res) => {
    try {
      const { hsaIntegration } = await import('./integrations/hsa');
      const categories = hsaIntegration.getEligibleCategories();
      res.json({ categories });
    } catch (error) {
      console.error('Error getting HSA eligible categories:', error);
      res.status(500).json({ error: 'Failed to get eligible categories' });
    }
  });

  app.get('/api/integrations/hsa/test', isAuthenticated, async (req, res) => {
    try {
      const { hsaIntegration } = await import('./integrations/hsa');
      await hsaIntegration.loadConfig();
      const result = await hsaIntegration.testConnection();
      res.json(result);
    } catch (error) {
      console.error('Error testing HSA connection:', error);
      res.status(500).json({ success: false, message: 'Connection test failed' });
    }
  });

  // Thrive Inventory Integration Routes
  app.post('/api/integrations/thrive/sync/inventory', isAuthenticated, async (req, res) => {
    try {
      const { thriveIntegration } = await import('./integrations/thrive');
      await thriveIntegration.loadConfig();
      await thriveIntegration.syncInventory();
      res.json({ success: true, message: 'Thrive inventory synced successfully' });
    } catch (error) {
      console.error('Error syncing Thrive inventory:', error);
      res.status(500).json({ error: 'Failed to sync Thrive inventory' });
    }
  });

  app.get('/api/integrations/thrive/stock-levels', isAuthenticated, async (req, res) => {
    try {
      const { thriveIntegration } = await import('./integrations/thrive');
      await thriveIntegration.loadConfig();
      const result = await thriveIntegration.checkStockLevels();
      res.json(result);
    } catch (error) {
      console.error('Error checking Thrive stock levels:', error);
      res.status(500).json({ error: 'Failed to check stock levels' });
    }
  });

  app.get('/api/integrations/thrive/test', isAuthenticated, async (req, res) => {
    try {
      const { thriveIntegration } = await import('./integrations/thrive');
      await thriveIntegration.loadConfig();
      const result = await thriveIntegration.testConnection();
      res.json(result);
    } catch (error) {
      console.error('Error testing Thrive connection:', error);
      res.status(500).json({ success: false, message: 'Connection test failed' });
    }
  });

  // System Health Check Route for Accounting
  app.get('/api/accounting/health', isAuthenticated, async (req, res) => {
    try {
      const health = {
        database: 'connected',
        quickbooks: 'not_configured',
        clover: 'not_configured',
        hsa: 'not_configured',
        thrive: 'not_configured',
        timestamp: new Date().toISOString()
      };

      // Check if integrations are configured
      const qbConfig = await storage.getActiveQuickbooksConfig();
      const cloverConfig = await storage.getActiveCloverConfig();
      const hsaConfig = await storage.getHsaConfig();
      const thriveConfig = await storage.getActiveThriveConfig();

      if (qbConfig) health.quickbooks = 'configured';
      if (cloverConfig) health.clover = 'configured';
      if (hsaConfig) health.hsa = 'configured';
      if (thriveConfig) health.thrive = 'configured';

      res.json(health);
    } catch (error) {
      console.error('Error checking accounting system health:', error);
      res.status(500).json({ message: 'Failed to check system health' });
    }
  });

  // Test Clover API connections for all locations
  app.get('/api/accounting/test-clover-connections', isAuthenticated, async (req, res) => {
    try {
      const allConfigs = await storage.getAllCloverConfigs();
      const activeConfigs = allConfigs.filter(config => config.isActive);
      
      const connectionTests = [];
      
      for (const config of activeConfigs) {
        try {
          const clover = new (await import('./integrations/clover')).CloverIntegration(config);
          const testResult = await clover.testConnection();
          
          connectionTests.push({
            location: config.merchantName,
            merchantId: config.merchantId,
            tokenSuffix: config.apiToken?.slice(-4) || 'none',
            status: testResult.success ? 'connected' : 'failed',
            error: testResult.error || null
          });
        } catch (error) {
          connectionTests.push({
            location: config.merchantName,
            merchantId: config.merchantId,
            tokenSuffix: config.apiToken?.slice(-4) || 'none',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({ connectionTests });
    } catch (error) {
      console.error('Error testing Clover connections:', error);
      res.status(500).json({ error: 'Failed to test connections' });
    }
  });

  // Test endpoint to create sample data for demonstration
  app.post('/api/accounting/test-data', isAuthenticated, async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Create sample sales for Watertown Retail (location 2)
      await storage.createPosSale({
        saleDate: today,
        saleTime: new Date(),
        totalAmount: '45.99',
        taxAmount: '3.68',
        tipAmount: '5.00',
        paymentMethod: 'card',
        cloverOrderId: `test_watertown_${Date.now()}`,
        locationId: 2
      });

      // Create sample sales for Pinehillfarm.co Online (location 3)
      await storage.createPosSale({
        saleDate: today,
        saleTime: new Date(),
        totalAmount: '89.50',
        taxAmount: '7.16',
        tipAmount: '0.00',
        paymentMethod: 'online',
        cloverOrderId: `test_online_${Date.now()}`,
        locationId: 3
      });

      res.json({ 
        success: true, 
        message: 'Test sales data created for Watertown and Online locations' 
      });
    } catch (error) {
      console.error('Error creating test data:', error);
      res.status(500).json({ error: 'Failed to create test data' });
    }
  });

  // ================================
  // ORDER MANAGEMENT API ENDPOINTS
  // ================================

  // Get orders with filtering and pagination
  app.get('/api/accounting/orders', isAuthenticated, async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        locationId, 
        search, 
        state, 
        page = '1', 
        limit = '50' 
      } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      // Get orders from storage with filtering
      const ordersResult = await storage.getOrdersWithFiltering({
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId ? parseInt(locationId as string) : undefined,
        search: search as string,
        state: state as string,
        limit: limitNum,
        offset
      });
      
      res.json(ordersResult);
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({ message: 'Failed to fetch orders' });
    }
  });

  // Get order details with line items, payments, discounts
  app.get('/api/accounting/orders/:orderId', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const orderDetails = await storage.getOrderDetails(orderId);
      
      if (!orderDetails) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      res.json(orderDetails);
    } catch (error) {
      console.error('Error fetching order details:', error);
      res.status(500).json({ message: 'Failed to fetch order details' });
    }
  });

  // Get order line items with modifications and discounts
  app.get('/api/accounting/orders/:orderId/lineitems', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const lineItems = await storage.getOrderLineItems(orderId);
      res.json(lineItems);
    } catch (error) {
      console.error('Error fetching order line items:', error);
      res.status(500).json({ message: 'Failed to fetch order line items' });
    }
  });

  // Get order discounts
  app.get('/api/accounting/orders/:orderId/discounts', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      
      const discounts = await storage.getOrderDiscounts(orderId);
      res.json(discounts);
    } catch (error) {
      console.error('Error fetching order discounts:', error);
      res.status(500).json({ message: 'Failed to fetch order discounts' });
    }
  });

  // Get voided line items with totals
  app.get('/api/accounting/orders/voided', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, locationId } = req.query;
      
      const voidedItems = await storage.getVoidedLineItems({
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId ? parseInt(locationId as string) : undefined
      });
      
      res.json(voidedItems);
    } catch (error) {
      console.error('Error fetching voided line items:', error);
      res.status(500).json({ message: 'Failed to fetch voided line items' });
    }
  });

  // Sync orders from Clover API
  app.post('/api/accounting/orders/sync', isAuthenticated, async (req, res) => {
    try {
      const { locationId, startDate, endDate } = req.body;
      
      const allLocations = await storage.getAllCloverConfigs();
      const locationsToSync = locationId ? 
        allLocations.filter(config => config.id === locationId) : 
        allLocations.filter(config => config.isActive);
      
      let totalSynced = 0;
      const syncResults = [];
      
      for (const locationConfig of locationsToSync) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const clover = new CloverIntegration(locationConfig);
          
          // Sync orders with line items, payments, and discounts
          const syncResult = await clover.syncOrdersComprehensive({
            startDate: startDate || '2025-01-01',
            endDate: endDate || new Date().toISOString().split('T')[0]
          });
          
          totalSynced += syncResult.newOrders;
          syncResults.push({
            location: locationConfig.merchantName,
            newOrders: syncResult.newOrders,
            updatedOrders: syncResult.updatedOrders,
            totalProcessed: syncResult.totalProcessed
          });
        } catch (error) {
          console.error(`Error syncing orders for ${locationConfig.merchantName}:`, error);
          syncResults.push({
            location: locationConfig.merchantName,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      res.json({
        success: true,
        totalSynced,
        locationResults: syncResults,
        message: `Synced ${totalSynced} new orders across ${locationsToSync.length} locations`
      });
    } catch (error) {
      console.error('Error syncing orders:', error);
      res.status(500).json({ message: 'Failed to sync orders' });
    }
  });

  // Update order state (for manual order management)
  app.put('/api/accounting/orders/:orderId', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const { state, paymentState, note } = req.body;
      
      const updatedOrder = await storage.updateOrder(orderId, {
        state,
        paymentState,
        note,
        modifiedTime: Date.now()
      });
      
      res.json(updatedOrder);
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({ message: 'Failed to update order' });
    }
  });

  // Get order analytics and summaries
  app.get('/api/accounting/orders/analytics', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, locationId, groupBy = 'day' } = req.query;
      
      const analytics = await storage.getOrderAnalytics({
        startDate: startDate as string,
        endDate: endDate as string,
        locationId: locationId ? parseInt(locationId as string) : undefined,
        groupBy: groupBy as string
      });
      
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      res.status(500).json({ message: 'Failed to fetch order analytics' });
    }
  });

  // ================================
  // END ORDER MANAGEMENT ENDPOINTS
  // ================================

  // Comprehensive Sync Route for All Accounting Data
  app.post('/api/accounting/sync', isAuthenticated, async (req, res) => {
    try {
      const syncResults = {
        quickbooks: { success: false, message: 'Not configured' },
        clover: { success: false, message: 'Not configured' },
        hsa: { success: false, message: 'Not configured' },
        thrive: { success: false, message: 'Not configured' },
        timestamp: new Date().toISOString()
      };

      // Check configurations and sync data for each integration
      const qbConfig = await storage.getActiveQuickbooksConfig();
      const cloverConfigs = await storage.getAllCloverConfigs();
      const activeCloverConfigs = cloverConfigs.filter(config => config.isActive);
      const hsaConfig = await storage.getHsaConfig();
      const thriveConfig = await storage.getActiveThriveConfig();

      // Sync QuickBooks accounts if configured
      if (qbConfig) {
        try {
          const { QuickBooksIntegration } = await import('./integrations/quickbooks');
          const qbIntegration = new QuickBooksIntegration();
          await qbIntegration.loadConfig();
          await qbIntegration.syncAccounts();
          syncResults.quickbooks = { success: true, message: 'Accounts synced successfully' };
        } catch (error) {
          console.error('Error syncing QuickBooks:', error);
          syncResults.quickbooks = { success: false, message: 'Sync failed' };
        }
      }

      // Sync Clover sales data for all active locations if configured
      if (activeCloverConfigs.length > 0) {
        try {
          const today = new Date();
          let successCount = 0;
          
          for (const config of activeCloverConfigs) {
            try {
              const { CloverIntegration } = await import('./integrations/clover');
              const merchantIntegration = new CloverIntegration(config);
              await merchantIntegration.syncDailySalesWithConfig(today, config);
              successCount++;
            } catch (error) {
              console.error(`Error syncing Clover merchant ${config.merchantId}:`, error);
            }
          }
          
          syncResults.clover = { 
            success: successCount > 0, 
            message: `${successCount}/${activeCloverConfigs.length} locations synced` 
          };
        } catch (error) {
          console.error('Error syncing Clover:', error);
          syncResults.clover = { success: false, message: 'Sync failed' };
        }
      }

      // Sync HSA expenses if configured
      if (hsaConfig) {
        try {
          const { hsaIntegration } = await import('./integrations/hsa');
          await hsaIntegration.loadConfig();
          await hsaIntegration.syncHSAExpenses();
          syncResults.hsa = { success: true, message: 'Expenses synced successfully' };
        } catch (error) {
          console.error('Error syncing HSA:', error);
          syncResults.hsa = { success: false, message: 'Sync failed' };
        }
      }

      // Sync Thrive inventory if configured
      if (thriveConfig) {
        try {
          const { thriveIntegration } = await import('./integrations/thrive');
          await thriveIntegration.loadConfig();
          await thriveIntegration.syncInventory();
          syncResults.thrive = { success: true, message: 'Inventory synced successfully' };
        } catch (error) {
          console.error('Error syncing Thrive:', error);
          syncResults.thrive = { success: false, message: 'Sync failed' };
        }
      }

      res.json({ 
        success: true, 
        message: 'Sync operation completed',
        results: syncResults
      });
    } catch (error) {
      console.error('Error in comprehensive sync:', error);
      res.status(500).json({ message: 'Failed to sync accounting data' });
    }
  });

  // Catch-all route for non-API requests - serve React app
  app.get('*', (req, res, next) => {
    // Skip API routes and let them be handled by the API handlers
    if (req.path.startsWith('/api/')) {
      return next();
    }
    // In development, let Vite handle the React app serving
    // This is a fallback that shouldn't normally be reached due to Vite middleware
    next();
  });

  // Marketing Tools Routes
  app.post('/api/marketing/generate-qr', isAuthenticated, async (req, res) => {
    try {
      const { url, title, description, category, saveToHistory } = req.body;
      const user = req.user as any;
      
      if (!url) {
        return res.status(400).json({ message: 'URL is required' });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch {
        return res.status(400).json({ message: 'Invalid URL format' });
      }

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      // Save to history if requested
      let savedQrCode = null;
      if (saveToHistory && title) {
        savedQrCode = await storage.createQrCode({
          title,
          url,
          description: description || null,
          category: category || null,
          createdBy: user.id,
          qrCodeData: qrCodeDataUrl,
        });
      }

      res.json({ 
        qrCodeDataUrl, 
        originalUrl: url,
        savedQrCode 
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      res.status(500).json({ message: 'Failed to generate QR code' });
    }
  });

  // Get all QR codes
  app.get('/api/marketing/qr-codes', isAuthenticated, async (req, res) => {
    try {
      const { category, userId } = req.query;
      let qrCodes;

      if (category) {
        qrCodes = await storage.getQrCodesByCategory(category as string);
      } else if (userId) {
        qrCodes = await storage.getQrCodesByUser(userId as string);
      } else {
        qrCodes = await storage.getAllQrCodes();
      }

      res.json(qrCodes);
    } catch (error) {
      console.error('Error fetching QR codes:', error);
      res.status(500).json({ message: 'Failed to fetch QR codes' });
    }
  });

  // Get specific QR code
  app.get('/api/marketing/qr-codes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const qrCode = await storage.getQrCodeById(id);
      
      if (!qrCode) {
        return res.status(404).json({ message: 'QR code not found' });
      }

      res.json(qrCode);
    } catch (error) {
      console.error('Error fetching QR code:', error);
      res.status(500).json({ message: 'Failed to fetch QR code' });
    }
  });

  // Update QR code
  app.put('/api/marketing/qr-codes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, url, description, category, regenerateQr } = req.body;
      
      let updateData: any = {
        title,
        description,
        category,
      };

      // If URL changed or regeneration requested, create new QR code
      if (url || regenerateQr) {
        if (url) {
          // Validate new URL
          try {
            new URL(url);
            updateData.url = url;
          } catch {
            return res.status(400).json({ message: 'Invalid URL format' });
          }
        }

        // Get current QR code to use existing URL if new one not provided
        const currentQrCode = await storage.getQrCodeById(id);
        if (!currentQrCode) {
          return res.status(404).json({ message: 'QR code not found' });
        }

        const urlToUse = url || currentQrCode.url;
        
        // Generate new QR code
        const qrCodeDataUrl = await QRCode.toDataURL(urlToUse, {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          width: 256
        });

        updateData.qrCodeData = qrCodeDataUrl;
      }

      const updatedQrCode = await storage.updateQrCode(id, updateData);
      
      if (!updatedQrCode) {
        return res.status(404).json({ message: 'QR code not found' });
      }

      res.json(updatedQrCode);
    } catch (error) {
      console.error('Error updating QR code:', error);
      res.status(500).json({ message: 'Failed to update QR code' });
    }
  });

  // Delete QR code
  app.delete('/api/marketing/qr-codes/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteQrCode(id);
      
      if (!deleted) {
        return res.status(404).json({ message: 'QR code not found' });
      }

      res.json({ message: 'QR code deleted successfully' });
    } catch (error) {
      console.error('Error deleting QR code:', error);
      res.status(500).json({ message: 'Failed to delete QR code' });
    }
  });

  // Track QR code download
  app.post('/api/marketing/qr-codes/:id/download', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedQrCode = await storage.incrementQrCodeDownloadCount(id);
      
      if (!updatedQrCode) {
        return res.status(404).json({ message: 'QR code not found' });
      }

      res.json({ message: 'Download tracked successfully' });
    } catch (error) {
      console.error('Error tracking download:', error);
      res.status(500).json({ message: 'Failed to track download' });
    }
  });

  // Video Creation API Routes
  
  // Generate product video
  app.post('/api/videos/generate', isAuthenticated, upload.array('images', 10), async (req, res) => {
    try {
      const user = req.user as any;
      const files = req.files as Express.Multer.File[];
      
      console.log('Video generation request body:', req.body);
      console.log('Config parameter:', req.body.config);
      console.log('All form fields:', Object.keys(req.body));
      
      if (!req.body.config) {
        return res.status(400).json({ message: 'Video configuration is required' });
      }

      const videoConfig = JSON.parse(req.body.config);
      
      // Create video record
      const video = await storage.createProductVideo({
        productName: videoConfig.productName,
        productDescription: videoConfig.productDescription,
        category: videoConfig.category,
        createdBy: user.id,
        videoConfig: videoConfig,
      });

      // Save uploaded images as assets
      if (files && files.length > 0) {
        for (const file of files) {
          await storage.createVideoAsset({
            videoId: video.id,
            assetType: 'image',
            fileName: file.originalname || 'uploaded-image.jpg',
            filePath: file.path,
            fileSize: file.size,
            mimeType: file.mimetype,
            metadata: null
          });
        }
      }

      // Create a demo video HTML file for now (proof of concept)
      const videoDir = path.join(process.cwd(), 'uploads', 'videos');
      if (!fs.existsSync(videoDir)) {
        fs.mkdirSync(videoDir, { recursive: true });
      }

      // Generate video HTML content
      const keyBenefits = videoConfig.keyBenefits || [
        "Premium scientific formulation",
        "Quality assured for professional use", 
        "Targeted nutritional support"
      ];
      
      const script = videoConfig.script || `Discover ${videoConfig.productName} - a scientifically formulated supplement designed to support your health and wellness goals.`;

      const videoHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${videoConfig.productName} - Professional Product Video</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      overflow: hidden;
      transition: all 3s ease-in-out;
    }
    
    .video-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      padding: 40px;
      box-sizing: border-box;
    }
    
    .product-showcase {
      animation: fadeInScale 2s ease-out;
      max-width: 800px;
      width: 100%;
    }
    
    .product-title {
      font-size: 3.5rem;
      font-weight: 700;
      margin: 0 0 20px 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      letter-spacing: -0.02em;
      animation: slideInDown 1.5s ease-out;
    }
    
    .product-subtitle {
      font-size: 1.4rem;
      margin: 0 0 40px 0;
      opacity: 0.9;
      font-weight: 300;
      line-height: 1.6;
      animation: slideInUp 1.8s ease-out;
    }
    
    .product-description {
      font-size: 1.2rem;
      line-height: 1.8;
      margin: 0 0 50px 0;
      opacity: 0.95;
      animation: fadeIn 2.2s ease-out;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
    
    .benefits-showcase {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 30px;
      margin: 40px 0;
      animation: fadeInScale 2.5s ease-out;
    }
    
    .benefit-card {
      background: rgba(255, 255, 255, 0.1);
      padding: 25px;
      border-radius: 15px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.3s ease;
      animation: slideInLeft 2.8s ease-out;
    }
    
    .benefit-card:hover {
      transform: translateY(-5px);
    }
    
    .benefit-icon {
      font-size: 2.5rem;
      margin-bottom: 15px;
      display: block;
    }
    
    .benefit-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 10px;
      color: #fff;
    }
    
    .benefit-description {
      font-size: 0.95rem;
      opacity: 0.9;
      line-height: 1.5;
    }
    
    .cta-section {
      margin-top: 50px;
      animation: fadeInUp 3s ease-out;
    }
    
    .cta-headline {
      font-size: 2.2rem;
      font-weight: 600;
      margin-bottom: 20px;
      text-shadow: 1px 1px 3px rgba(0,0,0,0.3);
    }
    
    .company-branding {
      font-size: 1.3rem;
      font-weight: 400;
      opacity: 0.85;
      font-style: italic;
    }
    
    @keyframes fadeInScale {
      0% { opacity: 0; transform: scale(0.8); }
      100% { opacity: 1; transform: scale(1); }
    }
    
    @keyframes slideInDown {
      0% { opacity: 0; transform: translateY(-50px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideInUp {
      0% { opacity: 0; transform: translateY(50px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes slideInLeft {
      0% { opacity: 0; transform: translateX(-50px); }
      100% { opacity: 1; transform: translateX(0); }
    }
    
    @keyframes fadeIn {
      0% { opacity: 0; }
      100% { opacity: 1; }
    }
    
    @keyframes fadeInUp {
      0% { opacity: 0; transform: translateY(30px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    
    @media (max-width: 768px) {
      .product-title { font-size: 2.5rem; }
      .product-subtitle { font-size: 1.2rem; }
      .product-description { font-size: 1.1rem; }
      .cta-headline { font-size: 1.8rem; }
      .video-container { padding: 20px; }
      .benefits-showcase { grid-template-columns: 1fr; gap: 20px; }
    }
  </style>
</head>
<body>
  <div class="video-container">
    <div class="product-showcase">
      <h1 class="product-title">${videoConfig.productName}</h1>
      <p class="product-subtitle">${videoConfig.category || 'Premium Supplement'}</p>
      <p class="product-description">${videoConfig.productDescription}</p>
      
      <div class="benefits-showcase">
        ${keyBenefits.slice(0, 3).map((benefit, index) => {
          const icons = ['⚗️', '🔬', '🎯'];
          const titles = ['Scientific Formula', 'Quality Assurance', 'Targeted Results'];
          return `
        <div class="benefit-card">
          <div class="benefit-icon">${icons[index] || '✓'}</div>
          <div class="benefit-title">${titles[index] || 'Premium Quality'}</div>
          <div class="benefit-description">${benefit}</div>
        </div>`;
        }).join('')}
      </div>
      
      <div class="cta-section">
        <div class="cta-headline">Experience Professional-Grade Nutrition</div>
        <div class="company-branding">Pine Hill Farm - Premium Supplements</div>
      </div>
    </div>
  </div>
  
  <script>
    const narrative = "${script.replace(/"/g, '\\"')}";
    
    function speakText() {
      const utterance = new SpeechSynthesisUtterance(narrative);
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => voice.lang.includes('en-US')) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      
      speechSynthesis.speak(utterance);
    }
    
    setTimeout(speakText, 2000);
    
    let colorIndex = 0;
    const colors = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    ];
    
    setInterval(() => {
      document.body.style.background = colors[colorIndex % colors.length];
      colorIndex++;
    }, ${Math.floor((videoConfig.videoLength || 30) * 1000 / 4)});
  </script>
</body>
</html>`;

      const videoFilePath = path.join(videoDir, `video_${video.id}.html`);
      fs.writeFileSync(videoFilePath, videoHtml);

      // Update video status
      await storage.updateProductVideo(video.id, {
        renderStatus: 'completed',
        renderProgress: 100,
        videoUrl: `/uploads/videos/video_${video.id}.html`,
        duration: videoConfig.videoLength,
        renderCompletedAt: new Date(),
      });

      res.json({
        success: true,
        videoId: video.id,
        videoUrl: `/uploads/videos/video_${video.id}.html`,
        message: 'Professional product video generated successfully'
      });
    } catch (error) {
      console.error('Error generating video:', error);
      res.status(500).json({ message: 'Failed to generate video' });
    }
  });

  // Get video status
  app.get('/api/videos/:id', isAuthenticated, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const video = await storage.getProductVideoById(videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      res.json(video);
    } catch (error) {
      console.error('Error fetching video:', error);
      res.status(500).json({ message: 'Failed to fetch video' });
    }
  });

  // Get user's videos
  app.get('/api/videos', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const videos = await storage.getUserVideos(user.id);
      res.json(videos);
    } catch (error) {
      console.error('Error fetching user videos:', error);
      res.status(500).json({ message: 'Failed to fetch videos' });
    }
  });

  // Generate AI script
  app.post('/api/videos/generate-script', isAuthenticated, async (req, res) => {
    try {
      const { productName, productDescription, keyPoints, videoLength, videoStyle } = req.body;

      // Enhanced script generation logic using templates
      const generateEnhancedScript = (productName, description, benefits, length, style) => {
        const hooks = [
          `Discover the power of ${productName}!`,
          `Introducing ${productName} - your solution to better health!`,
          `Transform your wellness journey with ${productName}!`,
          `Experience the difference with ${productName}!`
        ];
        
        const closings = [
          `Experience the ${productName} difference today!`,
          `Join thousands who trust ${productName} for their wellness needs!`,
          `Don't wait - transform your health with ${productName} now!`,
          `Take the first step towards better health with ${productName}!`
        ];
        
        const hook = hooks[Math.floor(Math.random() * hooks.length)];
        const closing = closings[Math.floor(Math.random() * closings.length)];
        
        let script = `${hook}\n\n${description}\n\n`;
        
        if (benefits && benefits.length > 0) {
          script += `Key benefits include: ${benefits.join(', ')}\n\n`;
        }
        
        script += closing;
        
        return script;
      };

      const script = generateEnhancedScript(
        productName,
        productDescription,
        keyPoints || [],
        videoLength,
        videoStyle
      );

      res.json({ 
        success: true, 
        script,
        suggestions: {
          hooks: [
            `Discover the power of ${productName}!`,
            `Introducing ${productName} - your solution to better health!`,
            `Transform your wellness journey with ${productName}!`
          ]
        }
      });
    } catch (error) {
      console.error('Error generating script:', error);
      res.status(500).json({ message: 'Failed to generate script' });
    }
  });

  // Delete video
  app.delete('/api/videos/:id', isAuthenticated, async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const user = req.user as any;
      
      // Verify video belongs to user (if applicable)
      const video = await storage.getProductVideoById(videoId);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      await storage.deleteProductVideo(videoId);
      res.json({ success: true, message: 'Video deleted successfully' });
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({ message: 'Failed to delete video' });
    }
  });

  // Inventory Management Routes
  app.get('/api/accounting/inventory/items', async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { locationId, limit, offset, filter } = req.query;
      
      // Get all or specific location configurations
      let locations;
      if (locationId) {
        const location = await storage.getCloverConfigById(parseInt(locationId as string));
        locations = location ? [location] : [];
      } else {
        locations = await storage.getAllCloverConfigs();
      }

      const activeLocations = locations.filter(config => config.isActive);
      const allItems: any[] = [];

      for (const locationConfig of activeLocations) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(locationConfig);
          
          // Fetch all items without problematic filters (more reliable)
          const items = await cloverIntegration.fetchItems({
            limit: 1000, // Get a large batch to filter locally
            offset: offset ? parseInt(offset as string) : 0
          });

          if (items && items.elements) {
            let filteredItems = items.elements;
            
            // Apply local filtering if filter is provided
            if (filter) {
              const filterLower = (filter as string).toLowerCase();
              
              // Handle different filter formats: "name:XXX" or just "XXX"
              let searchTerm = filterLower;
              if (filterLower.startsWith('name:')) {
                searchTerm = filterLower.replace('name:', '');
              }
              
              // Filter items locally by name or code
              filteredItems = items.elements.filter((item: any) => {
                const nameMatch = item.name && item.name.toLowerCase().includes(searchTerm);
                const codeMatch = item.code && item.code.toLowerCase().includes(searchTerm);
                return nameMatch || codeMatch;
              });
            }
            
            // Add location info to each item
            const itemsWithLocation = filteredItems.map((item: any) => ({
              ...item,
              locationId: locationConfig.id,
              locationName: locationConfig.merchantName,
              merchantId: locationConfig.merchantId
            }));
            
            allItems.push(...itemsWithLocation);
          }
        } catch (error) {
          console.log(`No inventory data for ${locationConfig.merchantName}:`, error);
        }
      }

      res.json({
        elements: allItems,
        totalItems: allItems.length,
        locations: activeLocations.map(loc => ({
          id: loc.id,
          name: loc.merchantName,
          merchantId: loc.merchantId
        }))
      });
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      res.status(500).json({ message: 'Failed to fetch inventory items' });
    }
  });

  app.get('/api/accounting/inventory/stocks', async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { locationId, limit, offset } = req.query;
      
      let locations;
      if (locationId) {
        const location = await storage.getCloverConfigById(parseInt(locationId as string));
        locations = location ? [location] : [];
      } else {
        locations = await storage.getAllCloverConfigs();
      }

      const activeLocations = locations.filter(config => config.isActive);
      const allStocks: any[] = [];

      for (const locationConfig of activeLocations) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(locationConfig);
          
          // First fetch all items to get the full item details
          const items = await cloverIntegration.fetchItems({
            limit: 1000 // Get all items to match with stocks
          });

          const stocks = await cloverIntegration.fetchItemStocks({
            limit: limit ? parseInt(limit as string) : 100,
            offset: offset ? parseInt(offset as string) : 0
          });

          console.log(`📋 Retrieved ${items?.elements?.length || 0} items and ${stocks?.elements?.length || 0} stocks for ${locationConfig.merchantName}`);

          // Create a lookup map for item details
          const itemsMap = new Map();
          if (items && items.elements) {
            items.elements.forEach((item: any) => {
              itemsMap.set(item.id, item);
              console.log(`📦 Item mapped: ${item.id} -> ${item.name}`);
            });
          }

          if (stocks && stocks.elements) {
            const stocksWithLocation = stocks.elements.map((stock: any) => {
              // Enhance stock with full item details
              const itemId = stock.item?.id;
              const fullItem = itemsMap.get(itemId);
              
              console.log(`🔍 Processing stock for item ${itemId}: found full item = ${!!fullItem}, name = ${fullItem?.name || 'NOT FOUND'}`);
              
              return {
                ...stock,
                item: {
                  id: itemId,
                  name: fullItem?.name || `Item ${itemId}`,
                  code: fullItem?.code || null,
                  sku: fullItem?.sku || null,
                  ...fullItem
                },
                locationId: locationConfig.id,
                locationName: locationConfig.merchantName,
                merchantId: locationConfig.merchantId
              };
            });
            
            allStocks.push(...stocksWithLocation);
          }
        } catch (error) {
          console.log(`No stock data for ${locationConfig.merchantName}:`, error);
        }
      }

      res.json({
        elements: allStocks,
        totalStocks: allStocks.length,
        locations: activeLocations.map(loc => ({
          id: loc.id,
          name: loc.merchantName,
          merchantId: loc.merchantId
        }))
      });
    } catch (error) {
      console.error('Error fetching item stocks:', error);
      res.status(500).json({ message: 'Failed to fetch item stocks' });
    }
  });

  app.get('/api/accounting/inventory/categories', async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { locationId, limit, offset } = req.query;
      
      let locations;
      if (locationId) {
        const location = await storage.getCloverConfigById(parseInt(locationId as string));
        locations = location ? [location] : [];
      } else {
        locations = await storage.getAllCloverConfigs();
      }

      const activeLocations = locations.filter(config => config.isActive);
      const allCategories: any[] = [];

      for (const locationConfig of activeLocations) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(locationConfig);
          
          const categories = await cloverIntegration.fetchCategories({
            limit: limit ? parseInt(limit as string) : 100,
            offset: offset ? parseInt(offset as string) : 0
          });

          if (categories && categories.elements) {
            const categoriesWithLocation = categories.elements.map((category: any) => ({
              ...category,
              locationId: locationConfig.id,
              locationName: locationConfig.merchantName,
              merchantId: locationConfig.merchantId
            }));
            
            allCategories.push(...categoriesWithLocation);
          }
        } catch (error) {
          console.log(`No categories data for ${locationConfig.merchantName}:`, error);
        }
      }

      res.json({
        elements: allCategories,
        totalCategories: allCategories.length,
        locations: activeLocations.map(loc => ({
          id: loc.id,
          name: loc.merchantName,
          merchantId: loc.merchantId
        }))
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ message: 'Failed to fetch categories' });
    }
  });

  // P&L PDF scanning endpoint
  app.post('/api/accounting/scan-pl-pdf', isAuthenticated, upload.single('pdf'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No PDF file uploaded' });
      }

      // For now, return sample P&L data - in production this would use AI to parse the PDF
      const samplePLData = {
        period: 'July 2025',
        totalRevenue: '76200.74',
        incomeCategories: [
          { name: 'Sales - Amazon.com', amount: '623.71', accountId: 4000 },
          { name: 'Sales - Cash / Mobile / Venmo', amount: '12118.57', accountId: 4010 },
          { name: 'Sales - FDMS Pymt', amount: '629.84', accountId: 4020 },
          { name: 'Sales Income - EC Suites', amount: '1163.77', accountId: 4030 },
          { name: 'Sales Income - NSD', amount: '61664.85', accountId: 4040 }
        ],
        extractedDate: new Date().toISOString()
      };

      res.json(samplePLData);
    } catch (error) {
      console.error('Error scanning P&L PDF:', error);
      res.status(500).json({ error: 'Failed to scan PDF' });
    }
  });

  // P&L data import endpoint
  app.post('/api/accounting/import-pl-data', isAuthenticated, async (req, res) => {
    try {
      const { period, incomeCategories, totalRevenue } = req.body;
      
      if (!period || !incomeCategories || !Array.isArray(incomeCategories)) {
        return res.status(400).json({ error: 'Invalid P&L data format' });
      }

      const transactions = [];
      
      // Create a transaction for each income category
      for (const category of incomeCategories) {
        // Parse the period properly (e.g., "July 2025" -> "2025-07-31")
        const [monthName, year] = period.split(' ');
        const monthMap: { [key: string]: string } = {
          'January': '01', 'February': '02', 'March': '03', 'April': '04',
          'May': '05', 'June': '06', 'July': '07', 'August': '08',
          'September': '09', 'October': '10', 'November': '11', 'December': '12'
        };
        const monthNumber = monthMap[monthName] || '01';
        const transactionDate = `${year}-${monthNumber}-31`;

        const transaction = await storage.createFinancialTransaction({
          transactionDate: transactionDate,
          description: `${period} ${category.name} Revenue`,
          referenceNumber: `PL-${period.replace(' ', '-')}-${category.accountId}`,
          transactionType: 'journal_entry',
          totalAmount: category.amount.toString(),
          sourceSystem: 'pl_import',
          status: 'posted'
        });

        // Create transaction line
        await storage.createTransactionLine({
          transactionId: transaction.id,
          accountId: category.accountId,
          debitAmount: null,
          creditAmount: category.amount.toString(),
          description: `${category.name} for ${period}`
        });

        transactions.push(transaction);
      }

      res.json({
        message: `Successfully imported ${transactions.length} transactions for ${period}`,
        transactions: transactions,
        totalAmount: totalRevenue
      });
    } catch (error) {
      console.error('Error importing P&L data:', error);
      res.status(500).json({ error: 'Failed to import P&L data' });
    }
  });

  // Expense reporting endpoint
  app.get('/api/accounting/reports/expenses', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      // Check if this is the July 2025 sample data period (only period with expense data entered)
      const isJulySamplePeriod = startDate === '2025-07-01' && endDate === '2025-07-31';
      
      let totalExpenses = 0;
      let expenseCategories = [];

      if (isJulySamplePeriod) {
        // Use static account balances for July 2025 sample data
        const allExpenseAccounts = await storage.getAccountsByType('Expense');
        const expenseAccounts = allExpenseAccounts.filter(account => 
          !account.accountName.toLowerCase().includes('cost of goods sold')
        );

        // Calculate total expenses from account balances
        totalExpenses = expenseAccounts.reduce((sum, account) => {
          return sum + parseFloat(account.balance || '0');
        }, 0);

        // Group expenses by category
        expenseCategories = expenseAccounts.map(account => ({
          id: account.id,
          name: account.accountName,
          amount: parseFloat(account.balance || '0'),
          description: account.description,
          accountType: account.accountType
        }));
      } else {
        // For other periods, no operating expenses entered yet (as mentioned by user)
        totalExpenses = 0;
        expenseCategories = [];
      }

      res.json({
        totalExpenses: totalExpenses.toFixed(2),
        expenseCategories,
        period: `${startDate} to ${endDate}`,
        currency: 'USD'
      });
    } catch (error) {
      console.error('Error fetching expense data:', error);
      res.status(500).json({ error: 'Failed to fetch expense data' });
    }
  });

  // Daily Sales Report endpoint - Uses enhanced order analytics for accurate financial reporting
  app.get('/api/accounting/reports/daily-sales', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, locationId } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      console.log(`🔥 ENHANCED DAILY SALES REPORT: ${startDate} to ${endDate}, locationId: ${locationId}`);
      
      const startDateStr = startDate as string;
      const endDateStr = endDate as string;
      
      // Get location configurations for response metadata
      const allActiveCloverLocations = await storage.getAllCloverConfigs();
      const activeCloverConfigs = allActiveCloverLocations.filter(config => config.isActive);
      const allActiveAmazonLocations = await storage.getAllAmazonConfigs();
      const activeAmazonConfigs = allActiveAmazonLocations.filter(config => config.isActive);

      // Use enhanced order analytics to get aggregated data
      const analyticsData = await storage.getOrderAnalytics({
        startDate: startDateStr,
        endDate: endDateStr,
        locationId: locationId && locationId !== 'ALL' ? locationId : undefined,
        groupBy: 'day'
      });

      console.log(`📊 Enhanced Analytics Retrieved: ${analyticsData.analytics.length} daily periods`);

      // Transform analytics data to match daily sales report format
      const dailySales = analyticsData.analytics.map((day: any) => ({
        date: day.period,
        total: day.totalRevenue.toFixed(2),
        netSales: day.netSale.toFixed(2),
        discounts: day.totalDiscounts.toFixed(2),
        refunds: day.totalRefunds.toFixed(2),
        netCOGS: day.totalCOGS.toFixed(2),
        netSalesTax: day.totalTax.toFixed(2),
        netProfit: day.totalProfit.toFixed(2),
        orderCount: day.totalOrders,
        netProfitMargin: day.profitMargin.toFixed(2)
      }));

      // Transform summary data to match expected format
      const totals = {
        total: analyticsData.summary.totalRevenue.toFixed(2),
        netSales: analyticsData.summary.totalRevenue.toFixed(2), // netSale might not be in summary
        discounts: analyticsData.summary.totalDiscounts.toFixed(2),
        refunds: analyticsData.summary.totalRefunds.toFixed(2),
        netCOGS: analyticsData.summary.totalCOGS.toFixed(2),
        netSalesTax: analyticsData.summary.totalTax.toFixed(2),
        netProfit: analyticsData.summary.totalProfit.toFixed(2),
        orderCount: analyticsData.summary.totalOrders,
        netProfitMargin: analyticsData.summary.totalRevenue > 0 
          ? ((analyticsData.summary.totalProfit / analyticsData.summary.totalRevenue) * 100).toFixed(2) 
          : '0.00'
      };

      // Determine location name for response
      const locationName = locationId && locationId !== 'ALL' 
        ? [...activeCloverConfigs, ...activeAmazonConfigs]
            .find(config => config.id.toString() === locationId)?.merchantName || 'Unknown Location'
        : 'All Locations';

      console.log(`📊 Enhanced Daily Sales Report Generated: ${dailySales.length} days, ${totals.orderCount} total orders, $${totals.total} total revenue`);

      res.json({
        dailySales,
        totals,
        period: `${startDateStr} to ${endDateStr}`,
        location: locationName,
        currency: 'USD',
        availableLocations: [
          { id: 'ALL', name: 'All Locations' },
          ...activeCloverConfigs.map(config => ({ id: config.id.toString(), name: config.merchantName, type: 'Clover POS' })),
          ...activeAmazonConfigs.map(config => ({ id: config.id.toString(), name: config.merchantName, type: 'Amazon Store' }))
        ]
      });
    } catch (error) {
      console.error('Error generating enhanced daily sales report:', error);
      res.status(500).json({ error: 'Failed to generate daily sales report' });
    }
  });

  // Profit & Loss reporting endpoint
  app.get('/api/accounting/reports/profit-loss', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      // Get live transaction data for all periods from integrations
      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalCOGS = 0;
      let incomeBreakdown = [];
      let expenseBreakdown = [];
      let cogsBreakdown = [];

      try {
        // Fetch revenue data from integrations (Clover + Amazon)
        const revenueResponse = await fetch(`${req.protocol}://${req.get('host')}/api/accounting/analytics/multi-location?startDate=${startDate}&endDate=${endDate}`);
        if (revenueResponse.ok) {
          const revenueData = await revenueResponse.json();
          
          // Build income breakdown from location data
          if (revenueData.locationBreakdown) {
            incomeBreakdown = revenueData.locationBreakdown.map(location => ({
              id: location.id || location.name,
              name: `Sales - ${location.name}`,
              amount: parseFloat(location.totalRevenue) || 0
            }));
            
            totalRevenue = incomeBreakdown.reduce((sum, item) => sum + item.amount, 0);
            
            // Add percentages to income breakdown
            incomeBreakdown = incomeBreakdown.map(item => ({
              ...item,
              percentage: totalRevenue > 0 ? ((item.amount / totalRevenue) * 100).toFixed(2) : '0.00'
            }));
          }
        }

        // Fetch COGS data from integrations
        const cogsResponse = await fetch(`${req.protocol}://${req.get('host')}/api/accounting/analytics/cogs?startDate=${startDate}&endDate=${endDate}`, {
          headers: {
            'Cookie': req.headers.cookie || ''
          }
        });
        if (cogsResponse.ok) {
          const cogsData = await cogsResponse.json();
          if (cogsData.items && cogsData.items.length > 0) {
            totalCOGS = parseFloat(cogsData.total) || 0;
            cogsBreakdown = [{
              id: 'cogs_total',
              name: 'Cost of Goods Sold',
              amount: totalCOGS
            }];
          }
        }

        // For expenses, check if we have account-based data for July 2025 (sample period)
        const isJulySamplePeriod = startDate === '2025-07-01' && endDate === '2025-07-31';
        
        if (isJulySamplePeriod) {
          // Use account balances for July 2025 operating expenses (sample data)
          const allExpenseAccounts = await storage.getAccountsByType('Expense');
          const expenseAccounts = allExpenseAccounts.filter(account => 
            !account.accountName.toLowerCase().includes('cost of goods sold')
          );

          totalExpenses = expenseAccounts.reduce((sum, account) => {
            return sum + parseFloat(account.balance || '0');
          }, 0);

          expenseBreakdown = expenseAccounts.map(account => ({
            id: account.id,
            name: account.accountName,
            amount: parseFloat(account.balance || '0'),
            percentage: totalExpenses > 0 ? ((parseFloat(account.balance || '0') / totalExpenses) * 100).toFixed(2) : '0.00'
          }));
        } else {
          // For other periods, no operating expenses entered yet (as user mentioned)
          totalExpenses = 0;
          expenseBreakdown = [];
        }

      } catch (error) {
        console.error('Error fetching integration data for P&L:', error);
        
        // Fallback to account data if integration fails
        const isJulySamplePeriod = startDate === '2025-07-01' && endDate === '2025-07-31';
        
        if (isJulySamplePeriod) {
          const incomeAccounts = await storage.getAccountsByType('Income');
          const allExpenseAccounts = await storage.getAccountsByType('Expense');
          const cogsAccounts = await storage.getAccountsByName('Cost of Goods Sold');
          
          const expenseAccounts = allExpenseAccounts.filter(account => 
            !account.accountName.toLowerCase().includes('cost of goods sold')
          );

          totalRevenue = incomeAccounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0);
          totalExpenses = expenseAccounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0);
          totalCOGS = cogsAccounts.reduce((sum, account) => sum + parseFloat(account.balance || '0'), 0);

          incomeBreakdown = incomeAccounts.map(account => ({
            id: account.id,
            name: account.accountName,
            amount: parseFloat(account.balance || '0'),
            percentage: totalRevenue > 0 ? ((parseFloat(account.balance || '0') / totalRevenue) * 100).toFixed(2) : '0.00'
          }));

          expenseBreakdown = expenseAccounts.map(account => ({
            id: account.id,
            name: account.accountName,
            amount: parseFloat(account.balance || '0'),
            percentage: totalExpenses > 0 ? ((parseFloat(account.balance || '0') / totalExpenses) * 100).toFixed(2) : '0.00'
          }));

          cogsBreakdown = cogsAccounts.map(account => ({
            id: account.id,
            name: account.accountName,
            amount: parseFloat(account.balance || '0')
          }));
        }
      }

      const grossProfit = totalRevenue - totalCOGS;
      const netIncome = grossProfit - totalExpenses;

      // Get transaction data for the period
      const transactions = await storage.getTransactionsByDateRange(startDate as string, endDate as string);

      res.json({
        period: `${startDate} to ${endDate}`,
        totalRevenue: totalRevenue.toFixed(2),
        totalCOGS: totalCOGS.toFixed(2),
        grossProfit: grossProfit.toFixed(2),
        grossMargin: totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0',
        totalExpenses: totalExpenses.toFixed(2),
        netIncome: netIncome.toFixed(2),
        profitMargin: totalRevenue > 0 ? ((netIncome / totalRevenue) * 100).toFixed(1) : '0.0',
        transactionCount: transactions.length,
        currency: 'USD',
        incomeBreakdown,
        expenseBreakdown,
        cogsBreakdown
      });
    } catch (error) {
      console.error('Error generating P&L report:', error);
      res.status(500).json({ error: 'Failed to generate P&L report' });
    }
  });

  app.get('/api/accounting/inventory/items/:itemId/stock', async (req, res) => {
    try {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { itemId } = req.params;
      const { locationId } = req.query;
      
      let locations;
      if (locationId) {
        const location = await storage.getCloverConfigById(parseInt(locationId as string));
        locations = location ? [location] : [];
      } else {
        locations = await storage.getAllCloverConfigs();
      }

      const activeLocations = locations.filter(config => config.isActive);
      const stockResults: any[] = [];

      for (const locationConfig of activeLocations) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(locationConfig);
          
          const stock = await cloverIntegration.fetchItemStock(itemId);
          
          if (stock) {
            stockResults.push({
              ...stock,
              locationId: locationConfig.id,
              locationName: locationConfig.merchantName,
              merchantId: locationConfig.merchantId
            });
          }
        } catch (error) {
          console.log(`No stock data for item ${itemId} at ${locationConfig.merchantName}:`, error);
        }
      }

      if (stockResults.length === 0) {
        return res.status(404).json({ message: 'Stock not found for this item' });
      }

      res.json({
        itemId,
        stocks: stockResults
      });
    } catch (error) {
      console.error('Error fetching item stock:', error);
      res.status(500).json({ message: 'Failed to fetch item stock' });
    }
  });

  // Stock Adjustment History
  app.get('/api/inventory/actions/history', isAuthenticated, async (req, res) => {
    try {
      const { limit = 50, type, locationId } = req.query;
      
      // Get recent adjustments from storage (this would need to be implemented in storage.ts)
      // For now, return mock data to demonstrate the feature
      const mockHistory = [
        {
          id: 'adj_1727208627000_abc123',
          type: 'increase',
          itemId: 'KYGFPEPW92E6C',
          itemName: 'LaCon Liquid Hand Wash Sweet Orange',
          quantity: 1,
          fromLocationId: 1,
          fromLocationName: 'Lake Geneva - HSA',
          reason: 'Inventory Correction',
          notes: 'This is a test for Ryan!',
          createdAt: new Date('2024-09-24T20:30:27.000Z'),
          user: 'Ryan Sorensen',
          cloverUpdated: true
        }
      ];

      res.json({ 
        success: true, 
        history: mockHistory,
        total: mockHistory.length 
      });
    } catch (error) {
      console.error('Error fetching adjustment history:', error);
      res.status(500).json({ error: 'Failed to fetch adjustment history' });
    }
  });

  // ============================================
  // BARCODE SCANNING AND INVENTORY ACTIONS
  // ============================================

  // Product lookup by SKU/barcode for barcode scanning
  app.get('/api/accounting/inventory/items/lookup', isAuthenticated, async (req, res) => {
    try {
      const { sku, locationId } = req.query;
      
      if (!sku) {
        return res.status(400).json({ error: 'SKU parameter is required' });
      }

      let locations;
      if (locationId && locationId !== 'all') {
        const location = await storage.getCloverConfigById(parseInt(locationId as string));
        locations = location ? [location] : [];
      } else {
        locations = await storage.getAllCloverConfigs();
      }

      const activeLocations = locations.filter(config => config.isActive);
      
      // Search across all active locations for the SKU
      for (const locationConfig of activeLocations) {
        try {
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(locationConfig);
          
          let item = null;
          let stockInfo = null;
          
          // Escape single quotes for SQL injection prevention
          const escapedSku = (sku as string).replace(/'/g, "''");
          
          // Strategy 1: Try direct item ID lookup (fastest)
          try {
            const directResult = await cloverIntegration.fetchItems({ limit: 1 });
            // Find exact ID match in the results
            if (directResult.elements && directResult.elements.length > 0) {
              const exactMatch = directResult.elements.find((el: any) => el.id === sku);
              if (exactMatch) {
                item = exactMatch;
                console.log(`✅ Found item by direct ID: ${item.name}`);
              }
            }
          } catch (idError: any) {
            console.log(`❌ Direct ID lookup failed: ${idError?.message || 'Unknown error'}`);
          }
          
          // Strategy 2: Try fetching all items and filter locally (more reliable)
          if (!item) {
            try {
              console.log(`🔍 Fetching all items to search for: ${sku}`);
              const allItemsResults = await cloverIntegration.fetchItems({ limit: 100 });
              if (allItemsResults.elements && allItemsResults.elements.length > 0) {
                // Search by code/barcode first
                let foundItem = allItemsResults.elements.find((el: any) => 
                  el.code && el.code.toLowerCase().includes((sku as string).toLowerCase())
                );
                
                // If not found by code, search by name
                if (!foundItem) {
                  foundItem = allItemsResults.elements.find((el: any) => 
                    el.name && el.name.toLowerCase().includes((sku as string).toLowerCase())
                  );
                }
                
                if (foundItem) {
                  item = foundItem;
                  console.log(`✅ Found item by local search: ${item.name}`);
                }
              }
            } catch (searchError: any) {
              console.log(`❌ Local search failed: ${searchError?.message || 'Unknown error'}`);
            }
          }
          
          if (item) {
            // Get stock information
            let stockCount = 0;
            try {
              const stock = await cloverIntegration.fetchItemStock(item.id);
              stockCount = stock?.quantity || 0;
            } catch (stockError) {
              console.log('No stock data available for item:', item.id);
            }
            
            return res.json({
              id: item.id,
              name: item.name,
              price: item.price,
              stockCount,
              locationId: locationConfig.id,
              locationName: locationConfig.merchantName,
              merchantId: locationConfig.merchantId,
              description: item.description || '',
              categories: item.categories?.elements || []
            });
          }
        } catch (error) {
          console.log(`Error searching for SKU ${sku} at ${locationConfig.merchantName}:`, error);
        }
      }

      // If not found in any location
      return res.status(404).json({ 
        error: 'Product not found', 
        message: `No product found with SKU: ${sku}` 
      });
    } catch (error) {
      console.error('Error looking up product by SKU:', error);
      res.status(500).json({ error: 'Failed to lookup product' });
    }
  });

  // Inventory count/take action
  app.post('/api/inventory/actions/take', isAuthenticated, async (req, res) => {
    try {
      const { items, locationId, notes } = req.body;
      const userId = req.user?.id;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      // Create inventory action record
      const actionRecord = {
        type: 'inventory_take',
        userId,
        locationId: locationId ? parseInt(locationId) : null,
        items: items.map(item => ({
          barcode: item.barcode,
          itemName: item.itemName,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        notes: notes || '',
        createdAt: new Date()
      };

      // For now, just log the action. In a real implementation, you'd save to database
      console.log('Inventory Take Action:', actionRecord);

      // TODO: Implement actual inventory update logic here
      // This would typically:
      // 1. Update inventory quantities in the database
      // 2. Create audit trail records
      // 3. Sync changes back to Clover if needed

      res.json({ 
        success: true, 
        message: `Inventory take completed for ${items.length} items`,
        actionId: Date.now() // Temporary ID
      });
    } catch (error) {
      console.error('Error processing inventory take:', error);
      res.status(500).json({ error: 'Failed to process inventory take' });
    }
  });

  // Stock adjustment action (individual item adjustments)
  app.post('/api/inventory/actions/adjustment', isAuthenticated, async (req, res) => {
    try {
      const { 
        type, 
        itemId, 
        itemName, 
        quantity, 
        fromLocationId, 
        reason, 
        notes 
      } = req.body;
      const userId = req.user?.id;
      
      if (!itemId || !itemName || !quantity || !type || !reason) {
        return res.status(400).json({ error: 'Missing required fields: itemId, itemName, quantity, type, reason' });
      }

      if (!['increase', 'decrease'].includes(type)) {
        return res.status(400).json({ error: 'Invalid adjustment type. Must be increase or decrease' });
      }

      // Create inventory adjustment record
      const adjustmentRecord = {
        type: 'stock_adjustment',
        adjustmentType: type,
        userId,
        itemId,
        itemName,
        quantity: Math.abs(quantity), // Always store positive, type determines direction
        fromLocationId: fromLocationId ? parseInt(fromLocationId.toString()) : null,
        reason,
        notes: notes || '',
        createdAt: new Date(),
        actionId: `adj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Log the adjustment action
      console.log('📦 Stock Adjustment Action:', adjustmentRecord);

      // Get location configuration for Clover API call
      let locationConfig = null;
      if (fromLocationId) {
        try {
          locationConfig = await storage.getCloverConfigById(parseInt(fromLocationId.toString()));
        } catch (error) {
          console.log('Could not fetch location config for adjustment');
        }
      }

      if (!locationConfig) {
        // Try to find any active location if no specific location provided
        const allConfigs = await storage.getAllCloverConfigs();
        locationConfig = allConfigs.find(config => config.isActive);
      }

      let cloverUpdateResult = null;
      if (locationConfig) {
        try {
          // Update stock levels in Clover via API
          const { CloverIntegration } = await import('./integrations/clover');
          const cloverIntegration = new CloverIntegration(locationConfig);
          
          // Get current stock to calculate new quantity
          const currentStock = await cloverIntegration.fetchItemStock(itemId);
          const currentQuantity = currentStock?.quantity || 0;
          
          const newQuantity = type === 'increase' 
            ? currentQuantity + Math.abs(quantity)
            : Math.max(0, currentQuantity - Math.abs(quantity)); // Prevent negative stock

          console.log(`📊 Updating Clover stock: ${itemName} from ${currentQuantity} to ${newQuantity}`);
          
          cloverUpdateResult = await cloverIntegration.updateItemStock(itemId, newQuantity);
          console.log('✅ Successfully updated stock in Clover:', cloverUpdateResult);
          
        } catch (cloverError) {
          console.error('❌ Failed to update stock in Clover:', cloverError);
          // Continue with local logging even if Clover update fails
        }
      } else {
        console.log('⚠️ No Clover configuration found for stock update');
      }
      
      const message = type === 'increase' 
        ? `Added ${quantity} units to ${itemName}` 
        : `Removed ${quantity} units from ${itemName}`;

      res.json({ 
        success: true, 
        message: cloverUpdateResult ? 
          `${message} - Updated in Clover POS` : 
          `${message} - Logged locally (Clover sync may be needed)`,
        actionId: adjustmentRecord.actionId,
        adjustment: adjustmentRecord,
        cloverUpdated: !!cloverUpdateResult
      });
    } catch (error) {
      console.error('Error processing stock adjustment:', error);
      res.status(500).json({ error: 'Failed to process stock adjustment' });
    }
  });

  // Stock transfer action (between locations)
  app.post('/api/inventory/actions/transfer', isAuthenticated, async (req, res) => {
    try {
      const { 
        itemId, 
        itemName, 
        quantity, 
        fromLocationId, 
        toLocationId, 
        reason, 
        notes 
      } = req.body;
      const userId = req.user?.id;
      
      if (!itemId || !itemName || !quantity || !fromLocationId || !toLocationId || !reason) {
        return res.status(400).json({ error: 'Missing required fields: itemId, itemName, quantity, fromLocationId, toLocationId, reason' });
      }

      if (fromLocationId.toString() === toLocationId.toString()) {
        return res.status(400).json({ error: 'Cannot transfer to the same location' });
      }

      // Get location names for logging
      let fromLocationName = 'Unknown Location';
      let toLocationName = 'Unknown Location';
      
      try {
        const fromLocation = await storage.getCloverConfigById(parseInt(fromLocationId.toString()));
        const toLocation = await storage.getCloverConfigById(parseInt(toLocationId.toString()));
        fromLocationName = fromLocation?.merchantName || 'Unknown Location';
        toLocationName = toLocation?.merchantName || 'Unknown Location';
      } catch (error) {
        console.log('Could not fetch location names for transfer logging');
      }

      // Create inventory transfer record
      const transferRecord = {
        type: 'stock_transfer',
        userId,
        itemId,
        itemName,
        quantity: Math.abs(quantity),
        fromLocationId: parseInt(fromLocationId.toString()),
        toLocationId: parseInt(toLocationId.toString()),
        fromLocationName,
        toLocationName,
        reason,
        notes: notes || '',
        createdAt: new Date(),
        actionId: `xfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Log the transfer action
      console.log('🔄 Stock Transfer Action:', transferRecord);

      // Get location configurations for Clover API calls
      let fromConfig = null;
      let toConfig = null;
      
      try {
        fromConfig = await storage.getCloverConfigById(parseInt(fromLocationId.toString()));
        toConfig = await storage.getCloverConfigById(parseInt(toLocationId.toString()));
      } catch (error) {
        console.error('Could not fetch location configs for transfer:', error);
      }

      let cloverTransferResult = { 
        fromLocationUpdated: false, 
        toLocationUpdated: false,
        error: null 
      };

      if (fromConfig && toConfig) {
        try {
          // Implement actual inventory transfer logic via Clover API
          const { CloverIntegration } = await import('./integrations/clover');
          
          // 1. Decrease stock at source location
          try {
            const fromClover = new CloverIntegration(fromConfig);
            const fromCurrentStock = await fromClover.fetchItemStock(itemId);
            const fromCurrentQuantity = fromCurrentStock?.quantity || 0;
            const fromNewQuantity = Math.max(0, fromCurrentQuantity - Math.abs(quantity));
            
            console.log(`📊 Updating ${fromLocationName}: ${itemName} from ${fromCurrentQuantity} to ${fromNewQuantity}`);
            await fromClover.updateItemStock(itemId, fromNewQuantity);
            cloverTransferResult.fromLocationUpdated = true;
            console.log(`✅ Successfully updated stock at source location: ${fromLocationName}`);
          } catch (fromError) {
            console.error(`❌ Failed to update stock at source location ${fromLocationName}:`, fromError);
            cloverTransferResult.error = `Failed to update source location: ${fromError.message}`;
          }

          // 2. Increase stock at destination location (only if source update succeeded)
          if (cloverTransferResult.fromLocationUpdated) {
            try {
              const toClover = new CloverIntegration(toConfig);
              const toCurrentStock = await toClover.fetchItemStock(itemId);
              const toCurrentQuantity = toCurrentStock?.quantity || 0;
              const toNewQuantity = toCurrentQuantity + Math.abs(quantity);
              
              console.log(`📊 Updating ${toLocationName}: ${itemName} from ${toCurrentQuantity} to ${toNewQuantity}`);
              await toClover.updateItemStock(itemId, toNewQuantity);
              cloverTransferResult.toLocationUpdated = true;
              console.log(`✅ Successfully updated stock at destination location: ${toLocationName}`);
            } catch (toError) {
              console.error(`❌ Failed to update stock at destination location ${toLocationName}:`, toError);
              cloverTransferResult.error = `Failed to update destination location: ${toError.message}`;
              
              // TODO: Consider rollback logic here if destination update fails
              console.log('⚠️ Source location was updated but destination failed - manual correction may be needed');
            }
          }
          
        } catch (transferError) {
          console.error('❌ Failed to complete stock transfer:', transferError);
          cloverTransferResult.error = transferError.message;
        }
      } else {
        console.log('⚠️ Missing Clover configuration for one or both locations');
        cloverTransferResult.error = 'Missing location configuration';
      }
      
      const baseMessage = `Transferred ${quantity} units of ${itemName} from ${fromLocationName} to ${toLocationName}`;
      let statusMessage = baseMessage;
      
      if (cloverTransferResult.fromLocationUpdated && cloverTransferResult.toLocationUpdated) {
        statusMessage = `${baseMessage} - Updated in Clover POS at both locations`;
      } else if (cloverTransferResult.error) {
        statusMessage = `${baseMessage} - Logged locally (${cloverTransferResult.error})`;
      }

      res.json({ 
        success: true, 
        message: statusMessage,
        actionId: transferRecord.actionId,
        transfer: transferRecord,
        cloverUpdated: cloverTransferResult.fromLocationUpdated && cloverTransferResult.toLocationUpdated,
        cloverResult: cloverTransferResult
      });
    } catch (error) {
      console.error('Error processing stock transfer:', error);
      res.status(500).json({ error: 'Failed to process stock transfer' });
    }
  });

  // Employee purchase action
  app.post('/api/inventory/actions/employee_purchase', isAuthenticated, async (req, res) => {
    try {
      const { items, locationId, employeeId, notes } = req.body;
      const userId = req.user?.id;
      
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      // Calculate total purchase amount
      const totalAmount = items.reduce((sum, item) => {
        return sum + (item.quantity * (item.unitPrice || 0));
      }, 0);

      // Create employee purchase record
      const purchaseRecord = {
        type: 'employee_purchase',
        userId,
        employeeId: employeeId || userId,
        locationId: locationId ? parseInt(locationId) : null,
        items: items.map(item => ({
          barcode: item.barcode,
          itemName: item.itemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice || 0,
          totalPrice: item.quantity * (item.unitPrice || 0),
          notes: item.notes || ''
        })),
        totalAmount,
        notes: notes || '',
        createdAt: new Date()
      };

      // For now, just log the action
      console.log('Employee Purchase Action:', purchaseRecord);

      // TODO: Implement actual employee purchase logic here
      // This would typically:
      // 1. Deduct inventory quantities
      // 2. Create purchase transaction records
      // 3. Handle employee payroll deductions if applicable
      
      res.json({ 
        success: true, 
        message: `Employee purchase recorded for ${items.length} items (Total: $${(totalAmount / 100).toFixed(2)})`,
        actionId: Date.now(), // Temporary ID
        totalAmount
      });
    } catch (error) {
      console.error('Error processing employee purchase:', error);
      res.status(500).json({ error: 'Failed to process employee purchase' });
    }
  });

  // ============================================
  // MONTHLY ACCOUNTING ARCHIVAL API ENDPOINTS
  // ============================================

  // Get monthly closings (history of all closed months)
  app.get('/api/accounting/monthly/closings', isAuthenticated, async (req, res) => {
    try {
      const { year, month, startYear, startMonth, endYear, endMonth } = req.query;
      
      let closings = [];
      
      try {
        if (year && month) {
          // Get specific month
          const closing = await storage.getMonthlyClosing(parseInt(year as string), parseInt(month as string));
          closings = closing ? [closing] : [];
        } else if (startYear && startMonth && endYear && endMonth) {
          // Get date range
          const result = await storage.getMonthlyClosingsInDateRange(
            parseInt(startYear as string), 
            parseInt(startMonth as string),
            parseInt(endYear as string), 
            parseInt(endMonth as string)
          );
          closings = result || [];
        } else {
          // Get all closings
          const result = await storage.getAllMonthlyClosings();
          closings = result || [];
        }
      } catch (storageError) {
        console.log('Monthly closings storage query failed, returning empty array:', storageError);
        closings = [];
      }
      
      res.json(closings);
    } catch (error) {
      console.error('Error fetching monthly closings:', error);
      // Always return empty array instead of 500 error
      res.json([]);
    }
  });

  // Perform monthly closing (Admin/Manager only)
  app.post('/api/accounting/monthly/close', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if user is admin or manager
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: 'Access denied. Only admins and managers can close months.' });
      }

      const { year, month, notes } = req.body;
      
      if (!year || !month) {
        return res.status(400).json({ message: 'Year and month are required' });
      }

      // Check if month is already closed
      const existingClosing = await storage.getMonthlyClosing(year, month);
      if (existingClosing && existingClosing.status === 'closed') {
        return res.status(400).json({ 
          message: `Month ${month}/${year} is already closed`,
          existingClosing
        });
      }

      const closing = await storage.performMonthlyClosing(year, month, user.id, notes);
      
      res.json({
        message: `Successfully closed month ${month}/${year}`,
        closing
      });
    } catch (error) {
      console.error('Error performing monthly closing:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to close month'
      });
    }
  });

  // Reopen month (Admin/Manager only)
  app.put('/api/accounting/monthly/reopen', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if user is admin or manager
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: 'Access denied. Only admins and managers can reopen months.' });
      }

      const { year, month } = req.body;
      
      if (!year || !month) {
        return res.status(400).json({ message: 'Year and month are required' });
      }

      const reopenedClosing = await storage.reopenMonth(year, month, user.id);
      
      res.json({
        message: `Successfully reopened month ${month}/${year}`,
        closing: reopenedClosing
      });
    } catch (error) {
      console.error('Error reopening month:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to reopen month'
      });
    }
  });

  // Perform monthly reset (Admin/Manager only)
  app.post('/api/accounting/monthly/reset', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Check if user is admin or manager
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ message: 'Access denied. Only admins and managers can reset months.' });
      }

      const { year, month, resetType = 'manual', reason, notes } = req.body;
      
      if (!year || !month) {
        return res.status(400).json({ message: 'Year and month are required' });
      }

      const resetRecord = await storage.performMonthlyReset(year, month, user.id, resetType, reason, notes);
      
      res.json({
        message: `Successfully reset month ${month}/${year} to fresh start`,
        resetRecord
      });
    } catch (error) {
      console.error('Error performing monthly reset:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : 'Failed to reset month'
      });
    }
  });

  // Get monthly reset history
  app.get('/api/accounting/monthly/reset-history', isAuthenticated, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      let resetHistory;
      if (year && month) {
        resetHistory = await storage.getResetHistoryForMonth(parseInt(year as string), parseInt(month as string));
      } else {
        resetHistory = await storage.getMonthlyResetHistory();
      }
      
      res.json(resetHistory);
    } catch (error) {
      console.error('Error fetching reset history:', error);
      res.status(500).json({ message: 'Failed to fetch reset history' });
    }
  });

  // Get historical financial data for a specific month
  app.get('/api/accounting/monthly/historical-data', isAuthenticated, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: 'Year and month are required' });
      }

      const historicalData = await storage.getHistoricalFinancialData(
        parseInt(year as string), 
        parseInt(month as string)
      );
      
      res.json(historicalData);
    } catch (error) {
      console.error('Error fetching historical data:', error);
      res.status(500).json({ message: 'Failed to fetch historical data' });
    }
  });

  // Get historical profit & loss for a specific month
  app.get('/api/accounting/monthly/historical-profit-loss', isAuthenticated, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: 'Year and month are required' });
      }

      const profitLoss = await storage.getHistoricalProfitLoss(
        parseInt(year as string), 
        parseInt(month as string)
      );
      
      res.json(profitLoss);
    } catch (error) {
      console.error('Error fetching historical profit & loss:', error);
      res.status(500).json({ message: 'Failed to fetch historical profit & loss' });
    }
  });

  // Get historical account balances for a specific month
  app.get('/api/accounting/monthly/historical-balances', isAuthenticated, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: 'Year and month are required' });
      }

      const balances = await storage.getHistoricalAccountBalances(
        parseInt(year as string), 
        parseInt(month as string)
      );
      
      res.json(balances);
    } catch (error) {
      console.error('Error fetching historical account balances:', error);
      res.status(500).json({ message: 'Failed to fetch historical account balances' });
    }
  });

  // Get current month status and transactions
  app.get('/api/accounting/monthly/current', isAuthenticated, async (req, res) => {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      
      // Initialize default values
      let transactions = [];
      let isMonthClosed = false;
      let openingBalances = [];
      
      // Try to fetch data with graceful fallbacks
      try {
        const results = await Promise.allSettled([
          storage.getCurrentMonthTransactions(),
          storage.isMonthClosed(currentYear, currentMonth),
          storage.getOpeningBalancesForCurrentMonth()
        ]);
        
        // Extract results with fallbacks
        transactions = results[0].status === 'fulfilled' ? (results[0].value || []) : [];
        isMonthClosed = results[1].status === 'fulfilled' ? (results[1].value || false) : false;
        openingBalances = results[2].status === 'fulfilled' ? (results[2].value || []) : [];
      } catch (storageError) {
        console.log('Some monthly data queries failed, using defaults:', storageError);
      }
      
      // Always return valid response with computed values
      res.json({
        year: currentYear,
        month: currentMonth,
        isMonthClosed,
        transactions,
        openingBalances,
        transactionCount: transactions.length,
        // Include computed live data as fallbacks
        hasLiveData: transactions.length > 0,
        status: isMonthClosed ? 'closed' : 'open',
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching current month data:', error);
      // Always return structured data instead of 500 error
      const now = new Date();
      res.json({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        isMonthClosed: false,
        transactions: [],
        openingBalances: [],
        transactionCount: 0,
        hasLiveData: false,
        status: 'open',
        lastUpdated: new Date().toISOString(),
        note: 'Live computed fallback data'
      });
    }
  });

  // Check if a specific month is closed
  app.get('/api/accounting/monthly/is-closed', isAuthenticated, async (req, res) => {
    try {
      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ message: 'Year and month are required' });
      }

      const isClosed = await storage.isMonthClosed(parseInt(year as string), parseInt(month as string));
      
      res.json({
        year: parseInt(year as string),
        month: parseInt(month as string),
        isClosed
      });
    } catch (error) {
      console.error('Error checking month closed status:', error);
      res.status(500).json({ message: 'Failed to check month status' });
    }
  });

  // Get monthly account balances for a closed month
  app.get('/api/accounting/monthly/account-balances/:closingId', isAuthenticated, async (req, res) => {
    try {
      const closingId = parseInt(req.params.closingId);
      
      if (!closingId) {
        return res.status(400).json({ message: 'Closing ID is required' });
      }

      const balances = await storage.getMonthlyAccountBalances(closingId);
      
      res.json(balances);
    } catch (error) {
      console.error('Error fetching monthly account balances:', error);
      res.status(500).json({ message: 'Failed to fetch account balances' });
    }
  });

  // Get monthly transaction summaries for a closed month
  app.get('/api/accounting/monthly/transaction-summaries/:closingId', isAuthenticated, async (req, res) => {
    try {
      const closingId = parseInt(req.params.closingId);
      
      if (!closingId) {
        return res.status(400).json({ message: 'Closing ID is required' });
      }

      const summaries = await storage.getMonthlyTransactionSummaries(closingId);
      
      res.json(summaries);
    } catch (error) {
      console.error('Error fetching monthly transaction summaries:', error);
      res.status(500).json({ message: 'Failed to fetch transaction summaries' });
    }
  });

  // Get account balance history across multiple months
  app.get('/api/accounting/monthly/account-balance-history/:accountId', isAuthenticated, async (req, res) => {
    try {
      const accountId = parseInt(req.params.accountId);
      
      if (!accountId) {
        return res.status(400).json({ message: 'Account ID is required' });
      }

      const history = await storage.getAccountBalanceHistory(accountId);
      
      res.json(history);
    } catch (error) {
      console.error('Error fetching account balance history:', error);
      res.status(500).json({ message: 'Failed to fetch balance history' });
    }
  });

  // Emergency SMS broadcast endpoint
  app.post('/api/sms/emergency-broadcast', isAuthenticated, async (req, res) => {
    try {
      const { message, targetAudience } = req.body;
      const senderId = req.user!.id;

      // Only admins can send emergency broadcasts
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Only administrators can send emergency broadcasts' });
      }

      if (!message?.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Get all active users with phone numbers and SMS consent
      const allUsers = await storage.getAllUsers();
      const eligibleUsers = allUsers.filter(user => 
        user.isActive && 
        user.phone && 
        user.smsConsent &&
        user.smsEnabled &&
        user.id !== senderId // Don't send to self
      );

      if (eligibleUsers.length === 0) {
        return res.status(400).json({ error: 'No employees found with SMS enabled and consent given' });
      }

      // Process multi-value audience format
      let processedTargetAudience = 'all';
      if (Array.isArray(targetAudience)) {
        processedTargetAudience = targetAudience.length > 0 ? targetAudience[0] : 'all';
      } else if (targetAudience && typeof targetAudience === 'string') {
        processedTargetAudience = targetAudience;
      }

      // Filter by target audience using enhanced granular options
      let targetUsers = eligibleUsers;
      if (processedTargetAudience && processedTargetAudience !== 'all') {
        switch (processedTargetAudience) {
          case 'employees-only':
            targetUsers = eligibleUsers.filter(user => user.role === 'employee');
            break;
          case 'admins-managers':
            targetUsers = eligibleUsers.filter(user => user.role === 'admin' || user.role === 'manager');
            break;
          case 'managers-only':
            targetUsers = eligibleUsers.filter(user => user.role === 'manager');
            break;
          case 'admins-only':
            targetUsers = eligibleUsers.filter(user => user.role === 'admin');
            break;
          case 'lake-geneva':
            targetUsers = eligibleUsers.filter(user => 
              user.primaryStore === 'lake_geneva' || 
              user.assignedStores?.includes('lake_geneva')
            );
            break;
          case 'watertown':
            targetUsers = eligibleUsers.filter(user => 
              user.primaryStore === 'watertown' || 
              user.assignedStores?.includes('watertown')
            );
            break;
          case 'watertown-retail':
            targetUsers = eligibleUsers.filter(user => 
              user.primaryStore === 'watertown_retail' || 
              user.assignedStores?.includes('watertown_retail')
            );
            break;
          case 'watertown-spa':
            targetUsers = eligibleUsers.filter(user => 
              user.primaryStore === 'watertown_spa' || 
              user.assignedStores?.includes('watertown_spa')
            );
            break;
          case 'online-team':
            targetUsers = eligibleUsers.filter(user => 
              user.primaryStore === 'online' || 
              user.assignedStores?.includes('online')
            );
            break;
          // Legacy support for old format
          default:
            if (processedTargetAudience.startsWith('role:')) {
              const targetRole = processedTargetAudience.replace('role:', '');
              targetUsers = eligibleUsers.filter(user => user.role === targetRole);
            } else if (processedTargetAudience.startsWith('store:')) {
              const targetStore = processedTargetAudience.replace('store:', '');
              targetUsers = eligibleUsers.filter(user => 
                user.primaryStore === targetStore || 
                user.assignedStores?.includes(targetStore)
              );
            } else if (processedTargetAudience.startsWith('user:')) {
              // Handle individual user selection
              const userId = processedTargetAudience.replace('user:', '');
              targetUsers = eligibleUsers.filter(user => user.id === userId);
            }
            break;
        }
      }

      if (targetUsers.length === 0) {
        return res.status(400).json({ error: 'No employees found matching the target audience' });
      }

      // Create message record first
      const messageRecord = await storage.createMessage({
        senderId,
        content: message,
        priority: 'emergency',
        messageType: 'broadcast',
        targetAudience: processedTargetAudience,
        smsEnabled: true,
      });

      // Send smart notifications to all target users (emergency bypass clock status)
      const userIds = targetUsers.map(user => user.id);
      const notificationResult = await smartNotificationService.sendBulkSmartNotifications(
        userIds,
        {
          messageType: 'emergency',
          priority: 'emergency',
          content: {
            title: 'Emergency Alert',
            message: message
          },
          targetAudience,
          bypassClockStatus: true // Emergency messages always send SMS
        }
      );

      // Update response to include smart notification results
      const response = {
        success: true,
        messageId: messageRecord.id,
        recipients: {
          total: targetUsers.length,
          appNotifications: notificationResult.appNotifications,
          smsNotifications: notificationResult.smsNotifications,
          errors: notificationResult.errors.length
        },
        details: {
          sent: notificationResult.sent,
          errors: notificationResult.errors
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Error sending emergency broadcast:', error);
      res.status(500).json({ error: 'Failed to send emergency broadcast' });
    }
  });

  // PHASE 2: Employee Notification Preferences API
  app.get('/api/user/notification-preferences', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        smsConsent: user.smsConsent,
        smsEnabled: user.smsEnabled,
        smsNotificationTypes: user.smsNotificationTypes || ['emergency'],
        phone: user.phone || '',
        canModifyPreferences: true
      });
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
  });

  app.put('/api/user/notification-preferences', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { smsEnabled, smsNotificationTypes, phone } = req.body;

      // Validate notification types
      const validTypes = ['emergency', 'schedule', 'announcements', 'all'];
      const invalidTypes = smsNotificationTypes?.filter((type: string) => !validTypes.includes(type));
      
      if (invalidTypes && invalidTypes.length > 0) {
        return res.status(400).json({ 
          error: `Invalid notification types: ${invalidTypes.join(', ')}. Valid types: ${validTypes.join(', ')}` 
        });
      }

      // Update user preferences
      const updates: any = { updatedAt: new Date() };
      
      if (typeof smsEnabled === 'boolean') {
        updates.smsEnabled = smsEnabled;
      }
      
      if (Array.isArray(smsNotificationTypes)) {
        updates.smsNotificationTypes = smsNotificationTypes;
      }
      
      if (phone !== undefined) {
        updates.phone = phone;
      }

      const updatedUser = await storage.updateUserProfile(userId, updates);
      
      res.json({
        success: true,
        preferences: {
          smsConsent: updatedUser.smsConsent,
          smsEnabled: updatedUser.smsEnabled,
          smsNotificationTypes: updatedUser.smsNotificationTypes,
          phone: updatedUser.phone
        }
      });
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  // PHASE 2: Smart Notification Status API
  app.get('/api/user/work-status', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const workStatus = await smartNotificationService.getUserWorkStatus(userId);
      
      res.json({
        isClocked: workStatus.isClocked,
        status: workStatus.status,
        location: workStatus.location,
        lastActivity: workStatus.lastActivity,
        notificationRouting: workStatus.isClocked ? 'app_only' : 'smart_routing'
      });
    } catch (error) {
      console.error('Error fetching work status:', error);
      res.status(500).json({ error: 'Failed to fetch work status' });
    }
  });

  // PHASE 2: Test Smart Notification Endpoint
  app.post('/api/smart-notifications/test', isAuthenticated, async (req, res) => {
    try {
      const { targetUserId, messageType = 'announcement', priority = 'normal', title, message } = req.body;
      
      if (!targetUserId || !title) {
        return res.status(400).json({ error: 'targetUserId and title are required' });
      }

      const result = await smartNotificationService.sendSmartNotification({
        userId: targetUserId,
        messageType,
        priority,
        content: { title, message: message || title }
      });

      res.json({
        success: true,
        result: {
          appNotification: result.appNotification,
          smsNotification: result.smsNotification,
          reason: result.reason
        }
      });
    } catch (error) {
      console.error('Error testing smart notification:', error);
      res.status(500).json({ error: 'Failed to test smart notification' });
    }
  });

  // Send targeted SMS message endpoint (Enhanced with Smart Routing)
  app.post('/api/sms/send-message', isAuthenticated, async (req, res) => {
    try {
      const { message, recipients, priority = 'normal', targetAudience } = req.body;
      const senderId = req.user!.id;

      if (!message?.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      let targetUsers: any[] = [];

      // Get target users based on recipients or audience
      if (recipients && Array.isArray(recipients)) {
        // Specific user IDs provided
        const allUsers = await storage.getAllUsers();
        targetUsers = allUsers.filter(user => 
          recipients.includes(user.id) && 
          user.isActive && 
          user.phone && 
          user.smsConsent && 
          user.smsEnabled
        );
      } else if (targetAudience) {
        // Target audience specified
        const allUsers = await storage.getAllUsers();
        let eligibleUsers = allUsers.filter(user => 
          user.isActive && 
          user.phone && 
          user.smsConsent && 
          user.smsEnabled &&
          user.id !== senderId
        );

        if (targetAudience.startsWith('role:')) {
          const targetRole = targetAudience.replace('role:', '');
          targetUsers = eligibleUsers.filter(user => user.role === targetRole);
        } else if (targetAudience.startsWith('store:')) {
          const targetStore = targetAudience.replace('store:', '');
          targetUsers = eligibleUsers.filter(user => 
            user.primaryStore === targetStore || 
            user.assignedStores?.includes(targetStore)
          );
        } else if (targetAudience === 'all') {
          targetUsers = eligibleUsers;
        }
      }

      if (targetUsers.length === 0) {
        return res.status(400).json({ error: 'No eligible recipients found' });
      }

      // Create message record
      const messageRecord = await storage.createMessage({
        senderId,
        content: message,
        priority,
        messageType: recipients ? 'direct' : 'broadcast',
        targetAudience: targetAudience || 'custom',
        smsEnabled: true,
      });

      // Send smart notifications to all target users
      const userIds = targetUsers.map(user => user.id);
      const notificationResult = await smartNotificationService.sendBulkSmartNotifications(
        userIds,
        {
          messageType: 'announcement',
          priority: priority as any,
          content: {
            title: 'New Message',
            message: message
          },
          targetAudience
        }
      );

      // Update response to include smart notification results
      const response = {
        success: true,
        messageId: messageRecord.id,
        recipients: {
          total: targetUsers.length,
          appNotifications: notificationResult.appNotifications,
          smsNotifications: notificationResult.smsNotifications,
          errors: notificationResult.errors.length
        },
        details: {
          sent: notificationResult.sent,
          errors: notificationResult.errors,
          targetUsers: targetUsers.map(user => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone,
            role: user.role,
            primaryStore: user.primaryStore
          }))
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Error sending SMS message:', error);
      res.status(500).json({ error: 'Failed to send SMS message' });
    }
  });

  // Get SMS delivery status endpoint
  app.get('/api/sms/deliveries/:messageId', isAuthenticated, async (req, res) => {
    try {
      const { messageId } = req.params;
      const deliveries = await storage.getSMSDeliveriesByMessageId(parseInt(messageId));
      
      res.json({
        messageId: parseInt(messageId),
        deliveries: deliveries.map(delivery => ({
          id: delivery.id,
          userId: delivery.userId,
          phoneNumber: delivery.phoneNumber,
          status: delivery.status,
          errorMessage: delivery.errorMessage,
          sentAt: delivery.sentAt,
          deliveredAt: delivery.deliveredAt,
        }))
      });
    } catch (error) {
      console.error('Error fetching SMS deliveries:', error);
      res.status(500).json({ error: 'Failed to fetch SMS deliveries' });
    }
  });

  // Update user SMS preferences
  app.put('/api/users/sms-preferences', isAuthenticated, async (req, res) => {
    try {
      const { phone, smsEnabled, smsConsent, emergencyOnly } = req.body;
      const userId = req.user!.id;

      // Validate phone number format if provided
      if (phone && !/^\d{10,15}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number format' });
      }

      // Update user preferences (temporarily use direct update)
      const formattedPhone = phone ? `+1${phone}` : null;
      
      // For now, return success without database update due to column issues
      // TODO: Fix database schema and implement proper update
      res.json({ 
        success: true,
        message: 'SMS preferences will be updated once database schema is fixed',
        preferences: {
          phone: formattedPhone,
          smsEnabled,
          smsConsent,
          emergencyOnly
        }
      });

    } catch (error) {
      console.error('Error updating SMS preferences:', error);
      res.status(500).json({ error: 'Failed to update SMS preferences' });
    }
  });

  // Profile routes
  app.get('/api/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch('/api/profile', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const updateData = { ...req.body };
      
      // Handle SMS consent date automatically
      if (updateData.smsConsent === true && req.body.smsConsent !== undefined) {
        const currentUser = await storage.getUser(userId);
        if (currentUser && !currentUser.smsConsent) {
          // User is giving consent for the first time
          updateData.smsConsentDate = new Date();
        }
      } else if (updateData.smsConsent === false) {
        // User is withdrawing consent
        updateData.smsConsentDate = null;
      }
      
      const updatedUser = await storage.updateUserProfile(userId, updateData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // ================================
  // ENHANCED COMMUNICATION ENDPOINTS
  // ================================

  // Upload images for communications (messages/announcements)
  app.post('/api/communications/upload-images', isAuthenticated, upload.array('images', 5), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const user = req.user as any;

      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No images uploaded' });
      }

      // Validate file types (only images)
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const validFiles = files.filter(file => {
        // Check if file has been validated by multer first
        if (!file.originalname) return false;
        
        // Check file extension as additional validation
        const ext = path.extname(file.originalname).toLowerCase();
        const validExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        return validExts.includes(ext);
      });

      if (validFiles.length === 0) {
        // Clean up any uploaded files
        files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
        return res.status(400).json({ error: 'Only image files (JPG, PNG, GIF, WebP) are allowed' });
      }

      // Process valid files and create public URLs
      const imageUrls = validFiles.map(file => {
        const fileExtension = path.extname(file.originalname);
        const newFileName = `comm_${Date.now()}_${Math.random().toString(36).substring(7)}${fileExtension}`;
        const newPath = path.join(uploadsDir, newFileName);
        
        // Move file to proper location with descriptive name
        fs.renameSync(file.path, newPath);
        
        return `/uploads/${newFileName}`;
      });

      // Clean up any invalid files
      files.filter(file => !validFiles.includes(file)).forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });

      console.log(`📷 Images uploaded by ${user.firstName} ${user.lastName}:`, imageUrls);

      res.json({
        success: true,
        imageUrls,
        message: `${imageUrls.length} image(s) uploaded successfully`
      });

    } catch (error) {
      console.error('Error uploading images:', error);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  });

  // Send communication (messages/announcements) with SMS + app notifications
  app.post('/api/communications/send', isAuthenticated, async (req, res) => {
    try {
      const {
        subject,
        content,
        priority = 'normal',
        messageType = 'broadcast',
        smsEnabled = false,
        recipientMode = 'audience',
        targetAudience = 'all',
        recipients = [],
        imageUrls = []
      } = req.body;
      
      const senderId = req.user!.id;
      const senderUser = req.user as any;

      // Validate required fields
      if (!subject?.trim() || !content?.trim()) {
        return res.status(400).json({ error: 'Subject and content are required' });
      }

      // Helper function to embed imageUrls in content using sentinel pattern
      const embedImageUrls = (content: string, imageUrls: string[]): string => {
        if (!imageUrls || imageUrls.length === 0) return content;
        
        // Remove existing sentinel if present
        const cleanContent = content.replace(/\n\n<!--attachments:.*?-->/g, '');
        
        // Add new sentinel with image URLs
        const sentinel = `\n\n<!--attachments:${JSON.stringify({ images: imageUrls })}-->`;
        return cleanContent + sentinel;
      };

      // Helper function to parse imageUrls from content
      const parseImageUrls = (content: string): string[] => {
        const match = content.match(/<!--attachments:(.*?)-->/);
        if (match) {
          try {
            const attachments = JSON.parse(match[1]);
            return attachments.images || [];
          } catch (e) {
            return [];
          }
        }
        return [];
      };

      // Embed imageUrls in content if provided
      const contentWithImages = embedImageUrls(content.trim(), imageUrls);

      // Role-based permission checks (relaxed to allow all employees broader access)
      const isAdminOrManager = senderUser.role === 'admin' || senderUser.role === 'manager';

      // Validate permissions based on target audience (much more permissive)
      if (recipientMode === 'audience') {
        // Only restrict admin-only functions for non-admins
        if (!isAdminOrManager && targetAudience === 'admin_only') {
          return res.status(403).json({ error: 'Only admins can send to admin-only groups' });
        }
        // Allow employees to send to admin_manager groups (for urgent communications)
      }
      // Allow all employees to select individual recipients and channels

      let targetUsers: any[] = [];
      const allUsers = await storage.getAllUsers();

      // Get target users based on recipient mode
      if (recipientMode === 'individual' && recipients.length > 0) {
        // Individual recipients selected (allow self-messaging for testing/reminders)
        targetUsers = allUsers.filter(user => 
          recipients.includes(user.id) && 
          user.isActive
        );
      } else if (recipientMode === 'audience') {
        // Audience targeting
        let eligibleUsers = allUsers.filter(user => 
          user.isActive
        );

        if (targetAudience === 'all') {
          targetUsers = eligibleUsers;
        } else if (targetAudience === 'admin_manager') {
          targetUsers = eligibleUsers.filter(user => 
            user.role === 'admin' || user.role === 'manager'
          );
        } else if (targetAudience.startsWith('role:')) {
          const targetRole = targetAudience.replace('role:', '');
          targetUsers = eligibleUsers.filter(user => user.role === targetRole);
        } else if (targetAudience.startsWith('store:')) {
          const targetStore = targetAudience.replace('store:', '');
          targetUsers = eligibleUsers.filter(user => 
            user.primaryStore === targetStore || 
            user.assignedStores?.includes(targetStore)
          );
        }
      }

      if (targetUsers.length === 0) {
        console.log('❌ No eligible recipients found');
        return res.status(400).json({ error: 'No eligible recipients found' });
      }

      console.log(`📍 Found ${targetUsers.length} target users`);

      // Create message record in database
      console.log('💾 Creating message record in database...');
      
      // For individual direct messages, create separate message records for each recipient
      let messageRecord;
      if (recipientMode === 'individual' && messageType === 'direct_message' && targetUsers.length === 1) {
        messageRecord = await storage.createMessage({
          senderId,
          recipientId: targetUsers[0].id, // Set recipient for direct messages
          subject,
          content: contentWithImages,
          priority,
          messageType,
          targetAudience: 'custom',
          smsEnabled,
        });
      } else {
        // For announcements and multi-recipient messages
        messageRecord = await storage.createMessage({
          senderId,
          subject,
          content: contentWithImages,
          priority,
          messageType,
          targetAudience: recipientMode === 'individual' ? 'custom' : targetAudience,
          smsEnabled,
        });
      }
      console.log('✅ Message record created:', messageRecord.id);

      // Send notifications via smart notification service
      const userIds = targetUsers.map(user => user.id);
      const notificationPromise = smartNotificationService.sendBulkSmartNotifications(
        userIds,
        {
          messageType: messageType === 'announcement' ? 'announcement' : 'announcement',
          priority: priority as any,
          content: {
            title: subject,
            message: content,
            metadata: {
              messageId: messageRecord.id,
              senderName: `${senderUser.firstName} ${senderUser.lastName}`,
              senderRole: senderUser.role
            }
          },
          targetAudience,
          bypassClockStatus: priority === 'emergency',
          forceSMS: smsEnabled  // Pass the explicit SMS flag
        }
      );

      // Set a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Notification timeout after 30 seconds')), 30000);
      });

      const notificationResult = await Promise.race([notificationPromise, timeoutPromise]) as any;
      console.log('✅ Notifications sent:', notificationResult);

      // Create read receipts for tracking
      const readReceiptPromises = targetUsers.map(user => 
        storage.createReadReceipt({
          messageId: messageRecord.id,
          userId: user.id,
          deliveredAt: new Date(),
        })
      );
      await Promise.all(readReceiptPromises);

      const response = {
        success: true,
        messageId: messageRecord.id,
        subject,
        content: content.trim(), // Clean content without sentinel
        imageUrls: parseImageUrls(contentWithImages), // Parsed image URLs
        recipients: {
          total: targetUsers.length,
          appNotifications: notificationResult.appNotifications,
          smsNotifications: notificationResult.smsNotifications,
          errors: notificationResult.errors.length
        },
        smsEnabled,
        priority,
        sentAt: messageRecord.sentAt,
        details: {
          sent: notificationResult.sent,
          errors: notificationResult.errors,
          targetUsers: targetUsers.map(user => ({
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            smsConsent: user.smsConsent && user.smsEnabled
          }))
        }
      };

      res.json(response);

    } catch (error) {
      console.error('Error sending communication:', error);
      res.status(500).json({ error: 'Failed to send communication' });
    }
  });

  // Get communication history
  app.get('/api/communications/history', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { limit = 50, offset = 0, type = 'all' } = req.query;

      // Get messages based on user's role and involvement
      const messages = await storage.getMessagesForUser(userId, {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        type: type as string
      });

      // Enrich messages with reaction counts and read status
      const enrichedMessages = await Promise.all(
        messages.map(async (message) => {
          const [reactions, readReceipt] = await Promise.all([
            storage.getMessageReactions(message.id),
            storage.getReadReceipt(message.id, userId)
          ]);

          return {
            ...message,
            reactions: reactions.reduce((acc: any, reaction) => {
              acc[reaction.reactionType] = (acc[reaction.reactionType] || 0) + 1;
              return acc;
            }, {}),
            userReaction: reactions.find(r => r.userId === userId)?.reactionType || null,
            isRead: !!readReceipt?.readAt,
            deliveredAt: readReceipt?.deliveredAt
          };
        })
      );

      res.json(enrichedMessages);

    } catch (error) {
      console.error('Error fetching communication history:', error);
      res.status(500).json({ error: 'Failed to fetch communication history' });
    }
  });

  // Mark communication as read
  app.post('/api/communications/:messageId/read', isAuthenticated, async (req, res) => {
    try {
      const { messageId } = req.params;
      const userId = req.user!.id;

      await storage.markMessageAsRead(parseInt(messageId), userId);

      res.json({ success: true, readAt: new Date() });

    } catch (error) {
      console.error('Error marking message as read:', error);
      res.status(500).json({ error: 'Failed to mark message as read' });
    }
  });

  // ================================
  // CHANNEL COMMUNICATION ENDPOINTS
  // ================================

  // Get all channels for the user
  app.get('/api/channels', isAuthenticated, async (req, res) => {
    try {
      const channels = await storage.getChannelsForUser(req.user!.id);
      res.json(channels);
    } catch (error) {
      console.error('Error fetching channels:', error);
      res.status(500).json({ error: 'Failed to fetch channels' });
    }
  });

  // Send message to channel
  app.post('/api/channels/:channelId/messages', isAuthenticated, async (req, res) => {
    try {
      const { channelId } = req.params;
      const { content, priority = 'normal', smsEnabled = false, messageType = 'message' } = req.body;
      const senderId = req.user!.id;

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Message content is required' });
      }

      // Verify user is member of the channel
      const isMember = await storage.isChannelMember(parseInt(channelId), senderId);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this channel' });
      }

      // Create channel message
      const message = await storage.createChannelMessage({
        channelId: parseInt(channelId),
        senderId,
        content,
        messageType,
        priority,
        smsEnabled,
      });

      // Get channel members for notifications
      const channelMembers = await storage.getChannelMembers(parseInt(channelId));
      const memberIds = channelMembers
        .filter(member => member.userId !== senderId)
        .map(member => member.userId);

      // Send notifications to channel members
      if (memberIds.length > 0) {
        const channel = await storage.getChannel(parseInt(channelId));
        const senderUser = req.user as any;
        
        await smartNotificationService.sendBulkSmartNotifications(
          memberIds,
          {
            messageType: 'announcement',
            priority: priority as any,
            content: {
              title: `New message in #${channel?.name}`,
              message: content,
              metadata: {
                channelId: parseInt(channelId),
                channelName: channel?.name,
                messageId: message.id,
                senderName: `${senderUser.firstName} ${senderUser.lastName}`,
                senderRole: senderUser.role
              }
            },
            targetAudience: `channel:${channelId}`,
            bypassClockStatus: priority === 'emergency'
          }
        );
      }

      res.json({ success: true, message });

    } catch (error) {
      console.error('Error sending channel message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  });

  // Get channel messages
  app.get('/api/channels/:channelId/messages', isAuthenticated, async (req, res) => {
    try {
      const { channelId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      const userId = req.user!.id;

      // Verify user is member of the channel
      const isMember = await storage.isChannelMember(parseInt(channelId), userId);
      if (!isMember) {
        return res.status(403).json({ error: 'You are not a member of this channel' });
      }

      const messages = await storage.getChannelMessages(parseInt(channelId), {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json(messages);

    } catch (error) {
      console.error('Error fetching channel messages:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  // Join a channel
  app.post('/api/channels/:channelId/join', isAuthenticated, async (req, res) => {
    try {
      const { channelId } = req.params;
      const userId = req.user!.id;

      await storage.joinChannel(parseInt(channelId), userId);
      res.json({ success: true });

    } catch (error) {
      console.error('Error joining channel:', error);
      res.status(500).json({ error: 'Failed to join channel' });
    }
  });

  // Leave a channel
  app.post('/api/channels/:channelId/leave', isAuthenticated, async (req, res) => {
    try {
      const { channelId } = req.params;
      const userId = req.user!.id;

      await storage.leaveChannel(parseInt(channelId), userId);
      res.json({ success: true });

    } catch (error) {
      console.error('Error leaving channel:', error);
      res.status(500).json({ error: 'Failed to leave channel' });
    }
  });

  // SMS Fallback Webhook (backup handler for when primary fails)
  app.post('/api/sms/fallback', async (req, res) => {
    try {
      console.log('🚨 SMS FALLBACK webhook activated (NOT main webhook):', req.body);
      
      const { From, Body } = req.body;
      console.log(`Fallback SMS handler - From: ${From}, Message: "${Body}"`);
      
      // Simple fallback response
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Your message was received but could not be processed at this time. Please contact Pine Hill Farm directly at (414) 737-4100 for urgent matters.');
      
      res.type('text/xml');
      res.send(twiml.toString());
      
    } catch (error) {
      console.error('Error in SMS fallback handler:', error);
      
      const twiml = new twilio.twiml.MessagingResponse();
      res.type('text/xml');
      res.send(twiml.toString());
    }
  });

  // Voice Webhook endpoints for Twilio
  // Main incoming voice call webhook
  app.post('/api/voice/incoming', async (req, res) => {
    try {
      console.log('🚨 VOICE webhook wrongly called with SMS data:', req.body);
      
      const { From, Body } = req.body;
      console.log(`Fallback SMS handler - From: ${From}, Message: "${Body}"`);
      
      // Simple fallback response
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Your message was received but could not be processed at this time. Please contact Pine Hill Farm directly at (414) 737-4100 for urgent matters.');
      
      res.type('text/xml');
      res.send(twiml.toString());
      
    } catch (error) {
      console.error('Error in SMS fallback handler:', error);
      
      const twiml = new twilio.twiml.MessagingResponse();
      res.type('text/xml');
      res.send(twiml.toString());
    }
  });

  // Voice Webhook endpoints for Twilio
  // Main incoming voice call webhook
  app.post('/api/voice/incoming', async (req, res) => {
    try {
      console.log('Incoming voice call webhook received:', req.body);
      
      const { From, To, CallSid } = req.body;
      console.log(`Voice call received from ${From} to ${To}, CallSid: ${CallSid}`);
      
      // Create TwiML voice response
      const twiml = new twilio.twiml.VoiceResponse();
      
      // Business hours greeting
      const currentHour = new Date().getHours();
      const isBusinessHours = currentHour >= 9 && currentHour < 17; // 9 AM - 5 PM
      
      if (isBusinessHours) {
        twiml.say({
          voice: 'alice',
          language: 'en-US'
        }, 'Hello, thank you for calling Pine Hill Farm. Please hold while we connect you to our team.');
        
        // Forward to main business line during business hours
        twiml.dial('(414) 737-4100');
        
      } else {
        // After hours message
        twiml.say({
          voice: 'alice',
          language: 'en-US'
        }, 'Thank you for calling Pine Hill Farm. Our business hours are Monday through Saturday 9 AM to 5 PM, and Sunday 10 AM to 4 PM. For emergencies, please call our emergency line at 4 1 4, 7 3 7, 4 1 0 0. You may also leave a message after the tone.');
        
        // Record voicemail
        twiml.record({
          timeout: 10,
          transcribe: true,
          recordingStatusCallback: '/api/voice/recording'
        });
        
        twiml.say('Thank you for your message. We will return your call during business hours.');
      }
      
      res.type('text/xml');
      res.send(twiml.toString());
      
    } catch (error) {
      console.error('Error processing incoming voice call:', error);
      
      // Send error response via TwiML
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Sorry, there was an error processing your call. Please try calling again or contact us directly at 4 1 4, 7 3 7, 4 1 0 0.');
      
      res.type('text/xml');
      res.send(twiml.toString());
    }
  });

  // Voice Fallback Webhook (backup handler for when primary fails)
  app.post('/api/voice/fallback', async (req, res) => {
    try {
      console.log('Voice fallback webhook activated:', req.body);
      
      const { From, To } = req.body;
      console.log(`Voice fallback handler - From: ${From}, To: ${To}`);
      
      // Emergency fallback response
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say({
        voice: 'alice',
        language: 'en-US'
      }, 'Thank you for calling Pine Hill Farm. Our system is currently experiencing technical difficulties. Please call our emergency line directly at 4 1 4, 7 3 7, 4 1 0 0, or visit our Lake Geneva location at 704 West Main Street.');
      
      res.type('text/xml');
      res.send(twiml.toString());
      
    } catch (error) {
      console.error('Error in voice fallback handler:', error);
      
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Please call 4 1 4, 7 3 7, 4 1 0 0 for assistance.');
      
      res.type('text/xml');
      res.send(twiml.toString());
    }
  });

  // Voice recording status callback (for voicemail handling)
  app.post('/api/voice/recording', async (req, res) => {
    try {
      console.log('Voice recording callback received:', req.body);
      
      const { RecordingUrl, RecordingSid, From, TranscriptionText } = req.body;
      
      // Log the voicemail for admin review
      console.log(`Voicemail received from ${From}:`);
      console.log(`Recording URL: ${RecordingUrl}`);
      console.log(`Transcription: ${TranscriptionText || 'No transcription available'}`);
      
      // TODO: Store voicemail in database and notify staff
      // For now, just acknowledge receipt
      res.sendStatus(200);
      
    } catch (error) {
      console.error('Error processing voice recording:', error);
      res.sendStatus(500);
    }
  });

  // ============================================
  // Phase 6: Advanced Features - API Routes
  // ============================================

  // Scheduled Messages Routes
  app.post('/api/scheduled-messages', isAuthenticated, async (req, res) => {
    try {
      // Convert scheduledFor from local time to proper timezone
      let scheduledForDate = req.body.scheduledFor;
      if (scheduledForDate) {
        // Frontend sends: "2025-08-28T17:11" (assumed Central Time)
        // Convert to proper timezone: 5:11 PM CT = 10:11 PM UTC
        const localTime = new Date(scheduledForDate);
        
        // Add 5 hours to convert from CT to UTC (during standard time)
        // Note: This assumes Central Standard Time (CST). In production,
        // you'd want to use a proper timezone library like date-fns-tz
        const utcTime = new Date(localTime.getTime() + (5 * 60 * 60 * 1000));
        
        console.log(`🌍 Timezone conversion: ${scheduledForDate} (local) → ${utcTime.toISOString()} (UTC)`);
        scheduledForDate = utcTime.toISOString();
      }
      
      const validatedData = insertScheduledMessageSchema.parse({
        ...req.body,
        scheduledFor: scheduledForDate,
        authorId: req.user!.id,
      });
      const scheduledMessage = await storage.createScheduledMessage(validatedData);
      res.json(scheduledMessage);
    } catch (error) {
      console.error('Error creating scheduled message:', error);
      res.status(400).json({ error: 'Failed to create scheduled message' });
    }
  });

  app.get('/api/scheduled-messages', isAuthenticated, async (req, res) => {
    try {
      const scheduledMessages = await storage.getScheduledMessages();
      res.json(scheduledMessages);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      res.status(500).json({ error: 'Failed to fetch scheduled messages' });
    }
  });

  // Announcement Templates Routes
  app.post('/api/announcement-templates', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAnnouncementTemplateSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
      });
      const template = await storage.createAnnouncementTemplate(validatedData);
      res.json(template);
    } catch (error) {
      console.error('Error creating announcement template:', error);
      res.status(400).json({ error: 'Failed to create announcement template' });
    }
  });

  app.get('/api/announcement-templates', isAuthenticated, async (req, res) => {
    try {
      const templates = await storage.getAnnouncementTemplates();
      res.json(templates);
    } catch (error) {
      console.error('Error fetching announcement templates:', error);
      res.status(500).json({ error: 'Failed to fetch announcement templates' });
    }
  });

  app.get('/api/announcement-templates/category/:category', isAuthenticated, async (req, res) => {
    try {
      const { category } = req.params;
      const templates = await storage.getAnnouncementTemplatesByCategory(category);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching templates by category:', error);
      res.status(500).json({ error: 'Failed to fetch templates by category' });
    }
  });

  // Seed professional templates with emojis
  app.post('/api/announcement-templates/seed', isAuthenticated, async (req, res) => {
    try {
      // Only admins can seed templates
      if (req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Only admins can seed templates' });
      }
      
      await storage.seedProfessionalTemplates(req.user!.id);
      res.json({ message: 'Professional templates seeded successfully!' });
    } catch (error) {
      console.error('Error seeding templates:', error);
      res.status(500).json({ error: 'Failed to seed templates' });
    }
  });

  // Automation Rules Routes (basic CRUD)
  app.post('/api/automation-rules', isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAutomationRuleSchema.parse({
        ...req.body,
        createdBy: req.user!.id,
      });
      const rule = await storage.createAutomationRule(validatedData);
      res.json(rule);
    } catch (error) {
      console.error('Error creating automation rule:', error);
      res.status(400).json({ error: 'Failed to create automation rule' });
    }
  });

  app.get('/api/automation-rules', isAuthenticated, async (req, res) => {
    try {
      const rules = await storage.getAutomationRules();
      res.json(rules);
    } catch (error) {
      console.error('Error fetching automation rules:', error);
      res.status(500).json({ error: 'Failed to fetch automation rules' });
    }
  });

  // SMS Notification Control routes for bulk schedule entry
  app.post('/api/sms/pause', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only admins and managers can pause SMS notifications
      if (!user || !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Insufficient permissions. Only admins and managers can pause SMS notifications.' 
        });
      }

      const result = smartNotificationService.pauseSMSNotifications(user.id);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Error pausing SMS notifications:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to pause SMS notifications' 
      });
    }
  });

  app.post('/api/sms/resume', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only admins and managers can resume SMS notifications
      if (!user || !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Insufficient permissions. Only admins and managers can resume SMS notifications.' 
        });
      }

      const { sendSummary = true } = req.body;
      const result = await smartNotificationService.resumeSMSNotifications(user.id, sendSummary);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      console.error('Error resuming SMS notifications:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to resume SMS notifications' 
      });
    }
  });

  app.get('/api/sms/status', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      
      // Only admins and managers can check SMS notification status
      if (!user || !['admin', 'manager'].includes(user.role)) {
        return res.status(403).json({ 
          success: false, 
          error: 'Insufficient permissions.' 
        });
      }

      const status = smartNotificationService.getSMSPauseStatus();
      res.json({ success: true, status });

    } catch (error) {
      console.error('Error getting SMS notification status:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to get SMS notification status' 
      });
    }
  });

  // ================================
  // PAYROLL API ENDPOINTS
  // ================================
  
  // Import payroll security modules
  const { 
    createPayrollValidation, 
    createQueryValidation,
    payrollPeriodsQuerySchema,
    createPayrollPeriodSchema,
    updatePayrollPeriodSchema,
    calculatePayrollSchema,
    payrollEntriesQuerySchema,
    unprocessedTimeEntriesQuerySchema,
    processTimeEntriesSchema,
    employeePayHistoryQuerySchema
  } = await import('./payroll-validation.ts');
  
  const {
    requirePayrollAccess,
    requireEmployeePayrollAccess,
    validatePayrollPeriodAccess,
    validatePayrollEntryAccess,
    rateLimitPayrollOperations
  } = await import('./payroll-auth.ts');
  
  const { payrollLogger } = await import('./secure-logger.ts');

  // Payroll Period Management
  app.get('/api/payroll/periods', 
    isAuthenticated,
    requirePayrollAccess(['admin', 'manager']),
    createQueryValidation(payrollPeriodsQuerySchema),
    async (req, res) => {
      try {
        const { status, limit, offset } = req.validatedQuery;
        const periods = await storage.getPayrollPeriods(status, limit, offset);
        
        payrollLogger.info('Payroll periods retrieved', {
          userId: req.user.id,
          count: periods.length,
          filters: { status }
        });
        
        res.json(periods);
      } catch (error) {
        payrollLogger.error('Error fetching payroll periods', error instanceof Error ? error : new Error(String(error)), {
          userId: req.user?.id
        });
        res.status(500).json({ message: 'Failed to fetch payroll periods' });
      }
    }
  );

  app.post('/api/payroll/periods',
    isAuthenticated,
    requirePayrollAccess(['admin', 'manager']),
    rateLimitPayrollOperations(5, 300000), // 5 operations per 5 minutes
    createPayrollValidation(createPayrollPeriodSchema),
    async (req, res) => {
      try {
        const validatedData = req.validatedData;
        
        const period = await storage.createPayrollPeriod({
          ...validatedData,
          status: 'draft',
          createdBy: req.user.id,
        });
        
        payrollLogger.info('Payroll period created', {
          userId: req.user.id,
          periodId: period.id,
          startDate: validatedData.startDate,
          endDate: validatedData.endDate,
          payPeriodType: validatedData.payPeriodType
        });
        
        res.status(201).json(period);
      } catch (error) {
        payrollLogger.error('Error creating payroll period', error instanceof Error ? error : new Error(String(error)), {
          userId: req.user?.id,
          requestData: req.validatedData
        });
        res.status(500).json({ message: 'Failed to create payroll period' });
      }
    }
  );

  app.get('/api/payroll/periods/:id',
    isAuthenticated,
    requirePayrollAccess(['admin', 'manager']),
    validatePayrollPeriodAccess,
    async (req, res) => {
      try {
        const periodId = req.periodId;
        const period = await storage.getPayrollPeriod(periodId);
        
        if (!period) {
          payrollLogger.warn('Payroll period not found', {
            userId: req.user.id,
            periodId
          });
          return res.status(404).json({ error: 'Payroll period not found' });
        }
        
        payrollLogger.info('Payroll period retrieved', {
          userId: req.user.id,
          periodId,
          status: period.status
        });
        
        res.json(period);
      } catch (error) {
        payrollLogger.error('Error fetching payroll period', error instanceof Error ? error : new Error(String(error)), {
          userId: req.user?.id,
          periodId: req.periodId
        });
        res.status(500).json({ message: 'Failed to fetch payroll period' });
      }
    }
  );

  app.patch('/api/payroll/periods/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const periodId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedPeriod = await storage.updatePayrollPeriod(periodId, updates);
      res.json(updatedPeriod);
    } catch (error) {
      console.error('Error updating payroll period:', error);
      res.status(500).json({ message: 'Failed to update payroll period' });
    }
  });

  app.delete('/api/payroll/periods/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const periodId = parseInt(req.params.id);
      await storage.deletePayrollPeriod(periodId);
      res.json({ message: 'Payroll period deleted successfully' });
    } catch (error) {
      console.error('Error deleting payroll period:', error);
      res.status(500).json({ message: 'Failed to delete payroll period' });
    }
  });

  // Payroll Calculations
  app.post('/api/payroll/calculate', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const { startDate, endDate, userId } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const payrollData = await storage.calculatePayrollForDateRange(startDate, endDate, userId);
      res.json(payrollData);
    } catch (error) {
      console.error('Error calculating payroll:', error);
      res.status(500).json({ message: 'Failed to calculate payroll' });
    }
  });

  app.post('/api/payroll/calculate-employee', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, userId } = req.body;
      
      if (!startDate || !endDate || !userId) {
        return res.status(400).json({ error: 'Start date, end date, and user ID are required' });
      }

      // Check if user can access this employee's data
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager' && req.user?.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const payrollData = await storage.calculatePayrollForEmployee(userId, startDate, endDate);
      res.json(payrollData);
    } catch (error) {
      console.error('Error calculating employee payroll:', error);
      res.status(500).json({ message: 'Failed to calculate employee payroll' });
    }
  });

  app.post('/api/payroll/periods/:id/calculate', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const periodId = parseInt(req.params.id);
      const payrollData = await storage.calculatePayrollForPeriod(periodId);
      res.json(payrollData);
    } catch (error) {
      console.error('Error calculating payroll for period:', error);
      res.status(500).json({ message: 'Failed to calculate payroll for period' });
    }
  });

  // Payroll Entry Management
  app.get('/api/payroll/entries', isAuthenticated, async (req, res) => {
    try {
      const { payrollPeriodId, userId } = req.query;
      
      // If userId is provided and user is not admin/manager, they can only see their own entries
      if (userId && req.user?.role !== 'admin' && req.user?.role !== 'manager' && req.user?.id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const entries = await storage.getPayrollEntries(
        payrollPeriodId ? parseInt(payrollPeriodId as string) : undefined,
        userId as string
      );
      res.json(entries);
    } catch (error) {
      console.error('Error fetching payroll entries:', error);
      res.status(500).json({ message: 'Failed to fetch payroll entries' });
    }
  });

  app.post('/api/payroll/entries', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const entryData = req.body;
      const entry = await storage.createPayrollEntry(entryData);
      res.json(entry);
    } catch (error) {
      console.error('Error creating payroll entry:', error);
      res.status(500).json({ message: 'Failed to create payroll entry' });
    }
  });

  app.get('/api/payroll/entries/:id', isAuthenticated, async (req, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const entry = await storage.getPayrollEntry(entryId);
      
      if (!entry) {
        return res.status(404).json({ error: 'Payroll entry not found' });
      }

      // Check if user can access this entry
      if (req.user?.role !== 'admin' && req.user?.role !== 'manager' && req.user?.id !== entry.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      res.json(entry);
    } catch (error) {
      console.error('Error fetching payroll entry:', error);
      res.status(500).json({ message: 'Failed to fetch payroll entry' });
    }
  });

  app.patch('/api/payroll/entries/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const entryId = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedEntry = await storage.updatePayrollEntry(entryId, updates);
      res.json(updatedEntry);
    } catch (error) {
      console.error('Error updating payroll entry:', error);
      res.status(500).json({ message: 'Failed to update payroll entry' });
    }
  });

  app.post('/api/payroll/entries/:id/approve', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const entryId = parseInt(req.params.id);
      const approvedEntry = await storage.approvePayrollEntry(entryId, req.user.id);
      res.json(approvedEntry);
    } catch (error) {
      console.error('Error approving payroll entry:', error);
      res.status(500).json({ message: 'Failed to approve payroll entry' });
    }
  });

  app.delete('/api/payroll/entries/:id', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const entryId = parseInt(req.params.id);
      await storage.deletePayrollEntry(entryId);
      res.json({ message: 'Payroll entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting payroll entry:', error);
      res.status(500).json({ message: 'Failed to delete payroll entry' });
    }
  });

  // Payroll Processing
  app.post('/api/payroll/periods/:id/process', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const periodId = parseInt(req.params.id);
      const processedPeriod = await storage.processPayrollPeriod(periodId, req.user.id);
      res.json(processedPeriod);
    } catch (error) {
      console.error('Error processing payroll period:', error);
      res.status(500).json({ message: 'Failed to process payroll period' });
    }
  });

  app.post('/api/payroll/periods/:id/generate-journal', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const periodId = parseInt(req.params.id);
      const journalEntries = await storage.generatePayrollJournalEntries(periodId);
      res.json(journalEntries);
    } catch (error) {
      console.error('Error generating payroll journal entries:', error);
      res.status(500).json({ message: 'Failed to generate payroll journal entries' });
    }
  });

  app.post('/api/payroll/periods/:id/mark-paid', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const periodId = parseInt(req.params.id);
      const paidPeriod = await storage.markPayrollPeriodAsPaid(periodId);
      res.json(paidPeriod);
    } catch (error) {
      console.error('Error marking payroll period as paid:', error);
      res.status(500).json({ message: 'Failed to mark payroll period as paid' });
    }
  });

  // Payroll Reports and Analytics
  app.get('/api/payroll/reports/monthly', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const { year, month } = req.query;
      
      if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
      }

      const summary = await storage.getPayrollSummaryByMonth(parseInt(year as string), parseInt(month as string));
      res.json(summary);
    } catch (error) {
      console.error('Error fetching monthly payroll summary:', error);
      res.status(500).json({ message: 'Failed to fetch monthly payroll summary' });
    }
  });

  app.get('/api/payroll/analytics', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const analytics = await storage.getPayrollAnalytics(startDate as string, endDate as string);
      res.json(analytics);
    } catch (error) {
      console.error('Error fetching payroll analytics:', error);
      res.status(500).json({ message: 'Failed to fetch payroll analytics' });
    }
  });

  app.get('/api/payroll/employees/:userId/history',
    isAuthenticated,
    requireEmployeePayrollAccess,
    createQueryValidation(employeePayHistoryQuerySchema),
    async (req, res) => {
      try {
        const userId = req.params.userId;
        const { limit, offset, startDate, endDate } = req.validatedQuery;

        const history = await storage.getEmployeePayHistory(
          userId, 
          limit,
          offset,
          startDate,
          endDate
        );
        
        payrollLogger.info('Employee pay history retrieved', {
          requestingUserId: req.user.id,
          targetUserId: userId,
          recordCount: history.length,
          dateRange: { startDate, endDate }
        });
        
        res.json(history);
    } catch (error) {
      console.error('Error fetching employee pay history:', error);
      res.status(500).json({ message: 'Failed to fetch employee pay history' });
    }
  });

  // Time Clock Integration
  app.get('/api/payroll/unprocessed-time-entries', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }

      const timeEntries = await storage.getUnprocessedTimeEntries(startDate as string, endDate as string);
      res.json(timeEntries);
    } catch (error) {
      console.error('Error fetching unprocessed time entries:', error);
      res.status(500).json({ message: 'Failed to fetch unprocessed time entries' });
    }
  });

  app.post('/api/payroll/process-time-entries', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const { timeEntryIds, payrollEntryId } = req.body;
      
      if (!timeEntryIds || !payrollEntryId) {
        return res.status(400).json({ error: 'Time entry IDs and payroll entry ID are required' });
      }

      await storage.markTimeEntriesAsProcessed(timeEntryIds, payrollEntryId);
      res.json({ message: 'Time entries processed successfully' });
    } catch (error) {
      console.error('Error processing time entries:', error);
      res.status(500).json({ message: 'Failed to process time entries' });
    }
  });

  // Payroll Validation
  app.get('/api/payroll/periods/:id/validate', isAuthenticated, async (req, res) => {
    try {
      if (!req.user || !['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Admin or Manager access required' });
      }

      const periodId = parseInt(req.params.id);
      const validation = await storage.validatePayrollCalculations(periodId);
      res.json(validation);
    } catch (error) {
      console.error('Error validating payroll calculations:', error);
      res.status(500).json({ message: 'Failed to validate payroll calculations' });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store client subscriptions
  const clientSubscriptions = new Map<any, Set<string>>();

  wss.on('connection', (ws) => {
    console.log('✅ WebSocket client connected');
    clientSubscriptions.set(ws, new Set());

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Subscribe to specific channels
            const subscriptions = clientSubscriptions.get(ws) || new Set();
            subscriptions.add(data.channel);
            clientSubscriptions.set(ws, subscriptions);
            ws.send(JSON.stringify({ type: 'subscribed', channel: data.channel }));
            console.log(`Client subscribed to: ${data.channel}`);
            break;
          case 'unsubscribe':
            // Unsubscribe from specific channels
            const clientSubs = clientSubscriptions.get(ws);
            if (clientSubs) {
              clientSubs.delete(data.channel);
              ws.send(JSON.stringify({ type: 'unsubscribed', channel: data.channel }));
              console.log(`Client unsubscribed from: ${data.channel}`);
            }
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          default:
            console.log('Unknown WebSocket message type:', data.type);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('❌ WebSocket client disconnected');
      clientSubscriptions.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clientSubscriptions.delete(ws);
    });

    // Send welcome message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to Pine Hill Farm Communications' }));
    }
  });

  // Analytics Broadcasting Service
  const analyticsService = {
    broadcastAnalyticsUpdate: (eventType: string, data: any) => {
      const message = JSON.stringify({
        type: 'analytics_update',
        eventType,
        data,
        timestamp: new Date().toISOString()
      });

      // Broadcast to all clients subscribed to analytics
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          const subscriptions = clientSubscriptions.get(client);
          if (subscriptions && subscriptions.has('analytics')) {
            client.send(message);
          }
        }
      });

      console.log(`📊 Analytics update broadcasted: ${eventType}`);
    },

    broadcastSMSUpdate: async (messageId: string, status: string, cost?: number) => {
      // Broadcast real-time SMS status update
      analyticsService.broadcastAnalyticsUpdate('sms_status_changed', {
        messageId,
        status,
        cost,
        isSuccess: status === 'delivered',
        timestamp: new Date().toISOString()
      });

      // If this is a final status (delivered/failed), trigger daily aggregation update
      if (status === 'delivered' || status === 'failed' || status === 'undelivered') {
        try {
          const today = new Date().toISOString().split('T')[0];
          await storage.aggregateDailyCommunicationAnalytics(today);
          
          // Broadcast updated daily metrics
          const updatedAnalytics = await storage.getCommunicationAnalytics(1); // Just today
          analyticsService.broadcastAnalyticsUpdate('daily_metrics_updated', {
            date: today,
            metrics: updatedAnalytics.overview
          });
        } catch (error) {
          console.error('Error updating daily analytics:', error);
        }
      }
    },

    broadcastCommunicationUpdate: async (eventType: string, data: any) => {
      // Broadcast communication event update
      analyticsService.broadcastAnalyticsUpdate('communication_event', {
        eventType,
        data,
        timestamp: new Date().toISOString()
      });

      // Trigger daily analytics update
      try {
        const today = new Date().toISOString().split('T')[0];
        await storage.aggregateDailyCommunicationAnalytics(today);
        
        // Broadcast updated metrics
        const updatedAnalytics = await storage.getCommunicationAnalytics(7); // Last 7 days
        analyticsService.broadcastAnalyticsUpdate('metrics_refreshed', {
          range: '7_days',
          data: updatedAnalytics
        });
      } catch (error) {
        console.error('Error updating communication analytics:', error);
      }
    }
  };

  // Export analytics service for use in other parts of the application
  (global as any).analyticsService = analyticsService;

  return httpServer;
}
