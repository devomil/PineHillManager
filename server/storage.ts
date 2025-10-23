import {
  users,
  timeOffRequests,
  workSchedules,
  calendarNotes,
  shiftSwapRequests,
  shiftCoverageRequests,
  announcements,
  trainingModules,
  trainingLessons,
  trainingProgress,
  lessonProgress,
  trainingAssessments,
  trainingQuestions,
  trainingAttempts,
  trainingSkills,
  trainingModuleSkills,
  employeeSkills,
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
  unmatchedThriveItems,
  employeePurchases,
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
  readReceipts,
  // Monthly Accounting Archival Tables
  monthlyClosings,
  monthlyAccountBalances,
  monthlyTransactionSummaries,
  monthlyResetHistory,
  // Payroll Tables
  payrollPeriods,
  payrollEntries,
  payrollTimeEntries,
  payrollJournalEntries,
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
  type InsertTrainingLesson,
  type TrainingLesson,
  type InsertTrainingProgress,
  type TrainingProgress,
  type InsertLessonProgress,
  type LessonProgress,
  type InsertTrainingAssessment,
  type TrainingAssessment,
  type InsertTrainingQuestion,
  type TrainingQuestion,
  type InsertTrainingAttempt,
  type TrainingAttempt,
  type InsertTrainingSkill,
  type TrainingSkill,
  type InsertTrainingModuleSkill,
  type TrainingModuleSkill,
  type InsertEmployeeSkill,
  type EmployeeSkill,
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
  type UnmatchedThriveItem,
  type InsertUnmatchedThriveItem,
  type EmployeePurchase,
  type InsertEmployeePurchase,
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
  // Monthly Accounting Archival Types
  type MonthlyClosure,
  type InsertMonthlyClosure,
  type MonthlyAccountBalance,
  type InsertMonthlyAccountBalance,
  type MonthlyTransactionSummary,
  type InsertMonthlyTransactionSummary,
  type MonthlyResetHistory,
  type InsertMonthlyResetHistory,
  // Payroll Types
  type PayrollPeriod,
  type InsertPayrollPeriod,
  type PayrollEntry,
  type InsertPayrollEntry,
  type PayrollTimeEntry,
  type InsertPayrollTimeEntry,
  type PayrollJournalEntry,
  // Order Management Tables
  merchants,
  posLocations,
  items,
  orders,
  orderLineItems,
  payments,
  taxes,
  discounts,
  refunds,
  tenders,
  itemCostHistory,
  syncCursors,
  dailySales,
  // Task Management Tables
  tasks,
  taskNotes,
  // Order Management Types
  type Merchant,
  type InsertMerchant,
  type Item,
  type InsertItem,
  type Order,
  type InsertOrder,
  type OrderLineItem,
  type InsertOrderLineItem,
  type Payment,
  type InsertPayment,
  type Tax,
  type InsertTax,
  type Discount,
  type InsertDiscount,
  type Refund,
  type InsertRefund,
  type Tender,
  type InsertTender,
  type ItemCostHistory,
  type InsertItemCostHistory,
  type SyncCursor,
  type InsertSyncCursor,
  type DailySales,
  type InsertDailySales,
  // Task Management Types
  type Task,
  type InsertTask,
  type TaskNote,
  type InsertTaskNote,
  // AI Training Generation Tables & Types
  trainingGenerationJobs,
  type TrainingGenerationJob,
  type InsertTrainingGenerationJob,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, gte, lte, or, sql, like, isNull, isNotNull, exists, sum, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { CloverIntegration } from "./integrations/clover";
import { AmazonIntegration } from "./integrations/amazon";
import { ordersCache } from "./cache";

// Standard Chart of Accounts - Auto-populated accounts with data
const STANDARD_ACCOUNTS = [
  {
    accountNumber: '5000',
    accountName: 'Cost of Goods Sold',
    accountType: 'Expense',
    subType: 'Cost of Goods Sold',
    description: 'Direct costs of inventory sold - auto-populated from Clover & Thrive data',
    balance: '0'
  },
  {
    accountNumber: '1300',
    accountName: 'Inventory',
    accountType: 'Asset',
    subType: 'Current Asset',
    description: 'Products and materials inventory - auto-populated from Thrive inventory data',
    balance: '0'
  },
  {
    accountNumber: '6700',
    accountName: 'Payroll Expense',
    accountType: 'Expense',
    subType: 'Operating Expense',
    description: 'Employee wages and salaries - auto-populated from time clock data',
    balance: '0'
  },
  {
    accountNumber: '4100',
    accountName: 'Total Sales Revenue',
    accountType: 'Income',
    subType: 'Revenue',
    description: 'Consolidated sales revenue from all sources - auto-populated from Clover POS & Amazon data',
    balance: '0'
  },
  {
    accountNumber: '2100',
    accountName: 'Sales Tax Payable',
    accountType: 'Liability',
    subType: 'Current Liability',
    description: 'Sales tax collected from customers - auto-populated from POS transactions',
    balance: '0'
  }
] as const;

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
  getWorkSchedulesByDateRange(startDate: string, endDate: string, userId?: string): Promise<WorkSchedule[]>;
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
  getPublishedAnnouncementsForUser(userId: string, userRole: string): Promise<Announcement[]>;
  updateAnnouncement(id: number, announcement: Partial<InsertAnnouncement>): Promise<Announcement>;
  publishAnnouncement(id: number): Promise<Announcement>;
  deleteAnnouncement(id: number): Promise<void>;

  // Training modules
  createTrainingModule(module: InsertTrainingModule): Promise<TrainingModule>;
  getAllTrainingModules(): Promise<TrainingModule[]>;
  getTrainingModuleById(id: number): Promise<TrainingModule | undefined>;
  updateTrainingModule(id: number, module: Partial<InsertTrainingModule>): Promise<TrainingModule>;
  deleteTrainingModule(id: number): Promise<void>;
  getActiveTrainingModules(): Promise<TrainingModule[]>;
  getMandatoryModulesForUser(userId: string, userRole: string, userDepartment?: string | null): Promise<TrainingModule[]>;

  // Training lessons
  createTrainingLesson(lesson: InsertTrainingLesson): Promise<TrainingLesson>;
  getModuleLessons(moduleId: number): Promise<TrainingLesson[]>;
  updateTrainingLesson(id: number, lesson: Partial<InsertTrainingLesson>): Promise<TrainingLesson>;
  deleteTrainingLesson(id: number): Promise<void>;
  getLessonById(id: number): Promise<TrainingLesson | undefined>;

  // Training progress
  createOrUpdateTrainingProgress(progress: InsertTrainingProgress): Promise<TrainingProgress>;
  getUserTrainingProgress(userId: string): Promise<TrainingProgress[]>;
  getTrainingProgressByModule(userId: string, moduleId: number): Promise<TrainingProgress | undefined>;
  updateTrainingProgress(id: number, progress: Partial<InsertTrainingProgress>): Promise<TrainingProgress>;
  enrollUserInModule(userId: string, moduleId: number, assignedBy?: string, dueDate?: Date): Promise<TrainingProgress>;
  completeTrainingModule(userId: string, moduleId: number, finalScore?: number, certificateUrl?: string): Promise<TrainingProgress>;
  getAllEnrollments(): Promise<TrainingProgress[]>;
  getOverdueTraining(userId?: string): Promise<TrainingProgress[]>;

  // Lesson progress
  createOrUpdateLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress>;
  getUserLessonProgress(userId: string, lessonId: number): Promise<LessonProgress | undefined>;
  markLessonComplete(userId: string, lessonId: number, timeSpent?: number): Promise<LessonProgress>;

  // Training assessments
  createTrainingAssessment(assessment: InsertTrainingAssessment): Promise<TrainingAssessment>;
  getModuleAssessment(moduleId: number): Promise<TrainingAssessment | undefined>;
  getAssessmentById(assessmentId: number): Promise<TrainingAssessment | undefined>;
  updateTrainingAssessment(id: number, assessment: Partial<InsertTrainingAssessment>): Promise<TrainingAssessment>;
  deleteTrainingAssessment(id: number): Promise<void>;

  // Training questions
  createTrainingQuestion(question: InsertTrainingQuestion): Promise<TrainingQuestion>;
  getAssessmentQuestions(assessmentId: number): Promise<TrainingQuestion[]>;
  updateTrainingQuestion(id: number, question: Partial<InsertTrainingQuestion>): Promise<TrainingQuestion>;
  deleteTrainingQuestion(id: number): Promise<void>;

  // Training attempts
  createTrainingAttempt(attempt: InsertTrainingAttempt): Promise<TrainingAttempt>;
  getUserAttempts(userId: string, assessmentId: number): Promise<TrainingAttempt[]>;
  getLatestAttempt(userId: string, assessmentId: number): Promise<TrainingAttempt | undefined>;
  getUserAttemptsForModule(userId: string, moduleId: number): Promise<TrainingAttempt[]>;

  // Training skills
  createTrainingSkill(skill: InsertTrainingSkill): Promise<TrainingSkill>;
  getAllTrainingSkills(): Promise<TrainingSkill[]>;
  getTrainingSkillsByCategory(category: string): Promise<TrainingSkill[]>;
  updateTrainingSkill(id: number, skill: Partial<InsertTrainingSkill>): Promise<TrainingSkill>;

  // Training module skills
  addSkillToModule(moduleSkill: InsertTrainingModuleSkill): Promise<TrainingModuleSkill>;
  getModuleSkills(moduleId: number): Promise<TrainingModuleSkill[]>;
  removeSkillFromModule(moduleId: number, skillId: number): Promise<void>;

  // Employee skills
  addEmployeeSkill(employeeSkill: InsertEmployeeSkill): Promise<EmployeeSkill>;
  getEmployeeSkills(userId: string): Promise<EmployeeSkill[]>;
  updateEmployeeSkill(id: number, skill: Partial<InsertEmployeeSkill>): Promise<EmployeeSkill>;
  grantSkillsOnCompletion(userId: string, moduleId: number): Promise<void>;

  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getUserMessages(userId: string): Promise<Message[]>;
  markMessageAsRead(messageId: number, userId: string): Promise<void>;
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
  getUnreadAnnouncementCount(userId: string, userRole: string): Promise<number>;
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
  
  // Orphaned time entry management
  getOrphanedTimeEntries(): Promise<any[]>;
  fixOrphanedTimeEntries(): Promise<number>;
  
  // Time clock reporting - Scheduled vs Actual
  getScheduledVsActualReport(startDate: string, endDate: string, employeeId?: string): Promise<any[]>;
  
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

  // Employee purchases (barcode scanning store purchases)
  createEmployeePurchase(purchase: InsertEmployeePurchase): Promise<EmployeePurchase>;
  getEmployeePurchasesByUser(employeeId: string, periodMonth?: string): Promise<EmployeePurchase[]>;
  getEmployeePurchaseMonthlyTotal(employeeId: string, periodMonth: string): Promise<number>;
  searchInventoryByBarcode(barcode: string): Promise<InventoryItem | undefined>;
  getEmployeePurchaseUsersWithSpending(periodMonth: string): Promise<any[]>;
  updateEmployeePurchaseSettings(userId: string, settings: {
    employeePurchaseEnabled?: boolean;
    employeePurchaseCap?: string;
    employeePurchaseCostMarkup?: string;
    employeePurchaseRetailDiscount?: string;
  }): Promise<User>;

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
  getFinancialAccountByName(accountName: string): Promise<FinancialAccount | undefined>;
  updateFinancialAccount(id: number, account: Partial<InsertFinancialAccount>): Promise<FinancialAccount>;
  deleteFinancialAccount(id: number): Promise<void>;
  getAccountsByType(accountType: string): Promise<FinancialAccount[]>;
  getAccountsByName(accountName: string): Promise<FinancialAccount[]>;
  ensureStandardAccounts(): Promise<void>;
  syncAccountBalancesWithLiveData(startDate: string, endDate: string): Promise<void>;

  // Financial Transactions
  createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction>;
  getAllFinancialTransactions(limit?: number, offset?: number): Promise<FinancialTransaction[]>;
  getFinancialTransactionById(id: number): Promise<FinancialTransaction | undefined>;
  getTransactionsByDateRange(startDate: string, endDate: string): Promise<FinancialTransaction[]>;
  getTransactionsBySourceSystem(sourceSystem: string): Promise<FinancialTransaction[]>;
  updateFinancialTransaction(id: number, transaction: Partial<InsertFinancialTransaction>): Promise<FinancialTransaction>;
  
  // Quick expense operations
  createQuickExpense(data: {
    amount: number;
    description: string;
    category: string;
    expenseDate: string;
    userId: string;
  }): Promise<FinancialTransaction>;
  deleteFinancialTransaction(id: number): Promise<void>;

  // Financial Transaction Lines
  createTransactionLine(line: InsertFinancialTransactionLine): Promise<FinancialTransactionLine>;
  getTransactionLines(transactionId: number): Promise<FinancialTransactionLine[]>;
  updateTransactionLine(id: number, line: Partial<InsertFinancialTransactionLine>): Promise<FinancialTransactionLine>;
  deleteTransactionLine(id: number): Promise<void>;

  // Payroll Automation Functions
  computeScheduledHoursByUser(startDate: string, endDate: string, locationId?: number): Promise<Array<{
    userId: string;
    userName: string;
    scheduledHours: number;
    hourlyRate: number | null;
  }>>;
  getHourlyRates(userIds: string[]): Promise<Array<{
    userId: string;
    hourlyRate: number | null;
    defaultEntryCost: number | null;
  }>>;
  getAccountByCodeOrName(accountIdentifier: string): Promise<FinancialAccount | undefined>;
  createPayrollAccrualTransaction(data: {
    month: number;
    year: number;
    totalAmount: number;
    employeeBreakdown: Array<{
      userId: string;
      userName: string;
      scheduledHours: number;
      hourlyRate: number;
      totalCost: number;
    }>;
    locationId?: number;
    replace?: boolean;
  }): Promise<FinancialTransaction>;
  getChartOfAccountsWithBalances(month?: number, year?: number): Promise<Array<{
    id: number;
    accountName: string;
    accountType: string;
    accountCode: string | null;
    balance: number;
    isActive: boolean;
  }>>;

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
  getAllInventoryItems(locationId?: number): Promise<InventoryItem[]>;
  getInventoryItemById(id: number): Promise<InventoryItem | undefined>;
  getInventoryItemByQBId(qbItemId: string): Promise<InventoryItem | undefined>;
  getInventoryItemByThriveId(thriveItemId: string): Promise<InventoryItem | undefined>;
  getInventoryItemsBySKU(sku: string): Promise<InventoryItem[]>;
  getInventoryItemsByCloverItemId(cloverItemId: string): Promise<InventoryItem[]>;
  getInventoryItemByASIN(asin: string): Promise<InventoryItem | undefined>;
  getLowStockItems(locationId?: number): Promise<InventoryItem[]>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  updateInventoryQuantity(id: number, quantity: string): Promise<InventoryItem>;
  updateInventoryItemVendor(id: number, vendor: string): Promise<InventoryItem>;
  deleteInventoryItem(id: number): Promise<void>;
  
  // Unmatched Thrive Items
  getUnmatchedThriveItems(locationName?: string): Promise<UnmatchedThriveItem[]>;
  getUnmatchedThriveItemById(id: number): Promise<UnmatchedThriveItem | undefined>;
  createUnmatchedThriveItem(data: InsertUnmatchedThriveItem): Promise<UnmatchedThriveItem>;
  updateUnmatchedThriveItem(id: number, data: Partial<InsertUnmatchedThriveItem>): Promise<UnmatchedThriveItem>;

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

  // COGS (Cost of Goods Sold) Calculation Methods
  calculateCOGS(startDate: string, endDate: string, locationId?: number): Promise<{
    totalRevenue: number;
    laborCosts: number;
    materialCosts: number;
    totalCOGS: number;
    grossProfit: number;
    grossMargin: number;
    salesCount: number;
    laborBreakdown: Array<{
      employeeId: string;
      employeeName: string;
      hoursWorked: number;
      hourlyRate: number;
      totalLaborCost: number;
      salesAllocated: number;
    }>;
    materialBreakdown: Array<{
      itemId: number;
      itemName: string;
      quantitySold: number;
      unitCost: number;
      totalMaterialCost: number;
    }>;
  }>;
  
  calculateLaborCosts(startDate: string, endDate: string, locationId?: number): Promise<{
    totalLaborCost: number;
    totalHoursWorked: number;
    employeeBreakdown: Array<{
      employeeId: string;
      employeeName: string;
      hoursWorked: number;
      hourlyRate: number;
      totalCost: number;
      shiftsWorked: number;
    }>;
  }>;
  
  calculateMaterialCosts(startDate: string, endDate: string, locationId?: number): Promise<{
    totalMaterialCost: number;
    totalItemsSold: number;
    itemBreakdown: Array<{
      itemId: number;
      itemName: string;
      quantitySold: number;
      unitCost: number;
      totalCost: number;
      salesCount: number;
    }>;
  }>;
  
  getCOGSByProduct(startDate: string, endDate: string, locationId?: number): Promise<Array<{
    itemId: number;
    itemName: string;
    quantitySold: number;
    totalRevenue: number;
    materialCost: number;
    laborCostAllocated: number;
    totalCOGS: number;
    grossProfit: number;
    grossMargin: number;
  }>>;
  
  getCOGSByEmployee(startDate: string, endDate: string, locationId?: number): Promise<Array<{
    employeeId: string;
    employeeName: string;
    hoursWorked: number;
    salesGenerated: number;
    laborCost: number;
    salesAllocated: Array<{
      saleId: number;
      saleDate: string;
      totalAmount: number;
      laborCostAllocated: number;
    }>;
  }>>;
  
  getCOGSByLocation(startDate: string, endDate: string): Promise<Array<{
    locationId: number;
    locationName: string;
    totalRevenue: number;
    totalLaborCost: number;
    totalMaterialCost: number;
    totalCOGS: number;
    grossProfit: number;
    grossMargin: number;
    salesCount: number;
    employeeCount: number;
  }>>;

  getTimeClockEntriesForPeriod(startDate: string, endDate: string, userId?: string, locationId?: number): Promise<Array<{
    id: number;
    userId: string;
    userName: string;
    locationId: number;
    clockInTime: Date;
    clockOutTime: Date | null;
    totalWorkedMinutes: number;
    hourlyRate: number;
    laborCost: number;
  }>>;

  // Monthly Accounting Archival Operations
  createMonthlyClosing(closing: InsertMonthlyClosure): Promise<MonthlyClosure>;
  getMonthlyClosing(year: number, month: number): Promise<MonthlyClosure | undefined>;
  getAllMonthlyClosings(): Promise<MonthlyClosure[]>;
  getMonthlyClosingsInDateRange(startYear: number, startMonth: number, endYear: number, endMonth: number): Promise<MonthlyClosure[]>;
  reopenMonth(year: number, month: number, reopenedBy: string): Promise<MonthlyClosure>;
  
  createMonthlyAccountBalance(balance: InsertMonthlyAccountBalance): Promise<MonthlyAccountBalance>;
  getMonthlyAccountBalances(monthlyClosingId: number): Promise<MonthlyAccountBalance[]>;
  getAccountBalanceHistory(accountId: number): Promise<MonthlyAccountBalance[]>;
  
  createMonthlyTransactionSummary(summary: InsertMonthlyTransactionSummary): Promise<MonthlyTransactionSummary>;
  getMonthlyTransactionSummaries(monthlyClosingId: number): Promise<MonthlyTransactionSummary[]>;
  getTransactionSummaryHistory(accountId: number): Promise<MonthlyTransactionSummary[]>;
  
  createMonthlyResetHistory(reset: InsertMonthlyResetHistory): Promise<MonthlyResetHistory>;
  getMonthlyResetHistory(): Promise<MonthlyResetHistory[]>;
  getResetHistoryForMonth(year: number, month: number): Promise<MonthlyResetHistory[]>;
  
  // Monthly Closing Operations
  performMonthlyClosing(year: number, month: number, closedBy: string, notes?: string): Promise<MonthlyClosure>;
  calculateMonthlyAccountBalances(year: number, month: number): Promise<{ accountId: number; openingBalance: string; closingBalance: string; totalDebits: string; totalCredits: string; transactionCount: number }[]>;
  calculateMonthlyTransactionSummaries(year: number, month: number): Promise<{ accountId: number; sourceSystem: string; transactionCount: number; totalAmount: string; totalDebits: string; totalCredits: string; averageAmount: string }[]>;
  
  // Monthly Reset Operations
  performMonthlyReset(year: number, month: number, resetBy: string, resetType: 'manual' | 'automated' | 'rollover', reason?: string, notes?: string): Promise<MonthlyResetHistory>;
  rollForwardAccountBalances(fromYear: number, fromMonth: number, toYear: number, toMonth: number): Promise<void>;
  
  // Historical Data Access
  getHistoricalFinancialData(year: number, month: number): Promise<{ accounts: FinancialAccount[]; transactions: FinancialTransaction[]; summary: MonthlyClosure | undefined }>;
  getHistoricalProfitLoss(year: number, month: number): Promise<{ revenue: string; expenses: string; netIncome: string }>;
  getHistoricalAccountBalances(year: number, month: number): Promise<MonthlyAccountBalance[]>;
  
  // Current Month Operations
  getCurrentMonthTransactions(): Promise<FinancialTransaction[]>;
  isMonthClosed(year: number, month: number): Promise<boolean>;
  getOpeningBalancesForCurrentMonth(): Promise<{ accountId: number; openingBalance: string }[]>;

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
    createdTimeMin?: number;    // NEW: Direct epoch milliseconds
    createdTimeMax?: number;    // NEW: Direct epoch milliseconds  
    startDate?: string;         // Legacy fallback
    endDate?: string;           // Legacy fallback
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
  getMessageRecipients(messageId: number): Promise<any[]>;
  
  // Announcement reactions
  addAnnouncementReaction(reaction: InsertAnnouncementReaction): Promise<AnnouncementReaction>;
  removeAnnouncementReaction(announcementId: number, userId: string, reactionType: string): Promise<void>;
  getAnnouncementReactions(announcementId: number): Promise<AnnouncementReaction[]>;

  // ================================
  // PAYROLL OPERATIONS
  // ================================

  // Payroll Period Management
  createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod>;
  getPayrollPeriods(status?: string): Promise<PayrollPeriod[]>;
  getPayrollPeriod(id: number): Promise<PayrollPeriod | undefined>;
  updatePayrollPeriod(id: number, updates: Partial<InsertPayrollPeriod>): Promise<PayrollPeriod>;
  deletePayrollPeriod(id: number): Promise<void>;
  getPayrollPeriodsForDateRange(startDate: string, endDate: string): Promise<PayrollPeriod[]>;

  // Payroll Calculation Methods
  calculatePayrollForPeriod(periodId: number): Promise<{ 
    totalGrossPay: number; 
    totalNetPay: number; 
    totalTaxes: number; 
    totalDeductions: number; 
    employeeCount: number;
    entries: PayrollEntry[];
  }>;
  calculatePayrollForEmployee(userId: string, startDate: string, endDate: string): Promise<{
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
    totalHours: number;
    regularPay: number;
    overtimePay: number;
    doubleTimePay: number;
    grossPay: number;
    netPay: number;
    timeEntries: any[];
  }>;
  calculatePayrollForDateRange(startDate: string, endDate: string, userId?: string): Promise<{
    totalGrossPay: number;
    totalNetPay: number;
    totalHours: number;
    employeePayroll: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      regularHours: number;
      overtimeHours: number;
      grossPay: number;
      netPay: number;
    }>;
  }>;

  // Payroll Entry Management
  createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry>;
  getPayrollEntries(payrollPeriodId?: number, userId?: string): Promise<PayrollEntry[]>;
  getPayrollEntry(id: number): Promise<PayrollEntry | undefined>;
  updatePayrollEntry(id: number, updates: Partial<InsertPayrollEntry>): Promise<PayrollEntry>;
  deletePayrollEntry(id: number): Promise<void>;
  approvePayrollEntry(id: number, approvedBy: string): Promise<PayrollEntry>;
  getPayrollEntriesForEmployee(userId: string, limit?: number): Promise<PayrollEntry[]>;

  // Payroll Time Entry Links
  createPayrollTimeEntry(entry: InsertPayrollTimeEntry): Promise<PayrollTimeEntry>;
  getPayrollTimeEntries(payrollEntryId: number): Promise<PayrollTimeEntry[]>;
  deletePayrollTimeEntry(id: number): Promise<void>;

  // Payroll Processing
  processPayrollPeriod(periodId: number, processedBy: string): Promise<PayrollPeriod>;
  generatePayrollJournalEntries(periodId: number): Promise<PayrollJournalEntry[]>;
  markPayrollPeriodAsPaid(periodId: number): Promise<PayrollPeriod>;

  // Payroll Reports and Analytics
  getPayrollSummaryByMonth(year: number, month: number): Promise<{
    totalGrossPay: string;
    totalNetPay: string;
    totalTaxes: string;
    totalDeductions: string;
    employeeCount: number;
    avgHoursPerEmployee: number;
    overtimePercentage: number;
    departmentBreakdown: Array<{ department: string; totalPay: string; employeeCount: number }>;
  }>;
  getPayrollAnalytics(startDate: string, endDate: string): Promise<{
    totalPayroll: string;
    avgPayPerEmployee: string;
    overtimeHours: number;
    regularHours: number;
    topEarners: Array<{ userId: string; name: string; totalPay: string }>;
    departmentCosts: Array<{ department: string; cost: string; percentage: number }>;
  }>;
  getEmployeePayHistory(userId: string, limit?: number): Promise<Array<{
    periodId: number;
    startDate: string;
    endDate: string;
    totalHours: number;
    grossPay: string;
    netPay: string;
    status: string;
  }>>;

  // Integration with Time Clock
  getUnprocessedTimeEntries(startDate: string, endDate: string): Promise<any[]>;
  markTimeEntriesAsProcessed(timeEntryIds: number[], payrollEntryId: number): Promise<void>;
  calculateHoursFromTimeEntries(timeEntries: any[]): Promise<{
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
    totalHours: number;
    totalBreakMinutes: number;
  }>;

  // Payroll Validation
  validatePayrollCalculations(periodId: number): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    summary: { totalEmployees: number; totalHours: number; totalPay: string };
  }>;

  // ================================
  // DATABASE-BACKED ORDER MANAGEMENT OPERATIONS
  // ================================

  // Merchant Management
  createMerchant(merchant: InsertMerchant): Promise<Merchant>;
  getMerchants(channel?: string): Promise<Merchant[]>;
  getMerchant(id: number): Promise<Merchant | undefined>;
  getMerchantByExternalId(merchantId: string, channel: string): Promise<Merchant | undefined>;
  updateMerchant(id: number, updates: Partial<InsertMerchant>): Promise<Merchant>;
  deleteMerchant(id: number): Promise<void>;
  // Atomic upsert method using unique constraint (merchantId, channel)
  upsertMerchant(merchant: InsertMerchant): Promise<{ merchant: Merchant; operation: 'created' | 'updated' }>;

  // Item Management
  createItem(item: InsertItem): Promise<Item>;
  getItems(merchantId: number, filters?: { 
    channel?: string; 
    category?: string; 
    isActive?: boolean; 
    search?: string; 
  }): Promise<Item[]>;
  getItem(id: number): Promise<Item | undefined>;
  getItemByExternalId(merchantId: number, externalItemId: string, channel: string): Promise<Item | undefined>;
  updateItem(id: number, updates: Partial<InsertItem>): Promise<Item>;
  deleteItem(id: number): Promise<void>;
  syncItems(merchantId: number, channel: string, items: InsertItem[]): Promise<{ created: number; updated: number }>;

  // Order Management
  createOrder(order: InsertOrder): Promise<Order>;
  getOrders(filters: {
    merchantId?: number;
    locationId?: number;
    channel?: string;
    startDate?: string;
    endDate?: string;
    orderState?: string;
    paymentState?: string;
    customerId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number }>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByExternalId(externalOrderId: string, channel: string): Promise<Order | undefined>;
  updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order>;
  deleteOrder(id: number): Promise<void>;
  // Atomic upsert method using unique constraint (merchantId, externalOrderId, channel)
  upsertOrder(order: InsertOrder): Promise<{ order: Order; operation: 'created' | 'updated' }>;
  syncOrders(merchantId: number, channel: string, orders: InsertOrder[]): Promise<{ created: number; updated: number }>;

  // Order Line Items Management
  createOrderLineItem(lineItem: InsertOrderLineItem): Promise<OrderLineItem>;
  getOrderLineItems(orderId: number): Promise<OrderLineItem[]>;
  getOrderLineItem(id: number): Promise<OrderLineItem | undefined>;
  getOrderLineItemByExternalId(externalLineItemId: string): Promise<OrderLineItem | undefined>;
  updateOrderLineItem(id: number, updates: Partial<InsertOrderLineItem>): Promise<OrderLineItem>;
  deleteOrderLineItem(id: number): Promise<void>;
  syncOrderLineItems(orderId: number, lineItems: InsertOrderLineItem[]): Promise<{ created: number; updated: number }>;

  // Payment Management
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayments(orderId: number): Promise<Payment[]>;
  getOrderPayments(orderId: number): Promise<Payment[]>; // Alias for getPayments
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentByExternalId(externalPaymentId: string): Promise<Payment | undefined>;
  updatePayment(id: number, updates: Partial<InsertPayment>): Promise<Payment>;
  deletePayment(id: number): Promise<void>;

  // Tax Management
  createTax(tax: InsertTax): Promise<Tax>;
  getTaxes(orderId?: number, lineItemId?: number): Promise<Tax[]>;
  getTax(id: number): Promise<Tax | undefined>;
  updateTax(id: number, updates: Partial<InsertTax>): Promise<Tax>;
  deleteTax(id: number): Promise<void>;

  // Discount Management
  createDiscount(discount: InsertDiscount): Promise<Discount>;
  getDiscounts(orderId?: number, lineItemId?: number): Promise<Discount[]>;
  getOrderDiscounts(orderId: string): Promise<Discount[]>; // Helper for order-specific discounts
  getDiscount(id: number): Promise<Discount | undefined>;
  getDiscountByExternalId(externalDiscountId: string): Promise<Discount | undefined>;
  updateDiscount(id: number, updates: Partial<InsertDiscount>): Promise<Discount>;
  deleteDiscount(id: number): Promise<void>;

  // Refund Management
  createRefund(refund: InsertRefund): Promise<Refund>;
  getRefunds(orderId?: number): Promise<Refund[]>;
  getOrderRefunds(orderId: number): Promise<Refund[]>; // Alias for order-specific refunds
  getRefund(id: number): Promise<Refund | undefined>;
  getRefundByExternalId(externalRefundId: string): Promise<Refund | undefined>;
  updateRefund(id: number, updates: Partial<InsertRefund>): Promise<Refund>;
  deleteRefund(id: number): Promise<void>;
  getRefundAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    merchantId?: number;
    locationId?: number;
    channel?: string;
  }): Promise<{
    totalRefunds: number;
    totalRefundAmount: number;
    refundsByReason: Array<{ reason: string; count: number; amount: number }>;
  }>;

  // Tender Management
  createTender(tender: InsertTender): Promise<Tender>;
  getTenders(paymentId: number): Promise<Tender[]>;
  getTender(id: number): Promise<Tender | undefined>;
  updateTender(id: number, updates: Partial<InsertTender>): Promise<Tender>;
  deleteTender(id: number): Promise<void>;

  // Item Cost History Management
  createItemCostHistory(costHistory: InsertItemCostHistory): Promise<ItemCostHistory>;
  getItemCostHistory(itemId: number): Promise<ItemCostHistory[]>;
  getCurrentItemCost(itemId: number, date?: Date): Promise<ItemCostHistory | undefined>;
  getLatestItemCost(itemId: string, merchantId: number): Promise<ItemCostHistory | undefined>;
  updateItemCost(itemId: number, newCost: number, costMethod?: string, reason?: string): Promise<ItemCostHistory>;

  // Sync Cursor Management
  createSyncCursor(cursor: InsertSyncCursor): Promise<SyncCursor>;
  getSyncCursors(system?: string, merchantId?: number): Promise<SyncCursor[]>;
  getSyncCursor(system: string, merchantId: number | null, dataType: string): Promise<SyncCursor | undefined>;
  updateSyncCursor(id: number, updates: Partial<InsertSyncCursor>): Promise<SyncCursor>;
  deleteSyncCursor(id: number): Promise<void>;
  updateSyncProgress(system: string, merchantId: number | null, dataType: string, updates: {
    lastModifiedMs?: string;
    lastSyncAt?: Date;
    lastRunAt?: Date;
    lastError?: string | null;
    errorCount?: number;
    lastSuccessAt?: Date;
  }): Promise<SyncCursor>;

  // Daily Sales Aggregation Management
  createDailySales(dailySales: InsertDailySales): Promise<DailySales>;
  getDailySales(filters: {
    startDate?: string;
    endDate?: string;
    merchantId?: number;
    locationId?: number;
    channel?: string;
  }): Promise<DailySales[]>;
  getDailySalesById(id: number): Promise<DailySales | undefined>;
  getDailySalesByMerchantAndDate(merchantId: number, date: string): Promise<DailySales | undefined>;
  updateDailySales(id: number, updates: Partial<InsertDailySales>): Promise<DailySales>;
  deleteDailySales(id: number): Promise<void>;
  aggregateDailySales(date: string, merchantId: number, locationId?: number, channel?: string): Promise<DailySales>;
  getOrdersByMerchantAndDateRange(merchantId: number, startDate: Date, endDate: Date): Promise<Order[]>;
  
  // Sales Analytics and Reporting
  getSalesAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    merchantId?: number;
    locationId?: number;
    channel?: string;
    groupBy?: 'day' | 'week' | 'month' | 'location' | 'channel';
  }): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalItems: number;
    averageOrderValue: number;
    totalCogs: number;
    grossMargin: number;
    grossMarginPercent: number;
    breakdown: Array<{
      period: string;
      revenue: number;
      orders: number;
      items: number;
      cogs: number;
      margin: number;
    }>;
  }>;
  
  getTopItems(filters: {
    startDate?: string;
    endDate?: string;
    merchantId?: number;
    locationId?: number;
    channel?: string;
    limit?: number;
  }): Promise<Array<{
    itemId: number;
    itemName: string;
    totalQuantity: number;
    totalRevenue: number;
    totalMargin: number;
    avgPrice: number;
  }>>;
  
  getRevenueByPaymentMethod(filters: {
    startDate?: string;
    endDate?: string;
    merchantId?: number;
    locationId?: number;
    channel?: string;
  }): Promise<Array<{
    paymentMethod: string;
    totalAmount: number;
    orderCount: number;
    percentage: number;
  }>>;

  // ================================
  // HISTORICAL DATA ACCESS METHODS
  // ================================
  
  // Historical Analytics - Multi-year data access
  getHistoricalAnalytics(filters: {
    startDate: string;
    endDate: string;
    locationId?: number | string;
    merchantId?: number;
    groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    timezone?: string;
  }): Promise<{
    analytics: Array<{
      period: string;
      periodStart: string;
      periodEnd: string;
      totalOrders: number;
      totalRevenue: number;
      totalDiscounts: number;
      totalRefunds: number;
      totalTax: number;
      totalCOGS: number;
      totalProfit: number;
      averageOrderValue: number;
      profitMargin: number;
      growth?: {
        revenueGrowth: number;
        orderGrowth: number;
        aovGrowth: number;
      };
    }>;
    summary: {
      totalOrders: number;
      totalRevenue: number;
      totalProfit: number;
      averageOrderValue: number;
      totalPeriods: number;
      dateRange: {
        start: string;
        end: string;
        days: number;
      };
    };
  }>;

  // Year-over-Year Comparison
  getYearOverYearComparison(filters: {
    currentPeriodStart: string;
    currentPeriodEnd: string;
    comparisonPeriodStart: string;
    comparisonPeriodEnd: string;
    locationId?: number | string;
    merchantId?: number;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    current: {
      totalOrders: number;
      totalRevenue: number;
      totalProfit: number;
      averageOrderValue: number;
    };
    comparison: {
      totalOrders: number;
      totalRevenue: number;
      totalProfit: number;
      averageOrderValue: number;
    };
    growth: {
      revenueGrowth: number;
      orderGrowth: number;
      profitGrowth: number;
      aovGrowth: number;
    };
    breakdown: Array<{
      period: string;
      current: {
        orders: number;
        revenue: number;
        profit: number;
      };
      comparison: {
        orders: number;
        revenue: number;
        profit: number;
      };
      growth: {
        revenueGrowth: number;
        orderGrowth: number;
        profitGrowth: number;
      };
    }>;
  }>;

  // Historical Trends - Performance patterns over time
  getHistoricalTrends(filters: {
    startDate: string;
    endDate: string;
    locationId?: number | string;
    merchantId?: number;
    trendType: 'revenue' | 'orders' | 'profit' | 'aov' | 'all';
    granularity?: 'daily' | 'weekly' | 'monthly';
  }): Promise<{
    trends: Array<{
      date: string;
      value: number;
      movingAverage?: number;
      seasonalIndex?: number;
      trendDirection?: 'up' | 'down' | 'stable';
    }>;
    summary: {
      overallTrend: 'up' | 'down' | 'stable';
      averageGrowthRate: number;
      bestPeriod: { date: string; value: number };
      worstPeriod: { date: string; value: number };
      volatility: number;
    };
  }>;

  // Long-term Financial Performance
  getLongTermFinancialPerformance(filters: {
    startDate: string;
    endDate: string;
    locationId?: number | string;
    merchantId?: number;
  }): Promise<{
    annualPerformance: Array<{
      year: string;
      totalRevenue: number;
      totalProfit: number;
      totalOrders: number;
      averageOrderValue: number;
      profitMargin: number;
      growth: {
        revenueGrowth: number;
        profitGrowth: number;
        orderGrowth: number;
      };
    }>;
    quarterlyBreakdown: Array<{
      quarter: string;
      year: string;
      totalRevenue: number;
      totalProfit: number;
      totalOrders: number;
      seasonalityIndex: number;
    }>;
    keyMetrics: {
      averageAnnualGrowth: number;
      bestYear: { year: string; revenue: number };
      bestQuarter: { quarter: string; year: string; revenue: number };
      totalYearsAnalyzed: number;
    };
  }>;

  // Optimized Historical Data Query - for large datasets
  getOptimizedHistoricalData(filters: {
    startDate: string;
    endDate: string;
    locationId?: number | string;
    merchantId?: number;
    aggregationLevel: 'daily' | 'weekly' | 'monthly';
    metrics: ('revenue' | 'orders' | 'profit' | 'items' | 'customers')[];
    useCache?: boolean;
    limit?: number;
  }): Promise<{
    data: Array<{
      period: string;
      metrics: Record<string, number>;
    }>;
    metadata: {
      totalRecords: number;
      queryTime: number;
      cacheHit: boolean;
      dateRange: { start: string; end: string };
    };
  }>;

  // Task Management Operations
  createTask(task: InsertTask): Promise<Task>;
  getAllTasks(): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  getTasksByAssignee(userId: string): Promise<Task[]>;
  getTasksByCreator(userId: string): Promise<Task[]>;
  getTasksByStatus(status: string): Promise<Task[]>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;
  
  // Task Notes Operations
  createTaskNote(note: InsertTaskNote): Promise<TaskNote>;
  getTaskNotes(taskId: number): Promise<TaskNote[]>;
  deleteTaskNote(id: number): Promise<void>;

  // AI Training Generation Job Operations
  createGenerationJob(job: InsertTrainingGenerationJob): Promise<TrainingGenerationJob>;
  getGenerationJobById(id: number): Promise<TrainingGenerationJob | undefined>;
  getGenerationJobsByModuleId(moduleId: number): Promise<TrainingGenerationJob[]>;
  getAllGenerationJobs(): Promise<TrainingGenerationJob[]>;
  updateGenerationJobStatus(id: number, status: string, errorMessage?: string | null): Promise<TrainingGenerationJob>;
  updateGenerationJobResults(id: number, results: any): Promise<TrainingGenerationJob>;
  updateGenerationJobContent(id: number, content: any): Promise<TrainingGenerationJob>;
}

// @ts-ignore
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
      const dateCondition = or(
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
      );
      if (dateCondition) {
        conditions.push(dateCondition);
      }
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
        const userCondition = or(
          eq(shiftSwapRequests.requesterId, userId),
          eq(shiftSwapRequests.takerId, userId)
        );
        if (userCondition) {
          conditions.push(userCondition);
        }
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

  async getPublishedAnnouncementsForUser(userId: string, userRole: string): Promise<Announcement[]> {
    // Get all published announcements first
    const allAnnouncements = await db
      .select()
      .from(announcements)
      .where(eq(announcements.isPublished, true))
      .orderBy(desc(announcements.createdAt));
    
    // Filter announcements based on targeting
    const filteredAnnouncements = allAnnouncements.filter(announcement => {
      // Always show announcements created by the user (so they can see responses/reactions)
      if (announcement.authorId === userId) {
        return true;
      }
      
      // If no specific targeting is set, include the announcement
      if (!announcement.targetAudience || announcement.targetAudience === 'all') {
        return true;
      }
      
      // Check if announcement targets specific employees
      if (announcement.targetEmployees && announcement.targetEmployees.length > 0) {
        // Handle both PostgreSQL array strings, plain strings, and actual arrays
        let targetEmployeeIds: string[];
        if (Array.isArray(announcement.targetEmployees)) {
          // Already an array
          targetEmployeeIds = announcement.targetEmployees;
        } else if (typeof announcement.targetEmployees === 'string') {
          const targetStr = announcement.targetEmployees as string;
          if (targetStr.startsWith('{') && targetStr.endsWith('}')) {
            // PostgreSQL array format: "{emp_1,emp_2}" → ["emp_1", "emp_2"]
            // Also trim quotes and whitespace: '{"emp_1","emp_2"}' → ["emp_1", "emp_2"]
            targetEmployeeIds = targetStr
              .slice(1, -1)  // Remove { and }
              .split(',')     // Split by comma
              .map((id: string) => id.trim().replace(/^["']|["']$/g, ''));  // Trim whitespace and quotes
          } else {
            // Plain string value: "emp_1" → ["emp_1"]
            targetEmployeeIds = [targetStr.trim().replace(/^["']|["']$/g, '')];
          }
        } else {
          targetEmployeeIds = [];
        }
        
        return targetEmployeeIds.includes(userId);
      }
      
      // Check role-based targeting
      switch (announcement.targetAudience) {
        case 'employees':
        case 'employees-only':
          return userRole === 'employee' || !userRole; // Include users with no role as employees
        case 'managers':
        case 'managers-only':
          return userRole === 'manager';
        case 'admins':
        case 'admins-only':
          return userRole === 'admin';
        case 'admins-managers':
          return userRole === 'admin' || userRole === 'manager';
        case 'specific':
          // For 'specific' audience, we need targetEmployees to be set
          return false; // If no targetEmployees specified for 'specific', exclude
        default:
          // SECURITY: Unknown audience types are explicitly excluded
          // Only whitelisted audience values are allowed to prevent leakage
          return false;
      }
    });
    
    return filteredAnnouncements;
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
      .orderBy(asc(trainingModules.title));
  }

  async getTrainingModuleById(id: number): Promise<TrainingModule | undefined> {
    const [module] = await db
      .select()
      .from(trainingModules)
      .where(eq(trainingModules.id, id));
    return module;
  }

  async updateTrainingModule(id: number, module: Partial<InsertTrainingModule>): Promise<TrainingModule> {
    const [updated] = await db
      .update(trainingModules)
      .set({ ...module, updatedAt: new Date() })
      .where(eq(trainingModules.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingModule(id: number): Promise<void> {
    await db.delete(trainingModules).where(eq(trainingModules.id, id));
  }

  async getActiveTrainingModules(): Promise<TrainingModule[]> {
    return await db
      .select()
      .from(trainingModules)
      .where(eq(trainingModules.isActive, true))
      .orderBy(asc(trainingModules.title));
  }

  async getMandatoryModulesForUser(userId: string, userRole: string, userDepartment?: string | null): Promise<TrainingModule[]> {
    const conditions = [
      eq(trainingModules.isActive, true),
      eq(trainingModules.isMandatory, true)
    ];

    // Filter by role if specific roles are set
    if (userRole) {
      const roleCondition = or(
        isNull(trainingModules.requiredForRoles),
        sql`${trainingModules.requiredForRoles} @> ARRAY[${sql.raw(`'${userRole}'`)}]::text[]`
      );
      if (roleCondition) {
        conditions.push(roleCondition);
      }
    }

    // Filter by department if specific departments are set
    if (userDepartment) {
      const deptCondition = or(
        isNull(trainingModules.requiredForDepartments),
        sql`${trainingModules.requiredForDepartments} @> ARRAY[${sql.raw(`'${userDepartment}'`)}]::text[]`
      );
      if (deptCondition) {
        conditions.push(deptCondition);
      }
    }

    return await db
      .select()
      .from(trainingModules)
      .where(and(...conditions))
      .orderBy(asc(trainingModules.title));
  }

  // Training lessons
  async createTrainingLesson(lesson: InsertTrainingLesson): Promise<TrainingLesson> {
    const [trainingLesson] = await db
      .insert(trainingLessons)
      .values(lesson)
      .returning();
    return trainingLesson;
  }

  async getModuleLessons(moduleId: number): Promise<TrainingLesson[]> {
    return await db
      .select()
      .from(trainingLessons)
      .where(eq(trainingLessons.moduleId, moduleId))
      .orderBy(asc(trainingLessons.orderIndex));
  }

  async updateTrainingLesson(id: number, lesson: Partial<InsertTrainingLesson>): Promise<TrainingLesson> {
    const [updated] = await db
      .update(trainingLessons)
      .set(lesson)
      .where(eq(trainingLessons.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingLesson(id: number): Promise<void> {
    await db.delete(trainingLessons).where(eq(trainingLessons.id, id));
  }

  async getLessonById(id: number): Promise<TrainingLesson | undefined> {
    const [lesson] = await db
      .select()
      .from(trainingLessons)
      .where(eq(trainingLessons.id, id));
    return lesson;
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

  async getTrainingProgressByModule(userId: string, moduleId: number): Promise<TrainingProgress | undefined> {
    const [progress] = await db
      .select()
      .from(trainingProgress)
      .where(
        and(
          eq(trainingProgress.userId, userId),
          eq(trainingProgress.moduleId, moduleId)
        )
      );
    return progress;
  }

  async updateTrainingProgress(id: number, progress: Partial<InsertTrainingProgress>): Promise<TrainingProgress> {
    const [updated] = await db
      .update(trainingProgress)
      .set(progress)
      .where(eq(trainingProgress.id, id))
      .returning();
    return updated;
  }

  async enrollUserInModule(userId: string, moduleId: number, assignedBy?: string, dueDate?: Date): Promise<TrainingProgress> {
    const [enrollment] = await db
      .insert(trainingProgress)
      .values({
        userId,
        moduleId,
        status: 'not_started',
        progress: 0,
        assignedBy,
        dueDate,
        startedAt: new Date()
      })
      .onConflictDoUpdate({
        target: [trainingProgress.userId, trainingProgress.moduleId],
        set: { assignedBy, dueDate }
      })
      .returning();
    return enrollment;
  }

  async completeTrainingModule(userId: string, moduleId: number, finalScore?: number, certificateUrl?: string): Promise<TrainingProgress> {
    const [completed] = await db
      .update(trainingProgress)
      .set({
        status: 'completed',
        progress: 100,
        completedAt: new Date(),
        finalScore,
        certificateUrl
      })
      .where(
        and(
          eq(trainingProgress.userId, userId),
          eq(trainingProgress.moduleId, moduleId)
        )
      )
      .returning();
    return completed;
  }

  async getAllEnrollments(): Promise<TrainingProgress[]> {
    return await db
      .select()
      .from(trainingProgress)
      .orderBy(desc(trainingProgress.startedAt));
  }

  async getOverdueTraining(userId?: string): Promise<TrainingProgress[]> {
    const conditions = [
      eq(trainingProgress.status, 'in_progress'),
      sql`${trainingProgress.dueDate} < NOW()`
    ];

    if (userId) {
      conditions.push(eq(trainingProgress.userId, userId));
    }

    return await db
      .select()
      .from(trainingProgress)
      .where(and(...conditions))
      .orderBy(asc(trainingProgress.dueDate));
  }

  // Lesson progress
  async createOrUpdateLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress> {
    const [lessonProgress_] = await db
      .insert(lessonProgress)
      .values(progress)
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: progress,
      })
      .returning();
    return lessonProgress_;
  }

  async getUserLessonProgress(userId: string, lessonId: number): Promise<LessonProgress | undefined> {
    const [progress] = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, userId),
          eq(lessonProgress.lessonId, lessonId)
        )
      );
    return progress;
  }

  async markLessonComplete(userId: string, lessonId: number, timeSpent?: number): Promise<LessonProgress> {
    const [completed] = await db
      .insert(lessonProgress)
      .values({
        userId,
        lessonId,
        completed: true,
        completedAt: new Date(),
        timeSpent
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          completed: true,
          completedAt: new Date(),
          timeSpent
        }
      })
      .returning();
    return completed;
  }

  // Training assessments
  async createTrainingAssessment(assessment: InsertTrainingAssessment): Promise<TrainingAssessment> {
    const [trainingAssessment] = await db
      .insert(trainingAssessments)
      .values(assessment)
      .returning();
    return trainingAssessment;
  }

  async getModuleAssessment(moduleId: number): Promise<TrainingAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(trainingAssessments)
      .where(eq(trainingAssessments.moduleId, moduleId));
    return assessment;
  }

  async getAssessmentById(assessmentId: number): Promise<TrainingAssessment | undefined> {
    const [assessment] = await db
      .select()
      .from(trainingAssessments)
      .where(eq(trainingAssessments.id, assessmentId));
    return assessment;
  }

  async updateTrainingAssessment(id: number, assessment: Partial<InsertTrainingAssessment>): Promise<TrainingAssessment> {
    const [updated] = await db
      .update(trainingAssessments)
      .set(assessment)
      .where(eq(trainingAssessments.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingAssessment(id: number): Promise<void> {
    await db.delete(trainingAssessments).where(eq(trainingAssessments.id, id));
  }

  // Training questions
  async createTrainingQuestion(question: InsertTrainingQuestion): Promise<TrainingQuestion> {
    const [trainingQuestion] = await db
      .insert(trainingQuestions)
      .values(question as any)
      .returning();
    return trainingQuestion;
  }

  async getAssessmentQuestions(assessmentId: number): Promise<TrainingQuestion[]> {
    return await db
      .select()
      .from(trainingQuestions)
      .where(eq(trainingQuestions.assessmentId, assessmentId))
      .orderBy(asc(trainingQuestions.orderIndex));
  }

  async updateTrainingQuestion(id: number, question: Partial<InsertTrainingQuestion>): Promise<TrainingQuestion> {
    const [updated] = await db
      .update(trainingQuestions)
      .set(question as any)
      .where(eq(trainingQuestions.id, id))
      .returning();
    return updated;
  }

  async deleteTrainingQuestion(id: number): Promise<void> {
    await db.delete(trainingQuestions).where(eq(trainingQuestions.id, id));
  }

  // Training attempts
  async createTrainingAttempt(attempt: InsertTrainingAttempt): Promise<TrainingAttempt> {
    const [trainingAttempt] = await db
      .insert(trainingAttempts)
      .values(attempt as any)
      .returning();
    return trainingAttempt;
  }

  async getUserAttempts(userId: string, assessmentId: number): Promise<TrainingAttempt[]> {
    return await db
      .select()
      .from(trainingAttempts)
      .where(
        and(
          eq(trainingAttempts.userId, userId),
          eq(trainingAttempts.assessmentId, assessmentId)
        )
      )
      .orderBy(desc(trainingAttempts.createdAt));
  }

  async getLatestAttempt(userId: string, assessmentId: number): Promise<TrainingAttempt | undefined> {
    const [attempt] = await db
      .select()
      .from(trainingAttempts)
      .where(
        and(
          eq(trainingAttempts.userId, userId),
          eq(trainingAttempts.assessmentId, assessmentId)
        )
      )
      .orderBy(desc(trainingAttempts.createdAt))
      .limit(1);
    return attempt;
  }

  async getUserAttemptsForModule(userId: string, moduleId: number): Promise<TrainingAttempt[]> {
    const result = await db
      .select({
        attempt: trainingAttempts,
      })
      .from(trainingAttempts)
      .innerJoin(trainingAssessments, eq(trainingAttempts.assessmentId, trainingAssessments.id))
      .where(
        and(
          eq(trainingAttempts.userId, userId),
          eq(trainingAssessments.moduleId, moduleId)
        )
      )
      .orderBy(desc(trainingAttempts.createdAt));

    return result.map(r => r.attempt);
  }

  // Training skills
  async createTrainingSkill(skill: InsertTrainingSkill): Promise<TrainingSkill> {
    const [trainingSkill] = await db
      .insert(trainingSkills)
      .values(skill)
      .returning();
    return trainingSkill;
  }

  async getAllTrainingSkills(): Promise<TrainingSkill[]> {
    return await db
      .select()
      .from(trainingSkills)
      .orderBy(asc(trainingSkills.name));
  }

  async getTrainingSkillsByCategory(category: string): Promise<TrainingSkill[]> {
    return await db
      .select()
      .from(trainingSkills)
      .where(eq(trainingSkills.category, category))
      .orderBy(asc(trainingSkills.name));
  }

  async updateTrainingSkill(id: number, skill: Partial<InsertTrainingSkill>): Promise<TrainingSkill> {
    const [updated] = await db
      .update(trainingSkills)
      .set(skill)
      .where(eq(trainingSkills.id, id))
      .returning();
    return updated;
  }

  // Training module skills
  async addSkillToModule(moduleSkill: InsertTrainingModuleSkill): Promise<TrainingModuleSkill> {
    // Check if skill already exists for this module
    const existing = await db
      .select()
      .from(trainingModuleSkills)
      .where(
        and(
          eq(trainingModuleSkills.moduleId, moduleSkill.moduleId),
          eq(trainingModuleSkills.skillId, moduleSkill.skillId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const [trainingModuleSkill] = await db
      .insert(trainingModuleSkills)
      .values(moduleSkill)
      .returning();
    return trainingModuleSkill;
  }

  async getModuleSkills(moduleId: number): Promise<TrainingModuleSkill[]> {
    return await db
      .select()
      .from(trainingModuleSkills)
      .where(eq(trainingModuleSkills.moduleId, moduleId));
  }

  async removeSkillFromModule(moduleId: number, skillId: number): Promise<void> {
    await db
      .delete(trainingModuleSkills)
      .where(
        and(
          eq(trainingModuleSkills.moduleId, moduleId),
          eq(trainingModuleSkills.skillId, skillId)
        )
      );
  }

  // Employee skills
  async addEmployeeSkill(employeeSkill: InsertEmployeeSkill): Promise<EmployeeSkill> {
    const [skill] = await db
      .insert(employeeSkills)
      .values(employeeSkill)
      .onConflictDoUpdate({
        target: [employeeSkills.userId, employeeSkills.skillId],
        set: employeeSkill
      })
      .returning();
    return skill;
  }

  async getEmployeeSkills(userId: string): Promise<EmployeeSkill[]> {
    return await db
      .select()
      .from(employeeSkills)
      .where(eq(employeeSkills.userId, userId))
      .orderBy(desc(employeeSkills.acquiredAt));
  }

  async updateEmployeeSkill(id: number, skill: Partial<InsertEmployeeSkill>): Promise<EmployeeSkill> {
    const [updated] = await db
      .update(employeeSkills)
      .set(skill)
      .where(eq(employeeSkills.id, id))
      .returning();
    return updated;
  }

  async grantSkillsOnCompletion(userId: string, moduleId: number): Promise<void> {
    // Get all skills associated with this module
    const moduleSkills = await this.getModuleSkills(moduleId);

    // Grant each skill to the user
    for (const moduleSkill of moduleSkills) {
      await this.addEmployeeSkill({
        userId,
        skillId: moduleSkill.skillId,
        proficiencyLevel: moduleSkill.proficiencyLevel || 'basic',
        acquiredFrom: moduleId,
        acquiredAt: new Date()
      });
    }
  }

  // Messages

  async getUserMessages(userId: string, limit = 50, offset = 0): Promise<Message[]> {
    // Get all messages sent by or received by this user, including custom direct messages
    return await db
      .select()
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId), // Messages sent by this user
          eq(messages.recipientId, userId), // Messages received by this user
          exists(
            db.select().from(readReceipts)
              .where(
                and(
                  eq(readReceipts.messageId, messages.id),
                  eq(readReceipts.userId, userId)
                )
              )
          ) // Messages where this user has a readReceipt (custom recipients)
        )
      )
      .orderBy(desc(messages.sentAt))
      .limit(limit)
      .offset(offset);
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
      // Count traditional direct messages (with recipientId)
      const directMessages = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.recipientId, userId),
            eq(messages.isRead, false)
          )
        );

      // Count custom direct messages (tracked via readReceipts with no readAt)
      const customMessages = await db
        .select({ count: sql<number>`count(*)` })
        .from(readReceipts)
        .innerJoin(messages, eq(readReceipts.messageId, messages.id))
        .where(
          and(
            eq(readReceipts.userId, userId),
            isNull(readReceipts.readAt)
          )
        );

      const directCount = Number(directMessages[0]?.count) || 0;
      const customCount = Number(customMessages[0]?.count) || 0;
      
      return directCount + customCount;
    } catch (error) {
      console.log("Database error in getUnreadMessageCount, returning 0");
      return 0;
    }
  }

  async getUnreadAnnouncementCount(userId: string, userRole: string): Promise<number> {
    try {
      // Optimized query using LEFT JOIN to count unread announcements in a single query
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(announcements)
        .leftJoin(
          announcementReactions, 
          and(
            eq(announcements.id, announcementReactions.announcementId),
            eq(announcementReactions.userId, userId)
          )
        )
        .where(
          and(
            eq(announcements.isPublished, true),
            or(
              eq(announcements.targetAudience, 'all'),
              eq(announcements.targetAudience, userRole),
              // Include announcements targeted to this specific user
              like(announcements.targetAudience, `%${userId}%`)
            ),
            // Only count if user hasn't reacted (LEFT JOIN results in null)
            isNull(announcementReactions.id)
          )
        );
      
      return Number(result[0]?.count) || 0;
    } catch (error) {
      console.log("Database error in getUnreadAnnouncementCount, returning 0");
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

  async createManualTimeEntry(data: {
    userId: string;
    locationId: number | null;
    clockInTime: Date;
    clockOutTime: Date;
    totalWorkedMinutes: number;
    notes?: string;
    ipAddress?: string;
    deviceInfo?: string;
  }): Promise<any> {
    const [timeEntry] = await db
      .insert(timeClockEntries)
      .values({
        userId: data.userId,
        locationId: data.locationId,
        clockInTime: data.clockInTime,
        clockOutTime: data.clockOutTime,
        status: 'clocked_out',
        totalWorkedMinutes: data.totalWorkedMinutes,
        totalBreakMinutes: 0,
        notes: data.notes,
        ipAddress: data.ipAddress,
        deviceInfo: data.deviceInfo,
        isManualEntry: true,
      })
      .returning();

    return timeEntry;
  }

  async getCurrentTimeEntry(userId: string): Promise<any | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00');
    
    const [entry] = await db
      .select()
      .from(timeClockEntries)
      .where(
        and(
          eq(timeClockEntries.userId, userId),
          gte(timeClockEntries.clockInTime, todayStart),
          or(
            eq(timeClockEntries.status, 'clocked_in'),
            eq(timeClockEntries.status, 'on_break')
          ),
          isNull(timeClockEntries.clockOutTime)
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
    
    const conditions = [
      gte(timeClockEntries.clockInTime, start),
      lte(timeClockEntries.clockInTime, end)
    ];

    // If userId is provided, filter by specific user
    if (userId && userId !== 'all') {
      conditions.push(eq(timeClockEntries.userId, userId));
    }

    const query = db
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
        isManualEntry: timeClockEntries.isManualEntry,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        hourlyRate: users.hourlyRate,
      })
      .from(timeClockEntries)
      .leftJoin(users, eq(timeClockEntries.userId, users.id))
      .where(and(...conditions));

    return await query.orderBy(desc(timeClockEntries.clockInTime));
  }

  async getCurrentlyCheckedInEmployees(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date(today + 'T00:00:00');
    
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
          gte(timeClockEntries.clockInTime, todayStart),
          or(
            eq(timeClockEntries.status, 'clocked_in'),
            eq(timeClockEntries.status, 'on_break')
          ),
          isNull(timeClockEntries.clockOutTime)
        )
      )
      .orderBy(timeClockEntries.clockInTime);
  }

  // Method to identify and fix orphaned time entries from previous days
  async getOrphanedTimeEntries(): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    return await db
      .select({
        id: timeClockEntries.id,
        userId: timeClockEntries.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        clockInTime: timeClockEntries.clockInTime,
        status: timeClockEntries.status,
      })
      .from(timeClockEntries)
      .leftJoin(users, eq(timeClockEntries.userId, users.id))
      .where(
        and(
          lte(timeClockEntries.clockInTime, new Date(today + 'T00:00:00')), // Before today
          or(
            eq(timeClockEntries.status, 'clocked_in'),
            eq(timeClockEntries.status, 'on_break')
          ),
          isNull(timeClockEntries.clockOutTime)
        )
      )
      .orderBy(desc(timeClockEntries.clockInTime));
  }

  // Method to automatically clock out orphaned entries
  async fixOrphanedTimeEntries(): Promise<number> {
    const orphanedEntries = await this.getOrphanedTimeEntries();
    let fixedCount = 0;

    for (const entry of orphanedEntries) {
      try {
        // Set clock out time to end of that day (11:59 PM)
        const clockInDate = new Date(entry.clockInTime);
        const endOfDay = new Date(clockInDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Calculate total worked minutes (assume 8 hour day if no break info)
        const clockInTime = new Date(entry.clockInTime);
        const totalWorkedMinutes = Math.floor((endOfDay.getTime() - clockInTime.getTime()) / (1000 * 60));

        await db
          .update(timeClockEntries)
          .set({
            clockOutTime: endOfDay,
            status: 'clocked_out',
            totalWorkedMinutes: totalWorkedMinutes,
            notes: 'Auto-clocked out by system - orphaned entry cleanup',
            updatedAt: new Date(),
          })
          .where(eq(timeClockEntries.id, entry.id));

        fixedCount++;
      } catch (error) {
        console.error(`Failed to fix orphaned entry ${entry.id}:`, error);
      }
    }

    return fixedCount;
  }

  async getScheduledVsActualReport(startDate: string, endDate: string, employeeId?: string): Promise<any[]> {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    
    // Get scheduled hours
    const scheduledQuery = db
      .select({
        userId: workSchedules.userId,
        date: workSchedules.date,
        startTime: workSchedules.startTime,
        endTime: workSchedules.endTime,
        shiftType: workSchedules.shiftType,
        status: workSchedules.status,
        locationId: workSchedules.locationId,
        firstName: users.firstName,
        lastName: users.lastName,
        hourlyRate: users.hourlyRate,
      })
      .from(workSchedules)
      .leftJoin(users, eq(workSchedules.userId, users.id))
      .where(
        and(
          gte(workSchedules.date, startDate),
          lte(workSchedules.date, endDate),
          employeeId ? eq(workSchedules.userId, employeeId) : sql`true`
        )
      );
    
    // Get actual time entries
    const actualQuery = db
      .select({
        userId: timeClockEntries.userId,
        clockInTime: timeClockEntries.clockInTime,
        clockOutTime: timeClockEntries.clockOutTime,
        totalWorkedMinutes: timeClockEntries.totalWorkedMinutes,
        totalBreakMinutes: timeClockEntries.totalBreakMinutes,
        isManualEntry: timeClockEntries.isManualEntry,
        notes: timeClockEntries.notes,
        locationId: timeClockEntries.locationId,
        firstName: users.firstName,
        lastName: users.lastName,
        hourlyRate: users.hourlyRate,
      })
      .from(timeClockEntries)
      .leftJoin(users, eq(timeClockEntries.userId, users.id))
      .where(
        and(
          gte(timeClockEntries.clockInTime, start),
          lte(timeClockEntries.clockInTime, end),
          employeeId ? eq(timeClockEntries.userId, employeeId) : sql`true`
        )
      );
    
    const [scheduledShifts, actualEntries] = await Promise.all([
      scheduledQuery,
      actualQuery
    ]);
    
    // Group by employee and date
    const reportMap = new Map<string, any>();
    
    // Process scheduled shifts
    for (const shift of scheduledShifts) {
      const key = `${shift.userId}-${shift.date}`;
      
      // Handle both timestamp and time-only formats
      let startMinutes, endMinutes;
      
      if (shift.startTime.includes('T')) {
        // It's a timestamp, extract time portion
        const startTime = new Date(shift.startTime);
        const endTime = new Date(shift.endTime);
        startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
        endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
      } else {
        // It's a time string (HH:MM format)
        const startParts = shift.startTime.split(':');
        const endParts = shift.endTime.split(':');
        startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
      }
      
      const scheduledMinutes = endMinutes >= startMinutes 
        ? endMinutes - startMinutes 
        : (24 * 60 - startMinutes) + endMinutes; // Handle overnight shifts
      
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          userId: shift.userId,
          employeeName: `${shift.firstName} ${shift.lastName}`,
          date: shift.date,
          scheduledMinutes: 0,
          actualMinutes: 0,
          scheduledShifts: [],
          actualEntries: [],
          hourlyRate: parseFloat(shift.hourlyRate || '0'),
        });
      }
      
      const record = reportMap.get(key);
      record.scheduledMinutes += scheduledMinutes;
      record.scheduledShifts.push({
        startTime: shift.startTime,
        endTime: shift.endTime,
        shiftType: shift.shiftType,
        status: shift.status,
        locationId: shift.locationId,
      });
    }
    
    // Process actual entries
    for (const entry of actualEntries) {
      const entryDate = new Date(entry.clockInTime).toISOString().split('T')[0];
      const key = `${entry.userId}-${entryDate}`;
      
      if (!reportMap.has(key)) {
        reportMap.set(key, {
          userId: entry.userId,
          employeeName: `${entry.firstName} ${entry.lastName}`,
          date: entryDate,
          scheduledMinutes: 0,
          actualMinutes: 0,
          scheduledShifts: [],
          actualEntries: [],
          hourlyRate: parseFloat(entry.hourlyRate || '0'),
        });
      }
      
      const record = reportMap.get(key);
      record.actualMinutes += entry.totalWorkedMinutes || 0;
      record.actualEntries.push({
        clockInTime: entry.clockInTime,
        clockOutTime: entry.clockOutTime,
        totalWorkedMinutes: entry.totalWorkedMinutes,
        totalBreakMinutes: entry.totalBreakMinutes,
        isManualEntry: entry.isManualEntry,
        notes: entry.notes,
        locationId: entry.locationId,
      });
    }
    
    // Convert to array and calculate variance
    const report = Array.from(reportMap.values()).map(record => {
      const varianceMinutes = record.actualMinutes - record.scheduledMinutes;
      const scheduledHours = (record.scheduledMinutes / 60).toFixed(2);
      const actualHours = (record.actualMinutes / 60).toFixed(2);
      const varianceHours = (varianceMinutes / 60).toFixed(2);
      const scheduledCost = (parseFloat(scheduledHours) * record.hourlyRate).toFixed(2);
      const actualCost = (parseFloat(actualHours) * record.hourlyRate).toFixed(2);
      const varianceCost = (parseFloat(varianceHours) * record.hourlyRate).toFixed(2);
      
      return {
        ...record,
        scheduledHours: parseFloat(scheduledHours),
        actualHours: parseFloat(actualHours),
        varianceMinutes,
        varianceHours: parseFloat(varianceHours),
        scheduledCost: parseFloat(scheduledCost),
        actualCost: parseFloat(actualCost),
        varianceCost: parseFloat(varianceCost),
        variancePercentage: record.scheduledMinutes > 0 
          ? ((varianceMinutes / record.scheduledMinutes) * 100).toFixed(1)
          : '0',
      };
    });
    
    // Sort by date descending, then by employee name
    return report.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return a.employeeName.localeCompare(b.employeeName);
    });
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
      query = query.where(and(...conditions)) as any; // Drizzle type inference issue with complex query chains
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

  // Employee purchases (barcode scanning store purchases)
  
  async createEmployeePurchase(purchase: InsertEmployeePurchase): Promise<EmployeePurchase> {
    const [newPurchase] = await db
      .insert(employeePurchases)
      .values(purchase)
      .returning();
    return newPurchase;
  }

  async getEmployeePurchasesByUser(employeeId: string, periodMonth?: string): Promise<EmployeePurchase[]> {
    if (periodMonth) {
      return await db
        .select()
        .from(employeePurchases)
        .where(and(
          eq(employeePurchases.employeeId, employeeId),
          eq(employeePurchases.periodMonth, periodMonth),
          eq(employeePurchases.status, 'completed')
        ))
        .orderBy(desc(employeePurchases.purchaseDate));
    }
    return await db
      .select()
      .from(employeePurchases)
      .where(and(
        eq(employeePurchases.employeeId, employeeId),
        eq(employeePurchases.status, 'completed')
      ))
      .orderBy(desc(employeePurchases.purchaseDate));
  }

  async getEmployeePurchaseMonthlyTotal(employeeId: string, periodMonth: string): Promise<number> {
    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(${employeePurchases.totalAmount}), 0)`
      })
      .from(employeePurchases)
      .where(and(
        eq(employeePurchases.employeeId, employeeId),
        eq(employeePurchases.periodMonth, periodMonth),
        eq(employeePurchases.status, 'completed')
      ));
    
    return parseFloat(result[0]?.total || '0');
  }

  async searchInventoryByBarcode(barcode: string): Promise<InventoryItem | undefined> {
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(and(
        or(
          eq(inventoryItems.upc, barcode),           // UPC barcode (primary)
          eq(inventoryItems.sku, barcode),           // SKU
          eq(inventoryItems.asin, barcode),          // ASIN
          eq(inventoryItems.cloverItemId, barcode)   // Clover Item ID (fallback)
        ),
        eq(inventoryItems.isActive, true)
      ))
      .limit(1);
    return item;
  }

  // Admin: Get all users with their employee purchase settings and spending
  async getAllUsersWithPurchaseData(periodMonth: string): Promise<any[]> {
    const usersWithSpending = await db
      .select({
        id: users.id,
        employeeId: users.employeeId,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        department: users.department,
        position: users.position,
        employeePurchaseEnabled: users.employeePurchaseEnabled,
        employeePurchaseCap: users.employeePurchaseCap,
        employeePurchaseCostMarkup: users.employeePurchaseCostMarkup,
        employeePurchaseRetailDiscount: users.employeePurchaseRetailDiscount,
        profileImageUrl: users.profileImageUrl,
        isActive: users.isActive,
        monthlySpent: sql<string>`COALESCE(SUM(CASE WHEN ${employeePurchases.periodMonth} = ${periodMonth} AND ${employeePurchases.status} = 'completed' THEN ${employeePurchases.totalAmount} ELSE 0 END), 0)`,
        totalPurchases: sql<string>`COUNT(CASE WHEN ${employeePurchases.periodMonth} = ${periodMonth} AND ${employeePurchases.status} = 'completed' THEN 1 END)`
      })
      .from(users)
      .leftJoin(employeePurchases, eq(users.id, employeePurchases.employeeId))
      .where(eq(users.isActive, true))
      .groupBy(users.id)
      .orderBy(users.lastName, users.firstName);
    
    return usersWithSpending;
  }

  // Admin: Update employee purchase settings
  async updateEmployeePurchaseSettings(
    userId: string, 
    settings: {
      employeePurchaseEnabled?: boolean;
      employeePurchaseCap?: string;
      employeePurchaseCostMarkup?: string;
      employeePurchaseRetailDiscount?: string;
    }
  ): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...settings,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
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
    const employeeAlias = alias(users, 'employee');
    const reviewerAlias = alias(users, 'reviewer');
    
    const requests = await db
      .select({
        id: timeOffRequests.id,
        userId: timeOffRequests.userId,
        startDate: timeOffRequests.startDate,
        endDate: timeOffRequests.endDate,
        reason: timeOffRequests.reason,
        status: timeOffRequests.status,
        requestedAt: timeOffRequests.requestedAt,
        reviewedAt: timeOffRequests.reviewedAt,
        reviewedBy: timeOffRequests.reviewedBy,
        comments: timeOffRequests.comments,
        user: {
          id: employeeAlias.id,
          firstName: employeeAlias.firstName,
          lastName: employeeAlias.lastName
        },
        reviewer: {
          id: reviewerAlias.id,
          firstName: reviewerAlias.firstName,
          lastName: reviewerAlias.lastName
        }
      })
      .from(timeOffRequests)
      .leftJoin(employeeAlias, eq(timeOffRequests.userId, employeeAlias.id))
      .leftJoin(reviewerAlias, eq(timeOffRequests.reviewedBy, reviewerAlias.id));
    
    return requests as any;
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
          role: users.role,
          profileImageUrl: users.profileImageUrl
        }
      })
      .from(responses)
      .leftJoin(users, eq(responses.authorId, users.id))
      .where(eq(responses.announcementId, announcementId))
      .orderBy(asc(responses.createdAt));

    return result as SelectResponse[];
  }

  async getResponsesByMessage(messageId: number): Promise<SelectResponse[]> {
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
          role: users.role,
          profileImageUrl: users.profileImageUrl
        }
      })
      .from(responses)
      .leftJoin(users, eq(responses.authorId, users.id))
      .where(eq(responses.messageId, messageId))
      .orderBy(asc(responses.createdAt));

    return result as SelectResponse[];
  }

  async getResponsesByParent(parentResponseId: number): Promise<SelectResponse[]> {
    return await db
      .select()
      .from(responses)
      .where(eq(responses.parentResponseId, parentResponseId))
      .orderBy(asc(responses.createdAt));
  }

  async getResponseById(id: number): Promise<SelectResponse | undefined> {
    const [response] = await db
      .select()
      .from(responses)
      .where(eq(responses.id, id));
    return response;
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
    
    // Replace placeholder environment variable names with actual values from secrets
    const resolvedConfigs = configs.map(config => ({
      ...config,
      sellerId: config.sellerId === 'AMAZON_SELLER_ID' ? process.env.AMAZON_SELLER_ID || config.sellerId : config.sellerId,
      accessToken: config.accessToken === 'AMAZON_ACCESS_TOKEN' ? (process.env.AMAZON_ACCESS_TOKEN || '') : config.accessToken,
      refreshToken: config.refreshToken === 'AMAZON_REFRESH_TOKEN' ? (process.env.AMAZON_REFRESH_TOKEN || config.refreshToken) : config.refreshToken,
      clientId: config.clientId === 'AMAZON_CLIENT_ID' ? (process.env.AMAZON_CLIENT_ID || config.clientId) : config.clientId,
      clientSecret: config.clientSecret === 'AMAZON_CLIENT_SECRET' ? (process.env.AMAZON_CLIENT_SECRET || config.clientSecret) : config.clientSecret
    }));
    
    // Log what was resolved (mask sensitive data)
    resolvedConfigs.forEach(config => {
      console.log(`🔐 [AMAZON CONFIG] Resolved credentials for ${config.merchantName}:`, {
        sellerId: config.sellerId ? `${config.sellerId.substring(0, 4)}...` : 'MISSING',
        hasAccessToken: !!config.accessToken && config.accessToken.length > 10,
        hasRefreshToken: !!config.refreshToken && config.refreshToken.length > 10,
        hasClientId: !!config.clientId && config.clientId.length > 10,
        hasClientSecret: !!config.clientSecret && config.clientSecret.length > 10
      });
    });
    
    return resolvedConfigs;
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

  async getFinancialAccountByName(accountName: string): Promise<FinancialAccount | undefined> {
    const [account] = await db.select().from(financialAccounts)
      .where(and(eq(financialAccounts.accountName, accountName), eq(financialAccounts.isActive, true)));
    return account;
  }

  async ensureStandardAccounts(): Promise<void> {
    console.log('📊 Ensuring standard Chart of Accounts...');
    
    for (const stdAccount of STANDARD_ACCOUNTS) {
      // Check if account already exists by name or account number
      const existing = await db.select().from(financialAccounts)
        .where(
          and(
            or(
              eq(financialAccounts.accountName, stdAccount.accountName),
              eq(financialAccounts.accountNumber, stdAccount.accountNumber)
            ),
            eq(financialAccounts.isActive, true)
          )
        );

      if (existing.length === 0) {
        // Create the account if it doesn't exist
        console.log(`  ✅ Creating standard account: ${stdAccount.accountNumber} - ${stdAccount.accountName}`);
        await this.createFinancialAccount({
          accountNumber: stdAccount.accountNumber,
          accountName: stdAccount.accountName,
          accountType: stdAccount.accountType,
          subType: stdAccount.subType,
          description: stdAccount.description,
          balance: stdAccount.balance,
          isActive: true
        });
      } else {
        console.log(`  ℹ️  Standard account already exists: ${stdAccount.accountNumber} - ${stdAccount.accountName}`);
      }
    }
    
    console.log('✅ Standard accounts ensured successfully');
  }

  async syncAccountBalancesWithLiveData(startDate: string, endDate: string): Promise<void> {
    console.log(`🔄 Syncing Chart of Accounts balances with live data (${startDate} to ${endDate})...`);
    
    try {
      // Get all Clover configurations
      const cloverMerchants = await db.select().from(cloverConfig).where(eq(cloverConfig.isActive, true));
      
      // Get Amazon configuration
      const [amazonConfiguration] = await db.select().from(amazonConfig).where(eq(amazonConfig.isActive, true)).limit(1);
      
      // Sync each Clover location
      for (const merchant of cloverMerchants) {
        if (!merchant.merchantId || !merchant.apiToken) {
          console.log(`  ⏭️ Skipping ${merchant.merchantName} - missing credentials`);
          continue;
        }
        
        const clover = new CloverIntegration({
          merchantId: merchant.merchantId,
          apiToken: merchant.apiToken,
          merchantName: merchant.merchantName || 'Unknown'
        });
        
        const revenue = await clover.getRevenue(new Date(startDate), new Date(endDate));
        
        // Find the sales account for this location
        const accountName = `Sales - ${merchant.merchantName}`;
        const [account] = await db.select().from(financialAccounts)
          .where(and(
            eq(financialAccounts.accountName, accountName),
            eq(financialAccounts.isActive, true)
          ))
          .limit(1);
        
        if (account) {
          await db.update(financialAccounts)
            .set({ 
              balance: revenue.toFixed(2),
              updatedAt: new Date()
            })
            .where(eq(financialAccounts.id, account.id));
          console.log(`  ✅ Updated ${accountName}: $${revenue.toFixed(2)}`);
        }
      }
      
      // Sync Amazon Store
      if (amazonConfiguration && amazonConfiguration.sellerId && amazonConfiguration.sellerId !== 'AMAZON_SELLER_ID') {
        try {
          const amazon = new AmazonIntegration({
            sellerId: amazonConfiguration.sellerId,
            merchantName: 'Amazon Store'
          });
          
          // Use getSalesMetrics instead of getRevenue
          const metrics = await amazon.getSalesMetrics(startDate, endDate, 'Total');
          const revenue = metrics?.totalSales?.amount || 0;
          
          const accountName = 'Sales - Amazon Store';
          const [account] = await db.select().from(financialAccounts)
            .where(and(
              eq(financialAccounts.accountName, accountName),
              eq(financialAccounts.isActive, true)
            ))
            .limit(1);
          
          if (account) {
            await db.update(financialAccounts)
              .set({ 
                balance: revenue.toFixed(2),
                updatedAt: new Date()
              })
              .where(eq(financialAccounts.id, account.id));
            console.log(`  ✅ Updated ${accountName}: $${revenue.toFixed(2)}`);
          }
        } catch (error) {
          console.log(`  ⚠️ Skipped Amazon Store: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      console.log('✅ Chart of Accounts sync completed successfully');
    } catch (error) {
      console.error('❌ Error syncing account balances:', error);
      throw error;
    }
  }

  // Financial Transactions
  async createFinancialTransaction(transaction: InsertFinancialTransaction): Promise<FinancialTransaction> {
    const [newTransaction] = await db.insert(financialTransactions).values(transaction).returning();
    return newTransaction;
  }

  async createQuickExpense(data: {
    amount: number;
    description: string;
    category: string;
    expenseDate: string;
    userId: string;
  }): Promise<FinancialTransaction> {
    try {
      console.log('🧾 Creating quick expense:', data);
      
      // Map category to account type and name
      const getExpenseAccountInfo = (category: string) => {
        const categoryMap: { [key: string]: { accountType: string; accountName: string } } = {
          'Office Supplies': { accountType: 'expense', accountName: 'Office Supplies Expense' },
          'Travel': { accountType: 'expense', accountName: 'Travel Expense' },
          'Meals & Entertainment': { accountType: 'expense', accountName: 'Meals & Entertainment Expense' },
          'Professional Services': { accountType: 'expense', accountName: 'Professional Services Expense' },
          'Marketing & Advertising': { accountType: 'expense', accountName: 'Marketing & Advertising Expense' },
          'Utilities': { accountType: 'expense', accountName: 'Utilities Expense' },
          'Equipment': { accountType: 'expense', accountName: 'Equipment Expense' },
          'Insurance': { accountType: 'expense', accountName: 'Insurance Expense' },
          'Software & Subscriptions': { accountType: 'expense', accountName: 'Software & Subscriptions Expense' },
          'Vehicle Expense': { accountType: 'expense', accountName: 'Vehicle Expense' },
          'Other': { accountType: 'expense', accountName: 'General Expense' }
        };
        return categoryMap[category] || categoryMap['Other'];
      };

      const expenseAccountInfo = getExpenseAccountInfo(data.category);
      
      // Find or create the expense account
      let expenseAccount = await this.getAccountsByName(expenseAccountInfo.accountName);
      if (!expenseAccount || expenseAccount.length === 0) {
        console.log(`📊 Creating new expense account: ${expenseAccountInfo.accountName}`);
        expenseAccount = [await this.createFinancialAccount({
          accountName: expenseAccountInfo.accountName,
          accountType: expenseAccountInfo.accountType,
          description: `Expense account for ${data.category}`,
          isActive: true
        })];
      }

      // Find or create Cash/Checking account for credit side
      let cashAccount = await this.getAccountsByName('Checking Account');
      if (!cashAccount || cashAccount.length === 0) {
        console.log('💰 Creating default Checking Account');
        cashAccount = [await this.createFinancialAccount({
          accountName: 'Checking Account',
          accountType: 'asset',
          description: 'Main checking account for business expenses',
          isActive: true
        })];
      }

      // Create the financial transaction
      const transaction = await this.createFinancialTransaction({
        transactionDate: new Date(data.expenseDate).toISOString(),
        description: `${data.category}: ${data.description}`,
        totalAmount: data.amount.toString(),
        transactionType: 'Expense',
        sourceSystem: 'quick_expense',
        referenceNumber: `EXPENSE-${Date.now()}`,
        sourceId: `quick_expense_${data.userId}_${Date.now()}`
      });

      // Create transaction lines for double-entry bookkeeping
      // Debit the expense account (increases expense)
      await this.createTransactionLine({
        transactionId: transaction.id,
        accountId: expenseAccount[0].id,
        debitAmount: data.amount.toString(),
        creditAmount: '0',
        description: `${data.category}: ${data.description}`
      });

      // Credit the cash account (decreases asset)
      await this.createTransactionLine({
        transactionId: transaction.id,
        accountId: cashAccount[0].id,
        debitAmount: '0',
        creditAmount: data.amount.toString(),
        description: `Payment for ${data.category}: ${data.description}`
      });

      console.log('✅ Quick expense created successfully:', {
        transactionId: transaction.id,
        amount: data.amount,
        category: data.category,
        expenseAccount: expenseAccount[0].accountName,
        cashAccount: cashAccount[0].accountName
      });

      return transaction;
    } catch (error) {
      console.error('❌ Error creating quick expense:', error);
      throw new Error(`Failed to create quick expense: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAllFinancialTransactions(limit?: number, offset?: number): Promise<FinancialTransaction[]> {
    let query = db.select().from(financialTransactions);
    
    if (limit && offset) {
      return await query
        .orderBy(desc(financialTransactions.transactionDate))
        .limit(limit)
        .offset(offset);
    } else if (limit) {
      return await query
        .orderBy(desc(financialTransactions.transactionDate))
        .limit(limit);
    } else {
      return await query
        .orderBy(desc(financialTransactions.transactionDate));
    }
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

  // Payroll Automation Functions
  async computeScheduledHoursByUser(startDate: string, endDate: string, locationId?: number): Promise<Array<{
    userId: string;
    userName: string;
    scheduledHours: number;
    hourlyRate: number | null;
  }>> {
    let query = db
      .select({
        userId: workSchedules.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        hourlyRate: users.hourlyRate,
        startTime: workSchedules.startTime,
        endTime: workSchedules.endTime
      })
      .from(workSchedules)
      .innerJoin(users, eq(workSchedules.userId, users.id))
      .where(and(
        gte(workSchedules.date, startDate),
        lte(workSchedules.date, endDate),
        eq(workSchedules.status, 'scheduled'),
        eq(users.isActive, true)
      ));

    if (locationId) {
      query = (query as any).where(eq(workSchedules.locationId, locationId)); // Drizzle type inference issue
    }

    const schedules = await query;

    // Group by user and calculate total hours
    const userHoursMap = new Map<string, {
      userName: string;
      totalHours: number;
      hourlyRate: number | null;
    }>();

    for (const schedule of schedules) {
      const userId = schedule.userId;
      const userName = `${schedule.firstName || ''} ${schedule.lastName || ''}`.trim();
      
      // Calculate hours for this schedule
      const startTime = new Date(`1970-01-01T${schedule.startTime}`);
      const endTime = new Date(`1970-01-01T${schedule.endTime}`);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      if (userHoursMap.has(userId)) {
        userHoursMap.get(userId)!.totalHours += hours;
      } else {
        userHoursMap.set(userId, {
          userName,
          totalHours: hours,
          hourlyRate: schedule.hourlyRate ? parseFloat(schedule.hourlyRate) : null
        });
      }
    }

    return Array.from(userHoursMap.entries()).map(([userId, data]) => ({
      userId,
      userName: data.userName,
      scheduledHours: Math.round(data.totalHours * 100) / 100, // Round to 2 decimal places
      hourlyRate: data.hourlyRate
    }));
  }

  async getHourlyRates(userIds: string[]): Promise<Array<{
    userId: string;
    hourlyRate: number | null;
    defaultEntryCost: number | null;
  }>> {
    const rates = await db
      .select({
        id: users.id,
        hourlyRate: users.hourlyRate,
        defaultEntryCost: users.defaultEntryCost
      })
      .from(users)
      .where(inArray(users.id, userIds));

    return rates.map(rate => ({
      userId: rate.id,
      hourlyRate: rate.hourlyRate ? parseFloat(rate.hourlyRate) : null,
      defaultEntryCost: rate.defaultEntryCost ? parseFloat(rate.defaultEntryCost) : null
    }));
  }

  async getAccountByCodeOrName(accountIdentifier: string): Promise<FinancialAccount | undefined> {
    // First try to find by account code
    let [account] = await db
      .select()
      .from(financialAccounts)
      .where(and(
        eq(financialAccounts.accountNumber, accountIdentifier),
        eq(financialAccounts.isActive, true)
      ));

    // If not found by code, try by name (exact match first, then partial)
    if (!account) {
      [account] = await db
        .select()
        .from(financialAccounts)
        .where(and(
          eq(financialAccounts.accountName, accountIdentifier),
          eq(financialAccounts.isActive, true)
        ));
    }

    // If still not found, try partial name match
    if (!account) {
      [account] = await db
        .select()
        .from(financialAccounts)
        .where(and(
          like(financialAccounts.accountName, `%${accountIdentifier}%`),
          eq(financialAccounts.isActive, true)
        ));
    }

    return account;
  }

  async createPayrollAccrualTransaction(data: {
    month: number;
    year: number;
    totalAmount: number;
    employeeBreakdown: Array<{
      userId: string;
      userName: string;
      scheduledHours: number;
      hourlyRate: number;
      totalCost: number;
    }>;
    locationId?: number;
    replace?: boolean;
  }): Promise<FinancialTransaction> {
    const { month, year, totalAmount, employeeBreakdown, locationId, replace = false } = data;
    
    // Check for existing accrual
    const description = `Payroll Accrual - ${year}-${month.toString().padStart(2, '0')} (scheduled)`;
    const existingTransaction = await db
      .select()
      .from(financialTransactions)
      .where(and(
        eq(financialTransactions.description, description),
        eq(financialTransactions.sourceSystem, 'system')
      ));

    if (existingTransaction.length > 0 && !replace) {
      throw new Error(`Payroll accrual for ${year}-${month} already exists. Use replace=true to overwrite.`);
    }

    // Delete existing if replace is true
    if (existingTransaction.length > 0 && replace) {
      for (const tx of existingTransaction) {
        await db.delete(financialTransactionLines).where(eq(financialTransactionLines.transactionId, tx.id));
        await db.delete(financialTransactions).where(eq(financialTransactions.id, tx.id));
      }
    }

    // Find required accounts
    const payrollExpenseAccount = await this.getAccountByCodeOrName('6700') || 
                                   await this.getAccountByCodeOrName('Payroll Expense');
    if (!payrollExpenseAccount) {
      throw new Error('Payroll Expense account (6700) not found in chart of accounts');
    }

    const payrollLiabilityAccount = await this.getAccountByCodeOrName('Payroll Liabilities') ||
                                    await this.getAccountByCodeOrName('Accrued Payroll');
    if (!payrollLiabilityAccount) {
      throw new Error('Payroll Liabilities account not found in chart of accounts');
    }

    // Create transaction on last day of month
    const lastDayOfMonth = new Date(year, month, 0);
    
    const transaction = await this.createFinancialTransaction({
      transactionDate: lastDayOfMonth.toISOString(),
      description,
      transactionType: 'Journal Entry',
      referenceNumber: `PAYROLL-${year}-${month}`,
      totalAmount: totalAmount.toString(),
      sourceSystem: 'system'
    });

    // Create debit line for payroll expense
    await this.createTransactionLine({
      transactionId: transaction.id,
      accountId: payrollExpenseAccount.id,
      description: `Scheduled payroll accrual for ${employeeBreakdown.length} employees`,
      debitAmount: totalAmount.toString(),
      creditAmount: null,
      lineNumber: 1
    });

    // Create credit line for payroll liability
    await this.createTransactionLine({
      transactionId: transaction.id,
      accountId: payrollLiabilityAccount.id,
      description: 'Accrued payroll liability',
      debitAmount: null,
      creditAmount: totalAmount.toString(),
      lineNumber: 2
    });

    console.log(`✅ Payroll accrual created: ${description}, Total: $${totalAmount}, Employees: ${employeeBreakdown.length}`);
    
    return transaction;
  }

  async getChartOfAccountsWithBalances(month?: number, year?: number): Promise<Array<{
    id: number;
    accountName: string;
    accountType: string;
    accountCode: string | null;
    balance: number;
    isActive: boolean;
  }>> {
    let dateFilter: any; // Complex Drizzle filter type
    
    if (month && year) {
      // Calculate balance up to the end of the specified month
      const endOfMonth = new Date(year, month, 0); // Last day of the month
      dateFilter = lte(financialTransactions.transactionDate, sql`${endOfMonth.toISOString().split('T')[0]}`);
    }

    // Get all accounts
    const accounts = await db
      .select()
      .from(financialAccounts)
      .where(eq(financialAccounts.isActive, true))
      .orderBy(asc(financialAccounts.accountNumber), asc(financialAccounts.accountName));

    // Calculate balances for each account
    const result = await Promise.all(accounts.map(async (account) => {
      let balanceQuery = db
        .select({
          totalDebits: sum(financialTransactionLines.debitAmount),
          totalCredits: sum(financialTransactionLines.creditAmount)
        })
        .from(financialTransactionLines)
        .innerJoin(financialTransactions, eq(financialTransactionLines.transactionId, financialTransactions.id))
        .where(eq(financialTransactionLines.accountId, account.id));

      if (dateFilter) {
        balanceQuery = (balanceQuery as any).where(dateFilter); // Drizzle type inference issue
      }

      const [balanceResult] = await balanceQuery;
      
      const totalDebits = parseFloat(balanceResult.totalDebits || '0');
      const totalCredits = parseFloat(balanceResult.totalCredits || '0');
      
      // Calculate balance based on account type (normal balance)
      let balance: number;
      if (['asset', 'expense'].includes(account.accountType.toLowerCase())) {
        // Assets and Expenses have normal debit balances
        balance = totalDebits - totalCredits;
      } else {
        // Liabilities, Equity, and Revenue have normal credit balances
        balance = totalCredits - totalDebits;
      }

      return {
        id: account.id,
        accountName: account.accountName,
        accountType: account.accountType,
        accountCode: account.accountNumber,
        balance: Math.round(balance * 100) / 100, // Round to 2 decimal places
        isActive: account.isActive ?? true // Handle nullable boolean
      };
    }));

    return result;
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

  async getAllInventoryItems(locationId?: number): Promise<InventoryItem[]> {
    const conditions = [eq(inventoryItems.isActive, true)];
    if (locationId !== undefined) {
      conditions.push(eq(inventoryItems.locationId, locationId));
    }
    return await db.select().from(inventoryItems).where(and(...conditions));
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

  async getInventoryItemsByCloverItemId(cloverItemId: string): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems).where(eq(inventoryItems.cloverItemId, cloverItemId));
  }

  async getInventoryItemByASIN(asin: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.asin, asin));
    return item;
  }

  async getLowStockItems(locationId?: number): Promise<InventoryItem[]> {
    const baseCondition = sql`${inventoryItems.quantityOnHand} <= ${inventoryItems.reorderPoint} AND ${inventoryItems.isActive} = true`;
    if (locationId !== undefined) {
      return await db.select().from(inventoryItems)
        .where(sql`${baseCondition} AND ${inventoryItems.locationId} = ${locationId}`);
    }
    return await db.select().from(inventoryItems).where(baseCondition);
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updated] = await db.update(inventoryItems).set({ ...item, updatedAt: new Date() }).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }

  async updateInventoryQuantity(id: number, quantity: string): Promise<InventoryItem> {
    const [updated] = await db.update(inventoryItems).set({ quantityOnHand: quantity, updatedAt: new Date() }).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }

  async updateInventoryItemVendor(id: number, vendor: string): Promise<InventoryItem> {
    const [updated] = await db.update(inventoryItems).set({ vendor, updatedAt: new Date() }).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.update(inventoryItems).set({ isActive: false }).where(eq(inventoryItems.id, id));
  }
  
  // Unmatched Thrive Items
  async getUnmatchedThriveItems(locationName?: string): Promise<UnmatchedThriveItem[]> {
    if (locationName) {
      // Use and() only when we have multiple conditions
      return await db.select().from(unmatchedThriveItems).where(
        and(
          eq(unmatchedThriveItems.status, 'pending'),
          eq(unmatchedThriveItems.locationName, locationName)
        )
      );
    } else {
      // Use single condition when no location filter
      return await db.select().from(unmatchedThriveItems).where(
        eq(unmatchedThriveItems.status, 'pending')
      );
    }
  }
  
  async getUnmatchedThriveItemById(id: number): Promise<UnmatchedThriveItem | undefined> {
    const [item] = await db.select().from(unmatchedThriveItems).where(eq(unmatchedThriveItems.id, id));
    return item;
  }
  
  async createUnmatchedThriveItem(data: InsertUnmatchedThriveItem): Promise<UnmatchedThriveItem> {
    const [created] = await db.insert(unmatchedThriveItems).values(data).returning();
    return created;
  }
  
  async updateUnmatchedThriveItem(id: number, data: Partial<InsertUnmatchedThriveItem>): Promise<UnmatchedThriveItem> {
    const [updated] = await db.update(unmatchedThriveItems)
      .set(data)
      .where(eq(unmatchedThriveItems.id, id))
      .returning();
    return updated;
  }

  // Stub implementations for remaining methods (to be implemented in future phases)
  async createPosSale(sale: InsertPosSale): Promise<PosSale> {
    const [posSale] = await db.insert(posSales).values(sale).returning();
    return posSale;
  }
  async getAllPosSales(limit?: number, offset?: number): Promise<PosSale[]> {
    let query = db.select().from(posSales);
    
    if (limit && offset) {
      return await query
        .orderBy(desc(posSales.createdAt))
        .limit(limit)
        .offset(offset);
    } else if (limit) {
      return await query
        .orderBy(desc(posSales.createdAt))
        .limit(limit);
    } else {
      return await query
        .orderBy(desc(posSales.createdAt));
    }
  }
  async getPosSaleById(id: number): Promise<PosSale | undefined> {
    const [sale] = await db.select().from(posSales).where(eq(posSales.id, id));
    return sale;
  }
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
  async updatePosSale(id: number, sale: Partial<InsertPosSale>): Promise<PosSale> {
    const [updated] = await db.update(posSales).set(sale).where(eq(posSales.id, id)).returning();
    return updated;
  }
  async markSaleAsPostedToQB(id: number, qbTransactionId: string): Promise<PosSale> {
    const [updated] = await db.update(posSales).set({ 
      qbPosted: true, 
      qbTransactionId: qbTransactionId
    }).where(eq(posSales.id, id)).returning();
    return updated;
  }
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
    let query: any = db.select().from(integrationLogs);
    
    if (system) {
      query = query.where(eq(integrationLogs.system, system));
    }
    
    if (status) {
      query = query.where(eq(integrationLogs.status, status));
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    query = query.orderBy(desc(integrationLogs.timestamp));
    
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
    // Pull P&L from Chart of Accounts - sum all Income and Expense account balances
    // Exclude summary/rollup accounts like "Total Sales Revenue" (4100) which are meant to display the sum, not be summed themselves
    const [revenueResult, expensesResult] = await Promise.all([
      // Sum all Income type accounts except the "Total Sales Revenue" summary account
      db
        .select({ total: sql<string>`COALESCE(SUM(CAST(${financialAccounts.balance} AS NUMERIC)), 0)::text` })
        .from(financialAccounts)
        .where(and(
          eq(financialAccounts.accountType, 'Income'),
          eq(financialAccounts.isActive, true),
          // Exclude the Total Sales Revenue summary account (4100) from the sum
          sql`${financialAccounts.accountNumber} != '4100'`
        )),
      // Sum all Expense type accounts (including COGS)
      db
        .select({ total: sql<string>`COALESCE(SUM(CAST(${financialAccounts.balance} AS NUMERIC)), 0)::text` })
        .from(financialAccounts)
        .where(and(
          eq(financialAccounts.accountType, 'Expense'),
          eq(financialAccounts.isActive, true)
        ))
    ]);
    
    const revenue = revenueResult[0]?.total || "0.00";
    const expenses = expensesResult[0]?.total || "0.00";
    
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
      query = (query as any).where(and(
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
  // COGS (COST OF GOODS SOLD) CALCULATION METHODS
  // ============================================

  async calculateCOGS(startDate: string, endDate: string, locationId?: number): Promise<{
    totalRevenue: number;
    laborCosts: number;
    materialCosts: number;
    totalCOGS: number;
    grossProfit: number;
    grossMargin: number;
    salesCount: number;
    laborBreakdown: Array<{
      employeeId: string;
      employeeName: string;
      hoursWorked: number;
      hourlyRate: number;
      totalLaborCost: number;
      salesAllocated: number;
    }>;
    materialBreakdown: Array<{
      itemId: number;
      itemName: string;
      quantitySold: number;
      unitCost: number;
      totalMaterialCost: number;
    }>;
  }> {
    try {
      // Get total revenue from sales
      let salesQuery = db
        .select({
          totalRevenue: sql<string>`COALESCE(SUM(${posSales.totalAmount}), 0)::text`,
          salesCount: sql<number>`COUNT(*)::integer`
        })
        .from(posSales)
        .where(and(
          gte(posSales.saleDate, startDate),
          lte(posSales.saleDate, endDate)
        ));

      if (locationId) {
        salesQuery = (salesQuery as any).where(eq(posSales.locationId, locationId));
      }

      const salesResult = await salesQuery;
      const totalRevenue = parseFloat(salesResult[0]?.totalRevenue || '0');
      const salesCount = salesResult[0]?.salesCount || 0;

      // Calculate labor costs
      const laborCostsData = await this.calculateLaborCosts(startDate, endDate, locationId);
      const laborCosts = laborCostsData.totalLaborCost;
      
      // Calculate material costs
      const materialCostsData = await this.calculateMaterialCosts(startDate, endDate, locationId);
      const materialCosts = materialCostsData.totalMaterialCost;

      // Calculate totals
      const totalCOGS = laborCosts + materialCosts;
      const grossProfit = totalRevenue - totalCOGS;
      const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100) : 0;

      return {
        totalRevenue,
        laborCosts,
        materialCosts,
        totalCOGS,
        grossProfit,
        grossMargin,
        salesCount,
        laborBreakdown: laborCostsData.employeeBreakdown as any,
        materialBreakdown: materialCostsData.itemBreakdown as any
      };

    } catch (error) {
      console.error('Error calculating COGS:', error);
      throw new Error('Failed to calculate COGS');
    }
  }

  async calculateLaborCosts(startDate: string, endDate: string, locationId?: number): Promise<{
    totalLaborCost: number;
    totalHoursWorked: number;
    employeeBreakdown: Array<{
      employeeId: string;
      employeeName: string;
      hoursWorked: number;
      hourlyRate: number;
      totalCost: number;
      shiftsWorked: number;
    }>;
  }> {
    try {
      // Get time clock entries with employee info
      let query = db
        .select({
          userId: timeClockEntries.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          hourlyRate: users.hourlyRate,
          totalWorkedMinutes: timeClockEntries.totalWorkedMinutes,
          locationId: timeClockEntries.locationId,
          clockInTime: timeClockEntries.clockInTime
        })
        .from(timeClockEntries)
        .innerJoin(users, eq(timeClockEntries.userId, users.id))
        .where(and(
          gte(sql`DATE(${timeClockEntries.clockInTime})`, startDate),
          lte(sql`DATE(${timeClockEntries.clockInTime})`, endDate),
          eq(timeClockEntries.status, 'clocked_out'),
          isNotNull(timeClockEntries.totalWorkedMinutes)
        ));

      if (locationId) {
        query = (query as any).where(eq(timeClockEntries.locationId, locationId));
      }

      const timeEntries = await query;

      // Group by employee and calculate costs
      const employeeMap = new Map<string, {
        employeeId: string;
        employeeName: string;
        hoursWorked: number;
        hourlyRate: number;
        totalCost: number;
        shiftsWorked: number;
      }>();

      let totalLaborCost = 0;
      let totalHoursWorked = 0;

      for (const entry of timeEntries) {
        const employeeId = entry.userId;
        const employeeName = `${entry.firstName || ''} ${entry.lastName || ''}`.trim();
        const hoursWorked = (entry.totalWorkedMinutes || 0) / 60;
        const hourlyRate = parseFloat(entry.hourlyRate || '0');
        const entryCost = hoursWorked * hourlyRate;

        if (employeeMap.has(employeeId)) {
          const existing = employeeMap.get(employeeId)!;
          existing.hoursWorked += hoursWorked;
          existing.totalCost += entryCost;
          existing.shiftsWorked += 1;
        } else {
          employeeMap.set(employeeId, {
            employeeId,
            employeeName,
            hoursWorked,
            hourlyRate,
            totalCost: entryCost,
            shiftsWorked: 1
          });
        }

        totalLaborCost += entryCost;
        totalHoursWorked += hoursWorked;
      }

      const employeeBreakdown = Array.from(employeeMap.values());

      return {
        totalLaborCost,
        totalHoursWorked,
        employeeBreakdown
      };

    } catch (error) {
      console.error('Error calculating labor costs:', error);
      throw new Error('Failed to calculate labor costs');
    }
  }

  async calculateMaterialCosts(startDate: string, endDate: string, locationId?: number): Promise<{
    totalMaterialCost: number;
    totalItemsSold: number;
    itemBreakdown: Array<{
      itemId: number;
      itemName: string;
      quantitySold: number;
      unitCost: number;
      totalCost: number;
      salesCount: number;
    }>;
  }> {
    try {
      // Get sales items with inventory costs
      let query = db
        .select({
          inventoryItemId: posSaleItems.inventoryItemId,
          itemName: posSaleItems.itemName,
          quantity: posSaleItems.quantity,
          costBasis: posSaleItems.costBasis, // Actual cost for this sale item
          unitCost: inventoryItems.unitCost,
          standardCost: inventoryItems.standardCost, // Standard cost for COGS
          saleId: posSaleItems.saleId
        })
        .from(posSaleItems)
        .innerJoin(posSales, eq(posSaleItems.saleId, posSales.id))
        .leftJoin(inventoryItems, eq(posSaleItems.inventoryItemId, inventoryItems.id))
        .where(and(
          gte(posSales.saleDate, startDate),
          lte(posSales.saleDate, endDate)
        ));

      if (locationId) {
        query = (query as any).where(eq(posSales.locationId, locationId));
      }

      const saleItems = await query;

      // Group by inventory item and calculate costs
      const itemMap = new Map<number, {
        itemId: number;
        itemName: string;
        quantitySold: number;
        unitCost: number;
        totalCost: number;
        salesCount: number;
      }>();

      let totalMaterialCost = 0;
      let totalItemsSold = 0;

      for (const item of saleItems) {
        const itemId = item.inventoryItemId || 0;
        const itemName = item.itemName;
        const quantitySold = parseFloat(item.quantity || '0');
        
        // Use cost with priority: costBasis > standardCost > unitCost
        const costBasis = parseFloat(item.costBasis || '0');
        const standardCost = parseFloat(item.standardCost || '0');
        const unitCost = parseFloat(item.unitCost || '0');
        
        // Enhanced cost fallback logic - use coalesce approach from production
        const finalUnitCost = costBasis > 0 ? costBasis : (standardCost > 0 ? standardCost : unitCost);
        const itemCost = quantitySold * finalUnitCost;

        if (itemMap.has(itemId)) {
          const existing = itemMap.get(itemId)!;
          existing.quantitySold += quantitySold;
          existing.totalCost += itemCost;
          existing.salesCount += 1;
        } else {
          itemMap.set(itemId, {
            itemId,
            itemName,
            quantitySold,
            unitCost: finalUnitCost,
            totalCost: itemCost,
            salesCount: 1
          });
        }

        totalMaterialCost += itemCost;
        totalItemsSold += quantitySold;
      }

      const itemBreakdown = Array.from(itemMap.values());

      return {
        totalMaterialCost,
        totalItemsSold,
        itemBreakdown
      };

    } catch (error) {
      console.error('Error calculating material costs:', error);
      throw new Error('Failed to calculate material costs');
    }
  }

  async getCOGSByProduct(startDate: string, endDate: string, locationId?: number): Promise<Array<{
    itemId: number;
    itemName: string;
    quantitySold: number;
    totalRevenue: number;
    materialCost: number;
    laborCostAllocated: number;
    totalCOGS: number;
    grossProfit: number;
    grossMargin: number;
  }>> {
    try {
      // Get sales data by product
      let query = db
        .select({
          inventoryItemId: posSaleItems.inventoryItemId,
          itemName: posSaleItems.itemName,
          quantity: posSaleItems.quantity,
          lineTotal: posSaleItems.lineTotal,
          unitCost: inventoryItems.unitCost,
          saleDate: posSales.saleDate
        })
        .from(posSaleItems)
        .innerJoin(posSales, eq(posSaleItems.saleId, posSales.id))
        .leftJoin(inventoryItems, eq(posSaleItems.inventoryItemId, inventoryItems.id))
        .where(and(
          gte(posSales.saleDate, startDate),
          lte(posSales.saleDate, endDate)
        ));

      if (locationId) {
        query = (query as any).where(eq(posSales.locationId, locationId));
      }

      const saleItems = await query;

      // Get total labor costs to allocate proportionally
      const laborCostsData = await this.calculateLaborCosts(startDate, endDate, locationId);
      const totalLaborCost = laborCostsData.totalLaborCost;

      // Calculate total revenue for labor allocation
      const totalRevenue = saleItems.reduce((sum, item) => sum + parseFloat(item.lineTotal || '0'), 0);

      // Group by product
      const productMap = new Map<number, {
        itemId: number;
        itemName: string;
        quantitySold: number;
        totalRevenue: number;
        materialCost: number;
        laborCostAllocated: number;
        totalCOGS: number;
        grossProfit: number;
        grossMargin: number;
      }>();

      for (const item of saleItems) {
        const itemId = item.inventoryItemId || 0;
        const itemName = item.itemName;
        const quantitySold = parseFloat(item.quantity || '0');
        const itemRevenue = parseFloat(item.lineTotal || '0');
        const unitCost = parseFloat(item.unitCost || '0');
        const materialCost = quantitySold * unitCost;
        
        // Allocate labor cost based on revenue proportion
        const laborCostAllocated = totalRevenue > 0 ? (itemRevenue / totalRevenue) * totalLaborCost : 0;
        
        const totalCOGS = materialCost + laborCostAllocated;
        const grossProfit = itemRevenue - totalCOGS;
        const grossMargin = itemRevenue > 0 ? ((grossProfit / itemRevenue) * 100) : 0;

        if (productMap.has(itemId)) {
          const existing = productMap.get(itemId)!;
          existing.quantitySold += quantitySold;
          existing.totalRevenue += itemRevenue;
          existing.materialCost += materialCost;
          existing.laborCostAllocated += laborCostAllocated;
          existing.totalCOGS += totalCOGS;
          existing.grossProfit += grossProfit;
          // Recalculate margin after aggregation
          existing.grossMargin = existing.totalRevenue > 0 ? ((existing.grossProfit / existing.totalRevenue) * 100) : 0;
        } else {
          productMap.set(itemId, {
            itemId,
            itemName,
            quantitySold,
            totalRevenue: itemRevenue,
            materialCost,
            laborCostAllocated,
            totalCOGS,
            grossProfit,
            grossMargin
          });
        }
      }

      return Array.from(productMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

    } catch (error) {
      console.error('Error calculating COGS by product:', error);
      throw new Error('Failed to calculate COGS by product');
    }
  }

  async getCOGSByEmployee(startDate: string, endDate: string, locationId?: number): Promise<Array<{
    employeeId: string;
    employeeName: string;
    hoursWorked: number;
    salesGenerated: number;
    laborCost: number;
    salesAllocated: Array<{
      saleId: number;
      saleDate: string;
      totalAmount: number;
      laborCostAllocated: number;
    }>;
  }>> {
    try {
      // Get employees with time worked
      const laborData = await this.calculateLaborCosts(startDate, endDate, locationId);
      
      // Get sales data with employees (if available)
      let salesQuery = db
        .select({
          id: posSales.id,
          saleDate: posSales.saleDate,
          totalAmount: posSales.totalAmount,
          employeeId: posSales.employeeId
        })
        .from(posSales)
        .where(and(
          gte(posSales.saleDate, startDate),
          lte(posSales.saleDate, endDate)
        ));

      if (locationId) {
        salesQuery = (salesQuery as any).where(eq(posSales.locationId, locationId));
      }

      const sales = await salesQuery;
      const totalSalesRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || '0'), 0);

      const result = [];

      for (const employee of laborData.employeeBreakdown) {
        // Find sales associated with this employee
        const employeeSales = sales.filter(sale => sale.employeeId === employee.employeeId);
        const salesGenerated = employeeSales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount || '0'), 0);
        
        // Allocate labor cost to specific sales
        const salesAllocated = employeeSales.map(sale => {
          const saleRevenue = parseFloat(sale.totalAmount || '0');
          const laborCostAllocated = salesGenerated > 0 ? (saleRevenue / salesGenerated) * employee.totalCost : 0;
          
          return {
            saleId: sale.id,
            saleDate: sale.saleDate,
            totalAmount: saleRevenue,
            laborCostAllocated
          };
        });

        result.push({
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
          hoursWorked: employee.hoursWorked,
          salesGenerated,
          laborCost: employee.totalCost,
          salesAllocated
        });
      }

      return result.sort((a, b) => b.salesGenerated - a.salesGenerated);

    } catch (error) {
      console.error('Error calculating COGS by employee:', error);
      throw new Error('Failed to calculate COGS by employee');
    }
  }

  async getCOGSByLocation(startDate: string, endDate: string): Promise<Array<{
    locationId: number;
    locationName: string;
    totalRevenue: number;
    totalLaborCost: number;
    totalMaterialCost: number;
    totalCOGS: number;
    grossProfit: number;
    grossMargin: number;
    salesCount: number;
    employeeCount: number;
  }>> {
    try {
      // Get all locations
      const allLocations = await this.getAllLocations();
      const result = [];

      for (const location of allLocations) {
        // Calculate COGS for each location
        const locationCOGS = await this.calculateCOGS(startDate, endDate, location.id);
        
        // Count unique employees for this location
        const employeeCountQuery = await db
          .select({ 
            employeeCount: sql<number>`COUNT(DISTINCT ${timeClockEntries.userId})::integer`
          })
          .from(timeClockEntries)
          .where(and(
            eq(timeClockEntries.locationId, location.id),
            gte(sql`DATE(${timeClockEntries.clockInTime})`, startDate),
            lte(sql`DATE(${timeClockEntries.clockInTime})`, endDate)
          ));

        const employeeCount = employeeCountQuery[0]?.employeeCount || 0;

        result.push({
          locationId: location.id,
          locationName: location.name,
          totalRevenue: locationCOGS.totalRevenue,
          totalLaborCost: locationCOGS.laborCosts,
          totalMaterialCost: locationCOGS.materialCosts,
          totalCOGS: locationCOGS.totalCOGS,
          grossProfit: locationCOGS.grossProfit,
          grossMargin: locationCOGS.grossMargin,
          salesCount: locationCOGS.salesCount,
          employeeCount
        });
      }

      return result.sort((a, b) => b.totalRevenue - a.totalRevenue);

    } catch (error) {
      console.error('Error calculating COGS by location:', error);
      throw new Error('Failed to calculate COGS by location');
    }
  }

  async getTimeClockEntriesForPeriod(startDate: string, endDate: string, userId?: string, locationId?: number): Promise<Array<{
    id: number;
    userId: string;
    userName: string;
    locationId: number;
    clockInTime: Date;
    clockOutTime: Date | null;
    totalWorkedMinutes: number;
    hourlyRate: number;
    laborCost: number;
  }>> {
    try {
      let query = db
        .select({
          id: timeClockEntries.id,
          userId: timeClockEntries.userId,
          firstName: users.firstName,
          lastName: users.lastName,
          locationId: timeClockEntries.locationId,
          clockInTime: timeClockEntries.clockInTime,
          clockOutTime: timeClockEntries.clockOutTime,
          totalWorkedMinutes: timeClockEntries.totalWorkedMinutes,
          hourlyRate: users.hourlyRate
        })
        .from(timeClockEntries)
        .innerJoin(users, eq(timeClockEntries.userId, users.id))
        .where(and(
          gte(sql`DATE(${timeClockEntries.clockInTime})`, startDate),
          lte(sql`DATE(${timeClockEntries.clockInTime})`, endDate)
        ));

      if (userId) {
        query = (query as any).where(eq(timeClockEntries.userId, userId));
      }

      if (locationId) {
        query = (query as any).where(eq(timeClockEntries.locationId, locationId));
      }

      const entries = await query;

      return entries.map(entry => {
        const hoursWorked = (entry.totalWorkedMinutes || 0) / 60;
        const hourlyRate = parseFloat(entry.hourlyRate || '0');
        const laborCost = hoursWorked * hourlyRate;

        return {
          id: entry.id,
          userId: entry.userId,
          userName: `${entry.firstName || ''} ${entry.lastName || ''}`.trim(),
          locationId: entry.locationId || 0,
          clockInTime: entry.clockInTime,
          clockOutTime: entry.clockOutTime,
          totalWorkedMinutes: entry.totalWorkedMinutes || 0,
          hourlyRate,
          laborCost
        };
      });

    } catch (error) {
      console.error('Error getting time clock entries:', error);
      throw new Error('Failed to get time clock entries');
    }
  }

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
      return await ((query as any).where(eq(videoTemplates.category, category))).orderBy(desc(videoTemplates.createdAt));
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
      query = (query as any).where(eq(productVideos.renderStatus, status));
    }
    
    return await query.orderBy(desc(productVideos.createdAt));
  }

  async getAllProductVideos(limit?: number, offset?: number): Promise<ProductVideo[]> {
    let query: any = db.select().from(productVideos)
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

  // Helper method to calculate detailed financial metrics for an order
  async calculateOrderFinancialMetrics(order: any, locationId: number, merchantConfig?: any, normalizedTotalForDiscounts?: number, skipCogs?: boolean): Promise<{
    grossTax: number;
    totalDiscounts: number;
    giftCardTotal: number;
    totalRefunds: number;
    netCOGS: number;
    netSale: number;
    netProfit: number;
    netMargin: number;
  }> {
    try {
      // Detect if this is an Amazon order vs Clover order
      const isAmazonOrder = !!order.AmazonOrderId || order.isAmazonOrder;
      
      if (isAmazonOrder) {
        // Amazon orders have a different structure - extract financial data
        // Use the normalized 'total' field (in cents) if OrderTotal isn't available
        const orderTotal = order.OrderTotal?.Amount 
          ? parseFloat(order.OrderTotal.Amount) 
          : (order.total || 0) / 100; // Convert cents to dollars if using total field
        const orderId = order.AmazonOrderId || order.id;
        const amazonFees = order.amazonFees || 0;
        
        console.log(`💰 [AMAZON ORDER] ${orderId}: Total=$${orderTotal.toFixed(2)}, Fees=$${amazonFees.toFixed(2)}`);
        
        // Calculate COGS from line items
        let totalCOGS = 0;
        if (order.lineItems && order.lineItems.elements) {
          for (const item of order.lineItems.elements) {
            try {
              // Try to find inventory item by SKU, ASIN, or name
              let inventoryItem = null;
              
              // First try SKU lookup
              if (item.sku) {
                const skuItems = await this.getInventoryItemsBySKU(item.sku);
                if (skuItems.length > 0) {
                  inventoryItem = skuItems[0];
                  console.log(`✅ [AMAZON COGS] Found by SKU: ${item.name}`);
                }
              }
              
              // Then try ASIN lookup
              if (!inventoryItem && item.asin) {
                inventoryItem = await this.getInventoryItemByASIN(item.asin);
                if (inventoryItem) {
                  console.log(`✅ [AMAZON COGS] Found by ASIN: ${item.name}`);
                }
              }
              
              // Finally try name-based matching
              if (!inventoryItem && item.name) {
                const allInventory = await this.getAllInventoryItems();
                
                // Extract key terms from Amazon product name for matching
                const amazonName = item.name.toUpperCase();
                
                // Try exact substring match first
                inventoryItem = allInventory.find(inv => {
                  const invName = inv.itemName?.toUpperCase() || '';
                  return invName.includes('PHF') && amazonName.includes('PHF') && 
                         (amazonName.includes(invName.replace(/^PHF\s+/, '')) || 
                          invName.includes(amazonName.replace(/^.*PHF.*?,\s*/, '')));
                });
                
                // If still not found, try more flexible matching
                if (!inventoryItem) {
                  // Extract product identifiers like "L-Theanine", "Saw Palmetto", etc.
                  const productIdentifiers = ['L-THEANINE', 'THEANINE', 'SAW PALMETTO', 'PYGEUM', 
                                              'SLEEP SUPPORT', 'WELLNESS', 'OMEGA', 'VITAMIN'];
                  
                  for (const identifier of productIdentifiers) {
                    if (amazonName.includes(identifier)) {
                      inventoryItem = allInventory.find(inv => {
                        const invName = inv.itemName?.toUpperCase() || '';
                        return invName.includes(identifier);
                      });
                      if (inventoryItem) break;
                    }
                  }
                }
                
                if (inventoryItem) {
                  console.log(`✅ [AMAZON COGS] Found by name match: "${item.name}" → "${inventoryItem.itemName}"`);
                }
              }
              
              if (inventoryItem) {
                const unitCost = parseFloat(inventoryItem.unitCost || '0');
                const quantity = item.quantity || 1;
                const itemCOGS = unitCost * quantity;
                totalCOGS += itemCOGS;
                console.log(`💰 [AMAZON COGS] ${item.name}: $${unitCost} × ${quantity} = $${itemCOGS.toFixed(2)}`);
              } else {
                // Fallback to 60% estimation if no inventory item found
                const itemPrice = (item.price || 0) / 100; // Convert from cents
                const estimatedCOGS = itemPrice * 0.6;
                totalCOGS += estimatedCOGS;
                console.log(`❌ [AMAZON COGS] ${item.name}: No match found, estimated at 60% = $${estimatedCOGS.toFixed(2)}`);
              }
            } catch (error) {
              console.error(`Error calculating COGS for item ${item.name}:`, error);
            }
          }
        }
        
        // Calculate net profit: Revenue - COGS - Amazon Fees
        const netSale = orderTotal;
        const netProfit = netSale - totalCOGS - amazonFees;
        const netMargin = netSale > 0 ? (netProfit / netSale) * 100 : 0;
        
        console.log(`💰 [AMAZON FINANCIALS] ${orderId}: Revenue=$${netSale.toFixed(2)}, COGS=$${totalCOGS.toFixed(2)}, Fees=$${amazonFees.toFixed(2)}, Profit=$${netProfit.toFixed(2)}, Margin=${netMargin.toFixed(2)}%`);
        
        return {
          grossTax: 0, // Amazon doesn't separate tax in the Orders API
          totalDiscounts: 0, // Amazon doesn't provide discount details in Orders API
          giftCardTotal: 0,
          totalRefunds: 0, // Would need separate Refunds API call
          netCOGS: totalCOGS,
          netSale: netSale,
          netProfit: netProfit,
          netMargin: netMargin
        };
      }
      
      // CLOVER ORDER PROCESSING BELOW
      // SPECIFIC ORDER DEBUGGING - Track problematic orders
      const problematicOrders = ['NMXJ9X9KQX16Y', '144M3D8KYBZRY', 'NS8NSG9CNXEEJ'];
      const isProblematicOrder = problematicOrders.includes(order.id);
      
      if (isProblematicOrder) {
        console.log(`\n========================================`);
        // Disabled for performance: console.log(`[PROBLEMATIC ORDER DEBUG] ${order.id}`);
        console.log(`========================================`);
        console.log(`Full Order Data:`, JSON.stringify(order, null, 2));
      }
      
      // Parse order total (Clover amounts are in cents)
      const orderTotal = parseFloat(order.total || '0') / 100;
      
      // IMPROVED TAX CALCULATION: Handle missing or null tax amounts
      let grossTax = 0;
      if (order.taxAmount !== null && order.taxAmount !== undefined && order.taxAmount !== '') {
        grossTax = parseFloat(order.taxAmount) / 100;
      } else if (order.tax !== null && order.tax !== undefined && order.tax !== '') {
        // Fallback: some orders might use 'tax' instead of 'taxAmount'
        grossTax = parseFloat(order.tax) / 100;
      } else {
        // Final fallback: check if we can calculate tax from payments
        if (order.payments && order.payments.elements) {
          const taxFromPayments = order.payments.elements.reduce((sum: number, payment: any) => {
            const taxAmount = parseFloat(payment.taxAmount || '0');
            return sum + taxAmount;
          }, 0) / 100;
          grossTax = taxFromPayments;
        }
      }
      
      // Log tax calculation details for debugging
      if (isProblematicOrder || grossTax === 0) {
        // Disabled for performance: console.log(`[TAX DEBUG] Order ${order.id} Tax Calculation:`, {
        //   rawTaxAmount: order.taxAmount,
        //   rawTax: order.tax,
        //   calculatedGrossTax: grossTax,
        //   hasPayments: !!(order.payments && order.payments.elements),
        //   taxCalculationMethod: order.taxAmount ? 'taxAmount' : order.tax ? 'tax' : grossTax > 0 ? 'payments' : 'none'
        // });
      }
      
      // DEBUG: Log raw order data
      // Disabled for performance: console.log(`[FINANCIAL CALC DEBUG] Order ${order.id} Raw Data:`, {
      //   rawTotal: order.total,
      //   rawTaxAmount: order.taxAmount,
      //   orderTotal,
      //   grossTax,
      //   discountsCount: order.discounts?.elements?.length || 0,
      //   refundsCount: order.refunds?.elements?.length || 0,
      //   lineItemsCount: order.lineItems?.elements?.length || 0
      // });
      
      if (isProblematicOrder) {
        console.log(`[PROBLEMATIC ORDER] ${order.id} - Order Total Conversion:`, {
          rawTotal: order.total,
          dividedBy100: parseFloat(order.total || '0') / 100,
          finalOrderTotal: orderTotal
        });
        console.log(`[PROBLEMATIC ORDER] ${order.id} - Tax Conversion:`, {
          rawTaxAmount: order.taxAmount,
          dividedBy100: parseFloat(order.taxAmount || '0') / 100,
          finalGrossTax: grossTax
        });
      }
      
      // ============================================
      // SIMPLIFIED DISCOUNT TRACKING FOR DISPLAY
      // ============================================
      // We still calculate discounts to show users what was applied,
      // but we use a simpler approach for net sale: Order Total - Tax
      let totalDiscounts = 0;
      
      // Calculate subtotal from line items (only needed for percentage discount calculation)
      let subtotalBeforeDiscounts = 0;
      if (order.lineItems && order.lineItems.elements) {
        subtotalBeforeDiscounts = order.lineItems.elements.reduce((sum: number, lineItem: any) => {
          if (lineItem.refund || lineItem.exchanged || lineItem.voided) {
            return sum;
          }
          const price = parseFloat(lineItem.price || '0') / 100;
          const quantity = parseInt(lineItem.unitQty || lineItem.quantity || '1');
          return sum + (price * quantity);
        }, 0);
      }
      
      // Track gift card items separately (they're not discounts, just complimentary items)
      let giftCardTotal = 0;
      
      // ============================================
      // 🚨 DISCOUNT CALCULATION FOR DISPLAY ONLY 🚨
      // ============================================
      // We extract discount details from Clover's API to show users what discounts were applied.
      // However, for financial calculations, we use the simpler approach:
      // Net Sale = Order Total - Tax - Refunds
      //
      // This discount extraction is purely for transparency/reporting.
      // ============================================
      
      // ✅ ALWAYS prefer Clover's actual discount objects (already expanded in order fetch)
      // Check BOTH order-level discounts AND line-item level discounts
      let hasOrderLevelDiscounts = order.discounts && order.discounts.elements && order.discounts.elements.length > 0;
      let hasLineItemDiscounts = false;
      let lineItemDiscountTotal = 0;
      
      // First, check for line-item level discounts
      if (order.lineItems && order.lineItems.elements) {
        order.lineItems.elements.forEach((lineItem: any) => {
          if (lineItem.discounts && lineItem.discounts.elements && lineItem.discounts.elements.length > 0) {
            hasLineItemDiscounts = true;
            lineItem.discounts.elements.forEach((discount: any) => {
              let discountAmount = 0;
              
              if (discount.amount && typeof discount.amount === 'number' && discount.amount !== 0) {
                // Fixed amount: already in cents, just convert to dollars (no extra rounding needed)
                discountAmount = Math.abs(discount.amount / 100);
                console.log(`  [LINE-ITEM DISCOUNT] ${lineItem.name}: ${discount.name || 'Unnamed'} = ${discount.amount} cents = $${discountAmount.toFixed(2)}`);
              } else if (discount.percentage && typeof discount.percentage === 'number') {
                // Percentage: CRITICAL - Round immediately after calculation to match Clover
                const lineItemPrice = parseFloat(lineItem.price || '0') / 100;
                const rawDiscount = (lineItemPrice * discount.percentage) / 100;
                discountAmount = Math.round(rawDiscount * 100) / 100; // Round to nearest cent immediately
                console.log(`  [LINE-ITEM DISCOUNT] ${lineItem.name}: ${discount.name || 'Unnamed'} = ${discount.percentage}% of $${lineItemPrice.toFixed(2)} = $${discountAmount.toFixed(2)}`);
              }
              
              lineItemDiscountTotal += discountAmount;
            });
          }
        });
      }
      
      if (hasOrderLevelDiscounts || hasLineItemDiscounts) {
        // Use Clover's actual discount objects
        let orderLevelTotal = 0;
        
        if (hasOrderLevelDiscounts) {
          console.log(`✅ [CLOVER DISCOUNT] Found ${order.discounts.elements.length} order-level discount objects for order ${order.id}`);
          
          orderLevelTotal = order.discounts.elements.reduce((sum: number, discount: any) => {
            let discountAmount = 0;
            
            // CRITICAL FIX: Always use Clover's provided amount field if available
            if (discount.amount && typeof discount.amount === 'number' && discount.amount !== 0) {
              // Fixed amount: already in cents, just convert to dollars (no extra rounding needed)
              discountAmount = Math.abs(discount.amount / 100);
              console.log(`  [ORDER DISCOUNT] ${discount.name || 'Unnamed'}: ${discount.amount} cents = $${discountAmount.toFixed(2)}`);
            } else if (discount.percentage && typeof discount.percentage === 'number') {
              // CRITICAL: Calculate percentage from SUBTOTAL before discount, not order total (which is after discount)
              // This avoids circular calculation: 20% of $5.50 subtotal = $1.10, NOT 20% of $4.64 order total = $0.93
              // ALSO CRITICAL: Round immediately after calculation to match Clover's rounding behavior
              const rawDiscount = (subtotalBeforeDiscounts * discount.percentage) / 100;
              discountAmount = Math.round(rawDiscount * 100) / 100; // Round to nearest cent immediately
              console.log(`  [ORDER DISCOUNT] ${discount.name || 'Unnamed'}: ${discount.percentage}% of $${subtotalBeforeDiscounts.toFixed(2)} subtotal = $${discountAmount.toFixed(2)}`);
            } else {
              // Last resort: try other amount fields
              const rawAmount = discount.value || discount.discount || discount.discountAmount || '0';
              discountAmount = Math.abs(parseFloat(rawAmount) / 100);
              console.log(`  [ORDER DISCOUNT] ${discount.name || 'Unnamed'}: fallback ${rawAmount} cents = $${discountAmount.toFixed(2)}`);
            }
            
            return sum + discountAmount;
          }, 0);
        }
        
        if (hasLineItemDiscounts) {
          console.log(`✅ [CLOVER DISCOUNT] Found line-item discounts totaling $${lineItemDiscountTotal.toFixed(2)} for order ${order.id}`);
        }
        
        totalDiscounts = orderLevelTotal + lineItemDiscountTotal;
        console.log(`💰 [CLOVER DISCOUNT] Order ${order.id} total Clover discounts: $${totalDiscounts.toFixed(2)} (order-level: $${orderLevelTotal.toFixed(2)}, line-item: $${lineItemDiscountTotal.toFixed(2)})`);
      } else {
        // No discounts at all
        totalDiscounts = 0;
      }
      
      // No final rounding needed - each discount was already rounded individually to match Clover

      // Calculate refunds (from refunds or payments with negative amounts)
      let totalRefunds = 0;
      if (order.refunds && order.refunds.elements) {
        // DEBUG: Log raw refund data
        order.refunds.elements.forEach((refund: any, index: number) => {
          console.log(`[REFUND DEBUG] Order ${order.id} Refund ${index}:`, {
            rawAmount: refund.amount,
            parsedAmount: parseFloat(refund.amount || '0') / 100,
            absAmount: Math.abs(parseFloat(refund.amount || '0') / 100)
          });
        });
        
        totalRefunds = order.refunds.elements.reduce((sum: number, refund: any) => {
          const refundAmount = Math.abs(parseFloat(refund.amount || '0') / 100);
          return sum + refundAmount;
        }, 0);
      }

      // Also check for refund payments
      if (order.payments && order.payments.elements) {
        order.payments.elements.forEach((payment: any, index: number) => {
          const paymentAmount = parseFloat(payment.amount || '0');
          if (payment.result === 'SUCCESS' && paymentAmount < 0) {
            const refundAmount = Math.abs(paymentAmount / 100);
            console.log(`[PAYMENT REFUND DEBUG] Order ${order.id} Payment ${index}:`, {
              rawAmount: payment.amount,
              parsedAmount: paymentAmount,
              refundAmount
            });
            totalRefunds += refundAmount;
          }
        });
      }

      // Calculate COGS by looking up actual costs for line items (skip if requested for performance)
      let netCOGS = 0;
      let cachedInventory: any[] | null = null; // Cache inventory for fuzzy matching
      if (!skipCogs && order.lineItems && order.lineItems.elements) {
        // Disabled for performance: console.log(`[COGS DEBUG] Order ${order.id} Processing ${order.lineItems.elements.length} line items`);
        
        for (const [index, lineItem] of order.lineItems.elements.entries()) {
          // CRITICAL FIX: Clover quantities appear to be stored 1000x too high
          let quantity = lineItem.unitQty || 1;
          
          // Add intelligent unit conversion - if quantity > 100, divide by 1000
          if (quantity > 100) {
            // Disabled for performance: console.log(`[QUANTITY FIX] Order ${order.id} Line Item ${index}: Converting quantity ${quantity} to ${quantity / 1000}`);
            if (isProblematicOrder) {
              console.log(`[PROBLEMATIC ORDER] ${order.id} - CRITICAL QUANTITY FIX Line Item ${index}:`, {
                originalQuantity: quantity,
                convertedQuantity: quantity / 1000,
                itemName: lineItem.name || lineItem.item?.name,
                itemId: lineItem.item?.id || lineItem.id
              });
            }
            quantity = quantity / 1000;
          }
          
          const lineItemPrice = parseFloat(lineItem.price || '0') / 100; // Convert from cents to dollars
          
          // Disabled for performance: console.log(`[COGS DEBUG] Line Item ${index}:`, {
          //   itemId: lineItem.item?.id || lineItem.id,
          //   itemName: lineItem.name || lineItem.item?.name,
          //   rawPrice: lineItem.price,
          //   lineItemPrice,
          //   rawQuantity: lineItem.unitQty,
          //   adjustedQuantity: quantity
          // });
          
          if (isProblematicOrder) {
            console.log(`[PROBLEMATIC ORDER] ${order.id} - Line Item ${index} Details:`, {
              itemId: lineItem.item?.id || lineItem.id,
              itemName: lineItem.name || lineItem.item?.name,
              rawPrice: lineItem.price,
              priceInDollars: lineItemPrice,
              rawQuantity: lineItem.unitQty,
              finalQuantity: quantity,
              quantityWasConverted: lineItem.unitQty > 100
            });
          }
          
          // Try to find inventory item by SKU/item ID to get actual cost using cached lookup
          try {
            // For Amazon orders, try different SKU mappings
            let inventoryItems: any[] = [];
            const itemId = lineItem.item?.id || lineItem.id || lineItem.SellerSKU || lineItem.ASIN;
            
            if (itemId) {
              inventoryItems = await this.getInventoryItemsBySKU(itemId);
              
              // If not found and this is an Amazon order, try alternative mappings
              if (inventoryItems.length === 0 && order.isAmazonOrder) {
                // Try ASIN lookup
                if (lineItem.ASIN) {
                  const asinItems = await this.getInventoryItemsBySKU(lineItem.ASIN);
                  if (asinItems.length > 0) inventoryItems = asinItems;
                }
                // Try SellerSKU lookup  
                if (inventoryItems.length === 0 && lineItem.SellerSKU) {
                  const skuItems = await this.getInventoryItemsBySKU(lineItem.SellerSKU);
                  if (skuItems.length > 0) inventoryItems = skuItems;
                }
              }
            }
            
            // If no SKU match found, try fuzzy name matching for Clover items
            if (inventoryItems.length === 0 && (lineItem.name || lineItem.item?.name)) {
              const lineItemName = lineItem.name || lineItem.item?.name || '';
              
              // Use cached inventory if available, otherwise fetch once
              if (!cachedInventory) {
                cachedInventory = await this.getAllInventoryItems();
              }
              
              // Enhanced normalization for better matching
              const normalizeName = (name: string) => name.toUpperCase()
                .replace(/&/g, 'AND')
                .replace(/GRASS FED.*?PASTURE RAISED/gi, 'GFPR')
                .replace(/\bOZ\b/g, 'OUNCE')
                .replace(/\bG\b/g, 'GRAM')
                .replace(/\bLB\b/g, 'POUND')
                .replace(/[^A-Z0-9]/g, '')
                .trim();
              
              // Calculate Levenshtein distance for similarity scoring
              const levenshtein = (a: string, b: string): number => {
                const matrix: number[][] = [];
                for (let i = 0; i <= b.length; i++) matrix[i] = [i];
                for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
                for (let i = 1; i <= b.length; i++) {
                  for (let j = 1; j <= a.length; j++) {
                    matrix[i][j] = b.charAt(i-1) === a.charAt(j-1) 
                      ? matrix[i-1][j-1]
                      : Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
                  }
                }
                return matrix[b.length][a.length];
              };
              
              const normalizedLineItemName = normalizeName(lineItemName);
              
              // Score all inventory items
              const scoredMatches = cachedInventory.map(inv => {
                const normalizedInvName = normalizeName(inv.itemName || '');
                const distance = levenshtein(normalizedLineItemName, normalizedInvName);
                const maxLen = Math.max(normalizedLineItemName.length, normalizedInvName.length);
                const similarity = maxLen > 0 ? ((maxLen - distance) / maxLen) * 100 : 0;
                
                return { item: inv, similarity, distance };
              });
              
              // Sort by similarity (highest first)
              scoredMatches.sort((a, b) => b.similarity - a.similarity);
              
              // Use best match if similarity >= 70% (confidence threshold)
              const bestMatch = scoredMatches[0];
              if (bestMatch && bestMatch.similarity >= 70) {
                inventoryItems = [bestMatch.item];
                console.log(`✅ [FUZZY MATCH ${bestMatch.similarity.toFixed(0)}%] "${lineItemName}" → "${bestMatch.item.itemName}"`);
              } else if (bestMatch) {
                console.log(`⚠️ [LOW CONFIDENCE ${bestMatch.similarity.toFixed(0)}%] "${lineItemName}" closest: "${bestMatch.item.itemName}" (rejected, using fallback)`);
              }
            }
            
            if (inventoryItems.length > 0) {
              const inventoryItem = inventoryItems[0];
              const rawUnitCost = inventoryItem.unitCost || '0';
              let unitCost = parseFloat(rawUnitCost);
              
              // CRITICAL FIX: Check if unit cost seems to be in cents (> $100) and convert
              if (unitCost > 100) {
                // Disabled for performance: console.log(`[COGS DEBUG] Unit cost ${unitCost} seems to be in cents, converting to dollars`);
                unitCost = unitCost / 100;
              }
              
              const itemCOGS = unitCost * quantity;
              netCOGS += itemCOGS;
              
              // Disabled for performance: console.log(`[COGS DEBUG] Found inventory item:`, {
              //   rawUnitCost,
              //   adjustedUnitCost: unitCost,
              //   quantity,
              //   itemCOGS,
              //   runningNetCOGS: netCOGS
              // });
            } else {
              // Fallback: estimate COGS as 60% of line item price if no inventory record found
              const fallbackCOGS = lineItemPrice * 0.6 * quantity;
              netCOGS += fallbackCOGS;
              
              console.log(`⚠️ [COGS FALLBACK] "${lineItem.name || lineItem.item?.name}": No match found, estimated at 60% = $${fallbackCOGS.toFixed(2)}`);
            }
          } catch (error) {
            // Fallback for items not in inventory
            const fallbackCOGS = lineItemPrice * 0.6 * quantity;
            netCOGS += fallbackCOGS;
          }
        }
      }

      // SIMPLIFIED CALCULATION:
      // Net Sale = Order Total - Tax - Refunds
      // Net Profit = Net Sale - COGS
      // Margin = Net Profit / Net Sale
      
      const netSale = orderTotal - grossTax - totalRefunds; // Net revenue (actual payment minus tax and refunds)
      
      // Calculate net profit (net sale - COGS)
      const netProfit = netSale - netCOGS;
      
      // Calculate net margin (net profit / net sale * 100), handle division by zero
      const netMargin = netSale > 0 ? (netProfit / netSale) * 100 : 0;

      // DEBUG: Log final calculations
      // Disabled for performance: console.log(`[FINANCIAL CALC DEBUG] Order ${order.id} Final Results:`, {
      //   orderTotal,
      //   grossTax,
      //   totalDiscounts,
      //   totalRefunds,
      //   netCOGS,
      //   netSale,
      //   netProfit,
      //   netMargin: `${netMargin.toFixed(2)}%`,
      //   calculationBreakdown: {
      //     formula: 'netSale = orderTotal - grossTax - totalDiscounts - totalRefunds',
      //     calculation: `${netSale.toFixed(2)} = ${orderTotal.toFixed(2)} - ${grossTax.toFixed(2)} - ${totalDiscounts.toFixed(2)} - ${totalRefunds.toFixed(2)}`,
      //     profitFormula: 'netProfit = netSale - netCOGS',
      //     profitCalculation: `${netProfit.toFixed(2)} = ${netSale.toFixed(2)} - ${netCOGS.toFixed(2)}`
      //   }
      // });

      if (isProblematicOrder) {
        console.log(`\n[PROBLEMATIC ORDER] ${order.id} - FINAL CALCULATION SUMMARY:`);
        console.log(`========================================================`);
        console.log(`Order Total: $${orderTotal.toFixed(2)} (from raw: ${order.total})`);
        console.log(`Gross Tax: $${grossTax.toFixed(2)} (from raw: ${order.taxAmount})`);
        console.log(`Total Discounts: $${totalDiscounts.toFixed(2)}`);
        console.log(`Total Refunds: $${totalRefunds.toFixed(2)}`);
        console.log(`Net COGS: $${netCOGS.toFixed(2)}`);
        console.log(`Net Sale: $${netSale.toFixed(2)} = $${orderTotal.toFixed(2)} - $${grossTax.toFixed(2)} - $${totalDiscounts.toFixed(2)} - $${totalRefunds.toFixed(2)}`);
        console.log(`Net Profit: $${netProfit.toFixed(2)} = $${netSale.toFixed(2)} - $${netCOGS.toFixed(2)}`);
        console.log(`Net Margin: ${netMargin.toFixed(2)}%`);
        console.log(`========================================================\n`);
      }

      return {
        grossTax,
        totalDiscounts,
        giftCardTotal,
        totalRefunds,
        netCOGS,
        netSale,
        netProfit,
        netMargin
      };
    } catch (error) {
      console.error('Error calculating financial metrics for order:', order.id, error);
      return {
        grossTax: 0,
        totalDiscounts: 0,
        giftCardTotal: 0,
        totalRefunds: 0,
        netCOGS: 0,
        netSale: 0,
        netProfit: 0,
        netMargin: 0
      };
    }
  }

  // NEW: Fetch orders directly from Clover API
  async getOrdersFromCloverAPI(filters: {
    createdTimeMin?: number;    // NEW: Direct epoch milliseconds
    createdTimeMax?: number;    // NEW: Direct epoch milliseconds  
    startDate?: string;         // Legacy fallback
    endDate?: string;           // Legacy fallback
    locationId?: number | string;
    search?: string;
    state?: string;
    paymentState?: string;
    hasDiscounts?: string;
    hasRefunds?: string;
    limit: number;
    offset: number;
    skipFinancialCalculations?: boolean;
    skipCogs?: boolean; // NEW: Skip expensive COGS fuzzy matching
  }): Promise<{
    orders: any[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      // 🚀 CACHING: Parse and normalize timestamps for cache logic
      // Parse createdTimeMin/Max to epoch milliseconds for proper date calculations
      let createdTimeMaxMs: number | null = null;
      if (filters.createdTimeMax) {
        if (typeof filters.createdTimeMax === 'number') {
          createdTimeMaxMs = filters.createdTimeMax;
        } else if (typeof filters.createdTimeMax === 'string') {
          // Check if it's a pure numeric string (epoch ms) or an ISO date
          if (/^\d+$/.test(filters.createdTimeMax)) {
            // Pure digits - parse as epoch milliseconds
            createdTimeMaxMs = parseInt(filters.createdTimeMax, 10);
          } else {
            // ISO date string or other format - use Date constructor
            const dateMs = new Date(filters.createdTimeMax).getTime();
            createdTimeMaxMs = isNaN(dateMs) ? null : dateMs;
          }
        }
      }
      
      // Normalize all filter values for consistent cache keys
      const normalizedFilters = {
        createdTimeMin: filters.createdTimeMin?.toString() || '',
        createdTimeMax: filters.createdTimeMax?.toString() || '',
        startDate: filters.startDate || '',
        endDate: filters.endDate || '',
        locationId: filters.locationId?.toString() || '',
        search: filters.search || '',
        state: filters.state || '',
        paymentState: filters.paymentState || '',
        hasDiscounts: filters.hasDiscounts || '',
        hasRefunds: filters.hasRefunds || '',
        limit: filters.limit.toString(),
        offset: filters.offset.toString(),
        skipFinancialCalculations: filters.skipFinancialCalculations?.toString() || 'false',
        skipCogs: filters.skipCogs?.toString() || 'false'
      };
      
      const cacheKey = ordersCache.generateKey('orders', normalizedFilters);
      
      // Bypass cache for very recent data (today) to ensure real-time accuracy
      const now = Date.now();
      const isToday = createdTimeMaxMs !== null && 
        !isNaN(createdTimeMaxMs) &&
        (now - createdTimeMaxMs) < (24 * 60 * 60 * 1000);
      
      if (!isToday) {
        // Try to get from cache for older data
        const cachedResult = ordersCache.get<{ orders: any[]; total: number; hasMore: boolean }>(cacheKey);
        if (cachedResult) {
          console.log(`🚀 [CACHE HIT] Returning ${cachedResult.orders.length} cached orders`);
          return cachedResult;
        }
        console.log(`🔍 [CACHE MISS] No cached data found, fetching from Clover API`);
      } else {
        console.log(`⚡ [CACHE BYPASS] Querying today's data (age: ${Math.round((now - createdTimeMaxMs!) / (1000 * 60))} min) - bypassing cache for real-time accuracy`);
      }
      
      const { CloverIntegration } = await import('./integrations/clover');
      const allOrders: any[] = [];
      
      // Get all Clover configurations
      const cloverConfigs = await this.getAllCloverConfigs();
      
      for (const config of cloverConfigs) {
        // Skip if locationId filter doesn't match
        if (filters.locationId && filters.locationId !== 'all' && config.id?.toString() !== filters.locationId.toString()) {
          continue;
        }
        
        // 🔧 DEBUG: Log configuration mapping for problematic merchants
        console.log(`🔧 [LOCATION MAPPING] Config ID: ${config.id}, Merchant ID: ${config.merchantId}, Merchant Name: "${config.merchantName}"`);
        
        // Map database fields to CloverConfig interface
        if (!config.apiToken) {
          console.error(`⚠️ Missing API token for merchant ${config.merchantId}`);
          continue;
        }
        
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
            limit: filters.limit <= 50 ? 1000 : Math.min(filters.limit || 50, 1000), // Use high limit for comprehensive fetching
            offset: filters.offset || 0,
            expand: 'lineItems,lineItems.discounts,lineItems.modifications,payments,payments.employee,discounts,refunds,employee,customers,serviceCharge',
            orderBy: 'modifiedTime DESC'
          };
          
          // Add date filter - prioritize epoch milliseconds for precise timezone-aware filtering
          if (filters.createdTimeMin && filters.createdTimeMax) {
            // Use precise epoch milliseconds (already timezone-adjusted from frontend)
            options.createdTimeMin = filters.createdTimeMin;
            options.createdTimeMax = filters.createdTimeMax;
            console.log('🌍 [STORAGE] Using precise epoch filtering:', {
              createdTimeMin: options.createdTimeMin,
              createdTimeMax: options.createdTimeMax,
              startUTC: new Date(options.createdTimeMin).toISOString(),
              endUTC: new Date(options.createdTimeMax).toISOString()
            });
          } else if (filters.startDate && filters.endDate) {
            // Fallback to legacy date string conversion
            const startOfDay = new Date(filters.startDate + 'T00:00:00.000Z');
            const endOfDay = new Date(filters.endDate + 'T23:59:59.999Z');
            options.createdTimeMin = startOfDay.getTime();
            options.createdTimeMax = endOfDay.getTime();
            console.log('📅 [STORAGE] Using legacy date conversion:', {
              startDate: filters.startDate,
              endDate: filters.endDate,
              createdTimeMin: options.createdTimeMin,
              createdTimeMax: options.createdTimeMax
            });
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
            
            // 🚀 PERFORMANCE FIX: Apply date filtering BEFORE expensive processing
            let ordersToProcess: any[] = response.elements;
            
            // Filter out test orders (Clover Sales Reports exclude test orders)
            ordersToProcess = ordersToProcess.filter((order: any) => !(order as any).testMode);
            if (response.elements.length !== ordersToProcess.length) {
              console.log(`🧪 TEST ORDER FILTER: Excluded ${response.elements.length - ordersToProcess.length} test orders from ${config.merchantName}`);
            }
            
            if (options.createdTimeMin || options.createdTimeMax) {
              ordersToProcess = ordersToProcess.filter(order => {
                const orderCreatedTime = order.createdTime;
                if (!orderCreatedTime) return false;
                
                const orderTime = parseInt(orderCreatedTime.toString());
                
                if (options.createdTimeMin && orderTime < options.createdTimeMin) {
                  return false;
                }
                
                if (options.createdTimeMax && orderTime > options.createdTimeMax) {
                  return false;
                }
                
                return true;
              });
              
              console.log(`⚡ EARLY FILTER: Reduced from ${response.elements.length} to ${ordersToProcess.length} orders for ${config.merchantName}`);
            }
            
            // Apply additional column filters
            if (filters.paymentState && filters.paymentState !== 'all') {
              ordersToProcess = ordersToProcess.filter(order => order.paymentState === filters.paymentState);
              console.log(`🔍 PAYMENT STATE FILTER: Filtered to ${ordersToProcess.length} orders with paymentState=${filters.paymentState}`);
            }
            
            if (filters.hasDiscounts && filters.hasDiscounts !== 'all') {
              ordersToProcess = ordersToProcess.filter(order => {
                // Check both order-level and line-item level discounts
                const hasOrderDiscounts = (order.discounts?.elements?.length || 0) > 0;
                const hasLineItemDiscounts = order.lineItems?.elements?.some((item: any) => 
                  (item.discounts?.elements?.length || 0) > 0
                ) || false;
                const hasDiscounts = hasOrderDiscounts || hasLineItemDiscounts;
                return filters.hasDiscounts === 'yes' ? hasDiscounts : !hasDiscounts;
              });
              console.log(`🔍 DISCOUNTS FILTER: Filtered to ${ordersToProcess.length} orders with discounts=${filters.hasDiscounts}`);
            }
            
            if (filters.hasRefunds && filters.hasRefunds !== 'all') {
              ordersToProcess = ordersToProcess.filter(order => {
                const hasRefunds = (order.refunds?.elements?.length || 0) > 0;
                return filters.hasRefunds === 'yes' ? hasRefunds : !hasRefunds;
              });
              console.log(`🔍 REFUNDS FILTER: Filtered to ${ordersToProcess.length} orders with refunds=${filters.hasRefunds}`);
            }
            
            // Debug: Check the dates of filtered orders
            if (ordersToProcess.length > 0) {
              const firstOrder = ordersToProcess[0];
              const lastOrder = ordersToProcess[ordersToProcess.length - 1];
              console.log(`First order created: ${new Date(firstOrder.createdTime).toISOString()}`);
              console.log(`Last order created: ${new Date(lastOrder.createdTime).toISOString()}`);
              if (options.createdTimeMin && options.createdTimeMax) {
                console.log(`Expected range: ${new Date(options.createdTimeMin).toISOString()} to ${new Date(options.createdTimeMax).toISOString()}`);
              }
            }
            
            // Enhance ONLY filtered orders with financial calculations
            const enhancedOrders = [];
            for (const order of ordersToProcess) {
              // 🔧 DEBUG: Track specific problematic orders
              const isProblematicOrder = ['NS8NSG9CNXEEJ', '48GWSVFSYPDN4'].includes(order.id);
              if (isProblematicOrder) {
                console.log(`🔧 [PROBLEMATIC ORDER] ${order.id} - Assigning location:`, {
                  configId: config.id,
                  merchantId: config.merchantId,
                  merchantName: config.merchantName,
                  originalLocationName: order.locationName || 'none'
                });
              }
              
              try {
                // TEMPORARILY SIMPLIFIED: Skip expensive COGS calculations for faster loading
                // Frontend expects order.total in CENTS, but grossTax and other financial metrics in DOLLARS
                let orderTotalInDollars = parseFloat(order.total || '0') / 100;
                const originalOrderTotal = orderTotalInDollars; // Save original Clover total for revenue calculations
                let normalizedTotalForDiscounts: number | undefined = undefined; // Only set for 100% comp orders
                
                // ✅ PROPER CLOVER TOTAL NORMALIZATION: Handle both payment shapes from Clover API
                // BUT: Keep original order.total for revenue - only use normalized for discount calculations
                if (orderTotalInDollars === 0 && (order.lineItems?.elements?.length > 0 || order.payments)) {
                  let normalizedTotal = 0;
                  
                  // Normalize payments/refunds to handle both Clover API shapes
                  const payments = Array.isArray(order.payments) ? order.payments : (order.payments?.elements ?? []);
                  const refunds = Array.isArray(order.refunds) ? order.refunds : (order.refunds?.elements ?? []);
                  const lineItems = order.lineItems?.elements || [];
                  
                  // Check if payments have valid amounts
                  const paymentSum = payments.filter((p: any) => p.result === 'SUCCESS').reduce((sum: any, p: any) => sum + (parseFloat(p.amount || '0') / 100), 0);
                  console.log(`🔧 [PAYMENT ANALYSIS] Order ${order.id}: Payment sum = $${paymentSum.toFixed(2)}`);
                  
                  // Method 1: Use payment data if payments have valid amounts > 0
                  if (payments.length > 0 && paymentSum > 0) {
                    console.log(`🔧 [PAYMENT METHOD] Order ${order.id}: Using payment data (sum = $${paymentSum.toFixed(2)})`);
                    normalizedTotal = paymentSum;
                    
                    // Subtract any refunds
                    if (refunds.length > 0) {
                      for (const refund of refunds) {
                        const refundAmount = parseFloat(refund.amount || '0') / 100;
                        normalizedTotal -= refundAmount;
                      }
                    }
                  } 
                  // Method 2: Fallback to line items when payments are zero or missing
                  else if (lineItems.length > 0) {
                    console.log(`🔧 [LINEITEM FALLBACK] Order ${order.id}: Payments are zero/missing, calculating from ${lineItems.length} line items`);
                    for (const lineItem of lineItems) {
                      const lineItemPrice = parseFloat(lineItem.price || '0') / 100;
                      const quantity = parseInt(lineItem.unitQty || '1');
                      const lineTotal = lineItemPrice * quantity;
                      normalizedTotal += lineTotal;
                    }
                  } 
                  // Method 3: Last resort - use Clover's reported total if > 0
                  else {
                    const cloverTotal = parseFloat(order.total || '0') / 100;
                    if (cloverTotal > 0) {
                      normalizedTotal = cloverTotal;
                      console.log(`🔧 [CLOVER FALLBACK] Order ${order.id}: Using Clover's reported total: $${cloverTotal.toFixed(2)}`);
                    } else {
                      console.log(`🔧 [NO DATA] Order ${order.id}: No payment, lineItem, or total data available`);
                    }
                  }
                  
                  normalizedTotalForDiscounts = normalizedTotal;
                  console.log(`🔧 [CLOVER TOTAL NORMALIZATION] Order ${order.id}: Normalized total for discount calc: $${normalizedTotal.toFixed(2)}, keeping original total $${originalOrderTotal.toFixed(2)} for revenue`);
                  
                  // ✅ CRITICAL FIX: DO NOT overwrite order.total - keep Clover's original $0 for revenue reporting
                  // Only use normalizedTotalForDiscounts internally for discount calculations
                }
                
                // Calculate tax properly (send as dollars to match frontend expectation)
                let grossTax = 0;
                if (order.taxAmount !== null && order.taxAmount !== undefined && order.taxAmount !== '') {
                  grossTax = parseFloat(order.taxAmount) / 100;
                } else if ((order as any).tax !== null && (order as any).tax !== undefined && (order as any).tax !== '') {
                  grossTax = parseFloat((order as any).tax) / 100;
                }
                
                // Calculate actual financial metrics for this order (skip if requested for performance)
                let enhancedOrder;
                
                // Extract employee information (needed for both lightweight and full versions)
                const employeeName = (order as any).employee?.name || null;
                const employeeId = (order as any).employee?.id || null;
                
                // Extract and format discount details with names (needed for both lightweight and full versions)
                const discountDetails = [];
                if ((order as any).discounts?.elements && Array.isArray((order as any).discounts.elements)) {
                  for (const discount of (order as any).discounts.elements) {
                    discountDetails.push({
                      id: discount.id,
                      name: discount.name || 'Unnamed Discount',
                      amount: discount.amount ? Math.abs(discount.amount / 100) : 0,
                      percentage: discount.percentage ? discount.percentage / 100 : 0  // Convert basis points to percentage (2500 → 25)
                    });
                  }
                }
                
                if (filters.skipFinancialCalculations) {
                  // Lightweight version: Skip expensive financial calculations
                  enhancedOrder = {
                    ...order,
                    locationId: config.id,
                    locationName: config.merchantName,
                    orderTotal: orderTotalInDollars,
                    grossTax,
                    totalDiscounts: 0,
                    giftCardTotal: 0,
                    totalRefunds: 0,
                    netCOGS: 0,
                    netSale: orderTotalInDollars,
                    netProfit: 0,
                    netMargin: '0.00%',
                    employeeName,
                    employeeId,
                    discountDetails
                  };
                } else {
                  // Full calculation version for detailed views
                  // ✅ CRITICAL FIX: Use normalizedTotalForDiscounts for accurate discount calculation
                  // Pass the normalized value separately without overwriting order.total
                  const financialMetrics = await this.calculateOrderFinancialMetrics(order, config.id, config, normalizedTotalForDiscounts, filters.skipCogs);
                  
                  
                  // 🔧 DEBUG: Log financial metrics for problematic orders
                  if (isProblematicOrder) {
                    console.log(`🔧 [FINANCIAL METRICS] ${order.id}:`, {
                      totalDiscounts: financialMetrics.totalDiscounts,
                      giftCardTotal: financialMetrics.giftCardTotal,
                      totalRefunds: financialMetrics.totalRefunds,
                      netSale: financialMetrics.netSale,
                      netProfit: financialMetrics.netProfit,
                      rawOrderTotal: order.total,
                      rawDiscountsCount: (order as any).discounts?.elements?.length || 0,
                      rawRefundsCount: (order as any).refunds?.elements?.length || 0
                    });
                  }
                  
                  // Enhance the order with financial data - FORCE correct location assignment
                  enhancedOrder = {
                    ...order,
                    locationId: config.id,
                    locationName: config.merchantName,
                    grossTax: financialMetrics.grossTax,
                    totalDiscounts: financialMetrics.totalDiscounts,
                    giftCardTotal: financialMetrics.giftCardTotal,
                    totalRefunds: financialMetrics.totalRefunds,
                    netCOGS: financialMetrics.netCOGS,
                    netSale: financialMetrics.netSale,
                    netProfit: financialMetrics.netProfit,
                    netMargin: financialMetrics.netMargin,
                    employeeName,
                    employeeId,
                    discountDetails
                  };
                }
                
                // 🔧 DEBUG: Confirm final order data for problematic orders
                if (isProblematicOrder) {
                  console.log(`🔧 [ENHANCED ORDER] ${order.id} - Final assignment:`, {
                    locationId: enhancedOrder.locationId,
                    locationName: enhancedOrder.locationName,
                    totalDiscounts: enhancedOrder.totalDiscounts,
                    totalRefunds: enhancedOrder.totalRefunds
                  });
                }
                
                enhancedOrders.push(enhancedOrder);
              } catch (error) {
                console.error('Error enhancing order with financial metrics:', order.id, error);
                // Still add the order but without enhanced financial data
                enhancedOrders.push({
                  ...order,
                  locationId: config.id,
                  locationName: config.merchantName,
                  grossTax: 0,
                  totalDiscounts: 0,
                  totalRefunds: 0,
                  netCOGS: 0,
                  netSale: 0,
                  netProfit: 0,
                  netMargin: 0
                });
              }
            }
            
            // Add enhanced orders directly (already filtered early)
            allOrders.push(...enhancedOrders);
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
          order.lineItems?.elements?.some((item: any) => 
            item.name?.toLowerCase().includes(searchTerm) ||
            item.item?.name?.toLowerCase().includes(searchTerm)
          )
        );
      }
      
      // Sort by modified time (newest first)
      filteredOrders.sort((a, b) => (b.modifiedTime || 0) - (a.modifiedTime || 0));
      
      console.log(`Total orders after filtering: ${filteredOrders.length}`);
      
      // 🚀 CACHING: Prepare result for caching
      const result = {
        orders: filteredOrders,
        total: filteredOrders.length,
        hasMore: filteredOrders.length >= filters.limit
      };
      
      // Only cache if NOT today's data (we bypassed cache for today earlier)
      if (!isToday) {
        // Determine cache TTL based on date range
        let cacheTTL = 10 * 60 * 1000; // Default: 10 minutes
        
        if (createdTimeMaxMs !== null && !isNaN(createdTimeMaxMs)) {
          const now = Date.now();
          const ageInHours = (now - createdTimeMaxMs) / (1000 * 60 * 60);
          
          if (ageInHours < 24) {
            // Yesterday or recent: 2 minute cache (short to catch late orders)
            cacheTTL = 2 * 60 * 1000;
            console.log(`📅 [CACHE TTL] Yesterday/recent data (${Math.round(ageInHours)}h old): 2 min cache`);
          } else if (ageInHours < 168) {
            // This week: 10 minute cache
            cacheTTL = 10 * 60 * 1000;
            console.log(`📅 [CACHE TTL] This week data (${Math.round(ageInHours)}h old): 10 min cache`);
          } else {
            // Older data: 30 minute cache (historical data changes rarely)
            cacheTTL = 30 * 60 * 1000;
            console.log(`📅 [CACHE TTL] Older data (${Math.round(ageInHours)}h old): 30 min cache`);
          }
        }
        
        // Cache the result
        ordersCache.set(cacheKey, result, cacheTTL);
        console.log(`💾 [CACHE SET] Cached ${filteredOrders.length} orders with TTL ${Math.round(cacheTTL / 1000)}s`);
      }
      
      return result;
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
        query = query.where(and(...conditions)) as any; // Drizzle type inference issue
      }

      // Get total count
      let countQuery = db.select({ count: sql<number>`COUNT(*)` }).from(posSales);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions)) as any; // Drizzle type inference issue
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
      console.log('🔧 [ORDER DETAILS DEBUG] getOrderDetails called for orderId:', orderId);
      
      // Detect if this is an Amazon order (format: XXX-XXXXXXX-XXXXXXX)
      const isAmazonOrder = /^\d{3}-\d{7}-\d{7}$/.test(orderId);
      
      if (isAmazonOrder) {
        console.log('🛒 [AMAZON ORDER DETAILS] Detected Amazon order, fetching from Amazon API');
        
        // Get Amazon configurations with placeholders resolved from secrets
        const amazonConfigs = await this.getAllAmazonConfigs();
        
        if (amazonConfigs.length === 0) {
          console.log('🛒 [AMAZON ORDER DETAILS] No Amazon configurations found');
          return null;
        }
        
        console.log(`🛒 [AMAZON ORDER DETAILS] Found ${amazonConfigs.length} valid Amazon config(s)`);
        
        // Try each Amazon config to find the order
        for (const config of amazonConfigs) {
          try {
            const { AmazonIntegration } = await import('./integrations/amazon');
            const amazonIntegration = new AmazonIntegration(config);
            
            // Fetch the full order first to get OrderStatus and other metadata
            const orderResponse = await amazonIntegration.getOrder(orderId);
            const fullOrder = orderResponse?.payload;
            
            // Then fetch the order items
            const itemsResponse = await amazonIntegration.getOrderItems(orderId);
            
            if (itemsResponse && itemsResponse.payload && itemsResponse.payload.OrderItems) {
              const orderItems = itemsResponse.payload.OrderItems;
              
              // Calculate totals from items
              let subtotal = 0;
              let tax = 0;
              
              const lineItems = orderItems.map((item: any) => {
                const itemPrice = parseFloat(item.ItemPrice?.Amount || '0');
                const itemTax = parseFloat(item.ItemTax?.Amount || '0');
                
                subtotal += itemPrice;
                tax += itemTax;
                
                return {
                  id: item.OrderItemId,
                  name: item.Title,
                  price: Math.round(itemPrice * 100), // Convert to cents
                  quantity: item.QuantityOrdered,
                  sku: item.SellerSKU,
                  asin: item.ASIN,
                  isRevenue: true
                };
              });
              
              const total = subtotal + tax;
              
              // Map Amazon OrderStatus to Clover state (locked/open)
              const state = fullOrder?.OrderStatus === 'Shipped' || fullOrder?.OrderStatus === 'Delivered' ? 'locked' : 'open';
              
              // Map Amazon PaymentMethodDetails to paymentState (paid/unpaid)
              let paymentState = 'open'; // Default to unpaid
              if (fullOrder?.PaymentMethodDetails && fullOrder.PaymentMethodDetails.length > 0) {
                // If payment methods are present and order is not pending, it's paid
                if (fullOrder.OrderStatus !== 'Pending' && fullOrder.OrderStatus !== 'PendingAvailability') {
                  paymentState = 'paid';
                }
              } else if (fullOrder?.OrderStatus === 'Shipped' || fullOrder?.OrderStatus === 'Delivered') {
                // Fallback: If shipped/delivered, it must be paid
                paymentState = 'paid';
              }
              
              // Fetch Amazon fees for each item (always use FBA fees for consistent estimates)
              console.log('💰 [AMAZON FEES] Fetching product fees for order items (using FBA fee structure for consistency)...');
              const isAmazonFulfilled = true; // Always use FBA fees for consistent estimates across all orders
              let totalAmazonFees = 0;
              const itemsWithFees = await Promise.all(lineItems.map(async (item: any) => {
                try {
                  if (item.sku) {
                    const itemPrice = item.price / 100; // Convert back to dollars
                    let fees = await amazonIntegration.getProductFees(item.sku, itemPrice, isAmazonFulfilled);
                    
                    // If SKU returned $0 and we have an ASIN, try fetching by ASIN
                    if (fees.totalFees === 0 && item.asin) {
                      console.log(`💰 [AMAZON FEES] SKU returned $0, trying ASIN ${item.asin}...`);
                      fees = await amazonIntegration.getProductFeesByASIN(item.asin, itemPrice, isAmazonFulfilled);
                    }
                    
                    totalAmazonFees += fees.totalFees;
                    
                    return {
                      ...item,
                      amazonFees: fees.totalFees,
                      feeDetails: fees.feeDetails
                    };
                  }
                  return item;
                } catch (error) {
                  console.error(`❌ [AMAZON FEES] Error fetching fees for ${item.sku}:`, error);
                  return item;
                }
              }));
              
              console.log(`💰 [AMAZON FEES] Total Amazon fees for order: $${totalAmazonFees.toFixed(2)}`);
              
              // Construct order object in Clover-like format
              const amazonOrder = {
                ...fullOrder, // Include all Amazon order fields (OrderStatus, PaymentMethodDetails, etc.)
                id: orderId,
                AmazonOrderId: orderId,
                total: Math.round(total * 100), // Convert to cents
                taxAmount: Math.round(tax * 100),
                createdTime: fullOrder?.PurchaseDate ? new Date(fullOrder.PurchaseDate).getTime() : Date.now(),
                locationName: config.merchantName || 'Amazon Store',
                merchantId: config.sellerId,
                state, // Add mapped order state
                paymentState, // Add mapped payment state
                isAmazonOrder: true,
                amazonFees: totalAmazonFees, // Total Amazon fees
                lineItems: {
                  elements: itemsWithFees
                },
                payments: {
                  elements: [{
                    id: 'amazon_payment',
                    amount: Math.round(total * 100),
                    tipAmount: 0,
                    taxAmount: Math.round(tax * 100),
                    result: paymentState === 'paid' ? 'SUCCESS' : 'PENDING'
                  }]
                },
                discounts: {
                  elements: [] // Amazon doesn't provide discount details in items API
                },
                refunds: {
                  elements: []
                }
              };
              
              // Calculate financial metrics for Amazon orders (now with fees)
              const financialMetrics = await this.calculateOrderFinancialMetrics(amazonOrder, config.id, config);
              
              amazonOrder.grossTax = financialMetrics.grossTax;
              amazonOrder.totalDiscounts = financialMetrics.totalDiscounts;
              amazonOrder.totalRefunds = financialMetrics.totalRefunds;
              amazonOrder.netCOGS = financialMetrics.netCOGS;
              amazonOrder.netSale = financialMetrics.netSale;
              amazonOrder.netProfit = financialMetrics.netProfit;
              amazonOrder.netMargin = financialMetrics.netMargin;
              
              console.log('🛒 [AMAZON ORDER DETAILS] Successfully fetched Amazon order:', orderId);
              return amazonOrder;
            }
          } catch (configError) {
            const error = configError as Error;
            console.log(`🛒 [AMAZON ORDER DETAILS] Config ${config.id} failed:`, error.message);
            
            // If API call fails, try to construct order from cached list data
            // This happens when tokens are invalid but we have cached order info
            console.log(`🛒 [AMAZON ORDER DETAILS] Attempting to use cached order data as fallback`);
            
            // Try to get the order from recent getOrders cache
            const { AmazonIntegration } = await import('./integrations/amazon');
            const cacheKey = `${config.sellerId}-`;
            
            // Check if we have this order in any cache (this is a simplified fallback)
            // We'll construct a basic order view without line items
            const basicOrder = {
              id: orderId,
              AmazonOrderId: orderId,
              total: 0, // We don't have the exact total without API
              taxAmount: 0,
              createdTime: Date.now(),
              locationName: config.merchantName || 'Amazon Store',
              merchantId: config.sellerId,
              isAmazonOrder: true,
              lineItems: {
                elements: [{
                  id: 'unavailable',
                  name: 'Order details unavailable - Amazon API credentials need refresh',
                  price: 0,
                  quantity: 1,
                  isRevenue: true
                }]
              },
              payments: {
                elements: [{
                  id: 'amazon_payment',
                  amount: 0,
                  tipAmount: 0,
                  taxAmount: 0,
                  result: 'SUCCESS'
                }]
              },
              discounts: { elements: [] },
              refunds: { elements: [] },
              grossTax: 0,
              totalDiscounts: 0,
              totalRefunds: 0,
              netCOGS: 0,
              netSale: 0,
              netProfit: 0,
              netMargin: 0,
              apiError: 'Unable to fetch order details - Amazon credentials need refresh'
            };
            
            console.log('🛒 [AMAZON ORDER DETAILS] Returning basic order info (API unavailable)');
            return basicOrder;
          }
        }
        
        console.log('🛒 [AMAZON ORDER DETAILS] Order not found in any Amazon configuration');
        return null;
      }
      
      // CLOVER ORDER PROCESSING BELOW
      // Make a direct API call to get a single order (much faster than fetching 1000 orders)
      const allConfigs = await db.select().from(cloverConfig);
      
      let foundOrder = null;
      let foundConfig = null;
      
      // Try each configuration to find the order
      for (const config of allConfigs) {
        try {
          // Make direct API call for a single order by ID
          const baseUrl = config.baseUrl || 'https://api.clover.com';
          const url = `${baseUrl}/v3/merchants/${config.merchantId}/orders/${orderId}?expand=lineItems,lineItems.discounts,lineItems.modifications,payments,payments.employee,discounts,refunds,employee,customers,serviceCharge`;
          
          console.log(`🔧 [ORDER DETAILS] Fetching single order ${orderId} from ${config.merchantName}`);
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${config.apiToken}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          });

          if (!response.ok) {
            if (response.status === 404) {
              // Order not found in this merchant, try next config
              console.log(`🔧 [ORDER DETAILS] Order ${orderId} not found in ${config.merchantName}`);
              continue;
            }
            const errorBody = await response.text();
            throw new Error(`Clover API error: ${response.status} ${response.statusText} - ${errorBody}`);
          }

          const targetOrder = await response.json();
          
          if (targetOrder && targetOrder.id === orderId) {
            console.log(`🔧 [ORDER DETAILS] Found order ${orderId} in ${config.merchantName}`);
            foundOrder = targetOrder;
            foundConfig = config;
            break;
          }
        } catch (configError) {
          console.log(`🔧 [ORDER DETAILS] Config ${config.id} failed for order ${orderId}:`, (configError as Error).message);
          continue;
        }
      }
      
      if (!foundOrder || !foundConfig) {
        console.log('🔧 [ORDER DETAILS DEBUG] Order not found in any Clover configuration');
        return null;
      }
      
      // Ensure the location name is correctly set from our configuration
      foundOrder.locationName = foundConfig.merchantName || 'Unknown Location';
      foundOrder.merchantId = foundConfig.merchantId;
      
      // Extract employee information
      const employeeName = foundOrder.employee?.name || null;
      const employeeId = foundOrder.employee?.id || null;
      console.log(`👤 [ORDER DETAILS] Employee: ${employeeName || 'None'}`);
      
      // Extract and format discount details with names
      const discountDetails = [];
      if (foundOrder.discounts?.elements && Array.isArray(foundOrder.discounts.elements)) {
        for (const discount of foundOrder.discounts.elements) {
          discountDetails.push({
            id: discount.id,
            name: discount.name || 'Unnamed Discount',
            amount: discount.amount ? Math.abs(discount.amount / 100) : 0,
            percentage: discount.percentage ? discount.percentage / 100 : 0  // Convert basis points to percentage (2500 → 25)
          });
        }
        console.log(`💰 [ORDER DETAILS] Found ${discountDetails.length} discount(s):`, discountDetails.map(d => `${d.name} ($${d.amount})`).join(', '));
      }
      
      // Calculate financial metrics for this order
      console.log('🔧 [ORDER DETAILS DEBUG] Calculating financial metrics for order:', foundOrder.id);
      const financialMetrics = await this.calculateOrderFinancialMetrics(foundOrder, foundConfig.id, foundConfig);
      
      // Add financial calculations and employee/discount details to the order object
      foundOrder.grossTax = financialMetrics.grossTax;
      foundOrder.totalDiscounts = financialMetrics.totalDiscounts;
      foundOrder.totalRefunds = financialMetrics.totalRefunds;
      foundOrder.netCOGS = financialMetrics.netCOGS;
      foundOrder.netSale = financialMetrics.netSale;
      foundOrder.netProfit = financialMetrics.netProfit;
      foundOrder.netMargin = financialMetrics.netMargin;
      foundOrder.employeeName = employeeName;
      foundOrder.employeeId = employeeId;
      foundOrder.discountDetails = discountDetails;
      
      // Format order date/time for frontend display
      if (foundOrder.createdTime) {
        foundOrder.formattedDate = new Date(foundOrder.createdTime).toLocaleString();
        foundOrder.orderDate = new Date(foundOrder.createdTime).toLocaleDateString();
        foundOrder.orderTime = new Date(foundOrder.createdTime).toLocaleTimeString();
      }
      
      // Disabled for performance: console.log('🔧 [ORDER DETAILS DEBUG] Final enriched order details:', {
      //   orderId: foundOrder.id,
      //   locationName: foundOrder.locationName,
      //   merchantId: foundOrder.merchantId,
      //   netSale: foundOrder.netSale,
      //   netProfit: foundOrder.netProfit,
      //   totalDiscounts: foundOrder.totalDiscounts,
      //   totalRefunds: foundOrder.totalRefunds,
      //   formattedDate: foundOrder.formattedDate
      // });
      
      return foundOrder;
    } catch (error) {
      console.error('🔧 [ORDER DETAILS DEBUG] Error fetching order details:', error);
      return null;
    }
  }


  async getOrderAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    locationId?: number | string;
    groupBy: string;
  }): Promise<any> {
    try {
      const { startDate, endDate, locationId, groupBy = 'day' } = filters;
      
      console.log('🔥 Enhanced Order Analytics - Using enhanced order data for aggregation:', filters);
      
      // Use the enhanced order data from getOrdersFromCloverAPI
      const orderData = await this.getOrdersFromCloverAPI({
        startDate,
        endDate,
        locationId,
        search: undefined,
        state: 'all',
        limit: 10000, // Get all orders for analytics
        offset: 0
      });
      
      const { orders } = orderData;
      console.log(`📊 Aggregating ${orders.length} enhanced orders for analytics`);
      
      if (orders.length === 0) {
        return {
          analytics: [],
          summary: { 
            totalOrders: 0, 
            totalRevenue: 0, 
            averageOrderValue: 0,
            totalDiscounts: 0,
            totalRefunds: 0,
            totalTax: 0,
            totalCOGS: 0,
            totalProfit: 0
          }
        };
      }
      
      // Group orders by date and optionally by location
      const groupedData = new Map<string, {
        date: string;
        locationId?: string;
        locationName?: string;
        totalOrders: number;
        totalRevenue: number;
        totalDiscounts: number;
        totalRefunds: number;
        totalTax: number;
        totalCOGS: number;
        totalProfit: number;
        netSale: number;
      }>();
      
      for (const order of orders) {
        // Parse the order date from createdTime or modifiedTime
        let orderDate: Date;
        if (order.createdTime) {
          orderDate = new Date(order.createdTime);
        } else if (order.modifiedTime) {
          orderDate = new Date(order.modifiedTime);
        } else {
          console.warn(`Order ${order.id} has no valid date, skipping`);
          continue;
        }
        
        // Create grouping key based on groupBy parameter
        let groupKey: string;
        if (groupBy === 'day') {
          groupKey = orderDate.toISOString().split('T')[0]; // YYYY-MM-DD
          if (locationId && locationId !== 'all') {
            groupKey += `_${order.locationName || 'unknown'}`;
          }
        } else {
          // Default to daily grouping
          groupKey = orderDate.toISOString().split('T')[0];
        }
        
        // Initialize group if it doesn't exist
        if (!groupedData.has(groupKey)) {
          groupedData.set(groupKey, {
            date: orderDate.toISOString().split('T')[0],
            locationId: order.locationId,
            locationName: order.locationName,
            totalOrders: 0,
            totalRevenue: 0,
            totalDiscounts: 0,
            totalRefunds: 0,
            totalTax: 0,
            totalCOGS: 0,
            totalProfit: 0,
            netSale: 0
          });
        }
        
        const group = groupedData.get(groupKey)!;
        
        // Skip refunded/voided orders for positive metrics
        const isRefund = order.total < 0 || order.state === 'refunded';
        
        if (isRefund) {
          // For completely refunded orders, count the absolute total as refund
          const refundAmount = Math.abs(order.total / 100);
          group.totalRefunds += refundAmount;
          console.log(`💸 [REFUND AGGREGATION] Order ${order.id} marked as refunded, adding $${refundAmount.toFixed(2)}`);
        } else {
          group.totalOrders += 1;
          
          // Aggregate the enhanced financial metrics (already calculated per order)
          group.totalRevenue += order.total / 100; // Convert cents to dollars
          group.totalDiscounts += order.totalDiscounts || 0;
          group.totalTax += order.grossTax || 0;
          group.totalCOGS += order.netCOGS || 0;
          group.totalProfit += order.netProfit || 0;
          group.netSale += order.netSale || 0;
          
          // IMPORTANT: Add refunds for normal orders that have partial refunds
          // Orders can have refunds without being marked as 'refunded' state
          if (order.totalRefunds && order.totalRefunds > 0) {
            console.log(`💸 [REFUND AGGREGATION] Order ${order.id} has partial refund of $${order.totalRefunds.toFixed(2)} (order total: $${(order.total/100).toFixed(2)})`);
          }
          group.totalRefunds += order.totalRefunds || 0;
        }
        
        console.log(`📊 Order ${order.id}: Revenue $${(order.total/100).toFixed(2)}, Discounts $${(order.totalDiscounts || 0).toFixed(2)}, Profit $${(order.netProfit || 0).toFixed(2)}`);
      }
      
      // Convert grouped data to analytics array
      const analytics = Array.from(groupedData.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(group => ({
          period: group.date,
          location: group.locationName || 'All Locations',
          totalOrders: group.totalOrders,
          totalRevenue: parseFloat(group.totalRevenue.toFixed(2)),
          totalDiscounts: parseFloat(group.totalDiscounts.toFixed(2)),
          totalRefunds: parseFloat(group.totalRefunds.toFixed(2)),
          totalTax: parseFloat(group.totalTax.toFixed(2)),
          totalCOGS: parseFloat(group.totalCOGS.toFixed(2)),
          totalProfit: parseFloat(group.totalProfit.toFixed(2)),
          netSale: parseFloat(group.netSale.toFixed(2)),
          averageOrderValue: group.totalOrders > 0 ? parseFloat((group.totalRevenue / group.totalOrders).toFixed(2)) : 0,
          profitMargin: group.totalRevenue > 0 ? parseFloat(((group.totalProfit / group.totalRevenue) * 100).toFixed(2)) : 0
        }));
      
      // Calculate summary totals
      const summary = {
        totalOrders: analytics.reduce((sum, day) => sum + day.totalOrders, 0),
        totalRevenue: parseFloat(analytics.reduce((sum, day) => sum + day.totalRevenue, 0).toFixed(2)),
        totalDiscounts: parseFloat(analytics.reduce((sum, day) => sum + day.totalDiscounts, 0).toFixed(2)),
        totalRefunds: parseFloat(analytics.reduce((sum, day) => sum + day.totalRefunds, 0).toFixed(2)),
        totalTax: parseFloat(analytics.reduce((sum, day) => sum + day.totalTax, 0).toFixed(2)),
        totalCOGS: parseFloat(analytics.reduce((sum, day) => sum + day.totalCOGS, 0).toFixed(2)),
        totalProfit: parseFloat(analytics.reduce((sum, day) => sum + day.totalProfit, 0).toFixed(2)),
        averageOrderValue: 0
      };
      
      summary.averageOrderValue = summary.totalOrders > 0 
        ? parseFloat((summary.totalRevenue / summary.totalOrders).toFixed(2)) 
        : 0;
      
      console.log(`📊 Enhanced Order Analytics Summary:`, summary);
      console.log(`📊 Analytics periods: ${analytics.length}`);
      
      return { analytics, summary };
      
    } catch (error) {
      console.error('Error fetching enhanced order analytics:', error);
      return {
        analytics: [],
        summary: { 
          totalOrders: 0, 
          totalRevenue: 0, 
          averageOrderValue: 0,
          totalDiscounts: 0,
          totalRefunds: 0,
          totalTax: 0,
          totalCOGS: 0,
          totalProfit: 0
        }
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

  async getMessageRecipients(messageId: number): Promise<any[]> {
    try {
      const recipients = await db.select({
        userId: readReceipts.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
        deliveredAt: readReceipts.deliveredAt,
        readAt: readReceipts.readAt
      })
        .from(readReceipts)
        .innerJoin(users, eq(readReceipts.userId, users.id))
        .where(eq(readReceipts.messageId, messageId));
      
      return recipients;
    } catch (error) {
      console.error('Error fetching message recipients:', error);
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
  async createMessageReadReceipt(messageId: number, userId: string): Promise<ReadReceipt> {
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
        // Update existing receipt to mark as read
        const [updated] = await db.update(readReceipts)
          .set({ readAt: new Date() })
          .where(
            and(
              eq(readReceipts.messageId, messageId),
              eq(readReceipts.userId, userId)
            )
          )
          .returning();
        return updated;
      }

      const [created] = await db.insert(readReceipts)
        .values({ messageId, userId, readAt: new Date() })
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

  // Mark message as read (for direct messages)
  async markMessageAsRead(messageId: number, userId: string): Promise<void> {
    try {
      // Update direct message isRead flag
      await db.update(messages)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(messages.id, messageId),
            eq(messages.recipientId, userId)
          )
        );
    } catch (error) {
      console.error('Error marking direct message as read:', error);
      throw error;
    }
  }

  // Mark announcement as read (by creating a "viewed" reaction)
  async markAnnouncementAsRead(announcementId: number, userId: string): Promise<void> {
    try {
      // Check if user already has any reaction to this announcement
      const existingReaction = await db.select()
        .from(announcementReactions)
        .where(
          and(
            eq(announcementReactions.announcementId, announcementId),
            eq(announcementReactions.userId, userId)
          )
        );

      // If no reaction exists, create a "viewed" reaction to mark as read
      if (existingReaction.length === 0) {
        await db.insert(announcementReactions)
          .values({
            announcementId,
            userId,
            reactionType: 'viewed'
          });
      }
    } catch (error) {
      console.error('Error marking announcement as read:', error);
      throw error;
    }
  }

  // Bulk mark all messages as read for a user
  async markAllMessagesAsRead(userId: string): Promise<void> {
    try {
      // Mark all direct messages as read
      await db.update(messages)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(messages.recipientId, userId),
            eq(messages.isRead, false)
          )
        );

      // Mark all custom messages as read via readReceipts
      await db.update(readReceipts)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(readReceipts.userId, userId),
            isNull(readReceipts.readAt)
          )
        );
    } catch (error) {
      console.error('Error marking all messages as read:', error);
      throw error;
    }
  }

  // Bulk mark all announcements as read for a user
  async markAllAnnouncementsAsRead(userId: string, userRole: string): Promise<void> {
    try {
      // Get all announcements targeted for this user
      const userAnnouncements = await this.getPublishedAnnouncementsForUser(userId, userRole);
      
      for (const announcement of userAnnouncements) {
        // Check if user already has any reaction
        const existingReaction = await db.select()
          .from(announcementReactions)
          .where(
            and(
              eq(announcementReactions.announcementId, announcement.id),
              eq(announcementReactions.userId, userId)
            )
          );

        // If no reaction exists, create a "viewed" reaction
        if (existingReaction.length === 0) {
          await db.insert(announcementReactions)
            .values({
              announcementId: announcement.id,
              userId,
              reactionType: 'viewed'
            });
        }
      }
    } catch (error) {
      console.error('Error marking all announcements as read:', error);
      throw error;
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
      })
      .from(messages)
      .where(
        or(
          eq(messages.senderId, userId), // Messages sent by user
          // Messages targeted at user (will need to expand this logic)
          sql`${messages.targetAudience} = 'all'`
        )
      )
      .orderBy(desc(messages.sentAt))
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

  async updateMessageReadReceipt(messageId: number, userId: string): Promise<void> {
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
    // Use messages table since channelMessages doesn't exist
    const [newMessage] = await db
      .insert(messages)
      .values({
        senderId: message.senderId,
        recipientId: '', // Channel messages don't have individual recipients
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
        messageId: parseInt(delivery.messageId),
        userId: delivery.phoneNumber, // Temporarily store phone in userId field
        twilioMessageId: delivery.messageId,
        phoneNumber: delivery.phoneNumber,
        status: delivery.status,
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
        userId: event.userId || null,
        messageId: parseInt(event.messageId),
        channelMessageId: event.channelId || null,
        eventData: event.metadata || null,
        source: event.source,
        eventTimestamp: event.eventTimestamp,
      })
      .returning();
    
    return newEvent;
  }

  // Update SMS delivery status (for webhooks)
  async updateSMSDeliveryStatusByMessageId(messageId: string, status: string, errorCode?: string, errorMessage?: string): Promise<void> {
    await db
      .update(smsDeliveries)
      .set({
        status: status as any,
        errorCode,
        errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(smsDeliveries.twilioMessageId, messageId));
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
      })
      .from(smsDeliveries)
      .where(
        and(
          gte(smsDeliveries.sentAt, startOfDay),
          lte(smsDeliveries.sentAt, endOfDay)
        )
      );

    // Get announcement stats
    const announcementStatsResult = await db
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
    const reactionStatsResult = await db
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
    const responseStatsResult = await db
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

    const sms = smsStats[0] || { totalSMS: 0, totalDelivered: 0, totalFailed: 0 };
    const announcementData = announcementStatsResult[0] || { totalAnnouncements: 0 };
    const reactionData = reactionStatsResult[0] || { totalReactions: 0 };
    const responseData = responseStatsResult[0] || { totalResponses: 0 };

    // Calculate rates
    const deliveryRate = sms.totalSMS > 0 ? (Number(sms.totalDelivered) / Number(sms.totalSMS)) * 100 : 0;
    const engagementRate = announcementData.totalAnnouncements > 0 
      ? ((Number(reactionData.totalReactions) + Number(responseData.totalResponses)) / Number(announcementData.totalAnnouncements)) * 100 
      : 0;

    // Insert or update daily analytics
    await db
      .insert(communicationAnalytics)
      .values({
        date,
        totalMessages: Number(announcementData.totalAnnouncements) || 0,
        totalAnnouncements: Number(announcementData.totalAnnouncements) || 0,
        totalSMS: Number(sms.totalSMS) || 0,
        totalReactions: Number(reactionData.totalReactions) || 0,
        totalResponses: Number(responseData.totalResponses) || 0,
        smsDelivered: Number(sms.totalDelivered) || 0,
        smsFailed: Number(sms.totalFailed) || 0,
        smsCost: 0, // Cost not tracked in smsDeliveries schema
        engagementRate: engagementRate.toFixed(2),
        smsDeliveryRate: deliveryRate.toFixed(2),
      })
      .onConflictDoUpdate({
        target: communicationAnalytics.date,
        set: {
          totalMessages: Number(announcementData.totalAnnouncements) || 0,
          totalAnnouncements: Number(announcementData.totalAnnouncements) || 0,
          totalSMS: Number(sms.totalSMS) || 0,
          totalReactions: Number(reactionData.totalReactions) || 0,
          totalResponses: Number(responseData.totalResponses) || 0,
          smsDelivered: Number(sms.totalDelivered) || 0,
          smsFailed: Number(sms.totalFailed) || 0,
          smsCost: 0, // Cost not tracked in smsDeliveries schema
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

  // ============================================
  // MONTHLY ACCOUNTING ARCHIVAL IMPLEMENTATIONS
  // ============================================

  // Monthly Closing Operations
  async createMonthlyClosing(closing: InsertMonthlyClosure): Promise<MonthlyClosure> {
    const [result] = await db.insert(monthlyClosings).values(closing).returning();
    return result;
  }

  async getMonthlyClosing(year: number, month: number): Promise<MonthlyClosure | undefined> {
    try {
      const [result] = await db
        .select()
        .from(monthlyClosings)
        .where(and(
          eq(monthlyClosings.year, year),
          eq(monthlyClosings.month, month)
        ))
        .limit(1);
      return result;
    } catch (error) {
      console.log(`Monthly closing for ${month}/${year} not found, returning undefined`);
      return undefined;
    }
  }

  async getAllMonthlyClosings(): Promise<MonthlyClosure[]> {
    try {
      return await db
        .select()
        .from(monthlyClosings)
        .orderBy(desc(monthlyClosings.year), desc(monthlyClosings.month));
    } catch (error) {
      console.log('Monthly closings table empty or not found, returning empty array');
      return [];
    }
  }

  async getMonthlyClosingsInDateRange(startYear: number, startMonth: number, endYear: number, endMonth: number): Promise<MonthlyClosure[]> {
    try {
      return await db
        .select()
        .from(monthlyClosings)
        .where(
          or(
            and(eq(monthlyClosings.year, startYear), gte(monthlyClosings.month, startMonth)),
            and(eq(monthlyClosings.year, endYear), lte(monthlyClosings.month, endMonth)),
            and(gte(monthlyClosings.year, startYear + 1), lte(monthlyClosings.year, endYear - 1))
          )
        )
        .orderBy(desc(monthlyClosings.year), desc(monthlyClosings.month));
    } catch (error) {
      console.log('Monthly closings date range query failed, returning empty array');
      return [];
    }
  }

  async reopenMonth(year: number, month: number, reopenedBy: string): Promise<MonthlyClosure> {
    const [result] = await db
      .update(monthlyClosings)
      .set({ 
        status: 'reopened',
        updatedAt: new Date()
      })
      .where(and(
        eq(monthlyClosings.year, year),
        eq(monthlyClosings.month, month)
      ))
      .returning();
    return result;
  }

  // Monthly Account Balance Operations
  async createMonthlyAccountBalance(balance: InsertMonthlyAccountBalance): Promise<MonthlyAccountBalance> {
    const [result] = await db.insert(monthlyAccountBalances).values(balance).returning();
    return result;
  }

  async getMonthlyAccountBalances(monthlyClosingId: number): Promise<MonthlyAccountBalance[]> {
    return await db
      .select()
      .from(monthlyAccountBalances)
      .where(eq(monthlyAccountBalances.monthlyClosingId, monthlyClosingId))
      .orderBy(monthlyAccountBalances.accountId);
  }

  async getAccountBalanceHistory(accountId: number): Promise<MonthlyAccountBalance[]> {
    return await db
      .select()
      .from(monthlyAccountBalances)
      .where(eq(monthlyAccountBalances.accountId, accountId))
      .orderBy(desc(monthlyAccountBalances.createdAt));
  }

  // Monthly Transaction Summary Operations
  async createMonthlyTransactionSummary(summary: InsertMonthlyTransactionSummary): Promise<MonthlyTransactionSummary> {
    const [result] = await db.insert(monthlyTransactionSummaries).values(summary).returning();
    return result;
  }

  async getMonthlyTransactionSummaries(monthlyClosingId: number): Promise<MonthlyTransactionSummary[]> {
    return await db
      .select()
      .from(monthlyTransactionSummaries)
      .where(eq(monthlyTransactionSummaries.monthlyClosingId, monthlyClosingId))
      .orderBy(monthlyTransactionSummaries.accountId, monthlyTransactionSummaries.sourceSystem);
  }

  async getTransactionSummaryHistory(accountId: number): Promise<MonthlyTransactionSummary[]> {
    return await db
      .select()
      .from(monthlyTransactionSummaries)
      .where(eq(monthlyTransactionSummaries.accountId, accountId))
      .orderBy(desc(monthlyTransactionSummaries.createdAt));
  }

  // Monthly Reset History Operations
  async createMonthlyResetHistory(reset: InsertMonthlyResetHistory): Promise<MonthlyResetHistory> {
    const [result] = await db.insert(monthlyResetHistory).values(reset).returning();
    return result;
  }

  async getMonthlyResetHistory(): Promise<MonthlyResetHistory[]> {
    return await db
      .select()
      .from(monthlyResetHistory)
      .orderBy(desc(monthlyResetHistory.resetDate));
  }

  async getResetHistoryForMonth(year: number, month: number): Promise<MonthlyResetHistory[]> {
    return await db
      .select()
      .from(monthlyResetHistory)
      .where(and(
        eq(monthlyResetHistory.year, year),
        eq(monthlyResetHistory.month, month)
      ))
      .orderBy(desc(monthlyResetHistory.resetDate));
  }

  // Complex Monthly Operations
  async performMonthlyClosing(year: number, month: number, closedBy: string, notes?: string): Promise<MonthlyClosure> {
    // First check if month is already closed
    const existingClosing = await this.getMonthlyClosing(year, month);
    if (existingClosing && existingClosing.status === 'closed') {
      throw new Error(`Month ${month}/${year} is already closed`);
    }

    // Calculate account balances for the month
    const balances = await this.calculateMonthlyAccountBalances(year, month);
    
    // Calculate transaction summaries 
    const summaries = await this.calculateMonthlyTransactionSummaries(year, month);

    // Create the monthly closing record
    const closing = await this.createMonthlyClosing({
      year,
      month,
      status: 'closed',
      closedBy,
      notes,
      transactionCount: summaries.reduce((sum, s) => sum + s.transactionCount, 0)
    });

    // Store account balances
    for (const balance of balances) {
      await this.createMonthlyAccountBalance({
        year,
        month,
        monthlyClosingId: closing.id,
        accountId: balance.accountId,
        openingBalance: balance.openingBalance,
        closingBalance: balance.closingBalance,
        totalDebits: balance.totalDebits,
        totalCredits: balance.totalCredits,
        transactionCount: balance.transactionCount
      });
    }

    // Store transaction summaries
    for (const summary of summaries) {
      await this.createMonthlyTransactionSummary({
        year,
        month,
        monthlyClosingId: closing.id,
        accountId: summary.accountId,
        sourceSystem: summary.sourceSystem,
        transactionCount: summary.transactionCount,
        totalAmount: summary.totalAmount,
        totalDebits: summary.totalDebits,
        totalCredits: summary.totalCredits,
        averageAmount: summary.averageAmount
      });
    }

    return closing;
  }

  async calculateMonthlyAccountBalances(year: number, month: number): Promise<{ accountId: number; openingBalance: string; closingBalance: string; totalDebits: string; totalCredits: string; transactionCount: number }[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get all accounts
    const accounts = await this.getAllFinancialAccounts();
    const results = [];

    for (const account of accounts) {
      // Calculate opening balance (transactions before this month)
      const openingBalance = await this.getAccountBalance(account.id, startDate.toISOString().split('T')[0]);
      
      // Get transactions for this month
      const monthTransactions = await db
        .select()
        .from(financialTransactionLines)
        .innerJoin(financialTransactions, eq(financialTransactions.id, financialTransactionLines.transactionId))
        .where(and(
          eq(financialTransactionLines.accountId, account.id),
          gte(financialTransactions.transactionDate, sql`${startDate.toISOString().split('T')[0]}`),
          lte(financialTransactions.transactionDate, sql`${endDate.toISOString().split('T')[0]}`)
        ));

      const totalDebits = monthTransactions
        .filter(t => parseFloat(t.financial_transaction_lines.debitAmount || '0') > 0)
        .reduce((sum, t) => sum + parseFloat(t.financial_transaction_lines.debitAmount || '0'), 0);

      const totalCredits = monthTransactions
        .filter(t => parseFloat(t.financial_transaction_lines.creditAmount || '0') > 0)
        .reduce((sum, t) => sum + parseFloat(t.financial_transaction_lines.creditAmount || '0'), 0);

      const closingBalance = parseFloat(openingBalance) + totalDebits - totalCredits;

      results.push({
        accountId: account.id,
        openingBalance,
        closingBalance: closingBalance.toString(),
        totalDebits: totalDebits.toString(),
        totalCredits: totalCredits.toString(),
        transactionCount: monthTransactions.length
      });
    }

    return results;
  }

  async calculateMonthlyTransactionSummaries(year: number, month: number): Promise<{ accountId: number; sourceSystem: string; transactionCount: number; totalAmount: string; totalDebits: string; totalCredits: string; averageAmount: string }[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const summaries = await db
      .select({
        accountId: financialTransactionLines.accountId,
        sourceSystem: financialTransactions.sourceSystem,
        transactionCount: sql<number>`COUNT(${financialTransactionLines.id})`,
        totalDebits: sql<string>`COALESCE(SUM(${financialTransactionLines.debitAmount}::numeric), 0)::text`,
        totalCredits: sql<string>`COALESCE(SUM(${financialTransactionLines.creditAmount}::numeric), 0)::text`,
        totalAmount: sql<string>`COALESCE(SUM(COALESCE(${financialTransactionLines.debitAmount}::numeric, 0) + COALESCE(${financialTransactionLines.creditAmount}::numeric, 0)), 0)::text`,
      })
      .from(financialTransactionLines)
      .innerJoin(financialTransactions, eq(financialTransactions.id, financialTransactionLines.transactionId))
      .where(and(
        gte(financialTransactions.transactionDate, sql`${startDate.toISOString().split('T')[0]}`),
        lte(financialTransactions.transactionDate, sql`${endDate.toISOString().split('T')[0]}`)
      ))
      .groupBy(financialTransactionLines.accountId, financialTransactions.sourceSystem);

    return summaries.map(s => ({
      ...s,
      averageAmount: s.transactionCount > 0 ? (parseFloat(s.totalAmount) / s.transactionCount).toString() : '0'
    }));
  }

  async performMonthlyReset(year: number, month: number, resetBy: string, resetType: 'manual' | 'automated' | 'rollover', reason?: string, notes?: string): Promise<MonthlyResetHistory> {
    // Check if month was closed
    const closing = await this.getMonthlyClosing(year, month);
    if (!closing) {
      throw new Error(`Cannot reset month ${month}/${year} - month was never closed`);
    }

    // Create reset history record
    const resetRecord = await this.createMonthlyResetHistory({
      year,
      month,
      resetBy,
      resetType,
      reason,
      notes,
      previousClosingId: closing.id
    });

    // Reopen the month if it was closed
    if (closing.status === 'closed') {
      await this.reopenMonth(year, month, resetBy);
    }

    return resetRecord;
  }

  async rollForwardAccountBalances(fromYear: number, fromMonth: number, toYear: number, toMonth: number): Promise<void> {
    const fromClosing = await this.getMonthlyClosing(fromYear, fromMonth);
    if (!fromClosing) {
      throw new Error(`Cannot roll forward from ${fromMonth}/${fromYear} - month not closed`);
    }

    const balances = await this.getMonthlyAccountBalances(fromClosing.id);
    
    // TODO: Implement logic to set opening balances for the new month
    // This would typically involve updating account opening balances or creating 
    // journal entries to establish the new month's starting position
  }

  // Historical Data Access
  async getHistoricalFinancialData(year: number, month: number): Promise<{ accounts: FinancialAccount[]; transactions: FinancialTransaction[]; summary: MonthlyClosure | undefined }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const [accounts, transactions, summary] = await Promise.all([
      this.getAllFinancialAccounts(),
      this.getTransactionsByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      ),
      this.getMonthlyClosing(year, month)
    ]);

    return { accounts, transactions, summary };
  }

  async getHistoricalProfitLoss(year: number, month: number): Promise<{ revenue: string; expenses: string; netIncome: string }> {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month, 0).toISOString().split('T')[0];
    
    return await this.getProfitLoss(startDate, endDate);
  }

  async getHistoricalAccountBalances(year: number, month: number): Promise<MonthlyAccountBalance[]> {
    const closing = await this.getMonthlyClosing(year, month);
    if (!closing) {
      return [];
    }

    return await this.getMonthlyAccountBalances(closing.id);
  }

  // Current Month Operations
  async getCurrentMonthTransactions(): Promise<FinancialTransaction[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    return await this.getTransactionsByDateRange(
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    );
  }

  async isMonthClosed(year: number, month: number): Promise<boolean> {
    const closing = await this.getMonthlyClosing(year, month);
    return closing?.status === 'closed';
  }

  async getOpeningBalancesForCurrentMonth(): Promise<{ accountId: number; openingBalance: string }[]> {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Get previous month's closing
      let prevYear = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear = currentYear - 1;
      }

      const prevClosing = await this.getMonthlyClosing(prevYear, prevMonth);
      if (!prevClosing) {
        // No previous month closing, calculate balances up to start of current month
        const accounts = await this.getAllFinancialAccounts();
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        const results = [];

        for (const account of accounts) {
          const balance = await this.getAccountBalance(account.id, startOfMonth.toISOString().split('T')[0]);
          results.push({
            accountId: account.id,
            openingBalance: balance
          });
        }

        return results;
      }

      // Use previous month's closing balances
      const balances = await this.getMonthlyAccountBalances(prevClosing.id);
      return balances.map(b => ({
        accountId: b.accountId,
        openingBalance: b.closingBalance
      }));
    } catch (error) {
      console.error('Error getting opening balances, using live computation fallback:', error);
      // Fallback: calculate current balances for all accounts
      const accounts = await this.getAllFinancialAccounts();
      const results = [];
      
      for (const account of accounts) {
        const balance = await this.getAccountBalance(account.id);
        results.push({
          accountId: account.id,
          openingBalance: balance
        });
      }
      
      return results;
    }
  }

  // ================================
  // PAYROLL OPERATIONS IMPLEMENTATION
  // ================================

  // Payroll Period Management
  async createPayrollPeriod(period: InsertPayrollPeriod): Promise<PayrollPeriod> {
    const [created] = await db
      .insert(payrollPeriods)
      .values({
        ...period,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async getPayrollPeriods(status?: string): Promise<PayrollPeriod[]> {
    let query = db.select().from(payrollPeriods);
    
    if (status) {
      query = (query as any).where(eq(payrollPeriods.status, status));
    }
    
    return await query.orderBy(desc(payrollPeriods.startDate));
  }

  async getPayrollPeriod(id: number): Promise<PayrollPeriod | undefined> {
    const [period] = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, id));
    return period;
  }

  async updatePayrollPeriod(id: number, updates: Partial<InsertPayrollPeriod>): Promise<PayrollPeriod> {
    const [updated] = await db
      .update(payrollPeriods)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(payrollPeriods.id, id))
      .returning();
    return updated;
  }

  async deletePayrollPeriod(id: number): Promise<void> {
    await db.delete(payrollPeriods).where(eq(payrollPeriods.id, id));
  }

  async getPayrollPeriodsForDateRange(startDate: string, endDate: string): Promise<PayrollPeriod[]> {
    return await db
      .select()
      .from(payrollPeriods)
      .where(
        and(
          gte(payrollPeriods.startDate, startDate),
          lte(payrollPeriods.endDate, endDate)
        )
      )
      .orderBy(desc(payrollPeriods.startDate));
  }

  // Core Payroll Calculation Methods
  async calculateHoursFromTimeEntries(timeEntries: any[]): Promise<{
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
    totalHours: number;
    totalBreakMinutes: number;
  }> {
    let totalMinutes = 0;
    let totalBreakMinutes = 0;

    for (const entry of timeEntries) {
      if (entry.clockOutTime && entry.totalWorkedMinutes) {
        totalMinutes += entry.totalWorkedMinutes;
        totalBreakMinutes += entry.totalBreakMinutes || 0;
      }
    }

    const totalHours = totalMinutes / 60;
    
    // Calculate overtime (over 40 hours per week)
    let regularHours = Math.min(totalHours, 40);
    let overtimeHours = Math.max(totalHours - 40, 0);
    let doubleTimeHours = 0;

    // Double time after 60 hours (if applicable)
    if (totalHours > 60) {
      doubleTimeHours = totalHours - 60;
      overtimeHours = 20; // Hours 40-60
    }

    return {
      regularHours: Number(regularHours.toFixed(2)),
      overtimeHours: Number(overtimeHours.toFixed(2)),
      doubleTimeHours: Number(doubleTimeHours.toFixed(2)),
      totalHours: Number(totalHours.toFixed(2)),
      totalBreakMinutes: totalBreakMinutes
    };
  }

  async calculatePayrollForEmployee(userId: string, startDate: string, endDate: string): Promise<{
    regularHours: number;
    overtimeHours: number;
    doubleTimeHours: number;
    totalHours: number;
    regularPay: number;
    overtimePay: number;
    doubleTimePay: number;
    grossPay: number;
    netPay: number;
    timeEntries: any[];
  }> {
    // Get user's hourly rate
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const hourlyRate = parseFloat(user.hourlyRate || '0');
    if (hourlyRate === 0) {
      throw new Error('User does not have a valid hourly rate');
    }

    // Get time entries for date range
    const timeEntries = await this.getTimeEntriesByDateRange(userId, startDate, endDate);

    // Calculate hours breakdown
    const hoursBreakdown = await this.calculateHoursFromTimeEntries(timeEntries);

    // Calculate pay amounts
    const regularPay = hoursBreakdown.regularHours * hourlyRate;
    const overtimePay = hoursBreakdown.overtimeHours * (hourlyRate * 1.5); // 1.5x overtime
    const doubleTimePay = hoursBreakdown.doubleTimeHours * (hourlyRate * 2.0); // 2x double time
    const grossPay = regularPay + overtimePay + doubleTimePay;

    // Basic tax estimation (this would be more complex in real implementation)
    const federalTaxRate = 0.12; // 12% federal
    const stateTaxRate = 0.05; // 5% state  
    const socialSecurityRate = 0.062; // 6.2%
    const medicareRate = 0.0145; // 1.45%

    const federalTax = grossPay * federalTaxRate;
    const stateTax = grossPay * stateTaxRate;
    const socialSecurityTax = grossPay * socialSecurityRate;
    const medicareTax = grossPay * medicareRate;
    const totalTaxes = federalTax + stateTax + socialSecurityTax + medicareTax;
    
    const netPay = grossPay - totalTaxes;

    return {
      regularHours: hoursBreakdown.regularHours,
      overtimeHours: hoursBreakdown.overtimeHours,
      doubleTimeHours: hoursBreakdown.doubleTimeHours,
      totalHours: hoursBreakdown.totalHours,
      regularPay: Number(regularPay.toFixed(2)),
      overtimePay: Number(overtimePay.toFixed(2)),
      doubleTimePay: Number(doubleTimePay.toFixed(2)),
      grossPay: Number(grossPay.toFixed(2)),
      netPay: Number(netPay.toFixed(2)),
      timeEntries: timeEntries
    };
  }

  async calculatePayrollForDateRange(startDate: string, endDate: string, userId?: string): Promise<{
    totalGrossPay: number;
    totalNetPay: number;
    totalHours: number;
    employeePayroll: Array<{
      userId: string;
      firstName: string;
      lastName: string;
      regularHours: number;
      overtimeHours: number;
      grossPay: number;
      netPay: number;
    }>;
  }> {
    let users: User[];

    if (userId) {
      const user = await this.getUser(userId);
      users = user ? [user] : [];
    } else {
      users = await this.getAllUsers();
    }

    // Filter users with hourly rates
    const hourlyUsers = users.filter(user => user.hourlyRate && parseFloat(user.hourlyRate) > 0);

    const employeePayroll = [];
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalHours = 0;

    for (const user of hourlyUsers) {
      try {
        const payrollData = await this.calculatePayrollForEmployee(user.id, startDate, endDate);
        
        employeePayroll.push({
          userId: user.id,
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          regularHours: payrollData.regularHours,
          overtimeHours: payrollData.overtimeHours,
          grossPay: payrollData.grossPay,
          netPay: payrollData.netPay,
        });

        totalGrossPay += payrollData.grossPay;
        totalNetPay += payrollData.netPay;
        totalHours += payrollData.totalHours;
      } catch (error) {
        console.error(`Error calculating payroll for user ${user.id}:`, error);
        // Continue with other employees
      }
    }

    return {
      totalGrossPay: Number(totalGrossPay.toFixed(2)),
      totalNetPay: Number(totalNetPay.toFixed(2)),
      totalHours: Number(totalHours.toFixed(2)),
      employeePayroll
    };
  }

  async calculatePayrollForPeriod(periodId: number): Promise<{ 
    totalGrossPay: number; 
    totalNetPay: number; 
    totalTaxes: number; 
    totalDeductions: number; 
    employeeCount: number;
    entries: PayrollEntry[];
  }> {
    const period = await this.getPayrollPeriod(periodId);
    if (!period) {
      throw new Error('Payroll period not found');
    }

    const payrollData = await this.calculatePayrollForDateRange(
      period.startDate, 
      period.endDate
    );

    // Get existing entries for this period
    const entries = await this.getPayrollEntries(periodId);

    // Calculate totals - for now using basic tax calculations
    const totalGrossPay = payrollData.totalGrossPay;
    const totalTaxes = totalGrossPay * 0.25; // 25% total tax rate estimate
    const totalDeductions = 0; // Would include insurance, 401k, etc.
    const totalNetPay = totalGrossPay - totalTaxes - totalDeductions;

    // Update period totals - Note: these fields may not exist in the schema
    // await this.updatePayrollPeriod(periodId, {
    //   totalGrossPay: totalGrossPay.toString(),
    //   totalNetPay: totalNetPay.toString(),
    //   totalTaxes: totalTaxes.toString(),
    //   totalDeductions: totalDeductions.toString(),
    // });

    return {
      totalGrossPay,
      totalNetPay,
      totalTaxes,
      totalDeductions,
      employeeCount: payrollData.employeePayroll.length,
      entries
    };
  }

  // Payroll Entry Management
  async createPayrollEntry(entry: InsertPayrollEntry): Promise<PayrollEntry> {
    const [created] = await db
      .insert(payrollEntries)
      .values({
        ...entry,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  async getPayrollEntries(payrollPeriodId?: number, userId?: string): Promise<PayrollEntry[]> {
    let query = db
      .select({
        id: payrollEntries.id,
        payrollPeriodId: payrollEntries.payrollPeriodId,
        userId: payrollEntries.userId,
        locationId: payrollEntries.locationId,
        regularHours: payrollEntries.regularHours,
        overtimeHours: payrollEntries.overtimeHours,
        doubleTimeHours: payrollEntries.doubleTimeHours,
        totalHours: payrollEntries.totalHours,
        regularRate: payrollEntries.regularRate,
        overtimeRate: payrollEntries.overtimeRate,
        doubleTimeRate: payrollEntries.doubleTimeRate,
        regularPay: payrollEntries.regularPay,
        overtimePay: payrollEntries.overtimePay,
        doubleTimePay: payrollEntries.doubleTimePay,
        grossPay: payrollEntries.grossPay,
        federalTax: payrollEntries.federalTax,
        stateTax: payrollEntries.stateTax,
        socialSecurityTax: payrollEntries.socialSecurityTax,
        medicareTax: payrollEntries.medicareTax,
        unemploymentTax: payrollEntries.unemploymentTax,
        totalTaxes: payrollEntries.totalTaxes,
        healthInsurance: payrollEntries.healthInsurance,
        dentalInsurance: payrollEntries.dentalInsurance,
        visionInsurance: payrollEntries.visionInsurance,
        retirement401k: payrollEntries.retirement401k,
        otherDeductions: payrollEntries.otherDeductions,
        totalDeductions: payrollEntries.totalDeductions,
        netPay: payrollEntries.netPay,
        timeEntryIds: payrollEntries.timeEntryIds,
        adjustments: payrollEntries.adjustments,
        notes: payrollEntries.notes,
        isApproved: payrollEntries.isApproved,
        approvedBy: payrollEntries.approvedBy,
        approvedAt: payrollEntries.approvedAt,
        createdAt: payrollEntries.createdAt,
        updatedAt: payrollEntries.updatedAt,
        // Include user details
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        employeeId: users.employeeId,
      })
      .from(payrollEntries)
      .leftJoin(users, eq(payrollEntries.userId, users.id));

    const conditions = [];
    
    if (payrollPeriodId) {
      conditions.push(eq(payrollEntries.payrollPeriodId, payrollPeriodId));
    }
    
    if (userId) {
      conditions.push(eq(payrollEntries.userId, userId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(payrollEntries.createdAt));
  }

  async getPayrollEntry(id: number): Promise<PayrollEntry | undefined> {
    const [entry] = await db
      .select()
      .from(payrollEntries)
      .where(eq(payrollEntries.id, id));
    return entry;
  }

  async updatePayrollEntry(id: number, updates: Partial<InsertPayrollEntry>): Promise<PayrollEntry> {
    const [updated] = await db
      .update(payrollEntries)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(payrollEntries.id, id))
      .returning();
    return updated;
  }

  async deletePayrollEntry(id: number): Promise<void> {
    await db.delete(payrollEntries).where(eq(payrollEntries.id, id));
  }

  async approvePayrollEntry(id: number, approvedBy: string): Promise<PayrollEntry> {
    const [approved] = await db
      .update(payrollEntries)
      .set({
        isApproved: true,
        approvedBy: approvedBy,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrollEntries.id, id))
      .returning();
    return approved;
  }

  async getPayrollEntriesForEmployee(userId: string, limit?: number): Promise<PayrollEntry[]> {
    let query: any = db
      .select()
      .from(payrollEntries)
      .where(eq(payrollEntries.userId, userId))
      .orderBy(desc(payrollEntries.createdAt));
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query;
  }

  // Payroll Time Entry Links
  async createPayrollTimeEntry(entry: InsertPayrollTimeEntry): Promise<PayrollTimeEntry> {
    const [created] = await db
      .insert(payrollTimeEntries)
      .values({
        ...entry,
        createdAt: new Date(),
      })
      .returning();
    return created;
  }

  async getPayrollTimeEntries(payrollEntryId: number): Promise<PayrollTimeEntry[]> {
    return await db
      .select()
      .from(payrollTimeEntries)
      .where(eq(payrollTimeEntries.payrollEntryId, payrollEntryId))
      .orderBy(payrollTimeEntries.timeClockEntryId);
  }

  async deletePayrollTimeEntry(id: number): Promise<void> {
    await db.delete(payrollTimeEntries).where(eq(payrollTimeEntries.id, id));
  }

  // Payroll Processing
  async processPayrollPeriod(periodId: number, processedBy: string): Promise<PayrollPeriod> {
    const [processed] = await db
      .update(payrollPeriods)
      .set({
        status: 'processed',
        processedBy: processedBy,
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(payrollPeriods.id, periodId))
      .returning();
    return processed;
  }

  async generatePayrollJournalEntries(periodId: number): Promise<PayrollJournalEntry[]> {
    const period = await this.getPayrollPeriod(periodId);
    if (!period) {
      throw new Error('Payroll period not found');
    }

    const entries = await this.getPayrollEntries(periodId);
    const journalEntries: PayrollJournalEntry[] = [];

    // Calculate totals
    let totalGrossPay = 0;
    let totalTaxes = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    for (const entry of entries) {
      totalGrossPay += parseFloat(entry.grossPay || '0');
      totalTaxes += parseFloat(entry.totalTaxes || '0');
      totalDeductions += parseFloat(entry.totalDeductions || '0');
      totalNetPay += parseFloat(entry.netPay || '0');
    }

    // Create journal entries
    const journalData = [
      // Debit: Payroll Expense
      {
        payrollPeriodId: periodId,
        entryType: 'gross_wages',
        account: 'Payroll Expense',
        debitAmount: totalGrossPay.toString(),
        creditAmount: '0.00',
        description: `Payroll expense for period ${period.startDate} to ${period.endDate}`,
      },
      // Credit: Taxes Payable
      {
        payrollPeriodId: periodId,
        entryType: 'taxes_payable',
        account: 'Payroll Taxes Payable',
        debitAmount: '0.00',
        creditAmount: totalTaxes.toString(),
        description: `Payroll taxes payable for period ${period.startDate} to ${period.endDate}`,
      },
      // Credit: Deductions Payable (if any)
      {
        payrollPeriodId: periodId,
        entryType: 'deductions_payable',
        account: 'Employee Deductions Payable',
        debitAmount: '0.00',
        creditAmount: totalDeductions.toString(),
        description: `Employee deductions payable for period ${period.startDate} to ${period.endDate}`,
      },
      // Credit: Net Pay Liability
      {
        payrollPeriodId: periodId,
        entryType: 'net_pay_liability',
        account: 'Wages Payable',
        debitAmount: '0.00',
        creditAmount: totalNetPay.toString(),
        description: `Net wages payable for period ${period.startDate} to ${period.endDate}`,
      },
    ];

    for (const entryData of journalData) {
      const [created] = await db
        .insert(payrollJournalEntries)
        .values({
          ...entryData,
          createdAt: new Date(),
        })
        .returning();
      journalEntries.push(created);
    }

    return journalEntries;
  }

  async markPayrollPeriodAsPaid(periodId: number): Promise<PayrollPeriod> {
    const [paid] = await db
      .update(payrollPeriods)
      .set({
        status: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(payrollPeriods.id, periodId))
      .returning();
    return paid;
  }

  // Integration with Time Clock
  async getUnprocessedTimeEntries(startDate: string, endDate: string): Promise<any[]> {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    // Get time entries that haven't been processed into payroll yet
    const processedEntryIds = await db
      .select({ timeClockEntryId: payrollTimeEntries.timeClockEntryId })
      .from(payrollTimeEntries);

    const processedIds = processedEntryIds.map(p => p.timeClockEntryId);

    let query = db
      .select({
        id: timeClockEntries.id,
        userId: timeClockEntries.userId,
        firstName: users.firstName,
        lastName: users.lastName,
        hourlyRate: users.hourlyRate,
        clockInTime: timeClockEntries.clockInTime,
        clockOutTime: timeClockEntries.clockOutTime,
        totalWorkedMinutes: timeClockEntries.totalWorkedMinutes,
        totalBreakMinutes: timeClockEntries.totalBreakMinutes,
        status: timeClockEntries.status,
        locationId: timeClockEntries.locationId,
      })
      .from(timeClockEntries)
      .leftJoin(users, eq(timeClockEntries.userId, users.id))
      .where(
        and(
          gte(timeClockEntries.clockInTime, start),
          lte(timeClockEntries.clockInTime, end),
          eq(timeClockEntries.status, 'clocked_out'),
          isNotNull(timeClockEntries.clockOutTime)
        )
      );

    if (processedIds.length > 0) {
      query = (query as any).where(
        and(
          gte(timeClockEntries.clockInTime, start),
          lte(timeClockEntries.clockInTime, end),
          eq(timeClockEntries.status, 'clocked_out'),
          isNotNull(timeClockEntries.clockOutTime),
          sql`${timeClockEntries.id} NOT IN (${processedIds.join(',')})`
        )
      );
    }

    return await query.orderBy(timeClockEntries.clockInTime);
  }

  async markTimeEntriesAsProcessed(timeEntryIds: number[], payrollEntryId: number): Promise<void> {
    for (const timeEntryId of timeEntryIds) {
      // Get the time entry to calculate hours and pay
      const [timeEntry] = await db
        .select()
        .from(timeClockEntries)
        .leftJoin(users, eq(timeClockEntries.userId, users.id))
        .where(eq(timeClockEntries.id, timeEntryId));

      if (timeEntry) {
        const hoursWorked = (timeEntry.time_clock_entries.totalWorkedMinutes || 0) / 60;
        const hourlyRate = parseFloat(timeEntry.users?.hourlyRate || '0');
        
        let payType = 'regular';
        let actualRate = hourlyRate;
        
        // Determine pay type and rate
        if (hoursWorked > 60) {
          payType = 'double_time';
          actualRate = hourlyRate * 2;
        } else if (hoursWorked > 40) {
          payType = 'overtime';
          actualRate = hourlyRate * 1.5;
        }

        await this.createPayrollTimeEntry({
          payrollEntryId: payrollEntryId,
          timeClockEntryId: timeEntryId,
          hoursWorked: hoursWorked.toString(),
          hourlyRate: actualRate.toString(),
          payAmount: (hoursWorked * actualRate).toString(),
          payType: payType,
        });
      }
    }
  }

  // Payroll Reports and Analytics
  async getPayrollSummaryByMonth(year: number, month: number): Promise<{
    totalGrossPay: string;
    totalNetPay: string;
    totalTaxes: string;
    totalDeductions: string;
    employeeCount: number;
    avgHoursPerEmployee: number;
    overtimePercentage: number;
    departmentBreakdown: Array<{ department: string; totalPay: string; employeeCount: number }>;
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const periods = await db
      .select()
      .from(payrollPeriods)
      .where(
        and(
          gte(payrollPeriods.startDate, startDate.toISOString().split('T')[0]),
          lte(payrollPeriods.endDate, endDate.toISOString().split('T')[0])
        )
      );

    if (periods.length === 0) {
      return {
        totalGrossPay: '0.00',
        totalNetPay: '0.00',
        totalTaxes: '0.00',
        totalDeductions: '0.00',
        employeeCount: 0,
        avgHoursPerEmployee: 0,
        overtimePercentage: 0,
        departmentBreakdown: [],
      };
    }

    // Calculate totals from all periods in the month
    let totalGrossPay = 0;
    let totalNetPay = 0;
    let totalTaxes = 0;
    let totalDeductions = 0;
    let totalHours = 0;
    let totalOvertimeHours = 0;
    const uniqueEmployees = new Set();
    const departmentTotals = new Map();

    for (const period of periods) {
      const entries = await this.getPayrollEntries(period.id);
      
      for (const entry of entries) {
        totalGrossPay += parseFloat(entry.grossPay || '0');
        totalNetPay += parseFloat(entry.netPay || '0');
        totalTaxes += parseFloat(entry.totalTaxes || '0');
        totalDeductions += parseFloat(entry.totalDeductions || '0');
        totalHours += parseFloat(entry.totalHours || '0');
        totalOvertimeHours += parseFloat(entry.overtimeHours || '0');
        uniqueEmployees.add(entry.userId);

        // Get user department for breakdown
        const user = await this.getUser(entry.userId);
        const department = user?.department || 'Unknown' as string;
        
        if (!departmentTotals.has(department)) {
          departmentTotals.set(department, { totalPay: 0, employees: new Set() });
        }
        
        const deptData = departmentTotals.get(department);
        deptData.totalPay += parseFloat(entry.grossPay || '0');
        deptData.employees.add(entry.userId);
      }
    }

    const departmentBreakdown = Array.from(departmentTotals.entries()).map(([dept, data]) => ({
      department: dept,
      totalPay: data.totalPay.toFixed(2),
      employeeCount: data.employees.size,
    }));

    return {
      totalGrossPay: totalGrossPay.toFixed(2),
      totalNetPay: totalNetPay.toFixed(2),
      totalTaxes: totalTaxes.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      employeeCount: uniqueEmployees.size,
      avgHoursPerEmployee: uniqueEmployees.size > 0 ? Number((totalHours / uniqueEmployees.size).toFixed(2)) : 0,
      overtimePercentage: totalHours > 0 ? Number(((totalOvertimeHours / totalHours) * 100).toFixed(2)) : 0,
      departmentBreakdown,
    };
  }

  async getPayrollAnalytics(startDate: string, endDate: string): Promise<{
    totalPayroll: string;
    avgPayPerEmployee: string;
    overtimeHours: number;
    regularHours: number;
    topEarners: Array<{ userId: string; name: string; totalPay: string }>;
    departmentCosts: Array<{ department: string; cost: string; percentage: number }>;
  }> {
    const payrollData = await this.calculatePayrollForDateRange(startDate, endDate);
    
    const topEarners = payrollData.employeePayroll
      .sort((a, b) => b.grossPay - a.grossPay)
      .slice(0, 5)
      .map(emp => ({
        userId: emp.userId,
        name: `${emp.firstName} ${emp.lastName}`,
        totalPay: emp.grossPay.toFixed(2),
      }));

    // Calculate department costs
    const departmentTotals = new Map();
    let totalOvertimeHours = 0;
    let totalRegularHours = 0;

    for (const emp of payrollData.employeePayroll) {
      const user = await this.getUser(emp.userId);
      const department = user?.department || 'Unknown';
      
      if (!departmentTotals.has(department)) {
        departmentTotals.set(department, 0);
      }
      
      departmentTotals.set(department, departmentTotals.get(department) + emp.grossPay);
      totalOvertimeHours += emp.overtimeHours;
      totalRegularHours += emp.regularHours;
    }

    const departmentCosts = Array.from(departmentTotals.entries()).map(([dept, cost]) => ({
      department: dept,
      cost: cost.toFixed(2),
      percentage: payrollData.totalGrossPay > 0 ? Number(((cost / payrollData.totalGrossPay) * 100).toFixed(2)) : 0,
    }));

    return {
      totalPayroll: payrollData.totalGrossPay.toFixed(2),
      avgPayPerEmployee: payrollData.employeePayroll.length > 0 ? 
        (payrollData.totalGrossPay / payrollData.employeePayroll.length).toFixed(2) : '0.00',
      overtimeHours: Number(totalOvertimeHours.toFixed(2)),
      regularHours: Number(totalRegularHours.toFixed(2)),
      topEarners,
      departmentCosts,
    };
  }

  async getEmployeePayHistory(userId: string, limit?: number): Promise<Array<{
    periodId: number;
    startDate: string;
    endDate: string;
    totalHours: number;
    grossPay: string;
    netPay: string;
    status: string;
  }>> {
    let query: any = db
      .select({
        periodId: payrollPeriods.id,
        startDate: payrollPeriods.startDate,
        endDate: payrollPeriods.endDate,
        totalHours: payrollEntries.totalHours,
        grossPay: payrollEntries.grossPay,
        netPay: payrollEntries.netPay,
        status: payrollPeriods.status,
      })
      .from(payrollEntries)
      .innerJoin(payrollPeriods, eq(payrollEntries.payrollPeriodId, payrollPeriods.id))
      .where(eq(payrollEntries.userId, userId))
      .orderBy(desc(payrollPeriods.endDate));

    if (limit) {
      query = query.limit(limit);
    }

    const results = await query;

    return results.map((r: any) => ({
      periodId: r.periodId,
      startDate: r.startDate,
      endDate: r.endDate,
      totalHours: parseFloat(r.totalHours || '0'),
      grossPay: r.grossPay || '0.00',
      netPay: r.netPay || '0.00',
      status: r.status,
    }));
  }

  // Payroll Validation
  async validatePayrollCalculations(periodId: number): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    summary: { totalEmployees: number; totalHours: number; totalPay: string };
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const period = await this.getPayrollPeriod(periodId);
    if (!period) {
      errors.push('Payroll period not found');
      return {
        isValid: false,
        errors,
        warnings,
        summary: { totalEmployees: 0, totalHours: 0, totalPay: '0.00' }
      };
    }

    const entries = await this.getPayrollEntries(periodId);
    
    let totalEmployees = 0;
    let totalHours = 0;
    let totalPay = 0;

    for (const entry of entries) {
      totalEmployees++;
      
      const hours = parseFloat(entry.totalHours || '0');
      const grossPay = parseFloat(entry.grossPay || '0');
      
      totalHours += hours;
      totalPay += grossPay;

      // Validation checks
      const employeeName = `${(entry as any).firstName || 'Unknown'} ${(entry as any).lastName || ''}`;
      
      if (hours > 80) {
        warnings.push(`Employee ${employeeName} has ${hours} hours (>80 hours)`);
      }

      if (hours > 100) {
        errors.push(`Employee ${employeeName} has ${hours} hours (>100 hours - likely error)`);
      }

      if (grossPay < 0) {
        errors.push(`Employee ${employeeName} has negative gross pay: $${grossPay}`);
      }

      const user = await this.getUser(entry.userId);
      if (!user?.hourlyRate || parseFloat(user.hourlyRate) <= 0) {
        errors.push(`Employee ${employeeName} has invalid hourly rate`);
      }

      // Check overtime calculations
      const overtimeHours = parseFloat(entry.overtimeHours || '0');
      if (hours > 40 && overtimeHours === 0) {
        warnings.push(`Employee ${employeeName} has ${hours} hours but no overtime calculated`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalEmployees,
        totalHours: Number(totalHours.toFixed(2)),
        totalPay: totalPay.toFixed(2)
      }
    };
  }

  // ================================
  // MERCHANT MANAGEMENT STORAGE OPERATIONS (Required for Order FK References)
  // ================================

  async createMerchant(merchant: InsertMerchant): Promise<Merchant> {
    try {
      const [result] = await db.insert(merchants).values(merchant).returning();
      return result;
    } catch (error) {
      console.error('Error creating merchant:', error);
      throw error;
    }
  }

  async getMerchants(channel?: string): Promise<Merchant[]> {
    try {
      if (channel) {
        return await db.select().from(merchants).where(eq(merchants.channel, channel));
      }
      return await db.select().from(merchants);
    } catch (error) {
      console.error('Error getting merchants:', error);
      throw error;
    }
  }

  async getMerchant(id: number): Promise<Merchant | undefined> {
    try {
      const [result] = await db.select().from(merchants).where(eq(merchants.id, id));
      return result;
    } catch (error) {
      console.error('Error getting merchant:', error);
      throw error;
    }
  }

  async getMerchantByExternalId(merchantId: string, channel: string): Promise<Merchant | undefined> {
    try {
      const [result] = await db.select().from(merchants)
        .where(and(eq(merchants.merchantId, merchantId), eq(merchants.channel, channel)));
      return result;
    } catch (error) {
      console.error('Error getting merchant by external ID:', error);
      throw error;
    }
  }

  async updateMerchant(id: number, updates: Partial<InsertMerchant>): Promise<Merchant> {
    try {
      const [result] = await db.update(merchants)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(merchants.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating merchant:', error);
      throw error;
    }
  }

  async deleteMerchant(id: number): Promise<void> {
    try {
      await db.delete(merchants).where(eq(merchants.id, id));
    } catch (error) {
      console.error('Error deleting merchant:', error);
      throw error;
    }
  }

  // Atomic upsert method using unique constraint (merchantId, channel)
  async upsertMerchant(merchant: InsertMerchant): Promise<{ merchant: Merchant; operation: 'created' | 'updated' }> {
    try {
      console.log(`💾 Atomic upsert for merchant ${merchant.merchantId} on channel ${merchant.channel}`);
      
      // Prepare the merchant data with updatedAt timestamp for updates
      const merchantData = { ...merchant };
      const updateData = { ...merchant, updatedAt: new Date() };
      
      // Use Drizzle's onConflictDoUpdate for atomic upsert
      const [result] = await db
        .insert(merchants)
        .values(merchantData)
        .onConflictDoUpdate({
          target: [merchants.merchantId, merchants.channel],
          set: updateData,
        })
        .returning();

      // Assert that we got a result (should never be null but defensive programming)
      if (!result) {
        throw new Error(`Atomic upsert failed: No result returned for merchant ${merchant.merchantId}`);
      }

      // Determine if this was a create or update operation
      const isNew = (result.createdAt ?? new Date()).getTime() === (result.updatedAt ?? new Date()).getTime();
      const operation = isNew ? 'created' : 'updated';

      console.log(`✅ Merchant ${merchant.merchantId} was ${operation} (DB ID: ${result.id})`);
      return { merchant: result, operation };
    } catch (error) {
      console.error(`❌ Merchant upsert failed for ${merchant.merchantId}:`, error);
      throw error;
    }
  }

  // ================================
  // ORDER MANAGEMENT STORAGE OPERATIONS (Required for Sync Service)
  // ================================

  // Basic Order CRUD Operations
  async createOrder(order: InsertOrder): Promise<Order> {
    try {
      const [result] = await db.insert(orders).values(order).returning();
      return result;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  // Atomic upsert method using unique constraint (merchantId, externalOrderId, channel)
  async upsertOrder(order: InsertOrder): Promise<{ order: Order; operation: 'created' | 'updated' }> {
    try {
      console.log(`💾 Atomic upsert for order ${order.externalOrderId} on merchant ${order.merchantId}, channel ${order.channel}`);
      
      // Prepare the order data with updatedAt timestamp for updates
      const orderData = { ...order };
      const updateData = { ...order, updatedAt: new Date() };
      
      // Use Drizzle's onConflictDoUpdate for atomic upsert
      const [result] = await db
        .insert(orders)
        .values(orderData)
        .onConflictDoUpdate({
          target: [orders.merchantId, orders.externalOrderId, orders.channel],
          set: updateData,
        })
        .returning();

      // Assert that we got a result (should never be null but defensive programming)
      if (!result) {
        throw new Error(`Atomic upsert failed: No result returned for order ${order.externalOrderId}`);
      }

      // Determine if this was a create or update operation
      // If the createdAt and updatedAt timestamps are the same (within 1 second), it was created
      const wasCreated = !result.updatedAt || 
        Math.abs(new Date(result.createdAt ?? new Date()).getTime() - new Date(result.updatedAt ?? new Date()).getTime()) < 1000;
      
      const operation = wasCreated ? 'created' : 'updated';
      
      console.log(`✅ Atomic upsert completed: order ${order.externalOrderId} was ${operation}`);
      
      return { order: result, operation };
    } catch (error) {
      console.error(`❌ Atomic upsert failed for order ${order.externalOrderId}:`, error);
      throw new Error(`Atomic upsert failed for order ${order.externalOrderId}: ${error instanceof Error ? error.message : 'Database operation failed'}`);
    }
  }

  // Get orders with comprehensive filtering from database
  async getOrders(filters: {
    merchantId?: number;
    locationId?: number;
    channel?: string;
    startDate?: string;
    endDate?: string;
    createdTimeMin?: number;
    createdTimeMax?: number;
    orderState?: string;
    paymentState?: string;
    customerId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ orders: Order[]; total: number }> {
    try {
      console.log('🚀 [DATABASE QUERY] Starting optimized database query for orders');
      const startTime = Date.now();

      // Build the WHERE conditions
      const conditions = [];
      
      if (filters.merchantId) {
        conditions.push(eq(orders.merchantId, filters.merchantId));
      }
      
      if (filters.locationId) {
        conditions.push(eq(orders.locationId, filters.locationId));
      }
      
      if (filters.channel) {
        conditions.push(eq(orders.channel, filters.channel));
      }
      
      if (filters.orderState) {
        conditions.push(eq(orders.orderState, filters.orderState));
      }
      
      if (filters.paymentState) {
        conditions.push(eq(orders.paymentState, filters.paymentState));
      }
      
      if (filters.customerId) {
        conditions.push(eq(orders.customerId, filters.customerId));
      }

      // Date filtering - prefer epoch milliseconds for precise timezone-aware filtering
      if (filters.createdTimeMin && filters.createdTimeMax) {
        const startDate = new Date(filters.createdTimeMin);
        const endDate = new Date(filters.createdTimeMax);
        conditions.push(gte(orders.createdTime, startDate));
        conditions.push(lte(orders.createdTime, endDate));
        
        console.log('🌍 [DATABASE] Using epoch milliseconds for filtering:', {
          createdTimeMin: filters.createdTimeMin,
          createdTimeMax: filters.createdTimeMax,
          startUTC: startDate.toISOString(),
          endUTC: endDate.toISOString()
        });
      } else if (filters.startDate && filters.endDate) {
        // Fallback to date strings
        const startDate = new Date(filters.startDate + 'T00:00:00.000Z');
        const endDate = new Date(filters.endDate + 'T23:59:59.999Z');
        conditions.push(gte(orders.createdTime, startDate));
        conditions.push(lte(orders.createdTime, endDate));
      }

      // Search functionality
      if (filters.search) {
        conditions.push(
          or(
            like(orders.customerName, `%${filters.search}%`),
            like(orders.customerEmail, `%${filters.search}%`),
            like(orders.externalOrderId, `%${filters.search}%`),
            like(orders.orderNumber, `%${filters.search}%`)
          )
        );
      }

      const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;
      
      // Get total count
      let countQuery = db
        .select({ count: sql<number>`COUNT(*)::integer` })
        .from(orders);
      
      if (whereCondition) {
        countQuery = countQuery.where(whereCondition) as any;
      }
      
      const [{ count: total }] = await countQuery;
      
      // Get orders with pagination (select specific columns to avoid missing field errors)
      let ordersQuery: any = db
        .select({
          id: orders.id,
          merchantId: orders.merchantId,
          locationId: orders.locationId,
          externalOrderId: orders.externalOrderId,
          channel: orders.channel,
          orderNumber: orders.orderNumber,
          customerReference: orders.customerReference,
          createdTime: orders.createdTime,
          modifiedTime: orders.modifiedTime,
          orderDate: orders.orderDate,
          orderState: orders.orderState,
          paymentState: orders.paymentState,
          fulfillmentStatus: orders.fulfillmentStatus,
          customerId: orders.customerId,
          customerName: orders.customerName,
          customerEmail: orders.customerEmail,
          customerPhone: orders.customerPhone,
          subtotal: orders.subtotal,
          taxAmount: orders.taxAmount,
          tipAmount: orders.tipAmount,
          discountAmount: orders.discountAmount,
          shippingAmount: orders.shippingAmount,
          total: orders.total,
          orderCogs: orders.orderCogs,
          orderGrossMargin: orders.orderGrossMargin,
          orderType: orders.orderType,
          orderSource: orders.orderSource,
          deviceId: orders.deviceId,
          employeeId: orders.employeeId,
          notes: orders.notes,
          tags: orders.tags,
          lastSyncAt: orders.lastSyncAt,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt
        })
        .from(orders)
        .orderBy(desc(orders.createdTime));
      
      if (whereCondition) {
        ordersQuery = ordersQuery.where(whereCondition) as any;
      }
      
      if (filters.limit) {
        ordersQuery = ordersQuery.limit(filters.limit);
      }
      
      if (filters.offset) {
        ordersQuery = ordersQuery.offset(filters.offset);
      }
      
      const orderResults = await ordersQuery;
      
      const queryTime = Date.now() - startTime;
      console.log(`🚀 [DATABASE QUERY] Completed in ${queryTime}ms, found ${orderResults.length} orders`);
      
      return {
        orders: orderResults as any,
        total
      };
    } catch (error) {
      console.error('Error getting orders from database:', error);
      return {
        orders: [],
        total: 0
      };
    }
  }

  async getOrder(id: number): Promise<Order | undefined> {
    try {
      const [result] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, id))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error getting order:', error);
      return undefined;
    }
  }

  async getOrderByExternalId(externalOrderId: string, channel: string): Promise<Order | undefined> {
    try {
      const [result] = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.externalOrderId, externalOrderId),
          eq(orders.channel, channel)
        ))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error getting order by external ID:', error);
      return undefined;
    }
  }

  async updateOrder(id: number | string, updates: Partial<InsertOrder> | any): Promise<Order | any> {
    try {
      // Handle the string overload (legacy Clover API compatibility)
      if (typeof id === 'string') {
        // This is the legacy signature for Clover sync
        const orderId = id;
        const updateData: any = {};
        if ('state' in updates) updateData.orderState = updates.state;
        if ('paymentState' in updates) updateData.paymentState = updates.paymentState;
        if ('note' in updates) updateData.notes = updates.note;
        if ('modifiedTime' in updates) updateData.modifiedTime = new Date(updates.modifiedTime);
        
        const [result] = await db
          .update(orders)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(orders.externalOrderId, orderId))
          .returning();
        return result;
      }
      
      // Handle the number overload (standard database ID)
      const [result] = await db
        .update(orders)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating order:', error);
      throw error;
    }
  }

  async getOrdersByMerchantAndDateRange(merchantId: number, startDate: Date, endDate: Date): Promise<Order[]> {
    try {
      return await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.merchantId, merchantId),
          gte(orders.orderDate, startDate.toISOString().split('T')[0]),
          lte(orders.orderDate, endDate.toISOString().split('T')[0])
        ))
        .orderBy(asc(orders.createdTime));
    } catch (error) {
      console.error('Error getting orders by merchant and date range:', error);
      return [];
    }
  }

  // Order Line Items Operations
  async getOrderLineItemByExternalId(externalLineItemId: string): Promise<OrderLineItem | undefined> {
    try {
      const [result] = await db
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.externalLineItemId, externalLineItemId))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error getting order line item by external ID:', error);
      return undefined;
    }
  }

  // Payment Operations  
  async getOrderPayments(orderId: number): Promise<Payment[]> {
    return this.getPayments(orderId);
  }

  async getPaymentByExternalId(externalPaymentId: string): Promise<Payment | undefined> {
    try {
      const [result] = await db
        .select()
        .from(payments)
        .where(eq(payments.externalPaymentId, externalPaymentId))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error getting payment by external ID:', error);
      return undefined;
    }
  }

  // Discount Operations
  async getOrderDiscounts(orderId: string): Promise<Discount[]> {
    try {
      return await db
        .select()
        .from(discounts)
        .where(eq(discounts.orderId, parseInt(orderId)))
        .orderBy(asc(discounts.createdAt));
    } catch (error) {
      console.error('Error getting order discounts:', error);
      return [];
    }
  }

  async getDiscountByExternalId(externalDiscountId: string): Promise<Discount | undefined> {
    try {
      const [result] = await db
        .select()
        .from(discounts)
        .where(eq(discounts.id, parseInt(externalDiscountId)))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error getting discount by external ID:', error);
      return undefined;
    }
  }

  // Refund Operations
  async getOrderRefunds(orderId: number): Promise<Refund[]> {
    try {
      return await db
        .select()
        .from(refunds)
        .where(eq(refunds.orderId, orderId))
        .orderBy(asc(refunds.createdAt));
    } catch (error) {
      console.error('Error getting order refunds:', error);
      return [];
    }
  }
  
  async getRefunds(orderId?: number): Promise<Refund[]> {
    try {
      if (orderId) {
        return await db
          .select()
          .from(refunds)
          .where(eq(refunds.orderId, orderId))
          .orderBy(asc(refunds.createdAt));
      } else {
        return await db
          .select()
          .from(refunds)
          .orderBy(desc(refunds.createdAt));
      }
    } catch (error) {
      console.error('Error getting refunds:', error);
      return [];
    }
  }

  async getRefundByExternalId(externalRefundId: string): Promise<Refund | undefined> {
    try {
      const [result] = await db
        .select()
        .from(refunds)
        .where(eq(refunds.externalRefundId, externalRefundId))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error getting refund by external ID:', error);
      return undefined;
    }
  }

  // Item Cost History Operations
  async getLatestItemCost(itemId: string, merchantId: number): Promise<ItemCostHistory | undefined> {
    try {
      const [result] = await db
        .select()
        .from(itemCostHistory)
        .where(and(
          eq(itemCostHistory.itemId, parseInt(itemId)),
          eq(itemCostHistory.merchantId, merchantId)
        ))
        .orderBy(desc(itemCostHistory.effectiveFrom))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error getting latest item cost:', error);
      return undefined;
    }
  }

  // Daily Sales Operations
  async getDailySalesByMerchantAndDate(merchantId: number, date: string): Promise<DailySales | undefined> {
    try {
      const [result] = await db
        .select()
        .from(dailySales)
        .where(and(
          eq(dailySales.merchantId, merchantId),
          eq(dailySales.date, date)
        ))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error getting daily sales by merchant and date:', error);
      return undefined;
    }
  }

  // ================================
  // MISSING BASIC CRUD OPERATIONS
  // ================================

  // These methods need to be implemented but were missing from the class
  async createOrderLineItem(lineItem: InsertOrderLineItem): Promise<OrderLineItem> {
    try {
      const [result] = await db.insert(orderLineItems).values(lineItem).returning();
      return result;
    } catch (error) {
      console.error('Error creating order line item:', error);
      throw error;
    }
  }

  async getOrderLineItems(orderId: number | string): Promise<OrderLineItem[] | any[]> {
    try {
      // Handle string overload (externalOrderId for Clover API compatibility)
      if (typeof orderId === 'string') {
        const order = await db
          .select()
          .from(orders)
          .where(eq(orders.externalOrderId, orderId))
          .limit(1);
        
        if (!order || order.length === 0) return [];
        
        return await db
          .select()
          .from(orderLineItems)
          .where(eq(orderLineItems.orderId, order[0].id))
          .orderBy(asc(orderLineItems.createdAt));
      }
      
      // Handle number overload (database ID)
      return await db
        .select()
        .from(orderLineItems)
        .where(eq(orderLineItems.orderId, orderId))
        .orderBy(asc(orderLineItems.createdAt));
    } catch (error) {
      console.error('Error getting order line items:', error);
      return [];
    }
  }

  async updateOrderLineItem(id: number, updates: Partial<InsertOrderLineItem>): Promise<OrderLineItem> {
    try {
      const [result] = await db
        .update(orderLineItems)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(orderLineItems.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating order line item:', error);
      throw error;
    }
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    try {
      const [result] = await db.insert(payments).values(payment).returning();
      return result;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async getPayments(orderId: number): Promise<Payment[]> {
    try {
      return await db
        .select()
        .from(payments)
        .where(eq(payments.orderId, orderId))
        .orderBy(asc(payments.createdTime));
    } catch (error) {
      console.error('Error getting payments:', error);
      return [];
    }
  }

  async updatePayment(id: number, updates: Partial<InsertPayment>): Promise<Payment> {
    try {
      const [result] = await db
        .update(payments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(payments.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating payment:', error);
      throw error;
    }
  }

  async createDiscount(discount: InsertDiscount): Promise<Discount> {
    try {
      const [result] = await db.insert(discounts).values(discount).returning();
      return result;
    } catch (error) {
      console.error('Error creating discount:', error);
      throw error;
    }
  }

  async updateDiscount(id: number, updates: Partial<InsertDiscount>): Promise<Discount> {
    try {
      const [result] = await db
        .update(discounts)
        .set(updates)
        .where(eq(discounts.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating discount:', error);
      throw error;
    }
  }

  async createRefund(refund: InsertRefund): Promise<Refund> {
    try {
      const [result] = await db.insert(refunds).values(refund).returning();
      return result;
    } catch (error) {
      console.error('Error creating refund:', error);
      throw error;
    }
  }

  async updateRefund(id: number, updates: Partial<InsertRefund>): Promise<Refund> {
    try {
      const [result] = await db
        .update(refunds)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(refunds.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating refund:', error);
      throw error;
    }
  }

  // Sync Cursor Operations (if not already implemented)
  async createSyncCursor(cursor: InsertSyncCursor): Promise<SyncCursor> {
    try {
      const [result] = await db.insert(syncCursors).values(cursor).returning();
      return result;
    } catch (error) {
      console.error('Error creating sync cursor:', error);
      throw error;
    }
  }

  async getSyncCursor(system: string, merchantId: number | null, dataType: string): Promise<SyncCursor | undefined> {
    try {
      const [result] = await db
        .select()
        .from(syncCursors)
        .where(and(
          eq(syncCursors.system, system),
          merchantId ? eq(syncCursors.merchantId, merchantId) : isNull(syncCursors.merchantId),
          eq(syncCursors.dataType, dataType)
        ))
        .limit(1);
      return result;
    } catch (error) {
      console.error('Error getting sync cursor:', error);
      return undefined;
    }
  }

  async updateSyncCursor(id: number, updates: Partial<InsertSyncCursor>): Promise<SyncCursor> {
    try {
      const [result] = await db
        .update(syncCursors)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(syncCursors.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating sync cursor:', error);
      throw error;
    }
  }

  async getSyncCursors(system?: string, merchantId?: number): Promise<SyncCursor[]> {
    try {
      let query: any = db.select().from(syncCursors);
      
      const conditions = [];
      if (system) {
        conditions.push(eq(syncCursors.system, system));
      }
      if (merchantId) {
        conditions.push(eq(syncCursors.merchantId, merchantId));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      return await query.orderBy(desc(syncCursors.createdAt));
    } catch (error) {
      console.error('Error getting sync cursors:', error);
      return [];
    }
  }

  // Daily Sales Operations
  async createDailySales(dailySalesData: InsertDailySales): Promise<DailySales> {
    try {
      const [result] = await db.insert(dailySales).values(dailySalesData).returning();
      return result;
    } catch (error) {
      console.error('Error creating daily sales:', error);
      throw error;
    }
  }

  async updateDailySales(id: number, updates: Partial<InsertDailySales>): Promise<DailySales> {
    try {
      const [result] = await db
        .update(dailySales)
        .set({ ...updates, lastUpdatedAt: new Date() })
        .where(eq(dailySales.id, id))
        .returning();
      return result;
    } catch (error) {
      console.error('Error updating daily sales:', error);
      throw error;
    }
  }

  // ================================
  // HISTORICAL DATA ACCESS IMPLEMENTATIONS
  // ================================

  async getHistoricalAnalytics(filters: {
    startDate: string;
    endDate: string;
    locationId?: number | string;
    merchantId?: number;
    groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    timezone?: string;
  }): Promise<{
    analytics: Array<{
      period: string;
      periodStart: string;
      periodEnd: string;
      totalOrders: number;
      totalRevenue: number;
      totalDiscounts: number;
      totalRefunds: number;
      totalTax: number;
      totalCOGS: number;
      totalProfit: number;
      averageOrderValue: number;
      profitMargin: number;
      growth?: {
        revenueGrowth: number;
        orderGrowth: number;
        aovGrowth: number;
      };
    }>;
    summary: {
      totalOrders: number;
      totalRevenue: number;
      totalProfit: number;
      averageOrderValue: number;
      totalPeriods: number;
      dateRange: {
        start: string;
        end: string;
        days: number;
      };
    };
  }> {
    try {
      const startTime = Date.now();
      const { groupBy = 'month', timezone = 'UTC' } = filters;
      
      console.log(`🔍 Historical Analytics Query: ${filters.startDate} to ${filters.endDate}, groupBy: ${groupBy}`);

      // Get historical order data optimized for large date ranges
      const orderData = await this.getOrdersFromCloverAPI({
        startDate: filters.startDate,
        endDate: filters.endDate,
        locationId: filters.locationId,
        search: undefined,
        state: 'all',
        limit: 50000, // Increased limit for historical data
        offset: 0
      });

      const { orders } = orderData;
      console.log(`📊 Processing ${orders.length} historical orders for analytics`);

      if (orders.length === 0) {
        return {
          analytics: [],
          summary: {
            totalOrders: 0,
            totalRevenue: 0,
            totalProfit: 0,
            averageOrderValue: 0,
            totalPeriods: 0,
            dateRange: {
              start: filters.startDate,
              end: filters.endDate,
              days: Math.ceil((new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime()) / (1000 * 60 * 60 * 24))
            }
          }
        };
      }

      // Group orders by the specified period
      const groupedData = new Map<string, {
        periodStart: Date;
        periodEnd: Date;
        totalOrders: number;
        totalRevenue: number;
        totalDiscounts: number;
        totalRefunds: number;
        totalTax: number;
        totalCOGS: number;
        totalProfit: number;
      }>();

      // Helper function to get period key and bounds
      const getPeriodInfo = (date: Date) => {
        let periodKey: string;
        let periodStart: Date;
        let periodEnd: Date;

        switch (groupBy) {
          case 'day':
            periodKey = date.toISOString().split('T')[0];
            periodStart = new Date(date);
            periodStart.setHours(0, 0, 0, 0);
            periodEnd = new Date(date);
            periodEnd.setHours(23, 59, 59, 999);
            break;
          case 'week':
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            weekStart.setHours(0, 0, 0, 0);
            periodKey = weekStart.toISOString().split('T')[0] + '_week';
            periodStart = weekStart;
            periodEnd = new Date(weekStart);
            periodEnd.setDate(weekStart.getDate() + 6);
            periodEnd.setHours(23, 59, 59, 999);
            break;
          case 'month':
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
            periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
            break;
          case 'quarter':
            const quarter = Math.floor(date.getMonth() / 3) + 1;
            periodKey = `${date.getFullYear()}-Q${quarter}`;
            periodStart = new Date(date.getFullYear(), (quarter - 1) * 3, 1);
            periodEnd = new Date(date.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
            break;
          case 'year':
            periodKey = date.getFullYear().toString();
            periodStart = new Date(date.getFullYear(), 0, 1);
            periodEnd = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
            break;
          default:
            // Default to month
            periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
            periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
        }

        return { periodKey, periodStart, periodEnd };
      };

      // Process each order into period groups
      for (const order of orders) {
        const orderDate = new Date(order.createdTime || order.modifiedTime);
        if (isNaN(orderDate.getTime())) continue;

        const { periodKey, periodStart, periodEnd } = getPeriodInfo(orderDate);

        // Initialize period if not exists
        if (!groupedData.has(periodKey)) {
          groupedData.set(periodKey, {
            periodStart,
            periodEnd,
            totalOrders: 0,
            totalRevenue: 0,
            totalDiscounts: 0,
            totalRefunds: 0,
            totalTax: 0,
            totalCOGS: 0,
            totalProfit: 0,
          });
        }

        const group = groupedData.get(periodKey)!;
        
        // Handle refunds vs regular orders
        const isRefund = order.total < 0 || order.state === 'refunded';
        
        if (isRefund) {
          group.totalRefunds += Math.abs(order.totalRefunds || order.total || 0) / 100;
        } else {
          group.totalOrders += 1;
          group.totalRevenue += (order.total || 0) / 100; // Convert cents to dollars
          group.totalDiscounts += (order.totalDiscounts || 0) / 100;
          group.totalTax += (order.grossTax || order.taxAmount || 0) / 100;
          group.totalCOGS += (order.netCOGS || 0) / 100;
          group.totalProfit += (order.netProfit || 0) / 100;
        }
      }

      // Convert to analytics array with growth calculations
      const sortedPeriods = Array.from(groupedData.entries())
        .sort(([a], [b]) => a.localeCompare(b));

      const analytics = sortedPeriods.map(([periodKey, data], index) => {
        let growth: { revenueGrowth: number; orderGrowth: number; aovGrowth: number } | undefined;
        
        // Calculate growth vs previous period
        if (index > 0) {
          const prevData = sortedPeriods[index - 1][1];
          const revenueGrowth = prevData.totalRevenue > 0 
            ? ((data.totalRevenue - prevData.totalRevenue) / prevData.totalRevenue) * 100 
            : 0;
          const orderGrowth = prevData.totalOrders > 0 
            ? ((data.totalOrders - prevData.totalOrders) / prevData.totalOrders) * 100 
            : 0;
          const currentAOV = data.totalOrders > 0 ? data.totalRevenue / data.totalOrders : 0;
          const prevAOV = prevData.totalOrders > 0 ? prevData.totalRevenue / prevData.totalOrders : 0;
          const aovGrowth = prevAOV > 0 ? ((currentAOV - prevAOV) / prevAOV) * 100 : 0;

          growth = {
            revenueGrowth: parseFloat(revenueGrowth.toFixed(2)),
            orderGrowth: parseFloat(orderGrowth.toFixed(2)),
            aovGrowth: parseFloat(aovGrowth.toFixed(2))
          };
        }

        return {
          period: periodKey,
          periodStart: data.periodStart.toISOString(),
          periodEnd: data.periodEnd.toISOString(),
          totalOrders: data.totalOrders,
          totalRevenue: parseFloat(data.totalRevenue.toFixed(2)),
          totalDiscounts: parseFloat(data.totalDiscounts.toFixed(2)),
          totalRefunds: parseFloat(data.totalRefunds.toFixed(2)),
          totalTax: parseFloat(data.totalTax.toFixed(2)),
          totalCOGS: parseFloat(data.totalCOGS.toFixed(2)),
          totalProfit: parseFloat(data.totalProfit.toFixed(2)),
          averageOrderValue: data.totalOrders > 0 ? parseFloat((data.totalRevenue / data.totalOrders).toFixed(2)) : 0,
          profitMargin: data.totalRevenue > 0 ? parseFloat(((data.totalProfit / data.totalRevenue) * 100).toFixed(2)) : 0,
          growth
        };
      });

      // Calculate summary
      const summary = {
        totalOrders: analytics.reduce((sum, p) => sum + p.totalOrders, 0),
        totalRevenue: parseFloat(analytics.reduce((sum, p) => sum + p.totalRevenue, 0).toFixed(2)),
        totalProfit: parseFloat(analytics.reduce((sum, p) => sum + p.totalProfit, 0).toFixed(2)),
        averageOrderValue: 0,
        totalPeriods: analytics.length,
        dateRange: {
          start: filters.startDate,
          end: filters.endDate,
          days: Math.ceil((new Date(filters.endDate).getTime() - new Date(filters.startDate).getTime()) / (1000 * 60 * 60 * 24))
        }
      };

      summary.averageOrderValue = summary.totalOrders > 0 
        ? parseFloat((summary.totalRevenue / summary.totalOrders).toFixed(2)) 
        : 0;

      const queryTime = Date.now() - startTime;
      console.log(`🚀 Historical Analytics completed in ${queryTime}ms for ${analytics.length} periods`);

      return { analytics, summary };

    } catch (error) {
      console.error('Error in getHistoricalAnalytics:', error);
      throw error;
    }
  }

  async getYearOverYearComparison(filters: {
    currentPeriodStart: string;
    currentPeriodEnd: string;
    comparisonPeriodStart: string;
    comparisonPeriodEnd: string;
    locationId?: number | string;
    merchantId?: number;
    groupBy?: 'day' | 'week' | 'month';
  }): Promise<{
    current: {
      totalOrders: number;
      totalRevenue: number;
      totalProfit: number;
      averageOrderValue: number;
    };
    comparison: {
      totalOrders: number;
      totalRevenue: number;
      totalProfit: number;
      averageOrderValue: number;
    };
    growth: {
      revenueGrowth: number;
      orderGrowth: number;
      profitGrowth: number;
      aovGrowth: number;
    };
    breakdown: Array<{
      period: string;
      current: {
        orders: number;
        revenue: number;
        profit: number;
      };
      comparison: {
        orders: number;
        revenue: number;
        profit: number;
      };
      growth: {
        revenueGrowth: number;
        orderGrowth: number;
        profitGrowth: number;
      };
    }>;
  }> {
    try {
      console.log(`🔄 Year-over-Year Comparison: Current ${filters.currentPeriodStart} to ${filters.currentPeriodEnd} vs Comparison ${filters.comparisonPeriodStart} to ${filters.comparisonPeriodEnd}`);

      // Get data for both periods simultaneously
      const [currentData, comparisonData] = await Promise.all([
        this.getHistoricalAnalytics({
          startDate: filters.currentPeriodStart,
          endDate: filters.currentPeriodEnd,
          locationId: filters.locationId,
          merchantId: filters.merchantId,
          groupBy: filters.groupBy || 'month'
        }),
        this.getHistoricalAnalytics({
          startDate: filters.comparisonPeriodStart,
          endDate: filters.comparisonPeriodEnd,
          locationId: filters.locationId,
          merchantId: filters.merchantId,
          groupBy: filters.groupBy || 'month'
        })
      ]);

      // Calculate overall growth metrics
      const calculateGrowth = (current: number, comparison: number): number => {
        return comparison > 0 ? parseFloat(((current - comparison) / comparison * 100).toFixed(2)) : 0;
      };

      const growth = {
        revenueGrowth: calculateGrowth(currentData.summary.totalRevenue, comparisonData.summary.totalRevenue),
        orderGrowth: calculateGrowth(currentData.summary.totalOrders, comparisonData.summary.totalOrders),
        profitGrowth: calculateGrowth(currentData.summary.totalProfit, comparisonData.summary.totalProfit),
        aovGrowth: calculateGrowth(currentData.summary.averageOrderValue, comparisonData.summary.averageOrderValue)
      };

      // Create breakdown by matching periods
      const breakdown = [];
      const currentPeriods = new Map(currentData.analytics.map(p => [p.period, p]));
      const comparisonPeriods = new Map(comparisonData.analytics.map(p => [p.period, p]));

      // Get all unique periods
      const allPeriods = new Set([...Array.from(currentPeriods.keys()), ...Array.from(comparisonPeriods.keys())]);

      for (const period of Array.from(allPeriods)) {
        const current = currentPeriods.get(period);
        const comparison = comparisonPeriods.get(period);

        breakdown.push({
          period,
          current: {
            orders: current?.totalOrders || 0,
            revenue: current?.totalRevenue || 0,
            profit: current?.totalProfit || 0
          },
          comparison: {
            orders: comparison?.totalOrders || 0,
            revenue: comparison?.totalRevenue || 0,
            profit: comparison?.totalProfit || 0
          },
          growth: {
            revenueGrowth: calculateGrowth(current?.totalRevenue || 0, comparison?.totalRevenue || 0),
            orderGrowth: calculateGrowth(current?.totalOrders || 0, comparison?.totalOrders || 0),
            profitGrowth: calculateGrowth(current?.totalProfit || 0, comparison?.totalProfit || 0)
          }
        });
      }

      // Sort breakdown by period
      breakdown.sort((a, b) => a.period.localeCompare(b.period));

      return {
        current: {
          totalOrders: currentData.summary.totalOrders,
          totalRevenue: currentData.summary.totalRevenue,
          totalProfit: currentData.summary.totalProfit,
          averageOrderValue: currentData.summary.averageOrderValue
        },
        comparison: {
          totalOrders: comparisonData.summary.totalOrders,
          totalRevenue: comparisonData.summary.totalRevenue,
          totalProfit: comparisonData.summary.totalProfit,
          averageOrderValue: comparisonData.summary.averageOrderValue
        },
        growth,
        breakdown
      };

    } catch (error) {
      console.error('Error in getYearOverYearComparison:', error);
      throw error;
    }
  }

  async getHistoricalTrends(filters: {
    startDate: string;
    endDate: string;
    locationId?: number | string;
    merchantId?: number;
    trendType: 'revenue' | 'orders' | 'profit' | 'aov' | 'all';
    granularity?: 'daily' | 'weekly' | 'monthly';
  }): Promise<{
    trends: Array<{
      date: string;
      value: number;
      movingAverage?: number;
      seasonalIndex?: number;
      trendDirection?: 'up' | 'down' | 'stable';
    }>;
    summary: {
      overallTrend: 'up' | 'down' | 'stable';
      averageGrowthRate: number;
      bestPeriod: { date: string; value: number };
      worstPeriod: { date: string; value: number };
      volatility: number;
    };
  }> {
    try {
      const { trendType, granularity = 'monthly' } = filters;
      
      console.log(`📈 Historical Trends Analysis: ${trendType} trend, ${granularity} granularity`);

      // Get historical analytics data
      const groupByMap = {
        'daily': 'day' as const,
        'weekly': 'week' as const,
        'monthly': 'month' as const
      };

      const analyticsData = await this.getHistoricalAnalytics({
        startDate: filters.startDate,
        endDate: filters.endDate,
        locationId: filters.locationId,
        merchantId: filters.merchantId,
        groupBy: groupByMap[granularity]
      });

      if (analyticsData.analytics.length === 0) {
        return {
          trends: [],
          summary: {
            overallTrend: 'stable',
            averageGrowthRate: 0,
            bestPeriod: { date: '', value: 0 },
            worstPeriod: { date: '', value: 0 },
            volatility: 0
          }
        };
      }

      // Extract the specific metric values
      const getMetricValue = (period: typeof analyticsData.analytics[0]) => {
        switch (trendType) {
          case 'revenue': return period.totalRevenue;
          case 'orders': return period.totalOrders;
          case 'profit': return period.totalProfit;
          case 'aov': return period.averageOrderValue;
          default: return period.totalRevenue;
        }
      };

      // Calculate moving averages and trends
      const rawTrends = analyticsData.analytics.map((period, index) => {
        const value = getMetricValue(period);
        
        // Calculate 3-period moving average
        let movingAverage: number | undefined;
        if (index >= 2) {
          const prev2 = getMetricValue(analyticsData.analytics[index - 2]);
          const prev1 = getMetricValue(analyticsData.analytics[index - 1]);
          movingAverage = parseFloat(((prev2 + prev1 + value) / 3).toFixed(2));
        }

        // Calculate trend direction
        let trendDirection: 'up' | 'down' | 'stable' = 'stable';
        if (index > 0) {
          const prevValue = getMetricValue(analyticsData.analytics[index - 1]);
          const change = value - prevValue;
          const changePercent = prevValue > 0 ? (change / prevValue) * 100 : 0;
          
          if (changePercent > 5) trendDirection = 'up';
          else if (changePercent < -5) trendDirection = 'down';
        }

        return {
          date: period.period,
          value: parseFloat(value.toFixed(2)),
          movingAverage,
          trendDirection
        };
      });

      // Calculate summary statistics
      const values = rawTrends.map(t => t.value);
      const bestPeriod = rawTrends.reduce((max, trend) => 
        trend.value > max.value ? trend : max, rawTrends[0]);
      const worstPeriod = rawTrends.reduce((min, trend) => 
        trend.value < min.value ? trend : min, rawTrends[0]);

      // Calculate average growth rate
      let totalGrowthRate = 0;
      let growthPeriods = 0;
      for (let i = 1; i < rawTrends.length; i++) {
        const prevValue = rawTrends[i - 1].value;
        const currentValue = rawTrends[i].value;
        if (prevValue > 0) {
          totalGrowthRate += ((currentValue - prevValue) / prevValue) * 100;
          growthPeriods++;
        }
      }
      const averageGrowthRate = growthPeriods > 0 ? parseFloat((totalGrowthRate / growthPeriods).toFixed(2)) : 0;

      // Calculate volatility (standard deviation)
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const volatility = parseFloat(Math.sqrt(variance).toFixed(2));

      // Determine overall trend
      let overallTrend: 'up' | 'down' | 'stable' = 'stable';
      if (averageGrowthRate > 2) overallTrend = 'up';
      else if (averageGrowthRate < -2) overallTrend = 'down';

      return {
        trends: rawTrends,
        summary: {
          overallTrend,
          averageGrowthRate,
          bestPeriod: { date: bestPeriod.date, value: bestPeriod.value },
          worstPeriod: { date: worstPeriod.date, value: worstPeriod.value },
          volatility
        }
      };

    } catch (error) {
      console.error('Error in getHistoricalTrends:', error);
      throw error;
    }
  }

  async getLongTermFinancialPerformance(filters: {
    startDate: string;
    endDate: string;
    locationId?: number | string;
    merchantId?: number;
  }): Promise<{
    annualPerformance: Array<{
      year: string;
      totalRevenue: number;
      totalProfit: number;
      totalOrders: number;
      averageOrderValue: number;
      profitMargin: number;
      growth: {
        revenueGrowth: number;
        profitGrowth: number;
        orderGrowth: number;
      };
    }>;
    quarterlyBreakdown: Array<{
      quarter: string;
      year: string;
      totalRevenue: number;
      totalProfit: number;
      totalOrders: number;
      seasonalityIndex: number;
    }>;
    keyMetrics: {
      averageAnnualGrowth: number;
      bestYear: { year: string; revenue: number };
      bestQuarter: { quarter: string; year: string; revenue: number };
      totalYearsAnalyzed: number;
    };
  }> {
    try {
      console.log(`💼 Long-term Financial Performance Analysis: ${filters.startDate} to ${filters.endDate}`);

      // Get yearly and quarterly data
      const [yearlyData, quarterlyData] = await Promise.all([
        this.getHistoricalAnalytics({
          startDate: filters.startDate,
          endDate: filters.endDate,
          locationId: filters.locationId,
          merchantId: filters.merchantId,
          groupBy: 'year'
        }),
        this.getHistoricalAnalytics({
          startDate: filters.startDate,
          endDate: filters.endDate,
          locationId: filters.locationId,
          merchantId: filters.merchantId,
          groupBy: 'quarter'
        })
      ]);

      // Process annual performance with growth calculations
      const annualPerformance = yearlyData.analytics.map((year, index) => {
        let growth = { revenueGrowth: 0, profitGrowth: 0, orderGrowth: 0 };
        
        if (index > 0) {
          const prevYear = yearlyData.analytics[index - 1];
          growth = {
            revenueGrowth: prevYear.totalRevenue > 0 
              ? parseFloat(((year.totalRevenue - prevYear.totalRevenue) / prevYear.totalRevenue * 100).toFixed(2))
              : 0,
            profitGrowth: prevYear.totalProfit > 0 
              ? parseFloat(((year.totalProfit - prevYear.totalProfit) / prevYear.totalProfit * 100).toFixed(2))
              : 0,
            orderGrowth: prevYear.totalOrders > 0 
              ? parseFloat(((year.totalOrders - prevYear.totalOrders) / prevYear.totalOrders * 100).toFixed(2))
              : 0
          };
        }

        return {
          year: year.period,
          totalRevenue: year.totalRevenue,
          totalProfit: year.totalProfit,
          totalOrders: year.totalOrders,
          averageOrderValue: year.averageOrderValue,
          profitMargin: year.profitMargin,
          growth
        };
      });

      // Calculate average quarterly revenue for seasonality index
      const avgQuarterlyRevenue = quarterlyData.summary.totalRevenue / quarterlyData.analytics.length;

      // Process quarterly breakdown with seasonality
      const quarterlyBreakdown = quarterlyData.analytics.map(quarter => {
        const seasonalityIndex = avgQuarterlyRevenue > 0 
          ? parseFloat((quarter.totalRevenue / avgQuarterlyRevenue).toFixed(2))
          : 1;

        return {
          quarter: quarter.period,
          year: quarter.period.split('-')[0], // Extract year from quarter format (YYYY-QX)
          totalRevenue: quarter.totalRevenue,
          totalProfit: quarter.totalProfit,
          totalOrders: quarter.totalOrders,
          seasonalityIndex
        };
      });

      // Calculate key metrics
      const bestYear = annualPerformance.reduce((best, year) => 
        year.totalRevenue > best.totalRevenue ? year : best, annualPerformance[0]);
        
      const bestQuarter = quarterlyBreakdown.reduce((best, quarter) => 
        quarter.totalRevenue > best.totalRevenue ? quarter : best, quarterlyBreakdown[0]);

      // Calculate average annual growth
      const revenueGrowths = annualPerformance.slice(1).map(year => year.growth.revenueGrowth);
      const averageAnnualGrowth = revenueGrowths.length > 0 
        ? parseFloat((revenueGrowths.reduce((sum, growth) => sum + growth, 0) / revenueGrowths.length).toFixed(2))
        : 0;

      return {
        annualPerformance,
        quarterlyBreakdown,
        keyMetrics: {
          averageAnnualGrowth,
          bestYear: { year: bestYear?.year || '', revenue: bestYear?.totalRevenue || 0 },
          bestQuarter: { 
            quarter: bestQuarter?.quarter || '', 
            year: bestQuarter?.year || '', 
            revenue: bestQuarter?.totalRevenue || 0 
          },
          totalYearsAnalyzed: annualPerformance.length
        }
      };

    } catch (error) {
      console.error('Error in getLongTermFinancialPerformance:', error);
      throw error;
    }
  }

  async getOptimizedHistoricalData(filters: {
    startDate: string;
    endDate: string;
    locationId?: number | string;
    merchantId?: number;
    aggregationLevel: 'daily' | 'weekly' | 'monthly';
    metrics: ('revenue' | 'orders' | 'profit' | 'items' | 'customers')[];
    useCache?: boolean;
    limit?: number;
  }): Promise<{
    data: Array<{
      period: string;
      metrics: Record<string, number>;
    }>;
    metadata: {
      totalRecords: number;
      queryTime: number;
      cacheHit: boolean;
      dateRange: { start: string; end: string };
    };
  }> {
    try {
      const startTime = Date.now();
      const { aggregationLevel, metrics, limit = 10000, useCache = false } = filters;
      
      console.log(`⚡ Optimized Historical Data Query: ${aggregationLevel} aggregation, metrics: ${metrics.join(', ')}`);

      // Map aggregation level to groupBy parameter
      const groupByMap = {
        'daily': 'day' as const,
        'weekly': 'week' as const,
        'monthly': 'month' as const
      };

      // Get base analytics data
      const analyticsData = await this.getHistoricalAnalytics({
        startDate: filters.startDate,
        endDate: filters.endDate,
        locationId: filters.locationId,
        merchantId: filters.merchantId,
        groupBy: groupByMap[aggregationLevel]
      });

      // Extract only requested metrics to minimize data transfer
      const optimizedData = analyticsData.analytics.slice(0, limit).map(period => {
        const periodMetrics: Record<string, number> = {};
        
        for (const metric of metrics) {
          switch (metric) {
            case 'revenue':
              periodMetrics.revenue = period.totalRevenue;
              break;
            case 'orders':
              periodMetrics.orders = period.totalOrders;
              break;
            case 'profit':
              periodMetrics.profit = period.totalProfit;
              break;
            case 'items':
              // Estimate items from orders (could be enhanced with actual item counts)
              periodMetrics.items = period.totalOrders * 2.5; // Average items per order
              break;
            case 'customers':
              // Estimate unique customers (could be enhanced with actual customer tracking)
              periodMetrics.customers = Math.round(period.totalOrders * 0.8); // Assuming some repeat customers
              break;
          }
        }

        return {
          period: period.period,
          metrics: periodMetrics
        };
      });

      const queryTime = Date.now() - startTime;

      return {
        data: optimizedData,
        metadata: {
          totalRecords: optimizedData.length,
          queryTime,
          cacheHit: false, // Could implement Redis caching later
          dateRange: {
            start: filters.startDate,
            end: filters.endDate
          }
        }
      };

    } catch (error) {
      console.error('Error in getOptimizedHistoricalData:', error);
      throw error;
    }
  }

  // Task Management Implementations
  async createTask(taskData: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values([taskData as any])
      .returning();
    return task;
  }

  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasksByAssignee(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByCreator(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.createdBy, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByStatus(status: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.status, status))
      .orderBy(desc(tasks.createdAt));
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task> {
    console.log('📝 updateTask called with:', JSON.stringify({ id, taskData }, null, 2));
    
    const updateData: any = {
      ...taskData,
      updatedAt: new Date(),
      ...(taskData.status === 'completed' && !taskData.completedAt ? { completedAt: new Date() } : {}),
    };
    
    if (taskData.steps) {
      updateData.steps = taskData.steps as any;
    }
    
    console.log('📝 Update data being sent to DB:', JSON.stringify(updateData, null, 2));
    
    const [task] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, id))
      .returning();
      
    console.log('📝 Task returned from DB:', JSON.stringify(task, null, 2));
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Task Notes Implementations
  async createTaskNote(noteData: InsertTaskNote): Promise<TaskNote> {
    const [note] = await db
      .insert(taskNotes)
      .values({
        ...noteData,
        createdAt: new Date(),
      })
      .returning();
    return note;
  }

  async getTaskNotes(taskId: number): Promise<TaskNote[]> {
    return await db
      .select()
      .from(taskNotes)
      .where(eq(taskNotes.taskId, taskId))
      .orderBy(asc(taskNotes.createdAt));
  }

  async deleteTaskNote(id: number): Promise<void> {
    await db.delete(taskNotes).where(eq(taskNotes.id, id));
  }

  // AI Training Generation Job Operations
  async createGenerationJob(job: InsertTrainingGenerationJob): Promise<TrainingGenerationJob> {
    const jobData: any = { ...job };
    if (job.generatedContent) {
      jobData.generatedContent = job.generatedContent as any;
    }
    const [result] = await db.insert(trainingGenerationJobs).values([jobData]).returning();
    return result;
  }

  async getGenerationJobById(id: number): Promise<TrainingGenerationJob | undefined> {
    const [job] = await db
      .select()
      .from(trainingGenerationJobs)
      .where(eq(trainingGenerationJobs.id, id));
    return job;
  }

  async getGenerationJobsByModuleId(moduleId: number): Promise<TrainingGenerationJob[]> {
    return db
      .select()
      .from(trainingGenerationJobs)
      .where(eq(trainingGenerationJobs.moduleId, moduleId))
      .orderBy(desc(trainingGenerationJobs.createdAt));
  }

  async getAllGenerationJobs(): Promise<TrainingGenerationJob[]> {
    return db
      .select()
      .from(trainingGenerationJobs)
      .orderBy(desc(trainingGenerationJobs.createdAt));
  }

  async updateGenerationJobStatus(id: number, status: string, errorMessage?: string | null): Promise<TrainingGenerationJob> {
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    if (errorMessage !== undefined) {
      updateData.errorMessage = errorMessage;
    }

    const [updated] = await db
      .update(trainingGenerationJobs)
      .set(updateData)
      .where(eq(trainingGenerationJobs.id, id))
      .returning();

    return updated;
  }

  async updateGenerationJobResults(id: number, results: any): Promise<TrainingGenerationJob> {
    const [updated] = await db
      .update(trainingGenerationJobs)
      .set({
        generatedContent: results,
        updatedAt: new Date(),
      })
      .where(eq(trainingGenerationJobs.id, id))
      .returning();

    return updated;
  }

  async updateGenerationJobContent(id: number, content: any): Promise<TrainingGenerationJob> {
    const [updated] = await db
      .update(trainingGenerationJobs)
      .set({
        generatedContent: content,
        updatedAt: new Date(),
      })
      .where(eq(trainingGenerationJobs.id, id))
      .returning();

    return updated;
  }

  // Employee Purchase alias method
  async getEmployeePurchaseUsersWithSpending(periodMonth: string): Promise<any[]> {
    return this.getAllUsersWithPurchaseData(periodMonth);
  }

  // ================================
  // ITEM MANAGEMENT METHODS
  // ================================

  async createItem(item: InsertItem): Promise<Item> {
    const [created] = await db.insert(items).values(item).returning();
    return created;
  }

  async getItems(merchantId: number, filters?: { 
    channel?: string; 
    category?: string; 
    isActive?: boolean; 
    search?: string; 
  }): Promise<Item[]> {
    const conditions = [eq(items.merchantId, merchantId)];
    
    if (filters?.channel) {
      conditions.push(eq(items.channel, filters.channel));
    }
    if (filters?.category) {
      conditions.push(eq(items.category, filters.category));
    }
    if (filters?.isActive !== undefined) {
      conditions.push(eq(items.isActive, filters.isActive));
    }
    if (filters?.search) {
      conditions.push(
        or(
          like(items.name, `%${filters.search}%`),
          like(items.sku, `%${filters.search}%`)
        )!
      );
    }

    return await db.select().from(items).where(and(...conditions));
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async getItemByExternalId(merchantId: number, externalItemId: string, channel: string): Promise<Item | undefined> {
    const [item] = await db
      .select()
      .from(items)
      .where(
        and(
          eq(items.merchantId, merchantId),
          eq(items.externalItemId, externalItemId),
          eq(items.channel, channel)
        )
      );
    return item;
  }

  async updateItem(id: number, updates: Partial<InsertItem>): Promise<Item> {
    const [updated] = await db
      .update(items)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return updated;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }

  async syncItems(merchantId: number, channel: string, itemsToSync: InsertItem[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const item of itemsToSync) {
      const existing = await this.getItemByExternalId(merchantId, item.externalItemId, channel);
      if (existing) {
        await this.updateItem(existing.id, item);
        updated++;
      } else {
        await this.createItem(item);
        created++;
      }
    }

    return { created, updated };
  }

  // ================================
  // ADDITIONAL ORDER MANAGEMENT METHODS
  // ================================

  async deleteOrder(id: number): Promise<void> {
    await db.delete(orders).where(eq(orders.id, id));
  }

  async syncOrders(merchantId: number, channel: string, ordersToSync: InsertOrder[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const order of ordersToSync) {
      const result = await this.upsertOrder(order);
      if (result.operation === 'created') {
        created++;
      } else {
        updated++;
      }
    }

    return { created, updated };
  }

  async getOrderLineItem(id: number): Promise<OrderLineItem | undefined> {
    const [lineItem] = await db.select().from(orderLineItems).where(eq(orderLineItems.id, id));
    return lineItem;
  }

  async deleteOrderLineItem(id: number): Promise<void> {
    await db.delete(orderLineItems).where(eq(orderLineItems.id, id));
  }

  async syncOrderLineItems(orderId: number, lineItemsToSync: InsertOrderLineItem[]): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const lineItem of lineItemsToSync) {
      if (lineItem.externalLineItemId) {
        const existing = await this.getOrderLineItemByExternalId(lineItem.externalLineItemId);
        if (existing) {
          await this.updateOrderLineItem(existing.id, lineItem);
          updated++;
        } else {
          await this.createOrderLineItem(lineItem);
          created++;
        }
      } else {
        await this.createOrderLineItem(lineItem);
        created++;
      }
    }

    return { created, updated };
  }

  // ================================
  // TAX MANAGEMENT METHODS (Non-duplicated)
  // ================================

  async createTax(tax: InsertTax): Promise<Tax> {
    const [created] = await db.insert(taxes).values(tax).returning();
    return created;
  }

  async getTaxes(orderId?: number, lineItemId?: number): Promise<Tax[]> {
    const conditions = [];
    if (orderId) conditions.push(eq(taxes.orderId, orderId));
    if (lineItemId) conditions.push(eq(taxes.lineItemId, lineItemId));
    
    if (conditions.length === 0) {
      return await db.select().from(taxes);
    }
    
    return await db.select().from(taxes).where(and(...conditions));
  }

  async getTax(id: number): Promise<Tax | undefined> {
    const [tax] = await db.select().from(taxes).where(eq(taxes.id, id));
    return tax;
  }

  async updateTax(id: number, updates: Partial<InsertTax>): Promise<Tax> {
    const [updated] = await db
      .update(taxes)
      .set(updates)
      .where(eq(taxes.id, id))
      .returning();
    return updated;
  }

  async deleteTax(id: number): Promise<void> {
    await db.delete(taxes).where(eq(taxes.id, id));
  }

  // ================================
  // (Duplicates removed: Payment, Discount, Refund sections)
  // ================================

  async getRefundAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    merchantId?: number;
    locationId?: number;
    channel?: string;
  }): Promise<{
    totalRefunds: number;
    totalRefundAmount: number;
    refundsByReason: Array<{ reason: string; count: number; amount: number }>;
  }> {
    const conditions = [];
    
    if (filters.startDate) {
      conditions.push(gte(refunds.refundDate, filters.startDate) as any);
    }
    if (filters.endDate) {
      conditions.push(lte(refunds.refundDate, filters.endDate) as any);
    }

    const refundsData = conditions.length > 0
      ? await db.select().from(refunds).where((and as any)(...conditions))
      : await db.select().from(refunds);

    const totalRefunds = refundsData.length;
    const totalRefundAmount = refundsData.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);

    const reasonMap = new Map<string, { count: number; amount: number }>();
    refundsData.forEach(r => {
      const reason = r.refundReason || 'Unknown';
      const current = reasonMap.get(reason) || { count: 0, amount: 0 };
      reasonMap.set(reason, {
        count: current.count + 1,
        amount: current.amount + Number(r.refundAmount || 0)
      });
    });

    const refundsByReason = Array.from(reasonMap.entries()).map(([reason, data]) => ({
      reason,
      count: data.count,
      amount: data.amount
    }));

    return {
      totalRefunds,
      totalRefundAmount,
      refundsByReason
    };
  }

  // ================================
  // TENDER MANAGEMENT METHODS
  // ================================

  async createTender(tender: InsertTender): Promise<Tender> {
    const [created] = await db.insert(tenders).values(tender).returning();
    return created;
  }

  async getTenders(paymentId: number): Promise<Tender[]> {
    return await db.select().from(tenders).where(eq(tenders.paymentId, paymentId));
  }

  async getTender(id: number): Promise<Tender | undefined> {
    const [tender] = await db.select().from(tenders).where(eq(tenders.id, id));
    return tender;
  }

  async updateTender(id: number, updates: Partial<InsertTender>): Promise<Tender> {
    const [updated] = await db
      .update(tenders)
      .set(updates)
      .where(eq(tenders.id, id))
      .returning();
    return updated;
  }

  async deleteTender(id: number): Promise<void> {
    await db.delete(tenders).where(eq(tenders.id, id));
  }

  // ================================
  // (Duplicates removed: Item Cost History, Sync Cursor, Daily Sales sections)
  // ================================

  async deleteDailySales(id: number): Promise<void> {
    await db.delete(dailySales).where(eq(dailySales.id, id));
  }

  async aggregateDailySales(date: string, merchantId: number, locationId?: number, channel?: string): Promise<DailySales> {
    const conditions = [
      eq(orders.merchantId, merchantId),
      sql`DATE(${orders.orderDate}) = ${date}`
    ];
    
    if (locationId) {
      conditions.push(eq(orders.locationId, locationId));
    }
    if (channel) {
      conditions.push(eq(orders.channel, channel));
    }

    const ordersData = await db
      .select()
      .from(orders)
      .where(and(...conditions));

    const totalOrders = ordersData.length;
    const totalRevenue = ordersData.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalTax = ordersData.reduce((sum, o) => sum + Number(o.taxAmount || 0), 0);
    const totalTip = ordersData.reduce((sum, o) => sum + Number(o.tipAmount || 0), 0);
    const totalDiscount = ordersData.reduce((sum, o) => sum + Number(o.discountAmount || 0), 0);

    const dailySalesData: InsertDailySales = {
      merchantId,
      locationId: locationId || null,
      channel: channel || '',
      date,
      orderCount: totalOrders,
      totalRevenue: totalRevenue.toString(),
      taxAmount: totalTax.toString(),
      tipAmount: totalTip.toString(),
      discounts: totalDiscount.toString(),
    };

    const existing = await this.getDailySalesByMerchantAndDate(merchantId, date);
    if (existing) {
      return this.updateDailySales(existing.id, dailySalesData);
    } else {
      return this.createDailySales(dailySalesData);
    }
  }

  // ================================
  // SALES ANALYTICS METHODS
  // ================================

  async getSalesAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    merchantId?: number;
    locationId?: number;
    channel?: string;
    groupBy?: 'day' | 'week' | 'month' | 'location' | 'channel';
  }): Promise<{
    totalRevenue: number;
    totalOrders: number;
    totalItems: number;
    averageOrderValue: number;
    totalCogs: number;
    grossMargin: number;
    grossMarginPercent: number;
    breakdown: Array<{
      period: string;
      revenue: number;
      orders: number;
      items: number;
      cogs: number;
      margin: number;
    }>;
  }> {
    const conditions = [];
    
    if (filters.startDate) {
      conditions.push(gte(orders.orderDate, filters.startDate) as any);
    }
    if (filters.endDate) {
      conditions.push(lte(orders.orderDate, filters.endDate) as any);
    }
    if (filters.merchantId) {
      conditions.push(eq(orders.merchantId, filters.merchantId));
    }
    if (filters.locationId) {
      conditions.push(eq(orders.locationId, filters.locationId));
    }
    if (filters.channel) {
      conditions.push(eq(orders.channel, filters.channel));
    }

    const ordersData = conditions.length > 0
      ? await db.select().from(orders).where((and as any)(...conditions))
      : await db.select().from(orders);

    const totalOrders = ordersData.length;
    const totalRevenue = ordersData.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalItems = 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalRevenue,
      totalOrders,
      totalItems,
      averageOrderValue,
      totalCogs: 0,
      grossMargin: totalRevenue,
      grossMarginPercent: 100,
      breakdown: []
    };
  }

  async getTopItems(filters: {
    startDate?: string;
    endDate?: string;
    merchantId?: number;
    locationId?: number;
    channel?: string;
    limit?: number;
  }): Promise<Array<{
    itemId: number;
    itemName: string;
    totalQuantity: number;
    totalRevenue: number;
    totalMargin: number;
    avgPrice: number;
  }>> {
    return [];
  }

  async getHistoricalSalesData(filters: {
    startYear: number;
    endYear: number;
    merchantId?: number;
    locationId?: number;
    channel?: string;
  }): Promise<{
    yearlyBreakdown: Array<{
      year: string;
      totalRevenue: number;
      totalProfit: number;
      totalOrders: number;
      averageOrderValue: number;
      monthlyData: Array<{
        month: string;
        revenue: number;
        profit: number;
        orders: number;
      }>;
    }>;
    quarterlyBreakdown: Array<{
      quarter: string;
      year: string;
      totalRevenue: number;
      totalProfit: number;
      totalOrders: number;
      seasonalityIndex: number;
    }>;
    keyMetrics: {
      averageAnnualGrowth: number;
      bestYear: { year: string; revenue: number };
      bestQuarter: { quarter: string; year: string; revenue: number };
      totalYearsAnalyzed: number;
    };
  }> {
    return {
      yearlyBreakdown: [],
      quarterlyBreakdown: [],
      keyMetrics: {
        averageAnnualGrowth: 0,
        bestYear: { year: '', revenue: 0 },
        bestQuarter: { quarter: '', year: '', revenue: 0 },
        totalYearsAnalyzed: 0
      }
    };
  }

  // ================================
  // (Duplicates removed: Merchant Management section)
  // ================================

  // ================================
  // POS LOCATIONS METHODS (if missing)
  // ================================

  async createPosLocation(location: any): Promise<any> {
    const [created] = await db.insert(posLocations).values(location).returning();
    return created;
  }

  async getPosLocations(merchantId?: number): Promise<any[]> {
    if (merchantId) {
      return await db.select().from(posLocations).where(eq(posLocations.merchantId, merchantId));
    }
    return await db.select().from(posLocations);
  }

  async getPosLocation(id: number): Promise<any | undefined> {
    const [location] = await db.select().from(posLocations).where(eq(posLocations.id, id));
    return location;
  }

  async getPosLocationByExternalId(merchantId: number, externalLocationId: string, channel: string): Promise<any | undefined> {
    const [location] = await db
      .select()
      .from(posLocations)
      .where(
        and(
          eq(posLocations.merchantId, merchantId),
          eq(posLocations.externalLocationId, externalLocationId),
          eq(posLocations.channel, channel)
        )
      );
    return location;
  }

  async updatePosLocation(id: number, updates: any): Promise<any> {
    const [updated] = await db
      .update(posLocations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(posLocations.id, id))
      .returning();
    return updated;
  }

  async deletePosLocation(id: number): Promise<void> {
    await db.delete(posLocations).where(eq(posLocations.id, id));
  }
}

export const storage = new DatabaseStorage();

