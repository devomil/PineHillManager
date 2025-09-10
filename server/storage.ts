import {
  users,
  timeOffRequests,
  workSchedules,
  calendarNotes,
  shiftSwapRequests,
  shiftCoverageRequests,
  announcements,
  trainingModules,
  trainingProgress,
  messages,
  smsDeliveries,
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
  amazonConfig,
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
  responses,
  communicationAnalytics,
  communicationEvents,
  userCommunicationStats,
  // Phase 6: Advanced Features
  scheduledMessages,
  announcementTemplates,
  automationRules,
  messageReactions,
  announcementReactions,
  smsConsentHistory,
  type User,
  type UpsertUser,
  type SMSConsentHistory,
  type InsertSMSConsentHistory,
  type InsertTimeOffRequest,
  type TimeOffRequest,
  type InsertWorkSchedule,
  type WorkSchedule,
  type CalendarNote,
  type InsertCalendarNote,
  type ShiftSwapRequest,
  type InsertShiftSwapRequest,
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
  insertSMSDeliverySchema,
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
  type AmazonConfig,
  type InsertAmazonConfig,
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
  // Phase 3: Enhanced Messaging
  readReceipts,
  voiceMessages,
  messageTemplates,
  type MessageReaction,
  type InsertMessageReaction,
  type AnnouncementReaction,
  type InsertAnnouncementReaction,
  type ReadReceipt,
  type InsertReadReceipt,
  type VoiceMessage,
  type InsertVoiceMessage,
  type MessageTemplate,
  type InsertMessageTemplate,
  type SelectResponse,
  type InsertResponse,
  type UpdateResponse,
  // Communication Analytics
  type CommunicationAnalytics,
  type InsertCommunicationAnalytics,
  type CommunicationEvent,
  type InsertCommunicationEvent,
  type UserCommunicationStats,
  type InsertUserCommunicationStats,
  // Phase 6: Advanced Features Types
  type ScheduledMessage,
  type InsertScheduledMessage,
  type UpdateScheduledMessage,
  type AnnouncementTemplate,
  type InsertAnnouncementTemplate,
  type UpdateAnnouncementTemplate,
  type AutomationRule,
  type InsertAutomationRule,
  type UpdateAutomationRule,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or, sql, like, isNull, isNotNull } from "drizzle-orm";

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
  getUsersByRole(roles: string[]): Promise<User[]>;
  
  // Password management (admin only)
  hashPassword(password: string): Promise<string>;
  updateUserPassword(userId: string, hashedPassword: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;

  // Time off requests
  createTimeOffRequest(request: InsertTimeOffRequest): Promise<TimeOffRequest>;
  getUserTimeOffRequests(userId: string): Promise<TimeOffRequest[]>;
  getPendingTimeOffRequests(): Promise<TimeOffRequest[]>;
  updateTimeOffRequestStatus(id: number, status: string, reviewedBy: string, comments?: string): Promise<TimeOffRequest>;
  getApprovedTimeOffRequests(startDate?: string, endDate?: string, userId?: string): Promise<TimeOffRequest[]>;

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
  getMessageById(id: number): Promise<Message | undefined>;
  getDirectMessageParticipants(messageId: number): Promise<User[]>;

  // Responses
  createResponse(response: InsertResponse): Promise<SelectResponse>;
  getResponsesByAnnouncement(announcementId: number): Promise<SelectResponse[]>;
  getResponsesByMessage(messageId: number): Promise<SelectResponse[]>;
  getResponsesByParent(parentResponseId: number): Promise<SelectResponse[]>;
  markResponseAsRead(id: number): Promise<SelectResponse>;
  updateResponse(id: number, updates: UpdateResponse): Promise<SelectResponse>;

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
  getCurrentlyCheckedInEmployees(): Promise<any[]>;
  updateTimeEntry(entryId: number, updateData: any): Promise<any>;
  deleteTimeEntry(entryId: number): Promise<void>;
  exportTimeEntries(employeeId: string, startDate: string, endDate: string, format: string): Promise<string>;
  
  // Admin-specific time clock methods
  getTimeClockEntriesForAdmin(employeeId?: string, startDate?: string, endDate?: string): Promise<any[]>;
  getWhoIsCheckedIn(): Promise<any[]>;
  updateTimeClockEntry(entryId: number, updateData: any): Promise<any>;
  deleteTimeClockEntry(entryId: number): Promise<void>;
  
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
  getCloverConfigById(id: number): Promise<CloverConfig | undefined>;
  getAllCloverConfigs(): Promise<CloverConfig[]>;
  updateCloverConfig(id: number, config: Partial<InsertCloverConfig>): Promise<CloverConfig>;
  getActiveCloverConfig(): Promise<CloverConfig | undefined>;
  
  createAmazonConfig(config: InsertAmazonConfig): Promise<AmazonConfig>;
  getAmazonConfig(sellerId: string): Promise<AmazonConfig | undefined>;
  getAllAmazonConfigs(): Promise<AmazonConfig[]>;
  updateAmazonConfig(id: number, config: Partial<InsertAmazonConfig>): Promise<AmazonConfig>;
  getActiveAmazonConfig(): Promise<AmazonConfig | undefined>;
  
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
  getAccountsByName(accountName: string): Promise<FinancialAccount[]>;

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
  getPosSaleByAmazonOrderId?(amazonOrderId: string): Promise<PosSale | undefined>;
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

  // ================================
  // ORDER MANAGEMENT OPERATIONS
  // ================================

  // Order filtering and retrieval using Clover API
  getOrdersFromCloverAPI(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number | string;
    search?: string;
    state?: string;
    limit: number;
    offset: number;
  }): Promise<{
    orders: any[];
    total: number;
    hasMore: boolean;
  }>;

  // Order filtering and retrieval (legacy - uses POS sales data)
  getOrdersWithFiltering(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number;
    search?: string;
    state?: string;
    limit: number;
    offset: number;
  }): Promise<{
    orders: any[];
    total: number;
    hasMore: boolean;
  }>;

  // Order details with related data
  getOrderDetails(orderId: string): Promise<any | null>;

  // Order line items with modifications and discounts
  getOrderLineItems(orderId: string): Promise<any[]>;

  // Order discounts
  getOrderDiscounts(orderId: string): Promise<any[]>;

  // Voided line items with totals
  getVoidedLineItems(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number;
  }): Promise<{
    voidedItems: any[];
    totals: {
      totalVoidedAmount: number;
      totalVoidedItems: number;
    };
  }>;

  // Order updates
  updateOrder(orderId: string, updates: {
    state?: string;
    paymentState?: string;
    note?: string;
    modifiedTime?: number;
  }): Promise<any>;

  // Order analytics
  getOrderAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number;
    groupBy: string;
  }): Promise<any>;

  // Location sales data (for revenue analytics integration)
  getLocationSalesData(locationId: number, startDate: Date, endDate: Date): Promise<any[]>;

  // SMS functionality
  createSMSDelivery(smsDelivery: any): Promise<any>;
  getSMSDeliveriesByMessageId(messageId: number): Promise<any[]>;
  updateSMSDeliveryStatus(deliveryId: number, status: string, deliveredAt?: Date): Promise<void>;
  
  // SMS consent management
  createSmsConsentRecord(record: InsertSMSConsentHistory): Promise<SMSConsentHistory>;
  getSmsConsentHistoryByUserId(userId: string): Promise<SMSConsentHistory[]>;
  toggleSmsConsent(options: {
    userId: string;
    consentValue: boolean;
    changedBy: string;
    notificationTypes?: string[];
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
  }): Promise<User>;
  bulkOptInSmsConsent(options: {
    userIds: string[];
    changedBy: string;
    changeReason: string;
    notificationTypes: string[];
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
  }): Promise<{ 
    successful: number; 
    failed: number; 
    errors: Array<{ userId: string; error: string }> 
  }>;
  
  // Phase 6: Advanced Features - Scheduled Messages
  createScheduledMessage(scheduledMessage: InsertScheduledMessage): Promise<ScheduledMessage>;
  getScheduledMessages(): Promise<ScheduledMessage[]>;
  getScheduledMessage(id: number): Promise<ScheduledMessage | undefined>;
  updateScheduledMessage(id: number, updates: UpdateScheduledMessage): Promise<ScheduledMessage>;
  deleteScheduledMessage(id: number): Promise<void>;
  getScheduledMessagesForDelivery(): Promise<ScheduledMessage[]>;
  
  // Phase 6: Advanced Features - Announcement Templates
  createAnnouncementTemplate(template: InsertAnnouncementTemplate): Promise<AnnouncementTemplate>;
  getAnnouncementTemplates(): Promise<AnnouncementTemplate[]>;
  getAnnouncementTemplate(id: number): Promise<AnnouncementTemplate | undefined>;
  updateAnnouncementTemplate(id: number, updates: UpdateAnnouncementTemplate): Promise<AnnouncementTemplate>;
  deleteAnnouncementTemplate(id: number): Promise<void>;
  getAnnouncementTemplatesByCategory(category: string): Promise<AnnouncementTemplate[]>;
  incrementTemplateUsage(id: number): Promise<void>;
  
  // Phase 6: Advanced Features - Automation Rules
  createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule>;
  getAutomationRules(): Promise<AutomationRule[]>;
  getAutomationRule(id: number): Promise<AutomationRule | undefined>;
  updateAutomationRule(id: number, updates: UpdateAutomationRule): Promise<AutomationRule>;
  deleteAutomationRule(id: number): Promise<void>;
  getActiveAutomationRules(): Promise<AutomationRule[]>;
  getAutomationRulesForExecution(): Promise<AutomationRule[]>;
  updateAutomationRuleLastTriggered(id: number): Promise<void>;
  
  // Message reactions
  addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction>;
  removeMessageReaction(messageId: number, userId: string, reactionType: string): Promise<void>;
  getMessageReactions(messageId: number): Promise<MessageReaction[]>;
  
  // Announcement reactions
  addAnnouncementReaction(reaction: InsertAnnouncementReaction): Promise<AnnouncementReaction>;
  removeAnnouncementReaction(announcementId: number, userId: string, reactionType: string): Promise<void>;
  getAnnouncementReactions(announcementId: number): Promise<AnnouncementReaction[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      // Return minimal user object if column doesn't exist yet
      return undefined;
    }
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

  async getUsersByRole(roles: string[]): Promise<User[]> {
    return await db.select().from(users)
      .where(and(
        eq(users.isActive, true),
        sql`${users.role} = ANY(${roles})`
      ))
      .orderBy(asc(users.role), asc(users.firstName));
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

  async getTimeOffRequestById(id: number): Promise<TimeOffRequest | undefined> {
    const [request] = await db
      .select()
      .from(timeOffRequests)
      .where(eq(timeOffRequests.id, id));
    return request;
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

  async getApprovedTimeOffRequests(startDate?: string, endDate?: string, userId?: string): Promise<TimeOffRequest[]> {
    const conditions = [eq(timeOffRequests.status, "approved")];
    
    if (startDate && endDate) {
      conditions.push(
        or(
          and(
            gte(timeOffRequests.startDate, startDate),
            lte(timeOffRequests.startDate, endDate)
          ),
          and(
            gte(timeOffRequests.endDate, startDate),
            lte(timeOffRequests.endDate, endDate)
          ),
          and(
            lte(timeOffRequests.startDate, startDate),
            gte(timeOffRequests.endDate, endDate)
          )
        )
      );
    }
    
    if (userId) {
      conditions.push(eq(timeOffRequests.userId, userId));
    }

    const results = await db
      .select()
      .from(timeOffRequests)
      .leftJoin(users, eq(timeOffRequests.userId, users.id))
      .where(and(...conditions))
      .orderBy(timeOffRequests.startDate);

    return results.map((result: any) => ({
      ...result.time_off_requests,
      user: result.users
    }));
  }

  // Work schedules
  async createWorkSchedule(schedule: InsertWorkSchedule): Promise<WorkSchedule> {
    const [workSchedule] = await db
      .insert(workSchedules)
      .values(schedule)
      .returning();
    return workSchedule;
  }

  // Calendar note operations
  async getCalendarNotes(startDate?: string, endDate?: string, locationId?: number): Promise<CalendarNote[]> {
    try {
      let query = db.select().from(calendarNotes).where(eq(calendarNotes.isActive, true));
      
      const conditions = [eq(calendarNotes.isActive, true)];
      
      if (startDate && endDate) {
        conditions.push(
          gte(calendarNotes.date, startDate),
          lte(calendarNotes.date, endDate)
        );
      }
      
      if (locationId) {
        conditions.push(eq(calendarNotes.locationId, locationId));
      }
      
      return await db
        .select()
        .from(calendarNotes)
        .where(and(...conditions))
        .orderBy(asc(calendarNotes.date));
    } catch (error) {
      console.error("Error fetching calendar notes:", error);
      throw error;
    }
  }

  async createCalendarNote(noteData: InsertCalendarNote): Promise<CalendarNote> {
    try {
      const [note] = await db.insert(calendarNotes).values(noteData).returning();
      return note;
    } catch (error) {
      console.error("Error creating calendar note:", error);
      throw error;
    }
  }

  async updateCalendarNote(id: number, updates: Partial<InsertCalendarNote>): Promise<CalendarNote> {
    try {
      const [note] = await db
        .update(calendarNotes)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(calendarNotes.id, id))
        .returning();
      return note;
    } catch (error) {
      console.error("Error updating calendar note:", error);
      throw error;
    }
  }

  async deleteCalendarNote(id: number): Promise<void> {
    try {
      await db.update(calendarNotes).set({ isActive: false }).where(eq(calendarNotes.id, id));
    } catch (error) {
      console.error("Error deleting calendar note:", error);
      throw error;
    }
  }

  // Shift swap marketplace operations
  async getShiftSwapRequests(status?: string, userId?: string): Promise<any[]> {
    try {
      const conditions = [eq(shiftSwapRequests.isActive, true)];
      
      if (status) {
        conditions.push(eq(shiftSwapRequests.status, status));
      }
      
      if (userId) {
        conditions.push(
          or(
            eq(shiftSwapRequests.requesterId, userId),
            eq(shiftSwapRequests.takerId, userId)
          )
        );
      }
      
      const results = await db
        .select()
        .from(shiftSwapRequests)
        .leftJoin(workSchedules, eq(shiftSwapRequests.originalScheduleId, workSchedules.id))
        .leftJoin(locations, eq(workSchedules.locationId, locations.id))
        .leftJoin(users, eq(shiftSwapRequests.requesterId, users.id))
        .where(and(...conditions))
        .orderBy(desc(shiftSwapRequests.createdAt));

      // Transform the joined data to match frontend expectations
      const transformedResults = results.map((result: any) => ({
        ...result.shift_swap_requests,
        requester: result.users,
        originalSchedule: {
          ...result.work_schedules,
          location: result.locations
        }
      }));

      // If any results have taker IDs, fetch taker data separately
      const takersToFetch = transformedResults
        .filter(swap => swap.takerId)
        .map(swap => swap.takerId);

      let takerUsers: any = {};
      if (takersToFetch.length > 0) {
        const takerResults = await db
          .select()
          .from(users)
          .where(or(...takersToFetch.map(id => eq(users.id, id))));
        
        takerResults.forEach(user => {
          takerUsers[user.id] = user;
        });
      }

      // Add taker data to results
      return transformedResults.map(swap => ({
        ...swap,
        taker: swap.takerId ? takerUsers[swap.takerId] : undefined
      }));
    } catch (error) {
      console.error("Error fetching shift swap requests:", error);
      throw error;
    }
  }

  async createShiftSwapRequest(requestData: InsertShiftSwapRequest): Promise<ShiftSwapRequest> {
    try {
      const [request] = await db.insert(shiftSwapRequests).values(requestData).returning();
      return request;
    } catch (error) {
      console.error("Error creating shift swap request:", error);
      throw error;
    }
  }

  async updateShiftSwapRequest(id: number, updates: Partial<InsertShiftSwapRequest>): Promise<ShiftSwapRequest> {
    try {
      const [request] = await db
        .update(shiftSwapRequests)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(shiftSwapRequests.id, id))
        .returning();
      return request;
    } catch (error) {
      console.error("Error updating shift swap request:", error);
      throw error;
    }
  }

  async respondToShiftSwap(id: number, takerId: string, action: "accept" | "reject", responseMessage?: string): Promise<ShiftSwapRequest> {
    try {
      const updates: Partial<InsertShiftSwapRequest> = {
        responseMessage,
        updatedAt: new Date()
      };

      if (action === "accept") {
        updates.takerId = takerId;
        updates.status = "pending"; // Requires manager approval
      } else {
        updates.status = "open"; // Keep open for others
      }

      const [request] = await db
        .update(shiftSwapRequests)
        .set(updates)
        .where(eq(shiftSwapRequests.id, id))
        .returning();
      return request;
    } catch (error) {
      console.error("Error responding to shift swap request:", error);
      throw error;
    }
  }

  async approveShiftSwap(id: number, approverId: string): Promise<ShiftSwapRequest> {
    try {
      // First, get the shift swap request details
      const [swapRequest] = await db
        .select()
        .from(shiftSwapRequests)
        .where(eq(shiftSwapRequests.id, id));

      if (!swapRequest) {
        throw new Error("Shift swap request not found");
      }

      if (!swapRequest.takerId) {
        throw new Error("No taker assigned for this shift swap request");
      }

      // Transfer the schedule ownership from requester to taker
      await db
        .update(workSchedules)
        .set({ 
          userId: swapRequest.takerId,
          updatedAt: new Date()
        })
        .where(eq(workSchedules.id, swapRequest.originalScheduleId));

      // Update the shift swap request status to approved
      const [request] = await db
        .update(shiftSwapRequests)
        .set({ 
          status: "approved", 
          approvedBy: approverId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(shiftSwapRequests.id, id))
        .returning();
      
      return request;
    } catch (error) {
      console.error("Error approving shift swap request:", error);
      throw error;
    }
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
      .orderBy(desc(announcements.createdAt));
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

  async getUserMessages(userId: string, limit = 50, offset = 0): Promise<Message[]> {
    // Get all messages sent by or received by this user
    return await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId), // Messages sent by this user
          eq(messages.recipientId, userId) // Messages received by this user
        )
      )
      .orderBy(desc(messages.sentAt))
      .limit(limit)
      .offset(offset);
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
    
    let query = db
      .select({
        id: timeClockEntries.id,
        userId: timeClockEntries.userId,
        locationId: timeClockEntries.locationId,
        clockInTime: timeClockEntries.clockInTime,
        clockOutTime: timeClockEntries.clockOutTime,
        breakStartTime: timeClockEntries.breakStartTime,
        breakEndTime: timeClockEntries.breakEndTime,
        totalBreakMinutes: timeClockEntries.totalBreakMinutes,
        totalWorkedMinutes: timeClockEntries.totalWorkedMinutes,
        status: timeClockEntries.status,
        notes: timeClockEntries.notes,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(timeClockEntries)
      .leftJoin(users, eq(timeClockEntries.userId, users.id))
      .where(
        and(
          gte(timeClockEntries.clockInTime, start),
          lte(timeClockEntries.clockInTime, end)
        )
      );

    // If userId is provided, filter by specific user
    if (userId && userId !== 'all') {
      query = query.where(eq(timeClockEntries.userId, userId));
    }

    return await query.orderBy(desc(timeClockEntries.clockInTime));
  }

  async getCurrentlyCheckedInEmployees(): Promise<any[]> {
    return await db
      .select({
        id: timeClockEntries.id,
        userId: timeClockEntries.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        clockInTime: timeClockEntries.clockInTime,
        status: timeClockEntries.status,
        locationId: timeClockEntries.locationId,
        breakStartTime: timeClockEntries.breakStartTime,
      })
      .from(timeClockEntries)
      .leftJoin(users, eq(timeClockEntries.userId, users.id))
      .where(
        and(
          or(
            eq(timeClockEntries.status, 'clocked_in'),
            eq(timeClockEntries.status, 'on_break')
          ),
          isNull(timeClockEntries.clockOutTime)
        )
      )
      .orderBy(timeClockEntries.clockInTime);
  }

  async updateTimeEntry(entryId: number, updateData: any): Promise<any> {
    const now = new Date();
    
    // Recalculate total worked minutes if clock times are being updated
    if (updateData.clockInTime || updateData.clockOutTime) {
      const entry = await db
        .select()
        .from(timeClockEntries)
        .where(eq(timeClockEntries.id, entryId))
        .limit(1);
      
      if (entry.length > 0) {
        const clockInTime = updateData.clockInTime ? new Date(updateData.clockInTime) : new Date(entry[0].clockInTime);
        const clockOutTime = updateData.clockOutTime ? new Date(updateData.clockOutTime) : entry[0].clockOutTime ? new Date(entry[0].clockOutTime) : null;
        
        if (clockOutTime) {
          const totalWorkedMinutes = Math.floor((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60)) - (entry[0].totalBreakMinutes || 0);
          updateData.totalWorkedMinutes = Math.max(0, totalWorkedMinutes);
        }
      }
    }

    const [updatedEntry] = await db
      .update(timeClockEntries)
      .set({
        ...updateData,
        updatedAt: now,
      })
      .where(eq(timeClockEntries.id, entryId))
      .returning();

    return updatedEntry;
  }

  async deleteTimeEntry(entryId: number): Promise<void> {
    await db
      .delete(timeClockEntries)
      .where(eq(timeClockEntries.id, entryId));
  }

  // Admin-specific time clock methods
  async getTimeClockEntriesForAdmin(employeeId?: string, startDate?: string, endDate?: string): Promise<any[]> {
    // isNull is already imported from drizzle-orm
    
    let query = db
      .select({
        id: timeClockEntries.id,
        userId: timeClockEntries.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        employeeId: users.employeeId,
        hourlyRate: users.hourlyRate,
        clockInTime: timeClockEntries.clockInTime,
        clockOutTime: timeClockEntries.clockOutTime,
        breakStartTime: timeClockEntries.breakStartTime,
        breakEndTime: timeClockEntries.breakEndTime,
        totalBreakMinutes: timeClockEntries.totalBreakMinutes,
        totalWorkedMinutes: timeClockEntries.totalWorkedMinutes,
        status: timeClockEntries.status,
        notes: timeClockEntries.notes,
        locationId: timeClockEntries.locationId,
        createdAt: timeClockEntries.createdAt,
        updatedAt: timeClockEntries.updatedAt,
      })
      .from(timeClockEntries)
      .leftJoin(users, eq(timeClockEntries.userId, users.id));

    // Apply filters
    const conditions = [];
    
    if (employeeId && employeeId !== 'all') {
      conditions.push(eq(timeClockEntries.userId, employeeId));
    }
    
    if (startDate) {
      conditions.push(gte(timeClockEntries.clockInTime, new Date(startDate)));
    }
    
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999); // End of day
      conditions.push(lte(timeClockEntries.clockInTime, endDateTime));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(timeClockEntries.clockInTime));
  }

  async getWhoIsCheckedIn(): Promise<any[]> {
    return await this.getCurrentlyCheckedInEmployees();
  }

  async updateTimeClockEntry(entryId: number, updateData: any): Promise<any> {
    return await this.updateTimeEntry(entryId, updateData);
  }

  async deleteTimeClockEntry(entryId: number): Promise<void> {
    return await this.deleteTimeEntry(entryId);
  }

  async exportTimeEntries(employeeId: string, startDate: string, endDate: string, format: string): Promise<string> {
    // Get time entries using existing method
    const timeEntries = await this.getTimeEntriesByDateRange(employeeId, startDate, endDate);
    
    // Enhance with hourly rate data by fetching user information for each entry
    const entriesWithRates = await Promise.all(timeEntries.map(async (entry: any) => {
      const [user] = await db.select({ hourlyRate: users.hourlyRate })
        .from(users)
        .where(eq(users.id, entry.userId))
        .limit(1);
      return {
        ...entry,
        hourlyRate: user?.hourlyRate || 0
      };
    }));
    
    if (format === 'csv') {
      // Generate CSV format with cost data
      const headers = [
        'Employee Name',
        'Employee ID', 
        'Date',
        'Clock In Time',
        'Clock Out Time',
        'Break Minutes',
        'Total Minutes',
        'Decimal Hours',
        'Hours:Minutes',
        'Hourly Rate',
        'Entry Cost',
        'Status',
        'Notes'
      ];
      
      let csv = headers.join(',') + '\n';
      let totalCost = 0;
      let totalHours = 0;
      
      for (const entry of entriesWithRates) {
        const clockInDate = entry.clockInTime ? new Date(entry.clockInTime).toLocaleDateString() : '';
        const clockInTime = entry.clockInTime ? new Date(entry.clockInTime).toLocaleTimeString() : '';
        const clockOutTime = entry.clockOutTime ? new Date(entry.clockOutTime).toLocaleTimeString() : '';
        const totalMinutes = entry.totalWorkedMinutes || 0;
        const decimalHours = (totalMinutes / 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const hoursMinutes = `${hours}:${minutes.toString().padStart(2, '0')}`;
        const hourlyRate = parseFloat(entry.hourlyRate || '0');
        const entryCost = decimalHours * hourlyRate;
        
        totalHours += decimalHours;
        totalCost += entryCost;
        
        const row = [
          `"${entry.firstName || ''} ${entry.lastName || ''}"`,
          `"${entry.userId || ''}"`,
          `"${clockInDate}"`,
          `"${clockInTime}"`,
          `"${clockOutTime}"`,
          entry.totalBreakMinutes || 0,
          totalMinutes,
          decimalHours.toFixed(2),
          `"${hoursMinutes}"`,
          hourlyRate.toFixed(2),
          entryCost.toFixed(2),
          `"${entry.status || ''}"`,
          `"${(entry.notes || '').replace(/"/g, '""')}"`
        ];
        
        csv += row.join(',') + '\n';
      }
      
      // Add totals row
      if (entriesWithRates.length > 0) {
        const totalHoursFormatted = Math.floor(totalHours);
        const totalMinutesFormatted = Math.round((totalHours - totalHoursFormatted) * 60);
        csv += '\n'; // Empty line
        csv += `"TOTALS","","","","","",${Math.round(totalHours * 60)},${totalHours.toFixed(2)},"${totalHoursFormatted}:${totalMinutesFormatted.toString().padStart(2, '0')}","",${totalCost.toFixed(2)},"",""\n`;
      }
      
      return csv;
    } else {
      // Return JSON format with cost data
      return JSON.stringify(entriesWithRates, null, 2);
    }
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

  async getMessageById(id: number): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return message;
  }

  async getDirectMessageParticipants(messageId: number): Promise<User[]> {
    // First get the original message to find sender and recipient
    const message = await this.getMessageById(messageId);
    if (!message) {
      return [];
    }

    const participantIds = new Set<string>();
    
    // Add original message participants
    if (message.senderId) {
      participantIds.add(message.senderId);
    }
    if (message.recipientId) {
      participantIds.add(message.recipientId);
    }

    // Also check responses to include anyone who has participated in the conversation
    const messageResponses = await db
      .select({
        authorId: responses.authorId
      })
      .from(responses)
      .where(eq(responses.messageId, messageId));

    messageResponses.forEach(response => {
      if (response.authorId) {
        participantIds.add(response.authorId);
      }
    });

    // Get user details for all participants
    if (participantIds.size === 0) {
      return [];
    }

    const participants = await db
      .select()
      .from(users)
      .where(
        or(...Array.from(participantIds).map(id => eq(users.id, id)))
      );

    return participants;
  }

  // Response methods
  async createResponse(response: InsertResponse): Promise<SelectResponse> {
    const [newResponse] = await db
      .insert(responses)
      .values({
        ...response,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning();
    return newResponse;
  }

  async getResponsesByAnnouncement(announcementId: number): Promise<SelectResponse[]> {
    const result = await db
      .select({
        id: responses.id,
        authorId: responses.authorId,
        content: responses.content,
        announcementId: responses.announcementId,
        messageId: responses.messageId,
        parentResponseId: responses.parentResponseId,
        responseType: responses.responseType,
        isFromSMS: responses.isFromSMS,
        smsMessageSid: responses.smsMessageSid,
        isRead: responses.isRead,
        createdAt: responses.createdAt,
        updatedAt: responses.updatedAt,
        readAt: responses.readAt,
        isHidden: responses.isHidden,
        hiddenBy: responses.hiddenBy,
        hiddenReason: responses.hiddenReason,
        author: {
          firstName: users.firstName,
          lastName: users.lastName,
          role: users.role
        }
      })
      .from(responses)
      .leftJoin(users, eq(responses.authorId, users.id))
      .where(eq(responses.announcementId, announcementId))
      .orderBy(asc(responses.createdAt));

    return result as SelectResponse[];
  }

  async getResponsesByMessage(messageId: number): Promise<SelectResponse[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.messageId, messageId))
      .orderBy(asc(responses.createdAt));
  }

  async getResponsesByParent(parentResponseId: number): Promise<SelectResponse[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.parentResponseId, parentResponseId))
      .orderBy(asc(responses.createdAt));
  }

  async markResponseAsRead(id: number): Promise<SelectResponse> {
    const [updated] = await db
      .update(responses)
      .set({ 
        isRead: true, 
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(responses.id, id))
      .returning();
    return updated;
  }

  async updateResponse(id: number, updates: UpdateResponse): Promise<SelectResponse> {
    const [updated] = await db
      .update(responses)
      .set({ 
        ...updates, 
        updatedAt: new Date()
      })
      .where(eq(responses.id, id))
      .returning();
    return updated;
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

  async getCloverConfigById(id: number): Promise<CloverConfig | undefined> {
    const [config] = await db.select().from(cloverConfig).where(eq(cloverConfig.id, id));
    return config;
  }

  async getAllCloverConfigs(): Promise<CloverConfig[]> {
    const configs = await db.select().from(cloverConfig).orderBy(asc(cloverConfig.merchantName));
    return configs;
  }

  async updateCloverConfig(id: number, config: Partial<InsertCloverConfig>): Promise<CloverConfig> {
    const [updated] = await db.update(cloverConfig).set({ ...config, updatedAt: new Date() }).where(eq(cloverConfig.id, id)).returning();
    return updated;
  }

  async getActiveCloverConfig(): Promise<CloverConfig | undefined> {
    const [config] = await db.select().from(cloverConfig).where(eq(cloverConfig.isActive, true));
    return config;
  }

  // Amazon Configuration Management
  async createAmazonConfig(config: InsertAmazonConfig): Promise<AmazonConfig> {
    const [amazonConf] = await db.insert(amazonConfig).values({
      ...config,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return amazonConf;
  }

  async getAmazonConfig(sellerId: string): Promise<AmazonConfig | undefined> {
    const [config] = await db.select().from(amazonConfig).where(eq(amazonConfig.sellerId, sellerId));
    return config;
  }

  async getAllAmazonConfigs(): Promise<AmazonConfig[]> {
    const configs = await db.select().from(amazonConfig).orderBy(asc(amazonConfig.merchantName));
    return configs;
  }

  async updateAmazonConfig(id: number, config: Partial<InsertAmazonConfig>): Promise<AmazonConfig> {
    const [updated] = await db.update(amazonConfig).set({ ...config, updatedAt: new Date() }).where(eq(amazonConfig.id, id)).returning();
    return updated;
  }

  async getActiveAmazonConfig(): Promise<AmazonConfig | undefined> {
    const [config] = await db.select().from(amazonConfig).where(eq(amazonConfig.isActive, true));
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

  async getAccountsByName(accountName: string): Promise<FinancialAccount[]> {
    return await db.select().from(financialAccounts)
      .where(and(like(financialAccounts.accountName, `%${accountName}%`), eq(financialAccounts.isActive, true)))
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
  async getPosSaleByAmazonOrderId(amazonOrderId: string): Promise<PosSale | undefined> {
    const [sale] = await db.select().from(posSales).where(eq(posSales.amazonOrderId, amazonOrderId));
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

  // Revenue Analytics Methods for Real Clover Data
  async getLocationSalesData(locationId: number, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      return await db.select().from(posSales)
        .where(
          and(
            eq(posSales.locationId, locationId),
            gte(posSales.saleTime, startDate),
            lte(posSales.saleTime, endDate)
          )
        )
        .orderBy(desc(posSales.saleTime));
    } catch (error) {
      console.error(`Error fetching sales data for location ${locationId}:`, error);
      return [];
    }
  }

  async getTotalRevenueBetweenDates(startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await db.select({
        totalRevenue: sql<number>`COALESCE(SUM(${posSales.totalAmount}::decimal), 0)`
      }).from(posSales)
        .where(
          and(
            gte(posSales.saleTime, startDate),
            lte(posSales.saleTime, endDate)
          )
        );
      
      return parseFloat(result[0]?.totalRevenue?.toString() || '0');
    } catch (error) {
      console.error('Error fetching total revenue:', error);
      return 0;
    }
  }

  async getLocationRevenueBetweenDates(locationId: number, startDate: Date, endDate: Date): Promise<number> {
    try {
      const result = await db.select({
        totalRevenue: sql<number>`COALESCE(SUM(${posSales.totalAmount}::decimal), 0)`
      }).from(posSales)
        .where(
          and(
            eq(posSales.locationId, locationId),
            gte(posSales.saleTime, startDate),
            lte(posSales.saleTime, endDate)
          )
        );
      
      return parseFloat(result[0]?.totalRevenue?.toString() || '0');
    } catch (error) {
      console.error(`Error fetching revenue for location ${locationId}:`, error);
      return 0;
    }
  }

  // ================================
  // ORDER MANAGEMENT IMPLEMENTATIONS
  // ================================

  // NEW: Fetch orders directly from Clover API
  async getOrdersFromCloverAPI(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number | string;
    search?: string;
    state?: string;
    limit: number;
    offset: number;
  }): Promise<{
    orders: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const { CloverIntegration } = await import('./integrations/clover');
      const allOrders: any[] = [];
      
      // Get all Clover configurations
      const cloverConfigs = await this.getAllCloverConfigs();
      
      for (const config of cloverConfigs) {
        // Skip if locationId filter doesn't match
        if (filters.locationId && filters.locationId !== 'all' && config.id?.toString() !== filters.locationId.toString()) {
          continue;
        }
        
        // Map database fields to CloverConfig interface
        const cloverConfig = {
          id: config.id,
          merchantId: config.merchantId,
          accessToken: config.apiToken, // Map apiToken to accessToken
          baseUrl: config.baseUrl || 'https://api.clover.com'
        };
        
        const cloverIntegration = new CloverIntegration();
        cloverIntegration.setConfig(cloverConfig);
        
        try {
          // Build Clover API options
          const options: any = {
            limit: Math.min(filters.limit || 50, 100), // Clover limit
            offset: filters.offset || 0,
            expand: 'lineItems,payments',
            orderBy: 'modifiedTime DESC'
          };
          
          // Add date filter if provided - Use separate range parameters instead of filter
          if (filters.startDate) {
            options.modifiedTimeMin = Math.floor(new Date(filters.startDate + 'T00:00:00.000Z').getTime());
          }
          if (filters.endDate) {
            options.modifiedTimeMax = Math.floor(new Date(filters.endDate + 'T23:59:59.999Z').getTime());
          }
          
          // Add state filter
          if (filters.state && filters.state !== 'all') {
            const stateFilter = `state='${filters.state}'`;
            options.filter = options.filter ? `${options.filter} AND ${stateFilter}` : stateFilter;
          }
          
          console.log(`Fetching orders from ${config.merchantName} with options:`, options);
          const response = await cloverIntegration.fetchOrders(options);
          
          if (response?.elements && Array.isArray(response.elements)) {
            console.log(`Found ${response.elements.length} orders from ${config.merchantName}`);
            
            // Debug: Check the dates of returned orders to verify filtering is working
            if (response.elements.length > 0) {
              const firstOrder = response.elements[0];
              const lastOrder = response.elements[response.elements.length - 1];
              console.log(`First order modified: ${new Date(firstOrder.modifiedTime).toISOString()}`);
              console.log(`Last order modified: ${new Date(lastOrder.modifiedTime).toISOString()}`);
              console.log(`Expected range: ${new Date(options.modifiedTimeMin).toISOString()} to ${new Date(options.modifiedTimeMax).toISOString()}`);
            }
            
            const ordersWithLocation = response.elements.map(order => ({
              ...order,
              locationId: config.id,
              locationName: config.merchantName,
              merchantId: config.merchantId
            }));
            
            // Apply server-side date filtering since Clover API doesn't respect modifiedTime.min/max properly
            let filteredOrders = ordersWithLocation;
            if (options.modifiedTimeMin || options.modifiedTimeMax) {
              filteredOrders = ordersWithLocation.filter(order => {
                const orderModifiedTime = order.modifiedTime;
                if (!orderModifiedTime) return false;
                
                const orderTime = parseInt(orderModifiedTime.toString());
                
                // Check minimum time
                if (options.modifiedTimeMin && orderTime < options.modifiedTimeMin) {
                  return false;
                }
                
                // Check maximum time  
                if (options.modifiedTimeMax && orderTime > options.modifiedTimeMax) {
                  return false;
                }
                
                return true;
              });
              
              console.log(`After server-side date filtering: ${filteredOrders.length} orders from ${config.merchantName}`);
            }
            
            allOrders.push(...filteredOrders);
          }
        } catch (error) {
          console.error(`Error fetching orders from location ${config.merchantName}:`, error);
          // Continue with other locations even if one fails
        }
      }
      
      // Apply search filter if provided
      let filteredOrders = allOrders;
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase();
        filteredOrders = allOrders.filter(order => 
          order.id?.toLowerCase().includes(searchTerm) ||
          order.lineItems?.some((item: any) => 
            item.name?.toLowerCase().includes(searchTerm) ||
            item.item?.name?.toLowerCase().includes(searchTerm)
          )
        );
      }
      
      // Sort by modified time (newest first)
      filteredOrders.sort((a, b) => (b.modifiedTime || 0) - (a.modifiedTime || 0));
      
      console.log(`Total orders after filtering: ${filteredOrders.length}`);
      
      return {
        orders: filteredOrders,
        total: filteredOrders.length,
        hasMore: filteredOrders.length >= filters.limit
      };
    } catch (error) {
      console.error('Error fetching orders from Clover API:', error);
      return {
        orders: [],
        total: 0,
        hasMore: false
      };
    }
  }

  async getOrdersWithFiltering(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number | string;
    search?: string;
    state?: string;
    limit: number;
    offset: number;
  }): Promise<{
    orders: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // For now, we'll use POS sales data as orders until we have a dedicated orders table
      // This provides real transactional data from Clover
      let query = db.select({
        id: posSales.cloverOrderId,
        currency: sql<string>`'USD'`,
        total: sql<number>`CAST(${posSales.totalAmount} AS DECIMAL) * 100`, // Convert to cents
        taxAmount: sql<number>`CAST(${posSales.taxAmount} AS DECIMAL) * 100`,
        serviceCharge: sql<number>`0`,
        paymentState: sql<string>`CASE WHEN ${posSales.totalAmount}::decimal > 0 THEN 'paid' ELSE 'open' END`,
        state: sql<string>`'locked'`,
        createdTime: sql<number>`EXTRACT(EPOCH FROM ${posSales.saleTime}) * 1000`,
        clientCreatedTime: sql<number>`EXTRACT(EPOCH FROM ${posSales.saleTime}) * 1000`,
        modifiedTime: sql<number>`EXTRACT(EPOCH FROM ${posSales.saleTime}) * 1000`,
        manualTransaction: sql<boolean>`false`,
        groupLineItems: sql<boolean>`true`,
        testMode: sql<boolean>`false`,
        taxRemoved: sql<boolean>`false`,
        isVat: sql<boolean>`false`,
        merchantId: sql<string>`COALESCE(${cloverConfig.merchantId}, '')`,
        locationName: sql<string>`COALESCE(${cloverConfig.merchantName}, 'Unknown Location')`,
        employee: sql<any>`NULL`,
        orderType: sql<any>`NULL`,
        title: sql<string>`NULL`,
        note: sql<string>`NULL`,
        deletedTime: sql<number>`NULL`,
        device: sql<any>`NULL`,
        lineItems: sql<any>`NULL`,
        payments: sql<any>`NULL`,
        discounts: sql<any>`NULL`,
        credits: sql<any>`NULL`,
        refunds: sql<any>`NULL`,
        voids: sql<any>`NULL`
      }).from(posSales)
      .leftJoin(cloverConfig, eq(posSales.locationId, cloverConfig.id));

      // Apply filters
      const conditions = [];

      if (filters.startDate) {
        conditions.push(gte(posSales.saleDate, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(posSales.saleDate, filters.endDate));
      }

      if (filters.locationId && filters.locationId !== 'all') {
        const locationIdNum = typeof filters.locationId === 'string' ? parseInt(filters.locationId) : filters.locationId;
        conditions.push(eq(posSales.locationId, locationIdNum));
      }

      if (filters.search) {
        conditions.push(sql`LOWER(${posSales.cloverOrderId}) LIKE LOWER('%${filters.search}%')`);
      }

      if (filters.state && filters.state !== 'all') {
        conditions.push(sql`CASE WHEN ${posSales.totalAmount}::decimal > 0 THEN 'paid' ELSE 'open' END = ${filters.state}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Get total count
      let countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(posSales);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const totalResult = await countQuery;
      const total = totalResult[0]?.count || 0;

      // Apply pagination and ordering
      const orders = await query
        .orderBy(desc(posSales.saleTime))
        .limit(filters.limit)
        .offset(filters.offset);

      return {
        orders,
        total,
        hasMore: (filters.offset + filters.limit) < total
      };
    } catch (error) {
      console.error('Error fetching orders with filtering:', error);
      return { orders: [], total: 0, hasMore: false };
    }
  }

  async getOrderDetails(orderId: string): Promise<any | null> {
    try {
      // Get order from POS sales data
      const orderData = await db.select({
        id: posSales.cloverOrderId,
        currency: sql<string>`'USD'`,
        total: sql<number>`CAST(${posSales.totalAmount} AS DECIMAL) * 100`,
        taxAmount: sql<number>`CAST(${posSales.taxAmount} AS DECIMAL) * 100`,
        serviceCharge: sql<number>`0`,
        paymentState: sql<string>`CASE WHEN ${posSales.totalAmount}::decimal > 0 THEN 'paid' ELSE 'open' END`,
        state: sql<string>`'locked'`,
        createdTime: sql<number>`EXTRACT(EPOCH FROM ${posSales.saleTime}) * 1000`,
        clientCreatedTime: sql<number>`EXTRACT(EPOCH FROM ${posSales.saleTime}) * 1000`,
        modifiedTime: sql<number>`EXTRACT(EPOCH FROM ${posSales.saleTime}) * 1000`,
        manualTransaction: sql<boolean>`false`,
        groupLineItems: sql<boolean>`true`,
        testMode: sql<boolean>`false`,
        taxRemoved: sql<boolean>`false`,
        isVat: sql<boolean>`false`,
        merchantId: sql<string>`COALESCE(${cloverConfig.merchantId}, '')`,
        locationName: sql<string>`COALESCE(${cloverConfig.merchantName}, 'Unknown Location')`,
        paymentMethod: posSales.paymentMethod
      }).from(posSales)
      .leftJoin(cloverConfig, eq(posSales.locationId, cloverConfig.id))
      .where(eq(posSales.cloverOrderId, orderId));

      if (orderData.length === 0) {
        return null;
      }

      const order = orderData[0];

      // Get line items for this order
      const lineItems = await this.getOrderLineItems(orderId);
      
      // Construct payment information
      const payments = [{
        id: `payment_${orderId}`,
        amount: order.total,
        tipAmount: 0,
        taxAmount: order.taxAmount,
        result: 'SUCCESS',
        tender: {
          label: order.paymentMethod || 'Card',
          labelKey: order.paymentMethod || 'CARD'
        }
      }];

      return {
        ...order,
        lineItems,
        payments,
        discounts: [],
        credits: [],
        refunds: [],
        voids: []
      };
    } catch (error) {
      console.error('Error fetching order details:', error);
      return null;
    }
  }

  async getOrderLineItems(orderId: string): Promise<any[]> {
    try {
      // Get line items from POS sale items
      const lineItems = await db.select({
        id: sql<string>`CONCAT('item_', ${posSaleItems.id})`,
        name: posSaleItems.itemName,
        price: sql<number>`CAST(${posSaleItems.unitPrice} AS DECIMAL) * 100`,
        quantity: sql<number>`${posSaleItems.quantity}`,
        unitQty: sql<number>`1`,
        isRevenue: sql<boolean>`true`,
        printed: sql<boolean>`true`,
        exchanged: sql<boolean>`false`,
        refunded: sql<boolean>`false`,
        modifications: sql<any>`NULL`,
        discounts: sql<any>`NULL`
      }).from(posSaleItems)
      .leftJoin(posSales, eq(posSaleItems.saleId, posSales.id))
      .where(eq(posSales.cloverOrderId, orderId));

      return lineItems;
    } catch (error) {
      console.error('Error fetching order line items:', error);
      return [];
    }
  }

  async getOrderDiscounts(orderId: string): Promise<any[]> {
    try {
      // No discounts in current schema - return empty array
      return [];
    } catch (error) {
      console.error('Error fetching order discounts:', error);
      return [];
    }
  }

  async getOrderAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number | string;
    groupBy: string;
  }): Promise<any> {
    try {
      // Build conditions for filtering
      const conditions = [];

      if (filters.startDate) {
        conditions.push(gte(posSales.saleDate, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(posSales.saleDate, filters.endDate));
      }

      if (filters.locationId && filters.locationId !== 'all') {
        const locationIdNum = typeof filters.locationId === 'string' ? parseInt(filters.locationId) : filters.locationId;
        conditions.push(eq(posSales.locationId, locationIdNum));
      }

      // Get daily analytics data
      let query = db.select({
        period: sql<string>`DATE(${posSales.saleDate})`,
        totalOrders: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(${posSales.totalAmount}::decimal), 0)`,
        averageOrderValue: sql<number>`COALESCE(AVG(${posSales.totalAmount}::decimal), 0)`
      }).from(posSales);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const analytics = await query
        .groupBy(sql`DATE(${posSales.saleDate})`)
        .orderBy(sql`DATE(${posSales.saleDate})`);

      // Get summary totals
      let summaryQuery = db.select({
        totalOrders: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`COALESCE(SUM(${posSales.totalAmount}::decimal), 0)`,
        averageOrderValue: sql<number>`COALESCE(AVG(${posSales.totalAmount}::decimal), 0)`
      }).from(posSales);

      if (conditions.length > 0) {
        summaryQuery = summaryQuery.where(and(...conditions));
      }

      const summary = await summaryQuery;

      return {
        analytics,
        summary: summary[0] || { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 }
      };
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      return {
        analytics: [],
        summary: { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 }
      };
    }
  }

  async getVoidedItems(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number | string;
  }): Promise<any> {
    try {
      // Currently no voided items tracking in schema
      // Return empty data structure
      return {
        voidedItems: [],
        totals: {
          totalVoidedAmount: 0,
          totalVoidedItems: 0
        }
      };
    } catch (error) {
      console.error('Error fetching voided items:', error);
      return {
        voidedItems: [],
        totals: {
          totalVoidedAmount: 0,
          totalVoidedItems: 0
        }
      };
    }
  }

  async getVoidedLineItems(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number;
  }): Promise<{
    voidedItems: any[];
    totals: {
      totalVoidedAmount: number;
      totalVoidedItems: number;
    };
  }> {
    try {
      // For demonstration, return empty data - voided items would need separate tracking
      return {
        voidedItems: [],
        totals: {
          totalVoidedAmount: 0,
          totalVoidedItems: 0
        }
      };
    } catch (error) {
      console.error('Error fetching voided line items:', error);
      return {
        voidedItems: [],
        totals: {
          totalVoidedAmount: 0,
          totalVoidedItems: 0
        }
      };
    }
  }

  async updateOrder(orderId: string, updates: {
    state?: string;
    paymentState?: string;
    note?: string;
    modifiedTime?: number;
  }): Promise<any> {
    try {
      // Update operations would need proper order table implementation
      // For now, return the order as-is
      return await this.getOrderDetails(orderId);
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  async getOrderAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number;
    groupBy: string;
  }): Promise<any> {
    try {
      const conditions = [];

      if (filters.startDate) {
        conditions.push(gte(posSales.saleDate, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(posSales.saleDate, filters.endDate));
      }

      if (filters.locationId) {
        conditions.push(eq(posSales.locationId, filters.locationId));
      }

      let groupByColumn;
      switch (filters.groupBy) {
        case 'day':
          groupByColumn = sql`DATE(${posSales.saleDate})`;
          break;
        case 'week':
          groupByColumn = sql`DATE_TRUNC('week', ${posSales.saleDate})`;
          break;
        case 'month':
          groupByColumn = sql`DATE_TRUNC('month', ${posSales.saleDate})`;
          break;
        default:
          groupByColumn = sql`DATE(${posSales.saleDate})`;
      }

      const analytics = await db.select({
        period: groupByColumn,
        totalOrders: sql<number>`COUNT(*)`,
        totalRevenue: sql<number>`SUM(CAST(${posSales.totalAmount} AS DECIMAL))`,
        averageOrderValue: sql<number>`AVG(CAST(${posSales.totalAmount} AS DECIMAL))`
      }).from(posSales)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(groupByColumn)
      .orderBy(groupByColumn);

      return {
        analytics,
        summary: {
          totalOrders: analytics.reduce((sum, row) => sum + row.totalOrders, 0),
          totalRevenue: analytics.reduce((sum, row) => sum + row.totalRevenue, 0),
          averageOrderValue: analytics.length > 0 ? 
            analytics.reduce((sum, row) => sum + row.totalRevenue, 0) / analytics.reduce((sum, row) => sum + row.totalOrders, 0) : 0
        }
      };
    } catch (error) {
      console.error('Error fetching order analytics:', error);
      return { analytics: [], summary: { totalOrders: 0, totalRevenue: 0, averageOrderValue: 0 } };
    }
  }

  // SMS delivery methods
  async createSMSDelivery(smsDelivery: any): Promise<any> {
    try {
      const [created] = await db.insert(smsDeliveries).values(smsDelivery).returning();
      return created;
    } catch (error) {
      console.error('Error creating SMS delivery:', error);
      throw error;
    }
  }

  async getSMSDeliveriesByMessageId(messageId: number): Promise<any[]> {
    try {
      return await db.select().from(smsDeliveries).where(eq(smsDeliveries.messageId, messageId));
    } catch (error) {
      console.error('Error fetching SMS deliveries:', error);
      return [];
    }
  }

  async updateSMSDeliveryStatus(deliveryId: number, status: string, deliveredAt?: Date): Promise<void> {
    try {
      await db.update(smsDeliveries)
        .set({ 
          status, 
          deliveredAt,
          updatedAt: new Date()
        })
        .where(eq(smsDeliveries.id, deliveryId));
    } catch (error) {
      console.error('Error updating SMS delivery status:', error);
      throw error;
    }
  }

  // Phase 3: Enhanced Messaging Features Implementation

  // Message reactions
  async addMessageReaction(reaction: InsertMessageReaction): Promise<MessageReaction> {
    try {
      const [created] = await db.insert(messageReactions).values(reaction).returning();
      return created;
    } catch (error) {
      console.error('Error adding message reaction:', error);
      throw error;
    }
  }

  async removeMessageReaction(messageId: number, userId: string, reactionType: string): Promise<void> {
    try {
      await db.delete(messageReactions)
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.userId, userId),
            eq(messageReactions.reactionType, reactionType)
          )
        );
    } catch (error) {
      console.error('Error removing message reaction:', error);
      throw error;
    }
  }

  async getMessageReactions(messageId: number): Promise<MessageReaction[]> {
    try {
      return await db.select()
        .from(messageReactions)
        .where(eq(messageReactions.messageId, messageId))
        .orderBy(asc(messageReactions.createdAt));
    } catch (error) {
      console.error('Error fetching message reactions:', error);
      return [];
    }
  }

  // Announcement reactions
  async addAnnouncementReaction(reaction: InsertAnnouncementReaction): Promise<AnnouncementReaction> {
    try {
      const [created] = await db.insert(announcementReactions).values(reaction).returning();
      return created;
    } catch (error) {
      console.error('Error adding announcement reaction:', error);
      throw error;
    }
  }

  async removeAnnouncementReaction(announcementId: number, userId: string, reactionType: string): Promise<void> {
    try {
      await db.delete(announcementReactions)
        .where(
          and(
            eq(announcementReactions.announcementId, announcementId),
            eq(announcementReactions.userId, userId),
            eq(announcementReactions.reactionType, reactionType)
          )
        );
    } catch (error) {
      console.error('Error removing announcement reaction:', error);
      throw error;
    }
  }

  async getAnnouncementReactions(announcementId: number): Promise<AnnouncementReaction[]> {
    try {
      return await db.select()
        .from(announcementReactions)
        .where(eq(announcementReactions.announcementId, announcementId))
        .orderBy(asc(announcementReactions.createdAt));
    } catch (error) {
      console.error('Error fetching announcement reactions:', error);
      return [];
    }
  }

  // Read receipts
  async markMessageAsRead(messageId: number, userId: string): Promise<ReadReceipt> {
    try {
      // Check if read receipt already exists
      const existing = await db.select()
        .from(readReceipts)
        .where(
          and(
            eq(readReceipts.messageId, messageId),
            eq(readReceipts.userId, userId)
          )
        );

      if (existing.length > 0) {
        return existing[0];
      }

      const [created] = await db.insert(readReceipts)
        .values({ messageId, userId })
        .returning();
      return created;
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  async getMessageReadReceipts(messageId: number): Promise<ReadReceipt[]> {
    try {
      return await db.select()
        .from(readReceipts)
        .where(eq(readReceipts.messageId, messageId))
        .orderBy(asc(readReceipts.readAt));
    } catch (error) {
      console.error('Error fetching message read receipts:', error);
      return [];
    }
  }

  // Voice messages
  async createVoiceMessage(voiceMessage: InsertVoiceMessage): Promise<VoiceMessage> {
    try {
      const [created] = await db.insert(voiceMessages).values(voiceMessage).returning();
      return created;
    } catch (error) {
      console.error('Error creating voice message:', error);
      throw error;
    }
  }

  async getVoiceMessage(messageId: number): Promise<VoiceMessage | undefined> {
    try {
      const [voiceMessage] = await db.select()
        .from(voiceMessages)
        .where(eq(voiceMessages.messageId, messageId));
      return voiceMessage;
    } catch (error) {
      console.error('Error fetching voice message:', error);
      return undefined;
    }
  }

  // Message templates
  async createMessageTemplate(template: InsertMessageTemplate): Promise<MessageTemplate> {
    try {
      const [created] = await db.insert(messageTemplates).values(template).returning();
      return created;
    } catch (error) {
      console.error('Error creating message template:', error);
      throw error;
    }
  }

  async getAllMessageTemplates(): Promise<MessageTemplate[]> {
    try {
      return await db.select()
        .from(messageTemplates)
        .where(eq(messageTemplates.isActive, true))
        .orderBy(asc(messageTemplates.category), asc(messageTemplates.name));
    } catch (error) {
      console.error('Error fetching message templates:', error);
      return [];
    }
  }

  async getUserMessageTemplates(userId: string): Promise<MessageTemplate[]> {
    try {
      return await db.select()
        .from(messageTemplates)
        .where(
          and(
            eq(messageTemplates.createdBy, userId),
            eq(messageTemplates.isActive, true)
          )
        )
        .orderBy(asc(messageTemplates.category), asc(messageTemplates.name));
    } catch (error) {
      console.error('Error fetching user message templates:', error);
      return [];
    }
  }

  async updateMessageTemplate(id: number, template: Partial<InsertMessageTemplate>): Promise<MessageTemplate> {
    try {
      const [updated] = await db.update(messageTemplates)
        .set({ ...template, updatedAt: new Date() })
        .where(eq(messageTemplates.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error('Error updating message template:', error);
      throw error;
    }
  }

  async deleteMessageTemplate(id: number): Promise<void> {
    try {
      await db.update(messageTemplates)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(messageTemplates.id, id));
    } catch (error) {
      console.error('Error deleting message template:', error);
      throw error;
    }
  }
  // ===================================
  // ENHANCED MESSAGING SYSTEM METHODS
  // ===================================

  async getMessagesForUser(userId: string, options?: { limit?: number; offset?: number; type?: string }): Promise<any[]> {
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Get both regular messages and announcements the user should see
    const messageQuery = db
      .select({
        id: messages.id,
        subject: messages.subject,
        content: messages.content,
        priority: messages.priority,
        messageType: messages.messageType,
        targetAudience: messages.targetAudience,
        smsEnabled: messages.smsEnabled,
        senderId: messages.senderId,
        sentAt: messages.sentAt,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId), // Messages sent by user
          // Messages targeted at user (will need to expand this logic)
          sql`${messages.targetAudience} = 'all'`
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset);

    return await messageQuery;
  }

  async createReadReceipt(receipt: { messageId: number; userId: string; deliveredAt?: Date }): Promise<void> {
    try {
      await db
        .insert(readReceipts)
        .values({
          messageId: receipt.messageId,
          userId: receipt.userId,
          deliveredAt: receipt.deliveredAt || new Date(),
        });
    } catch (error) {
      // Ignore duplicate key errors - receipt already exists
      console.log('Read receipt already exists, ignoring duplicate');
    }
  }

  async getReadReceipt(messageId: number, userId: string): Promise<any> {
    const [receipt] = await db
      .select()
      .from(readReceipts)
      .where(
        and(
          eq(readReceipts.messageId, messageId),
          eq(readReceipts.userId, userId)
        )
      );
    return receipt;
  }

  async markMessageAsRead(messageId: number, userId: string): Promise<void> {
    await db
      .update(readReceipts)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(readReceipts.messageId, messageId),
          eq(readReceipts.userId, userId)
        )
      );
  }

  // ===================================
  // CHANNEL COMMUNICATION METHODS
  // ===================================

  async getChannelsForUser(userId: string): Promise<any[]> {
    // Get channels where user is a member
    const userChannels = await db
      .select({
        id: chatChannels.id,
        name: chatChannels.name,
        description: chatChannels.description,
        type: chatChannels.type,
        isPrivate: chatChannels.isPrivate,
        isActive: chatChannels.isActive,
        createdBy: chatChannels.createdBy,
        createdAt: chatChannels.createdAt,
        memberRole: channelMembers.role,
        joinedAt: channelMembers.joinedAt,
      })
      .from(chatChannels)
      .leftJoin(channelMembers, eq(chatChannels.id, channelMembers.channelId))
      .where(
        and(
          eq(chatChannels.isActive, true),
          or(
            eq(channelMembers.userId, userId), // User is a member
            eq(chatChannels.isPrivate, false) // Or channel is public
          )
        )
      )
      .orderBy(chatChannels.name);

    return userChannels;
  }

  async getChannel(channelId: number): Promise<any> {
    const [channel] = await db
      .select()
      .from(chatChannels)
      .where(eq(chatChannels.id, channelId));
    return channel;
  }

  async isChannelMember(channelId: number, userId: string): Promise<boolean> {
    // Check if user is a member or if channel is public
    const [membership] = await db
      .select()
      .from(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, channelId),
          eq(channelMembers.userId, userId)
        )
      );

    if (membership) return true;

    // Check if channel is public
    const [channel] = await db
      .select()
      .from(chatChannels)
      .where(
        and(
          eq(chatChannels.id, channelId),
          eq(chatChannels.isPrivate, false)
        )
      );

    return !!channel;
  }

  async joinChannel(channelId: number, userId: string): Promise<void> {
    await db
      .insert(channelMembers)
      .values({
        channelId,
        userId,
        role: 'member',
      })
      .onConflictDoNothing();
  }

  async leaveChannel(channelId: number, userId: string): Promise<void> {
    await db
      .delete(channelMembers)
      .where(
        and(
          eq(channelMembers.channelId, channelId),
          eq(channelMembers.userId, userId)
        )
      );
  }

  async createChannelMessage(message: { 
    channelId: number; 
    senderId: string; 
    content: string; 
    messageType?: string; 
    priority?: string; 
    smsEnabled?: boolean;
  }): Promise<any> {
    const [newMessage] = await db
      .insert(channelMessages)
      .values({
        channelId: message.channelId,
        senderId: message.senderId,
        content: message.content,
        messageType: message.messageType || 'message',
        priority: message.priority || 'normal',
        smsEnabled: message.smsEnabled || false,
      })
      .returning();
    return newMessage;
  }

  // Communication Analytics methods
  async getCommunicationAnalytics(days: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get aggregated analytics data
    const analytics = await db
      .select()
      .from(communicationAnalytics)
      .where(
        and(
          gte(communicationAnalytics.date, startDate.toISOString().split('T')[0]),
          lte(communicationAnalytics.date, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(desc(communicationAnalytics.date));

    // Calculate totals and averages
    const totals = analytics.reduce(
      (acc, day) => ({
        totalMessages: acc.totalMessages + (day.totalMessages || 0),
        totalAnnouncements: acc.totalAnnouncements + (day.totalAnnouncements || 0),
        totalSMS: acc.totalSMS + (day.totalSMS || 0),
        totalReactions: acc.totalReactions + (day.totalReactions || 0),
        totalResponses: acc.totalResponses + (day.totalResponses || 0),
        smsDelivered: acc.smsDelivered + (day.smsDelivered || 0),
        smsFailed: acc.smsFailed + (day.smsFailed || 0),
        smsCost: acc.smsCost + (day.smsCost || 0),
      }),
      {
        totalMessages: 0,
        totalAnnouncements: 0,
        totalSMS: 0,
        totalReactions: 0,
        totalResponses: 0,
        smsDelivered: 0,
        smsFailed: 0,
        smsCost: 0,
      }
    );

    const avgEngagementRate = analytics.length > 0 
      ? analytics.reduce((sum, day) => sum + parseFloat(day.engagementRate || '0'), 0) / analytics.length
      : 0;

    const avgDeliveryRate = analytics.length > 0
      ? analytics.reduce((sum, day) => sum + parseFloat(day.smsDeliveryRate || '0'), 0) / analytics.length
      : 0;

    return {
      overview: {
        ...totals,
        averageEngagementRate: avgEngagementRate.toFixed(2),
        averageDeliveryRate: avgDeliveryRate.toFixed(2),
        totalCost: (totals.smsCost / 100).toFixed(2), // Convert cents to dollars
      },
      dailyData: analytics,
      dateRange: { startDate: startDate.toISOString(), endDate: endDate.toISOString() }
    };
  }

  async getCommunicationChartData(type: string, days: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await db
      .select()
      .from(communicationAnalytics)
      .where(
        and(
          gte(communicationAnalytics.date, startDate.toISOString().split('T')[0]),
          lte(communicationAnalytics.date, endDate.toISOString().split('T')[0])
        )
      )
      .orderBy(communicationAnalytics.date);

    const chartData = analytics.map(day => ({
      date: day.date,
      messages: day.totalMessages || 0,
      announcements: day.totalAnnouncements || 0,
      sms: day.totalSMS || 0,
      reactions: day.totalReactions || 0,
      responses: day.totalResponses || 0,
      engagementRate: parseFloat(day.engagementRate || '0'),
      deliveryRate: parseFloat(day.smsDeliveryRate || '0'),
      cost: (day.smsCost || 0) / 100, // Convert to dollars
    }));

    return {
      type,
      data: chartData,
      summary: {
        totalDataPoints: chartData.length,
        dateRange: { startDate, endDate }
      }
    };
  }

  async getSMSAnalytics(days: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get SMS delivery statistics
    const smsStats = await db
      .select({
        date: sql<string>`DATE(${smsDeliveries.sentAt})`,
        status: smsDeliveries.status,
        count: sql<number>`COUNT(*)`,
      })
      .from(smsDeliveries)
      .where(
        and(
          gte(smsDeliveries.sentAt, startDate),
          lte(smsDeliveries.sentAt, endDate)
        )
      )
      .groupBy(sql`DATE(${smsDeliveries.sentAt})`, smsDeliveries.status)
      .orderBy(sql`DATE(${smsDeliveries.sentAt})`);

    // Get recent SMS events
    const recentEvents = await db
      .select()
      .from(communicationEvents)
      .where(
        and(
          eq(communicationEvents.source, 'sms'),
          gte(communicationEvents.eventTimestamp, startDate)
        )
      )
      .orderBy(desc(communicationEvents.eventTimestamp))
      .limit(50);

    // Process the data
    const dailyStats = smsStats.reduce((acc, curr) => {
      if (!acc[curr.date]) {
        acc[curr.date] = { delivered: 0, failed: 0, pending: 0 };
      }
      if (curr.status === 'delivered') acc[curr.date].delivered += curr.count;
      else if (curr.status === 'failed') acc[curr.date].failed += curr.count;
      else acc[curr.date].pending += curr.count;
      return acc;
    }, {} as Record<string, any>);

    return {
      dailyStats,
      recentEvents: recentEvents.map(event => ({
        ...event,
        cost: (event.cost || 0) / 100, // Convert to dollars
      })),
      summary: {
        totalSent: Object.values(dailyStats).reduce((sum: number, day: any) => sum + day.delivered + day.failed + day.pending, 0),
        totalDelivered: Object.values(dailyStats).reduce((sum: number, day: any) => sum + day.delivered, 0),
        totalFailed: Object.values(dailyStats).reduce((sum: number, day: any) => sum + day.failed, 0),
      }
    };
  }

  async getUserEngagementAnalytics(days: number = 30): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user communication stats
    const userStats = await db
      .select({
        userId: userCommunicationStats.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        messagesReceived: userCommunicationStats.messagesReceived,
        messagesSent: userCommunicationStats.messagesSent,
        reactionsGiven: userCommunicationStats.reactionsGiven,
        responsesCreated: userCommunicationStats.responsesCreated,
        engagementScore: userCommunicationStats.engagementScore,
        averageResponseTime: userCommunicationStats.averageResponseTime,
        preferredChannel: userCommunicationStats.preferredChannel,
      })
      .from(userCommunicationStats)
      .leftJoin(users, eq(userCommunicationStats.userId, users.id))
      .orderBy(desc(userCommunicationStats.engagementScore));

    // Get communication events by user
    const userEvents = await db
      .select({
        userId: communicationEvents.userId,
        eventType: communicationEvents.eventType,
        count: sql<number>`COUNT(*)`,
      })
      .from(communicationEvents)
      .where(
        and(
          isNotNull(communicationEvents.userId),
          gte(communicationEvents.eventTimestamp, startDate)
        )
      )
      .groupBy(communicationEvents.userId, communicationEvents.eventType);

    return {
      userStats: userStats.map(user => ({
        ...user,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        engagementScore: parseFloat(user.engagementScore || '0'),
      })),
      eventsByUser: userEvents,
      summary: {
        totalUsers: userStats.length,
        averageEngagement: userStats.length > 0 
          ? userStats.reduce((sum, user) => sum + parseFloat(user.engagementScore || '0'), 0) / userStats.length 
          : 0,
        topEngaged: userStats.slice(0, 5),
      }
    };
  }

  // SMS Delivery Logging
  async logSMSDelivery(delivery: {
    messageId: string;
    phoneNumber: string;
    message: string;
    status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'undelivered';
    segments: number;
    cost: number;
    priority: string;
    errorCode?: string;
    errorMessage?: string;
    sentAt: Date;
  }): Promise<any> {
    const [newDelivery] = await db
      .insert(smsDeliveries)
      .values({
        messageId: delivery.messageId,
        phoneNumber: delivery.phoneNumber,
        message: delivery.message,
        status: delivery.status,
        segments: delivery.segments,
        cost: delivery.cost,
        priority: delivery.priority,
        errorCode: delivery.errorCode,
        errorMessage: delivery.errorMessage,
        sentAt: delivery.sentAt,
      })
      .returning();
    
    return newDelivery;
  }

  // Communication Event Logging
  async logCommunicationEvent(event: {
    eventType: string;
    source: string;
    messageId: string;
    userId?: string | null;
    channelId?: number | null;
    cost?: number;
    priority?: string;
    eventTimestamp: Date;
    metadata?: any;
  }): Promise<any> {
    const [newEvent] = await db
      .insert(communicationEvents)
      .values({
        eventType: event.eventType,
        source: event.source,
        messageId: event.messageId,
        userId: event.userId || null,
        channelId: event.channelId || null,
        cost: event.cost || null,
        priority: event.priority || null,
        eventTimestamp: event.eventTimestamp,
        metadata: event.metadata || null,
      })
      .returning();
    
    return newEvent;
  }

  // Update SMS delivery status (for webhooks)
  async updateSMSDeliveryStatus(messageId: string, status: string, errorCode?: string, errorMessage?: string): Promise<void> {
    await db
      .update(smsDeliveries)
      .set({
        status: status as any,
        errorCode,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(smsDeliveries.messageId, messageId));
  }

  // Daily analytics aggregation method
  async aggregateDailyCommunicationAnalytics(date: string): Promise<void> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get SMS stats for the day
    const smsStats = await db
      .select({
        totalSMS: sql<number>`COUNT(*)`,
        totalDelivered: sql<number>`SUM(CASE WHEN ${smsDeliveries.status} = 'delivered' THEN 1 ELSE 0 END)`,
        totalFailed: sql<number>`SUM(CASE WHEN ${smsDeliveries.status} IN ('failed', 'undelivered') THEN 1 ELSE 0 END)`,
        totalCost: sql<number>`SUM(${smsDeliveries.cost})`,
        totalSegments: sql<number>`SUM(${smsDeliveries.segments})`,
      })
      .from(smsDeliveries)
      .where(
        and(
          gte(smsDeliveries.sentAt, startOfDay),
          lte(smsDeliveries.sentAt, endOfDay)
        )
      );

    // Get announcement stats
    const announcementStats = await db
      .select({
        totalAnnouncements: sql<number>`COUNT(*)`,
      })
      .from(announcements)
      .where(
        and(
          gte(announcements.createdAt, startOfDay),
          lte(announcements.createdAt, endOfDay)
        )
      );

    // Get reaction stats
    const reactionStats = await db
      .select({
        totalReactions: sql<number>`COUNT(*)`,
      })
      .from(messageReactions)
      .where(
        and(
          gte(messageReactions.createdAt, startOfDay),
          lte(messageReactions.createdAt, endOfDay)
        )
      );

    // Get response stats
    const responseStats = await db
      .select({
        totalResponses: sql<number>`COUNT(*)`,
      })
      .from(responses)
      .where(
        and(
          gte(responses.createdAt, startOfDay),
          lte(responses.createdAt, endOfDay)
        )
      );

    const sms = smsStats[0] || {};
    const announcements = announcementStats[0] || {};
    const reactions = reactionStats[0] || {};
    const responses = responseStats[0] || {};

    // Calculate rates
    const deliveryRate = sms.totalSMS > 0 ? (sms.totalDelivered / sms.totalSMS) * 100 : 0;
    const engagementRate = announcements.totalAnnouncements > 0 
      ? ((reactions.totalReactions + responses.totalResponses) / announcements.totalAnnouncements) * 100 
      : 0;

    // Insert or update daily analytics
    await db
      .insert(communicationAnalytics)
      .values({
        date,
        totalMessages: announcements.totalAnnouncements || 0,
        totalAnnouncements: announcements.totalAnnouncements || 0,
        totalSMS: sms.totalSMS || 0,
        totalReactions: reactions.totalReactions || 0,
        totalResponses: responses.totalResponses || 0,
        smsDelivered: sms.totalDelivered || 0,
        smsFailed: sms.totalFailed || 0,
        smsCost: sms.totalCost || 0,
        engagementRate: engagementRate.toFixed(2),
        smsDeliveryRate: deliveryRate.toFixed(2),
      })
      .onConflictDoUpdate({
        target: communicationAnalytics.date,
        set: {
          totalMessages: announcements.totalAnnouncements || 0,
          totalAnnouncements: announcements.totalAnnouncements || 0,
          totalSMS: sms.totalSMS || 0,
          totalReactions: reactions.totalReactions || 0,
          totalResponses: responses.totalResponses || 0,
          smsDelivered: sms.totalDelivered || 0,
          smsFailed: sms.totalFailed || 0,
          smsCost: sms.totalCost || 0,
          engagementRate: engagementRate.toFixed(2),
          smsDeliveryRate: deliveryRate.toFixed(2),
          updatedAt: new Date(),
        },
      });
  }

  // Phase 6: Advanced Features - Scheduled Messages Implementation
  async createScheduledMessage(scheduledMessage: InsertScheduledMessage): Promise<ScheduledMessage> {
    const result = await db.insert(scheduledMessages).values(scheduledMessage).returning();
    return result[0];
  }

  async getScheduledMessages(): Promise<ScheduledMessage[]> {
    return await db.select().from(scheduledMessages).orderBy(desc(scheduledMessages.scheduledFor));
  }

  async getScheduledMessage(id: number): Promise<ScheduledMessage | undefined> {
    const result = await db.select().from(scheduledMessages).where(eq(scheduledMessages.id, id));
    return result[0];
  }

  async updateScheduledMessage(id: number, updates: UpdateScheduledMessage): Promise<ScheduledMessage> {
    const result = await db
      .update(scheduledMessages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(scheduledMessages.id, id))
      .returning();
    return result[0];
  }

  async deleteScheduledMessage(id: number): Promise<void> {
    await db.delete(scheduledMessages).where(eq(scheduledMessages.id, id));
  }

  async getScheduledMessagesForDelivery(): Promise<ScheduledMessage[]> {
    // Create current time in local timezone for proper comparison
    const now = new Date();
    console.log(`🕐 Scheduler checking at: ${now.toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT`);
    
    return await db
      .select()
      .from(scheduledMessages)
      .where(
        and(
          eq(scheduledMessages.status, "scheduled"),
          lte(scheduledMessages.scheduledFor, now)
        )
      )
      .orderBy(asc(scheduledMessages.scheduledFor));
  }

  // Phase 6: Advanced Features - Announcement Templates Implementation
  async createAnnouncementTemplate(template: InsertAnnouncementTemplate): Promise<AnnouncementTemplate> {
    const result = await db.insert(announcementTemplates).values(template).returning();
    return result[0];
  }

  async getAnnouncementTemplates(): Promise<AnnouncementTemplate[]> {
    return await db
      .select()
      .from(announcementTemplates)
      .where(eq(announcementTemplates.isActive, true))
      .orderBy(desc(announcementTemplates.createdAt));
  }

  async getAnnouncementTemplate(id: number): Promise<AnnouncementTemplate | undefined> {
    const result = await db.select().from(announcementTemplates).where(eq(announcementTemplates.id, id));
    return result[0];
  }

  async updateAnnouncementTemplate(id: number, updates: UpdateAnnouncementTemplate): Promise<AnnouncementTemplate> {
    const result = await db
      .update(announcementTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(announcementTemplates.id, id))
      .returning();
    return result[0];
  }

  async deleteAnnouncementTemplate(id: number): Promise<void> {
    await db.update(announcementTemplates).set({ isActive: false }).where(eq(announcementTemplates.id, id));
  }

  async getAnnouncementTemplatesByCategory(category: string): Promise<AnnouncementTemplate[]> {
    return await db
      .select()
      .from(announcementTemplates)
      .where(
        and(
          eq(announcementTemplates.category, category),
          eq(announcementTemplates.isActive, true)
        )
      )
      .orderBy(desc(announcementTemplates.useCount));
  }

  async incrementTemplateUsage(id: number): Promise<void> {
    await db
      .update(announcementTemplates)
      .set({ 
        useCount: sql`${announcementTemplates.useCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(announcementTemplates.id, id));
  }

  // Seed professional templates with emojis
  async seedProfessionalTemplates(adminUserId: string): Promise<void> {
    const { PROFESSIONAL_TEMPLATES, getPriorityEmoji, getCategoryEmoji } = await import('../shared/template-utils.js');
    
    // Check if templates already exist
    const existingTemplates = await this.getAnnouncementTemplates();
    if (existingTemplates.length > 0) {
      console.log('📋 Professional templates already exist, skipping seed');
      return;
    }

    console.log('🌱 Seeding professional templates with emojis...');
    
    for (const template of PROFESSIONAL_TEMPLATES) {
      const templateData = {
        name: template.name,
        description: `Professional template for ${template.category} communications`,
        category: template.category,
        emoji: template.emoji,
        priorityEmoji: getPriorityEmoji(template.priority),
        categoryEmoji: getCategoryEmoji(template.category),
        title: template.title,
        content: template.content,
        priority: template.priority,
        targetAudience: 'all' as const,
        targetEmployees: [],
        smsEnabled: template.smsEnabled,
        tags: template.tags,
        createdBy: adminUserId,
        isActive: true,
        useCount: 0
      };

      try {
        await this.createAnnouncementTemplate(templateData);
        console.log(`✅ Created template: ${template.name}`);
      } catch (error) {
        console.error(`❌ Failed to create template ${template.name}:`, error);
      }
    }
    
    console.log('🎉 Professional templates seeded successfully!');
  }

  // Phase 6: Advanced Features - Automation Rules Implementation
  async createAutomationRule(rule: InsertAutomationRule): Promise<AutomationRule> {
    const result = await db.insert(automationRules).values(rule).returning();
    return result[0];
  }

  async getAutomationRules(): Promise<AutomationRule[]> {
    return await db
      .select()
      .from(automationRules)
      .orderBy(desc(automationRules.createdAt));
  }

  async getAutomationRule(id: number): Promise<AutomationRule | undefined> {
    const result = await db.select().from(automationRules).where(eq(automationRules.id, id));
    return result[0];
  }

  async updateAutomationRule(id: number, updates: UpdateAutomationRule): Promise<AutomationRule> {
    const result = await db
      .update(automationRules)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(automationRules.id, id))
      .returning();
    return result[0];
  }

  async deleteAutomationRule(id: number): Promise<void> {
    await db.update(automationRules).set({ isActive: false }).where(eq(automationRules.id, id));
  }

  async getActiveAutomationRules(): Promise<AutomationRule[]> {
    return await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.isActive, true))
      .orderBy(desc(automationRules.createdAt));
  }

  async getAutomationRulesForExecution(): Promise<AutomationRule[]> {
    return await db
      .select()
      .from(automationRules)
      .where(
        and(
          eq(automationRules.isActive, true),
          lte(automationRules.nextRun, new Date())
        )
      )
      .orderBy(asc(automationRules.nextRun));
  }

  async updateAutomationRuleLastTriggered(id: number): Promise<void> {
    await db
      .update(automationRules)
      .set({ 
        lastTriggered: new Date(),
        runCount: sql`${automationRules.runCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(automationRules.id, id));
  }

  // SMS Consent History Methods
  async createSmsConsentRecord(record: InsertSMSConsentHistory): Promise<SMSConsentHistory> {
    const [consentRecord] = await db
      .insert(smsConsentHistory)
      .values(record)
      .returning();
    return consentRecord;
  }

  async getSmsConsentHistoryByUserId(userId: string): Promise<SMSConsentHistory[]> {
    return await db
      .select()
      .from(smsConsentHistory)
      .where(eq(smsConsentHistory.userId, userId))
      .orderBy(desc(smsConsentHistory.createdAt));
  }

  async bulkOptInSmsConsent(options: {
    userIds: string[];
    changedBy: string;
    changeReason: string;
    notificationTypes: string[];
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
  }): Promise<{ 
    successful: number; 
    failed: number; 
    errors: Array<{ userId: string; error: string }> 
  }> {
    const { userIds, changedBy, changeReason, notificationTypes, ipAddress, userAgent, notes } = options;
    let successful = 0;
    let failed = 0;
    const errors: Array<{ userId: string; error: string }> = [];

    for (const userId of userIds) {
      try {
        // Get current user consent status
        const user = await this.getUser(userId);
        if (!user) {
          errors.push({ userId, error: 'User not found' });
          failed++;
          continue;
        }

        const previousConsent = user.smsConsent;
        const previousNotificationTypes = user.smsNotificationTypes || ['emergency'];

        // Update user SMS consent
        await db
          .update(users)
          .set({
            smsConsent: true,
            smsConsentDate: new Date(),
            smsNotificationTypes: notificationTypes,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        // Create consent history record
        await this.createSmsConsentRecord({
          userId,
          consentGiven: true,
          previousConsent,
          notificationTypes,
          previousNotificationTypes,
          changeReason,
          changedBy,
          changeMethod: 'bulk_script',
          ipAddress,
          userAgent,
          notes
        });

        successful++;
      } catch (error) {
        console.error(`Error updating SMS consent for user ${userId}:`, error);
        errors.push({ userId, error: error instanceof Error ? error.message : 'Unknown error' });
        failed++;
      }
    }

    return { successful, failed, errors };
  }

  // Individual SMS consent toggle for admin
  async toggleSmsConsent(options: {
    userId: string;
    consentValue: boolean;
    changedBy: string;
    notificationTypes?: string[];
    ipAddress?: string;
    userAgent?: string;
    notes?: string;
  }): Promise<User> {
    const { userId, consentValue, changedBy, notificationTypes, ipAddress, userAgent, notes } = options;

    // Get current user consent status
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const previousConsent = user.smsConsent;
    const previousNotificationTypes = user.smsNotificationTypes || ['emergency'];
    const newNotificationTypes = notificationTypes || (consentValue ? ['emergency'] : []);

    // Update user SMS consent
    const [updatedUser] = await db
      .update(users)
      .set({
        smsConsent: consentValue,
        smsConsentDate: consentValue ? new Date() : user.smsConsentDate,
        smsNotificationTypes: newNotificationTypes,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();

    // Create consent history record
    await this.createSmsConsentRecord({
      userId,
      consentGiven: consentValue,
      previousConsent,
      notificationTypes: newNotificationTypes,
      previousNotificationTypes,
      changeReason: 'admin_update',
      changedBy,
      changeMethod: 'admin_panel',
      ipAddress,
      userAgent,
      notes
    });

    return updatedUser;
  }
}

export const storage = new DatabaseStorage();

