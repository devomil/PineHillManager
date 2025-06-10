import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";

// Initialize database with sample users
async function initializeDatabase() {
  try {
    // Create admin user (Ryan Sorensen)
    let adminUser = await storage.getUser("40154188");
    if (!adminUser) {
      await storage.upsertUser({
        id: "40154188",
        email: "ryan@pinehillfarm.co",
        firstName: "Ryan",
        lastName: "Sorensen",
        profileImageUrl: null,
      });
      await storage.updateUserRole("40154188", "admin");
    }

    // Create manager user
    let managerUser = await storage.getUser("manager001");
    if (!managerUser) {
      await storage.createEmployee({
        id: "manager001",
        employeeId: "PHF-MGR-001",
        firstName: "Sarah",
        lastName: "Johnson",
        email: "sarah@pinehillfarm.co",
        role: "manager",
        department: "operations",
        position: "Store Manager",
        hireDate: "2023-01-15",
        isActive: true,
        timeOffBalance: 40
      });
    }

    // Create sample employees
    let employee1 = await storage.getUser("employee001");
    if (!employee1) {
      await storage.createEmployee({
        id: "employee001",
        employeeId: "PHF-EMP-001",
        firstName: "Mike",
        lastName: "Davis",
        email: "mike@pinehillfarm.co",
        role: "employee",
        department: "sales",
        position: "Sales Associate",
        hireDate: "2023-06-01",
        isActive: true,
        timeOffBalance: 24
      });
    }

    let employee2 = await storage.getUser("employee002");
    if (!employee2) {
      await storage.createEmployee({
        id: "employee002",
        employeeId: "PHF-EMP-002",
        firstName: "Jessica",
        lastName: "Miller",
        email: "jessica@pinehillfarm.co",
        role: "employee",
        department: "sales",
        position: "Sales Associate",
        hireDate: "2023-08-15",
        isActive: true,
        timeOffBalance: 16
      });
    }

    let employee3 = await storage.getUser("employee003");
    if (!employee3) {
      await storage.createEmployee({
        id: "employee003",
        employeeId: "PHF-EMP-003",
        firstName: "Alex",
        lastName: "Thompson",
        email: "alex@pinehillfarm.co",
        role: "employee",
        department: "inventory",
        position: "Inventory Specialist",
        hireDate: "2024-01-10",
        isActive: true,
        timeOffBalance: 32
      });
    }

    console.log("Database initialized with user accounts:");
    console.log("- Admin: Ryan Sorensen (ryan@pinehillfarm.co)");
    console.log("- Manager: Sarah Johnson (sarah@pinehillfarm.co)");
    console.log("- Employees: Mike Davis, Jessica Miller, Alex Thompson");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

import { notificationService } from "./notificationService";
import {
  insertTimeOffRequestSchema,
  insertWorkScheduleSchema,
  insertShiftCoverageRequestSchema,
  insertAnnouncementSchema,
  insertTrainingModuleSchema,
  insertTrainingProgressSchema,
  insertMessageSchema,
  insertChatChannelSchema,
  insertChannelMemberSchema,
  insertDocumentSchema,
  insertDocumentPermissionSchema,
  insertDocumentLogSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize database with sample users
  await initializeDatabase();

  // Only handle API routes on server, let React handle all UI routes
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      res.setHeader('X-Handled-By', 'Express-Server');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    next();
  });

  // Auth middleware
  setupAuth(app);

  // ALL SERVER-SIDE HTML ROUTES REMOVED
  // React app now handles all UI routing for consistent branding and UX

  // API ROUTES ONLY BELOW - No HTML templates

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Profile API
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Admin stats API
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      if (user.role !== 'admin' && user.role !== 'manager') {
        return res.status(403).json({ error: "Unauthorized" });
      }

      // Get basic counts from existing methods
      const allEmployees = await storage.getAllEmployees();
      const totalEmployees = allEmployees.length;
      
      // Get pending time off requests count
      const allTimeOffRequests = await storage.getAllTimeOffRequests();
      const pendingRequests = allTimeOffRequests.filter(req => req.status === 'pending').length;
      
      // Get today's scheduled count
      const today = new Date().toISOString().split('T')[0];
      const allSchedules = await storage.getAllWorkSchedules();
      const scheduledToday = allSchedules.filter(schedule => schedule.date === today).length;
      const totalLocations = 3; // Lake Geneva, Watertown Retail, Watertown Spa

      res.json({
        totalEmployees,
        pendingRequests,
        scheduledToday,
        totalLocations
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ error: "Failed to fetch admin stats" });
    }
  });

  // Today's work schedules API
  app.get('/api/work-schedules/today', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const today = new Date().toISOString().split('T')[0];
      
      const schedules = await storage.getUserWorkSchedules(userId);
      const todaySchedules = schedules.filter(schedule => 
        schedule.date === today
      );

      res.json(todaySchedules);
    } catch (error) {
      console.error("Error fetching today's schedules:", error);
      res.status(500).json({ error: "Failed to fetch schedules" });
    }
  });

  // Dashboard stats API
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get user's upcoming shifts count
      const userSchedules = await storage.getUserWorkSchedules(userId);
      const today = new Date();
      const upcomingShifts = userSchedules.filter(schedule => {
        const scheduleDate = new Date(schedule.date);
        return scheduleDate >= today;
      }).length;

      // Get user's pending time off requests
      const timeOffRequests = await storage.getUserTimeOffRequests(userId);
      const pendingRequests = timeOffRequests.filter(request => 
        request.status === 'pending'
      ).length;

      // Get user's time off balance
      const timeOffBalance = user.timeOffBalance || 0;

      res.json({
        upcomingShifts,
        pendingRequests,
        timeOffBalance,
        totalLocations: 3
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // Time off requests API
  app.get('/api/time-off-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const requests = await storage.getUserTimeOffRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching time off requests:", error);
      res.status(500).json({ error: "Failed to fetch time off requests" });
    }
  });

  // Continue with other API routes...
  // (All other routes would be API-only, no HTML templates)

  const httpServer = createServer(app);

  // WebSocket setup - Use different path to avoid conflict with Vite
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/api/ws'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection on /api/ws');

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('Received message:', data);

        // Broadcast to all connected clients
        wss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(message);
          }
        });
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });
  });

  return httpServer;
}