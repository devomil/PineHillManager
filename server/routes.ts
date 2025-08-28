import type { Express } from "express";
import { createServer, type Server } from "http";
import * as QRCode from 'qrcode';
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./storage";
import { performanceMiddleware, getPerformanceMetrics, resetPerformanceMetrics } from "./performance-middleware";
import { notificationService } from "./notificationService";
import { sendSupportTicketNotification } from "./emailService";
import { smsService } from "./sms-service";
import { smartNotificationService } from './smart-notifications';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import express from 'express';
import twilio from 'twilio';
// Phase 6: Advanced Features Schema Imports
import {
  insertScheduledMessageSchema,
  updateScheduledMessageSchema,
  insertAnnouncementTemplateSchema,
  updateAnnouncementTemplateSchema,
  insertAutomationRuleSchema,
  updateAutomationRuleSchema,
} from "@shared/schema";

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
        // Get all user schedules (last 30 days by default)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 30);
        
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
            ...updates, 
            userId: updatedSchedule.userId,
            date: updatedSchedule.date,
            shiftType: updatedSchedule.shiftType,
            originalSchedule: updatedSchedule
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
      
      // Fetch reactions for each announcement
      const announcementsWithReactions = await Promise.all(
        announcements.map(async (announcement) => {
          const reactions = await storage.getMessageReactions(announcement.id);
          return {
            ...announcement,
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
      const announcements = await storage.getPublishedAnnouncements();
      
      // Fetch reactions for each announcement (same as admin endpoint)
      const announcementsWithReactions = await Promise.all(
        announcements.map(async (announcement) => {
          const reactions = await storage.getMessageReactions(announcement.id);
          return {
            ...announcement,
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
      const {
        title,
        content,
        priority = 'normal',
        targetAudience,
        expiresAt,
        action = 'publish',
        smsEnabled = false
      } = req.body;
      
      const isPublished = action === 'publish';
      
      const authorId = req.user!.id;
      
      console.log('📢 Creating announcement with data:', {
        title,
        priority,
        targetAudience,
        isPublished,
        smsEnabled,
        smsEnabledType: typeof smsEnabled,
        reqBodyKeys: Object.keys(req.body)
      });
      
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
      
      // Create announcement in database
      const announcement = await storage.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        authorId,
        priority,
        targetAudience: processedAudience,
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
          // Send smart notifications using existing system
          const allUsers = await storage.getAllUsers();
          const eligibleUsers = allUsers.filter(user => 
            user.isActive && 
            user.phone && 
            user.smsConsent &&
            user.smsEnabled &&
            user.smsNotificationTypes?.includes('announcements')
          );

          console.log('👥 SMS recipient analysis:', {
            totalUsers: allUsers.length,
            eligibleUsers: eligibleUsers.length,
            eligibleUserIds: eligibleUsers.map(u => ({ id: u.id, phone: u.phone, firstName: u.firstName }))
          });

          if (eligibleUsers.length > 0) {
            const userIds = eligibleUsers.map(user => user.id);
            console.log('📤 Sending notifications to user IDs:', userIds);
            
            const notificationResult = await smartNotificationService.sendBulkSmartNotifications(
              userIds,
              {
                messageType: 'announcement',
                priority: priority as any,
                content: {
                  title: title,
                  message: content
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
  app.post('/api/time-clock/clock-in', async (req, res) => {
    try {
      console.log('Clock-in request body:', req.body);
      
      const { locationId } = req.body;
      
      if (!locationId) {
        console.error('No locationId provided');
        return res.status(400).json({ message: 'Location ID is required' });
      }
      
      // Get authenticated user from session or use fallback for testing
      let userId = "40154188"; // Your actual user ID from database
      
      if (req.isAuthenticated() && req.user) {
        userId = req.user.id;
        console.log('Authenticated user:', req.user);
      }
      
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

  app.post('/api/time-clock/clock-out', async (req, res) => {
    try {
      const { notes } = req.body;
      // Get authenticated user from session or use fallback for testing
      let userId = "40154188"; // Your actual user ID from database
      
      if (req.isAuthenticated() && req.user) {
        userId = req.user.id;
      }
      
      console.log('Clock-out request for user:', userId, 'with notes:', notes);
      const timeEntry = await storage.clockOut(userId, notes);
      console.log('Clock-out successful:', timeEntry);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error clocking out:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to clock out' });
    }
  });

  app.post('/api/time-clock/start-break', async (req, res) => {
    try {
      // Get authenticated user from session or use fallback for testing
      let userId = "40154188"; // Your actual user ID from database
      
      if (req.isAuthenticated() && req.user) {
        userId = req.user.id;
      }
      
      console.log('Start break request for user:', userId);
      const timeEntry = await storage.startBreak(userId);
      console.log('Start break successful:', timeEntry);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error starting break:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to start break' });
    }
  });

  app.post('/api/time-clock/end-break', async (req, res) => {
    try {
      // Get authenticated user from session or use fallback for testing
      let userId = "40154188"; // Your actual user ID from database
      
      if (req.isAuthenticated() && req.user) {
        userId = req.user.id;
      }
      
      console.log('End break request for user:', userId);
      const timeEntry = await storage.endBreak(userId);
      console.log('End break successful:', timeEntry);
      res.json(timeEntry);
    } catch (error) {
      console.error('Error ending break:', error);
      res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to end break' });
    }
  });

  app.get('/api/time-clock/current', async (req, res) => {
    try {
      console.log('Time clock current request - isAuthenticated:', req.isAuthenticated());
      console.log('Time clock current request - user:', req.user ? 'present' : 'missing');
      
      // Get authenticated user from session or use fallback for testing
      let userId = "40154188"; // Your actual user ID from database
      
      if (req.isAuthenticated() && req.user) {
        userId = req.user.id;
        console.log('Using authenticated user:', userId);
      } else {
        console.log('Using fallback user for testing:', userId);
      }
      
      console.log('Getting current time entry for user:', userId);
      const currentEntry = await storage.getCurrentTimeEntry(userId);
      console.log('Current entry result:', currentEntry);
      res.json(currentEntry || null);
    } catch (error) {
      console.error('Error getting current time entry:', error);
      res.status(500).json({ message: 'Failed to get current time entry' });
    }
  });

  app.get('/api/time-clock/today', async (req, res) => {
    try {
      // Get authenticated user from session or use fallback for testing
      let userId = "40154188"; // Your actual user ID from database
      
      if (req.isAuthenticated() && req.user) {
        userId = req.user.id;
      }
      
      const today = new Date().toISOString().split('T')[0];
      const entries = await storage.getTimeEntriesByDate(userId, today);
      res.json(entries);
    } catch (error) {
      console.error('Error getting today\'s time entries:', error);
      res.status(500).json({ message: 'Failed to get today\'s time entries' });
    }
  });

  app.get('/api/time-clock/week', async (req, res) => {
    try {
      // Get authenticated user from session or use fallback for testing
      let userId = "40154188"; // Your actual user ID from database
      
      if (req.isAuthenticated() && req.user) {
        userId = req.user.id;
      }
      
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
      const messages = await storage.getMessagesByChannel(channel as string || 'general');
      res.json(messages);
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

      // Validate reaction type
      const validReactions = ['check', 'thumbs_up', 'x', 'question'];
      if (!validReactions.includes(reactionType)) {
        return res.status(400).json({ error: "Invalid reaction type" });
      }

      // Remove existing reaction of same type from same user, then add new one
      await storage.removeMessageReaction(messageId, userId, reactionType);
      const reaction = await storage.addMessageReaction({
        messageId,
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
  // EMPLOYEE RESPONSE ROUTES
  // ================================

  // Create response to announcement
  app.post("/api/announcements/:id/responses", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { content, responseType = 'reply', parentResponseId } = req.body;
      const authorId = req.user!.id;

      if (!content?.trim()) {
        return res.status(400).json({ error: 'Response content is required' });
      }

      const response = await storage.createResponse({
        authorId,
        content: content.trim(),
        announcementId: parseInt(id),
        responseType,
        parentResponseId: parentResponseId ? parseInt(parentResponseId) : null,
        isFromSMS: false
      });

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
      const responses = await storage.getResponsesByAnnouncement(parseInt(id));
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

      const response = await storage.createResponse({
        authorId,
        content: content.trim(),
        messageId: parseInt(id),
        responseType,
        parentResponseId: parentResponseId ? parseInt(parentResponseId) : null,
        isFromSMS: false
      });

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

      // For now, create a general response since we don't have specific announcement tracking
      // In a full implementation, you'd track which announcement the SMS relates to
      try {
        // Try to determine response type from message content
        let responseType = 'reply';
        const bodyLower = Body.toLowerCase();
        
        if (bodyLower.includes('question') || bodyLower.includes('?') || bodyLower.includes('help')) {
          responseType = 'question';
        } else if (bodyLower.includes('concern') || bodyLower.includes('issue') || bodyLower.includes('problem')) {
          responseType = 'concern';
        } else if (bodyLower.includes('confirm') || bodyLower.includes('yes') || bodyLower.includes('ok') || bodyLower.includes('understood')) {
          responseType = 'confirmation';
        }

        // For this implementation, we'll look for the most recent announcement they could be replying to
        const announcements = await storage.getPublishedAnnouncements();
        if (announcements.length > 0) {
          const latestAnnouncement = announcements[0]; // Most recent announcement
          
          // Create response linked to latest announcement
          const response = await storage.createResponse({
            authorId: user.id,
            content: Body.trim(),
            announcementId: latestAnnouncement.id,
            responseType: responseType as any,
            isFromSMS: true,
            smsMessageSid: MessageSid
          });

          console.log('✅ Created SMS response:', {
            responseId: response.id,
            announcementId: latestAnnouncement.id,
            userId: user.id,
            responseType
          });

          // Send confirmation SMS
          try {
            await smsService.sendSMS({
              to: From,
              message: `Thanks ${user.firstName}! Your message has been received and added to "${latestAnnouncement.title}". Your team will see your response.`,
              priority: 'normal'
            });
          } catch (smsError) {
            console.error('Error sending confirmation SMS:', smsError);
          }

        } else {
          console.log('⚠️ No announcements found to link SMS response to');
          // Send auto-reply for no context
          try {
            await smsService.sendSMS({
              to: From,
              message: `Thanks ${user.firstName}! Your message has been received. If you're replying to a specific announcement, please check the app for the latest updates.`,
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
          userId: null,
          channelId: null,
          cost: null,
          priority: null,
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

      const receipt = await storage.markMessageAsRead(parseInt(messageId), userId);
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

  // Multi-location analytics endpoint (supports Clover POS + Amazon Store)
  app.get('/api/accounting/analytics/multi-location', async (req, res) => {
    console.log('🔥 MULTI-LOCATION ENDPOINT HIT - DEBUG TEST (NO AUTH CHECK)');
    console.log('Request query params:', req.query);
    
    // Manual auth check to debug
    if (!req.isAuthenticated()) {
      console.log('Manual auth check failed');
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log('Manual auth check passed');
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
          
          const liveOrders = await cloverIntegration.fetchOrders({
            filter: `modifiedTime>=${Math.floor(start.getTime())}`,
            limit: 1000,
            offset: 0
          });
          
          if (liveOrders && liveOrders.elements && liveOrders.elements.length > 0) {
            console.log(`Location Raw orders fetched for ${config.merchantName}: ${liveOrders.elements.length} orders`);
            
            // Filter orders by date on server-side (same as revenue-trends)
            const filteredOrders = liveOrders.elements.filter((order: any) => {
              const orderDate = new Date(order.modifiedTime);
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
              console.log('Sales API failed, trying Financial Events API:', salesError.message);
              // Fall back to Financial Events API
              try {
                console.log('🔍 Trying Amazon Financial Events API...');
                const financialEvents = await amazonIntegration.getFinancialEvents(startDateISO, endDateISO);
                
                if (financialEvents && financialEvents.payload && financialEvents.payload.FinancialEvents && financialEvents.payload.FinancialEvents.ShipmentEventList) {
                  const shipmentEvents = financialEvents.payload.FinancialEvents.ShipmentEventList;
                  locationRevenue = shipmentEvents.reduce((sum, event) => {
                    const charges = event.ShipmentItemList?.[0]?.ItemChargeList || [];
                    const itemRevenue = charges.reduce((itemSum, charge) => {
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
                console.log('Financial Events API also failed, falling back to Orders API:', finError.message);
                // Final fallback to Orders API calculation
                locationRevenue = orders.reduce((sum, order) => {
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
                  locationTransactions = orders.filter(order => 
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
              transactionCount: 0,
              avgSale: '0.00'
            });
          }
        } catch (error) {
          console.log(`Error fetching Amazon data for ${config.merchantName}:`, error);
          
          // Only add zero data if it's not a rate limit error
          // Rate limit errors shouldn't override potentially successful cached data
          if (!error.message.includes('429')) {
            amazonLocationBreakdown.push({
              locationId: `amazon_${config.id}`,
              locationName: config.merchantName,
              platform: 'Amazon Store',
              totalSales: '0.00',
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
            amount: line.amount,
            description: line.description || '',
            debitCredit: line.debitCredit || 'debit'
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
        createdAt: new Date(),
        updatedAt: new Date()
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

  app.get('/api/accounting/analytics/profit-loss', async (req, res) => {
    try {
      // Check auth without middleware
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { startDate, endDate } = req.query;
      console.log('Profit-loss request:', { startDate, endDate });
      
      if (!startDate || !endDate) {
        console.log('Missing dates, returning 400');
        return res.status(400).json({ message: 'Start date and end date are required' });
      }

      console.log('Getting profit-loss data using LIVE CLOVER API...');
      
      // Fix timezone issue: ensure end date includes full day (23:59:59.999)
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      
      console.log(`🚀 PROFIT-LOSS FIXED DATE RANGE: ${start.toISOString()} - ${end.toISOString()}`);
      
      // Get live revenue data from all Clover locations (same as Revenue Analytics)
      const { CloverIntegration } = await import('./integrations/clover');
      const allLocations = await storage.getAllCloverConfigs();
      const activeLocations = allLocations.filter(config => config.isActive);
      
      let totalRevenue = 0;
      let totalTransactions = 0;
      
      for (const locationConfig of activeLocations) {
        try {
          const cloverIntegration = new CloverIntegration(locationConfig);
          const liveOrders = await cloverIntegration.fetchOrders({
            filter: `modifiedTime>=${Math.floor(start.getTime())}`,
            limit: 1000,
            offset: 0
          });
          
          if (liveOrders && liveOrders.elements && liveOrders.elements.length > 0) {
            // Filter orders by date range
            const filteredOrders = liveOrders.elements.filter((order: any) => {
              const orderDate = new Date(order.modifiedTime);
              return orderDate >= start && orderDate <= end;
            });
            
            const locationRevenue = filteredOrders.reduce((sum: number, order: any) => {
              const orderTotal = parseFloat(order.total || '0') / 100; // Convert cents to dollars
              return sum + orderTotal;
            }, 0);
            
            totalRevenue += locationRevenue;
            totalTransactions += filteredOrders.length;
          }
        } catch (error) {
          console.log(`No live sales data for ${locationConfig.merchantName}:`, error);
        }
      }
      
      const profitLoss = {
        revenue: totalRevenue.toFixed(2),
        expenses: '0.00', // Expenses still from database for now
        netIncome: totalRevenue.toFixed(2) // For now, net income = revenue since expenses = 0
      };
      
      console.log('Live Profit-loss result:', profitLoss);
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
            const liveOrders = await cloverIntegration.fetchOrders({
              filter: `modifiedTime>=${Math.floor(start.getTime())}`,
              limit: 1000,
              offset: 0
            });
            
            if (liveOrders && liveOrders.elements && liveOrders.elements.length > 0) {
              // Filter orders by date on server-side (same as Order Management fix)
              const filteredOrders = liveOrders.elements.filter((order: any) => {
                const orderDate = new Date(order.modifiedTime);
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
            const liveOrders = await cloverIntegration.fetchOrders({
              filter: `modifiedTime>=${Math.floor(start.getTime())}`,
              limit: 1000,
              offset: 0
            });
            
            if (liveOrders && liveOrders.elements && liveOrders.elements.length > 0) {
              console.log(`Raw orders fetched for ${locationConfig.merchantName}: ${liveOrders.elements.length} orders`);
              
              // Filter orders by date on server-side (same as Order Management fix)  
              const filteredOrders = liveOrders.elements.filter((order: any) => {
                const orderDate = new Date(order.modifiedTime);
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
              if (locationConfig.merchantName.includes('Lake Geneva') && month < 7) {
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
            const liveOrders = await cloverIntegration.fetchOrders({
              filter: `modifiedTime>=${Math.floor(start.getTime())}`,
              limit: 1000,
              offset: 0
            });
            
            if (liveOrders && liveOrders.elements && liveOrders.elements.length > 0) {
              console.log(`Location Raw orders fetched for ${locationConfig.merchantName}: ${liveOrders.elements.length} orders`);
              
              // Filter orders by date on server-side (same as Order Management fix)
              const filteredOrders = liveOrders.elements.filter((order: any) => {
                const orderDate = new Date(order.modifiedTime);
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

  // Get orders with comprehensive filtering using Clover API
  app.get('/api/orders', isAuthenticated, async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        locationId,
        search,
        state,
        page = '1',
        limit = '20'
      } = req.query as Record<string, string>;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      console.log('Fetching orders with filters:', {
        startDate, endDate, locationId, search, state, page, limit
      });

      // Use new Clover API method for direct order fetching
      const result = await storage.getOrdersFromCloverAPI({
        startDate,
        endDate,
        locationId: locationId && locationId !== 'all' ? locationId : undefined,
        search,
        state,
        limit: parseInt(limit),
        offset
      });

      res.json({
        orders: result.orders,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(result.total / parseInt(limit)),
          totalItems: result.total,
          hasMore: result.hasMore,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Error fetching orders from Clover API:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  });

  // Get detailed order information
  app.get('/api/orders/:orderId', isAuthenticated, async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await storage.getOrderDetails(orderId);

      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json(order);
    } catch (error) {
      console.error('Error fetching order details:', error);
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

  // Get voided items from orders
  app.get('/api/orders/voided-items', isAuthenticated, async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        locationId,
      } = req.query as Record<string, string>;

      // For now, return empty voided items structure
      // This can be enhanced later with real Clover API integration
      res.json({
        voidedItems: [],
        totals: {
          totalVoidedAmount: 0,
          totalVoidedItems: 0
        }
      });
    } catch (error) {
      console.error('Error fetching voided items:', error);
      res.status(500).json({ error: 'Failed to fetch voided items' });
    }
  });

  // Get order analytics
  app.get('/api/orders/analytics', isAuthenticated, async (req, res) => {
    try {
      const {
        startDate,
        endDate,
        locationId,
        groupBy = 'day'
      } = req.query as Record<string, string>;

      // For now, return basic analytics structure
      // This can be enhanced later with real calculations from order data
      res.json({
        analytics: [],
        summary: {
          totalOrders: 0,
          totalRevenue: 0,
          averageOrderValue: 0
        }
      });
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
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

  // Get voided line items with totals
  app.get('/api/orders/voided-items', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, locationId } = req.query as Record<string, string>;

      const result = await storage.getVoidedLineItems({
        startDate,
        endDate,
        locationId: locationId ? parseInt(locationId) : undefined
      });

      res.json(result);
    } catch (error) {
      console.error('Error fetching voided items:', error);
      res.status(500).json({ error: 'Failed to fetch voided items' });
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

  // Get order analytics
  app.get('/api/orders/analytics', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate, locationId, groupBy = 'day' } = req.query as Record<string, string>;

      const analytics = await storage.getOrderAnalytics({
        startDate,
        endDate,
        locationId: locationId ? parseInt(locationId) : undefined,
        groupBy
      });

      res.json(analytics);
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      res.status(500).json({ error: 'Failed to fetch order analytics' });
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
      const totalNew = syncResults.reduce((sum, r) => sum + (r.newOrders || 0), 0);
      const totalUpdated = syncResults.reduce((sum, r) => sum + (r.updatedOrders || 0), 0);
      
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
          
          const items = await cloverIntegration.fetchItems({
            limit: limit ? parseInt(limit as string) : 100,
            offset: offset ? parseInt(offset as string) : 0,
            filter: filter as string
          });

          if (items && items.elements) {
            // Add location info to each item
            const itemsWithLocation = items.elements.map((item: any) => ({
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

  // Send communication (messages/announcements) with SMS + app notifications
  app.post('/api/communications/send', isAuthenticated, async (req, res) => {
    console.log('📤 Communication send request received:', req.body);
    try {
      const {
        subject,
        content,
        priority = 'normal',
        messageType = 'broadcast',
        smsEnabled = false,
        recipientMode = 'audience',
        targetAudience = 'all',
        recipients = []
      } = req.body;
      
      const senderId = req.user!.id;
      const senderUser = req.user as any;

      // Validate required fields
      if (!subject?.trim() || !content?.trim()) {
        return res.status(400).json({ error: 'Subject and content are required' });
      }

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
        // Individual recipients selected (admin/manager only)
        targetUsers = allUsers.filter(user => 
          recipients.includes(user.id) && 
          user.isActive && 
          user.id !== senderId
        );
      } else if (recipientMode === 'audience') {
        // Audience targeting
        let eligibleUsers = allUsers.filter(user => 
          user.isActive && 
          user.id !== senderId
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
      const messageRecord = await storage.createMessage({
        senderId,
        subject,
        content,
        priority,
        messageType,
        targetAudience: recipientMode === 'individual' ? 'custom' : targetAudience,
        smsEnabled,
      });
      console.log('✅ Message record created:', messageRecord.id);

      // Send notifications via smart notification service
      console.log('🔔 Sending notifications to users...');
      const userIds = targetUsers.map(user => user.id);
      
      // Add timeout wrapper to prevent hanging
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
          bypassClockStatus: priority === 'emergency'
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

  // SMS Response Webhook (for handling replies to SMS)
  app.post('/api/sms/webhook', async (req, res) => {
    try {
      const { From, Body, MessageSid } = req.body;
      
      console.log('SMS webhook received:', { From, Body, MessageSid });

      // Find user by phone number
      const users = await storage.getAllUsers();
      const user = users.find(u => u.phone === From);

      if (!user) {
        console.log('SMS webhook: User not found for phone number:', From);
        res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
        return;
      }

      // Process SMS commands
      const message = Body.trim().toLowerCase();
      
      if (message === 'stop') {
        // Handle opt-out
        await storage.updateUserProfile(user.id, {
          smsEnabled: false,
          smsConsent: false,
          smsConsentDate: null
        });

        // Send confirmation via TwiML
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message('You have been unsubscribed from Pine Hill Farm SMS notifications. Reply START to opt back in.');
        
        res.type('text/xml');
        res.send(twiml.toString());
        return;

      } else if (message === 'start') {
        // Handle opt-in
        await storage.updateUserProfile(user.id, {
          smsEnabled: true,
          smsConsent: true,
          smsConsentDate: new Date()
        });

        // Send confirmation via TwiML
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message('You have been subscribed to Pine Hill Farm SMS notifications. Reply STOP to opt out.');
        
        res.type('text/xml');
        res.send(twiml.toString());
        return;

      } else if (message === 'help') {
        // Send help message via TwiML
        const twiml = new twilio.twiml.MessagingResponse();
        twiml.message('Pine Hill Farm SMS: Reply STOP to opt out, START to opt in. Msg & data rates may apply. For support, call (414) 737-4100.');
        
        res.type('text/xml');
        res.send(twiml.toString());
        return;

      } else {
        // Handle message reactions or responses
        const reactionMap: { [key: string]: string } = {
          '✓': 'check', 'check': 'check', 'ok': 'check', 'yes': 'check', 'y': 'check',
          '👍': 'thumbs_up', 'thumbs up': 'thumbs_up', 'good': 'thumbs_up', 'like': 'thumbs_up',
          '❌': 'x', 'x': 'x', 'no': 'x', 'n': 'x',
          '❓': 'question', '?': 'question', 'question': 'question', 'help': 'question'
        };

        const reactionType = reactionMap[message];
        
        if (reactionType) {
          // Try to find the most recent message to react to
          const recentMessages = await storage.getMessagesForUser(user.id, { limit: 1, offset: 0 });
          
          if (recentMessages.length > 0) {
            const messageId = recentMessages[0].id;
            
            // Remove existing reaction of same type, then add new one
            await storage.removeMessageReaction(messageId, user.id, reactionType);
            await storage.addMessageReaction({
              messageId,
              userId: user.id,
              reactionType,
            });

            // Send confirmation via TwiML
            const twiml = new twilio.twiml.MessagingResponse();
            twiml.message(`Your reaction (${reactionType.replace('_', ' ')}) has been recorded for the latest message.`);
            
            res.type('text/xml');
            res.send(twiml.toString());
            return;
          } else {
            // No recent messages to react to - send TwiML response
            const twiml = new twilio.twiml.MessagingResponse();
            twiml.message('No recent messages found to react to. Your reaction could not be processed.');
            
            res.type('text/xml');
            res.send(twiml.toString());
            return;
          }
        } else {
          // Log general SMS response for review
          console.log(`SMS response from ${user.firstName} ${user.lastName} (${From}): ${Body}`);
          
          // Create a message record of the response
          await storage.createMessage({
            senderId: user.id,
            content: `SMS Response: ${Body}`,
            messageType: 'direct',
            targetAudience: 'admin',
            priority: 'normal',
            smsEnabled: false,
          });
        }
      }

      // Always respond with valid TwiML
      const twiml = new twilio.twiml.MessagingResponse();
      res.type('text/xml');
      res.send(twiml.toString());

    } catch (error) {
      console.error('SMS webhook error:', error);
      
      // Send error TwiML response
      const twiml = new twilio.twiml.MessagingResponse();
      res.type('text/xml');
      res.send(twiml.toString());
    }
  });

  // SMS Fallback Webhook (backup handler for when primary fails)
  app.post('/api/sms/fallback', async (req, res) => {
    try {
      console.log('SMS fallback webhook activated:', req.body);
      
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
