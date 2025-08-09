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
  passwordResetTokens,
  // Accounting Tables
  quickbooksConfig,
  cloverConfig,
  hsaConfig,
  thriveConfig,
  financialAccounts,
  financialTransactions,
  financialTransactionLines,
  customersVendors,
  inventoryItems,
  posSales,
  posSaleItems,
  hsaExpenses,
  integrationLogs,
  reportConfigs,
  dashboardWidgets,
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
  // Accounting Types
  type QuickbooksConfig,
  type InsertQuickbooksConfig,
  type CloverConfig,
  type InsertCloverConfig,
  type HsaConfig,
  type InsertHsaConfig,
  type ThriveConfig,
  type InsertThriveConfig,
  type FinancialAccount,
  type InsertFinancialAccount,
  type FinancialTransaction,
  type InsertFinancialTransaction,
  type FinancialTransactionLine,
  type InsertFinancialTransactionLine,
  type CustomersVendors,
  type InsertCustomersVendors,
  type InventoryItem,
  type InsertInventoryItem,
  type PosSale,
  type InsertPosSale,
  type PosSaleItem,
  type InsertPosSaleItem,
  type HsaExpense,
  type InsertHsaExpense,
  type IntegrationLog,
  type InsertIntegrationLog,
  type ReportConfig,
  type InsertReportConfig,
  type DashboardWidget,
  type InsertDashboardWidget,
  // QR Code schema imports
  qrCodes,
  type QrCode,
  type InsertQrCode,
  type UpdateQrCode,
  // Video schema imports
  videoTemplates,
  productVideos,
  videoAssets,
  type VideoTemplate,
  type InsertVideoTemplate,
  type ProductVideo,
  type InsertProductVideo,
  type UpdateProductVideo,
  type VideoAsset,
  type InsertVideoAsset,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations - supports both Replit Auth and traditional email/password
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(userData: any): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;
  updateUserProfile(id: string, profileData: any): Promise<User>;
  
  // Password reset functionality
  createPasswordResetToken(userId: string, token: string): Promise<void>;
  validatePasswordResetToken(token: string): Promise<string | null>;
  deletePasswordResetToken(token: string): Promise<void>;
  
  // Admin employee management
  createEmployee(employeeData: any): Promise<User>;
  updateEmployee(id: string, employeeData: any): Promise<User>;
  deleteEmployee(id: string): Promise<void>;
  getEmployeeByEmployeeId(employeeId: string): Promise<User | undefined>;
  
  // Password management (admin only)
  hashPassword(password: string): Promise<string>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;

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
  clearAllWorkSchedules(): Promise<number>;

  // Shift coverage requests
  createShiftCoverageRequest(request: InsertShiftCoverageRequest): Promise<ShiftCoverageRequest>;
  getShiftCoverageRequests(status?: string): Promise<ShiftCoverageRequest[]>;
  coverShiftRequest(id: number, coveredBy: string): Promise<ShiftCoverageRequest>;

  // Announcements
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  getAllAnnouncements(): Promise<Announcement[]>;
  getPublishedAnnouncements(): Promise<Announcement[]>;
  updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement>;
  publishAnnouncement(id: number): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;

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
  getUnreadMessageCount(userId: string): Promise<number>;
  markMessagesAsRead(userId: string, channelId?: string): Promise<void>;

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

  // System analytics methods for technical support
  getAllTimeEntries(): Promise<any[]>;
  getAllWorkSchedules(): Promise<WorkSchedule[]>;
  getAllShiftCoverageRequests(): Promise<ShiftCoverageRequest[]>;
  getAllTimeOffRequests(): Promise<TimeOffRequest[]>;
  getUnreadMessageCount(userId: string): Promise<number>;
  markMessagesAsRead(userId: string, channelId: string): Promise<void>;
  updateUserPresenceOnClockIn(userId: string, locationId: number): Promise<void>;

  // Messages and communication
  getMessagesByChannel(channelId: string): Promise<any[]>;
  createMessage(messageData: InsertMessage): Promise<Message>;
  getAllUserPresence(): Promise<any[]>;
  getUserPresence(userId: string): Promise<any | undefined>;

  // ============================================
  // ACCOUNTING TOOL STORAGE OPERATIONS
  // ============================================

  // Integration Configuration Management
  createQuickbooksConfig(config: InsertQuickbooksConfig): Promise<QuickbooksConfig>;
  getQuickbooksConfig(companyId: string): Promise<QuickbooksConfig | undefined>;
  updateQuickbooksConfig(id: number, config: Partial<InsertQuickbooksConfig>): Promise<QuickbooksConfig>;
  getActiveQuickbooksConfig(): Promise<QuickbooksConfig | undefined>;
  
  createCloverConfig(config: InsertCloverConfig): Promise<CloverConfig>;
  getCloverConfig(merchantId: string): Promise<CloverConfig | undefined>;
  updateCloverConfig(id: number, config: Partial<InsertCloverConfig>): Promise<CloverConfig>;
  getActiveCloverConfig(): Promise<CloverConfig | undefined>;
  
  createHsaConfig(config: InsertHsaConfig): Promise<HsaConfig>;
  getHsaConfig(): Promise<HsaConfig | undefined>;
  updateHsaConfig(id: number, config: Partial<InsertHsaConfig>): Promise<HsaConfig>;
  
  createThriveConfig(config: InsertThriveConfig): Promise<ThriveConfig>;
  getThriveConfig(storeId: string): Promise<ThriveConfig | undefined>;
  updateThriveConfig(id: number, config: Partial<InsertThriveConfig>): Promise<ThriveConfig>;
  getActiveThriveConfig(): Promise<ThriveConfig | undefined>;

  // Financial Accounts (Chart of Accounts)
  createFinancialAccount(account: InsertFinancialAccount): Promise<FinancialAccount>;
  getAllFinancialAccounts(): Promise<FinancialAccount[]>;
  getFinancialAccountById(id: number): Promise<FinancialAccount | undefined>;
  getFinancialAccountByQBId(qbAccountId: string): Promise<FinancialAccount | undefined>;
  updateFinancialAccount(id: number, account: Partial<InsertFinancialAccount>): Promise<FinancialAccount>;
  deleteFinancialAccount(id: number): Promise<void>;
  getAccountsByType(accountType: string): Promise<FinancialAccount[]>;

  // Financial Transactions
  createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  getAllFinancialTransactions(limit?: number, offset?: number): Promise<FinancialTransaction[]>;
  getFinancialTransactionById(id: number): Promise<FinancialTransaction | undefined>;
  getTransactionsByDateRange(startDate: string, endDate: string): Promise<FinancialTransaction[]>;
  getTransactionsBySourceSystem(sourceSystem: string): Promise<FinancialTransaction[]>;
  updateFinancialTransaction(id: number, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction>;
  deleteFinancialTransaction(id: number): Promise<void>;

  // Financial Transaction Lines
  createTransactionLine(line: InsertFinancialTransactionLine): Promise<FinancialTransactionLine>;
  getTransactionLines(transactionId: number): Promise<FinancialTransactionLine[]>;
  updateTransactionLine(id: number, line: Partial<InsertFinancialTransactionLine>): Promise<FinancialTransactionLine>;
  deleteTransactionLine(id: number): Promise<void>;

  // Customers and Vendors
  createCustomerVendor(customerVendor: InsertCustomersVendors): Promise<CustomersVendors>;
  getAllCustomersVendors(): Promise<CustomersVendors[]>;
  getCustomerVendorById(id: number): Promise<CustomersVendors | undefined>;
  getCustomerVendorByQBId(qbId: string): Promise<CustomersVendors | undefined>;
  getCustomersByType(type: 'customer' | 'vendor'): Promise<CustomersVendors[]>;
  updateCustomerVendor(id: number, customerVendor: Partial<InsertCustomersVendors>): Promise<CustomersVendors>;
  deleteCustomerVendor(id: number): Promise<void>;

  // Inventory Items
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  getAllInventoryItems(): Promise<InventoryItem[]>;
  getInventoryItemById(id: number): Promise<InventoryItem | undefined>;
  getInventoryItemByQBId(qbItemId: string): Promise<InventoryItem | undefined>;
  getInventoryItemByThriveId(thriveItemId: string): Promise<InventoryItem | undefined>;
  getInventoryItemsBySKU(sku: string): Promise<InventoryItem[]>;
  getLowStockItems(): Promise<InventoryItem[]>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  updateInventoryQuantity(id: number, quantity: string): Promise<InventoryItem>;
  deleteInventoryItem(id: number): Promise<void>;

  // POS Sales (from Clover)
  createPosSale(sale: InsertPosSale): Promise<PosSale>;
  getAllPosSales(limit?: number, offset?: number): Promise<PosSale[]>;
  getPosSaleById(id: number): Promise<PosSale | undefined>;
  getPosSaleByCloverOrderId(cloverOrderId: string): Promise<PosSale | undefined>;
  getSalesByDateRange(startDate: string, endDate: string): Promise<PosSale[]>;
  getSalesByLocation(locationId: number, startDate?: string, endDate?: string): Promise<PosSale[]>;
  getUnpostedSales(): Promise<PosSale[]>;
  updatePosSale(id: number, sale: Partial<InsertPosSale>): Promise<PosSale>;
  markSaleAsPostedToQB(id: number, qbTransactionId: string): Promise<PosSale>;

  // POS Sale Items
  createPosSaleItem(item: InsertPosSaleItem): Promise<PosSaleItem>;
  getSaleItems(saleId: number): Promise<PosSaleItem[]>;
  updatePosSaleItem(id: number, item: Partial<InsertPosSaleItem>): Promise<PosSaleItem>;
  deleteSaleItem(id: number): Promise<void>;

  // HSA Expenses
  createHsaExpense(expense: InsertHsaExpense): Promise<HsaExpense>;
  getAllHsaExpenses(): Promise<HsaExpense[]>;
  getHsaExpenseById(id: number): Promise<HsaExpense | undefined>;
  getHsaExpensesByEmployee(employeeId: string): Promise<HsaExpense[]>;
  getHsaExpensesByDateRange(startDate: string, endDate: string): Promise<HsaExpense[]>;
  getPendingHsaExpenses(): Promise<HsaExpense[]>;
  getUnpostedHsaExpenses(): Promise<HsaExpense[]>;
  updateHsaExpense(id: number, expense: Partial<InsertHsaExpense>): Promise<HsaExpense>;
  approveHsaExpense(id: number, approvedBy: string): Promise<HsaExpense>;
  markHsaExpenseAsPostedToQB(id: number, qbTransactionId: string): Promise<HsaExpense>;
  deleteHsaExpense(id: number): Promise<void>;

  // Integration Logs
  createIntegrationLog(log: InsertIntegrationLog): Promise<IntegrationLog>;
  getIntegrationLogs(system?: string, status?: string, limit?: number): Promise<IntegrationLog[]>;
  getIntegrationLogsByDateRange(startDate: string, endDate: string, system?: string): Promise<IntegrationLog[]>;
  deleteOldLogs(daysToKeep: number): Promise<number>;

  // Report Configurations
  createReportConfig(config: InsertReportConfig): Promise<ReportConfig>;
  getAllReportConfigs(): Promise<ReportConfig[]>;
  getReportConfigById(id: number): Promise<ReportConfig | undefined>;
  getUserReportConfigs(userId: string): Promise<ReportConfig[]>;
  getPublicReportConfigs(): Promise<ReportConfig[]>;
  updateReportConfig(id: number, config: Partial<InsertReportConfig>): Promise<ReportConfig>;
  deleteReportConfig(id: number): Promise<void>;

  // Dashboard Widgets
  createDashboardWidget(widget: InsertDashboardWidget): Promise<DashboardWidget>;
  getUserDashboardWidgets(userId: string): Promise<DashboardWidget[]>;
  updateDashboardWidget(id: number, widget: Partial<InsertDashboardWidget>): Promise<DashboardWidget>;
  deleteDashboardWidget(id: number): Promise<void>;
  updateWidgetPosition(id: number, position: number): Promise<DashboardWidget>;

  // Financial Analytics Methods
  getAccountBalance(accountId: number, asOfDate?: string): Promise<string>;
  getTrialBalance(asOfDate?: string): Promise<{ accountName: string; balance: string; accountType: string }[]>;
  getProfitLoss(startDate: string, endDate: string): Promise<{ revenue: string; expenses: string; netIncome: string }>;
  getCashFlow(startDate: string, endDate: string): Promise<{ cashIn: string; cashOut: string; netCash: string }>;
  getSalesSummary(startDate: string, endDate: string, locationId?: number): Promise<{ totalSales: string; totalTax: string; totalTips: string; transactionCount: number }>;
  getInventoryValuation(): Promise<{ totalCost: string; totalRetail: string; itemCount: number }>;

  // QR Code operations
  createQrCode(qrCodeData: InsertQrCode & { qrCodeData: string }): Promise<QrCode>;
  getAllQrCodes(): Promise<QrCode[]>;
  getQrCodesByUser(userId: string): Promise<QrCode[]>;
  getQrCodesByCategory(category: string): Promise<QrCode[]>;
  getQrCodeById(id: number): Promise<QrCode | undefined>;
  updateQrCode(id: number, updates: UpdateQrCode & { qrCodeData?: string }): Promise<QrCode | undefined>;
  deleteQrCode(id: number): Promise<boolean>;
  incrementQrCodeDownloadCount(id: number): Promise<QrCode | undefined>;

  // Video Creation operations
  createVideoTemplate(template: InsertVideoTemplate): Promise<VideoTemplate>;
  getVideoTemplates(category?: string): Promise<VideoTemplate[]>;
  getVideoTemplateById(id: number): Promise<VideoTemplate | undefined>;
  updateVideoTemplate(id: number, updates: Partial<InsertVideoTemplate>): Promise<VideoTemplate | undefined>;
  deleteVideoTemplate(id: number): Promise<boolean>;

  createProductVideo(video: InsertProductVideo): Promise<ProductVideo>;
  getProductVideoById(id: number): Promise<ProductVideo | undefined>;
  getUserVideos(userId: string, status?: string): Promise<ProductVideo[]>;
  getAllProductVideos(limit?: number, offset?: number): Promise<ProductVideo[]>;
  updateProductVideo(id: number, updates: UpdateProductVideo): Promise<ProductVideo | undefined>;
  deleteProductVideo(id: number): Promise<boolean>;
  incrementVideoDownloadCount(id: number): Promise<ProductVideo | undefined>;

  createVideoAsset(asset: InsertVideoAsset): Promise<VideoAsset>;
  getVideoAssets(videoId: number): Promise<VideoAsset[]>;
  deleteVideoAsset(id: number): Promise<boolean>;
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

  async createUser(userData: any): Promise<User> {
    const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return user;
  }

  // Password reset functionality
  async createPasswordResetToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });
  }

  async validatePasswordResetToken(token: string): Promise<string | null> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return null;
    }

    return resetToken.userId;
  }

  async deletePasswordResetToken(token: string): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.token, token));
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

  // Password management methods
  async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcrypt');
    return bcrypt.hash(password, 12);
  }

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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

  async getWorkSchedulesByDateRange(startDate: string, endDate: string, userId?: string): Promise<WorkSchedule[]> {
    const conditions = [
      gte(workSchedules.date, startDate),
      lte(workSchedules.date, endDate)
    ];
    
    if (userId) {
      conditions.push(eq(workSchedules.userId, userId));
    }

    return await db
      .select()
      .from(workSchedules)
      .where(and(...conditions))
      .orderBy(asc(workSchedules.date), asc(workSchedules.startTime));
  }

  async updateWorkSchedule(id: number, schedule: Partial<InsertWorkSchedule>): Promise<WorkSchedule> {
    const [updatedSchedule] = await db
      .update(workSchedules)
      .set(schedule)
      .where(eq(workSchedules.id, id))
      .returning();
    return updatedSchedule;
  }

  async clearAllWorkSchedules(): Promise<number> {
    const result = await db.delete(workSchedules);
    return result.rowCount || 0;
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

  async getShiftCoverageRequests(status?: string): Promise<any[]> {
    const baseQuery = db
      .select({
        id: shiftCoverageRequests.id,
        status: shiftCoverageRequests.status,
        reason: shiftCoverageRequests.reason,
        requestedAt: shiftCoverageRequests.requestedAt,
        requesterId: shiftCoverageRequests.requesterId,
        scheduleId: shiftCoverageRequests.scheduleId,
        coveredBy: shiftCoverageRequests.coveredBy,
        coveredAt: shiftCoverageRequests.coveredAt,
        // Include schedule data
        shiftDate: workSchedules.date,
        startTime: workSchedules.startTime,
        endTime: workSchedules.endTime,
        locationId: workSchedules.locationId,
      })
      .from(shiftCoverageRequests)
      .leftJoin(workSchedules, eq(shiftCoverageRequests.scheduleId, workSchedules.id));
    
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

  async getAnnouncementById(id: number): Promise<Announcement | undefined> {
    const [announcement] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id));
    return announcement;
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
        isActive: chatChannels.isActive,
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



  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.recipientId, userId),
            eq(messages.isRead, false)
          )
        );
      return result[0]?.count || 0;
    } catch (error) {
      console.log("Database error in getUnreadMessageCount, returning 0");
      return 0;
    }
  }

  async markMessagesAsRead(userId: string, channelId?: string): Promise<void> {
    try {
      const whereConditions = [eq(messages.recipientId, userId)];
      
      if (channelId) {
        whereConditions.push(eq(messages.channelId, channelId));
      }
      
      await db
        .update(messages)
        .set({ isRead: true, readAt: new Date() })
        .where(and(...whereConditions));
    } catch (error) {
      console.log("Database error in markMessagesAsRead, skipping");
    }
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

  // Enhanced chat and messaging functionality

  async getChannelMessages(channelId: string, limit: number = 50): Promise<any[]> {
    const channelMessages = await db
      .select({
        id: messages.id,
        content: messages.content,
        sentAt: messages.sentAt,
        senderId: messages.senderId,
        senderName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Unknown User')`
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.sentAt))
      .limit(limit);
    
    return channelMessages;
  }





  async getAllUsersWithPresence(): Promise<any[]> {
    const usersWithPresence = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        status: userPresence.status,
        isWorking: userPresence.isWorking,
        lastSeen: userPresence.lastSeen,
        currentLocation: userPresence.currentLocation
      })
      .from(users)
      .leftJoin(userPresence, eq(users.id, userPresence.userId))
      .where(eq(users.isActive, true));
    
    return usersWithPresence;
  }

  async updateUserPresenceOnClockIn(userId: string, locationId: number): Promise<void> {
    await this.updateUserPresence(userId, 'clocked_in', locationId);
  }

  async updateUserPresenceOnClockOut(userId: string): Promise<void> {
    await this.updateUserPresence(userId, 'offline');
  }

  async updateUserPresenceOnBreak(userId: string, locationId: number): Promise<void> {
    await this.updateUserPresence(userId, 'on_break', locationId);
  }

  // System analytics methods for technical support
  async getAllTimeEntries(): Promise<any[]> {
    return await db.select().from(timeClockEntries);
  }

  async getAllWorkSchedules(): Promise<WorkSchedule[]> {
    return await db.select().from(workSchedules);
  }

  async getAllShiftCoverageRequests(): Promise<ShiftCoverageRequest[]> {
    return await db.select().from(shiftCoverageRequests);
  }

  async getAllTimeOffRequests(): Promise<TimeOffRequest[]> {
    return await db.select().from(timeOffRequests);
  }





  async getDirectMessages(userId1: string, userId2: string, limit: number = 50): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.messageType, "direct"),
        or(
          and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
        )
      ))
      .orderBy(desc(messages.sentAt))
      .limit(limit);
  }

  // Messages and communication - required by API endpoints
  async getMessagesByChannel(channelId: string): Promise<any[]> {
    return await db
      .select({
        id: messages.id,
        content: messages.content,
        sentAt: messages.sentAt,
        senderId: messages.senderId,
        channelId: messages.channelId,
        messageType: messages.messageType,
        senderName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Unknown User')`
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(and(
        eq(messages.channelId, channelId),
        eq(messages.messageType, 'channel')
      ))
      .orderBy(desc(messages.sentAt))
      .limit(50);
  }

  async createMessage(messageData: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values({
        ...messageData,
        sentAt: new Date()
      })
      .returning();
    return message;
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
      .where(eq(users.isActive, true))
      .orderBy(asc(users.firstName));
  }

  // ============================================
  // ACCOUNTING TOOL IMPLEMENTATIONS
  // ============================================

  // QuickBooks Configuration Management
  async createQuickbooksConfig(config: InsertQuickbooksConfig): Promise<QuickbooksConfig> {
    const [qbConfig] = await db.insert(quickbooksConfig).values(config).returning();
    return qbConfig;
  }

  async getQuickbooksConfig(companyId: string): Promise<QuickbooksConfig | undefined> {
    const [config] = await db.select().from(quickbooksConfig).where(eq(quickbooksConfig.companyId, companyId));
    return config;
  }

  async updateQuickbooksConfig(id: number, config: Partial<InsertQuickbooksConfig>): Promise<QuickbooksConfig> {
    const [updated] = await db.update(quickbooksConfig).set({ ...config, updatedAt: new Date() }).where(eq(quickbooksConfig.id, id)).returning();
    return updated;
  }

  async getActiveQuickbooksConfig(): Promise<QuickbooksConfig | undefined> {
    const [config] = await db.select().from(quickbooksConfig).where(eq(quickbooksConfig.isActive, true));
    return config;
  }

  // Clover Configuration Management  
  async createCloverConfig(config: InsertCloverConfig): Promise<CloverConfig> {
    const [cloverConf] = await db.insert(cloverConfig).values({
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return cloverConf;
  }

  async getCloverConfig(merchantId: string): Promise<CloverConfig | undefined> {
    const [config] = await db.select().from(cloverConfig).where(eq(cloverConfig.merchantId, merchantId));
    return config;
  }

  async updateCloverConfig(id: number, config: Partial<InsertCloverConfig>): Promise<CloverConfig> {
    const [updated] = await db.update(cloverConfig).set({ ...config, updatedAt: new Date() }).where(eq(cloverConfig.id, id)).returning();
    return updated;
  }

  async getActiveCloverConfig(): Promise<CloverConfig | undefined> {
    const [config] = await db.select().from(cloverConfig).where(eq(cloverConfig.isActive, true));
    return config;
  }

  // HSA Configuration Management
  async createHsaConfig(config: InsertHsaConfig): Promise<HsaConfig> {
    const [hsaConf] = await db.insert(hsaConfig).values(config).returning();
    return hsaConf;
  }

  async getHsaConfig(): Promise<HsaConfig | undefined> {
    const [config] = await db.select().from(hsaConfig).where(eq(hsaConfig.isActive, true));
    return config;
  }

  async updateHsaConfig(id: number, config: Partial<InsertHsaConfig>): Promise<HsaConfig> {
    const [updated] = await db.update(hsaConfig).set({ ...config, updatedAt: new Date() }).where(eq(hsaConfig.id, id)).returning();
    return updated;
  }

  // Thrive Configuration Management
  async createThriveConfig(config: InsertThriveConfig): Promise<ThriveConfig> {
    const [thriveConf] = await db.insert(thriveConfig).values(config).returning();
    return thriveConf;
  }

  async getThriveConfig(storeId: string): Promise<ThriveConfig | undefined> {
    const [config] = await db.select().from(thriveConfig).where(eq(thriveConfig.storeId, storeId));
    return config;
  }

  async updateThriveConfig(id: number, config: Partial<InsertThriveConfig>): Promise<ThriveConfig> {
    const [updated] = await db.update(thriveConfig).set({ ...config, updatedAt: new Date() }).where(eq(thriveConfig.id, id)).returning();
    return updated;
  }

  async getActiveThriveConfig(): Promise<ThriveConfig | undefined> {
    const [config] = await db.select().from(thriveConfig).where(eq(thriveConfig.isActive, true));
    return config;
  }

  // Financial Accounts Management
  async createFinancialAccount(account: InsertFinancialAccount): Promise<FinancialAccount> {
    const [newAccount] = await db.insert(financialAccounts).values(account).returning();
    return newAccount;
  }

  async getAllFinancialAccounts(): Promise<FinancialAccount[]> {
    return await db.select().from(financialAccounts).where(eq(financialAccounts.isActive, true)).orderBy(asc(financialAccounts.accountName));
  }

  async getFinancialAccountById(id: number): Promise<FinancialAccount | undefined> {
    const [account] = await db.select().from(financialAccounts).where(eq(financialAccounts.id, id));
    return account;
  }

  async getFinancialAccountByQBId(qbAccountId: string): Promise<FinancialAccount | undefined> {
    const [account] = await db.select().from(financialAccounts).where(eq(financialAccounts.qbAccountId, qbAccountId));
    return account;
  }

  async updateFinancialAccount(id: number, account: Partial<InsertFinancialAccount>): Promise<FinancialAccount> {
    const [updated] = await db.update(financialAccounts).set({ ...account, updatedAt: new Date() }).where(eq(financialAccounts.id, id)).returning();
    return updated;
  }

  async deleteFinancialAccount(id: number): Promise<void> {
    await db.update(financialAccounts).set({ isActive: false }).where(eq(financialAccounts.id, id));
  }

  async getAccountsByType(accountType: string): Promise<FinancialAccount[]> {
    return await db.select().from(financialAccounts)
      .where(and(eq(financialAccounts.accountType, accountType), eq(financialAccounts.isActive, true)))
      .orderBy(asc(financialAccounts.accountName));
  }

  // Financial Transactions
  async createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const [newTransaction] = await db.insert(financialTransactions).values(transaction).returning();
    return newTransaction;
  }

  async getAllFinancialTransactions(limit?: number, offset?: number): Promise<FinancialTransaction[]> {
    let query = db.select().from(financialTransactions).orderBy(desc(financialTransactions.transactionDate));
    if (limit) query = query.limit(limit);
    if (offset) query = query.offset(offset);
    return await query;
  }

  async getFinancialTransactionById(id: number): Promise<FinancialTransaction | undefined> {
    const [transaction] = await db.select().from(financialTransactions).where(eq(financialTransactions.id, id));
    return transaction;
  }

  async getTransactionsByDateRange(startDate: string, endDate: string): Promise<FinancialTransaction[]> {
    return await db.select().from(financialTransactions)
      .where(and(gte(financialTransactions.transactionDate, startDate), lte(financialTransactions.transactionDate, endDate)))
      .orderBy(desc(financialTransactions.transactionDate));
  }

  async getTransactionsBySourceSystem(sourceSystem: string): Promise<FinancialTransaction[]> {
    return await db.select().from(financialTransactions)
      .where(eq(financialTransactions.sourceSystem, sourceSystem))
      .orderBy(desc(financialTransactions.transactionDate));
  }

  async updateFinancialTransaction(id: number, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction> {
    const [updated] = await db.update(financialTransactions).set({ ...transaction, updatedAt: new Date() }).where(eq(financialTransactions.id, id)).returning();
    return updated;
  }

  async deleteFinancialTransaction(id: number): Promise<void> {
    await db.delete(financialTransactions).where(eq(financialTransactions.id, id));
  }

  // Transaction Lines
  async createTransactionLine(line: InsertFinancialTransactionLine): Promise<FinancialTransactionLine> {
    const [newLine] = await db.insert(financialTransactionLines).values(line).returning();
    return newLine;
  }

  async getTransactionLines(transactionId: number): Promise<FinancialTransactionLine[]> {
    return await db.select().from(financialTransactionLines).where(eq(financialTransactionLines.transactionId, transactionId));
  }

  async updateTransactionLine(id: number, line: Partial<InsertFinancialTransactionLine>): Promise<FinancialTransactionLine> {
    const [updated] = await db.update(financialTransactionLines).set(line).where(eq(financialTransactionLines.id, id)).returning();
    return updated;
  }

  async deleteTransactionLine(id: number): Promise<void> {
    await db.delete(financialTransactionLines).where(eq(financialTransactionLines.id, id));
  }

  // Customers and Vendors
  async createCustomerVendor(customerVendor: InsertCustomersVendors): Promise<CustomersVendors> {
    const [newCV] = await db.insert(customersVendors).values(customerVendor).returning();
    return newCV;
  }

  async getAllCustomersVendors(): Promise<CustomersVendors[]> {
    return await db.select().from(customersVendors).where(eq(customersVendors.isActive, true));
  }

  async getCustomerVendorById(id: number): Promise<CustomersVendors | undefined> {
    const [cv] = await db.select().from(customersVendors).where(eq(customersVendors.id, id));
    return cv;
  }

  async getCustomerVendorByQBId(qbId: string): Promise<CustomersVendors | undefined> {
    const [cv] = await db.select().from(customersVendors).where(eq(customersVendors.qbId, qbId));
    return cv;
  }

  async getCustomersByType(type: 'customer' | 'vendor'): Promise<CustomersVendors[]> {
    return await db.select().from(customersVendors).where(and(eq(customersVendors.type, type), eq(customersVendors.isActive, true)));
  }

  async updateCustomerVendor(id: number, customerVendor: Partial<InsertCustomersVendors>): Promise<CustomersVendors> {
    const [updated] = await db.update(customersVendors).set({ ...customerVendor, updatedAt: new Date() }).where(eq(customersVendors.id, id)).returning();
    return updated;
  }

  async deleteCustomerVendor(id: number): Promise<void> {
    await db.update(customersVendors).set({ isActive: false }).where(eq(customersVendors.id, id));
  }

  // Inventory Items
  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db.insert(inventoryItems).values(item).returning();
    return newItem;
  }

  async getAllInventoryItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems).where(eq(inventoryItems.isActive, true));
  }

  async getInventoryItemById(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async getInventoryItemByQBId(qbItemId: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.qbItemId, qbItemId));
    return item;
  }

  async getInventoryItemByThriveId(thriveItemId: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.thriveItemId, thriveItemId));
    return item;
  }

  async getInventoryItemsBySKU(sku: string): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems).where(eq(inventoryItems.sku, sku));
  }

  async getLowStockItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems)
      .where(sql`${inventoryItems.quantityOnHand} <= ${inventoryItems.reorderPoint} AND ${inventoryItems.isActive} = true`);
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updated] = await db.update(inventoryItems).set({ ...item, updatedAt: new Date() }).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }

  async updateInventoryQuantity(id: number, quantity: string): Promise<InventoryItem> {
    const [updated] = await db.update(inventoryItems).set({ quantityOnHand: quantity, updatedAt: new Date() }).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.update(inventoryItems).set({ isActive: false }).where(eq(inventoryItems.id, id));
  }

  // Stub implementations for remaining methods (to be implemented in future phases)
  async createPosSale(sale: InsertPosSale): Promise<PosSale> {
    const [posSale] = await db.insert(posSales).values(sale).returning();
    return posSale;
  }
  async getAllPosSales(limit?: number, offset?: number): Promise<PosSale[]> {
    let query = db.select().from(posSales).orderBy(desc(posSales.createdAt));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    return await query;
  }
  async getPosSaleById(id: number): Promise<PosSale | undefined> { return undefined; }
  async getPosSaleByCloverOrderId(cloverOrderId: string): Promise<PosSale | undefined> {
    const [sale] = await db.select().from(posSales).where(eq(posSales.cloverOrderId, cloverOrderId));
    return sale;
  }
  async getSalesByDateRange(startDate: string, endDate: string): Promise<PosSale[]> { return []; }
  async getSalesByLocation(locationId: number, startDate?: string, endDate?: string): Promise<PosSale[]> { return []; }
  async getUnpostedSales(): Promise<PosSale[]> { return []; }
  async updatePosSale(id: number, sale: Partial<InsertPosSale>): Promise<PosSale> { throw new Error("Not implemented yet"); }
  async markSaleAsPostedToQB(id: number, qbTransactionId: string): Promise<PosSale> { throw new Error("Not implemented yet"); }
  async createPosSaleItem(item: InsertPosSaleItem): Promise<PosSaleItem> {
    const [saleItem] = await db.insert(posSaleItems).values(item).returning();
    return saleItem;
  }
  async getSaleItems(saleId: number): Promise<PosSaleItem[]> { return []; }
  async updatePosSaleItem(id: number, item: Partial<InsertPosSaleItem>): Promise<PosSaleItem> { throw new Error("Not implemented yet"); }
  async deleteSaleItem(id: number): Promise<void> { }
  async createHsaExpense(expense: InsertHsaExpense): Promise<HsaExpense> { throw new Error("Not implemented yet"); }
  async getAllHsaExpenses(): Promise<HsaExpense[]> { return []; }
  async getHsaExpenseById(id: number): Promise<HsaExpense | undefined> { return undefined; }
  async getHsaExpensesByEmployee(employeeId: string): Promise<HsaExpense[]> { return []; }
  async getHsaExpensesByDateRange(startDate: string, endDate: string): Promise<HsaExpense[]> { return []; }
  async getPendingHsaExpenses(): Promise<HsaExpense[]> { return []; }
  async getUnpostedHsaExpenses(): Promise<HsaExpense[]> { return []; }
  async updateHsaExpense(id: number, expense: Partial<InsertHsaExpense>): Promise<HsaExpense> { throw new Error("Not implemented yet"); }
  async approveHsaExpense(id: number, approvedBy: string): Promise<HsaExpense> { throw new Error("Not implemented yet"); }
  async markHsaExpenseAsPostedToQB(id: number, qbTransactionId: string): Promise<HsaExpense> { throw new Error("Not implemented yet"); }
  async deleteHsaExpense(id: number): Promise<void> { }
  async createIntegrationLog(log: InsertIntegrationLog): Promise<IntegrationLog> {
    const [integrationLog] = await db.insert(integrationLogs).values(log).returning();
    return integrationLog;
  }
  async getIntegrationLogs(system?: string, status?: string, limit?: number): Promise<IntegrationLog[]> {
    let query = db.select().from(integrationLogs);
    
    if (system) {
      query = query.where(eq(integrationLogs.system, system));
    }
    
    if (status) {
      query = query.where(eq(integrationLogs.status, status));
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    query = query.orderBy(desc(integrationLogs.createdAt));
    
    return await query;
  }
  async getIntegrationLogsByDateRange(startDate: string, endDate: string, system?: string): Promise<IntegrationLog[]> { return []; }
  async deleteOldLogs(daysToKeep: number): Promise<number> { return 0; }
  async createReportConfig(config: InsertReportConfig): Promise<ReportConfig> { throw new Error("Not implemented yet"); }
  async getAllReportConfigs(): Promise<ReportConfig[]> { return []; }
  async getReportConfigById(id: number): Promise<ReportConfig | undefined> { return undefined; }
  async getUserReportConfigs(userId: string): Promise<ReportConfig[]> { return []; }
  async getPublicReportConfigs(): Promise<ReportConfig[]> { return []; }
  async updateReportConfig(id: number, config: Partial<InsertReportConfig>): Promise<ReportConfig> { throw new Error("Not implemented yet"); }
  async deleteReportConfig(id: number): Promise<void> { }
  async createDashboardWidget(widget: InsertDashboardWidget): Promise<DashboardWidget> { throw new Error("Not implemented yet"); }
  async getUserDashboardWidgets(userId: string): Promise<DashboardWidget[]> { return []; }
  async updateDashboardWidget(id: number, widget: Partial<InsertDashboardWidget>): Promise<DashboardWidget> { throw new Error("Not implemented yet"); }
  async deleteDashboardWidget(id: number): Promise<void> { }
  async updateWidgetPosition(id: number, position: number): Promise<DashboardWidget> { throw new Error("Not implemented yet"); }
  async getAccountBalance(accountId: number, asOfDate?: string): Promise<string> { return "0.00"; }
  async getTrialBalance(asOfDate?: string): Promise<{ accountName: string; balance: string; accountType: string }[]> { return []; }
  async getProfitLoss(startDate: string, endDate: string): Promise<{ revenue: string; expenses: string; netIncome: string }> {
    // Calculate revenue from POS sales
    const salesResult = await db
      .select({ totalRevenue: sql<string>`COALESCE(SUM(${posSales.totalAmount}), 0)::text` })
      .from(posSales)
      .where(and(
        gte(posSales.saleDate, startDate), 
        lte(posSales.saleDate, endDate)
      ));
    
    const revenue = salesResult[0]?.totalRevenue || "0.00";
    
    // For now, expenses are 0 (will be implemented with other integrations)
    const expenses = "0.00";
    
    // Net income = revenue - expenses
    const netIncome = (parseFloat(revenue) - parseFloat(expenses)).toFixed(2);
    
    return { revenue, expenses, netIncome };
  }
  async getCashFlow(startDate: string, endDate: string): Promise<{ cashIn: string; cashOut: string; netCash: string }> { return { cashIn: "0.00", cashOut: "0.00", netCash: "0.00" }; }
  async getSalesSummary(startDate: string, endDate: string, locationId?: number): Promise<{ totalSales: string; totalTax: string; totalTips: string; transactionCount: number }> {
    let query = db
      .select({
        totalSales: sql<string>`COALESCE(SUM(${posSales.totalAmount}), 0)::text`,
        totalTax: sql<string>`COALESCE(SUM(${posSales.taxAmount}), 0)::text`,
        totalTips: sql<string>`COALESCE(SUM(${posSales.tipAmount}), 0)::text`,
        transactionCount: sql<number>`COUNT(*)::integer`
      })
      .from(posSales)
      .where(and(
        gte(posSales.saleDate, startDate), 
        lte(posSales.saleDate, endDate)
      ));
    
    if (locationId) {
      query = query.where(and(
        gte(posSales.saleDate, startDate), 
        lte(posSales.saleDate, endDate),
        eq(posSales.locationId, locationId)
      ));
    }
    
    const result = await query;
    return result[0] || { totalSales: "0.00", totalTax: "0.00", totalTips: "0.00", transactionCount: 0 };
  }
  async getInventoryValuation(): Promise<{ totalCost: string; totalRetail: string; itemCount: number }> { return { totalCost: "0.00", totalRetail: "0.00", itemCount: 0 }; }
  // ============================================
  // QR CODE MANAGEMENT METHODS
  // ============================================

  // QR Code operations
  async createQrCode(qrCodeData: InsertQrCode & { qrCodeData: string }): Promise<QrCode> {
    const [created] = await db.insert(qrCodes).values(qrCodeData).returning();
    return created;
  }

  async getAllQrCodes(): Promise<QrCode[]> {
    return await db.select().from(qrCodes)
      .where(eq(qrCodes.isActive, true))
      .orderBy(desc(qrCodes.createdAt));
  }

  async getQrCodesByUser(userId: string): Promise<QrCode[]> {
    return await db.select().from(qrCodes)
      .where(and(eq(qrCodes.createdBy, userId), eq(qrCodes.isActive, true)))
      .orderBy(desc(qrCodes.createdAt));
  }

  async getQrCodesByCategory(category: string): Promise<QrCode[]> {
    return await db.select().from(qrCodes)
      .where(and(eq(qrCodes.category, category), eq(qrCodes.isActive, true)))
      .orderBy(desc(qrCodes.createdAt));
  }

  async getQrCodeById(id: number): Promise<QrCode | undefined> {
    const [qrCode] = await db.select().from(qrCodes)
      .where(eq(qrCodes.id, id));
    return qrCode;
  }

  async updateQrCode(id: number, updates: UpdateQrCode & { qrCodeData?: string }): Promise<QrCode | undefined> {
    const [updated] = await db.update(qrCodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(qrCodes.id, id))
      .returning();
    return updated;
  }

  async deleteQrCode(id: number): Promise<boolean> {
    const [updated] = await db.update(qrCodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(qrCodes.id, id))
      .returning();
    return !!updated;
  }

  async incrementQrCodeDownloadCount(id: number): Promise<QrCode | undefined> {
    const [updated] = await db.update(qrCodes)
      .set({ 
        downloadCount: sql`${qrCodes.downloadCount} + 1`,
        lastDownloaded: new Date(),
        updatedAt: new Date()
      })
      .where(eq(qrCodes.id, id))
      .returning();
    return updated;
  }

  // Video Creation operations
  
  // Video Templates
  async createVideoTemplate(template: InsertVideoTemplate): Promise<VideoTemplate> {
    const [created] = await db.insert(videoTemplates).values(template).returning();
    return created;
  }

  async getVideoTemplates(category?: string): Promise<VideoTemplate[]> {
    const query = db.select().from(videoTemplates).where(eq(videoTemplates.isActive, true));
    
    if (category) {
      return await query.where(eq(videoTemplates.category, category)).orderBy(desc(videoTemplates.createdAt));
    }
    
    return await query.orderBy(desc(videoTemplates.createdAt));
  }

  async getVideoTemplateById(id: number): Promise<VideoTemplate | undefined> {
    const [template] = await db.select().from(videoTemplates).where(eq(videoTemplates.id, id));
    return template;
  }

  async updateVideoTemplate(id: number, updates: Partial<InsertVideoTemplate>): Promise<VideoTemplate | undefined> {
    const [updated] = await db.update(videoTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(videoTemplates.id, id))
      .returning();
    return updated;
  }

  async deleteVideoTemplate(id: number): Promise<boolean> {
    const [updated] = await db.update(videoTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(videoTemplates.id, id))
      .returning();
    return !!updated;
  }

  // Product Videos
  async createProductVideo(video: InsertProductVideo): Promise<ProductVideo> {
    const [created] = await db.insert(productVideos).values(video).returning();
    return created;
  }

  async getProductVideoById(id: number): Promise<ProductVideo | undefined> {
    const [video] = await db.select().from(productVideos).where(eq(productVideos.id, id));
    return video;
  }

  async getUserVideos(userId: string, status?: string): Promise<ProductVideo[]> {
    let query = db.select().from(productVideos)
      .where(and(eq(productVideos.createdBy, userId), eq(productVideos.isActive, true)));
    
    if (status) {
      query = query.where(eq(productVideos.renderStatus, status));
    }
    
    return await query.orderBy(desc(productVideos.createdAt));
  }

  async getAllProductVideos(limit?: number, offset?: number): Promise<ProductVideo[]> {
    let query = db.select().from(productVideos)
      .where(eq(productVideos.isActive, true))
      .orderBy(desc(productVideos.createdAt));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    return await query;
  }

  async updateProductVideo(id: number, updates: UpdateProductVideo): Promise<ProductVideo | undefined> {
    const [updated] = await db.update(productVideos)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(productVideos.id, id))
      .returning();
    return updated;
  }

  async deleteProductVideo(id: number): Promise<boolean> {
    const [updated] = await db.update(productVideos)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(productVideos.id, id))
      .returning();
    return !!updated;
  }

  async incrementVideoDownloadCount(id: number): Promise<ProductVideo | undefined> {
    const [updated] = await db.update(productVideos)
      .set({ 
        downloadCount: sql`${productVideos.downloadCount} + 1`,
        lastDownloaded: new Date(),
        updatedAt: new Date()
      })
      .where(eq(productVideos.id, id))
      .returning();
    return updated;
  }

  // Video Assets
  async createVideoAsset(asset: InsertVideoAsset): Promise<VideoAsset> {
    const [created] = await db.insert(videoAssets).values(asset).returning();
    return created;
  }

  async getVideoAssets(videoId: number): Promise<VideoAsset[]> {
    return await db.select().from(videoAssets)
      .where(eq(videoAssets.videoId, videoId))
      .orderBy(desc(videoAssets.createdAt));
  }

  async deleteVideoAsset(id: number): Promise<boolean> {
    const result = await db.delete(videoAssets).where(eq(videoAssets.id, id));
    return result.rowCount > 0;
  }
}

export const storage = new DatabaseStorage();

