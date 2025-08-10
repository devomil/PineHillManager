import type { Express } from "express";
import { createServer, type Server } from "http";
import * as QRCode from 'qrcode';
// WebSocket functionality handled by Vite in development
import { setupAuth, isAuthenticated } from "./auth";
import { storage } from "./storage";
import { performanceMiddleware, getPerformanceMetrics, resetPerformanceMetrics } from "./performance-middleware";
import { notificationService } from "./notificationService";
import { sendSupportTicketNotification } from "./emailService";
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

  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

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
        isActive: isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date()
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

  // Multi-location analytics endpoint
  app.get('/api/accounting/analytics/multi-location', isAuthenticated, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const { db } = await import('./db');
      const { posSales, cloverConfig } = await import('@shared/schema');
      const { sql, between, eq } = await import('drizzle-orm');
      
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      
      // Get sales data by location with names from clover_config
      const locationSales = await db
        .select({
          locationId: posSales.locationId,
          locationName: sql`COALESCE(${cloverConfig.merchantName}, 
            CASE 
              WHEN ${posSales.locationId} = 1 THEN 'Lake Geneva Retail'
              WHEN ${posSales.locationId} = 2 THEN 'Watertown Retail' 
              WHEN ${posSales.locationId} = 3 THEN 'Pinehillfarm.co Online'
              ELSE 'Unknown Location'
            END)`.as('locationName'),
          totalSales: sql`COALESCE(SUM(${posSales.totalAmount}::decimal), 0)`.as('totalSales'),
          transactionCount: sql`COUNT(*)`.as('transactionCount'),
          avgSale: sql`COALESCE(AVG(${posSales.totalAmount}::decimal), 0)`.as('avgSale')
        })
        .from(posSales)
        .leftJoin(cloverConfig, eq(posSales.locationId, cloverConfig.id))
        .where(between(posSales.saleDate, start, end))
        .groupBy(posSales.locationId, cloverConfig.merchantName);

      // Get total combined sales
      const totalSales = await db
        .select({
          totalRevenue: sql`COALESCE(SUM(${posSales.totalAmount}::decimal), 0)`.as('totalRevenue'),
          totalTransactions: sql`COUNT(*)`.as('totalTransactions')
        })
        .from(posSales)
        .where(between(posSales.saleDate, start, end));

      res.json({
        locationBreakdown: locationSales,
        totalSummary: totalSales[0] || { totalRevenue: 0, totalTransactions: 0 }
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
          isActive: true,
          updatedAt: new Date()
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
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
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
        description,
        totalAmount,
        sourceSystem,
        externalId: externalId || null,
        reference: reference || null,
        isReconciled: false,
        createdAt: new Date(),
        updatedAt: new Date()
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
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
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

      console.log('Getting profit-loss data...');
      const profitLoss = await storage.getProfitLoss(startDate as string, endDate as string);
      console.log('Profit-loss result:', profitLoss);
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

      // Generate a professional product video that mimics Orthomolecular style
      const videoHtml = generateProfessionalProductVideo(videoConfig);

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

  // Professional video generation function
  function generateProfessionalProductVideo(config) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${config.productName} - Professional Product Video</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Roboto', sans-serif;
      background: #000;
      color: #fff;
      overflow: hidden;
      height: 100vh;
      position: relative;
    }
    
    /* Professional product video container */
    .video-container {
      width: 100%;
      height: 100vh;
      position: relative;
      background: linear-gradient(45deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* Floating pharmaceutical elements */
    .floating-elements {
      position: absolute;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
    }
    
    .molecule {
      position: absolute;
      width: 40px;
      height: 40px;
      border: 2px solid rgba(76, 175, 80, 0.3);
      border-radius: 50%;
      animation: floatMolecule 8s infinite ease-in-out;
    }
    
    .molecule:nth-child(1) { top: 20%; left: 10%; animation-delay: 0s; }
    .molecule:nth-child(2) { top: 40%; right: 15%; animation-delay: 2s; }
    .molecule:nth-child(3) { bottom: 30%; left: 20%; animation-delay: 4s; }
    .molecule:nth-child(4) { bottom: 60%; right: 25%; animation-delay: 6s; }
    
    /* Product showcase container */
    .product-showcase {
      max-width: 1200px;
      width: 100%;
      padding: 0 40px;
      text-align: center;
      z-index: 10;
      position: relative;
    }
    
    /* Product bottle simulation */
    .product-bottle {
      width: 200px;
      height: 300px;
      background: linear-gradient(145deg, #2c5282 0%, #3182ce 50%, #4299e1 100%);
      border-radius: 20px 20px 30px 30px;
      margin: 0 auto 40px;
      position: relative;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      animation: productRotate 12s infinite ease-in-out;
    }
    
    .bottle-cap {
      width: 60px;
      height: 30px;
      background: #1a202c;
      border-radius: 30px 30px 5px 5px;
      position: absolute;
      top: -15px;
      left: 50%;
      transform: translateX(-50%);
    }
    
    .bottle-label {
      background: rgba(255,255,255,0.95);
      color: #2d3748;
      padding: 20px 15px;
      margin: 50px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
    }
    
    /* Professional title styling */
    .product-title {
      font-size: 3.2em;
      font-weight: 700;
      margin-bottom: 20px;
      background: linear-gradient(45deg, #4299e1 0%, #63b3ed 50%, #90cdf4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-align: center;
      opacity: 0;
      animation: titleFadeIn 2s ease-out 1s forwards;
    }
    
    /* Scientific description */
    .product-description {
      font-size: 1.1em;
      line-height: 1.6;
      color: #e2e8f0;
      max-width: 800px;
      margin: 0 auto 30px;
      opacity: 0;
      animation: fadeInSlide 2s ease-out 3s forwards;
    }
    
    /* Key benefits with professional styling */
    .benefits-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin: 40px 0;
      opacity: 0;
      animation: benefitsSlideIn 2s ease-out 5s forwards;
    }
    
    .benefit-card {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.2);
      padding: 25px;
      border-radius: 15px;
      text-align: left;
    }
    
    .benefit-icon {
      width: 40px;
      height: 40px;
      background: #4299e1;
      border-radius: 50%;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
    }
    
    .benefit-title {
      font-size: 1.1em;
      font-weight: 600;
      margin-bottom: 8px;
      color: #4299e1;
    }
    
    .benefit-text {
      font-size: 0.9em;
      color: #cbd5e0;
      line-height: 1.4;
    }
    
    /* Professional call-to-action */
    .cta-section {
      margin-top: 50px;
      opacity: 0;
      animation: ctaFadeIn 2s ease-out 7s forwards;
    }
    
    .cta-text {
      font-size: 1.4em;
      font-weight: 500;
      color: #4299e1;
      margin-bottom: 15px;
    }
    
    .company-badge {
      background: rgba(66, 153, 225, 0.2);
      color: #90cdf4;
      padding: 8px 20px;
      border-radius: 20px;
      font-size: 0.9em;
      font-weight: 600;
      display: inline-block;
    }
    
    /* Animations */
    @keyframes floatMolecule {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(180deg); }
    }
    
    @keyframes productRotate {
      0%, 100% { transform: perspective(1000px) rotateY(0deg); }
      25% { transform: perspective(1000px) rotateY(15deg); }
      50% { transform: perspective(1000px) rotateY(0deg); }
      75% { transform: perspective(1000px) rotateY(-15deg); }
    }
    
    @keyframes titleFadeIn {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes fadeInSlide {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes benefitsSlideIn {
      from { opacity: 0; transform: translateY(40px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    @keyframes ctaFadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    
    /* Research validation styling */
    .research-badge {
      background: rgba(76, 175, 80, 0.2);
      color: #81c784;
      padding: 5px 12px;
      border-radius: 15px;
      font-size: 0.8em;
      font-weight: 500;
      margin: 10px 5px;
      display: inline-block;
    }
  </style>
</head>
<body>
  <div class="video-container">
    <!-- Floating pharmaceutical elements -->
    <div class="floating-elements">
      <div class="molecule"></div>
      <div class="molecule"></div>
      <div class="molecule"></div>
      <div class="molecule"></div>
    </div>
    
    <!-- Main product showcase -->
    <div class="product-showcase">
      <!-- Product bottle visualization -->
      <div class="product-bottle">
        <div class="bottle-cap"></div>
        <div class="bottle-label">
          ${config.productName}
        </div>
      </div>
      
      <!-- Product information -->
      <h1 class="product-title">${config.productName}</h1>
      
      <div class="product-description">
        ${config.productDescription.substring(0, 200)}...
      </div>
      
      <!-- Research validation badges -->
      <div style="margin: 20px 0;">
        <span class="research-badge">✓ Research Validated</span>
        <span class="research-badge">✓ Quality Tested</span>
        <span class="research-badge">✓ Professional Grade</span>
      </div>
      
      <!-- Key benefits grid -->
      <div class="benefits-grid">
        <div class="benefit-card">
          <div class="benefit-icon">⚗️</div>
          <div class="benefit-title">Scientific Formula</div>
          <div class="benefit-text">Clinically researched ingredients for optimal bioavailability</div>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">🔬</div>
          <div class="benefit-title">Quality Assurance</div>
          <div class="benefit-text">Third-party tested for purity and potency</div>
        </div>
        
        <div class="benefit-card">
          <div class="benefit-icon">🎯</div>
          <div class="benefit-title">Targeted Support</div>
          <div class="benefit-text">Designed for ${config.targetAudience || 'health-conscious individuals'}</div>
        </div>
      </div>
      
      <!-- Professional call-to-action -->
      <div class="cta-section">
        <div class="cta-text">Experience Professional-Grade Nutrition</div>
        <div class="company-badge">Pine Hill Farm - Premium Supplements</div>
      </div>
    </div>
  </div>
  
  <script>
    // Professional narration system
    function startProfessionalNarration() {
      const script = \`${config.script || `Discover ${config.productName} - a scientifically formulated supplement designed to support your health and wellness goals. Our research-backed formula delivers targeted nutrition for optimal results.`}\`;
      
      // Use professional voice settings
      const utterance = new SpeechSynthesisUtterance(script);
      
      // Get available voices and prefer female professional voices
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Woman') || 
        voice.name.includes('Samantha') ||
        voice.lang.includes('en-US')
      ) || voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      // Professional narration settings
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 0.8;
      
      // Start narration after initial animation
      setTimeout(() => {
        speechSynthesis.speak(utterance);
      }, 2000);
    }
    
    // Camera movement simulation
    function simulateCameraMovement() {
      const showcase = document.querySelector('.product-showcase');
      let position = 0;
      
      setInterval(() => {
        position += 0.5;
        const translateX = Math.sin(position * 0.01) * 10;
        const translateY = Math.cos(position * 0.01) * 5;
        showcase.style.transform = \`translate(\${translateX}px, \${translateY}px)\`;
      }, 50);
    }
    
    // Professional lighting effects
    function addProfessionalLighting() {
      const container = document.querySelector('.video-container');
      
      setInterval(() => {
        const lightness = 85 + Math.sin(Date.now() * 0.001) * 10;
        container.style.filter = \`brightness(\${lightness}%)\`;
      }, 100);
    }
    
    // Initialize professional video features
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(startProfessionalNarration, 1000);
      setTimeout(simulateCameraMovement, 3000);
      setTimeout(addProfessionalLighting, 5000);
    });
  </script>
</body>
</html>\`;
  }


      animation: progress ${videoConfig.videoLength}s linear forwards;
    }
    
    @keyframes progress {
      to { width: 100%; }
    }
    
    .audio-visualizer {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 3px;
      opacity: 0;
      animation: fadeInUp 1s ease-out 6s forwards;
    }
    
    .bar {
      width: 3px;
      background: #4ade80;
      border-radius: 2px;
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    .bar:nth-child(1) { height: 10px; animation-delay: 0.1s; }
    .bar:nth-child(2) { height: 15px; animation-delay: 0.2s; }
    .bar:nth-child(3) { height: 20px; animation-delay: 0.3s; }
    .bar:nth-child(4) { height: 15px; animation-delay: 0.4s; }
    .bar:nth-child(5) { height: 10px; animation-delay: 0.5s; }
    
    @keyframes pulse {
      0%, 100% { transform: scaleY(0.3); }
      50% { transform: scaleY(1); }
    }
  </style>
</head>
<body>
  <div class="floating-particles">
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
    <div class="particle"></div>
  </div>
  
  <div class="video-container">
    <div class="content">
      <div class="category-badge">${videoConfig.category}</div>
      <h1 class="product-title">${videoConfig.productName}</h1>
      <div class="description">
        ${videoConfig.productDescription.split('.').slice(0, 3).join('.') + '.'}
      </div>
      <div class="benefits-container">
        <h2 class="benefits-title">Key Benefits</h2>
        ${videoConfig.keyPoints.map(point => `<div class="benefit-item">${point}</div>`).join('')}
      </div>
      <div class="footer">
        Perfect for ${videoConfig.targetAudience} | ${videoConfig.videoLength} seconds
      </div>
    </div>
  </div>
  
  <div class="progress-bar"></div>
  
  <div class="audio-visualizer">
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
    <div class="bar"></div>
  </div>
  
  <script>
    // Enhanced speech synthesis with better voice selection
    function initializeVoice() {
      return new Promise((resolve) => {
        const checkVoices = () => {
          const voices = speechSynthesis.getVoices();
          if (voices.length > 0) {
            resolve(voices);
          } else {
            setTimeout(checkVoices, 100);
          }
        };
        checkVoices();
      });
    }
    
    async function speakText() {
      const voices = await initializeVoice();
      const text = "${videoConfig.script || 'Introducing ' + videoConfig.productName + '. ' + videoConfig.productDescription.split('.').slice(0, 3).join('.') + '. Key benefits include: ' + videoConfig.keyPoints.join(', ') + '. Experience the difference today!'}";
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a high-quality female voice
      const preferredVoice = voices.find(voice => 
        voice.name.toLowerCase().includes('female') || 
        voice.name.toLowerCase().includes('zira') ||
        voice.name.toLowerCase().includes('hazel') ||
        voice.name.toLowerCase().includes('samantha')
      ) || voices.find(voice => voice.lang.startsWith('en')) || voices[0];
      
      utterance.voice = preferredVoice;
      utterance.rate = 0.85;
      utterance.pitch = 1.1;
      utterance.volume = 0.9;
      
      // Add pauses and emphasis
      const enhancedText = text
        .replace(/\\./g, '... ')
        .replace(/Key benefits/g, 'Key... benefits')
        .replace(/Experience/g, '... Experience');
      
      utterance.text = enhancedText;
      speechSynthesis.speak(utterance);
    }
    
    // Start narration after initial animation
    setTimeout(speakText, 2000);
    
    // Add dynamic background color changes
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
    }, ${Math.floor(videoConfig.videoLength * 1000 / 4)});
  </script>
</body>
</html>`;

      const videoFilePath = path.join(videoDir, `video_${video.id}.html`);
      fs.writeFileSync(videoFilePath, videoHtml);

      // Update video status immediately
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
        message: 'Video generated successfully'
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
        
        // Extract key sentences from description
        const sentences = description.split('.').filter(s => s.trim().length > 10);
        const keyFacts = sentences.slice(0, 2).join('. ') + '.';
        
        // Create benefits section
        const benefitsText = benefits.length > 0 ? 
          `Key benefits include: ${benefits.join(', ')}.` : 
          'Proven benefits for your health and wellness.';
        
        return `${hook} ${keyFacts} ${benefitsText} ${closing}`;
      };

      if (!productName || !productDescription) {
        return res.status(400).json({ message: 'Product name and description are required' });
      }

      const script = generateEnhancedScript(
        productName, 
        productDescription, 
        keyPoints.filter(point => point.trim()), 
        videoLength, 
        videoStyle
      );

      res.json({
        script,
        wordCount: script.split(' ').length,
        estimatedDuration: Math.ceil(script.split(' ').length / 2.5)
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
      
      const video = await storage.getProductVideoById(videoId);
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      // Check if user owns this video (or is admin)
      if (video.userId !== user.id && user.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized to delete this video' });
      }

      // Delete the HTML file
      const videoPath = path.join(process.cwd(), 'uploads', 'videos', `video_${video.id}.html`);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }

      // Delete from database
      await storage.deleteProductVideo(videoId);

      res.json({ message: 'Video deleted successfully' });
    } catch (error) {
      console.error('Error deleting video:', error);
      res.status(500).json({ message: 'Failed to delete video' });
    }
  });

  // Get video templates
  app.get('/api/videos/templates', isAuthenticated, async (req, res) => {
    try {
      const { category } = req.query;
      const templates = await storage.getVideoTemplates(category as string);
      res.json(templates);
    } catch (error) {
      console.error('Error fetching video templates:', error);
      res.status(500).json({ message: 'Failed to fetch video templates' });
    }
  });

  // Get user's videos
  app.get('/api/videos', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const { status } = req.query;
      const videos = await storage.getUserVideos(user.id, status as string);
      res.json(videos);
    } catch (error) {
      console.error('Error fetching videos:', error);
      res.status(500).json({ message: 'Failed to fetch videos' });
    }
  });

  // Get video status
  app.get('/api/videos/status/:id', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getProductVideoById(id);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }

      res.json({
        id: video.id,
        renderStatus: video.renderStatus,
        renderProgress: video.renderProgress,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl,
        errorMessage: video.errorMessage
      });
    } catch (error) {
      console.error('Error fetching video status:', error);
      res.status(500).json({ message: 'Failed to fetch video status' });
    }
  });

  // Download video
  app.get('/api/videos/:id/download', isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const video = await storage.getProductVideoById(id);
      
      if (!video || !video.videoUrl) {
        return res.status(404).json({ message: 'Video not found or not ready' });
      }

      // Track download
      await storage.incrementVideoDownloadCount(id);

      res.json({
        downloadUrl: video.videoUrl,
        fileName: `${video.productName.replace(/\s+/g, '_')}_video.mp4`
      });
    } catch (error) {
      console.error('Error downloading video:', error);
      res.status(500).json({ message: 'Failed to download video' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}