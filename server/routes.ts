import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupDevAuth, isAuthenticated } from "./devAuth";
import multer from "multer";
import path from "path";
import fs from "fs/promises";

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage_config,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

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



    console.log("Database initialized with comprehensive test data:");
    console.log("- Admin: Ryan Sorensen (ryan@pinehillfarm.co)");
    console.log("- Manager: Sarah Johnson (sarah@pinehillfarm.co)");
    console.log("- Employees: Mike Davis, Jessica Miller, Alex Thompson");
    console.log("- Sample schedules and time-off requests created");
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

  // CRITICAL: Complete Vite bypass for server-side routes
  app.use((req, res, next) => {
    const serverRoutes = ['/admin', '/dashboard', '/schedule', '/time-off', '/announcements', '/api'];
    const isServerRoute = serverRoutes.some(route => req.path.startsWith(route));
    
    if (isServerRoute) {
      res.setHeader('X-Handled-By', 'Express-Server');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Vite-Bypass', 'true');
    }
    next();
  });

  // Time formatting utility functions
  function formatTime12Hour(time24: string): string {
    if (!time24) return '';
    
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  function formatTimeRange(startTime: string, endTime: string): string {
    return `${formatTime12Hour(startTime)} - ${formatTime12Hour(endTime)}`;
  }

  // Auth middleware SECOND
  await setupDevAuth(app);

  // Test route to debug blank page issue
  app.get('/test', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Test Page</title></head>
      <body style="font-family: Arial; padding: 20px; background: #f0f0f0;">
        <h1>Pine Hill Farm Test Page</h1>
        <p>If you can see this, the server is working correctly.</p>
        <a href="/api/login" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Test Login</a>
      </body>
      </html>
    `);
  });

  // Static landing page that bypasses all Vite processing
  app.get('/static', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Pine Hill Farm Employee Portal</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh; color: #1e293b; padding: 2rem;
          }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 3rem; }
          .logo { 
            width: 80px; height: 80px; background: #607e66; border-radius: 20px;
            margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center;
            color: white; font-size: 2rem;
          }
          h1 { font-size: 3rem; font-weight: 700; margin-bottom: 1rem; }
          .subtitle { font-size: 1.5rem; color: #64748b; margin-bottom: 2rem; }
          .description { 
            font-size: 1.125rem; color: #64748b; max-width: 600px;
            margin: 0 auto 2rem; line-height: 1.6;
          }
          .login-btn {
            background: #607e66; color: white; padding: 1rem 2rem;
            border: none; border-radius: 8px; font-size: 1.125rem;
            font-weight: 600; cursor: pointer; text-decoration: none;
            display: inline-block; transition: background 0.2s;
          }
          .login-btn:hover { background: #4f6b56; }
          .features {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem; margin-top: 4rem;
          }
          .feature-card {
            background: white; padding: 2rem; border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); text-align: center;
          }
          .feature-icon {
            width: 48px; height: 48px; border-radius: 8px;
            margin: 0 auto 1rem; display: flex; align-items: center;
            justify-content: center; font-size: 1.5rem;
          }
          .feature-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
          .feature-description { color: #64748b; line-height: 1.6; }
          .footer { text-align: center; margin-top: 4rem; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌲</div>
            <h1>Pine Hill Farm</h1>
            <div class="subtitle">Employee Portal</div>
            <div class="description">
              Welcome to the Pine Hill Farm employee management system. 
              Access your schedule, manage time off, and stay connected with your team.
            </div>
            <a href="/api/login" class="login-btn">Sign In to Continue</a>
          </div>
          
          <div class="features">
            <div class="feature-card">
              <div class="feature-icon" style="background: #dcfce7; color: #16a34a;">⏰</div>
              <div class="feature-title">Time Management</div>
              <div class="feature-description">
                Request time off, view your schedule, and manage shift coverage with ease.
              </div>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon" style="background: #dbeafe; color: #2563eb;">💬</div>
              <div class="feature-title">Communication</div>
              <div class="feature-description">
                Stay updated with company announcements and team communications.
              </div>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon" style="background: #f1f5f9; color: #64748b;">👥</div>
              <div class="feature-title">Team Collaboration</div>
              <div class="feature-description">
                Connect with your colleagues and access training materials.
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Need help? Contact your supervisor or IT support.</p>
            <p style="margin-top: 1rem;"><a href="/">← Try React version</a></p>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Test route for UI debugging
  app.get('/test', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pine Hill Farm Employee Portal</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh;
            color: #1e293b;
          }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          .header { text-align: center; margin-bottom: 3rem; }
          .logo { 
            width: 80px; height: 80px; background: #607e66; border-radius: 20px;
            margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center;
            color: white; font-size: 2rem;
          }
          h1 { font-size: 3rem; font-weight: 700; margin-bottom: 1rem; }
          .subtitle { font-size: 1.5rem; color: #64748b; margin-bottom: 2rem; }
          .description { 
            font-size: 1.125rem; color: #64748b; max-width: 600px;
            margin: 0 auto 2rem; line-height: 1.6;
          }
          .login-btn {
            background: #607e66; color: white; padding: 1rem 2rem;
            border: none; border-radius: 8px; font-size: 1.125rem;
            font-weight: 600; cursor: pointer; text-decoration: none;
            display: inline-block; transition: background 0.2s;
          }
          .login-btn:hover { background: #4f6b56; }
          .features {
            display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem; margin-top: 4rem;
          }
          .feature-card {
            background: white; padding: 2rem; border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); text-align: center;
          }
          .feature-icon {
            width: 48px; height: 48px; border-radius: 8px;
            margin: 0 auto 1rem; display: flex; align-items: center;
            justify-content: center; font-size: 1.5rem;
          }
          .feature-title {
            font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;
          }
          .feature-description { color: #64748b; line-height: 1.6; }
          .footer { text-align: center; margin-top: 4rem; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌲</div>
            <h1>Pine Hill Farm</h1>
            <div class="subtitle">Employee Portal</div>
            <div class="description">
              Welcome to the Pine Hill Farm employee management system. 
              Access your schedule, manage time off, and stay connected with your team.
            </div>
            <a href="/api/login" class="login-btn">Sign In to Continue</a>
          </div>
          
          <div class="features">
            <div class="feature-card">
              <div class="feature-icon" style="background: #dcfce7; color: #16a34a;">⏰</div>
              <div class="feature-title">Time Management</div>
              <div class="feature-description">
                Request time off, view your schedule, and manage shift coverage with ease.
              </div>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon" style="background: #dbeafe; color: #2563eb;">💬</div>
              <div class="feature-title">Communication</div>
              <div class="feature-description">
                Stay updated with company announcements and team communications.
              </div>
            </div>
            
            <div class="feature-card">
              <div class="feature-icon" style="background: #f1f5f9; color: #64748b;">👥</div>
              <div class="feature-title">Team Collaboration</div>
              <div class="feature-description">
                Connect with your colleagues and access training materials.
              </div>
            </div>
          </div>
          
          <div class="footer">
            <p>Need help? Contact your supervisor or IT support.</p>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Working dashboard route that bypasses React issues
  app.get('/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      // Use development user ID if set, otherwise use authenticated user
      const userId = req.session?.devUserId || req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

      res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <title>Pine Hill Farm - Employee Dashboard</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh; color: #1e293b;
          }
          .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
          .logo { display: flex; align-items: center; gap: 1rem; }
          .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
          .nav { display: flex; gap: 1rem; }
          .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
          .nav a:hover { background: #f1f5f9; }
          .nav a.active { background: #607e66; color: white; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          .welcome { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
          .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
          .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .card-icon { width: 48px; height: 48px; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
          .card-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
          .card-desc { color: #64748b; margin-bottom: 1.5rem; }
          .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; }
          .btn:hover { background: #4f6b56; }
          .btn-secondary { background: #e2e8f0; color: #475569; }
          .btn-secondary:hover { background: #cbd5e1; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <div class="logo">
              <div class="logo-icon">🌲</div>
              <div>
                <div style="font-weight: 600;">Pine Hill Farm</div>
                <div style="font-size: 0.875rem; color: #64748b;">Employee Portal</div>
              </div>
            </div>
            <div class="nav">
              <a href="/dashboard" class="active">Dashboard</a>
              <a href="/schedule">Schedule</a>
              <a href="/time-clock">Time Clock</a>
              <a href="/time-off">Time Off</a>
              <a href="/announcements">Announcements</a>
              ${isAdminOrManager ? '<a href="/admin">Admin Portal</a>' : ''}
              <a href="/api/logout">Sign Out</a>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="welcome">
            <h1 style="margin-bottom: 0.5rem;">Welcome to Your Dashboard, ${user.firstName} ${user.lastName}</h1>
            <p style="color: #64748b;">Here's an overview of your work activities and quick access to important features.</p>
            ${isAdminOrManager ? `
              <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-top: 1rem;">
                <strong style="color: #92400e;">Development Testing:</strong>
                <div style="margin-top: 0.5rem;">
                  <a href="/dev/switch-user/manager001" style="background: #f59e0b; color: white; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; margin-right: 0.5rem; font-size: 0.875rem;">Test as Sarah Johnson</a>
                  <a href="/dev/switch-user/employee003" style="background: #3b82f6; color: white; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; margin-right: 0.5rem; font-size: 0.875rem;">Test as Alex Thompson</a>
                  <a href="/dev/switch-user/employee001" style="background: #10b981; color: white; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; margin-right: 0.5rem; font-size: 0.875rem;">Test as Mike Davis</a>
                  <a href="/dev/switch-user/employee002" style="background: #8b5cf6; color: white; padding: 0.5rem 1rem; border-radius: 4px; text-decoration: none; font-size: 0.875rem;">Test as Jessica Miller</a>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="dashboard-grid">
            <div class="card">
              <div class="card-icon" style="background: #dcfce7; color: #16a34a;">📅</div>
              <div class="card-title">My Schedule</div>
              <div class="card-desc">View your upcoming shifts and manage your work schedule</div>
              <a href="/schedule" class="btn">View Schedule</a>
            </div>

            <div class="card">
              <div class="card-icon" style="background: #f0fdf4; color: #16a34a;">🕐</div>
              <div class="card-title">Time Clock</div>
              <div class="card-desc">Clock in/out, manage breaks, and track your work hours</div>
              <a href="/time-clock" class="btn">Open Time Clock</a>
            </div>

            <div class="card">
              <div class="card-icon" style="background: #dbeafe; color: #2563eb;">🏖️</div>
              <div class="card-title">Time Off Requests</div>
              <div class="card-desc">Request vacation days, sick leave, and personal time</div>
              <a href="/time-off" class="btn">Request Time Off</a>
            </div>

            <div class="card">
              <div class="card-icon" style="background: #fef3c7; color: #d97706;">🔄</div>
              <div class="card-title">Shift Coverage</div>
              <div class="card-desc">Find coverage for your shifts or cover for colleagues</div>
              <a href="/shift-coverage" class="btn">Manage Coverage</a>
            </div>

            <div class="card">
              <div class="card-icon" style="background: #ede9fe; color: #7c3aed;">📢</div>
              <div class="card-title">Company Announcements</div>
              <div class="card-desc">Stay updated with the latest company news and updates</div>
              <a href="/announcements" class="btn">View Announcements</a>
            </div>

            <div class="card">
              <div class="card-icon" style="background: #ecfdf5; color: #059669;">💬</div>
              <div class="card-title">Team Communication</div>
              <div class="card-desc">Chat with your team and stay connected</div>
              <a href="/team-chat" class="btn">Open Chat</a>
            </div>

            <div class="card">
              <div class="card-icon" style="background: #f1f5f9; color: #64748b;">📋</div>
              <div class="card-title">Documents & Resources</div>
              <div class="card-desc">Access company documents, policies, and training materials</div>
              <a href="/documents" class="btn">View Documents</a>
            </div>
          </div>

          <div style="margin-top: 3rem; background: white; padding: 2rem; border-radius: 12px;">
            <h3 style="margin-bottom: 1rem;">Store Locations</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
              <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">Lake Geneva Store</div>
                <div style="color: #64748b; font-size: 0.875rem;">704 W Main St, Lake Geneva, WI</div>
              </div>
              <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">Watertown Store</div>
                <div style="color: #64748b; font-size: 0.875rem;">200 W Main Street, Watertown, WI</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
      `);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      res.status(500).send("Error loading dashboard");
    }
  });

  // Development user switcher for testing (no auth required)
  app.get('/dev/switch-user/:testUserId', async (req: any, res) => {
    const testUserId = req.params.testUserId;
    const user = await storage.getUser(testUserId);
    
    if (!user) {
      return res.status(404).send("Test user not found");
    }
    
    // Create a mock session to simulate authentication
    req.session.user = {
      claims: {
        sub: testUserId,
        email: user.email,
        first_name: user.firstName,
        last_name: user.lastName,
        profile_image_url: user.profileImageUrl
      },
      access_token: "dev_token",
      expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };
    
    req.session.devUserId = testUserId;
    res.redirect('/dashboard');
  });

  // Helper function to convert military time to CST display
  function convertToCSTDisplay(timeStr: string): string {
    const [hours, minutes] = timeStr.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minutes} ${ampm}`;
  }

  // Helper function to generate calendar HTML
  function generateCalendarHTML(year: number, month: number, schedules: any[], locations: any[], currentDate: Date): string {
    const firstDay = new Date(year, month, 1);
    const startCalendar = new Date(firstDay);
    startCalendar.setDate(startCalendar.getDate() - firstDay.getDay());
    
    let cells = '';
    let current = new Date(startCalendar);
    
    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const isCurrentMonth = current.getMonth() === month;
      const isToday = current.toDateString() === currentDate.toDateString();
      const daySchedules = schedules.filter(s => s.date === dateStr);
      
      cells += `<div class="calendar-cell${isToday ? ' today' : ''}">`;
      cells += `<div class="date-number" style="${!isCurrentMonth ? 'color: #cbd5e1;' : ''}">${current.getDate()}</div>`;
      
      daySchedules.forEach(schedule => {
        const location = locations.find(loc => loc.id === schedule.locationId);
        const startTime = convertToCSTDisplay(schedule.startTime);
        const endTime = convertToCSTDisplay(schedule.endTime);
        const locationClass = location?.name === 'Lake Geneva Store' ? 'lake-geneva' : 'watertown';
        
        cells += `<div class="shift ${locationClass}">`;
        cells += `${startTime}-${endTime}`;
        cells += `</div>`;
      });
      
      cells += `</div>`;
      current.setDate(current.getDate() + 1);
    }
    
    return cells;
  }

  // Schedule page with month navigation
  app.get('/schedule', isAuthenticated, async (req: any, res) => {
    try {
      // Use development user ID if set, otherwise use authenticated user
      const userId = req.session?.devUserId || req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      // Get current date and month navigation
      const currentDate = new Date();
      const month = req.query.month ? parseInt(req.query.month as string) : currentDate.getMonth();
      const year = req.query.year ? parseInt(req.query.year as string) : currentDate.getFullYear();
      
      // Calculate start and end dates for the month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get real schedules for this user for the current month
      console.log(`Getting schedules for user ${userId} (${user.firstName} ${user.lastName}) from ${startDateStr} to ${endDateStr}`);
      const userSchedules = await storage.getUserWorkSchedules(userId, startDateStr, endDateStr);
      console.log(`Found ${userSchedules.length} schedules for user ${userId}`);
      const locations = await storage.getAllLocations();
      
      // Calculate previous and next month
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Pine Hill Farm - My Schedule</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh; color: #1e293b;
          }
          .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
          .logo { display: flex; align-items: center; gap: 1rem; }
          .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
          .nav { display: flex; gap: 1rem; }
          .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
          .nav a:hover { background: #f1f5f9; }
          .nav a.active { background: #607e66; color: white; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
          .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
          .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e2e8f0; border-radius: 8px; overflow: hidden; }
          .calendar-cell { background: white; padding: 1rem; min-height: 120px; position: relative; }
          .calendar-header { background: #f8fafc; padding: 0.75rem; font-weight: 600; text-align: center; }
          .date-number { font-weight: 600; margin-bottom: 0.5rem; }
          .shift { background: #607e66; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-bottom: 0.25rem; }
          .shift.lake-geneva { background: #2563eb; }
          .shift.watertown { background: #059669; }
          .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; cursor: pointer; }
          .btn:hover { background: #4f6b56; }
          .btn-secondary { background: #e2e8f0; color: #475569; }
          .btn-secondary:hover { background: #cbd5e1; }
          .today { background: #fef3c7; }
          .legend { display: flex; gap: 1rem; }
          .legend-item { display: flex; align-items: center; gap: 0.5rem; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <div class="logo">
              <div class="logo-icon">🌲</div>
              <div>
                <div style="font-weight: 600;">Pine Hill Farm</div>
                <div style="font-size: 0.875rem; color: #64748b;">Employee Portal</div>
              </div>
            </div>
            <div class="nav">
              <a href="/dashboard">Dashboard</a>
              <a href="/schedule" class="active">Schedule</a>
              <a href="/time-off">Time Off</a>
              <a href="/announcements">Announcements</a>
              <a href="/api/logout">Sign Out</a>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="page-header">
            <h1 style="margin-bottom: 0.5rem;">My Work Schedule</h1>
            <p style="color: #64748b;">View your upcoming shifts and manage your work schedule for both store locations.</p>
          </div>

          <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
              <h2>${monthNames[month]} ${year}</h2>
              <div>
                <a href="/schedule?month=${prevMonth}&year=${prevYear}" class="btn-secondary btn">← Previous</a>
                <a href="/schedule?month=${nextMonth}&year=${nextYear}" class="btn-secondary btn">Next →</a>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <div class="legend">
                <div class="legend-item">
                  <div class="legend-color" style="background: #2563eb;"></div>
                  <span>Lake Geneva Store</span>
                </div>
                <div class="legend-item">
                  <div class="legend-color" style="background: #059669;"></div>
                  <span>Watertown Store</span>
                </div>
              </div>
              <div>
                <button onclick="printSchedule('month')" class="btn">Print Month</button>
                <button onclick="printSchedule('week')" class="btn-secondary">Print Week</button>
              </div>
            </div>

            <div class="calendar-grid">
              <div class="calendar-header">Sunday</div>
              <div class="calendar-header">Monday</div>
              <div class="calendar-header">Tuesday</div>
              <div class="calendar-header">Wednesday</div>
              <div class="calendar-header">Thursday</div>
              <div class="calendar-header">Friday</div>
              <div class="calendar-header">Saturday</div>
              ${generateCalendarHTML(year, month, userSchedules, locations, currentDate)}
            </div>
          </div>

          <div class="card">
            <h3 style="margin-bottom: 1rem;">Your Upcoming Shifts</h3>
            ${userSchedules.length > 0 ? userSchedules.map(schedule => {
              const location = locations.find(loc => loc.id === schedule.locationId);
              const scheduleDate = new Date(schedule.date + 'T00:00:00');
              const dayName = scheduleDate.toLocaleDateString('en-US', { weekday: 'long' });
              const dateStr = scheduleDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
              
              // Convert military time to CST format
              const startTime = convertToCSTDisplay(schedule.startTime);
              const endTime = convertToCSTDisplay(schedule.endTime);
              
              return `
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <strong>${dayName}, ${dateStr}</strong><br>
                      <span style="color: #64748b;">Time: ${startTime} - ${endTime}</span><br>
                      <span style="color: #64748b;">Location: ${location ? location.name : 'Unknown Location'}</span>
                    </div>
                    <div style="background: ${location?.name === 'Lake Geneva Store' ? '#2563eb' : '#059669'}; color: white; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.875rem;">
                      ${location ? location.name.replace(' Store', '') : 'Unknown'}
                    </div>
                  </div>
                </div>
              `;
            }).join('') : '<p style="color: #64748b; text-align: center; padding: 2rem;">No shifts scheduled for this month.</p>'}
          </div>
        </div>

        <script>
          function convertToCSTDisplay(timeStr) {
            const [hours, minutes] = timeStr.split(':');
            const hour24 = parseInt(hours);
            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
            const ampm = hour24 >= 12 ? 'PM' : 'AM';
            return hour12 + ':' + minutes + ' ' + ampm;
          }

          function printSchedule(type) {
            const printWindow = window.open('', '_blank');
            const currentMonth = '${monthNames[month]} ${year}';
            
            if (type === 'month') {
              const calendarHTML = document.querySelector('.calendar-grid').innerHTML;
              printWindow.document.write(\`
                <html>
                <head>
                  <title>Work Schedule - \${currentMonth}</title>
                  <style>
                    @media print {
                      body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; }
                      .calendar-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; border: 1px solid #ccc; }
                      .calendar-cell { border: 1px solid #ccc; padding: 8px; min-height: 100px; }
                      .calendar-header { font-weight: bold; text-align: center; padding: 8px; background: #f0f0f0; border: 1px solid #ccc; }
                      .shift { background: #e0e0e0; padding: 2px 4px; margin: 2px 0; font-size: 10px; border-radius: 2px; }
                      .date-number { font-weight: bold; margin-bottom: 4px; }
                      .today { background: #fff3cd; }
                    }
                  </style>
                </head>
                <body>
                  <h1>Pine Hill Farm - Work Schedule</h1>
                  <h2>\${currentMonth}</h2>
                  <div class="calendar-grid">
                    \${calendarHTML}
                  </div>
                </body>
                </html>
              \`);
            } else {
              const shiftsHTML = document.querySelector('.card:last-child').innerHTML;
              printWindow.document.write(\`
                <html>
                <head>
                  <title>Weekly Schedule - \${currentMonth}</title>
                  <style>
                    @media print {
                      body { font-family: Arial, sans-serif; margin: 20px; }
                      .shift-item { border: 1px solid #ccc; padding: 12px; margin: 8px 0; }
                    }
                  </style>
                </head>
                <body>
                  <h1>Pine Hill Farm - Weekly Schedule</h1>
                  <h2>\${currentMonth}</h2>
                  \${shiftsHTML}
                </body>
                </html>
              \`);
            }
            
            printWindow.document.close();
            printWindow.print();
          }
        </script>
      </body>
      </html>
      `);
    } catch (error) {
      console.error("Error loading schedule:", error);
      res.status(500).send("Error loading schedule");
    }
  });



  // Time Clock API routes
  app.post('/api/time-clock/clock-in', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.devUserId || req.user.claims.sub;
      const { locationId } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const deviceInfo = req.headers['user-agent'];

      const timeEntry = await storage.clockIn(userId, locationId, ipAddress, deviceInfo);
      res.json({ success: true, timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post('/api/time-clock/clock-out', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.devUserId || req.user.claims.sub;
      const { notes } = req.body;

      const timeEntry = await storage.clockOut(userId, notes);
      res.json({ success: true, timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post('/api/time-clock/start-break', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.devUserId || req.user.claims.sub;
      const timeEntry = await storage.startBreak(userId);
      res.json({ success: true, timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.post('/api/time-clock/end-break', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.devUserId || req.user.claims.sub;
      const timeEntry = await storage.endBreak(userId);
      res.json({ success: true, timeEntry });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  app.get('/api/time-clock/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.devUserId || req.user.claims.sub;
      const timeEntry = await storage.getCurrentTimeEntry(userId);
      res.json({ timeEntry });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/user-presence/all', isAuthenticated, async (req: any, res) => {
    try {
      const presence = await storage.getAllUserPresence();
      res.json({ presence });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Time Clock Dashboard
  app.get('/time-clock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.devUserId || req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      const locations = await storage.getAllLocations();
      const currentTimeEntry = await storage.getCurrentTimeEntry(userId);
      const today = new Date().toISOString().split('T')[0];
      const todayEntries = await storage.getTimeEntriesByDate(userId, today);
      const allUserPresence = await storage.getAllUserPresence();

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Time Clock</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .logo { display: flex; align-items: center; gap: 1rem; }
            .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .clock-card { text-align: center; padding: 3rem; background: linear-gradient(135deg, #607e66, #4f6b56); color: white; border-radius: 12px; margin-bottom: 2rem; }
            .current-time { font-size: 3rem; font-weight: bold; margin-bottom: 1rem; }
            .status-badge { display: inline-block; padding: 0.5rem 1rem; border-radius: 20px; font-weight: 500; margin: 0.5rem; }
            .status-clocked-in { background: #dcfce7; color: #166534; }
            .status-on-break { background: #fef3c7; color: #92400e; }
            .status-clocked-out { background: #fecaca; color: #991b1b; }
            .btn { background: #607e66; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; font-size: 1.1rem; cursor: pointer; margin: 0.5rem; transition: background 0.2s; }
            .btn:hover { background: #4f6b56; }
            .btn-danger { background: #dc2626; }
            .btn-danger:hover { background: #b91c1c; }
            .btn-warning { background: #d97706; }
            .btn-warning:hover { background: #b45309; }
            .time-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; }
            .presence-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
            .presence-item { padding: 1rem; border-radius: 8px; background: #f8fafc; border-left: 4px solid #e2e8f0; }
            .presence-online { border-left-color: #10b981; }
            .presence-working { border-left-color: #3b82f6; }
            .presence-break { border-left-color: #f59e0b; }
            .presence-offline { border-left-color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div class="logo-icon">🕐</div>
                <div>
                  <div style="font-weight: 600;">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Time Clock</div>
                </div>
              </div>
              <div class="nav">
                <a href="/dashboard">Dashboard</a>
                <a href="/schedule">Schedule</a>
                <a href="/time-clock" class="active">Time Clock</a>
                <a href="/chat">Team Chat</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="clock-card">
              <div class="current-time" id="currentTime"></div>
              <div>
                <span class="status-badge ${currentTimeEntry ? (currentTimeEntry.status === 'clocked_in' ? 'status-clocked-in' : currentTimeEntry.status === 'on_break' ? 'status-on-break' : 'status-clocked-out') : 'status-clocked-out'}">
                  ${currentTimeEntry ? (currentTimeEntry.status === 'clocked_in' ? '🟢 Clocked In' : currentTimeEntry.status === 'on_break' ? '🟡 On Break' : '🔴 Clocked Out') : '🔴 Clocked Out'}
                </span>
              </div>
              ${currentTimeEntry && currentTimeEntry.status === 'clocked_in' ? `
                <p style="margin-top: 1rem;">Working since ${new Date(currentTimeEntry.clockInTime).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour12: true })}</p>
              ` : ''}
            </div>

            <div class="time-grid">
              <div class="card">
                <h3 style="margin-bottom: 1.5rem;">Time Clock Actions</h3>
                
                ${!currentTimeEntry || currentTimeEntry.status === 'clocked_out' ? `
                  <div style="margin-bottom: 1rem;">
                    <label style="display: block; margin-bottom: 0.5rem;">Select Location:</label>
                    <select id="locationSelect" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px;">
                      ${locations.map(loc => `<option value="${loc.id}">${loc.name}</option>`).join('')}
                    </select>
                  </div>
                  <button onclick="clockIn()" class="btn">🕐 Clock In</button>
                ` : ''}
                
                ${currentTimeEntry && currentTimeEntry.status === 'clocked_in' ? `
                  <button onclick="startBreak()" class="btn btn-warning">☕ Start Break</button>
                  <button onclick="clockOut()" class="btn btn-danger">🕐 Clock Out</button>
                ` : ''}
                
                ${currentTimeEntry && currentTimeEntry.status === 'on_break' ? `
                  <button onclick="endBreak()" class="btn btn-warning">🔄 End Break</button>
                  <button onclick="clockOut()" class="btn btn-danger">🕐 Clock Out</button>
                ` : ''}
              </div>

              <div class="card">
                <h3 style="margin-bottom: 1.5rem;">Today's Hours</h3>
                ${todayEntries.length > 0 ? todayEntries.map(entry => `
                  <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 1rem; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <strong>Clock In:</strong> ${new Date(entry.clockInTime).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour12: true })}<br>
                        ${entry.clockOutTime ? `<strong>Clock Out:</strong> ${new Date(entry.clockOutTime).toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour12: true })}<br>` : ''}
                        <strong>Status:</strong> ${entry.status}
                      </div>
                      <div style="text-align: right;">
                        ${entry.totalWorkedMinutes ? `<strong>${Math.floor(entry.totalWorkedMinutes / 60)}h ${entry.totalWorkedMinutes % 60}m</strong>` : 'In Progress'}
                      </div>
                    </div>
                  </div>
                `).join('') : '<p style="color: #64748b; text-align: center;">No time entries for today</p>'}
              </div>
            </div>

            <div class="card">
              <h3 style="margin-bottom: 1.5rem;">Team Status</h3>
              <div class="presence-list">
                ${allUserPresence.map(presence => `
                  <div class="presence-item ${presence.isWorking ? (presence.status === 'on_break' ? 'presence-break' : 'presence-working') : 'presence-offline'}">
                    <div style="font-weight: 600;">${presence.firstName} ${presence.lastName}</div>
                    <div style="font-size: 0.875rem; color: #64748b;">${presence.role}</div>
                    <div style="font-size: 0.875rem; margin-top: 0.5rem;">
                      Status: ${presence.statusMessage || presence.status}
                    </div>
                    ${presence.isWorking ? `<div style="font-size: 0.75rem; color: #10b981;">Currently working</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <script>
            function updateCurrentTime() {
              const now = new Date();
              const options = { 
                timeZone: 'America/Chicago', 
                hour12: true, 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit' 
              };
              document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-US', options);
            }
            
            updateCurrentTime();
            setInterval(updateCurrentTime, 1000);

            async function clockIn() {
              const locationId = document.getElementById('locationSelect').value;
              try {
                const response = await fetch('/api/time-clock/clock-in', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ locationId: parseInt(locationId) })
                });
                const result = await response.json();
                if (result.success) {
                  location.reload();
                } else {
                  alert('Error: ' + result.error);
                }
              } catch (error) {
                alert('Error: ' + error.message);
              }
            }

            async function clockOut() {
              const notes = prompt('Add any notes for your shift (optional):');
              try {
                const response = await fetch('/api/time-clock/clock-out', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notes })
                });
                const result = await response.json();
                if (result.success) {
                  location.reload();
                } else {
                  alert('Error: ' + result.error);
                }
              } catch (error) {
                alert('Error: ' + error.message);
              }
            }

            async function startBreak() {
              try {
                const response = await fetch('/api/time-clock/start-break', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (result.success) {
                  location.reload();
                } else {
                  alert('Error: ' + result.error);
                }
              } catch (error) {
                alert('Error: ' + error.message);
              }
            }

            async function endBreak() {
              try {
                const response = await fetch('/api/time-clock/end-break', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                const result = await response.json();
                if (result.success) {
                  location.reload();
                } else {
                  alert('Error: ' + result.error);
                }
              } catch (error) {
                alert('Error: ' + error.message);
              }
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading time clock:", error);
      res.status(500).send("Error loading time clock");
    }
  });

  // Enhanced Team Chat route with presence integration
  app.get('/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      const channels = await storage.getAllChannels();
      const employees = await storage.getAllUsers();
      const allUserPresence = await storage.getAllUserPresence();
      
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Team Chat</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; min-height: 100vh; }
            .chat-container { display: flex; height: 100vh; }
            .sidebar { width: 300px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; }
            .main-chat { flex: 1; display: flex; flex-direction: column; }
            .header { padding: 1rem; border-bottom: 1px solid #e2e8f0; background: #607e66; color: white; }
            .channel-list { flex: 1; padding: 1rem; overflow-y: auto; }
            .channel-item { padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 8px; cursor: pointer; transition: background 0.2s; }
            .channel-item:hover { background: #f1f5f9; }
            .channel-item.active { background: #dbeafe; color: #1e40af; }
            .chat-messages { flex: 1; padding: 1rem; overflow-y: auto; background: #f8fafc; }
            .chat-input { padding: 1rem; border-top: 1px solid #e2e8f0; background: white; }
            .input-group { display: flex; gap: 0.5rem; }
            .message-input { flex: 1; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
            .send-btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; cursor: pointer; }
            .message { margin-bottom: 1rem; padding: 0.75rem; background: white; border-radius: 8px; }
            .message-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.875rem; }
            .message-author { font-weight: 600; color: #374151; }
            .message-time { color: #9ca3af; }
            .online-status { width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; margin-left: 0.5rem; }
          </style>
        </head>
        <body>
          <div class="chat-container">
            <div class="sidebar">
              <div class="header">
                <h2>Team Chat</h2>
                <p style="font-size: 0.875rem; opacity: 0.9;">Select a channel or employee</p>
              </div>
              
              <div class="channel-list">
                <h3 style="margin-bottom: 1rem; color: #374151;">Channels</h3>
                ${channels.map(channel => `
                  <div class="channel-item" onclick="selectChannel('${channel.id}', '${channel.name}')">
                    <div style="font-weight: 500;"># ${channel.name}</div>
                    <div style="font-size: 0.875rem; color: #6b7280;">${channel.description || 'No description'}</div>
                  </div>
                `).join('')}
                
                <h3 style="margin: 2rem 0 1rem 0; color: #374151;">Team Status</h3>
                ${allUserPresence.map(presence => `
                  <div class="channel-item" onclick="selectDirectMessage('${presence.userId}', '${presence.firstName} ${presence.lastName}')">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <div>
                        <div style="font-weight: 500;">${presence.firstName} ${presence.lastName}</div>
                        <div style="font-size: 0.75rem; color: #6b7280;">${presence.role || 'Employee'}</div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${presence.isWorking 
                          ? `<span style="background: ${presence.status === 'on_break' ? '#f59e0b' : '#10b981'}; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem;">
                              ${presence.status === 'on_break' ? '☕ Break' : '🕐 Working'}
                            </span>`
                          : `<span style="background: #6b7280; color: white; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem;">
                              📴 Offline
                            </span>`
                        }
                      </div>
                    </div>
                    ${presence.statusMessage ? `<div style="font-size: 0.75rem; color: #9ca3af; margin-top: 0.25rem;">${presence.statusMessage}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
            
            <div class="main-chat">
              <div class="header">
                <h3 id="chat-title">Select a channel or employee to start chatting</h3>
              </div>
              
              <div class="chat-messages" id="messages">
                <div style="text-align: center; color: #6b7280; padding: 2rem;">
                  <p>Choose a channel or start a direct message to begin the conversation</p>
                </div>
              </div>
              
              <div class="chat-input">
                <div class="input-group">
                  <input type="text" class="message-input" placeholder="Type your message..." id="messageInput" disabled>
                  <button class="send-btn" onclick="sendMessage()" disabled id="sendBtn">Send</button>
                </div>
              </div>
            </div>
          </div>
          
          <script>
            let currentChatType = null;
            let currentChatId = null;
            
            function selectChannel(channelId, channelName) {
              currentChatType = 'channel';
              currentChatId = channelId;
              document.getElementById('chat-title').textContent = '# ' + channelName;
              document.getElementById('messageInput').disabled = false;
              document.getElementById('sendBtn').disabled = false;
              loadMessages();
            }
            
            function selectDirectMessage(userId, userName) {
              currentChatType = 'direct';
              currentChatId = userId;
              document.getElementById('chat-title').textContent = userName;
              document.getElementById('messageInput').disabled = false;
              document.getElementById('sendBtn').disabled = false;
              loadMessages();
            }
            
            function loadMessages() {
              // Load messages for current chat
              document.getElementById('messages').innerHTML = '<div style="padding: 1rem; color: #6b7280;">Loading messages...</div>';
            }
            
            function sendMessage() {
              const input = document.getElementById('messageInput');
              const message = input.value.trim();
              if (!message) return;
              
              // Send message via API
              input.value = '';
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading chat:", error);
      res.status(500).send("Error loading chat");
    }
  });

  // Enhanced Announcements route with read/unread status
  app.get('/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      const announcements = await storage.getPublishedAnnouncements();
      const readAnnouncements = await storage.getUserReadAnnouncements(userId);
      const readIds = new Set(readAnnouncements.map(r => r.announcementId));
      
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Announcements</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; min-height: 100vh; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
            .announcement { background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border-left: 4px solid #e2e8f0; }
            .announcement.unread { border-left-color: #3b82f6; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); }
            .announcement-header { display: flex; justify-content: between; align-items: start; margin-bottom: 1rem; }
            .announcement-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
            .announcement-meta { display: flex; gap: 1rem; align-items: center; color: #6b7280; font-size: 0.875rem; }
            .status-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
            .status-new { background: #dbeafe; color: #1e40af; }
            .status-read { background: #f3f4f6; color: #6b7280; }
            .announcement-content { color: #374151; line-height: 1.6; }
            .mark-read-btn { background: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; }
            .nav a.active { background: #607e66; color: white; }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="max-width: 800px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center;">
              <h1>Company Announcements</h1>
              <div class="nav">
                <a href="/dashboard">Dashboard</a>
                <a href="/schedule">Schedule</a>
                <a href="/chat">Chat</a>
                <a href="/announcements" class="active">Announcements</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>
          
          <div class="container">
            ${announcements.length === 0 ? `
              <div style="text-align: center; padding: 3rem; color: #6b7280;">
                <h3>No announcements</h3>
                <p>There are no company announcements at this time.</p>
              </div>
            ` : announcements.map(announcement => {
              const isRead = readIds.has(announcement.id);
              return `
                <div class="announcement ${!isRead ? 'unread' : ''}" id="announcement-${announcement.id}">
                  <div class="announcement-header">
                    <div style="flex: 1;">
                      <h2 class="announcement-title">${announcement.title}</h2>
                      <div class="announcement-meta">
                        <span>Posted ${new Date(announcement.publishedAt || announcement.createdAt).toLocaleDateString()}</span>
                        <span class="status-badge ${!isRead ? 'status-new' : 'status-read'}">
                          ${!isRead ? 'NEW' : 'READ'}
                        </span>
                        ${announcement.priority === 'high' ? '<span style="color: #ef4444; font-weight: 600;">HIGH PRIORITY</span>' : ''}
                      </div>
                    </div>
                    ${!isRead ? `
                      <button class="mark-read-btn" onclick="markAsRead(${announcement.id})">
                        Mark as Read
                      </button>
                    ` : ''}
                  </div>
                  <div class="announcement-content">
                    ${announcement.content.replace(/\n/g, '<br>')}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
          
          <script>
            function markAsRead(announcementId) {
              fetch('/api/announcements/' + announcementId + '/read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              })
              .then(response => response.json())
              .then(data => {
                if (data.success) {
                  const announcement = document.getElementById('announcement-' + announcementId);
                  announcement.classList.remove('unread');
                  announcement.querySelector('.status-badge').textContent = 'READ';
                  announcement.querySelector('.status-badge').className = 'status-badge status-read';
                  const button = announcement.querySelector('.mark-read-btn');
                  if (button) button.style.display = 'none';
                }
              });
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading announcements:", error);
      res.status(500).send("Error loading announcements");
    }
  });

  // Time Off page
  app.get('/time-off', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Pine Hill Farm - Time Off Requests</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh; color: #1e293b;
          }
          .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
          .logo { display: flex; align-items: center; gap: 1rem; }
          .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
          .nav { display: flex; gap: 1rem; }
          .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
          .nav a:hover { background: #f1f5f9; }
          .nav a.active { background: #607e66; color: white; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
          .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
          .form-group { margin-bottom: 1.5rem; }
          .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
          .form-input { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; }
          .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; }
          .form-textarea { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; min-height: 100px; resize: vertical; }
          .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; cursor: pointer; }
          .btn:hover { background: #4f6b56; }
          .btn-secondary { background: #e2e8f0; color: #475569; }
          .btn-secondary:hover { background: #cbd5e1; }
          .status-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; font-weight: 500; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-approved { background: #d1fae5; color: #065f46; }
          .status-denied { background: #fee2e2; color: #991b1b; }
          .request-item { padding: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <div class="logo">
              <div class="logo-icon">🌲</div>
              <div>
                <div style="font-weight: 600;">Pine Hill Farm</div>
                <div style="font-size: 0.875rem; color: #64748b;">Employee Portal</div>
              </div>
            </div>
            <div class="nav">
              <a href="/dashboard">Dashboard</a>
              <a href="/schedule">Schedule</a>
              <a href="/time-off" class="active">Time Off</a>
              <a href="/announcements">Announcements</a>
              <a href="/api/logout">Sign Out</a>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="page-header">
            <h1 style="margin-bottom: 0.5rem;">Time Off Requests</h1>
            <p style="color: #64748b;">Request vacation days, sick leave, and personal time. All requests require manager approval.</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">Submit New Request</h2>
              <form>
                <div class="form-group">
                  <label class="form-label">Request Type</label>
                  <select class="form-select">
                    <option>Vacation</option>
                    <option>Sick Leave</option>
                    <option>Personal Day</option>
                    <option>Emergency Leave</option>
                  </select>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label">Start Date</label>
                    <input type="date" class="form-input" value="2024-12-10">
                  </div>
                  <div class="form-group">
                    <label class="form-label">End Date</label>
                    <input type="date" class="form-input" value="2024-12-12">
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Reason (Optional)</label>
                  <textarea class="form-textarea" placeholder="Provide additional details about your time off request..."></textarea>
                </div>

                <div style="display: flex; gap: 1rem;">
                  <button type="submit" class="btn">Submit Request</button>
                  <button type="button" class="btn-secondary btn">Clear Form</button>
                </div>
              </form>
            </div>

            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">Available Balance</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                <div style="text-align: center; padding: 1rem; background: #f8fafc; border-radius: 8px;">
                  <div style="font-size: 2rem; font-weight: 700; color: #607e66;">15</div>
                  <div style="color: #64748b;">Vacation Days</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: #f8fafc; border-radius: 8px;">
                  <div style="font-size: 2rem; font-weight: 700; color: #607e66;">8</div>
                  <div style="color: #64748b;">Sick Days</div>
                </div>
              </div>
              
              <h3 style="margin-bottom: 1rem;">Upcoming Time Off</h3>
              <div style="color: #64748b;">
                <div style="padding: 0.75rem; background: #f8fafc; border-radius: 6px;">
                  <strong>Dec 23-26, 2024</strong><br>
                  Christmas Vacation (4 days)
                </div>
              </div>
            </div>
          </div>

          <div class="card">
            <h2 style="margin-bottom: 1.5rem;">Request History</h2>
            
            <div class="request-item">
              <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-weight: 600;">December 23-26, 2024</div>
                <span class="status-badge status-approved">Approved</span>
              </div>
              <div style="color: #64748b; margin-bottom: 0.5rem;">Vacation - Christmas Holiday</div>
              <div style="font-size: 0.875rem; color: #6b7280;">Submitted: Nov 15, 2024 • Approved by: Sarah Johnson</div>
            </div>

            <div class="request-item">
              <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-weight: 600;">November 8, 2024</div>
                <span class="status-badge status-approved">Approved</span>
              </div>
              <div style="color: #64748b; margin-bottom: 0.5rem;">Sick Leave - Doctor's appointment</div>
              <div style="font-size: 0.875rem; color: #6b7280;">Submitted: Nov 7, 2024 • Approved by: Sarah Johnson</div>
            </div>

            <div class="request-item">
              <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 0.5rem;">
                <div style="font-weight: 600;">October 15-16, 2024</div>
                <span class="status-badge status-pending">Pending</span>
              </div>
              <div style="color: #64748b; margin-bottom: 0.5rem;">Personal Days - Family event</div>
              <div style="font-size: 0.875rem; color: #6b7280;">Submitted: Oct 10, 2024 • Awaiting approval</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Announcements page
  app.get('/announcements', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Pine Hill Farm - Company Announcements</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh; color: #1e293b;
          }
          .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
          .logo { display: flex; align-items: center; gap: 1rem; }
          .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
          .nav { display: flex; gap: 1rem; }
          .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
          .nav a:hover { background: #f1f5f9; }
          .nav a.active { background: #607e66; color: white; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
          .announcement { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
          .announcement-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
          .announcement-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
          .announcement-meta { color: #64748b; font-size: 0.875rem; }
          .announcement-content { color: #374151; line-height: 1.6; margin-bottom: 1rem; }
          .priority-high { border-left: 4px solid #ef4444; }
          .priority-medium { border-left: 4px solid #f59e0b; }
          .priority-low { border-left: 4px solid #10b981; }
          .priority-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
          .badge-high { background: #fee2e2; color: #991b1b; }
          .badge-medium { background: #fef3c7; color: #92400e; }
          .badge-low { background: #d1fae5; color: #065f46; }
          .filter-tabs { display: flex; gap: 1rem; margin-bottom: 2rem; }
          .filter-tab { padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #64748b; text-decoration: none; transition: all 0.2s; }
          .filter-tab.active { background: #607e66; color: white; border-color: #607e66; }
          .filter-tab:hover { background: #f9fafb; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <div class="logo">
              <div class="logo-icon">🌲</div>
              <div>
                <div style="font-weight: 600;">Pine Hill Farm</div>
                <div style="font-size: 0.875rem; color: #64748b;">Employee Portal</div>
              </div>
            </div>
            <div class="nav">
              <a href="/dashboard">Dashboard</a>
              <a href="/schedule">Schedule</a>
              <a href="/time-off">Time Off</a>
              <a href="/announcements" class="active">Announcements</a>
              <a href="/api/logout">Sign Out</a>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="page-header">
            <h1 style="margin-bottom: 0.5rem;">Company Announcements</h1>
            <p style="color: #64748b;">Stay updated with the latest company news, policy changes, and important updates.</p>
          </div>

          <div class="filter-tabs">
            <a href="#" class="filter-tab active">All Announcements</a>
            <a href="#" class="filter-tab">Important</a>
            <a href="#" class="filter-tab">General</a>
            <a href="#" class="filter-tab">Policy Updates</a>
          </div>

          <div class="announcement priority-high">
            <div class="announcement-header">
              <div>
                <div class="announcement-title">Holiday Schedule Changes - December 2024</div>
                <div class="announcement-meta">Posted by Management • December 1, 2024</div>
              </div>
              <span class="priority-badge badge-high">Important</span>
            </div>
            <div class="announcement-content">
              Please note the following schedule changes for the holiday season:
              <br><br>
              <strong>Store Hours:</strong><br>
              • December 24th: Both stores close at 3:00 PM<br>
              • December 25th: Both stores CLOSED<br>
              • December 31st: Both stores close at 6:00 PM<br>
              • January 1st: Both stores CLOSED<br>
              <br>
              All employees scheduled for these dates will receive holiday pay. Please coordinate with your managers for any scheduling conflicts.
            </div>
          </div>

          <div class="announcement priority-medium">
            <div class="announcement-header">
              <div>
                <div class="announcement-title">New Employee Training Program Launch</div>
                <div class="announcement-meta">Posted by HR Department • November 28, 2024</div>
              </div>
              <span class="priority-badge badge-medium">General</span>
            </div>
            <div class="announcement-content">
              We're excited to announce the launch of our new comprehensive employee training program. This program includes:
              <br><br>
              • Customer service excellence modules<br>
              • Product knowledge certification<br>
              • Safety and compliance training<br>
              • Leadership development tracks<br>
              <br>
              Training sessions will begin in January 2025. More details will be shared soon.
            </div>
          </div>

          <div class="announcement priority-low">
            <div class="announcement-header">
              <div>
                <div class="announcement-title">Employee Recognition - November Winners</div>
                <div class="announcement-meta">Posted by Management • November 25, 2024</div>
              </div>
              <span class="priority-badge badge-low">Recognition</span>
            </div>
            <div class="announcement-content">
              Congratulations to our November Employee of the Month winners:
              <br><br>
              <strong>Lake Geneva Store:</strong> Sarah Mitchell - Outstanding customer service and team leadership<br>
              <strong>Watertown Store:</strong> David Chen - Exceptional dedication and problem-solving skills<br>
              <br>
              Both employees will receive a $100 gift card and premium parking spot for December.
            </div>
          </div>

          <div class="announcement priority-medium">
            <div class="announcement-header">
              <div>
                <div class="announcement-title">Updated Break Room Policies</div>
                <div class="announcement-meta">Posted by Operations • November 20, 2024</div>
              </div>
              <span class="priority-badge badge-medium">Policy</span>
            </div>
            <div class="announcement-content">
              Effective December 1st, the following break room policies will be implemented:
              <br><br>
              • Clean up after yourself - dishes must be washed immediately after use<br>
              • Label all personal food items with your name and date<br>
              • Refrigerator cleanout will occur every Friday at 6 PM<br>
              • Microwave usage limited to 3 minutes per person during peak hours<br>
              <br>
              Thank you for helping us maintain a clean and pleasant break room environment.
            </div>
          </div>

          <div class="announcement priority-low">
            <div class="announcement-header">
              <div>
                <div class="announcement-title">Winter Weather Policy Reminder</div>
                <div class="announcement-meta">Posted by Operations • November 15, 2024</div>
              </div>
              <span class="priority-badge badge-low">Reminder</span>
            </div>
            <div class="announcement-content">
              As winter approaches, please remember our inclement weather policy:
              <br><br>
              • Check your email and text messages for store closure notifications<br>
              • If you cannot safely travel to work, contact your manager immediately<br>
              • Parking lots will be salted and plowed, but exercise caution<br>
              • Keep emergency contact information updated in your employee file<br>
              <br>
              Your safety is our top priority. When in doubt, stay home and contact your supervisor.
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Admin/Manager Dashboard
  app.get('/admin', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html><head><title>Access Denied</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Access Denied</h1>
            <p>You don't have permission to access this page.</p>
            <a href="/dashboard">Return to Dashboard</a>
          </body></html>
        `);
      }

      const allUsers = await storage.getAllUsers();
      const pendingTimeOffRequests = await storage.getPendingTimeOffRequests();
      const todaySchedules = await storage.getWorkSchedulesByDate(new Date().toISOString().split('T')[0]);
      const locations = await storage.getAllLocations();
      
      // Group schedules by location
      const lakeGenevaSchedules = todaySchedules.filter(s => s.locationId === 1);
      const watertownSchedules = todaySchedules.filter(s => s.locationId === 2);

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Admin Dashboard</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .logo { display: flex; align-items: center; gap: 1rem; }
            .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
            .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
            .stat-card { background: white; padding: 1.5rem; border-radius: 8px; text-align: center; border-left: 4px solid #607e66; }
            .stat-number { font-size: 2rem; font-weight: 700; color: #607e66; }
            .stat-label { color: #64748b; font-size: 0.875rem; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; }
            .btn:hover { background: #4f6b56; }
            .btn-secondary { background: #e2e8f0; color: #475569; }
            .btn-secondary:hover { background: #cbd5e1; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .table th { background: #f8fafc; font-weight: 600; }
            .role-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
            .role-admin { background: #fee2e2; color: #991b1b; }
            .role-manager { background: #fef3c7; color: #92400e; }
            .role-employee { background: #d1fae5; color: #065f46; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-approved { background: #d1fae5; color: #065f46; }
            .status-denied { background: #fee2e2; color: #991b1b; }
            .tabs { display: flex; gap: 1rem; margin-bottom: 2rem; }
            .tab { padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #64748b; text-decoration: none; transition: all 0.2s; }
            .tab.active { background: #607e66; color: white; border-color: #607e66; }
            .tab:hover { background: #f9fafb; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div class="logo-icon">🌲</div>
                <div>
                  <div style="font-weight: 600;">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Admin Portal</div>
                </div>
              </div>
              <div class="nav">
                <a href="/admin" class="active">Admin Dashboard</a>
                <a href="/admin/employees">Employee Management</a>
                <a href="/admin/schedule">Schedule Management</a>
                <a href="/dashboard">Employee View</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Admin Dashboard</h1>
              <p style="color: #64748b;">Welcome, ${user.firstName} ${user.lastName} (${user.role}). Manage employees, schedules, and company operations.</p>
            </div>

            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-number">${allUsers.length}</div>
                <div class="stat-label">Total Employees</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${pendingTimeOffRequests.length}</div>
                <div class="stat-label">Pending Requests</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">${todaySchedules.length}</div>
                <div class="stat-label">Scheduled Today</div>
              </div>
              <div class="stat-card">
                <div class="stat-number">2</div>
                <div class="stat-label">Store Locations</div>
              </div>
            </div>

            <!-- Today's Schedule Overview - Moved to Top -->
            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">📅 Today's Schedule Overview</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <!-- Lake Geneva Store -->
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #3b82f6;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-weight: 600;">
                    <span style="color: #3b82f6;">🏪</span>
                    Lake Geneva Store
                    <span style="background: #dbeafe; color: #1e40af; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem;">${lakeGenevaSchedules.length} scheduled</span>
                  </div>
                  ${lakeGenevaSchedules.length === 0 ? 
                    '<p style="color: #64748b; font-style: italic;">No schedules for today</p>' :
                    lakeGenevaSchedules.map(schedule => {
                      const employee = allUsers.find(u => u.id === schedule.userId);
                      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
                      return `
                        <div style="padding: 0.75rem; margin-bottom: 0.5rem; background: #f8fafc; border-radius: 6px; border-left: 3px solid #3b82f6;">
                          <div style="font-weight: 500;">${employeeName}</div>
                          <div style="font-size: 0.875rem; color: #64748b;">${formatTimeRange(schedule.startTime, schedule.endTime)}</div>
                          <div style="font-size: 0.75rem; color: #6b7280;">${schedule.position || 'Staff'}</div>
                        </div>
                      `;
                    }).join('')
                  }
                </div>

                <!-- Watertown Store -->
                <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; border-left: 4px solid #10b981;">
                  <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-weight: 600;">
                    <span style="color: #10b981;">🏪</span>
                    Watertown Store
                    <span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.75rem;">${watertownSchedules.length} scheduled</span>
                  </div>
                  ${watertownSchedules.length === 0 ? 
                    '<p style="color: #64748b; font-style: italic;">No schedules for today</p>' :
                    watertownSchedules.map(schedule => {
                      const employee = allUsers.find(u => u.id === schedule.userId);
                      const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown Employee';
                      return `
                        <div style="padding: 0.75rem; margin-bottom: 0.5rem; background: #f8fafc; border-radius: 6px; border-left: 3px solid #10b981;">
                          <div style="font-weight: 500;">${employeeName}</div>
                          <div style="font-size: 0.875rem; color: #64748b;">${formatTimeRange(schedule.startTime, schedule.endTime)}</div>
                          <div style="font-size: 0.75rem; color: #6b7280;">${schedule.position || 'Staff'}</div>
                        </div>
                      `;
                    }).join('')
                  }
                </div>
              </div>
              <div style="margin-top: 1rem; text-align: center;">
                <a href="/admin/schedule" class="btn">Manage Full Schedule</a>
              </div>
            </div>

            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">⏰ Pending Time Off Requests</h2>
              ${pendingTimeOffRequests.length === 0 ? 
                '<p style="color: #64748b; text-align: center; padding: 2rem;">No pending requests</p>' :
                `<table class="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Request Type</th>
                      <th>Dates</th>
                      <th>Submitted</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${pendingTimeOffRequests.map(request => `
                      <tr>
                        <td>${request.userId}</td>
                        <td>${request.reason || 'Personal'}</td>
                        <td>${request.startDate} to ${request.endDate}</td>
                        <td>${request.requestedAt ? new Date(request.requestedAt).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <a href="/admin/approve-request/${request.id}" class="btn" style="margin-right: 0.5rem; padding: 0.5rem 1rem; font-size: 0.875rem;">Approve</a>
                          <a href="/admin/deny-request/${request.id}" class="btn-secondary btn" style="padding: 0.5rem 1rem; font-size: 0.875rem;">Deny</a>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>`
              }
            </div>

            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; cursor: pointer;" onclick="toggleEmployeeOverview()">
                <h2 style="margin: 0;">👥 Employee Overview</h2>
                <span id="employeeToggleArrow" style="transition: transform 0.3s ease; font-size: 1.2rem;">▶</span>
              </div>
              <div id="employeeOverviewContent" style="overflow: hidden; max-height: 0; transition: max-height 0.3s ease;">
                <div style="margin-bottom: 1rem;">
                  <a href="/admin/employees/new" class="btn">Add New Employee</a>
                  <a href="/admin/employees" class="btn-secondary btn">Manage All Employees</a>
                </div>
                <table class="table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Hire Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${allUsers.map(employee => `
                    <tr>
                      <td>${employee.employeeId || 'N/A'}</td>
                      <td>${employee.firstName} ${employee.lastName}</td>
                      <td><span class="role-badge role-${employee.role}">${employee.role}</span></td>
                      <td>${employee.department || 'N/A'}</td>
                      <td>${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}</td>
                      <td><span class="status-${employee.isActive ? 'approved' : 'denied'}">${employee.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <a href="/admin/employees/${employee.id}" style="color: #607e66; text-decoration: none; font-size: 0.875rem;">Edit</a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
                </table>
              </div>
            </div>

          </div>
          
          <script>
            function toggleEmployeeOverview() {
              const content = document.getElementById('employeeOverviewContent');
              const arrow = document.getElementById('employeeToggleArrow');
              
              if (content.style.maxHeight === '0px' || content.style.maxHeight === '') {
                content.style.maxHeight = '2000px';
                arrow.style.transform = 'rotate(90deg)';
                arrow.innerHTML = '▼';
              } else {
                content.style.maxHeight = '0px';
                arrow.style.transform = 'rotate(0deg)';
                arrow.innerHTML = '▶';
              }
            }

            function filterSchedules() {
              const employeeFilter = document.getElementById('employeeFilter').value.toLowerCase();
              const locationFilter = document.getElementById('locationFilter').value;
              const dateFilter = document.getElementById('dateFilter').value;
              const table = document.getElementById('schedulesTable');
              
              if (!table) return;
              
              const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
              let visibleCount = 0;
              
              for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.getElementsByTagName('td');
                
                if (cells.length >= 4) {
                  const employeeName = cells[0].textContent.toLowerCase();
                  const scheduleDate = cells[1].textContent;
                  const location = cells[3].textContent;
                  
                  let showRow = true;
                  
                  // Filter by employee name
                  if (employeeFilter && !employeeName.includes(employeeFilter)) {
                    showRow = false;
                  }
                  
                  // Filter by location
                  if (locationFilter && location !== locationFilter) {
                    showRow = false;
                  }
                  
                  // Filter by date
                  if (dateFilter && scheduleDate !== dateFilter) {
                    showRow = false;
                  }
                  
                  if (showRow) {
                    row.style.display = '';
                    visibleCount++;
                  } else {
                    row.style.display = 'none';
                  }
                }
              }
              
              // Show/hide no results message
              let noResultsMsg = document.getElementById('noResultsMessage');
              if (visibleCount === 0 && (employeeFilter || locationFilter || dateFilter)) {
                if (!noResultsMsg) {
                  noResultsMsg = document.createElement('tr');
                  noResultsMsg.id = 'noResultsMessage';
                  noResultsMsg.innerHTML = '<td colspan="6" style="padding: 2rem; text-align: center; color: #64748b; font-style: italic;">No schedules match your filters. Try adjusting your search criteria.</td>';
                  table.getElementsByTagName('tbody')[0].appendChild(noResultsMsg);
                }
                noResultsMsg.style.display = '';
              } else if (noResultsMsg) {
                noResultsMsg.style.display = 'none';
              }
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      res.status(500).send("Error loading admin dashboard");
    }
  });

  // Employee Management Page
  app.get('/admin/employees', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const allUsers = await storage.getAllUsers();

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Employee Management</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .logo { display: flex; align-items: center; gap: 1rem; }
            .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
            .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; }
            .btn:hover { background: #4f6b56; }
            .btn-secondary { background: #e2e8f0; color: #475569; }
            .btn-secondary:hover { background: #cbd5e1; }
            .btn-danger { background: #ef4444; color: white; }
            .btn-danger:hover { background: #dc2626; }
            .table { width: 100%; border-collapse: collapse; }
            .table th, .table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .table th { background: #f8fafc; font-weight: 600; }
            .role-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
            .role-admin { background: #fee2e2; color: #991b1b; }
            .role-manager { background: #fef3c7; color: #92400e; }
            .role-employee { background: #d1fae5; color: #065f46; }
            .status-active { background: #d1fae5; color: #065f46; }
            .status-inactive { background: #fee2e2; color: #991b1b; }
            .search-box { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 1rem; }
            .filters { display: flex; gap: 1rem; margin-bottom: 1rem; align-items: center; }
            .filter-select { padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div class="logo-icon">🌲</div>
                <div>
                  <div style="font-weight: 600;">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Employee Management</div>
                </div>
              </div>
              <div class="nav">
                <a href="/admin">Admin Dashboard</a>
                <a href="/admin/employees" class="active">Employee Management</a>
                <a href="/admin/schedule">Schedule Management</a>
                <a href="/dashboard">Employee View</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Employee Management</h1>
              <p style="color: #64748b;">Manage employee profiles, roles, and permissions across both store locations.</p>
            </div>

            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2>All Employees (${allUsers.length})</h2>
                <a href="/admin/employees/new" class="btn">Add New Employee</a>
              </div>

              <div class="filters">
                <input type="text" placeholder="Search employees..." class="search-box" style="flex: 1; margin-bottom: 0;">
                <select class="filter-select">
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="employee">Employee</option>
                </select>
                <select class="filter-select">
                  <option value="">All Departments</option>
                  <option value="sales">Sales</option>
                  <option value="management">Management</option>
                  <option value="operations">Operations</option>
                </select>
                <select class="filter-select">
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <table class="table">
                <thead>
                  <tr>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Department</th>
                    <th>Hire Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${allUsers.map(employee => `
                    <tr>
                      <td>${employee.employeeId || 'N/A'}</td>
                      <td>
                        <div style="font-weight: 500;">${employee.firstName} ${employee.lastName}</div>
                        <div style="font-size: 0.875rem; color: #64748b;">${employee.position || 'No position'}</div>
                      </td>
                      <td>${employee.email || 'N/A'}</td>
                      <td><span class="role-badge role-${employee.role}">${employee.role}</span></td>
                      <td>${employee.department || 'N/A'}</td>
                      <td>${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}</td>
                      <td><span class="status-${employee.isActive ? 'active' : 'inactive'}">${employee.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <a href="/admin/employees/${employee.id}/edit" style="color: #607e66; text-decoration: none; margin-right: 1rem;">Edit</a>
                        <a href="/admin/employees/${employee.id}/schedule" style="color: #059669; text-decoration: none; margin-right: 1rem;">Schedule</a>
                        ${employee.isActive ? 
                          `<a href="/admin/employees/${employee.id}/deactivate" style="color: #ef4444; text-decoration: none;">Deactivate</a>` :
                          `<a href="/admin/employees/${employee.id}/activate" style="color: #10b981; text-decoration: none;">Activate</a>`
                        }
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading employee management:", error);
      res.status(500).send("Error loading employee management");
    }
  });

  // Time off request approval routes
  app.get('/admin/approve-request/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const requestId = parseInt(req.params.id);
      await storage.updateTimeOffRequestStatus(requestId, 'approved', userId, 'Approved by admin');
      
      res.redirect('/admin?approved=true');
    } catch (error) {
      console.error("Error approving request:", error);
      res.redirect('/admin?error=approval_failed');
    }
  });

  app.get('/admin/deny-request/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const requestId = parseInt(req.params.id);
      await storage.updateTimeOffRequestStatus(requestId, 'denied', userId, 'Denied by admin');
      
      res.redirect('/admin?denied=true');
    } catch (error) {
      console.error("Error denying request:", error);
      res.redirect('/admin?error=denial_failed');
    }
  });

  // Employee edit route
  app.get('/admin/employees/:id/edit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const employeeId = req.params.id;
      const employee = await storage.getUser(employeeId);
      
      if (!employee) {
        return res.status(404).send("Employee not found");
      }

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Edit Employee</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .logo { display: flex; align-items: center; gap: 1rem; }
            .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .form-group { margin-bottom: 1.5rem; }
            .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
            .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
            .form-input, .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; cursor: pointer; font-weight: 500; transition: background 0.2s; margin-right: 1rem; }
            .btn:hover { background: #4f6b56; }
            .btn-secondary { background: #e2e8f0; color: #475569; text-decoration: none; }
            .btn-secondary:hover { background: #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div class="logo-icon">🌲</div>
                <div>
                  <div style="font-weight: 600;">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Edit Employee</div>
                </div>
              </div>
              <div class="nav">
                <a href="/admin">Admin Dashboard</a>
                <a href="/admin/employees" class="active">Employee Management</a>
                <a href="/admin/schedule">Schedule Management</a>
                <a href="/dashboard">Employee View</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="card">
              <h1 style="margin-bottom: 0.5rem;">Edit Employee: ${employee.firstName} ${employee.lastName}</h1>
              <p style="color: #64748b; margin-bottom: 2rem;">Update employee information and role assignments.</p>
              
              <form action="/api/employees/${employee.id}" method="POST">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">First Name</label>
                    <input type="text" name="firstName" class="form-input" value="${employee.firstName || ''}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Last Name</label>
                    <input type="text" name="lastName" class="form-input" value="${employee.lastName || ''}" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" name="email" class="form-input" value="${employee.email || ''}" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Employee ID</label>
                    <input type="text" name="employeeId" class="form-input" value="${employee.employeeId || ''}" required>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Role</label>
                    <select name="role" class="form-select" required>
                      <option value="employee" ${employee.role === 'employee' ? 'selected' : ''}>Employee</option>
                      <option value="manager" ${employee.role === 'manager' ? 'selected' : ''}>Manager</option>
                      <option value="admin" ${employee.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Department</label>
                    <select name="department" class="form-select">
                      <option value="">Select Department</option>
                      <option value="sales" ${employee.department === 'sales' ? 'selected' : ''}>Sales</option>
                      <option value="management" ${employee.department === 'management' ? 'selected' : ''}>Management</option>
                      <option value="operations" ${employee.department === 'operations' ? 'selected' : ''}>Operations</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Position</label>
                    <input type="text" name="position" class="form-input" value="${employee.position || ''}" placeholder="e.g., Sales Associate">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Hire Date</label>
                    <input type="date" name="hireDate" class="form-input" value="${employee.hireDate ? (typeof employee.hireDate === 'string' ? employee.hireDate : employee.hireDate.toISOString().split('T')[0]) : ''}">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Status</label>
                    <select name="isActive" class="form-select">
                      <option value="true" ${employee.isActive ? 'selected' : ''}>Active</option>
                      <option value="false" ${!employee.isActive ? 'selected' : ''}>Inactive</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Time Off Balance (Days)</label>
                    <input type="number" name="timeOffBalance" class="form-input" value="${employee.timeOffBalance || 24}" min="0">
                  </div>
                </div>

                <div style="margin-top: 2rem;">
                  <button type="submit" class="btn">Update Employee</button>
                  <a href="/admin/employees" class="btn-secondary btn">Cancel</a>
                </div>
              </form>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading employee edit:", error);
      res.status(500).send("Error loading employee edit form");
    }
  });

  // Schedule management route
  app.get('/admin/schedule', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 14);
      const twoWeeksOut = endDate.toISOString().split('T')[0];
      
      const schedules = await storage.getWorkSchedulesByDateRange(today, twoWeeksOut);
      const allUsers = await storage.getAllUsers();

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Schedule Management</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .logo { display: flex; align-items: center; gap: 1rem; }
            .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
            .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; }
            .btn:hover { background: #4f6b56; }
            .schedule-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: #e2e8f0; border: 1px solid #e2e8f0; }
            .schedule-day { background: white; padding: 1rem; min-height: 120px; }
            .schedule-header { font-weight: 600; margin-bottom: 0.5rem; padding: 0.75rem; background: #f8fafc; }
            .shift { background: #607e66; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-bottom: 0.25rem; }
            .form-group { margin-bottom: 1rem; }
            .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
            .form-input, .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
            .form-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div class="logo-icon">🌲</div>
                <div>
                  <div style="font-weight: 600;">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Schedule Management</div>
                </div>
              </div>
              <div class="nav">
                <a href="/admin">Admin Dashboard</a>
                <a href="/admin/employees">Employee Management</a>
                <a href="/admin/schedule" class="active">Schedule Management</a>
                <a href="/dashboard">Employee View</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <!-- Success Message -->
            ${req.query.success ? `
              <div style="background: #d1fae5; border: 1px solid #10b981; color: #065f46; padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">
                <strong>Success!</strong> ${decodeURIComponent(req.query.success)}
              </div>
            ` : ''}
            
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Schedule Management</h1>
              <p style="color: #64748b;">Create and manage employee work schedules for both store locations.</p>
            </div>

            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2>Create Schedule</h2>
                <div>
                  <button onclick="toggleBulkMode()" class="btn-secondary btn" id="bulkToggle">Bulk Schedule Mode</button>
                </div>
              </div>
              
              <!-- Single Schedule Form -->
              <div id="singleScheduleForm">
                <h3 style="margin-bottom: 1rem;">Single Day Schedule</h3>
                <form action="/api/work-schedules" method="POST">
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Employee</label>
                      <select name="userId" class="form-select" required>
                        <option value="">Select Employee</option>
                        ${allUsers.map(user => `
                          <option value="${user.id}">${user.firstName} ${user.lastName}</option>
                        `).join('')}
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Date</label>
                      <input type="date" name="date" class="form-input" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Location</label>
                      <select name="locationId" class="form-select" required>
                        <option value="">Select Location</option>
                        <option value="1">Lake Geneva Store</option>
                        <option value="2">Watertown Store</option>
                      </select>
                    </div>
                  </div>
                  
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Start Time</label>
                      <input type="time" name="startTime" class="form-input" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label">End Time</label>
                      <input type="time" name="endTime" class="form-input" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Position</label>
                      <input type="text" name="position" class="form-input" placeholder="e.g., Sales Associate">
                    </div>
                  </div>

                  <button type="submit" class="btn">Create Schedule</button>
                </form>
              </div>

              <!-- Bulk Schedule Form -->
              <div id="bulkScheduleForm" style="display: none;">
                <h3 style="margin-bottom: 1rem;">Bulk Schedule Creator</h3>
                <form action="/api/work-schedules" method="POST" onsubmit="submitBulkSchedule(event)">
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Employee</label>
                      <select name="userId" class="form-select" required>
                        <option value="">Select Employee</option>
                        ${allUsers.map(user => `
                          <option value="${user.id}">${user.firstName} ${user.lastName}</option>
                        `).join('')}
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Location</label>
                      <select name="locationId" class="form-select" required>
                        <option value="">Select Location</option>
                        <option value="1">Lake Geneva Store</option>
                        <option value="2">Watertown Store</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Position</label>
                      <input type="text" name="position" class="form-input" placeholder="e.g., Sales Associate">
                    </div>
                  </div>
                  
                  <div class="form-row">
                    <div class="form-group">
                      <label class="form-label">Start Time</label>
                      <input type="time" name="startTime" class="form-input" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label">End Time</label>
                      <input type="time" name="endTime" class="form-input" required>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Month/Year</label>
                      <input type="month" id="monthSelector" class="form-input" required onchange="generateCalendar()">
                    </div>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Select Dates</label>
                    <div id="calendarGrid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; background: #e2e8f0; padding: 1rem; border-radius: 8px; margin-top: 0.5rem;">
                      <!-- Calendar will be generated here -->
                    </div>
                    <p style="font-size: 0.875rem; color: #64748b; margin-top: 0.5rem;">Click on dates to select/deselect them for scheduling</p>
                  </div>

                  <input type="hidden" name="selectedDates" id="selectedDates">
                  <button type="submit" class="btn">Create Bulk Schedules</button>
                </form>
              </div>
            </div>

            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">Upcoming Schedules (Next 2 Weeks)</h2>
              
              <!-- Search Filters -->
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: #f8fafc; border-radius: 8px;">
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: #374151;">Filter by Employee</label>
                  <input type="text" id="employeeFilter" placeholder="e.g., Alex Thompson" 
                         style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;"
                         onkeyup="filterSchedules()">
                </div>
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: #374151;">Filter by Location</label>
                  <select id="locationFilter" onchange="filterSchedules()" 
                          style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;">
                    <option value="">All Locations</option>
                    <option value="Lake Geneva">Lake Geneva</option>
                    <option value="Watertown">Watertown</option>
                  </select>
                </div>
                <div>
                  <label style="display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: #374151;">Filter by Date</label>
                  <input type="date" id="dateFilter" 
                         style="width: 100%; padding: 0.5rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.875rem;"
                         onchange="filterSchedules()">
                </div>
              </div>
              
              ${schedules.length === 0 ? 
                '<p style="color: #64748b; text-align: center; padding: 2rem;">No schedules found for the next 2 weeks.</p>' :
                `<div style="overflow-x: auto;">
                  <table id="schedulesTable" style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f8fafc;">
                        <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0;">Employee</th>
                        <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0;">Date</th>
                        <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0;">Time</th>
                        <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0;">Location</th>
                        <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0;">Position</th>
                        <th style="padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0;">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${schedules.map(schedule => {
                        const employee = allUsers.find(u => u.id === schedule.userId);
                        return `
                          <tr>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">${schedule.date}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">${formatTimeRange(schedule.startTime, schedule.endTime)}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">${schedule.locationId === 1 ? 'Lake Geneva' : 'Watertown'}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">${schedule.position || 'N/A'}</td>
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">
                              <a href="/admin/schedule/${schedule.id}/edit" style="color: #607e66; text-decoration: none; margin-right: 1rem;">Edit</a>
                              <button onclick="deleteSchedule(${schedule.id})" style="background: none; border: none; color: #ef4444; cursor: pointer; text-decoration: underline;">Delete</button>
                            </td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>`
              }
            </div>
          </div>

          <script>
            let bulkMode = false;
            let selectedDates = [];

            // Schedule filtering functionality
            function filterSchedules() {
              const employeeFilter = document.getElementById('employeeFilter').value.toLowerCase();
              const locationFilter = document.getElementById('locationFilter').value;
              const dateFilter = document.getElementById('dateFilter').value;
              const table = document.getElementById('schedulesTable');
              
              if (!table) return;
              
              const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
              let visibleCount = 0;
              
              for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                const cells = row.getElementsByTagName('td');
                
                if (cells.length >= 4) {
                  const employeeName = cells[0].textContent.toLowerCase();
                  const scheduleDate = cells[1].textContent;
                  const location = cells[3].textContent;
                  
                  let showRow = true;
                  
                  // Filter by employee name
                  if (employeeFilter && !employeeName.includes(employeeFilter)) {
                    showRow = false;
                  }
                  
                  // Filter by location
                  if (locationFilter && location !== locationFilter) {
                    showRow = false;
                  }
                  
                  // Filter by date
                  if (dateFilter && scheduleDate !== dateFilter) {
                    showRow = false;
                  }
                  
                  if (showRow) {
                    row.style.display = '';
                    visibleCount++;
                  } else {
                    row.style.display = 'none';
                  }
                }
              }
              
              // Show/hide no results message
              let noResultsMsg = document.getElementById('noResultsMessage');
              if (visibleCount === 0 && (employeeFilter || locationFilter || dateFilter)) {
                if (!noResultsMsg) {
                  noResultsMsg = document.createElement('tr');
                  noResultsMsg.id = 'noResultsMessage';
                  noResultsMsg.innerHTML = '<td colspan="6" style="padding: 2rem; text-align: center; color: #64748b; font-style: italic;">No schedules match your filters. Try adjusting your search criteria.</td>';
                  table.getElementsByTagName('tbody')[0].appendChild(noResultsMsg);
                }
                noResultsMsg.style.display = '';
              } else if (noResultsMsg) {
                noResultsMsg.style.display = 'none';
              }
            }

            // Keep session alive during bulk scheduling
            function keepSessionAlive() {
              fetch('/api/auth/user', {
                method: 'GET',
                credentials: 'include'
              }).catch(() => {
                // Session expired - will be handled in form submission
              });
            }

            // Refresh session every 5 minutes
            setInterval(keepSessionAlive, 300000);

            function toggleBulkMode() {
              bulkMode = !bulkMode;
              const singleForm = document.getElementById('singleScheduleForm');
              const bulkForm = document.getElementById('bulkScheduleForm');
              const toggleBtn = document.getElementById('bulkToggle');

              if (bulkMode) {
                singleForm.style.display = 'none';
                bulkForm.style.display = 'block';
                toggleBtn.textContent = 'Single Schedule Mode';
                
                // Set default month to current month
                const now = new Date();
                const currentMonth = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
                document.getElementById('monthSelector').value = currentMonth;
                generateCalendar();
              } else {
                singleForm.style.display = 'block';
                bulkForm.style.display = 'none';
                toggleBtn.textContent = 'Bulk Schedule Mode';
              }
            }

            function generateCalendar() {
              const monthSelector = document.getElementById('monthSelector');
              const calendarGrid = document.getElementById('calendarGrid');
              
              if (!monthSelector.value) return;

              const [year, month] = monthSelector.value.split('-').map(Number);
              const firstDay = new Date(year, month - 1, 1);
              const lastDay = new Date(year, month, 0);
              const daysInMonth = lastDay.getDate();
              const startingDayOfWeek = firstDay.getDay();

              calendarGrid.innerHTML = '';
              selectedDates = [];

              // Add day headers
              const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
              dayHeaders.forEach(day => {
                const header = document.createElement('div');
                header.textContent = day;
                header.style.cssText = 'background: #f8fafc; padding: 0.5rem; text-align: center; font-weight: 600; font-size: 0.875rem;';
                calendarGrid.appendChild(header);
              });

              // Add empty cells for days before the first day of the month
              for (let i = 0; i < startingDayOfWeek; i++) {
                const emptyCell = document.createElement('div');
                emptyCell.style.cssText = 'background: white; padding: 0.75rem;';
                calendarGrid.appendChild(emptyCell);
              }

              // Add days of the month
              for (let day = 1; day <= daysInMonth; day++) {
                const dayCell = document.createElement('div');
                dayCell.textContent = day;
                dayCell.style.cssText = 'background: white; padding: 0.75rem; text-align: center; cursor: pointer; border-radius: 4px; transition: all 0.2s; user-select: none;';
                dayCell.setAttribute('data-date', \`\${year}-\${String(month).padStart(2, '0')}-\${String(day).padStart(2, '0')}\`);
                
                dayCell.addEventListener('click', function() {
                  const date = this.getAttribute('data-date');
                  const isSelected = selectedDates.includes(date);
                  
                  if (isSelected) {
                    selectedDates = selectedDates.filter(d => d !== date);
                    this.style.background = 'white';
                    this.style.color = '#1e293b';
                  } else {
                    selectedDates.push(date);
                    this.style.background = '#607e66';
                    this.style.color = 'white';
                  }
                  
                  document.getElementById('selectedDates').value = selectedDates.join(',');
                });

                dayCell.addEventListener('mouseenter', function() {
                  if (!selectedDates.includes(this.getAttribute('data-date'))) {
                    this.style.background = '#f1f5f9';
                  }
                });

                dayCell.addEventListener('mouseleave', function() {
                  if (!selectedDates.includes(this.getAttribute('data-date'))) {
                    this.style.background = 'white';
                  }
                });

                calendarGrid.appendChild(dayCell);
              }
            }

            function submitBulkSchedule(event) {
              event.preventDefault();
              
              if (selectedDates.length === 0) {
                alert('Please select at least one date for scheduling.');
                return;
              }

              const form = event.target;
              const formData = new FormData(form);
              
              // Add selected dates to form data
              formData.set('dates', selectedDates.join(','));

              // Submit using fetch with authentication handling
              fetch('/api/work-schedules', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include', // Include cookies for authentication
                body: JSON.stringify({
                  userId: formData.get('userId'),
                  locationId: formData.get('locationId'),
                  position: formData.get('position'),
                  startTime: formData.get('startTime'),
                  endTime: formData.get('endTime'),
                  dates: selectedDates
                })
              })
              .then(response => {
                if (response.status === 401) {
                  // Token expired - redirect to login
                  alert('Your session has expired. Redirecting to login...');
                  window.location.href = '/api/login';
                  return;
                }
                return response.json();
              })
              .then(data => {
                if (data && data.message) {
                  alert(data.message);
                  window.location.reload();
                } else if (data) {
                  alert('Schedules created successfully!');
                  window.location.reload();
                }
              })
              .catch(error => {
                console.error('Error:', error);
                if (error.message && error.message.includes('401')) {
                  alert('Your session has expired. Redirecting to login...');
                  window.location.href = '/api/login';
                } else {
                  alert('Failed to create schedules. Please try again.');
                }
              });
            }

            function deleteSchedule(scheduleId) {
              if (!confirm('Are you sure you want to delete this schedule?')) {
                return;
              }

              fetch(\`/api/work-schedules/\${scheduleId}\`, {
                method: 'DELETE',
                credentials: 'include'
              })
              .then(response => {
                if (response.status === 401) {
                  alert('Your session has expired. Redirecting to login...');
                  window.location.href = '/api/login';
                  return;
                }
                return response.json();
              })
              .then(data => {
                if (data && data.message) {
                  alert(data.message);
                  window.location.reload();
                } else {
                  alert('Schedule deleted successfully!');
                  window.location.reload();
                }
              })
              .catch(error => {
                console.error('Error:', error);
                alert('Failed to delete schedule. Please try again.');
              });
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading schedule management:", error);
      res.status(500).send("Error loading schedule management");
    }
  });

  // New Employee Form
  app.get('/admin/employees/new', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Add New Employee</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .logo { display: flex; align-items: center; gap: 1rem; }
            .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
            .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .form-group { margin-bottom: 1.5rem; }
            .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
            .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
            .form-input, .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; }
            .form-input:focus, .form-select:focus { outline: none; border-color: #607e66; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; cursor: pointer; }
            .btn:hover { background: #4f6b56; }
            .btn-secondary { background: #e2e8f0; color: #475569; }
            .btn-secondary:hover { background: #cbd5e1; }
            .required { color: #ef4444; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div class="logo-icon">🌲</div>
                <div>
                  <div style="font-weight: 600;">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Add New Employee</div>
                </div>
              </div>
              <div class="nav">
                <a href="/admin">Admin Dashboard</a>
                <a href="/admin/employees" class="active">Employee Management</a>
                <a href="/admin/schedule">Schedule Management</a>
                <a href="/dashboard">Employee View</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Add New Employee</h1>
              <p style="color: #64748b;">Create a new employee profile with role assignments and contact information.</p>
            </div>

            <div class="card">
              <form action="/admin/employees/create" method="POST">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Employee ID <span class="required">*</span></label>
                    <input type="text" name="employeeId" class="form-input" placeholder="PHF001" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Role <span class="required">*</span></label>
                    <select name="role" class="form-select" required>
                      <option value="">Select Role</option>
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">First Name <span class="required">*</span></label>
                    <input type="text" name="firstName" class="form-input" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Last Name <span class="required">*</span></label>
                    <input type="text" name="lastName" class="form-input" required>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Email Address</label>
                  <input type="email" name="email" class="form-input" placeholder="employee@pinehillfarm.co">
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Department</label>
                    <select name="department" class="form-select">
                      <option value="">Select Department</option>
                      <option value="sales">Sales</option>
                      <option value="management">Management</option>
                      <option value="operations">Operations</option>
                      <option value="administration">Administration</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Position</label>
                    <input type="text" name="position" class="form-input" placeholder="Sales Associate">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Hire Date</label>
                    <input type="date" name="hireDate" class="form-input">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Phone Number</label>
                    <input type="tel" name="phone" class="form-input" placeholder="(847) 401-5540">
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Address</label>
                  <input type="text" name="address" class="form-input" placeholder="123 Main Street">
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">City</label>
                    <input type="text" name="city" class="form-input" placeholder="Lake Geneva">
                  </div>
                  <div class="form-group">
                    <label class="form-label">State</label>
                    <input type="text" name="state" class="form-input" placeholder="WI" maxlength="2">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">ZIP Code</label>
                    <input type="text" name="zipCode" class="form-input" placeholder="53147">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Starting Time Off Balance (hours)</label>
                    <input type="number" name="timeOffBalance" class="form-input" value="24" min="0" max="200">
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Emergency Contact Name</label>
                    <input type="text" name="emergencyContact" class="form-input" placeholder="John Doe">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Emergency Contact Phone</label>
                    <input type="tel" name="emergencyPhone" class="form-input" placeholder="(847) 123-4567">
                  </div>
                </div>

                <div style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #e2e8f0;">
                  <button type="submit" class="btn">Create Employee</button>
                  <a href="/admin/employees" class="btn-secondary btn">Cancel</a>
                </div>
              </form>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading new employee form:", error);
      res.status(500).send("Error loading form");
    }
  });

  // Create Employee API
  app.post('/admin/employees/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const employeeData = {
        id: `emp_${Date.now()}`, // Generate unique ID
        employeeId: req.body.employeeId,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        role: req.body.role,
        department: req.body.department,
        position: req.body.position,
        hireDate: req.body.hireDate,
        phone: req.body.phone,
        address: req.body.address,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode,
        timeOffBalance: parseInt(req.body.timeOffBalance) || 24,
        emergencyContact: req.body.emergencyContact,
        emergencyPhone: req.body.emergencyPhone,
        isActive: true
      };

      await storage.createEmployee(employeeData);
      res.redirect('/admin/employees?success=created');
    } catch (error) {
      console.error("Error creating employee:", error);
      res.redirect('/admin/employees/new?error=creation_failed');
    }
  });

  // Team Chat page
  app.get('/team-chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Team Chat</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .logo { display: flex; align-items: center; gap: 1rem; }
            .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 300px 1fr; gap: 2rem; height: calc(100vh - 140px); }
            .sidebar { background: white; border-radius: 12px; padding: 1.5rem; }
            .chat-area { background: white; border-radius: 12px; display: flex; flex-direction: column; }
            .chat-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
            .messages { flex: 1; padding: 1rem; overflow-y: auto; max-height: 400px; }
            .message { margin-bottom: 1rem; padding: 1rem; border-radius: 8px; background: #f8fafc; }
            .message-sender { font-weight: 600; margin-bottom: 0.5rem; color: #607e66; }
            .message-time { font-size: 0.75rem; color: #64748b; }
            .chat-input { padding: 1.5rem; border-top: 1px solid #e2e8f0; }
            .input-form { display: flex; gap: 1rem; }
            .message-input { flex: 1; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; }
            .btn:hover { background: #4f6b56; }
            .channel { padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 6px; cursor: pointer; transition: background 0.2s; }
            .channel:hover { background: #f1f5f9; }
            .channel.active { background: #607e66; color: white; }
            .online-users { margin-top: 2rem; }
            .user-item { padding: 0.5rem; margin-bottom: 0.25rem; border-radius: 4px; font-size: 0.875rem; }
            .user-online { color: #10b981; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div class="logo-icon">🌲</div>
                <div>
                  <div style="font-weight: 600;">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Team Chat</div>
                </div>
              </div>
              <div class="nav">
                <a href="/dashboard">Dashboard</a>
                <a href="/schedule">Schedule</a>
                <a href="/time-off">Time Off</a>
                <a href="/announcements">Announcements</a>
                <a href="/team-chat" class="active">Team Chat</a>
                ${isAdminOrManager ? '<a href="/admin">Admin Portal</a>' : ''}
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="sidebar">
              <h3 style="margin-bottom: 1rem;">Channels</h3>
              <div class="channel active"># General</div>
              <div class="channel"># Lake Geneva Store</div>
              <div class="channel"># Watertown Store</div>
              <div class="channel"># Managers</div>
              
              <div class="online-users">
                <h4 style="margin-bottom: 0.5rem; color: #64748b;">Online Now</h4>
                <div class="user-item"><span class="user-online">●</span> ${user.firstName} ${user.lastName}</div>
                <div class="user-item"><span class="user-online">●</span> Sarah Johnson</div>
                <div class="user-item"><span class="user-online">●</span> Mike Davis</div>
              </div>
            </div>

            <div class="chat-area">
              <div class="chat-header">
                <h2># General</h2>
                <p style="color: #64748b; margin-top: 0.5rem;">Team-wide communication and updates</p>
              </div>

              <div class="messages">
                <div class="message">
                  <div class="message-sender">Sarah Johnson</div>
                  <div>Good morning team! Don't forget about the inventory count this weekend.</div>
                  <div class="message-time">Today at 9:15 AM</div>
                </div>
                
                <div class="message">
                  <div class="message-sender">Mike Davis</div>
                  <div>The new shipment arrived at Watertown. Everything looks good!</div>
                  <div class="message-time">Today at 10:30 AM</div>
                </div>
                
                <div class="message">
                  <div class="message-sender">${user.firstName} ${user.lastName}</div>
                  <div>Thanks for the update Mike. I'll be there this afternoon to help with stocking.</div>
                  <div class="message-time">Today at 11:45 AM</div>
                </div>
              </div>

              <div class="chat-input">
                <form class="input-form" onsubmit="sendMessage(event)">
                  <input type="text" class="message-input" placeholder="Type your message..." required>
                  <button type="submit" class="btn">Send</button>
                </form>
              </div>
            </div>
          </div>

          <script>
            function sendMessage(event) {
              event.preventDefault();
              const input = event.target.querySelector('.message-input');
              const messagesContainer = document.querySelector('.messages');
              
              if (input.value.trim()) {
                const messageDiv = document.createElement('div');
                messageDiv.className = 'message';
                messageDiv.innerHTML = \`
                  <div class="message-sender">${user.firstName} ${user.lastName}</div>
                  <div>\${input.value}</div>
                  <div class="message-time">Just now</div>
                \`;
                messagesContainer.appendChild(messageDiv);
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
                input.value = '';
              }
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading team chat:", error);
      res.status(500).send("Error loading team chat");
    }
  });

  // Documents route commented out - handled by React router
  /*app.get('/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Documents & Resources</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .logo { display: flex; align-items: center; gap: 1rem; }
            .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
            .categories { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-bottom: 2rem; }
            .category-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .category-icon { width: 48px; height: 48px; border-radius: 8px; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
            .category-title { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }
            .document-list { list-style: none; }
            .document-item { padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 6px; background: #f8fafc; border-left: 3px solid #607e66; }
            .document-title { font-weight: 500; }
            .document-desc { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; }
            .btn:hover { background: #4f6b56; }
            .btn-secondary { background: #e2e8f0; color: #475569; }
            .btn-secondary:hover { background: #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div class="logo-icon">🌲</div>
                <div>
                  <div style="font-weight: 600;">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Documents & Resources</div>
                </div>
              </div>
              <div class="nav">
                <a href="/dashboard">Dashboard</a>
                <a href="/schedule">Schedule</a>
                <a href="/time-off">Time Off</a>
                <a href="/announcements">Announcements</a>
                <a href="/team-chat">Team Chat</a>
                <a href="/documents" class="active">Documents</a>
                ${isAdminOrManager ? '<a href="/admin">Admin Portal</a>' : ''}
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Documents & Resources</h1>
              <p style="color: #64748b;">Access important company documents, training materials, and resources.</p>
            </div>

            <div class="categories">
              <div class="category-card">
                <div class="category-icon" style="background: #dbeafe; color: #2563eb;">📋</div>
                <div class="category-title">Company Policies</div>
                <ul class="document-list">
                  <li class="document-item">
                    <div class="document-title">Employee Handbook</div>
                    <div class="document-desc">Complete guide to company policies and procedures</div>
                  </li>
                  <li class="document-item">
                    <div class="document-title">Code of Conduct</div>
                    <div class="document-desc">Expected behavior and ethical guidelines</div>
                  </li>
                  <li class="document-item">
                    <div class="document-title">Time Off Policy</div>
                    <div class="document-desc">Vacation, sick leave, and PTO guidelines</div>
                  </li>
                </ul>
              </div>

              <div class="category-card">
                <div class="category-icon" style="background: #dcfce7; color: #16a34a;">🎓</div>
                <div class="category-title">Training Materials</div>
                <ul class="document-list">
                  <li class="document-item">
                    <div class="document-title">Customer Service Excellence</div>
                    <div class="document-desc">Best practices for customer interactions</div>
                  </li>
                  <li class="document-item">
                    <div class="document-title">Product Knowledge Guide</div>
                    <div class="document-desc">Detailed information about our products</div>
                  </li>
                  <li class="document-item">
                    <div class="document-title">Safety Procedures</div>
                    <div class="document-desc">Workplace safety and emergency protocols</div>
                  </li>
                  <li class="document-item">
                    <div class="document-title">POS System Training</div>
                    <div class="document-desc">Complete guide to the point-of-sale system</div>
                  </li>
                </ul>
              </div>

              <div class="category-card">
                <div class="category-icon" style="background: #fef3c7; color: #d97706;">📝</div>
                <div class="category-title">Forms & Templates</div>
                <ul class="document-list">
                  <li class="document-item">
                    <div class="document-title">Time Off Request Form</div>
                    <div class="document-desc">Submit vacation and leave requests</div>
                  </li>
                  <li class="document-item">
                    <div class="document-title">Incident Report Form</div>
                    <div class="document-desc">Report workplace incidents or accidents</div>
                  </li>
                  <li class="document-item">
                    <div class="document-title">Expense Reimbursement</div>
                    <div class="document-desc">Submit business expense claims</div>
                  </li>
                </ul>
              </div>

              <div class="category-card">
                <div class="category-icon" style="background: #f3e8ff; color: #7c3aed;">📞</div>
                <div class="category-title">Quick Reference</div>
                <ul class="document-list">
                  <li class="document-item">
                    <div class="document-title">Emergency Contacts</div>
                    <div class="document-desc">Important phone numbers and contacts</div>
                  </li>
                  <li class="document-item">
                    <div class="document-title">Store Information</div>
                    <div class="document-desc">Addresses, hours, and key details</div>
                  </li>
                  <li class="document-item">
                    <div class="document-title">IT Support</div>
                    <div class="document-desc">Technical support and troubleshooting</div>
                  </li>
                </ul>
              </div>
            </div>

            ${isAdminOrManager ? `
            <div style="background: white; padding: 2rem; border-radius: 12px; margin-top: 2rem;">
              <h3 style="margin-bottom: 1rem;">Document Management</h3>
              <p style="color: #64748b; margin-bottom: 1.5rem;">Upload and manage company documents and resources.</p>
              <a href="/admin/documents" class="btn">Manage Documents</a>
            </div>
            ` : ''}
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading documents:", error);
      res.status(500).send("Error loading documents");
    }
  });*/

  // Shift Coverage page
  app.get('/shift-coverage', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
      const coverageRequests = await storage.getShiftCoverageRequests();

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Shift Coverage</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .logo { display: flex; align-items: center; gap: 1rem; }
            .logo-icon { width: 40px; height: 40px; background: #607e66; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .tabs { display: flex; gap: 1rem; margin-bottom: 2rem; }
            .tab { padding: 0.75rem 1.5rem; border: 1px solid #d1d5db; border-radius: 6px; background: white; color: #64748b; text-decoration: none; transition: all 0.2s; }
            .tab.active { background: #607e66; color: white; border-color: #607e66; }
            .tab:hover { background: #f9fafb; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; }
            .btn:hover { background: #4f6b56; }
            .btn-secondary { background: #e2e8f0; color: #475569; }
            .btn-secondary:hover { background: #cbd5e1; }
            .form-group { margin-bottom: 1.5rem; }
            .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
            .form-input, .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
            .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
            .request-card { background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-bottom: 1rem; border-left: 4px solid #607e66; }
            .request-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
            .request-title { font-weight: 600; }
            .request-meta { color: #64748b; font-size: 0.875rem; margin-top: 0.5rem; }
            .status-pending { background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; }
            .status-covered { background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div class="logo-icon">🌲</div>
                <div>
                  <div style="font-weight: 600;">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Shift Coverage</div>
                </div>
              </div>
              <div class="nav">
                <a href="/dashboard">Dashboard</a>
                <a href="/schedule">Schedule</a>
                <a href="/time-off">Time Off</a>
                <a href="/announcements">Announcements</a>
                <a href="/team-chat">Team Chat</a>
                <a href="/shift-coverage" class="active">Shift Coverage</a>
                ${isAdminOrManager ? '<a href="/admin">Admin Portal</a>' : ''}
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Shift Coverage Management</h1>
              <p style="color: #64748b;">Request coverage for your shifts or volunteer to cover for colleagues.</p>
            </div>

            <div class="tabs">
              <a href="#request" class="tab active">Request Coverage</a>
              <a href="#available" class="tab">Available to Cover</a>
              <a href="#my-requests" class="tab">My Requests</a>
            </div>

            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">Request Shift Coverage</h2>
              <form action="/api/shift-coverage/create" method="POST">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Shift Date</label>
                    <input type="date" name="shiftDate" class="form-input" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Location</label>
                    <select name="location" class="form-select" required>
                      <option value="">Select Location</option>
                      <option value="1">Lake Geneva Store</option>
                      <option value="2">Watertown Store</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Start Time</label>
                    <input type="time" name="startTime" class="form-input" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">End Time</label>
                    <input type="time" name="endTime" class="form-input" required>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Reason for Coverage Request</label>
                  <input type="text" name="reason" class="form-input" placeholder="e.g., Doctor appointment, family emergency">
                </div>

                <div style="margin-top: 2rem;">
                  <button type="submit" class="btn">Submit Coverage Request</button>
                </div>
              </form>
            </div>

            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">Current Coverage Requests</h2>
              ${coverageRequests.length === 0 ? 
                '<p style="color: #64748b; text-align: center; padding: 2rem;">No coverage requests at this time.</p>' :
                coverageRequests.map(request => `
                  <div class="request-card">
                    <div class="request-header">
                      <div>
                        <div class="request-title">Coverage Needed - ${request.shiftDate}</div>
                        <div class="request-meta">
                          ${request.startTime} - ${request.endTime} • 
                          ${request.locationId === 1 ? 'Lake Geneva Store' : 'Watertown Store'}<br>
                          Requested by: ${request.requesterId} • ${request.reason || 'No reason provided'}
                        </div>
                      </div>
                      <div>
                        <span class="status-${request.status === 'covered' ? 'covered' : 'pending'}">
                          ${request.status === 'covered' ? 'Covered' : 'Available'}
                        </span>
                      </div>
                    </div>
                    ${request.status !== 'covered' && request.requesterId !== userId ? 
                      `<a href="/api/shift-coverage/${request.id}/cover" class="btn" style="font-size: 0.875rem; padding: 0.5rem 1rem;">Volunteer to Cover</a>` : 
                      ''
                    }
                  </div>
                `).join('')
              }
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading shift coverage:", error);
      res.status(500).send("Error loading shift coverage");
    }
  });

  // Root route - serve static HTML directly (bypassing all React/Vite issues)
  app.get('/', (req, res) => {
    const user = (req.session as any)?.user;
    
    if (user) {
      // User is logged in, redirect to dashboard
      res.redirect('/dashboard');
    } else {
      // User not logged in, show landing page with login
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm Employee Portal</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b; display: flex; align-items: center; justify-content: center;
            }
            .container { max-width: 400px; width: 100%; padding: 2rem; }
            .card { background: white; padding: 3rem; border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; }
            .logo { width: 80px; height: 80px; background: #607e66; border-radius: 20px; margin: 0 auto 2rem; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: white; }
            h1 { margin-bottom: 1rem; color: #1e293b; }
            .subtitle { color: #64748b; margin-bottom: 2rem; }
            .btn { background: #607e66; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 600; font-size: 1.1rem; transition: background 0.2s; }
            .btn:hover { background: #4f6b56; }
            .footer { margin-top: 2rem; color: #94a3b8; font-size: 0.875rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="card">
              <div class="logo">🌲</div>
              <h1>Pine Hill Farm</h1>
              <p class="subtitle">Employee Management Portal</p>
              <a href="/api/login" class="btn">Sign In to Continue</a>
              <div class="footer">Lake Geneva & Watertown Locations</div>
            </div>
          </div>
        </body>
        </html>
      `);
    }
  });

  // Remove duplicate auth middleware - already set up above

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.patch('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const updatedUser = await storage.updateUserProfile(userId, req.body);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const timeOffRequests = await storage.getUserTimeOffRequests(userId);
      const pendingRequests = timeOffRequests.filter(r => r.status === 'pending');
      
      // Calculate hours this week (mock for now)
      const hoursThisWeek = 42.5;
      
      // Get training progress
      const trainingProgress = await storage.getUserTrainingProgress(userId);
      const completedTraining = trainingProgress.filter(p => p.status === 'completed').length;
      const totalTraining = trainingProgress.length || 1;
      const trainingPercentage = Math.round((completedTraining / totalTraining) * 100);

      res.json({
        timeOffBalance: user?.timeOffBalance || 24,
        hoursThisWeek,
        pendingRequests: pendingRequests.length,
        trainingProgress: trainingPercentage,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Time off requests
  app.post('/api/time-off-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTimeOffRequestSchema.parse({
        ...req.body,
        userId,
      });
      
      const request = await storage.createTimeOffRequest(validatedData);
      
      // Get employee name for notification
      const user = await storage.getUser(userId);
      const employeeName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email || 'Employee';
      
      // Send push notification to all managers for time-sensitive approval
      await notificationService.notifyTimeOffRequest(request.id, employeeName);
      
      res.json(request);
    } catch (error) {
      console.error("Error creating time off request:", error);
      res.status(500).json({ message: "Failed to create time off request" });
    }
  });

  app.get('/api/time-off-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const requests = await storage.getUserTimeOffRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching time off requests:", error);
      res.status(500).json({ message: "Failed to fetch time off requests" });
    }
  });

  app.get('/api/time-off-requests/pending', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const requests = await storage.getPendingTimeOffRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.patch('/api/time-off-requests/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { id } = req.params;
      const { status, comments } = req.body;
      
      const request = await storage.updateTimeOffRequestStatus(
        parseInt(id),
        status,
        req.user.claims.sub,
        comments
      );
      
      // Get all pending requests to find the specific one and its user
      const pendingRequests = await storage.getPendingTimeOffRequests();
      const targetRequest = pendingRequests.find(r => r.id === parseInt(id));
      
      // Send notification to employee about approval decision
      if (targetRequest?.userId) {
        await notificationService.notifyApprovalDecision(
          targetRequest.userId,
          status === 'approved' ? 'approved' : 'denied',
          'time off'
        );
      }
      
      res.json(request);
    } catch (error) {
      console.error("Error updating time off request status:", error);
      res.status(500).json({ message: "Failed to update time off request status" });
    }
  });

  // Work schedules
  app.post('/api/work-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ message: "Manager or admin access required" });
      }
      
      // Parse form data correctly - convert string numbers to integers
      const formData = {
        ...req.body,
        locationId: parseInt(req.body.locationId),
        // Handle multiple dates for bulk scheduling
        dates: req.body.dates ? (Array.isArray(req.body.dates) ? req.body.dates : [req.body.date]) : [req.body.date]
      };
      
      // Create schedules for multiple dates if provided
      const schedules = [];
      const dates = formData.dates;
      
      for (const date of dates) {
        const scheduleData = {
          userId: formData.userId,
          locationId: formData.locationId,
          date: date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          position: formData.position || null,
          notes: formData.notes || null
        };
        
        const validatedData = insertWorkScheduleSchema.parse(scheduleData);
        const schedule = await storage.createWorkSchedule(validatedData);
        schedules.push(schedule);
      }
      
      // Redirect back to schedule management page with success message
      res.redirect('/admin/schedule?success=' + encodeURIComponent(`Created ${schedules.length} schedule(s) successfully`));
    } catch (error) {
      console.error("Error creating work schedule:", error);
      res.status(500).json({ message: "Failed to create work schedule" });
    }
  });

  app.get('/api/work-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const { startDate, endDate, start, end } = req.query;
      
      const startParam = startDate || start;
      const endParam = endDate || end;
      
      if (!startParam || !endParam) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      
      const schedules = await storage.getWorkSchedulesByDateRange(
        startParam as string,
        endParam as string
      );
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching work schedules:", error);
      res.status(500).json({ message: "Failed to fetch work schedules" });
    }
  });

  app.patch('/api/work-schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ message: "Manager or admin access required" });
      }
      
      const { id } = req.params;
      const validatedData = insertWorkScheduleSchema.partial().parse(req.body);
      const schedule = await storage.updateWorkSchedule(parseInt(id), validatedData);
      res.json(schedule);
    } catch (error) {
      console.error("Error updating work schedule:", error);
      res.status(500).json({ message: "Failed to update work schedule" });
    }
  });

  app.delete('/api/work-schedules/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin' && user?.role !== 'manager') {
        return res.status(403).json({ message: "Manager or admin access required" });
      }
      
      const { id } = req.params;
      await storage.deleteWorkSchedule(parseInt(id));
      res.json({ message: "Work schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting work schedule:", error);
      res.status(500).json({ message: "Failed to delete work schedule" });
    }
  });

  // Shift coverage requests
  app.post('/api/shift-coverage-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertShiftCoverageRequestSchema.parse({
        ...req.body,
        requesterId: userId,
      });
      
      const request = await storage.createShiftCoverageRequest(validatedData);
      res.json(request);
    } catch (error) {
      console.error("Error creating shift coverage request:", error);
      res.status(500).json({ message: "Failed to create shift coverage request" });
    }
  });

  app.get('/api/shift-coverage-requests', isAuthenticated, async (req: any, res) => {
    try {
      const { status } = req.query;
      const requests = await storage.getShiftCoverageRequests(status as string);
      res.json(requests);
    } catch (error) {
      console.error("Error fetching shift coverage requests:", error);
      res.status(500).json({ message: "Failed to fetch shift coverage requests" });
    }
  });

  app.patch('/api/shift-coverage-requests/:id/cover', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const request = await storage.coverShiftRequest(parseInt(id), userId);
      res.json(request);
    } catch (error) {
      console.error("Error covering shift request:", error);
      res.status(500).json({ message: "Failed to cover shift request" });
    }
  });

  // Announcements
  app.post('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validatedData = insertAnnouncementSchema.parse({
        ...req.body,
        authorId: req.user.claims.sub,
      });
      
      const announcement = await storage.createAnnouncement(validatedData);
      res.json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.get('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const announcements = await storage.getPublishedAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Training modules
  app.post('/api/training-modules', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validatedData = insertTrainingModuleSchema.parse(req.body);
      const module = await storage.createTrainingModule(validatedData);
      res.json(module);
    } catch (error) {
      console.error("Error creating training module:", error);
      res.status(500).json({ message: "Failed to create training module" });
    }
  });

  app.get('/api/training-modules', isAuthenticated, async (req: any, res) => {
    try {
      const modules = await storage.getAllTrainingModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ message: "Failed to fetch training modules" });
    }
  });

  // Training progress
  app.post('/api/training-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertTrainingProgressSchema.parse({
        ...req.body,
        userId,
      });
      
      const progress = await storage.createOrUpdateTrainingProgress(validatedData);
      res.json(progress);
    } catch (error) {
      console.error("Error updating training progress:", error);
      res.status(500).json({ message: "Failed to update training progress" });
    }
  });

  app.get('/api/training-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getUserTrainingProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching training progress:", error);
      res.status(500).json({ message: "Failed to fetch training progress" });
    }
  });

  // Messages
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
      });
      
      const message = await storage.createMessage(validatedData);
      res.json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messages = await storage.getUserMessages(userId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Push notification subscription routes
  app.post("/api/notifications/subscribe", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { endpoint, keys } = req.body;
      
      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      const subscription = await storage.savePushSubscription({
        userId,
        endpoint,
        p256dhKey: keys.p256dh,
        authKey: keys.auth,
      });

      res.json(subscription);
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save push subscription" });
    }
  });

  // Get user notifications
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(notificationId);
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  // Get unread notifications count
  app.get("/api/notifications/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUnreadNotifications(userId);
      res.json({ count: notifications.length });
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  // Locations routes
  app.get('/api/locations', isAuthenticated, async (req, res) => {
    try {
      const locations = await storage.getAllLocations();
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get('/api/locations/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const location = await storage.getLocationById(id);
      if (!location) {
        return res.status(404).json({ message: "Location not found" });
      }
      res.json(location);
    } catch (error) {
      console.error("Error fetching location:", error);
      res.status(500).json({ message: "Failed to fetch location" });
    }
  });

  // Global calendar events endpoint - smart calendar with automatic sync
  app.get('/api/calendar/events', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "Start date and end date are required" });
      }
      const events = await storage.getCalendarEvents(startDate as string, endDate as string);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  // Chat channels API routes
  app.get('/api/chat/channels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const channels = await storage.getUserChannels(userId);
      res.json(channels);
    } catch (error) {
      console.error("Error fetching chat channels:", error);
      res.status(500).json({ message: "Failed to fetch chat channels" });
    }
  });

  app.post('/api/chat/channels', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const channelData = insertChatChannelSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      const channel = await storage.createChatChannel(channelData);
      
      // Add creator as first member
      await storage.addChannelMember({
        channelId: channel.id,
        userId: userId,
        role: 'admin',
      });
      
      res.json(channel);
    } catch (error) {
      console.error("Error creating chat channel:", error);
      res.status(500).json({ message: "Failed to create chat channel" });
    }
  });

  app.get('/api/chat/channels/:channelId/messages', isAuthenticated, async (req, res) => {
    try {
      const channelId = req.params.channelId;
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getChannelMessages(channelId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching channel messages:", error);
      res.status(500).json({ message: "Failed to fetch channel messages" });
    }
  });

  app.post('/api/chat/channels/:channelId/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const channelId = req.params.channelId;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
        channelId: channelId,
        messageType: 'channel',
      });
      const message = await storage.sendChannelMessage(messageData);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'channel_message',
            channelId: channelId,
            message: message
          }));
        }
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error sending channel message:", error);
      res.status(500).json({ message: "Failed to send channel message" });
    }
  });

  app.post('/api/chat/channels/:channelId/members', isAuthenticated, async (req: any, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const memberData = insertChannelMemberSchema.parse({
        ...req.body,
        channelId: channelId,
      });
      const member = await storage.addChannelMember(memberData);
      res.json(member);
    } catch (error) {
      console.error("Error adding channel member:", error);
      res.status(500).json({ message: "Failed to add channel member" });
    }
  });

  app.get('/api/chat/channels/:channelId/members', isAuthenticated, async (req, res) => {
    try {
      const channelId = parseInt(req.params.channelId);
      const members = await storage.getChannelMembers(channelId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching channel members:", error);
      res.status(500).json({ message: "Failed to fetch channel members" });
    }
  });

  // Direct messages API routes
  app.get('/api/chat/direct/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      const otherUserId = req.params.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const messages = await storage.getDirectMessages(currentUserId, otherUserId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching direct messages:", error);
      res.status(500).json({ message: "Failed to fetch direct messages" });
    }
  });

  app.post('/api/chat/direct', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = insertMessageSchema.parse({
        ...req.body,
        senderId: userId,
        messageType: 'direct',
      });
      const message = await storage.createMessage(messageData);
      
      // Broadcast to WebSocket clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'direct_message',
            recipientId: messageData.recipientId,
            message: message
          }));
        }
      });
      
      res.json(message);
    } catch (error) {
      console.error("Error sending direct message:", error);
      res.status(500).json({ message: "Failed to send direct message" });
    }
  });

  // Employees (admin only)
  app.get('/api/employees', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const employees = await storage.getAllUsers();
      res.json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  // Add new employee (Admin only)
  app.post('/api/employees', isAuthenticated, async (req: any, res) => {
    try {
      console.log("Employee creation request body:", JSON.stringify(req.body, null, 2));
      
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Check if employee ID already exists
      if (req.body.employeeId) {
        const existingEmployee = await storage.getEmployeeByEmployeeId(req.body.employeeId);
        if (existingEmployee) {
          return res.status(400).json({ message: "Employee ID already exists" });
        }
      }
      
      const newEmployee = await storage.createEmployee(req.body);
      console.log("Employee created successfully:", newEmployee.id);
      res.status(201).json(newEmployee);
    } catch (error) {
      console.error("Detailed error creating employee:", error);
      console.error("Error stack:", error.stack);
      res.status(500).json({ 
        message: "Failed to create employee",
        error: error.message
      });
    }
  });

  // Update employee (Admin only)
  app.patch('/api/employees/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { id } = req.params;
      
      // Check if employee ID already exists (if being updated)
      if (req.body.employeeId) {
        const existingEmployee = await storage.getEmployeeByEmployeeId(req.body.employeeId);
        if (existingEmployee && existingEmployee.id !== id) {
          return res.status(400).json({ message: "Employee ID already exists" });
        }
      }
      
      const updatedEmployee = await storage.updateEmployee(id, req.body);
      res.json(updatedEmployee);
    } catch (error) {
      console.error("Error updating employee:", error);
      res.status(500).json({ message: "Failed to update employee" });
    }
  });

  app.patch('/api/employees/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const { id } = req.params;
      const { role } = req.body;
      
      const updatedUser = await storage.updateUserRole(id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Test page for mobile notifications
  app.get('/test-notifications', (req, res) => {
    res.sendFile('test-notifications.html', { root: './server' });
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getUserNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get('/api/notifications/unread', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const unreadNotifications = await storage.getUnreadNotifications(userId);
      res.json({ count: unreadNotifications.length });
    } catch (error) {
      console.error("Error fetching unread notifications:", error);
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationAsRead(parseInt(id));
      res.json(notification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Push notification endpoints
  app.get('/api/notifications/vapid-key', (req, res) => {
    if (!process.env.VAPID_PUBLIC_KEY) {
      return res.status(500).json({ message: "VAPID keys not configured" });
    }
    res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
  });

  app.post('/api/notifications/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { endpoint, auth, p256dh } = req.body;
      
      // Validate required fields
      if (!endpoint || !auth || !p256dh) {
        return res.status(400).json({ message: "Invalid subscription data: missing required fields" });
      }
      
      console.log("Saving push subscription for user:", userId);
      
      await storage.savePushSubscription({
        userId,
        endpoint,
        authKey: auth,
        p256dhKey: p256dh
      });
      
      console.log("Push subscription saved successfully");
      res.json({ success: true });
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(400).json({ message: "Invalid subscription data" });
    }
  });

  app.post('/api/notifications/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const { endpoint } = req.body;
      // Note: Would need to add a method to remove subscriptions by endpoint
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove push subscription" });
    }
  });

  // Document management routes
  app.get('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const { category } = req.query;
      
      const documents = await storage.getUserAccessibleDocuments(
        userId, 
        user?.role || 'employee', 
        user?.department || ''
      );
      
      const filteredDocs = category 
        ? documents.filter(doc => doc.category === category)
        : documents;
        
      res.json(filteredDocs);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post('/api/documents', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        uploadedBy: userId
      });
      
      const document = await storage.createDocument(documentData);
      
      // Log the upload action
      await storage.logDocumentActivity({
        documentId: document.id,
        userId,
        action: 'upload',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.get('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const documentId = parseInt(req.params.id);
      
      const hasAccess = await storage.checkDocumentAccess(
        documentId, 
        userId, 
        user?.role || 'employee', 
        user?.department || ''
      );
      
      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Log the view action
      await storage.logDocumentActivity({
        documentId,
        userId,
        action: 'view',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.patch('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const documentId = parseInt(req.params.id);
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Only owner or admin can update
      if (document.uploadedBy !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updatedDocument = await storage.updateDocument(documentId, req.body);
      
      // Log the update action
      await storage.logDocumentActivity({
        documentId,
        userId,
        action: 'update',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete('/api/documents/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const documentId = parseInt(req.params.id);
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Only owner or admin can delete
      if (document.uploadedBy !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteDocument(documentId);
      
      // Log the delete action
      await storage.logDocumentActivity({
        documentId,
        userId,
        action: 'delete',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // File upload endpoint
  app.post('/api/documents/upload', isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.claims.sub;
      const { category = 'general', description = '', isPublic = false } = req.body;

      const documentData = {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        category,
        description,
        uploadedBy: userId,
        isPublic: isPublic === 'true'
      };

      const document = await storage.createDocument(documentData);

      // Log the upload action
      await storage.logDocumentActivity({
        documentId: document.id,
        userId,
        action: 'upload',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(document);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // File download endpoint
  app.get('/api/documents/:id/download', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const documentId = parseInt(req.params.id);

      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check access permissions
      const hasAccess = await storage.checkDocumentAccess(
        documentId,
        userId,
        user?.role || 'employee',
        user?.department || ''
      );

      if (!hasAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Log the download action
      await storage.logDocumentActivity({
        documentId,
        userId,
        action: 'download',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Send file
      res.download(document.filePath, document.originalName);
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // Document permissions routes
  app.post('/api/documents/:id/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const documentId = parseInt(req.params.id);
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Only owner or admin can grant permissions
      if (document.uploadedBy !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const permissionData = insertDocumentPermissionSchema.parse({
        ...req.body,
        documentId,
        grantedBy: userId
      });
      
      const permission = await storage.grantDocumentPermission(permissionData);
      res.json(permission);
    } catch (error) {
      console.error("Error creating document permission:", error);
      res.status(500).json({ message: "Failed to create permission" });
    }
  });

  app.get('/api/documents/:id/permissions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const documentId = parseInt(req.params.id);
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Only owner or admin can view permissions
      if (document.uploadedBy !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const permissions = await storage.getDocumentPermissions(documentId);
      res.json(permissions);
    } catch (error) {
      console.error("Error fetching document permissions:", error);
      res.status(500).json({ message: "Failed to fetch permissions" });
    }
  });

  app.delete('/api/documents/permissions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const permissionId = parseInt(req.params.id);
      
      // Get permission to check document ownership
      const permissions = await storage.getDocumentPermissions(0); // We'll need to modify this
      // For now, allow admin or permission granter to revoke
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.revokeDocumentPermission(permissionId);
      res.json({ message: "Permission revoked successfully" });
    } catch (error) {
      console.error("Error revoking document permission:", error);
      res.status(500).json({ message: "Failed to revoke permission" });
    }
  });

  app.get('/api/documents/:id/logs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const documentId = parseInt(req.params.id);
      
      const document = await storage.getDocumentById(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      // Only owner or admin can view logs
      if (document.uploadedBy !== userId && user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const logs = await storage.getDocumentLogs(documentId);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching document logs:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Catch-all handler (MUST be last)
  app.get('*', (req, res) => {
    // If it's an API route, return 404
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ message: 'API endpoint not found' });
    }
    
    // For any other route, redirect to root
    res.redirect('/');
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Subscribe to specific channels
            ws.send(JSON.stringify({ type: 'subscribed', channel: data.channel }));
            break;
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });

    // Send welcome message
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'connected', message: 'Welcome to Pine Hill Farm' }));
    }
  });

  return httpServer;
}
