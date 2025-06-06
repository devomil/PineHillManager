import {
  users,
  timeOffRequests,
  workSchedules,
  shiftCoverageRequests,
  announcements,
  trainingModules,
  trainingProgress,
  messages,
  pushSubscriptions,
  notifications,
  locations,
  chatChannels,
  channelMembers,
  documents,
  documentPermissions,
  documentLogs,
  timeClockEntries,
  userPresence,
  logos,
  employeeInvitations,
  type User,
  type UpsertUser,
  type InsertTimeOffRequest,
  type TimeOffRequest,
  type InsertWorkSchedule,
  type WorkSchedule,
  type InsertShiftCoverageRequest,
  type ShiftCoverageRequest,
  type InsertAnnouncement,
  type Announcement,
  type InsertTrainingModule,
  type TrainingModule,
  type InsertTrainingProgress,
  type TrainingProgress,
  type InsertMessage,
  type Message,
  type InsertPushSubscription,
  type PushSubscription,
  type InsertNotification,
  type Notification,
  type Location,
  type InsertLocation,
  type CalendarEvent,
  type InsertChatChannel,
  type ChatChannel,
  type InsertChannelMember,
  type ChannelMember,
  type InsertDocument,
  type Document,
  type InsertDocumentPermission,
  type DocumentPermission,
  type InsertLogo,
  type Logo,
  type InsertDocumentLog,
  type DocumentLog,
  type InsertEmployeeInvitation,
  type EmployeeInvitation,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserProfile(id: string, profileData: any): Promise<User>;
  
  // Admin employee management
  createEmployee(employeeData: any): Promise<User>;
  updateEmployee(id: string, employeeData: any): Promise<User>;
  deleteEmployee(id: string): Promise<void>;
  getEmployeeByEmployeeId(employeeId: string): Promise<User | undefined>;

  // Time off requests
  createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest>;
  getUserTimeOffRequests(userId: string): Promise<TimeOffRequest[]>;
  getPendingTimeOffRequests(): Promise<TimeOffRequest[]>;
  updateTimeOffRequestStatus(id: number, status: string, reviewedBy: string, comments?: string): Promise<TimeOffRequest>;

  // Locations
  getAllLocations(): Promise<Location[]>;
  getLocationById(id: number): Promise<Location | undefined>;
  
  // Work schedules
  createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule>;
  getUserWorkSchedules(userId: string, startDate?: string, endDate?: string): Promise<WorkSchedule[]>;
  getWorkSchedulesByDate(date: string): Promise<WorkSchedule[]>;
  getWorkSchedulesByLocation(locationId: number, startDate?: string, endDate?: string): Promise<WorkSchedule[]>;
  getWorkSchedulesByDateRange(startDate: string, endDate: string): Promise<WorkSchedule[]>;
  getCalendarEvents(startDate: string, endDate: string): Promise<CalendarEvent[]>;
  updateWorkSchedule(id: number, schedule: Partial<InsertWorkSchedule>): Promise<WorkSchedule>;
  deleteWorkSchedule(id: number): Promise<void>;

  // Shift coverage requests
  createShiftCoverageRequest(request: InsertShiftCoverageRequest): Promise<ShiftCoverageRequest>;
  getShiftCoverageRequests(status?: string): Promise<ShiftCoverageRequest[]>;
  coverShiftRequest(id: number, coveredBy: string): Promise<ShiftCoverageRequest>;

  // Announcements
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getPublishedAnnouncements(): Promise<Announcement[]>;
  updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement>;
  publishAnnouncement(id: number): Promise<Announcement>;

  // Training modules
  createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule>;
  getAllTrainingModules(): Promise<TrainingModule[]>;
  updateTrainingModule(id: number, module: Partial<InsertTrainingModule>): Promise<TrainingModule>;

  // Training progress
  createOrUpdateTrainingProgress(progress: InsertTrainingProgress): Promise<TrainingProgress>;
  getUserTrainingProgress(userId: string): Promise<TrainingProgress[]>;
  updateTrainingProgress(id: number, progress: Partial<InsertTrainingProgress>): Promise<TrainingProgress>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getUserMessages(userId: string): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message>;

  // Push subscriptions
  savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  getPushSubscriptions(userId: string): Promise<PushSubscription[]>;
  getAllManagerPushSubscriptions(): Promise<PushSubscription[]>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: string): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<Notification>;
  getUnreadNotifications(userId: string): Promise<Notification[]>;

  // Chat channels
  createChatChannel(channel: InsertChatChannel): Promise<ChatChannel>;
  getUserChannels(userId: string): Promise<ChatChannel[]>;
  getAllChannels(): Promise<ChatChannel[]>;
  addChannelMember(member: InsertChannelMember): Promise<ChannelMember>;
  removeChannelMember(channelId: number, userId: string): Promise<void>;
  getChannelMembers(channelId: number): Promise<ChannelMember[]>;

  // Chat messages
  sendChannelMessage(message: InsertMessage): Promise<Message>;
  getChannelMessages(channelId: string, limit?: number): Promise<Message[]>;
  getDirectMessages(userId1: string, userId2: string, limit?: number): Promise<Message[]>;

  // Document management
  createDocument(document: InsertDocument): Promise<Document>;
  getDocuments(userId: string, category?: string): Promise<Document[]>;
  getDocumentById(id: number): Promise<Document | undefined>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  
  // Document permissions
  grantDocumentPermission(permission: InsertDocumentPermission): Promise<DocumentPermission>;
  getUserDocumentPermissions(userId: string): Promise<DocumentPermission[]>;
  getDocumentPermissions(documentId: number): Promise<DocumentPermission[]>;
  revokeDocumentPermission(id: number): Promise<void>;
  
  // Document logs
  logDocumentActivity(log: InsertDocumentLog): Promise<DocumentLog>;
  getDocumentLogs(documentId: number): Promise<DocumentLog[]>;

  // Time clock system
  clockIn(userId: string, locationId: number, ipAddress?: string, deviceInfo?: string): Promise<any>;
  clockOut(userId: string, notes?: string): Promise<any>;
  startBreak(userId: string): Promise<any>;
  endBreak(userId: string): Promise<any>;
  getCurrentTimeEntry(userId: string): Promise<any | undefined>;
  getTimeEntriesByDate(userId: string, date: string): Promise<any[]>;
  getTimeEntriesByDateRange(userId: string, startDate: string, endDate: string): Promise<any[]>;
  
  // User presence system
  updateUserPresence(userId: string, status: string, locationId?: number, statusMessage?: string): Promise<any>;
  getUserPresence(userId: string): Promise<any | undefined>;
  getAllUserPresence(): Promise<any[]>;
  getOnlineUsers(): Promise<any[]>;

  // Logo management
  getLogos(): Promise<Logo[]>;
  getAllLogos(): Promise<Logo[]>;
  createLogo(logoData: InsertLogo): Promise<Logo>;
  getLogoById(id: number): Promise<Logo | undefined>;
  getActiveLogoByName(name: string): Promise<Logo | undefined>;
  updateLogoStatus(id: number, isActive: boolean): Promise<Logo>;
  deleteLogo(id: number): Promise<void>;
  deactivateLogoByName(name: string): Promise<void>;

  // Employee invitations for beta testing
  createEmployeeInvitation(invitation: InsertEmployeeInvitation): Promise<EmployeeInvitation>;
  getEmployeeInvitations(status?: string): Promise<EmployeeInvitation[]>;
  getInvitationByToken(token: string): Promise<EmployeeInvitation | undefined>;
  acceptInvitation(token: string, userId: string): Promise<EmployeeInvitation>;
  expireOldInvitations(): Promise<void>;
  deleteInvitation(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true)).orderBy(asc(users.firstName));
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserProfile(id: string, profileData: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...profileData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Admin employee management methods
  async createEmployee(employeeData: any): Promise<User> {
    // Clean up empty date fields to avoid database errors
    const cleanedData = { ...employeeData };
    if (cleanedData.hireDate === '') {
      cleanedData.hireDate = null;
    }
    
    const [user] = await db
      .insert(users)
      .values({
        id: `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
        ...cleanedData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  async updateEmployee(id: string, employeeData: any): Promise<User> {
    // Clean up empty date fields to avoid database errors
    const cleanedData = { ...employeeData };
    if (cleanedData.hireDate === '') {
      cleanedData.hireDate = null;
    }
    
    const [user] = await db
      .update(users)
      .set({ 
        ...cleanedData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.employeeId, employeeId));
    return user;
  }

  // Locations
  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations).orderBy(asc(locations.name));
  }

  async getLocationById(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location;
  }

  // Time off requests
  async createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest> {
    const [timeOffRequest] = await db
      .insert(timeOffRequests)
      .values(request)
      .returning();
    return timeOffRequest;
  }

  async getUserTimeOffRequests(userId: string): Promise<TimeOffRequest[]> {
    return await db
      .select()
      .from(timeOffRequests)
      .where(eq(timeOffRequests.userId, userId))
      .orderBy(desc(timeOffRequests.requestedAt));
  }

  async getPendingTimeOffRequests(): Promise<TimeOffRequest[]> {
    return await db
      .select()
      .from(timeOffRequests)
      .where(eq(timeOffRequests.status, "pending"))
      .orderBy(desc(timeOffRequests.requestedAt));
  }

  async updateTimeOffRequestStatus(
    id: number,
    status: string,
    reviewedBy: string,
    comments?: string
  ): Promise<TimeOffRequest> {
    const [request] = await db
      .update(timeOffRequests)
      .set({
        status,
        reviewedBy,
        comments,
        reviewedAt: new Date(),
      })
      .where(eq(timeOffRequests.id, id))
      .returning();
    return request;
  }

  // Work schedules
  async createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule> {
    const [workSchedule] = await db
      .insert(workSchedules)
      .values(schedule)
      .returning();
    return workSchedule;
  }

  async getUserWorkSchedules(userId: string, startDate?: string, endDate?: string): Promise<WorkSchedule[]> {
    const conditions = [eq(workSchedules.userId, userId)];
    
    if (startDate && endDate) {
      conditions.push(
        gte(workSchedules.date, startDate),
        lte(workSchedules.date, endDate)
      );
    }

    return await db
      .select()
      .from(workSchedules)
      .where(and(...conditions))
      .orderBy(asc(workSchedules.date));
  }

  async getWorkSchedulesByDate(date: string): Promise<WorkSchedule[]> {
    return await db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.date, date))
      .orderBy(asc(workSchedules.startTime));
  }

  async updateWorkSchedule(id: number, schedule: Partial<InsertWorkSchedule>): Promise<WorkSchedule> {
    const [updatedSchedule] = await db
      .update(workSchedules)
      .set(schedule)
      .where(eq(workSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async getWorkSchedulesByLocation(locationId: number, startDate?: string, endDate?: string): Promise<WorkSchedule[]> {
    const conditions = [eq(workSchedules.locationId, locationId)];
    
    if (startDate && endDate) {
      conditions.push(
        gte(workSchedules.date, startDate),
        lte(workSchedules.date, endDate)
      );
    }

    return await db
      .select()
      .from(workSchedules)
      .where(and(...conditions))
      .orderBy(asc(workSchedules.date), asc(workSchedules.startTime));
  }

  async getWorkSchedulesByDateRange(startDate: string, endDate: string): Promise<WorkSchedule[]> {
    return await db
      .select()
      .from(workSchedules)
      .where(
        and(
          gte(workSchedules.date, startDate),
          lte(workSchedules.date, endDate)
        )
      )
      .orderBy(asc(workSchedules.date), asc(workSchedules.startTime));
  }

  async getCalendarEvents(startDate: string, endDate: string): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = [];

    // Get work schedules
    const schedules = await this.getWorkSchedulesByDateRange(startDate, endDate);
    for (const schedule of schedules) {
      events.push({
        id: `schedule-${schedule.id}`,
        title: `Work Shift`,
        start: `${schedule.date}T${schedule.startTime}`,
        end: `${schedule.date}T${schedule.endTime}`,
        type: 'schedule',
        userId: schedule.userId,
        locationId: schedule.locationId ?? undefined,
        status: schedule.status ?? undefined,
        description: schedule.notes || undefined,
        data: schedule
      });
    }

    // Get time off requests
    const timeOffRequestsResult = await db
      .select()
      .from(timeOffRequests)
      .where(
        and(
          gte(timeOffRequests.startDate, startDate),
          lte(timeOffRequests.endDate, endDate),
          eq(timeOffRequests.status, 'approved')
        )
      );

    for (const request of timeOffRequestsResult) {
      events.push({
        id: `timeoff-${request.id}`,
        title: `${request.reason || 'Time Off'} - Time Off`,
        start: `${request.startDate}T00:00:00`,
        end: `${request.endDate}T23:59:59`,
        type: 'timeoff',
        userId: request.userId,
        description: request.reason || '',
        data: request
      });
    }

    // Get shift coverage requests
    const coverageRequests = await db
      .select()
      .from(shiftCoverageRequests)
      .where(eq(shiftCoverageRequests.status, 'open'));

    for (const coverage of coverageRequests) {
      // Get the related schedule
      const [relatedSchedule] = await db
        .select()
        .from(workSchedules)
        .where(eq(workSchedules.id, coverage.scheduleId));

      if (relatedSchedule) {
        events.push({
          id: `coverage-${coverage.id}`,
          title: `Coverage Needed`,
          start: `${relatedSchedule.date}T${relatedSchedule.startTime}`,
          end: `${relatedSchedule.date}T${relatedSchedule.endTime}`,
          type: 'coverage_request',
          userId: coverage.requesterId,
          locationId: relatedSchedule.locationId ?? undefined,
          status: coverage.status,
          description: coverage.reason || '',
          data: { coverage, schedule: relatedSchedule }
        });
      }
    }

    return events;
  }

  async deleteWorkSchedule(id: number): Promise<void> {
    await db.delete(workSchedules).where(eq(workSchedules.id, id));
  }

  // Shift coverage requests
  async createShiftCoverageRequest(request: InsertShiftCoverageRequest): Promise<ShiftCoverageRequest> {
    const [coverageRequest] = await db
      .insert(shiftCoverageRequests)
      .values(request)
      .returning();
    return coverageRequest;
  }

  async getShiftCoverageRequests(status?: string): Promise<ShiftCoverageRequest[]> {
    const baseQuery = db.select().from(shiftCoverageRequests);
    
    if (status) {
      return await baseQuery
        .where(eq(shiftCoverageRequests.status, status))
        .orderBy(desc(shiftCoverageRequests.requestedAt));
    }

    return await baseQuery.orderBy(desc(shiftCoverageRequests.requestedAt));
  }

  async coverShiftRequest(id: number, coveredBy: string): Promise<ShiftCoverageRequest> {
    const [request] = await db
      .update(shiftCoverageRequests)
      .set({
        status: "covered",
        coveredBy,
        coveredAt: new Date(),
      })
      .where(eq(shiftCoverageRequests.id, id))
      .returning();
    return request;
  }

  // Announcements
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db
      .insert(announcements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }

  async getPublishedAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(eq(announcements.isPublished, true))
      .orderBy(desc(announcements.publishedAt));
  }

  async updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement> {
    const [updated] = await db
      .update(announcements)
      .set(announcement)
      .where(eq(announcements.id, id))
      .returning();
    return updated;
  }

  // Announcements
  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const [newAnnouncement] = await db
      .insert(announcements)
      .values(announcement)
      .returning();
    return newAnnouncement;
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
  }

  async getPublishedAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(eq(announcements.isPublished, true))
      .orderBy(desc(announcements.publishedAt));
  }

  async deleteAnnouncement(id: number): Promise<void> {
    await db.delete(announcements).where(eq(announcements.id, id));
  }

  // Training modules
  async createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule> {
    const [trainingModule] = await db
      .insert(trainingModules)
      .values(module)
      .returning();
    return trainingModule;
  }

  async getAllTrainingModules(): Promise<TrainingModule[]> {
    return await db
      .select()
      .from(trainingModules)
      .where(eq(trainingModules.isActive, true))
      .orderBy(asc(trainingModules.title));
  }

  async updateTrainingModule(id: number, module: Partial<InsertTrainingModule>): Promise<TrainingModule> {
    const [updated] = await db
      .update(trainingModules)
      .set({ ...module, updatedAt: new Date() })
      .where(eq(trainingModules.id, id))
      .returning();
    return updated;
  }

  // Training progress
  async createOrUpdateTrainingProgress(progress: InsertTrainingProgress): Promise<TrainingProgress> {
    const [trainingProgress_] = await db
      .insert(trainingProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [trainingProgress.userId, trainingProgress.moduleId],
        set: progress,
      })
      .returning();
    return trainingProgress_;
  }

  async getUserTrainingProgress(userId: string): Promise<TrainingProgress[]> {
    return await db
      .select()
      .from(trainingProgress)
      .where(eq(trainingProgress.userId, userId))
      .orderBy(desc(trainingProgress.startedAt));
  }

  async updateTrainingProgress(id: number, progress: Partial<InsertTrainingProgress>): Promise<TrainingProgress> {
    const [updated] = await db
      .update(trainingProgress)
      .set(progress)
      .where(eq(trainingProgress.id, id))
      .returning();
    return updated;
  }

  // Messages
  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getUserMessages(userId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.recipientId, userId))
      .orderBy(desc(messages.sentAt));
  }

  async markMessageAsRead(id: number): Promise<Message> {
    const [message] = await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(eq(messages.id, id))
      .returning();
    return message;
  }

  // Push subscription operations
  async savePushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription> {
    const [saved] = await db
      .insert(pushSubscriptions)
      .values(subscription)
      .onConflictDoUpdate({
        target: [pushSubscriptions.userId, pushSubscriptions.endpoint],
        set: {
          p256dhKey: subscription.p256dhKey,
          authKey: subscription.authKey,
        },
      })
      .returning();
    return saved;
  }

  async getPushSubscriptions(userId: string): Promise<PushSubscription[]> {
    return await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
  }

  async getAllManagerPushSubscriptions(): Promise<PushSubscription[]> {
    return await db
      .select({
        id: pushSubscriptions.id,
        userId: pushSubscriptions.userId,
        endpoint: pushSubscriptions.endpoint,
        p256dhKey: pushSubscriptions.p256dhKey,
        authKey: pushSubscriptions.authKey,
        createdAt: pushSubscriptions.createdAt,
      })
      .from(pushSubscriptions)
      .innerJoin(users, eq(pushSubscriptions.userId, users.id))
      .where(eq(users.role, "admin"));
  }

  // Notification operations
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.sentAt));
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const [notification] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();
    return notification;
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.isRead, false)
      ))
      .orderBy(desc(notifications.sentAt));
  }

  // Chat channels
  async createChatChannel(channel: InsertChatChannel): Promise<ChatChannel> {
    const [newChannel] = await db
      .insert(chatChannels)
      .values(channel)
      .returning();
    return newChannel;
  }

  async getUserChannels(userId: string): Promise<ChatChannel[]> {
    return await db
      .select({
        id: chatChannels.id,
        name: chatChannels.name,
        description: chatChannels.description,
        type: chatChannels.type,
        isPrivate: chatChannels.isPrivate,
        createdBy: chatChannels.createdBy,
        createdAt: chatChannels.createdAt,
      })
      .from(chatChannels)
      .innerJoin(channelMembers, eq(channelMembers.channelId, chatChannels.id))
      .where(eq(channelMembers.userId, userId))
      .orderBy(asc(chatChannels.name));
  }

  async getAllChannels(): Promise<ChatChannel[]> {
    return await db
      .select()
      .from(chatChannels)
      .where(eq(chatChannels.isPrivate, false))
      .orderBy(asc(chatChannels.name));
  }

  async addChannelMember(member: InsertChannelMember): Promise<ChannelMember> {
    const [newMember] = await db
      .insert(channelMembers)
      .values(member)
      .returning();
    return newMember;
  }

  async removeChannelMember(channelId: number, userId: string): Promise<void> {
    await db
      .delete(channelMembers)
      .where(and(
        eq(channelMembers.channelId, channelId),
        eq(channelMembers.userId, userId)
      ));
  }

  async getChannelMembers(channelId: number): Promise<ChannelMember[]> {
    return await db
      .select()
      .from(channelMembers)
      .where(eq(channelMembers.channelId, channelId))
      .orderBy(asc(channelMembers.joinedAt));
  }

  // Chat messages
  async sendChannelMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db
      .insert(messages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getChannelMessages(channelId: string, limit: number = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.sentAt))
      .limit(limit);
  }

  async getDirectMessages(userId1: string, userId2: string, limit: number = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.messageType, "direct"),
        and(
          eq(messages.senderId, userId1),
          eq(messages.recipientId, userId2)
        )
      ))
      .orderBy(desc(messages.sentAt))
      .limit(limit);
  }

  // Document management
  async createDocument(document: InsertDocument): Promise<Document> {
    const [doc] = await db
      .insert(documents)
      .values(document)
      .returning();
    return doc;
  }

  async getDocuments(userId: string, category?: string): Promise<Document[]> {
    let query = db
      .select()
      .from(documents)
      .where(eq(documents.uploadedBy, userId));
    
    if (category) {
      query = db
        .select()
        .from(documents)
        .where(and(
          eq(documents.uploadedBy, userId),
          eq(documents.category, category)
        ));
    }
    
    return query;
  }

  async getDocumentById(id: number): Promise<Document | undefined> {
    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id));
    return doc;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const [doc] = await db
      .update(documents)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return doc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getUserAccessibleDocuments(userId: string, userRole: string, userDepartment: string): Promise<Document[]> {
    // Get documents uploaded by user
    const userDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.uploadedBy, userId));

    // Get documents with explicit permissions
    const permissionDocs = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        originalName: documents.originalName,
        filePath: documents.filePath,
        fileSize: documents.fileSize,
        mimeType: documents.mimeType,
        category: documents.category,
        description: documents.description,
        uploadedBy: documents.uploadedBy,
        isPublic: documents.isPublic,
        isActive: documents.isActive,
        uploadedAt: documents.uploadedAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .innerJoin(documentPermissions, eq(documents.id, documentPermissions.documentId))
      .where(eq(documentPermissions.userId, userId));

    // Get public documents
    const publicDocs = await db
      .select()
      .from(documents)
      .where(eq(documents.isPublic, true));

    // Combine and deduplicate
    const allDocs = [...userDocs, ...permissionDocs, ...publicDocs];
    const uniqueDocs = allDocs.filter((doc, index, self) => 
      index === self.findIndex(d => d.id === doc.id)
    );

    return uniqueDocs;
  }

  // Document permissions
  async createDocumentPermission(permission: InsertDocumentPermission): Promise<DocumentPermission> {
    const [perm] = await db
      .insert(documentPermissions)
      .values(permission)
      .returning();
    return perm;
  }

  async getDocumentPermissions(documentId: number): Promise<DocumentPermission[]> {
    return db
      .select()
      .from(documentPermissions)
      .where(eq(documentPermissions.documentId, documentId));
  }

  async checkDocumentAccess(documentId: number, userId: string, userRole: string, userDepartment: string): Promise<boolean> {
    // Check if user is document owner
    const [doc] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.uploadedBy, userId)
      ));

    if (doc) return true;

    // Check if document is public
    const [publicDoc] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.isPublic, true)
      ));

    if (publicDoc) return true;

    // Check explicit permissions
    const [permission] = await db
      .select()
      .from(documentPermissions)
      .where(and(
        eq(documentPermissions.documentId, documentId),
        eq(documentPermissions.userId, userId)
      ));

    return !!permission;
  }

  async grantDocumentPermission(permission: InsertDocumentPermission): Promise<DocumentPermission> {
    const [perm] = await db
      .insert(documentPermissions)
      .values(permission)
      .returning();
    return perm;
  }

  async getUserDocumentPermissions(userId: string): Promise<DocumentPermission[]> {
    return db
      .select()
      .from(documentPermissions)
      .where(eq(documentPermissions.userId, userId));
  }

  async revokeDocumentPermission(id: number): Promise<void> {
    await db.delete(documentPermissions).where(eq(documentPermissions.id, id));
  }

  // Document logs
  async logDocumentActivity(log: InsertDocumentLog): Promise<DocumentLog> {
    const [docLog] = await db
      .insert(documentLogs)
      .values(log)
      .returning();
    return docLog;
  }

  async getDocumentLogs(documentId: number): Promise<DocumentLog[]> {
    return db
      .select()
      .from(documentLogs)
      .where(eq(documentLogs.documentId, documentId))
      .orderBy(desc(documentLogs.timestamp));
  }
  // Chat channels
  async getChatChannels(): Promise<ChatChannel[]> {
    return db
      .select()
      .from(chatChannels)
      .where(eq(chatChannels.isActive, true))
      .orderBy(asc(chatChannels.name));
  }

  async createChatChannel(channel: InsertChatChannel): Promise<ChatChannel> {
    const [newChannel] = await db
      .insert(chatChannels)
      .values(channel)
      .returning();
    return newChannel;
  }

  // Announcement read tracking
  async getUserReadAnnouncements(userId: string): Promise<any[]> {
    // For now, return empty array as we need to implement announcement_reads table
    // This would normally query a junction table tracking which announcements each user has read
    return [];
  }

  async markAnnouncementAsRead(userId: string, announcementId: number): Promise<boolean> {
    // For now, return true - this would normally insert into announcement_reads table
    return true;
  }

  // Time clock system implementation
  async clockIn(userId: string, locationId: number, ipAddress?: string, deviceInfo?: string): Promise<any> {
    const now = new Date();
    
    // Check if user is already clocked in
    const existingEntry = await this.getCurrentTimeEntry(userId);
    if (existingEntry && existingEntry.status === 'clocked_in') {
      throw new Error('User is already clocked in');
    }

    const [timeEntry] = await db
      .insert(timeClockEntries)
      .values({
        userId,
        locationId,
        clockInTime: now,
        status: 'clocked_in',
        ipAddress,
        deviceInfo,
        totalBreakMinutes: 0,
      })
      .returning();

    // Update user presence
    await this.updateUserPresence(userId, 'clocked_in', locationId, 'Working');

    return timeEntry;
  }

  async clockOut(userId: string, notes?: string): Promise<any> {
    const now = new Date();
    
    const currentEntry = await this.getCurrentTimeEntry(userId);
    if (!currentEntry || currentEntry.status === 'clocked_out') {
      throw new Error('User is not clocked in');
    }

    // Calculate total worked minutes
    const clockInTime = new Date(currentEntry.clockInTime);
    const totalWorkedMinutes = Math.floor((now.getTime() - clockInTime.getTime()) / (1000 * 60)) - currentEntry.totalBreakMinutes;

    const [timeEntry] = await db
      .update(timeClockEntries)
      .set({
        clockOutTime: now,
        status: 'clocked_out',
        totalWorkedMinutes,
        notes,
        updatedAt: now,
      })
      .where(eq(timeClockEntries.id, currentEntry.id))
      .returning();

    // Update user presence
    await this.updateUserPresence(userId, 'offline', undefined, 'Clocked out');

    return timeEntry;
  }

  async startBreak(userId: string): Promise<any> {
    const now = new Date();
    
    const currentEntry = await this.getCurrentTimeEntry(userId);
    if (!currentEntry || currentEntry.status !== 'clocked_in') {
      throw new Error('User must be clocked in to take a break');
    }

    const [timeEntry] = await db
      .update(timeClockEntries)
      .set({
        breakStartTime: now,
        status: 'on_break',
        updatedAt: now,
      })
      .where(eq(timeClockEntries.id, currentEntry.id))
      .returning();

    // Update user presence
    await this.updateUserPresence(userId, 'on_break', currentEntry.locationId, 'On break');

    return timeEntry;
  }

  async endBreak(userId: string): Promise<any> {
    const now = new Date();
    
    const currentEntry = await this.getCurrentTimeEntry(userId);
    if (!currentEntry || currentEntry.status !== 'on_break') {
      throw new Error('User is not on break');
    }

    const breakStartTime = new Date(currentEntry.breakStartTime!);
    const breakMinutes = Math.floor((now.getTime() - breakStartTime.getTime()) / (1000 * 60));
    const totalBreakMinutes = currentEntry.totalBreakMinutes + breakMinutes;

    const [timeEntry] = await db
      .update(timeClockEntries)
      .set({
        breakEndTime: now,
        status: 'clocked_in',
        totalBreakMinutes,
        updatedAt: now,
      })
      .where(eq(timeClockEntries.id, currentEntry.id))
      .returning();

    // Update user presence
    await this.updateUserPresence(userId, 'clocked_in', currentEntry.locationId, 'Working');

    return timeEntry;
  }

  async getCurrentTimeEntry(userId: string): Promise<any | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [entry] = await db
      .select()
      .from(timeClockEntries)
      .where(
        and(
          eq(timeClockEntries.userId, userId),
          gte(timeClockEntries.clockInTime, new Date(today + 'T00:00:00')),
          or(
            eq(timeClockEntries.status, 'clocked_in'),
            eq(timeClockEntries.status, 'on_break')
          )
        )
      )
      .orderBy(desc(timeClockEntries.clockInTime))
      .limit(1);
    
    return entry;
  }

  async getTimeEntriesByDate(userId: string, date: string): Promise<any[]> {
    const startDate = new Date(date + 'T00:00:00');
    const endDate = new Date(date + 'T23:59:59');
    
    return await db
      .select()
      .from(timeClockEntries)
      .where(
        and(
          eq(timeClockEntries.userId, userId),
          gte(timeClockEntries.clockInTime, startDate),
          lte(timeClockEntries.clockInTime, endDate)
        )
      )
      .orderBy(desc(timeClockEntries.clockInTime));
  }

  async getTimeEntriesByDateRange(userId: string, startDate: string, endDate: string): Promise<any[]> {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    
    return await db
      .select()
      .from(timeClockEntries)
      .where(
        and(
          eq(timeClockEntries.userId, userId),
          gte(timeClockEntries.clockInTime, start),
          lte(timeClockEntries.clockInTime, end)
        )
      )
      .orderBy(desc(timeClockEntries.clockInTime));
  }

  // User presence system implementation
  async updateUserPresence(userId: string, status: string, locationId?: number, statusMessage?: string): Promise<any> {
    const now = new Date();
    
    const [presence] = await db
      .insert(userPresence)
      .values({
        userId,
        status,
        lastSeen: now,
        currentLocation: locationId?.toString(),
        statusMessage,
        isWorking: status === 'clocked_in' || status === 'on_break',
        clockedInAt: status === 'clocked_in' ? now : undefined,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: userPresence.userId,
        set: {
          status,
          lastSeen: now,
          currentLocation: locationId?.toString(),
          statusMessage,
          isWorking: status === 'clocked_in' || status === 'on_break',
          clockedInAt: status === 'clocked_in' ? now : undefined,
          updatedAt: now,
        },
      })
      .returning();

    return presence;
  }

  async getUserPresence(userId: string): Promise<any | undefined> {
    const [presence] = await db
      .select()
      .from(userPresence)
      .where(eq(userPresence.userId, userId));
    
    return presence;
  }

  async getAllUserPresence(): Promise<any[]> {
    return await db
      .select({
        userId: userPresence.userId,
        status: userPresence.status,
        lastSeen: userPresence.lastSeen,
        currentLocation: userPresence.currentLocation,
        statusMessage: userPresence.statusMessage,
        isWorking: userPresence.isWorking,
        clockedInAt: userPresence.clockedInAt,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(userPresence)
      .leftJoin(users, eq(userPresence.userId, users.id))
      .orderBy(asc(users.firstName));
  }

  async getOnlineUsers(): Promise<any[]> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    return await db
      .select({
        userId: userPresence.userId,
        status: userPresence.status,
        lastSeen: userPresence.lastSeen,
        currentLocation: userPresence.currentLocation,
        statusMessage: userPresence.statusMessage,
        isWorking: userPresence.isWorking,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      })
      .from(userPresence)
      .leftJoin(users, eq(userPresence.userId, users.id))
      .where(
        and(
          gte(userPresence.lastSeen, fiveMinutesAgo),
          or(
            eq(userPresence.status, 'online'),
            eq(userPresence.status, 'clocked_in'),
            eq(userPresence.status, 'on_break')
          )
        )
      )
      .orderBy(asc(users.firstName));
  }

  // Logo management methods
  async getLogos(): Promise<Logo[]> {
    return await db
      .select()
      .from(logos)
      .orderBy(desc(logos.uploadedAt));
  }

  async getAllLogos(): Promise<Logo[]> {
    return await db
      .select()
      .from(logos)
      .orderBy(desc(logos.uploadedAt));
  }

  async createLogo(logoData: InsertLogo): Promise<Logo> {
    const [logo] = await db
      .insert(logos)
      .values(logoData)
      .returning();
    return logo;
  }

  async getLogoById(id: number): Promise<Logo | undefined> {
    const [logo] = await db
      .select()
      .from(logos)
      .where(eq(logos.id, id));
    return logo;
  }

  async getActiveLogoByName(name: string): Promise<Logo | undefined> {
    const [logo] = await db
      .select()
      .from(logos)
      .where(and(eq(logos.name, name), eq(logos.isActive, true)))
      .orderBy(desc(logos.uploadedAt))
      .limit(1);
    return logo;
  }

  async updateLogoStatus(id: number, isActive: boolean): Promise<Logo> {
    const [logo] = await db
      .update(logos)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(logos.id, id))
      .returning();
    return logo;
  }

  async deleteLogo(id: number): Promise<void> {
    await db
      .delete(logos)
      .where(eq(logos.id, id));
  }

  async deactivateLogoByName(name: string): Promise<void> {
    await db
      .update(logos)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(logos.name, name));
  }

  // Employee invitations for beta testing
  async createEmployeeInvitation(invitation: InsertEmployeeInvitation): Promise<EmployeeInvitation> {
    const [invite] = await db
      .insert(employeeInvitations)
      .values(invitation)
      .returning();
    return invite;
  }

  async getEmployeeInvitations(status?: string): Promise<EmployeeInvitation[]> {
    if (status) {
      return await db.select().from(employeeInvitations).where(eq(employeeInvitations.status, status)).orderBy(desc(employeeInvitations.invitedAt));
    }
    return await db.select().from(employeeInvitations).orderBy(desc(employeeInvitations.invitedAt));
  }

  async getInvitationByToken(token: string): Promise<EmployeeInvitation | undefined> {
    const [invitation] = await db.select().from(employeeInvitations).where(eq(employeeInvitations.inviteToken, token));
    return invitation;
  }

  async acceptInvitation(token: string, userId: string): Promise<EmployeeInvitation> {
    const [invitation] = await db
      .update(employeeInvitations)
      .set({ status: 'accepted', acceptedAt: new Date() })
      .where(eq(employeeInvitations.inviteToken, token))
      .returning();
    return invitation;
  }

  async expireOldInvitations(): Promise<void> {
    await db
      .update(employeeInvitations)
      .set({ status: 'expired' })
      .where(and(
        eq(employeeInvitations.status, 'pending'),
        lte(employeeInvitations.expiresAt, new Date())
      ));
  }

  async deleteInvitation(id: number): Promise<void> {
    await db
      .delete(employeeInvitations)
      .where(eq(employeeInvitations.id, id));
  }
}

export const storage = new DatabaseStorage();
