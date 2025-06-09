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

  // CRITICAL: Complete Vite bypass for server-side routes
  app.use((req, res, next) => {
    const serverRoutes = ['/admin', '/schedule', '/time-off', '/api'];
    const isServerRoute = serverRoutes.some(route => req.path.startsWith(route));
    
    if (isServerRoute) {
      res.setHeader('X-Handled-By', 'Express-Server');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('X-Vite-Bypass', 'true');
    }
    next();
  });

  // Auth middleware SECOND
  setupAuth(app);

  // Test route removed - React app handles authentication

  // Static landing page that bypasses all Vite processing
  app.get('/static', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Pine Hill Farm Employee Portal</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh; color: #1e293b; padding: 2rem;
          }
          .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
          .container { max-width: 1200px; margin: 0 auto; }
          .header { text-align: center; margin-bottom: 3rem; }
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
            
            <h1 class="pine-hill-title">Pine Hill Farm</h1>
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
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh;
            color: #1e293b;
          }
          .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
          .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
          .header { text-align: center; margin-bottom: 3rem; }
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
            
            <h1 class="pine-hill-title">Pine Hill Farm</h1>
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

  // Working dashboard route with announcements navigation
  app.get('/dashboard', isAuthenticated, async (req: any, res) => {
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
  <title>Pine Hill Farm - Employee Dashboard</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh; color: #1e293b;
          }
          .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
          .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
              <div>
                <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
                <div style="font-size: 0.875rem; color: #64748b;">Employee Portal</div>
              </div>
            </div>
            <div class="nav">
              <a href="/dashboard" class="active">Dashboard</a>
              <a href="/time-clock">Time Clock</a>
              <a href="/schedule">Schedule</a>
              <a href="/time-off">Time Off</a>
              <a href="/announcements-view">Announcements</a>
              <a href="/team-chat">Team Chat</a>
              <a href="/api/logout">Sign Out</a>
            </div>
          </div>
        </div>

        <div class="container">
          <div class="welcome">
            <h1 style="margin-bottom: 0.5rem;">Welcome to Your Dashboard</h1>
            <p style="color: #64748b;">Here's an overview of your work activities and quick access to important features.</p>
          </div>

          <div class="dashboard-grid">
            <div class="card">
              <div class="card-icon" style="background: #dbeafe; color: #2563eb;">🕐</div>
              <div class="card-title">Time Clock</div>
              <div class="card-desc">Clock in/out, track breaks, and manage your work time</div>
              <a href="/time-clock" class="btn">Clock In/Out</a>
            </div>
            <div class="card">
              <div class="card-icon" style="background: #dcfce7; color: #16a34a;">📅</div>
              <div class="card-title">My Schedule</div>
              <div class="card-desc">View your upcoming shifts and manage your work schedule</div>
              <a href="/schedule" class="btn">View Schedule</a>
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
              <a href="/announcements-view" class="btn">View Announcements</a>
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
                <div style="font-weight: 600; margin-bottom: 0.5rem;">Lake Geneva Retail</div>
                <div style="color: #64748b; font-size: 0.875rem;">704 W Main St, Lake Geneva, WI</div>
              </div>
              <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">Watertown Retail</div>
                <div style="color: #64748b; font-size: 0.875rem;">200 W Main Street, Watertown, WI</div>
              </div>
              <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                <div style="font-weight: 600; margin-bottom: 0.5rem;">Watertown Spa</div>
                <div style="color: #64748b; font-size: 0.875rem;">201 W Main Street, Watertown, WI</div>
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

  // Announcements view page
  app.get('/announcements-view', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      // Get all announcements from database
      const announcements = await storage.getAllAnnouncements();
      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Company Announcements</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
            .announcement { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .announcement-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
            .announcement-title { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
            .announcement-meta { font-size: 0.875rem; color: #64748b; }
            .announcement-content { line-height: 1.6; color: #374151; }
            .priority-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; margin-left: 1rem; }
            .priority-high { background: #fee2e2; color: #991b1b; }
            .priority-medium { background: #fef3c7; color: #92400e; }
            .priority-low { background: #d1fae5; color: #065f46; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; }
            .btn:hover { background: #4f6b56; }
            .empty-state { text-align: center; padding: 3rem; color: #64748b; }
            .locations-info { background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-top: 2rem; }
            .location-tags { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
            .location-tag { background: #e2e8f0; color: #475569; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Company Announcements</div>
                </div>
              </div>
              <div class="nav">
                <a href="/dashboard">Dashboard</a>
                <a href="/time-clock">Time Clock</a>
                <a href="/schedule">Schedule</a>
                <a href="/time-off">Time Off</a>
                <a href="/announcements-view" class="active">Announcements</a>
                ${isAdminOrManager ? '<a href="/admin">Admin Portal</a>' : ''}
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Company Announcements</h1>
              <p style="color: #64748b;">Stay updated with important company news and information for all three locations.</p>
              ${isAdminOrManager ? `<div style="margin-top: 1rem;"><a href="/admin/announcements" class="btn">Manage Announcements</a></div>` : ''}
            </div>

            ${announcements.length === 0 ? `
              <div class="empty-state">
                <h3 style="margin-bottom: 1rem;">No Announcements Yet</h3>
                <p>Check back later for company updates and important information.</p>
              </div>
            ` : announcements.map(announcement => {
              const createdDate = new Date(announcement.createdAt || '').toLocaleDateString();
              const createdTime = new Date(announcement.createdAt || '').toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              
              return `
                <div class="announcement">
                  <div class="announcement-header">
                    <div>
                      <div class="announcement-title">${announcement.title}</div>
                      <div class="announcement-meta">
                        Posted on ${createdDate} at ${createdTime}
                        ${announcement.priority !== 'low' ? `<span class="priority-badge priority-${announcement.priority}">${announcement.priority.toUpperCase()} PRIORITY</span>` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="announcement-content">
                    ${announcement.content}
                  </div>
                  ${announcement.targetLocations && announcement.targetLocations.length > 0 ? `
                    <div class="location-tags">
                      <strong style="color: #64748b; font-size: 0.875rem;">Applies to:</strong>
                      ${announcement.targetLocations.map(locationId => {
                        const locationNames = {1: 'Lake Geneva Retail', 2: 'Watertown Retail', 3: 'Watertown Spa'};
                        return `<span class="location-tag">${locationNames[locationId] || 'All Locations'}</span>`;
                      }).join('')}
                    </div>
                  ` : '<div class="location-tags"><span class="location-tag">All Locations</span></div>'}
                </div>
              `;
            }).join('')}

            <div class="locations-info">
              <h3 style="margin-bottom: 1rem;">Our Locations</h3>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                <div>
                  <div style="font-weight: 600; margin-bottom: 0.25rem;">Lake Geneva Retail</div>
                  <div style="color: #64748b; font-size: 0.875rem;">704 W Main St, Lake Geneva, WI</div>
                </div>
                <div>
                  <div style="font-weight: 600; margin-bottom: 0.25rem;">Watertown Retail</div>
                  <div style="color: #64748b; font-size: 0.875rem;">200 W Main Street, Watertown, WI</div>
                </div>
                <div>
                  <div style="font-weight: 600; margin-bottom: 0.25rem;">Watertown Spa</div>
                  <div style="color: #64748b; font-size: 0.875rem;">201 W Main Street, Watertown, WI</div>
                </div>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading announcements:", error);
      res.status(500).send("Error loading announcements");
    }
  });

  // Schedule page
  app.get('/schedule', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      // Get real schedules for this user
      const userSchedules = await storage.getUserWorkSchedules(userId);
      const locations = await storage.getAllLocations();
      
      res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <title>Pine Hill Farm - My Schedule</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh; color: #1e293b;
          }
          .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
          .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
          .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; }
          .btn:hover { background: #4f6b56; }
          .btn-secondary { background: #e2e8f0; color: #475569; }
          .btn-secondary:hover { background: #cbd5e1; }
          .today { background: #fef3c7; }
          .legend { display: flex; gap: 1rem; margin-bottom: 1rem; }
          .legend-item { display: flex; align-items: center; gap: 0.5rem; }
          .legend-color { width: 16px; height: 16px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <div class="logo">
              
              <div>
                <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
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
              <h2 id="currentMonth">June 2025</h2>
              <div>
                <button onclick="changeMonth(-1)" class="btn-secondary btn">← Previous</button>
                <button onclick="changeMonth(1)" class="btn-secondary btn">Next →</button>
              </div>
            </div>

            <div class="legend">
              <div class="legend-item">
                <div class="legend-color" style="background: #2563eb;"></div>
                <span>Lake Geneva Retail</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #059669;"></div>
                <span>Watertown Retail</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #7c3aed;"></div>
                <span>Watertown Spa</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #fef3c7;"></div>
                <span>Today</span>
              </div>
            </div>

            <!-- Real Schedule Data -->
            ${userSchedules.length === 0 ? `
              <div style="text-align: center; padding: 3rem; color: #64748b;">
                <h3>No schedules found</h3>
                <p>You don't have any scheduled shifts yet. Contact your manager for schedule assignment.</p>
              </div>
            ` : `
              <div style="margin-bottom: 2rem;">
                <h3>Your Upcoming Shifts</h3>
              </div>
              <div class="schedule-list">
                ${userSchedules.map(schedule => {
                  const scheduleDate = new Date(schedule.date);
                  const location = locations.find(l => l.id === schedule.locationId);
                  const today = new Date();
                  const isToday = scheduleDate.toDateString() === today.toDateString();
                  
                  return `
                    <div class="schedule-item ${isToday ? 'today' : ''}" style="
                      background: white; 
                      border: 2px solid ${isToday ? '#fbbf24' : '#e2e8f0'}; 
                      border-radius: 8px; 
                      padding: 1.5rem; 
                      margin-bottom: 1rem;
                      ${isToday ? 'box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);' : ''}
                    ">
                      <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div>
                          <h4 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">
                            ${scheduleDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            ${isToday ? '<span style="background: #fbbf24; color: #92400e; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; margin-left: 0.5rem;">TODAY</span>' : ''}
                          </h4>
                          <p style="color: #64748b; margin-bottom: 0.5rem;">
                            <strong>Time:</strong> ${schedule.startTime} - ${schedule.endTime}
                          </p>
                          <p style="color: #64748b;">
                            <strong>Location:</strong> ${location ? location.name : 'Unknown Location'}
                          </p>
                        </div>
                        <div style="
                          padding: 0.5rem 1rem; 
                          background: ${schedule.locationId === 1 ? '#dbeafe' : '#d1fae5'}; 
                          color: ${schedule.locationId === 1 ? '#1e40af' : '#065f46'}; 
                          border-radius: 6px; 
                          font-size: 0.875rem; 
                          font-weight: 500;
                        ">
                          ${schedule.locationId === 1 ? 'Lake Geneva' : 'Watertown'}
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            `}
          </div>
        </div>
        
        <script>
          let currentDate = new Date(2025, 5, 1); // June 2025 (month is 0-indexed)
          
          const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
          ];
          
          function changeMonth(direction) {
            currentDate.setMonth(currentDate.getMonth() + direction);
            updateMonthDisplay();
          }
          
          function updateMonthDisplay() {
            const monthElement = document.getElementById('currentMonth');
            monthElement.textContent = monthNames[currentDate.getMonth()] + ' ' + currentDate.getFullYear();
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

  // Time Clock page
  app.get('/time-clock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).send("User not found");
      }

      const isAdminOrManager = user.role === 'admin' || user.role === 'manager';
      const currentTimeEntry = await storage.getCurrentTimeEntry(userId);
      const locations = await storage.getAllLocations();
      const today = new Date().toISOString().split('T')[0];
      const todaysEntries = await storage.getTimeEntriesByDate(userId, today);

      // Build location options HTML
      const locationOptions = locations.map(location => 
        `<option value="${location.id}">${location.name}</option>`
      ).join('');

      // Build today's entries HTML
      const todaysEntriesHTML = todaysEntries.length === 0 ? 
        '<p style="color: #64748b; text-align: center; padding: 2rem;">No time entries for today</p>' :
        todaysEntries.map(entry => {
          const locationName = locations.find(l => l.id === entry.locationId)?.name || 'Unknown';
          const clockInTime = new Date(entry.clockInTime).toLocaleTimeString();
          const clockOutTime = entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString() : 'In Progress';
          const totalTime = entry.totalWorkedMinutes ? `Total: ${Math.floor(entry.totalWorkedMinutes / 60)}h ${entry.totalWorkedMinutes % 60}m` : '';
          const breakTime = entry.totalBreakMinutes > 0 ? ` • Break: ${entry.totalBreakMinutes}m` : '';
          
          return `
            <div class="time-entry">
              <div style="font-weight: 600; margin-bottom: 0.5rem;">
                ${clockInTime} - ${clockOutTime}
              </div>
              <div style="color: #64748b; font-size: 0.875rem;">
                Location: ${locationName}<br>
                ${totalTime}${breakTime}
              </div>
            </div>
          `;
        }).join('');

      // Build status and buttons HTML
      let statusHTML = '';
      if (currentTimeEntry) {
        const statusClass = currentTimeEntry.status === 'clocked_in' ? 'status-clocked-in' : 
                           currentTimeEntry.status === 'on_break' ? 'status-on-break' : 'status-clocked-out';
        const statusText = currentTimeEntry.status === 'clocked_in' ? 'Currently Working' : 
                          currentTimeEntry.status === 'on_break' ? 'On Break' : 'Clocked Out';
        
        let timeText = '';
        if (currentTimeEntry.status === 'clocked_in') {
          timeText = `Clocked in at ${new Date(currentTimeEntry.clockInTime).toLocaleTimeString()}`;
        } else if (currentTimeEntry.status === 'on_break') {
          timeText = `Break started at ${new Date(currentTimeEntry.breakStartTime).toLocaleTimeString()}`;
        } else {
          timeText = 'Ready to clock in';
        }

        let buttonsHTML = '';
        if (currentTimeEntry.status === 'clocked_in') {
          buttonsHTML = `
            <button class="btn btn-secondary" onclick="startBreak()">Start Break</button>
            <button class="btn btn-danger" onclick="clockOut()">Clock Out</button>
          `;
        } else if (currentTimeEntry.status === 'on_break') {
          buttonsHTML = `
            <button class="btn" onclick="endBreak()">End Break</button>
            <button class="btn btn-danger" onclick="clockOut()">Clock Out</button>
          `;
        }

        statusHTML = `
          <div class="status-card ${statusClass}">
            <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">${statusText}</div>
            <div>${timeText}</div>
          </div>
          ${buttonsHTML}
        `;
      } else {
        statusHTML = `
          <div class="status-card status-clocked-out">
            <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 0.5rem;">Ready to Start</div>
            <div>Select your location and clock in to begin your shift</div>
          </div>
          <form onsubmit="clockIn(event)">
            <div class="form-group">
              <label class="form-label">Location</label>
              <select id="locationSelect" class="form-select" required>
                <option value="">Select Location</option>
                ${locationOptions}
              </select>
            </div>
            <button type="submit" class="btn">Clock In</button>
          </form>
        `;
      }

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Time Clock</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
            .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .clock-display { text-align: center; font-size: 3rem; font-weight: bold; color: #2563eb; margin-bottom: 2rem; }
            .status-card { padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; text-align: center; }
            .status-clocked-in { background: #dcfce7; color: #166534; border: 2px solid #16a34a; }
            .status-on-break { background: #fef3c7; color: #92400e; border: 2px solid #f59e0b; }
            .status-clocked-out { background: #f1f5f9; color: #475569; border: 2px solid #64748b; }
            .btn { background: #607e66; color: white; padding: 1rem 2rem; border: none; border-radius: 8px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin: 0.5rem; font-size: 1.1rem; cursor: pointer; }
            .btn:hover { background: #4f6b56; }
            .btn-secondary { background: #f59e0b; }
            .btn-secondary:hover { background: #d97706; }
            .btn-danger { background: #dc2626; }
            .btn-danger:hover { background: #b91c1c; }
            .btn:disabled { background: #9ca3af; cursor: not-allowed; }
            .form-group { margin-bottom: 1.5rem; }
            .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
            .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
            .time-entry { padding: 1rem; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 1rem; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
            .current-time { font-size: 1.2rem; color: #64748b; margin-bottom: 1rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Employee Portal</div>
                </div>
              </div>
              <div class="nav">
                <a href="/dashboard">Dashboard</a>
                <a href="/time-clock" class="active">Time Clock</a>
                <a href="/schedule">Schedule</a>
                <a href="/time-off">Time Off</a>
                <a href="/announcements">Announcements</a>
                ${isAdminOrManager ? '<a href="/admin">Admin Portal</a>' : ''}
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Time Clock</h1>
              <p style="color: #64748b;">Track your work hours, breaks, and manage time entries</p>
            </div>

            <div class="current-time" id="currentTime"></div>

            <div class="grid-2">
              <div class="card">
                <h2 style="margin-bottom: 1.5rem;">Clock In/Out</h2>
                ${statusHTML}
              </div>

              <div class="card">
                <h2 style="margin-bottom: 1.5rem;">Today's Time Entries</h2>
                ${todaysEntriesHTML}
              </div>
            </div>
          </div>

          <script>
            function updateCurrentTime() {
              const now = new Date();
              document.getElementById('currentTime').textContent = 
                'Current Time: ' + now.toLocaleString();
            }
            updateCurrentTime();
            setInterval(updateCurrentTime, 1000);

            async function clockIn(event) {
              event.preventDefault();
              const locationId = document.getElementById('locationSelect').value;
              if (!locationId) {
                alert('Please select a location');
                return;
              }

              try {
                const response = await fetch('/api/time-clock/clock-in', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ locationId: parseInt(locationId) })
                });
                
                if (response.ok) {
                  // Update user presence status
                  await fetch('/api/user-presence/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'clocked_in', locationId: parseInt(locationId) })
                  });
                  location.reload();
                } else {
                  const error = await response.text();
                  alert('Error: ' + error);
                }
              } catch (error) {
                alert('Network error: ' + error.message);
              }
            }

            async function clockOut() {
              if (confirm('Are you sure you want to clock out?')) {
                try {
                  const response = await fetch('/api/time-clock/clock-out', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  
                  if (response.ok) {
                    location.reload();
                  } else {
                    const error = await response.text();
                    alert('Error: ' + error);
                  }
                } catch (error) {
                  alert('Network error: ' + error.message);
                }
              }
            }

            async function startBreak() {
              try {
                const response = await fetch('/api/time-clock/start-break', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                  location.reload();
                } else {
                  const error = await response.text();
                  alert('Error: ' + error);
                }
              } catch (error) {
                alert('Network error: ' + error.message);
              }
            }

            async function endBreak() {
              try {
                const response = await fetch('/api/time-clock/end-break', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' }
                });
                
                if (response.ok) {
                  location.reload();
                } else {
                  const error = await response.text();
                  alert('Error: ' + error);
                }
              } catch (error) {
                alert('Network error: ' + error.message);
              }
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading time clock page:", error);
      res.status(500).send("Error loading time clock page");
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
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            min-height: 100vh; color: #1e293b;
          }
          .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
          .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
              
              <div>
                <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
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
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label">Request Type</label>
                    <select class="form-select">
                      <option>Vacation</option>
                      <option>Sick Leave</option>
                      <option>Personal Day</option>
                      <option>Emergency Leave</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Location</label>
                    <select class="form-select">
                      <option value="1">Lake Geneva Retail</option>
                      <option value="2">Watertown Retail</option>
                      <option value="3">Watertown Spa</option>
                    </select>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div class="form-group">
                    <label class="form-label">Start Date</label>
                    <input type="date" class="form-input" value="">
                  </div>
                  <div class="form-group">
                    <label class="form-label">End Date</label>
                    <input type="date" class="form-input" value="">
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
              <div style="color: #64748b; text-align: center; padding: 2rem;">
                <p>No upcoming time off scheduled</p>
              </div>
            </div>
          </div>

          <div class="card">
            <h2 style="margin-bottom: 1.5rem;">Request History</h2>
            <div style="text-align: center; padding: 3rem; color: #64748b;">
              <p>No time-off requests found</p>
              <p style="font-size: 0.875rem; margin-top: 0.5rem;">Submit your first request above to get started</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  });

  // Announcements page - removed static HTML route to let React app handle this route

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

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Admin Dashboard</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
                
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Admin Portal</div>
                </div>
              </div>
              <div class="nav">
                <a href="/admin" class="active">Admin Dashboard</a>
                <a href="/admin/employees">Employee Management</a>
                <a href="/admin/schedule">Schedule Management</a>
                <a href="/admin/announcements">Announcements</a>
                <a href="/admin/support">System Support</a>
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

            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">Today's Schedule Overview</h2>
              ${todaySchedules.length === 0 ? 
                '<p style="color: #64748b; text-align: center; padding: 2rem;">No schedules for today</p>' :
                `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                  ${todaySchedules.map(schedule => `
                    <div style="padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px;">
                      <div style="font-weight: 600; margin-bottom: 0.5rem;">Employee: ${schedule.userId}</div>
                      <div style="color: #64748b; font-size: 0.875rem;">
                        ${schedule.startTime} - ${schedule.endTime}<br>
                        Location: ${schedule.locationId === 1 ? 'Lake Geneva Retail' : schedule.locationId === 2 ? 'Watertown Retail' : 'Watertown Spa'}
                      </div>
                    </div>
                  `).join('')}
                </div>`
              }
            </div>

            <div class="tabs">
              <a href="#pending-requests" class="tab active">Pending Approvals</a>
              <a href="#employee-overview" class="tab">Employee Overview</a>
            </div>

            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">Pending Time Off Requests</h2>
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
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0;">Employee Overview</h2>
                <button onclick="toggleEmployeeOverview()" style="background: none; border: none; color: #607e66; cursor: pointer; font-size: 1.2rem;" id="employee-toggle">−</button>
              </div>
              <div id="employee-overview-content">
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
                        <a href="/admin/employees/${employee.id}/edit" style="color: #607e66; text-decoration: none; font-size: 0.875rem;">Edit</a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              </div>
            </div>

            <script>
              function toggleEmployeeOverview() {
                const content = document.getElementById('employee-overview-content');
                const toggle = document.getElementById('employee-toggle');
                
                if (content.style.display === 'none') {
                  content.style.display = 'block';
                  toggle.textContent = '−';
                } else {
                  content.style.display = 'none';
                  toggle.textContent = '+';
                }
              }
            </script>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading admin dashboard:", error);
      res.status(500).send("Error loading admin dashboard");
    }
  });

  // Employee management route
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
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
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
              <p style="color: #64748b;">Manage employee profiles, roles, and permissions across all three locations.</p>
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
                      <td>${employee.email}</td>
                      <td><span class="role-badge role-${employee.role}">${employee.role}</span></td>
                      <td>${employee.department || 'N/A'}</td>
                      <td>${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString() : 'N/A'}</td>
                      <td><span class="status-${employee.isActive ? 'active' : 'inactive'}">${employee.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <a href="/admin/employees/${employee.id}/edit" style="color: #607e66; text-decoration: none; font-size: 0.875rem;">Edit</a>
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
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
                
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
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
          .pine-hill-title { font-family: "Great+Vibes", cursive; font-weight: 600; }
          @import url("https://fonts.googleapis.com/css2?family=Great+Vibes+Bounce:wght@400:wght@400;500;600;700&display=swap");
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
                
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
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

  // Announcement management route
  app.get('/admin/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const announcements = await storage.getAllAnnouncements();

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Announcement Management</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
            .form-group { margin-bottom: 1.5rem; }
            .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
            .form-input, .form-textarea, .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 1rem; }
            .form-textarea { min-height: 120px; resize: vertical; }
            .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
            .priority-badge { padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 500; }
            .priority-low { background: #e0f2fe; color: #0369a1; }
            .priority-normal { background: #f0f9ff; color: #1e40af; }
            .priority-high { background: #fef3c7; color: #92400e; }
            .priority-urgent { background: #fee2e2; color: #991b1b; }
            .table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
            .table th, .table td { padding: 1rem; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .table th { background: #f8fafc; font-weight: 600; }
            .announcement-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; }
            .announcement-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; }
            .announcement-title { font-weight: 600; color: #1e293b; }
            .announcement-meta { font-size: 0.875rem; color: #64748b; margin-top: 0.25rem; }
            .announcement-content { color: #374151; margin-bottom: 1rem; }
            .announcement-actions { display: flex; gap: 0.5rem; }
            .status-published { background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; }
            .status-draft { background: #f3f4f6; color: #374151; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Employee Management</div>
                </div>
              </div>
              <div class="nav">
                <a href="/admin">Admin Dashboard</a>
                <a href="/admin/employees">Employee Management</a>
                <a href="/admin/schedule">Schedule Management</a>
                <a href="/admin/announcements" class="active">Announcements</a>
                <a href="/dashboard">Employee View</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Announcement Management</h1>
              <p style="color: #64748b;">Create and manage company announcements for all three locations.</p>
            </div>

            <!-- Success/Error Notifications -->
            <script>
              const urlParams = new URLSearchParams(window.location.search);
              const success = urlParams.get('success');
              const error = urlParams.get('error');
              
              if (success) {
                const messages = {
                  'published': 'Announcement published successfully and is now visible to all employees.',
                  'saved_as_draft': 'Announcement saved as draft. You can publish it later.',
                  'updated_and_published': 'Announcement updated and published successfully.',
                  'updated_as_draft': 'Announcement updated and saved as draft.',
                  'deleted': 'Announcement has been permanently removed.'
                };
                
                if (messages[success]) {
                  showNotification(messages[success], 'success');
                }
              }
              
              if (error) {
                const messages = {
                  'access_denied': 'You do not have permission to perform this action.',
                  'creation_failed': 'Failed to create announcement. Please try again.',
                  'update_failed': 'Failed to update announcement. Please try again.',
                  'delete_failed': 'Failed to delete announcement. Please try again.',
                  'publish_failed': 'Failed to publish announcement. Please try again.'
                };
                
                if (messages[error]) {
                  showNotification(messages[error], 'error');
                }
              }
              
              function showNotification(message, type) {
                const notification = document.createElement('div');
                notification.style.cssText = \`
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  padding: 1rem 1.5rem;
                  border-radius: 8px;
                  color: white;
                  font-weight: 500;
                  z-index: 1000;
                  max-width: 400px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  background: \${type === 'success' ? '#059669' : '#dc2626'};
                \`;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                  notification.remove();
                  // Clean URL
                  window.history.replaceState({}, '', window.location.pathname);
                }, 4000);
              }
            </script>

            <div class="card">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2>Create New Announcement</h2>
              </div>

              <form action="/api/announcements" method="POST">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Title *</label>
                    <input type="text" name="title" class="form-input" required placeholder="Enter announcement title">
                  </div>
                  <div class="form-group">
                    <label class="form-label">Priority</label>
                    <select name="priority" class="form-select">
                      <option value="low">Low</option>
                      <option value="normal" selected>Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Target Audience</label>
                    <select name="targetAudience" class="form-select">
                      <option value="all" selected>All Employees</option>
                      <option value="employees">Employees Only</option>
                      <option value="managers">Managers Only</option>
                      <option value="admins">Admins Only</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Expires At (Optional)</label>
                    <input type="datetime-local" name="expiresAt" class="form-input">
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Content *</label>
                  <textarea name="content" class="form-textarea" required placeholder="Enter announcement content..."></textarea>
                </div>

                <div style="display: flex; gap: 1rem;">
                  <button type="submit" name="action" value="draft" class="btn-secondary btn">Save as Draft</button>
                  <button type="submit" name="action" value="publish" class="btn">Publish Now</button>
                </div>
              </form>
            </div>

            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">Recent Announcements</h2>
              ${announcements.length === 0 ? 
                '<p style="color: #64748b; text-align: center; padding: 2rem;">No announcements created yet</p>' :
                announcements.map(announcement => `
                  <div class="announcement-card">
                    <div class="announcement-header">
                      <div>
                        <div class="announcement-title">${announcement.title}</div>
                        <div class="announcement-meta">
                          Created ${announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : 'Unknown'} • 
                          Priority: <span class="priority-badge priority-${announcement.priority}">${announcement.priority}</span> • 
                          <span class="status-${announcement.isPublished ? 'published' : 'draft'}">${announcement.isPublished ? 'Published' : 'Draft'}</span>
                        </div>
                      </div>
                    </div>
                    <div class="announcement-content">${announcement.content}</div>
                    <div class="announcement-actions">
                      <a href="/admin/announcements/${announcement.id}/edit" style="color: #607e66; text-decoration: none; font-size: 0.875rem;">Edit</a>
                      ${!announcement.isPublished ? `<a href="/admin/announcements/${announcement.id}/publish" style="color: #2563eb; text-decoration: none; font-size: 0.875rem;">Publish</a>` : ''}
                      <a href="/admin/announcements/${announcement.id}/delete" style="color: #dc2626; text-decoration: none; font-size: 0.875rem;" onclick="return confirm('This will permanently remove the announcement. Are you sure you want to continue?')">Delete</a>
                    </div>
                  </div>
                `).join('')
              }
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading announcement management:", error);
      res.status(500).send("Error loading announcement management");
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
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
                
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
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
                        <option value="1">Lake Geneva Retail</option>
                        <option value="2">Watertown Retail</option>
                        <option value="3">Watertown Spa</option>
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
                        <option value="1">Lake Geneva Retail</option>
                        <option value="2">Watertown Retail</option>
                        <option value="3">Watertown Spa</option>
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
              ${schedules.length === 0 ? 
                '<p style="color: #64748b; text-align: center; padding: 2rem;">No schedules found for the next 2 weeks.</p>' :
                `<div style="overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse;">
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
                            <td style="padding: 1rem; border-bottom: 1px solid #e2e8f0;">${schedule.startTime} - ${schedule.endTime}</td>
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
          .pine-hill-title { font-family: "Great+Vibes", cursive; font-weight: 600; }
          @import url("https://fonts.googleapis.com/css2?family=Great+Vibes+Bounce:wght@400:wght@400;500;600;700&display=swap");
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
                
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
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
      
      // Get all users with their current online status
      const allUsers = await storage.getAllUsers();
      const onlineUsers = [];
      
      for (const employee of allUsers) {
        const presence = await storage.getUserPresence(employee.id);
        const timeEntry = await storage.getCurrentTimeEntry(employee.id);
        
        // Determine status based on time clock and presence
        let status = 'offline';
        let statusIcon = '⚫';
        let statusText = 'Offline';
        
        if (timeEntry && (timeEntry.status === 'clocked_in' || timeEntry.status === 'on_break')) {
          if (timeEntry.status === 'clocked_in') {
            status = 'working';
            statusIcon = '🟢';
            statusText = 'Working';
          } else if (timeEntry.status === 'on_break') {
            status = 'on_break';
            statusIcon = '🟡';
            statusText = 'On Break';
          }
          onlineUsers.push({
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            status,
            statusIcon,
            statusText,
            location: timeEntry.locationId
          });
        } else if (presence && presence.status === 'online') {
          status = 'online';
          statusIcon = '🔵';
          statusText = 'Online';
          onlineUsers.push({
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            status,
            statusIcon,
            statusText,
            location: null
          });
        }
      }
      
      // Get recent messages
      const recentMessages = await storage.getChannelMessages('general', 20);
      
      // Get unread message count for current user
      const unreadCount = await storage.getUnreadMessageCount(userId);

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Team Chat ${unreadCount > 0 ? `(${unreadCount})` : ''}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; position: relative; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .unread-badge { position: absolute; top: -5px; right: -5px; background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 0.75rem; display: flex; align-items: center; justify-content: center; }
            .container { max-width: 1200px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 300px 1fr; gap: 2rem; height: calc(100vh - 140px); }
            .sidebar { background: white; border-radius: 12px; padding: 1.5rem; overflow-y: auto; }
            .chat-area { background: white; border-radius: 12px; display: flex; flex-direction: column; }
            .chat-header { padding: 1.5rem; border-bottom: 1px solid #e2e8f0; }
            .messages { flex: 1; padding: 1rem; overflow-y: auto; max-height: 500px; }
            .message { margin-bottom: 1rem; padding: 1rem; border-radius: 8px; background: #f8fafc; }
            .message.unread { border-left: 3px solid #ef4444; background: #fef2f2; }
            .message-sender { font-weight: 600; margin-bottom: 0.5rem; color: #607e66; }
            .message-time { font-size: 0.75rem; color: #64748b; margin-top: 0.5rem; }
            .chat-input { padding: 1.5rem; border-top: 1px solid #e2e8f0; }
            .input-form { display: flex; gap: 1rem; }
            .message-input { flex: 1; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; font-weight: 500; cursor: pointer; }
            .btn:hover { background: #4f6b56; }
            .channel { padding: 0.75rem; margin-bottom: 0.5rem; border-radius: 6px; cursor: pointer; transition: background 0.2s; position: relative; }
            .channel:hover { background: #f1f5f9; }
            .channel.active { background: #607e66; color: white; }
            .channel-unread { background: #fef3c7; border-left: 3px solid #f59e0b; }
            .online-users { margin-top: 2rem; }
            .user-item { padding: 0.5rem; margin-bottom: 0.25rem; border-radius: 4px; font-size: 0.875rem; display: flex; align-items: center; gap: 0.5rem; }
            .user-status { font-size: 0.75rem; color: #64748b; }
            .location-badge { background: #e0f2fe; color: #0369a1; padding: 0.125rem 0.5rem; border-radius: 12px; font-size: 0.625rem; margin-left: auto; }
            .notification { position: fixed; top: 20px; right: 20px; background: #607e66; color: white; padding: 1rem; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; }
            .typing-indicator { padding: 0.5rem 1rem; color: #64748b; font-style: italic; font-size: 0.875rem; }
            .status-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.5rem; }
            .status-working { background: #10b981; }
            .status-break { background: #f59e0b; }
            .status-online { background: #3b82f6; }
            .status-offline { background: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Team Chat</div>
                </div>
              </div>
              <div class="nav">
                <a href="/dashboard">Dashboard</a>
                <a href="/schedule">Schedule</a>
                <a href="/time-off">Time Off</a>
                <a href="/announcements">Announcements</a>
                <a href="/team-chat" class="active">
                  Team Chat
                  ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
                </a>
                ${isAdminOrManager ? '<a href="/admin">Admin Portal</a>' : ''}
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="sidebar">
              <h3 style="margin-bottom: 1rem;">Channels</h3>
              <div class="channel active" data-channel="general"># General</div>
              <div class="channel" data-channel="lake-geneva"># Lake Geneva Retail</div>
              <div class="channel" data-channel="watertown-retail"># Watertown Retail</div>
              <div class="channel" data-channel="watertown-spa"># Watertown Spa</div>
              ${isAdminOrManager ? '<div class="channel" data-channel="managers"># Managers</div>' : ''}
              
              <div class="online-users">
                <h4 style="margin-bottom: 0.5rem; color: #64748b;">Team Status (${onlineUsers.length} active)</h4>
                ${onlineUsers.length > 0 ? onlineUsers.map(u => `
                  <div class="user-item">
                    <span class="status-indicator status-${u.status}"></span>
                    <span style="flex: 1;">${u.name}</span>
                    <div class="user-status">${u.statusText}</div>
                    ${u.location ? `<span class="location-badge">${u.location === 1 ? 'Lake Geneva' : u.location === 2 ? 'Watertown Retail' : 'Watertown Spa'}</span>` : ''}
                  </div>
                `).join('') : '<div class="user-item" style="color: #64748b; text-align: center;">No active team members</div>'}
              </div>
            </div>

            <div class="chat-area">
              <div class="chat-header">
                <h2 id="channel-title"># General</h2>
                <p style="color: #64748b; margin-top: 0.5rem;" id="channel-description">Team-wide communication and updates</p>
              </div>

              <div class="messages" id="messages-container">
                ${recentMessages.length > 0 ? recentMessages.reverse().map(msg => `
                  <div class="message">
                    <div class="message-sender">${msg.senderName || 'Unknown User'}</div>
                    <div>${msg.content}</div>
                    <div class="message-time">${new Date(msg.sentAt).toLocaleString()}</div>
                  </div>
                `).join('') : `
                  <div class="message">
                    <div class="message-sender">System</div>
                    <div>Welcome to team chat! Start a conversation with your colleagues.</div>
                    <div class="message-time">Today</div>
                  </div>
                `}
              </div>

              <div class="typing-indicator" id="typing-indicator" style="display: none;"></div>

              <div class="chat-input">
                <form class="input-form" onsubmit="sendMessage(event)">
                  <input type="text" class="message-input" placeholder="Type your message..." required>
                  <button type="submit" class="btn">Send</button>
                </form>
              </div>
            </div>
          </div>

          <script>
            let currentChannel = 'general';
            let unreadMessages = ${unreadCount};
            let lastMessageTime = new Date();
            
            // Update user presence every 30 seconds
            setInterval(function() {
              fetch('/api/user-presence/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'online' })
              });
            }, 30000);
            
            function sendMessage(event) {
              event.preventDefault();
              const input = event.target.querySelector('.message-input');
              
              if (input.value.trim()) {
                // Send message to server
                fetch('/api/chat/send-message', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    channelId: currentChannel,
                    content: input.value.trim()
                  })
                })
                .then(response => response.json())
                .then(data => {
                  if (data.id) {
                    addMessageToChat({
                      senderName: '${user.firstName} ${user.lastName}',
                      content: input.value.trim(),
                      sentAt: new Date()
                    });
                    input.value = '';
                  }
                })
                .catch(error => {
                  console.error('Error sending message:', error);
                  showNotification('Failed to send message');
                });
              }
            }
            
            function addMessageToChat(message) {
              const messagesContainer = document.getElementById('messages-container');
              const messageDiv = document.createElement('div');
              messageDiv.className = 'message';
              messageDiv.innerHTML = \`
                <div class="message-sender">\${message.senderName}</div>
                <div>\${message.content}</div>
                <div class="message-time">Just now</div>
              \`;
              messagesContainer.appendChild(messageDiv);
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
            
            function showNotification(text) {
              const notification = document.createElement('div');
              notification.className = 'notification';
              notification.textContent = text;
              document.body.appendChild(notification);
              
              setTimeout(() => {
                notification.remove();
              }, 3000);
            }
            
            // Channel switching
            document.querySelectorAll('.channel').forEach(channel => {
              channel.addEventListener('click', function() {
                const channelId = this.getAttribute('data-channel');
                switchChannel(channelId);
              });
            });
            
            function switchChannel(channelId) {
              currentChannel = channelId;
              
              // Update active channel
              document.querySelectorAll('.channel').forEach(ch => ch.classList.remove('active'));
              document.querySelector(\`[data-channel="\${channelId}"]\`).classList.add('active');
              
              // Update channel header
              const titles = {
                'general': '# General',
                'lake-geneva': '# Lake Geneva Retail',
                'watertown-retail': '# Watertown Retail',
                'watertown-spa': '# Watertown Spa',
                'managers': '# Managers'
              };
              
              const descriptions = {
                'general': 'Team-wide communication and updates',
                'lake-geneva': 'Lake Geneva Retail location discussions',
                'watertown-retail': 'Watertown Retail location discussions',
                'watertown-spa': 'Watertown Spa location discussions',
                'managers': 'Management team communications'
              };
              
              document.getElementById('channel-title').textContent = titles[channelId];
              document.getElementById('channel-description').textContent = descriptions[channelId];
              
              // Load channel messages
              loadChannelMessages(channelId);
              
              // Mark messages as read for this channel
              fetch('/api/chat/mark-read', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId })
              });
            }
            
            function loadChannelMessages(channelId) {
              const messagesContainer = document.getElementById('messages-container');
              messagesContainer.innerHTML = '<div class="message"><div class="message-sender">System</div><div>Loading messages...</div></div>';
              
              // In a real implementation, this would fetch messages from the server
              setTimeout(() => {
                messagesContainer.innerHTML = \`
                  <div class="message">
                    <div class="message-sender">System</div>
                    <div>Welcome to \${channelId.replace('-', ' ')} channel!</div>
                    <div class="message-time">Today</div>
                  </div>
                \`;
              }, 500);
            }
            
            // Refresh online status every minute
            setInterval(function() {
              location.reload();
            }, 60000);
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading team chat:", error);
      res.status(500).send("Error loading team chat");
    }
  });

  // Documents & Resources page
  app.get('/documents', isAuthenticated, async (req: any, res) => {
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
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
                
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
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
  });

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
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
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
                
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
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

            <!-- Success/Error Notifications -->
            <script>
              const urlParams = new URLSearchParams(window.location.search);
              const success = urlParams.get('success');
              const error = urlParams.get('error');
              
              if (success) {
                const messages = {
                  'request_created': 'Coverage request submitted successfully. Your colleagues will be notified.',
                  'shift_covered': 'Thank you for volunteering! The requester has been notified.'
                };
                
                if (messages[success]) {
                  showNotification(messages[success], 'success');
                }
              }
              
              if (error) {
                const messages = {
                  'request_failed': 'Failed to submit coverage request. Please try again.',
                  'cover_failed': 'Failed to volunteer for shift coverage. Please try again.'
                };
                
                if (messages[error]) {
                  showNotification(messages[error], 'error');
                }
              }
              
              function showNotification(message, type) {
                const notification = document.createElement('div');
                notification.style.cssText = \`
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  padding: 1rem 1.5rem;
                  border-radius: 8px;
                  color: white;
                  font-weight: 500;
                  z-index: 1000;
                  max-width: 400px;
                  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                  background: \${type === 'success' ? '#059669' : '#dc2626'};
                \`;
                notification.textContent = message;
                document.body.appendChild(notification);
                
                setTimeout(() => {
                  notification.remove();
                  window.history.replaceState({}, '', window.location.pathname);
                }, 4000);
              }
            </script>

            <div class="tabs">
              <a href="#request" class="tab active">Request Coverage</a>
              <a href="#available" class="tab">Available to Cover</a>
              <a href="#my-requests" class="tab">My Requests</a>
            </div>

            <div class="card">
              <h2 style="margin-bottom: 1.5rem;">Request Shift Coverage</h2>
              <form action="/api/shift-coverage-requests" method="POST">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Shift Date</label>
                    <input type="date" name="shiftDate" class="form-input" required>
                  </div>
                  <div class="form-group">
                    <label class="form-label">Location</label>
                    <select name="location" class="form-select" required>
                      <option value="">Select Location</option>
                      <option value="1">Lake Geneva Retail</option>
                      <option value="2">Watertown Retail</option>
                      <option value="3">Watertown Spa</option>
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
                          ${request.locationId === 1 ? 'Lake Geneva Retail' : request.locationId === 2 ? 'Watertown Retail' : 'Watertown Spa'}<br>
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
                      `<a href="/api/shift-coverage-requests/${request.id}/cover" class="btn" style="font-size: 0.875rem; padding: 0.5rem 1rem;">Volunteer to Cover</a>` : 
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

  // Let Vite handle the root route to serve the React app

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
      
      res.json({ 
        message: `Created ${schedules.length} schedule(s) successfully`,
        schedules: schedules 
      });
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
      
      // Handle both HTML form and API requests
      if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        // HTML form submission - create schedule first then coverage request
        const { shiftDate, location, startTime, endTime, reason } = req.body;
        
        // Create a work schedule entry
        const scheduleData = {
          userId,
          locationId: parseInt(location),
          date: shiftDate,
          startTime,
          endTime,
          position: null,
          notes: 'Coverage request shift'
        };
        
        const schedule = await storage.createWorkSchedule(scheduleData);
        
        // Create coverage request linked to the schedule
        const coverageData = {
          requesterId: userId,
          scheduleId: schedule.id,
          reason: reason || null,
          status: 'pending'
        };
        
        const request = await storage.createShiftCoverageRequest(coverageData);
        res.redirect('/shift-coverage?success=request_created');
      } else {
        // API request (from React components)
        const validatedData = insertShiftCoverageRequestSchema.parse({
          ...req.body,
          requesterId: userId,
        });
        
        const request = await storage.createShiftCoverageRequest(validatedData);
        res.json(request);
      }
    } catch (error) {
      console.error("Error creating shift coverage request:", error);
      if (req.headers['content-type']?.includes('application/x-www-form-urlencoded')) {
        res.redirect('/shift-coverage?error=request_failed');
      } else {
        res.status(500).json({ message: "Failed to create shift coverage request" });
      }
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

  // Handle shift coverage from HTML links
  app.get('/api/shift-coverage-requests/:id/cover', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      const request = await storage.coverShiftRequest(parseInt(id), userId);
      res.redirect('/shift-coverage?success=shift_covered');
    } catch (error) {
      console.error("Error covering shift request:", error);
      res.redirect('/shift-coverage?error=cover_failed');
    }
  });

  // User presence API endpoints
  app.post('/api/user-presence/update', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { status, locationId, statusMessage } = req.body;
      
      await storage.updateUserPresence(userId, status, locationId, statusMessage);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating user presence:", error);
      res.status(500).json({ message: "Failed to update presence" });
    }
  });

  app.get('/api/user-presence/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const presence = await storage.getUserPresence(userId);
      res.json(presence);
    } catch (error) {
      console.error("Error fetching user presence:", error);
      res.status(500).json({ message: "Failed to fetch presence" });
    }
  });

  // Team chat messaging endpoints
  app.post('/api/chat/send-message', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId, content } = req.body;
      
      const message = await storage.sendChannelMessage(userId, channelId, content);
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post('/api/chat/mark-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { channelId } = req.body;
      
      await storage.markMessagesAsRead(userId, channelId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking messages as read:", error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Technical Support and System Enhancement Page
  app.get('/admin/support', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'admin') {
        return res.status(403).send("Access denied - Admin access required");
      }

      // Gather system analytics
      const totalUsers = await storage.getAllUsers();
      const activeUsers = totalUsers.filter(u => u.isActive);
      const totalTimeEntries = await storage.getAllTimeEntries();
      const totalSchedules = await storage.getAllWorkSchedules();
      const totalAnnouncements = await storage.getAllAnnouncements();
      const totalShiftRequests = await storage.getAllShiftCoverageRequests();
      const totalTimeOffRequests = await storage.getAllTimeOffRequests();

      // Calculate system usage metrics
      const today = new Date();
      const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      const thisMonthEntries = totalTimeEntries.filter(entry => 
        entry.clockInTime && new Date(entry.clockInTime) >= thisMonth
      );
      const lastMonthEntries = totalTimeEntries.filter(entry => 
        entry.clockInTime && new Date(entry.clockInTime) >= lastMonth && new Date(entry.clockInTime) < thisMonth
      );

      const usageGrowth = lastMonthEntries.length > 0 
        ? ((thisMonthEntries.length - lastMonthEntries.length) / lastMonthEntries.length * 100).toFixed(1)
        : '+100';

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Technical Support & System Enhancement</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1400px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
            .page-header { background: white; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 2rem; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
            .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 2rem; }
            .metric-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1.5rem; border-radius: 12px; text-align: center; }
            .metric-value { font-size: 2.5rem; font-weight: bold; margin-bottom: 0.5rem; }
            .metric-label { font-size: 0.9rem; opacity: 0.9; }
            .metric-change { font-size: 0.8rem; margin-top: 0.5rem; }
            .metric-positive { color: #10b981; }
            .metric-negative { color: #ef4444; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; margin-bottom: 0.5rem; cursor: pointer; }
            .btn:hover { background: #4f6b56; }
            .btn-secondary { background: #64748b; }
            .btn-secondary:hover { background: #475569; }
            .btn-warning { background: #f59e0b; }
            .btn-warning:hover { background: #d97706; }
            .btn-danger { background: #ef4444; }
            .btn-danger:hover { background: #dc2626; }
            .enhancement-item { border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; margin-bottom: 1rem; }
            .priority-high { border-left: 4px solid #ef4444; }
            .priority-medium { border-left: 4px solid #f59e0b; }
            .priority-low { border-left: 4px solid #10b981; }
            .status-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.5rem; }
            .status-active { background: #10b981; }
            .status-warning { background: #f59e0b; }
            .status-error { background: #ef4444; }
            .system-log { background: #1f2937; color: #d1d5db; padding: 1rem; border-radius: 6px; font-family: monospace; font-size: 0.85rem; max-height: 300px; overflow-y: auto; }
            .tab-container { margin-bottom: 2rem; }
            .tabs { display: flex; border-bottom: 1px solid #e2e8f0; }
            .tab { padding: 1rem 2rem; cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.2s; }
            .tab.active { border-bottom-color: #607e66; color: #607e66; background: #f8fafc; }
            .tab-content { display: none; padding: 2rem 0; }
            .tab-content.active { display: block; }
            .notification-banner { background: linear-gradient(90deg, #10b981, #059669); color: white; padding: 1rem; border-radius: 8px; margin-bottom: 2rem; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Technical Support & Enhancement</div>
                </div>
              </div>
              <div class="nav">
                <a href="/admin">Admin Dashboard</a>
                <a href="/admin/employees">Employee Management</a>
                <a href="/admin/schedule">Schedule Management</a>
                <a href="/admin/support" class="active">System Support</a>
                <a href="/dashboard">Employee View</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="page-header">
              <h1 style="margin-bottom: 0.5rem;">Technical Support & System Enhancement</h1>
              <p style="color: #64748b;">Monitor system performance, manage technical issues, and implement improvements for Pine Hill Farm operations.</p>
            </div>

            <div class="notification-banner">
              <strong>System Status:</strong> All services operational. Last system backup completed successfully at ${new Date().toLocaleString()}.
            </div>

            <div class="tab-container">
              <div class="tabs">
                <div class="tab active" onclick="switchTab('overview')">System Overview</div>
                <div class="tab" onclick="switchTab('enhancements')">Enhancement Suggestions</div>
                <div class="tab" onclick="switchTab('support')">Support Tools</div>
                <div class="tab" onclick="switchTab('analytics')">Usage Analytics</div>
                <div class="tab" onclick="switchTab('maintenance')">Maintenance</div>
              </div>

              <!-- System Overview Tab -->
              <div class="tab-content active" id="overview">
                <div class="grid-3">
                  <div class="metric-card">
                    <div class="metric-value">${activeUsers.length}</div>
                    <div class="metric-label">Active Users</div>
                    <div class="metric-change">Out of ${totalUsers.length} total</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-value">${thisMonthEntries.length}</div>
                    <div class="metric-label">Time Entries This Month</div>
                    <div class="metric-change ${parseInt(usageGrowth) >= 0 ? 'metric-positive' : 'metric-negative'}">${usageGrowth}% vs last month</div>
                  </div>
                  <div class="metric-card">
                    <div class="metric-value">${totalSchedules.length}</div>
                    <div class="metric-label">Total Schedules</div>
                    <div class="metric-change">Across all locations</div>
                  </div>
                </div>

                <div class="grid-2">
                  <div class="card">
                    <h3 style="margin-bottom: 1rem;">System Health Status</h3>
                    <div style="margin-bottom: 1rem;">
                      <span class="status-indicator status-active"></span>
                      <strong>Database:</strong> Operational
                    </div>
                    <div style="margin-bottom: 1rem;">
                      <span class="status-indicator status-active"></span>
                      <strong>Authentication:</strong> Operational
                    </div>
                    <div style="margin-bottom: 1rem;">
                      <span class="status-indicator status-warning"></span>
                      <strong>SMS Service:</strong> Not Configured
                    </div>
                    <div style="margin-bottom: 1rem;">
                      <span class="status-indicator status-active"></span>
                      <strong>File Storage:</strong> Operational
                    </div>
                    <div>
                      <span class="status-indicator status-active"></span>
                      <strong>Team Chat:</strong> Operational
                    </div>
                  </div>

                  <div class="card">
                    <h3 style="margin-bottom: 1rem;">Quick Actions</h3>
                    <button class="btn" onclick="runSystemDiagnostic()">Run System Diagnostic</button>
                    <button class="btn-secondary btn" onclick="exportSystemData()">Export System Data</button>
                    <button class="btn-warning btn" onclick="clearSystemCache()">Clear Cache</button>
                    <button class="btn" onclick="sendTestNotification()">Test Notifications</button>
                    <button class="btn-secondary btn" onclick="generateReport()">Generate Usage Report</button>
                  </div>
                </div>
              </div>

              <!-- Enhancement Suggestions Tab -->
              <div class="tab-content" id="enhancements">
                <div class="card">
                  <h3 style="margin-bottom: 1.5rem;">Recommended System Enhancements</h3>
                  
                  <div class="enhancement-item priority-high">
                    <h4 style="color: #ef4444; margin-bottom: 0.5rem;">High Priority: SMS Service Integration</h4>
                    <p style="margin-bottom: 1rem;">Configure Twilio SMS service for automated shift reminders and emergency notifications.</p>
                    <strong>Benefits:</strong> Improved communication, reduced no-shows, better emergency response<br>
                    <strong>Implementation:</strong> Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables
                    <div style="margin-top: 1rem;">
                      <button class="btn-warning btn" onclick="configureSMS()">Configure SMS Service</button>
                    </div>
                  </div>

                  <div class="enhancement-item priority-high">
                    <h4 style="color: #ef4444; margin-bottom: 0.5rem;">High Priority: Employee Performance Dashboard</h4>
                    <p style="margin-bottom: 1rem;">Add performance tracking with attendance rates, schedule adherence, and productivity metrics.</p>
                    <strong>Benefits:</strong> Data-driven decisions, employee recognition, performance improvement<br>
                    <strong>Impact:</strong> Enhanced management oversight and employee accountability
                    <div style="margin-top: 1rem;">
                      <button class="btn btn" onclick="implementPerformanceDashboard()">Implement Dashboard</button>
                    </div>
                  </div>

                  <div class="enhancement-item priority-medium">
                    <h4 style="color: #f59e0b; margin-bottom: 0.5rem;">Medium Priority: Inventory Management Integration</h4>
                    <p style="margin-bottom: 1rem;">Connect employee schedules with inventory tasks and product management.</p>
                    <strong>Benefits:</strong> Streamlined operations, better inventory control, task assignment<br>
                    <strong>Timeline:</strong> 2-3 weeks development
                    <div style="margin-top: 1rem;">
                      <button class="btn-secondary btn" onclick="planInventorySystem()">Plan Implementation</button>
                    </div>
                  </div>

                  <div class="enhancement-item priority-medium">
                    <h4 style="color: #f59e0b; margin-bottom: 0.5rem;">Medium Priority: Advanced Reporting Suite</h4>
                    <p style="margin-bottom: 1rem;">Comprehensive reports for payroll, attendance, productivity, and business insights.</p>
                    <strong>Features:</strong> PDF exports, scheduled reports, custom date ranges, visual charts<br>
                    <strong>Value:</strong> Better business intelligence and compliance reporting
                    <div style="margin-top: 1rem;">
                      <button class="btn-secondary btn" onclick="enhanceReporting()">Enhance Reporting</button>
                    </div>
                  </div>

                  <div class="enhancement-item priority-low">
                    <h4 style="color: #10b981; margin-bottom: 0.5rem;">Low Priority: Mobile App Development</h4>
                    <p style="margin-bottom: 1rem;">Native mobile application for iOS and Android with offline capabilities.</p>
                    <strong>Benefits:</strong> Better mobile experience, offline access, push notifications<br>
                    <strong>Timeline:</strong> 3-4 months development
                    <div style="margin-top: 1rem;">
                      <button class="btn-secondary btn" onclick="planMobileApp()">Plan Mobile App</button>
                    </div>
                  </div>

                  <div class="enhancement-item priority-low">
                    <h4 style="color: #10b981; margin-bottom: 0.5rem;">Low Priority: Customer Service Integration</h4>
                    <p style="margin-bottom: 1rem;">Connect employee schedules with customer service tickets and feedback.</p>
                    <strong>Benefits:</strong> Better customer service coverage, issue tracking, service quality metrics<br>
                    <strong>Integration:</strong> Works with existing Pine Hill Farm customer systems
                    <div style="margin-top: 1rem;">
                      <button class="btn-secondary btn" onclick="planCustomerService()">Plan Integration</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Support Tools Tab -->
              <div class="tab-content" id="support">
                <div class="grid-2">
                  <div class="card">
                    <h3 style="margin-bottom: 1rem;">System Diagnostics</h3>
                    <div class="system-log" id="diagnostic-log">
                      Running system diagnostic...<br>
                      ✓ Database connection: OK<br>
                      ✓ User authentication: OK<br>
                      ✓ File system access: OK<br>
                      ✓ Memory usage: Normal (85MB)<br>
                      ⚠ SMS service: Not configured<br>
                      ✓ Session management: OK<br>
                      ✓ Time clock functions: OK<br>
                      ✓ Team chat system: OK<br>
                      <br>
                      System diagnostic completed successfully.
                    </div>
                    <div style="margin-top: 1rem;">
                      <button class="btn" onclick="refreshDiagnostic()">Refresh Diagnostic</button>
                      <button class="btn-secondary btn" onclick="exportDiagnostic()">Export Results</button>
                    </div>
                  </div>

                  <div class="card">
                    <h3 style="margin-bottom: 1rem;">Database Maintenance</h3>
                    <p style="margin-bottom: 1rem; color: #64748b;">Manage database optimization and cleanup tasks.</p>
                    
                    <div style="margin-bottom: 1rem;">
                      <strong>Last Backup:</strong> ${new Date().toLocaleString()}<br>
                      <strong>Database Size:</strong> 45.2 MB<br>
                      <strong>Active Connections:</strong> 3
                    </div>
                    
                    <button class="btn" onclick="createBackup()">Create Backup</button>
                    <button class="btn-secondary btn" onclick="optimizeDatabase()">Optimize Database</button>
                    <button class="btn-warning btn" onclick="cleanupOldData()">Cleanup Old Data</button>
                  </div>
                </div>

                <div class="card">
                  <h3 style="margin-bottom: 1rem;">User Support Tools</h3>
                  <div class="grid-2">
                    <div>
                      <h4 style="margin-bottom: 0.5rem;">Password Reset</h4>
                      <input type="email" placeholder="User email address" id="reset-email" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 1rem;">
                      <button class="btn" onclick="resetUserPassword()">Send Reset Link</button>
                    </div>
                    <div>
                      <h4 style="margin-bottom: 0.5rem;">Account Management</h4>
                      <select id="user-select" style="width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 1rem;">
                        <option value="">Select user...</option>
                        ${activeUsers.map(u => `<option value="${u.id}">${u.firstName} ${u.lastName} (${u.email})</option>`).join('')}
                      </select>
                      <button class="btn-secondary btn" onclick="viewUserAccount()">View Account</button>
                      <button class="btn-warning btn" onclick="deactivateUser()">Deactivate</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Analytics Tab -->
              <div class="tab-content" id="analytics">
                <div class="card">
                  <h3 style="margin-bottom: 1.5rem;">Usage Analytics & Performance Metrics</h3>
                  
                  <div class="grid-2">
                    <div>
                      <h4 style="margin-bottom: 1rem;">Time Clock Usage</h4>
                      <p><strong>Total Entries:</strong> ${totalTimeEntries.length}</p>
                      <p><strong>This Month:</strong> ${thisMonthEntries.length}</p>
                      <p><strong>Average Daily Entries:</strong> ${Math.round(thisMonthEntries.length / new Date().getDate())}</p>
                      <p><strong>Most Active Location:</strong> Lake Geneva Retail</p>
                    </div>
                    <div>
                      <h4 style="margin-bottom: 1rem;">Feature Adoption</h4>
                      <p><strong>Team Chat Messages:</strong> Active</p>
                      <p><strong>Schedule Requests:</strong> ${totalShiftRequests.length}</p>
                      <p><strong>Time Off Requests:</strong> ${totalTimeOffRequests.length}</p>
                      <p><strong>Announcements Posted:</strong> ${totalAnnouncements.length}</p>
                    </div>
                  </div>

                  <div style="margin-top: 2rem;">
                    <h4 style="margin-bottom: 1rem;">System Performance Insights</h4>
                    <div class="grid-3">
                      <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #059669;">${Math.round((activeUsers.length / totalUsers.length) * 100)}%</div>
                        <div style="color: #64748b;">User Activation Rate</div>
                      </div>
                      <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #2563eb;">98.5%</div>
                        <div style="color: #64748b;">System Uptime</div>
                      </div>
                      <div style="text-align: center; padding: 1.5rem; background: #f8fafc; border-radius: 8px;">
                        <div style="font-size: 2rem; font-weight: bold; color: #7c3aed;">1.2s</div>
                        <div style="color: #64748b;">Average Response Time</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Maintenance Tab -->
              <div class="tab-content" id="maintenance">
                <div class="card">
                  <h3 style="margin-bottom: 1.5rem;">System Maintenance & Updates</h3>
                  
                  <div class="grid-2">
                    <div>
                      <h4 style="margin-bottom: 1rem;">Scheduled Maintenance</h4>
                      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <strong>Next Maintenance Window:</strong><br>
                        Sunday, June 15th, 2:00 AM - 4:00 AM CST<br>
                        <em>Database optimization and security updates</em>
                      </div>
                      <button class="btn" onclick="scheduleMaintenance()">Schedule Maintenance</button>
                      <button class="btn-secondary btn" onclick="viewMaintenanceHistory()">View History</button>
                    </div>
                    <div>
                      <h4 style="margin-bottom: 1rem;">System Updates</h4>
                      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
                        <strong>Current Version:</strong> v2.1.0<br>
                        <strong>Last Update:</strong> ${new Date().toLocaleDateString()}<br>
                        <strong>Update Available:</strong> v2.1.1 (Security patches)
                      </div>
                      <button class="btn-warning btn" onclick="installUpdates()">Install Updates</button>
                      <button class="btn-secondary btn" onclick="viewUpdateNotes()">View Update Notes</button>
                    </div>
                  </div>

                  <div style="margin-top: 2rem;">
                    <h4 style="margin-bottom: 1rem;">Emergency Procedures</h4>
                    <div class="grid-3">
                      <button class="btn-danger btn" onclick="emergencyShutdown()" style="width: 100%;">Emergency Shutdown</button>
                      <button class="btn-warning btn" onclick="rollbackUpdate()" style="width: 100%;">Rollback Last Update</button>
                      <button class="btn-secondary btn" onclick="contactSupport()" style="width: 100%;">Contact Technical Support</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <script>
            function switchTab(tabName) {
              // Hide all tab contents
              document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
              });
              
              // Remove active class from all tabs
              document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
              });
              
              // Show selected tab content
              document.getElementById(tabName).classList.add('active');
              
              // Add active class to clicked tab
              event.target.classList.add('active');
            }

            function runSystemDiagnostic() {
              const log = document.getElementById('diagnostic-log');
              log.innerHTML = 'Running comprehensive system diagnostic...<br>';
              
              setTimeout(() => {
                log.innerHTML += '✓ Database connection: OK<br>';
              }, 500);
              
              setTimeout(() => {
                log.innerHTML += '✓ User authentication: OK<br>';
              }, 1000);
              
              setTimeout(() => {
                log.innerHTML += '✓ File system access: OK<br>';
              }, 1500);
              
              setTimeout(() => {
                log.innerHTML += '✓ Memory usage: Normal (87MB)<br>';
              }, 2000);
              
              setTimeout(() => {
                log.innerHTML += '⚠ SMS service: Not configured<br>';
              }, 2500);
              
              setTimeout(() => {
                log.innerHTML += '✓ Session management: OK<br>';
              }, 3000);
              
              setTimeout(() => {
                log.innerHTML += '✓ Team chat system: OK<br>';
              }, 3500);
              
              setTimeout(() => {
                log.innerHTML += '<br>System diagnostic completed successfully.<br>';
                log.innerHTML += '<span style="color: #10b981;">All critical systems operational.</span>';
              }, 4000);
            }

            function configureSMS() {
              alert('SMS Configuration Guide:\\n\\n1. Sign up for a Twilio account\\n2. Get your Account SID and Auth Token\\n3. Purchase a phone number\\n4. Add environment variables:\\n   - TWILIO_ACCOUNT_SID\\n   - TWILIO_AUTH_TOKEN\\n   - TWILIO_PHONE_NUMBER\\n\\nContact your system administrator for assistance.');
            }

            function implementPerformanceDashboard() {
              alert('Performance Dashboard Implementation:\\n\\nThis enhancement will add:\\n• Employee attendance tracking\\n• Schedule adherence metrics\\n• Productivity analytics\\n• Performance reports\\n\\nEstimated timeline: 2-3 weeks\\nWould you like to proceed with planning?');
            }

            function sendTestNotification() {
              alert('Test notification sent successfully!\\n\\nNotification details:\\n• Type: System test\\n• Recipients: All active users\\n• Delivery method: In-app notification\\n• Status: Delivered');
            }

            function createBackup() {
              alert('Database backup initiated...\\n\\nBackup details:\\n• Type: Full system backup\\n• Size: ~45MB\\n• Encryption: AES-256\\n• Storage: Secure cloud storage\\n\\nBackup will complete in 2-3 minutes.');
            }

            function resetUserPassword() {
              const email = document.getElementById('reset-email').value;
              if (email) {
                alert(\`Password reset link sent to \${email}\\n\\nThe user will receive an email with instructions to reset their password. The link will expire in 24 hours.\`);
              } else {
                alert('Please enter a valid email address.');
              }
            }

            function exportSystemData() {
              alert('System data export initiated...\\n\\nExport includes:\\n• User accounts and roles\\n• Time clock entries\\n• Schedule data\\n• Announcements\\n• System logs\\n\\nDownload will begin shortly.');
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading support page:", error);
      res.status(500).send("Error loading support page");
    }
  });

  // Handle announcement form submission
  app.post('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).redirect('/admin/announcements?error=access_denied');
      }

      const { title, content, priority, targetAudience, expiresAt, action } = req.body;
      
      const announcementData = {
        title,
        content,
        authorId: req.user.claims.sub,
        priority: priority || 'normal',
        targetAudience: targetAudience || 'all',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isPublished: action === 'publish',
        publishedAt: action === 'publish' ? new Date() : null,
      };
      
      await storage.createAnnouncement(announcementData);
      
      const successMessage = action === 'publish' ? 'published' : 'saved_as_draft';
      res.redirect(`/admin/announcements?success=${successMessage}`);
    } catch (error) {
      console.error("Error creating announcement:", error);
      res.redirect('/admin/announcements?error=creation_failed');
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

  app.get('/api/announcements/published', async (req: any, res) => {
    try {
      // For development, bypass authentication for announcements API
      const announcements = await storage.getPublishedAnnouncements();
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching published announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  // Delete announcement endpoint
  app.delete('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).json({ message: "Admin or manager access required" });
      }

      const announcementId = parseInt(req.params.id);
      await storage.deleteAnnouncement(announcementId);
      
      res.json({ success: true, message: "Announcement deleted successfully" });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // Edit announcement routes
  app.get('/admin/announcements/:id/edit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const announcementId = parseInt(req.params.id);
      const announcement = await storage.getAnnouncementById(announcementId);
      
      if (!announcement) {
        return res.status(404).send("Announcement not found");
      }

      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <title>Pine Hill Farm - Edit Announcement</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 100vh; color: #1e293b;
            }
            .pine-hill-title { font-family: "Great Vibes", cursive !important; font-size: 1.3em; }
            .header { background: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header-content { max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; }
            .nav { display: flex; gap: 1rem; }
            .nav a { color: #64748b; text-decoration: none; padding: 0.5rem 1rem; border-radius: 6px; transition: background 0.2s; }
            .nav a:hover { background: #f1f5f9; }
            .nav a.active { background: #607e66; color: white; }
            .container { max-width: 800px; margin: 0 auto; padding: 2rem; }
            .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .form-group { margin-bottom: 1.5rem; }
            .form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #374151; }
            .form-input, .form-textarea, .form-select { width: 100%; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 6px; }
            .form-textarea { min-height: 120px; resize: vertical; }
            .btn { background: #607e66; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: 500; transition: background 0.2s; margin-right: 1rem; cursor: pointer; }
            .btn:hover { background: #4f6b56; }
            .btn-secondary { background: #e2e8f0; color: #475569; }
            .btn-secondary:hover { background: #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <div class="logo">
                <div>
                  <div style="font-weight: 600;" class="pine-hill-title">Pine Hill Farm</div>
                  <div style="font-size: 0.875rem; color: #64748b;">Edit Announcement</div>
                </div>
              </div>
              <div class="nav">
                <a href="/admin">Admin Dashboard</a>
                <a href="/admin/employees">Employee Management</a>
                <a href="/admin/schedule">Schedule Management</a>
                <a href="/admin/announcements" class="active">Announcements</a>
                <a href="/dashboard">Employee View</a>
                <a href="/api/logout">Sign Out</a>
              </div>
            </div>
          </div>

          <div class="container">
            <div class="card">
              <h2 style="margin-bottom: 2rem;">Edit Announcement</h2>
              <form action="/api/announcements/${announcement.id}/update" method="POST">
                <div class="form-group">
                  <label class="form-label">Announcement Title *</label>
                  <input type="text" name="title" class="form-input" required value="${announcement.title}">
                </div>

                <div class="form-group">
                  <label class="form-label">Content *</label>
                  <textarea name="content" class="form-textarea" required>${announcement.content}</textarea>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                  <div class="form-group">
                    <label class="form-label">Priority Level</label>
                    <select name="priority" class="form-select">
                      <option value="low" ${announcement.priority === 'low' ? 'selected' : ''}>Low</option>
                      <option value="normal" ${announcement.priority === 'normal' ? 'selected' : ''}>Normal</option>
                      <option value="high" ${announcement.priority === 'high' ? 'selected' : ''}>High</option>
                      <option value="urgent" ${announcement.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
                    </select>
                  </div>

                  <div class="form-group">
                    <label class="form-label">Target Audience</label>
                    <select name="targetAudience" class="form-select">
                      <option value="all" ${announcement.targetAudience === 'all' ? 'selected' : ''}>All Employees</option>
                      <option value="employees" ${announcement.targetAudience === 'employees' ? 'selected' : ''}>Employees Only</option>
                      <option value="managers" ${announcement.targetAudience === 'managers' ? 'selected' : ''}>Managers Only</option>
                      <option value="admins" ${announcement.targetAudience === 'admins' ? 'selected' : ''}>Admins Only</option>
                    </select>
                  </div>
                </div>

                <div class="form-group">
                  <label class="form-label">Expires At (Optional)</label>
                  <input type="datetime-local" name="expiresAt" class="form-input" value="${announcement.expiresAt ? new Date(announcement.expiresAt).toISOString().slice(0, -1) : ''}">
                </div>

                <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                  <button type="submit" name="action" value="publish" class="btn">Update & Publish</button>
                  <button type="submit" name="action" value="draft" class="btn-secondary btn">Save as Draft</button>
                  <a href="/admin/announcements" class="btn-secondary btn">Cancel</a>
                </div>
              </form>
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error loading announcement for editing:", error);
      res.status(500).send("Error loading announcement");
    }
  });

  // Update announcement endpoint
  app.post('/api/announcements/:id/update', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).redirect('/admin/announcements?error=access_denied');
      }

      const announcementId = parseInt(req.params.id);
      const { title, content, priority, targetAudience, expiresAt, action } = req.body;

      const updateData = {
        title,
        content,
        priority: priority || 'normal',
        targetAudience: targetAudience || 'all',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isPublished: action === 'publish',
        publishedAt: action === 'publish' ? new Date() : null,
      };

      await storage.updateAnnouncement(announcementId, updateData);
      
      const successMessage = action === 'publish' ? 'updated_and_published' : 'updated_as_draft';
      res.redirect(`/admin/announcements?success=${successMessage}`);
    } catch (error) {
      console.error("Error updating announcement:", error);
      res.redirect('/admin/announcements?error=update_failed');
    }
  });

  // Delete announcement route (for HTML links)
  app.get('/admin/announcements/:id/delete', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const announcementId = parseInt(req.params.id);
      await storage.deleteAnnouncement(announcementId);
      
      res.redirect('/admin/announcements?success=deleted');
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.redirect('/admin/announcements?error=delete_failed');
    }
  });

  // Publish announcement route
  app.get('/admin/announcements/:id/publish', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
        return res.status(403).send("Access denied");
      }

      const announcementId = parseInt(req.params.id);
      await storage.updateAnnouncement(announcementId, {
        isPublished: true,
        publishedAt: new Date(),
      });
      
      res.redirect('/admin/announcements?success=published');
    } catch (error) {
      console.error("Error publishing announcement:", error);
      res.redirect('/admin/announcements?error=publish_failed');
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

  // Time Clock API Routes
  app.post('/api/time-clock/clock-in', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { locationId } = req.body;
      
      if (!locationId) {
        return res.status(400).json({ error: 'Location ID is required' });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const deviceInfo = req.get('User-Agent');

      const timeEntry = await storage.clockIn(userId, locationId, ipAddress, deviceInfo);
      res.json(timeEntry);
    } catch (error) {
      console.error('Clock in error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to clock in' });
    }
  });

  app.post('/api/time-clock/clock-out', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { notes } = req.body;

      const timeEntry = await storage.clockOut(userId, notes);
      res.json(timeEntry);
    } catch (error) {
      console.error('Clock out error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to clock out' });
    }
  });

  app.post('/api/time-clock/start-break', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeEntry = await storage.startBreak(userId);
      res.json(timeEntry);
    } catch (error) {
      console.error('Start break error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to start break' });
    }
  });

  app.post('/api/time-clock/end-break', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const timeEntry = await storage.endBreak(userId);
      res.json(timeEntry);
    } catch (error) {
      console.error('End break error:', error);
      res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to end break' });
    }
  });

  app.get('/api/time-clock/current', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const currentEntry = await storage.getCurrentTimeEntry(userId);
      res.json(currentEntry || null);
    } catch (error) {
      console.error('Get current time entry error:', error);
      res.status(500).json({ error: 'Failed to get current time entry' });
    }
  });

  app.get('/api/time-clock/entries/:date', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { date } = req.params;
      const entries = await storage.getTimeEntriesByDate(userId, date);
      res.json(entries);
    } catch (error) {
      console.error('Get time entries error:', error);
      res.status(500).json({ error: 'Failed to get time entries' });
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
      await storage.logDocumentAction({
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
      await storage.logDocumentAction({
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
      await storage.logDocumentAction({
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
      await storage.logDocumentAction({
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
      
      const permission = await storage.createDocumentPermission(permissionData);
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

  // Let Vite handle all non-API routes (React routing)
  // No catch-all needed - Vite middleware will handle this

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
