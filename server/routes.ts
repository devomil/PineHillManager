import type { Express } from "express";
import { createServer, type Server } from "http";
// WebSocket functionality handled by Vite in development
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./storage";
import { performanceMiddleware, getPerformanceMetrics, resetPerformanceMetrics } from "./performance-middleware";
import { notificationService } from "./notificationService";
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';

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

export async function registerRoutes(app: Express): Promise<Server> {

  // Performance monitoring
  app.use(performanceMiddleware);
  app.get('/api/performance/metrics', getPerformanceMetrics);
  app.post('/api/performance/reset', resetPerformanceMetrics);

  // Setup authentication
  setupAuth(app);

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
      const today = new Date().toISOString().split('T')[0];
      const schedules = await storage.getWorkSchedulesByDate(today);
      res.json(schedules);
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

  // Announcements routes
  app.get('/api/announcements', isAuthenticated, async (req, res) => {
    try {
      const announcements = await storage.getAllAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      res.status(500).json({ message: 'Failed to fetch announcements' });
    }
  });

  app.get('/api/announcements/published', isAuthenticated, async (req, res) => {
    try {
      const announcements = await storage.getPublishedAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error('Error fetching published announcements:', error);
      res.status(500).json({ message: 'Failed to fetch published announcements' });
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

  // Time clock API endpoints
  app.post('/api/time-clock/clock-in', isAuthenticated, async (req, res) => {
    try {
      const { locationId } = req.body;
      const userId = req.user!.id;
      const ipAddress = req.ip;
      const deviceInfo = req.get('User-Agent');

      const timeEntry = await storage.clockIn(userId, locationId, ipAddress, deviceInfo);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error clocking in:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to clock in' });
    }
  });

  app.post('/api/time-clock/clock-out', isAuthenticated, async (req, res) => {
    try {
      const { notes } = req.body;
      const userId = req.user!.id;

      const timeEntry = await storage.clockOut(userId, notes);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error clocking out:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to clock out' });
    }
  });

  app.post('/api/time-clock/start-break', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const timeEntry = await storage.startBreak(userId);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error starting break:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to start break' });
    }
  });

  app.post('/api/time-clock/end-break', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const timeEntry = await storage.endBreak(userId);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error ending break:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to end break' });
    }
  });

  app.get('/api/time-clock/current', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const currentEntry = await storage.getCurrentTimeEntry(userId);
      res.json(currentEntry || null);
    } catch (error) {
      console.error('Error getting current time entry:', error);
      res.status(500).json({ message: 'Failed to get current time entry' });
    }
  });

  app.get('/api/time-clock/today', isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
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
      const userId = req.user!.id;
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

  const httpServer = createServer(app);
  return httpServer;
}