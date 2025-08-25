import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  date,
  decimal,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table with email/password authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  employeeId: varchar("employee_id").unique(), // Custom employee ID for HR management
  email: varchar("email").unique().notNull(),
  password: varchar("password"), // Hashed password for traditional auth
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("employee"), // employee, manager, admin
  department: varchar("department"),
  position: varchar("position"),
  hireDate: date("hire_date"),

  timeOffBalance: integer("time_off_balance").default(24),
  isActive: boolean("is_active").default(true),
  phone: varchar("phone"),
  address: varchar("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  emergencyContact: varchar("emergency_contact"),
  emergencyPhone: varchar("emergency_phone"),
  notes: text("notes"),
  permissions: text("permissions").array(), // Array of permission strings
  
  // Store/Location assignments for multi-location targeting
  primaryStore: varchar("primary_store"), // 'lake_geneva', 'watertown', 'online'
  assignedStores: text("assigned_stores").array(), // Array of store IDs user works at
  
  // SMS preferences and compliance
  smsConsent: boolean("sms_consent").default(false), // Whether user consented to SMS
  smsConsentDate: timestamp("sms_consent_date"), // When consent was given
  smsEnabled: boolean("sms_enabled").default(true), // User preference for SMS notifications
  smsNotificationTypes: text("sms_notification_types").array().default(['emergency']), // Types of notifications to send via SMS
  
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  emailIdx: index("idx_users_email").on(table.email),
  employeeIdIdx: index("idx_users_employee_id").on(table.employeeId),
  roleIdx: index("idx_users_role").on(table.role),
  primaryStoreIdx: index("idx_users_primary_store").on(table.primaryStore),
  smsConsentIdx: index("idx_users_sms_consent").on(table.smsConsent),
}));

// Time clock entries for punch in/out system
export const timeClockEntries = pgTable("time_clock_entries", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  locationId: integer("location_id"),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  breakStartTime: timestamp("break_start_time"),
  breakEndTime: timestamp("break_end_time"),
  totalBreakMinutes: integer("total_break_minutes").default(0),
  totalWorkedMinutes: integer("total_worked_minutes").default(0),
  status: varchar("status").notNull().default("clocked_in"), // clocked_in, on_break, clocked_out
  notes: text("notes"),
  ipAddress: varchar("ip_address"),
  deviceInfo: text("device_info"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userClockInIdx: index("idx_time_clock_user_clockin").on(table.userId, table.clockInTime),
  statusIdx: index("idx_time_clock_status").on(table.status),
  locationIdx: index("idx_time_clock_location").on(table.locationId),
  clockInDateIdx: index("idx_time_clock_date").on(table.clockInTime),
}));

// User presence/status for team chat
export const userPresence = pgTable("user_presence", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  status: varchar("status").notNull().default("offline"), // online, away, busy, offline, clocked_in, on_break
  lastSeen: timestamp("last_seen").defaultNow(),
  currentLocation: varchar("current_location"),
  statusMessage: text("status_message"),
  isWorking: boolean("is_working").default(false),
  clockedInAt: timestamp("clocked_in_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time off requests
export const timeOffRequests = pgTable("time_off_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  reason: text("reason"),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  requestedAt: timestamp("requested_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  comments: text("comments"),
}, (table) => ({
  userStatusIdx: index("idx_time_off_user_status").on(table.userId, table.status),
  statusIdx: index("idx_time_off_status").on(table.status),
  requestedAtIdx: index("idx_time_off_requested_at").on(table.requestedAt),
}));

// Locations
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  address: varchar("address").notNull(),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  zipCode: varchar("zip_code").notNull(),
  phone: varchar("phone"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work schedules
export const workSchedules = pgTable("work_schedules", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  locationId: integer("location_id").references(() => locations.id),
  date: date("date").notNull(),
  startTime: varchar("start_time").notNull(),
  endTime: varchar("end_time").notNull(),
  shiftType: varchar("shift_type").default("regular"), // regular, coverage, overtime
  status: varchar("status").default("scheduled"), // scheduled, completed, cancelled, no_show, sick_day, vacation, personal_day
  breaks: text("breaks"), // JSON string for break times
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userDateIdx: index("idx_work_schedules_user_date").on(table.userId, table.date),
  locationDateIdx: index("idx_work_schedules_location_date").on(table.locationId, table.date),
  statusIdx: index("idx_work_schedules_status").on(table.status),
}));

// Shift coverage requests
export const shiftCoverageRequests = pgTable("shift_coverage_requests", {
  id: serial("id").primaryKey(),
  requesterId: varchar("requester_id").notNull().references(() => users.id),
  scheduleId: integer("schedule_id").notNull().references(() => workSchedules.id),
  reason: text("reason"),
  status: varchar("status").notNull().default("open"), // open, covered, expired
  coveredBy: varchar("covered_by").references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow(),
  coveredAt: timestamp("covered_at"),
});

// Announcements
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  priority: varchar("priority").default("normal"), // low, normal, high, urgent
  targetAudience: varchar("target_audience").default("all"), // all, employees, admins, department
  isPublished: boolean("is_published").default(false),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  publishedCreatedIdx: index("idx_announcements_published_created").on(table.isPublished, table.createdAt),
  priorityIdx: index("idx_announcements_priority").on(table.priority),
  authorIdx: index("idx_announcements_author").on(table.authorId),
}));

// Training modules
export const trainingModules = pgTable("training_modules", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  content: text("content"),
  duration: integer("duration"), // in minutes
  category: varchar("category"),
  requiredForRole: varchar("required_for_role"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Training progress
export const trainingProgress = pgTable("training_progress", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  moduleId: integer("module_id").notNull().references(() => trainingModules.id),
  status: varchar("status").default("not_started"), // not_started, in_progress, completed
  progress: integer("progress").default(0), // percentage
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  score: integer("score"),
});

// Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  recipientId: varchar("recipient_id").references(() => users.id),
  subject: varchar("subject"),
  content: text("content").notNull(),
  priority: varchar("priority").default("normal"), // 'emergency', 'high', 'normal', 'low'
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
  messageType: varchar("message_type").default("direct"), // 'direct', 'channel', 'announcement', 'broadcast'
  channelId: varchar("channel_id"), // for team/group messages
  targetAudience: varchar("target_audience"), // 'all', 'store:lake_geneva', 'store:watertown', 'role:admin', 'role:manager', 'role:employee'
  smsEnabled: boolean("sms_enabled").default(false), // Whether to send via SMS
  smsDelivered: boolean("sms_delivered").default(false), // Whether SMS was successfully delivered
}, (table) => ({
  recipientReadIdx: index("idx_messages_recipient_read").on(table.recipientId, table.isRead),
  channelIdx: index("idx_messages_channel").on(table.channelId),
  sentAtIdx: index("idx_messages_sent_at").on(table.sentAt),
  senderIdx: index("idx_messages_sender").on(table.senderId),
  priorityIdx: index("idx_messages_priority").on(table.priority),
  targetAudienceIdx: index("idx_messages_target_audience").on(table.targetAudience),
}));

// Phase 3: Message Reactions
export const messageReactions = pgTable("message_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  reactionType: varchar("reaction_type").notNull(), // 'check', 'thumbs_up', 'x', 'question'
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  messageUserIdx: index("idx_reactions_message_user").on(table.messageId, table.userId),
  messageTypeIdx: index("idx_reactions_message_type").on(table.messageId, table.reactionType),
  uniqueReactionPerUser: unique("unique_reaction_per_user").on(table.messageId, table.userId, table.reactionType),
}));

// Phase 3: Read Receipts
export const readReceipts = pgTable("read_receipts", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id),
  readAt: timestamp("read_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  smsDeliveryStatus: varchar("sms_delivery_status"), // 'sent', 'delivered', 'failed', 'undelivered'
  smsDeliveryId: varchar("sms_delivery_id"), // Twilio SID for tracking
}, (table) => ({
  messageUserIdx: index("idx_receipts_message_user").on(table.messageId, table.userId),
  userReadIdx: index("idx_receipts_user_read").on(table.userId, table.readAt),
  uniqueReceiptPerUser: unique("unique_receipt_per_user").on(table.messageId, table.userId),
}));

// Phase 3: Voice Messages
export const voiceMessages = pgTable("voice_messages", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").notNull().references(() => messages.id, { onDelete: 'cascade' }),
  filePath: varchar("file_path").notNull(),
  fileName: varchar("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  duration: integer("duration"), // Duration in seconds
  transcription: text("transcription"), // Optional AI transcription
  mimeType: varchar("mime_type").default("audio/webm"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => ({
  messageIdx: index("idx_voice_messages_message").on(table.messageId),
  uploadedAtIdx: index("idx_voice_messages_uploaded").on(table.uploadedAt),
}));

// Phase 3: Message Templates
export const messageTemplates = pgTable("message_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  category: varchar("category").notNull(), // 'schedule', 'emergency', 'general', 'announcements'
  subject: varchar("subject"),
  content: text("content").notNull(),
  priority: varchar("priority").default("normal"), // 'emergency', 'high', 'normal', 'low'
  targetAudience: varchar("target_audience"), // 'all', 'managers', 'employees', 'location_specific'
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  useCount: integer("use_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("idx_templates_category").on(table.category),
  createdByIdx: index("idx_templates_created_by").on(table.createdBy),
  activeIdx: index("idx_templates_active").on(table.isActive),
}));

// SMS delivery tracking for compliance and monitoring
export const smsDeliveries = pgTable("sms_deliveries", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  twilioMessageId: varchar("twilio_message_id").notNull(), // Twilio's SID
  phoneNumber: varchar("phone_number").notNull(),
  status: varchar("status").notNull().default("queued"), // 'queued', 'sending', 'sent', 'delivered', 'failed', 'undelivered'
  errorCode: varchar("error_code"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow(),
  deliveredAt: timestamp("delivered_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  messageUserIdx: index("idx_sms_message_user").on(table.messageId, table.userId),
  twilioMessageIdx: index("idx_sms_twilio_message").on(table.twilioMessageId),
  statusIdx: index("idx_sms_status").on(table.status),
  phoneIdx: index("idx_sms_phone").on(table.phoneNumber),
  sentAtIdx: index("idx_sms_sent_at").on(table.sentAt),
}));

// Chat channels for team communication
export const chatChannels = pgTable("chat_channels", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  type: varchar("type").default("team"), // 'team', 'department', 'general'
  isPrivate: boolean("is_private").default(false),
  isActive: boolean("is_active").default(true),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Channel memberships
export const channelMembers = pgTable("channel_members", {
  id: serial("id").primaryKey(),
  channelId: integer("channel_id").notNull().references(() => chatChannels.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").default("member"), // 'admin', 'member'
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Push subscriptions for mobile notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications for time-sensitive approvals
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  body: text("body").notNull(),
  type: varchar("type").notNull(), // 'time_off_request', 'shift_coverage', 'approval_needed'
  relatedId: integer("related_id"), // ID of the related record (time off request, etc.)
  isRead: boolean("is_read").default(false),
  sentAt: timestamp("sent_at").defaultNow(),
  readAt: timestamp("read_at"),
});

// Document management and file sharing
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  category: varchar("category").default("general"), // 'policy', 'form', 'training', 'general'
  description: text("description"),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  isPublic: boolean("is_public").default(false),
  isActive: boolean("is_active").default(true),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document access permissions
export const documentPermissions = pgTable("document_permissions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  userId: varchar("user_id").references(() => users.id),
  department: varchar("department"), // If null, applies to specific user
  role: varchar("role"), // If null, applies to specific user
  accessLevel: varchar("access_level").default("read"), // 'read', 'write', 'admin'
  grantedBy: varchar("granted_by").notNull().references(() => users.id),
  grantedAt: timestamp("granted_at").defaultNow(),
});

// Document download/view logs
export const documentLogs = pgTable("document_logs", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  action: varchar("action").notNull(), // 'view', 'download', 'share'
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Logo management for branding customization
export const logos = pgTable("logos", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // 'main_logo', 'login_logo', 'header_logo', etc.
  fileName: varchar("file_name").notNull(),
  originalName: varchar("original_name").notNull(),
  filePath: varchar("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: varchar("mime_type").notNull(),
  isActive: boolean("is_active").default(true),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Employee invitations for beta testing
export const employeeInvitations = pgTable("employee_invitations", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull().unique(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  role: varchar("role").notNull().default("employee"),
  department: varchar("department"),
  position: varchar("position"),
  inviteToken: varchar("invite_token").notNull().unique(),
  invitedBy: varchar("invited_by").notNull().references(() => users.id),
  invitedAt: timestamp("invited_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  status: varchar("status").notNull().default("pending"), // pending, accepted, expired
  notes: text("notes"),
});

// Password reset tokens for traditional authentication
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: varchar("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tokenIdx: index("idx_password_reset_token").on(table.token),
  userIdx: index("idx_password_reset_user").on(table.userId),
}));

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  timeOffRequests: many(timeOffRequests),
  workSchedules: many(workSchedules),
  shiftCoverageRequests: many(shiftCoverageRequests),
  announcements: many(announcements),
  trainingProgress: many(trainingProgress),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "recipient" }),
  smsDeliveries: many(smsDeliveries),
  pushSubscriptions: many(pushSubscriptions),
  notifications: many(notifications),
  createdChannels: many(chatChannels),
  channelMemberships: many(channelMembers),
  uploadedDocuments: many(documents),
  documentPermissions: many(documentPermissions),
  documentLogs: many(documentLogs),
  uploadedLogos: many(logos),
  sentInvitations: many(employeeInvitations),
}));

export const timeOffRequestsRelations = relations(timeOffRequests, ({ one }) => ({
  user: one(users, { fields: [timeOffRequests.userId], references: [users.id] }),
  reviewer: one(users, { fields: [timeOffRequests.reviewedBy], references: [users.id] }),
}));

export const workSchedulesRelations = relations(workSchedules, ({ one, many }) => ({
  user: one(users, { fields: [workSchedules.userId], references: [users.id] }),
  coverageRequests: many(shiftCoverageRequests),
}));

export const shiftCoverageRequestsRelations = relations(shiftCoverageRequests, ({ one }) => ({
  requester: one(users, { fields: [shiftCoverageRequests.requesterId], references: [users.id] }),
  schedule: one(workSchedules, { fields: [shiftCoverageRequests.scheduleId], references: [workSchedules.id] }),
  coverer: one(users, { fields: [shiftCoverageRequests.coveredBy], references: [users.id] }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, { fields: [announcements.authorId], references: [users.id] }),
}));

export const trainingModulesRelations = relations(trainingModules, ({ many }) => ({
  progress: many(trainingProgress),
}));

export const trainingProgressRelations = relations(trainingProgress, ({ one }) => ({
  user: one(users, { fields: [trainingProgress.userId], references: [users.id] }),
  module: one(trainingModules, { fields: [trainingProgress.moduleId], references: [trainingModules.id] }),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "sender" }),
  recipient: one(users, { fields: [messages.recipientId], references: [users.id], relationName: "recipient" }),
  channel: one(chatChannels, { fields: [messages.channelId], references: [chatChannels.id] }),
  smsDeliveries: many(smsDeliveries),
}));

export const smsDeliveriesRelations = relations(smsDeliveries, ({ one }) => ({
  message: one(messages, { fields: [smsDeliveries.messageId], references: [messages.id] }),
  user: one(users, { fields: [smsDeliveries.userId], references: [users.id] }),
}));

export const chatChannelsRelations = relations(chatChannels, ({ one, many }) => ({
  creator: one(users, { fields: [chatChannels.createdBy], references: [users.id] }),
  members: many(channelMembers),
  messages: many(messages),
}));

export const channelMembersRelations = relations(channelMembers, ({ one }) => ({
  channel: one(chatChannels, { fields: [channelMembers.channelId], references: [chatChannels.id] }),
  user: one(users, { fields: [channelMembers.userId], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  uploader: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
  permissions: many(documentPermissions),
  logs: many(documentLogs),
}));

export const documentPermissionsRelations = relations(documentPermissions, ({ one }) => ({
  document: one(documents, { fields: [documentPermissions.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentPermissions.userId], references: [users.id] }),
  granter: one(users, { fields: [documentPermissions.grantedBy], references: [users.id] }),
}));

export const documentLogsRelations = relations(documentLogs, ({ one }) => ({
  document: one(documents, { fields: [documentLogs.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentLogs.userId], references: [users.id] }),
}));

export const logosRelations = relations(logos, ({ one }) => ({
  uploader: one(users, { fields: [logos.uploadedBy], references: [users.id] }),
}));

export const employeeInvitationsRelations = relations(employeeInvitations, ({ one }) => ({
  inviter: one(users, { fields: [employeeInvitations.invitedBy], references: [users.id] }),
}));

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertTimeOffRequestSchema = createInsertSchema(timeOffRequests).omit({
  id: true,
  requestedAt: true,
  reviewedAt: true,
});

export const insertWorkScheduleSchema = createInsertSchema(workSchedules).omit({
  id: true,
  createdAt: true,
});

export const insertShiftCoverageRequestSchema = createInsertSchema(shiftCoverageRequests).omit({
  id: true,
  requestedAt: true,
  coveredAt: true,
});

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  publishedAt: true,
});

export const insertTrainingModuleSchema = createInsertSchema(trainingModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTrainingProgressSchema = createInsertSchema(trainingProgress).omit({
  id: true,
  startedAt: true,
  completedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  sentAt: true,
  readAt: true,
});

export const insertSMSDeliverySchema = createInsertSchema(smsDeliveries).omit({
  id: true,
  sentAt: true,
  deliveredAt: true,
  updatedAt: true,
});

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  sentAt: true,
  readAt: true,
});

export const insertChatChannelSchema = createInsertSchema(chatChannels).omit({
  id: true,
  createdAt: true,
});

export const insertChannelMemberSchema = createInsertSchema(channelMembers).omit({
  id: true,
  joinedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  updatedAt: true,
});

export const insertDocumentPermissionSchema = createInsertSchema(documentPermissions).omit({
  id: true,
  grantedAt: true,
});

export const insertDocumentLogSchema = createInsertSchema(documentLogs).omit({
  id: true,
  timestamp: true,
});

export const insertLogoSchema = createInsertSchema(logos).omit({
  id: true,
  uploadedAt: true,
  updatedAt: true,
});

export const insertEmployeeInvitationSchema = createInsertSchema(employeeInvitations).omit({
  id: true,
  invitedAt: true,
  acceptedAt: true,
});

// Add relations for new tables
export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// Phase 3: Enhanced Messaging Relations
export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  message: one(messages, { fields: [messageReactions.messageId], references: [messages.id] }),
  user: one(users, { fields: [messageReactions.userId], references: [users.id] }),
}));

export const readReceiptsRelations = relations(readReceipts, ({ one }) => ({
  message: one(messages, { fields: [readReceipts.messageId], references: [messages.id] }),
  user: one(users, { fields: [readReceipts.userId], references: [users.id] }),
}));

export const voiceMessagesRelations = relations(voiceMessages, ({ one }) => ({
  message: one(messages, { fields: [voiceMessages.messageId], references: [messages.id] }),
}));

export const messageTemplatesRelations = relations(messageTemplates, ({ one }) => ({
  creator: one(users, { fields: [messageTemplates.createdBy], references: [users.id] }),
}));

// Enhanced messages relations with Phase 3 features
export const enhancedMessagesRelations = relations(messages, ({ one, many }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "messageSender" }),
  recipient: one(users, { fields: [messages.recipientId], references: [users.id], relationName: "messageRecipient" }),
  reactions: many(messageReactions),
  readReceipts: many(readReceipts),
  voiceMessage: one(voiceMessages),
}));

// Export types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertTimeOffRequest = z.infer<typeof insertTimeOffRequestSchema>;
export type TimeOffRequest = typeof timeOffRequests.$inferSelect;
export type InsertWorkSchedule = z.infer<typeof insertWorkScheduleSchema>;
export type WorkSchedule = typeof workSchedules.$inferSelect;
export type InsertShiftCoverageRequest = z.infer<typeof insertShiftCoverageRequestSchema>;
export type ShiftCoverageRequest = typeof shiftCoverageRequests.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;
export type InsertTrainingModule = z.infer<typeof insertTrainingModuleSchema>;
export type TrainingModule = typeof trainingModules.$inferSelect;
export type InsertTrainingProgress = z.infer<typeof insertTrainingProgressSchema>;
export type TrainingProgress = typeof trainingProgress.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type Location = typeof locations.$inferSelect;
export type InsertLogo = z.infer<typeof insertLogoSchema>;
export type Logo = typeof logos.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;
export type InsertChatChannel = z.infer<typeof insertChatChannelSchema>;
export type ChatChannel = typeof chatChannels.$inferSelect;
export type InsertChannelMember = z.infer<typeof insertChannelMemberSchema>;
export type ChannelMember = typeof channelMembers.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocumentPermission = z.infer<typeof insertDocumentPermissionSchema>;
export type DocumentPermission = typeof documentPermissions.$inferSelect;
export type InsertDocumentLog = z.infer<typeof insertDocumentLogSchema>;
export type DocumentLog = typeof documentLogs.$inferSelect;

// Employee invitation types
export type EmployeeInvitation = typeof employeeInvitations.$inferSelect;
export type InsertEmployeeInvitation = typeof employeeInvitations.$inferInsert;

// Phase 3: Enhanced Messaging Insert Schemas
export const insertMessageReactionSchema = createInsertSchema(messageReactions).omit({
  id: true,
  createdAt: true,
});

export const insertReadReceiptSchema = createInsertSchema(readReceipts).omit({
  id: true,
  readAt: true,
  deliveredAt: true,
});

export const insertVoiceMessageSchema = createInsertSchema(voiceMessages).omit({
  id: true,
  uploadedAt: true,
});

export const insertMessageTemplateSchema = createInsertSchema(messageTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Phase 3: Enhanced Messaging Types
export type MessageReaction = typeof messageReactions.$inferSelect;
export type InsertMessageReaction = typeof messageReactions.$inferInsert;
export type ReadReceipt = typeof readReceipts.$inferSelect;
export type InsertReadReceipt = typeof readReceipts.$inferInsert;
export type VoiceMessage = typeof voiceMessages.$inferSelect;
export type InsertVoiceMessage = typeof voiceMessages.$inferInsert;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type InsertMessageTemplate = typeof messageTemplates.$inferInsert;



// Calendar event type for unified calendar view
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  type: 'schedule' | 'timeoff' | 'coverage_request' | 'announcement';
  userId?: string;
  locationId?: number;
  status?: string;
  description?: string;
  data?: any;
}

// ============================================
// ACCOUNTING TOOL SCHEMA EXTENSION
// ============================================

// QuickBooks Integration Configuration
export const quickbooksConfig = pgTable("quickbooks_config", {
  id: serial("id").primaryKey(),
  companyId: varchar("company_id").notNull().unique(), // QB Company ID
  accessToken: text("access_token"), // Encrypted OAuth token
  refreshToken: text("refresh_token"), // Encrypted refresh token
  tokenExpiry: timestamp("token_expires_at"),
  realmId: varchar("realm_id"), // QB Realm ID
  baseUrl: varchar("base_url"), // Sandbox vs Production URL
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  companyIdIdx: index("idx_qb_company_id").on(table.companyId),
}));

// Clover POS Integration Configuration
export const cloverConfig = pgTable("clover_config", {
  id: serial("id").primaryKey(),
  merchantId: varchar("merchant_id").notNull().unique(),
  merchantName: varchar("merchant_name"), // Human-readable location name
  apiToken: text("api_token"), // Encrypted API token
  baseUrl: varchar("base_url"), // Sandbox vs Production
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  merchantIdIdx: index("idx_clover_merchant_id").on(table.merchantId),
}));

// HSA Tools Configuration
export const hsaConfig = pgTable("hsa_config", {
  id: serial("id").primaryKey(),
  systemName: varchar("system_name").notNull(), // HSA provider name
  apiEndpoint: varchar("api_endpoint"),
  apiKey: text("api_key"), // Encrypted API key
  accountNumber: varchar("account_number"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Thrive Inventory Configuration
export const thriveConfig = pgTable("thrive_config", {
  id: serial("id").primaryKey(),
  storeId: varchar("store_id").notNull().unique(),
  apiToken: text("api_token"), // Encrypted API token
  baseUrl: varchar("base_url"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  storeIdIdx: index("idx_thrive_store_id").on(table.storeId),
}));

// Financial Accounts (Chart of Accounts from QB)
export const financialAccounts = pgTable("financial_accounts", {
  id: serial("id").primaryKey(),
  qbAccountId: varchar("qb_account_id").unique(), // QuickBooks Account ID
  accountNumber: varchar("account_number"),
  accountName: varchar("account_name").notNull(),
  accountType: varchar("account_type").notNull(), // Asset, Liability, Equity, Income, Expense
  subType: varchar("sub_type"),
  description: text("description"),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  parentAccountId: integer("parent_account_id"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  qbAccountIdIdx: index("idx_fa_qb_account_id").on(table.qbAccountId),
  accountTypeIdx: index("idx_fa_account_type").on(table.accountType),
  parentAccountIdx: index("idx_fa_parent_account").on(table.parentAccountId),
}));

// Financial Transactions (General Ledger Entries)
export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  qbTransactionId: varchar("qb_transaction_id").unique(),
  transactionNumber: varchar("transaction_number"),
  transactionDate: date("transaction_date").notNull(),
  transactionType: varchar("transaction_type").notNull(), // Journal Entry, Invoice, Bill, Payment, etc.
  description: text("description"),
  referenceNumber: varchar("reference_number"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
  sourceSystem: varchar("source_system").notNull(), // QB, Clover, HSA, Thrive, Manual
  sourceId: varchar("source_id"), // Original system's transaction ID
  status: varchar("status").default("pending"), // pending, posted, voided
  createdBy: varchar("created_by").references(() => users.id),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  qbTransactionIdIdx: index("idx_ft_qb_transaction_id").on(table.qbTransactionId),
  transactionDateIdx: index("idx_ft_transaction_date").on(table.transactionDate),
  sourceSystemIdx: index("idx_ft_source_system").on(table.sourceSystem),
  statusIdx: index("idx_ft_status").on(table.status),
}));

// Financial Transaction Lines (Journal Entry Details)
export const financialTransactionLines = pgTable("financial_transaction_lines", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull().references(() => financialTransactions.id, { onDelete: "cascade" }),
  accountId: integer("account_id").notNull().references(() => financialAccounts.id),
  description: text("description"),
  debitAmount: decimal("debit_amount", { precision: 15, scale: 2 }).default("0.00"),
  creditAmount: decimal("credit_amount", { precision: 15, scale: 2 }).default("0.00"),
  lineNumber: integer("line_number").default(1),
  customerVendorId: varchar("customer_vendor_id"), // Reference to QB Customer/Vendor
  itemId: varchar("item_id"), // Product/Service Item from inventory
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  transactionIdIdx: index("idx_ftl_transaction_id").on(table.transactionId),
  accountIdIdx: index("idx_ftl_account_id").on(table.accountId),
}));

// Customers and Vendors (from QuickBooks)
export const customersVendors = pgTable("customers_vendors", {
  id: serial("id").primaryKey(),
  qbId: varchar("qb_id").unique(), // QuickBooks Customer/Vendor ID
  name: varchar("name").notNull(),
  type: varchar("type").notNull(), // customer, vendor
  companyName: varchar("company_name"),
  email: varchar("email"),
  phone: varchar("phone"),
  address: text("address"),
  city: varchar("city"),
  state: varchar("state"),
  zipCode: varchar("zip_code"),
  balance: decimal("balance", { precision: 15, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  qbIdIdx: index("idx_cv_qb_id").on(table.qbId),
  typeIdx: index("idx_cv_type").on(table.type),
  nameIdx: index("idx_cv_name").on(table.name),
}));

// Inventory Items (from Thrive and QB)
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  qbItemId: varchar("qb_item_id").unique(),
  thriveItemId: varchar("thrive_item_id").unique(),
  sku: varchar("sku"),
  itemName: varchar("item_name").notNull(),
  description: text("description"),
  category: varchar("category"),
  unitOfMeasure: varchar("unit_of_measure"),
  unitCost: decimal("unit_cost", { precision: 10, scale: 2 }),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }),
  quantityOnHand: decimal("quantity_on_hand", { precision: 10, scale: 3 }).default("0.000"),
  reorderPoint: decimal("reorder_point", { precision: 10, scale: 3 }).default("0.000"),
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  qbItemIdIdx: index("idx_ii_qb_item_id").on(table.qbItemId),
  thriveItemIdIdx: index("idx_ii_thrive_item_id").on(table.thriveItemId),
  skuIdx: index("idx_ii_sku").on(table.sku),
  categoryIdx: index("idx_ii_category").on(table.category),
}));

// POS Sales Data (from Clover)
export const posSales = pgTable("pos_sales", {
  id: serial("id").primaryKey(),
  cloverOrderId: varchar("clover_order_id").unique(),
  saleDate: date("sale_date").notNull(),
  saleTime: timestamp("sale_time").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default("0.00"),
  tipAmount: decimal("tip_amount", { precision: 10, scale: 2 }).default("0.00"),
  paymentMethod: varchar("payment_method"), // cash, card, mobile
  cardType: varchar("card_type"), // visa, mastercard, amex, etc.
  locationId: integer("location_id").references(() => locations.id),
  employeeId: varchar("employee_id").references(() => users.id),
  customerCount: integer("customer_count").default(1),
  status: varchar("status").default("completed"), // completed, refunded, voided
  qbPosted: boolean("qb_posted").default(false),
  qbTransactionId: varchar("qb_transaction_id"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  cloverOrderIdIdx: index("idx_ps_clover_order_id").on(table.cloverOrderId),
  saleDateIdx: index("idx_ps_sale_date").on(table.saleDate),
  locationIdIdx: index("idx_ps_location_id").on(table.locationId),
  qbPostedIdx: index("idx_ps_qb_posted").on(table.qbPosted),
}));

// POS Sale Items (Line items from Clover sales)
export const posSaleItems = pgTable("pos_sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").notNull().references(() => posSales.id, { onDelete: "cascade" }),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id),
  itemName: varchar("item_name").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 3 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  saleIdIdx: index("idx_psi_sale_id").on(table.saleId),
  inventoryItemIdIdx: index("idx_psi_inventory_item_id").on(table.inventoryItemId),
}));

// HSA Expenses
export const hsaExpenses = pgTable("hsa_expenses", {
  id: serial("id").primaryKey(),
  hsaSystemId: varchar("hsa_system_id").unique(),
  employeeId: varchar("employee_id").references(() => users.id),
  expenseDate: date("expense_date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: varchar("category").notNull(), // medical, dental, vision, etc.
  description: text("description"),
  receiptUrl: varchar("receipt_url"),
  isEligible: boolean("is_eligible").default(true),
  status: varchar("status").default("pending"), // pending, approved, denied, reimbursed
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  qbPosted: boolean("qb_posted").default(false),
  qbTransactionId: varchar("qb_transaction_id"),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  hsaSystemIdIdx: index("idx_hsa_system_id").on(table.hsaSystemId),
  employeeIdIdx: index("idx_hsa_employee_id").on(table.employeeId),
  expenseDateIdx: index("idx_hsa_expense_date").on(table.expenseDate),
  statusIdx: index("idx_hsa_status").on(table.status),
  qbPostedIdx: index("idx_hsa_qb_posted").on(table.qbPosted),
}));

// System Integration Logs
export const integrationLogs = pgTable("integration_logs", {
  id: serial("id").primaryKey(),
  system: varchar("system").notNull(), // quickbooks, clover, hsa, thrive
  operation: varchar("operation").notNull(), // sync, create, update, delete
  recordType: varchar("record_type"), // transaction, customer, item, etc.
  recordId: varchar("record_id"),
  status: varchar("status").notNull(), // success, error, warning
  message: text("message"),
  errorDetails: jsonb("error_details"),
  processingTime: integer("processing_time_ms"),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  systemIdx: index("idx_il_system").on(table.system),
  statusIdx: index("idx_il_status").on(table.status),
  timestampIdx: index("idx_il_timestamp").on(table.timestamp),
  recordTypeIdx: index("idx_il_record_type").on(table.recordType),
}));

// Financial Reports Configuration
export const reportConfigs = pgTable("report_configs", {
  id: serial("id").primaryKey(),
  reportName: varchar("report_name").notNull(),
  reportType: varchar("report_type").notNull(), // profit_loss, balance_sheet, cash_flow, custom
  parameters: jsonb("parameters"), // Report configuration and filters
  createdBy: varchar("created_by").references(() => users.id),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  reportTypeIdx: index("idx_rc_report_type").on(table.reportType),
  createdByIdx: index("idx_rc_created_by").on(table.createdBy),
}));

// Dashboard Widgets Configuration
export const dashboardWidgets = pgTable("dashboard_widgets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  widgetType: varchar("widget_type").notNull(), // financial_summary, sales_chart, inventory_alerts, etc.
  widgetConfig: jsonb("widget_config"), // Widget-specific configuration
  position: integer("position").default(1),
  size: varchar("size").default("medium"), // small, medium, large
  isVisible: boolean("is_visible").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  userIdIdx: index("idx_dw_user_id").on(table.userId),
  widgetTypeIdx: index("idx_dw_widget_type").on(table.widgetType),
}));

// ============================================
// ACCOUNTING RELATIONS
// ============================================

export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  parentAccount: one(financialAccounts, { fields: [financialAccounts.parentAccountId], references: [financialAccounts.id], relationName: "parentAccount" }),
  childAccounts: many(financialAccounts, { relationName: "parentAccount" }),
  transactionLines: many(financialTransactionLines),
}));

export const financialTransactionsRelations = relations(financialTransactions, ({ one, many }) => ({
  creator: one(users, { fields: [financialTransactions.createdBy], references: [users.id] }),
  transactionLines: many(financialTransactionLines),
}));

export const financialTransactionLinesRelations = relations(financialTransactionLines, ({ one }) => ({
  transaction: one(financialTransactions, { fields: [financialTransactionLines.transactionId], references: [financialTransactions.id] }),
  account: one(financialAccounts, { fields: [financialTransactionLines.accountId], references: [financialAccounts.id] }),
}));

export const customersVendorsRelations = relations(customersVendors, ({ many }) => ({
  transactions: many(financialTransactions),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  saleItems: many(posSaleItems),
}));

export const posSalesRelations = relations(posSales, ({ one, many }) => ({
  location: one(locations, { fields: [posSales.locationId], references: [locations.id] }),
  employee: one(users, { fields: [posSales.employeeId], references: [users.id] }),
  saleItems: many(posSaleItems),
}));

export const posSaleItemsRelations = relations(posSaleItems, ({ one }) => ({
  sale: one(posSales, { fields: [posSaleItems.saleId], references: [posSales.id] }),
  inventoryItem: one(inventoryItems, { fields: [posSaleItems.inventoryItemId], references: [inventoryItems.id] }),
}));

export const hsaExpensesRelations = relations(hsaExpenses, ({ one }) => ({
  employee: one(users, { fields: [hsaExpenses.employeeId], references: [users.id], relationName: "hsaEmployee" }),
  approver: one(users, { fields: [hsaExpenses.approvedBy], references: [users.id], relationName: "hsaApprover" }),
}));

export const reportConfigsRelations = relations(reportConfigs, ({ one }) => ({
  creator: one(users, { fields: [reportConfigs.createdBy], references: [users.id] }),
}));

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  user: one(users, { fields: [dashboardWidgets.userId], references: [users.id] }),
}));

// ============================================
// ACCOUNTING INSERT SCHEMAS & TYPES
// ============================================

export const insertQuickbooksConfigSchema = createInsertSchema(quickbooksConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCloverConfigSchema = createInsertSchema(cloverConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHsaConfigSchema = createInsertSchema(hsaConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertThriveConfigSchema = createInsertSchema(thriveConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialAccountSchema = createInsertSchema(financialAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFinancialTransactionLineSchema = createInsertSchema(financialTransactionLines).omit({
  id: true,
  createdAt: true,
});

export const insertCustomersVendorsSchema = createInsertSchema(customersVendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPosSaleSchema = createInsertSchema(posSales).omit({
  id: true,
  createdAt: true,
});

export const insertPosSaleItemSchema = createInsertSchema(posSaleItems).omit({
  id: true,
  createdAt: true,
});

export const insertHsaExpenseSchema = createInsertSchema(hsaExpenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertIntegrationLogSchema = createInsertSchema(integrationLogs).omit({
  id: true,
  timestamp: true,
});

export const insertReportConfigSchema = createInsertSchema(reportConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDashboardWidgetSchema = createInsertSchema(dashboardWidgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ============================================
// ACCOUNTING EXPORT TYPES
// ============================================

export type QuickbooksConfig = typeof quickbooksConfig.$inferSelect;
export type InsertQuickbooksConfig = z.infer<typeof insertQuickbooksConfigSchema>;

export type CloverConfig = typeof cloverConfig.$inferSelect;
export type InsertCloverConfig = z.infer<typeof insertCloverConfigSchema>;

export type HsaConfig = typeof hsaConfig.$inferSelect;
export type InsertHsaConfig = z.infer<typeof insertHsaConfigSchema>;

export type ThriveConfig = typeof thriveConfig.$inferSelect;
export type InsertThriveConfig = z.infer<typeof insertThriveConfigSchema>;

export type FinancialAccount = typeof financialAccounts.$inferSelect;
export type InsertFinancialAccount = z.infer<typeof insertFinancialAccountSchema>;

export type FinancialTransaction = typeof financialTransactions.$inferSelect;
export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;

export type FinancialTransactionLine = typeof financialTransactionLines.$inferSelect;
export type InsertFinancialTransactionLine = z.infer<typeof insertFinancialTransactionLineSchema>;

export type CustomersVendors = typeof customersVendors.$inferSelect;
export type InsertCustomersVendors = z.infer<typeof insertCustomersVendorsSchema>;

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;

export type PosSale = typeof posSales.$inferSelect;
export type InsertPosSale = z.infer<typeof insertPosSaleSchema>;

export type PosSaleItem = typeof posSaleItems.$inferSelect;
export type InsertPosSaleItem = z.infer<typeof insertPosSaleItemSchema>;

export type HsaExpense = typeof hsaExpenses.$inferSelect;
export type InsertHsaExpense = z.infer<typeof insertHsaExpenseSchema>;

export type IntegrationLog = typeof integrationLogs.$inferSelect;
export type InsertIntegrationLog = z.infer<typeof insertIntegrationLogSchema>;

export type ReportConfig = typeof reportConfigs.$inferSelect;
export type InsertReportConfig = z.infer<typeof insertReportConfigSchema>;

export type DashboardWidget = typeof dashboardWidgets.$inferSelect;
export type InsertDashboardWidget = z.infer<typeof insertDashboardWidgetSchema>;

// ============================================
// QR CODE MANAGEMENT SCHEMA
// ============================================

// QR Code Management
export const qrCodes = pgTable("qr_codes", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  url: text("url").notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  qrCodeData: text("qr_code_data").notNull(), // Base64 data URL
  downloadCount: integer("download_count").default(0),
  lastDownloaded: timestamp("last_downloaded"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  createdByIdx: index("idx_qr_created_by").on(table.createdBy),
  categoryIdx: index("idx_qr_category").on(table.category),
  createdAtIdx: index("idx_qr_created_at").on(table.createdAt),
}));

// QR Code Relations
export const qrCodesRelations = relations(qrCodes, ({ one }) => ({
  creator: one(users, { fields: [qrCodes.createdBy], references: [users.id] }),
}));

// QR Code Types and Schemas
export const insertQrCodeSchema = createInsertSchema(qrCodes).omit({
  id: true,
  qrCodeData: true,
  downloadCount: true,
  lastDownloaded: true,
  createdAt: true,
  updatedAt: true,
});

export const updateQrCodeSchema = createInsertSchema(qrCodes)
  .omit({
    id: true,
    createdBy: true,
    qrCodeData: true,
    downloadCount: true,
    lastDownloaded: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export type QrCode = typeof qrCodes.$inferSelect;
export type InsertQrCode = z.infer<typeof insertQrCodeSchema>;
export type UpdateQrCode = z.infer<typeof updateQrCodeSchema>;

// ============================================
// VIDEO CREATION MANAGEMENT SCHEMA
// ============================================

// Video Templates
export const videoTemplates = pgTable("video_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  config: jsonb("config").notNull(), // Template configuration
  previewUrl: text("preview_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  categoryIdx: index("idx_vt_category").on(table.category),
  nameIdx: index("idx_vt_name").on(table.name),
}));

// Product Videos
export const productVideos = pgTable("product_videos", {
  id: serial("id").primaryKey(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  productDescription: text("product_description"),
  category: varchar("category", { length: 100 }),
  createdBy: varchar("created_by", { length: 255 }).notNull().references(() => users.id),
  videoConfig: jsonb("video_config").notNull(), // Complete video configuration
  renderStatus: varchar("render_status", { length: 50 }).default("pending"), // pending, rendering, completed, failed
  renderProgress: integer("render_progress").default(0), // 0-100
  videoUrl: text("video_url"), // Final video URL
  thumbnailUrl: text("thumbnail_url"), // Video thumbnail
  duration: integer("duration"), // Video duration in seconds
  fileSize: integer("file_size"), // File size in bytes
  downloadCount: integer("download_count").default(0),
  lastDownloaded: timestamp("last_downloaded"),
  renderStartedAt: timestamp("render_started_at"),
  renderCompletedAt: timestamp("render_completed_at"),
  errorMessage: text("error_message"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  createdByIdx: index("idx_pv_created_by").on(table.createdBy),
  categoryIdx: index("idx_pv_category").on(table.category),
  renderStatusIdx: index("idx_pv_render_status").on(table.renderStatus),
  createdAtIdx: index("idx_pv_created_at").on(table.createdAt),
}));

// Video Assets (uploaded images, audio files, etc.)
export const videoAssets = pgTable("video_assets", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => productVideos.id, { onDelete: "cascade" }),
  assetType: varchar("asset_type", { length: 50 }).notNull(), // image, audio, logo, etc.
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type", { length: 100 }),
  metadata: jsonb("metadata"), // Additional asset metadata
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  videoIdIdx: index("idx_va_video_id").on(table.videoId),
  assetTypeIdx: index("idx_va_asset_type").on(table.assetType),
}));

// Video Relations
export const productVideosRelations = relations(productVideos, ({ one, many }) => ({
  creator: one(users, { fields: [productVideos.createdBy], references: [users.id] }),
  assets: many(videoAssets),
}));

export const videoAssetsRelations = relations(videoAssets, ({ one }) => ({
  video: one(productVideos, { fields: [videoAssets.videoId], references: [productVideos.id] }),
}));

export const videoTemplatesRelations = relations(videoTemplates, ({ one }) => ({
  // Add any relations if needed
}));

// Video Creation Schemas
export const insertVideoTemplateSchema = createInsertSchema(videoTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProductVideoSchema = createInsertSchema(productVideos).omit({
  id: true,
  renderStatus: true,
  renderProgress: true,
  videoUrl: true,
  thumbnailUrl: true,
  duration: true,
  fileSize: true,
  downloadCount: true,
  lastDownloaded: true,
  renderStartedAt: true,
  renderCompletedAt: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
});

export const updateProductVideoSchema = createInsertSchema(productVideos)
  .omit({
    id: true,
    createdBy: true,
    createdAt: true,
    updatedAt: true,
  })
  .partial();

export const insertVideoAssetSchema = createInsertSchema(videoAssets).omit({
  id: true,
  createdAt: true,
});

// Video Types
export type VideoTemplate = typeof videoTemplates.$inferSelect;
export type InsertVideoTemplate = z.infer<typeof insertVideoTemplateSchema>;

export type ProductVideo = typeof productVideos.$inferSelect;
export type InsertProductVideo = z.infer<typeof insertProductVideoSchema>;
export type UpdateProductVideo = z.infer<typeof updateProductVideoSchema>;

export type VideoAsset = typeof videoAssets.$inferSelect;
export type InsertVideoAsset = z.infer<typeof insertVideoAssetSchema>;
