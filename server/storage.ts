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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations - mandatory for Replit Auth
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserProfile(id: string, profileData: any): Promise<User>;

  // Time off requests
  createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest>;
  getUserTimeOffRequests(userId: string): Promise<TimeOffRequest[]>;
  getPendingTimeOffRequests(): Promise<TimeOffRequest[]>;
  updateTimeOffRequestStatus(id: number, status: string, reviewedBy: string, comments?: string): Promise<TimeOffRequest>;

  // Work schedules
  createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule>;
  getUserWorkSchedules(userId: string, startDate?: string, endDate?: string): Promise<WorkSchedule[]>;
  getWorkSchedulesByDate(date: string): Promise<WorkSchedule[]>;
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
    let query = db
      .select()
      .from(workSchedules)
      .where(eq(workSchedules.userId, userId));

    if (startDate && endDate) {
      query = query.where(
        and(
          gte(workSchedules.date, startDate),
          lte(workSchedules.date, endDate)
        )
      );
    }

    return await query.orderBy(asc(workSchedules.date));
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
    let query = db.select().from(shiftCoverageRequests);

    if (status) {
      query = query.where(eq(shiftCoverageRequests.status, status));
    }

    return await query.orderBy(desc(shiftCoverageRequests.requestedAt));
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

  async publishAnnouncement(id: number): Promise<Announcement> {
    const [published] = await db
      .update(announcements)
      .set({
        isPublished: true,
        publishedAt: new Date(),
      })
      .where(eq(announcements.id, id))
      .returning();
    return published;
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
}

export const storage = new DatabaseStorage();
