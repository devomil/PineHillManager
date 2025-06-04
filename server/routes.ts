import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupDevAuth, isAuthenticated } from "./devAuth";
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
              <a href="/time-off">Time Off</a>
              <a href="/announcements">Announcements</a>
              ${isAdminOrManager ? '<a href="/admin">Admin Portal</a>' : ''}
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
              <a href="/coverage" class="btn">Manage Coverage</a>
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
              <a href="/chat" class="btn">Open Chat</a>
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

  // Schedule page
  app.get('/schedule', (req, res) => {
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
              <h2>December 2024</h2>
              <div>
                <a href="#" class="btn-secondary btn">← Previous</a>
                <a href="#" class="btn-secondary btn">Next →</a>
              </div>
            </div>

            <div class="legend">
              <div class="legend-item">
                <div class="legend-color" style="background: #2563eb;"></div>
                <span>Lake Geneva Store</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #059669;"></div>
                <span>Watertown Store</span>
              </div>
              <div class="legend-item">
                <div class="legend-color" style="background: #fef3c7;"></div>
                <span>Today</span>
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
              
              <div class="calendar-cell">
                <div class="date-number">1</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">2</div>
                <div class="shift lake-geneva">9:00 AM - 5:00 PM</div>
              </div>
              <div class="calendar-cell today">
                <div class="date-number">3</div>
                <div class="shift watertown">8:00 AM - 4:00 PM</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">4</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">5</div>
                <div class="shift lake-geneva">10:00 AM - 6:00 PM</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">6</div>
                <div class="shift watertown">9:00 AM - 5:00 PM</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">7</div>
              </div>
              
              <div class="calendar-cell">
                <div class="date-number">8</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">9</div>
                <div class="shift lake-geneva">9:00 AM - 5:00 PM</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">10</div>
                <div class="shift watertown">8:00 AM - 4:00 PM</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">11</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">12</div>
                <div class="shift lake-geneva">10:00 AM - 6:00 PM</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">13</div>
                <div class="shift watertown">9:00 AM - 5:00 PM</div>
              </div>
              <div class="calendar-cell">
                <div class="date-number">14</div>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem;">
            <div class="card">
              <h3 style="margin-bottom: 1rem;">Quick Actions</h3>
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <a href="/coverage" class="btn">Request Shift Coverage</a>
                <a href="/time-off" class="btn-secondary btn">Request Time Off</a>
              </div>
            </div>

            <div class="card">
              <h3 style="margin-bottom: 1rem;">This Week's Summary</h3>
              <div style="color: #64748b;">
                <div style="margin-bottom: 0.5rem;">Total Hours: 32</div>
                <div style="margin-bottom: 0.5rem;">Lake Geneva: 16 hours</div>
                <div>Watertown: 16 hours</div>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
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

            <div class="tabs">
              <a href="#pending-requests" class="tab active">Pending Approvals</a>
              <a href="#employee-overview" class="tab">Employee Overview</a>
              <a href="#schedule-overview" class="tab">Today's Schedule</a>
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
              <h2 style="margin-bottom: 1.5rem;">Employee Overview</h2>
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
                        Location: ${schedule.locationId === 1 ? 'Lake Geneva' : 'Watertown'}
                      </div>
                    </div>
                  `).join('')}
                </div>`
              }
            </div>
          </div>
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

  // Root redirect to dashboard for logged in users
  app.get('/', (req, res) => {
    // Check if user is logged in by checking session
    if (req.session && req.session.passport && req.session.passport.user) {
      res.redirect('/dashboard');
    } else {
      res.redirect('/static');
    }
  });

  // Auth middleware
  await setupDevAuth(app);

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
      
      const validatedData = insertWorkScheduleSchema.parse(req.body);
      const schedule = await storage.createWorkSchedule(validatedData);
      res.json(schedule);
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
