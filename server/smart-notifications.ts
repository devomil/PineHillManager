import { storage } from './storage';
import { SMSService } from './sms-service';

export interface NotificationContext {
  userId: string;
  messageType: 'schedule_change' | 'emergency' | 'announcement' | 'reminder' | 'time_off' | 'shift_swap';
  priority: 'emergency' | 'high' | 'normal' | 'low';
  content: {
    title: string;
    message: string;
    metadata?: Record<string, any>;
  };
  targetAudience?: string;
  bypassClockStatus?: boolean; // For emergency messages
  forceSMS?: boolean; // Force SMS sending regardless of smart routing
}

export interface UserWorkStatus {
  isClocked: boolean;
  status: 'clocked_in' | 'on_break' | 'offline';
  location?: string;
  lastActivity?: Date;
}

export class SmartNotificationService {
  private smsService: SMSService;
  private smsNotificationsPaused: boolean = false;
  private pausedBy: string | null = null;
  private pausedAt: Date | null = null;
  private queuedScheduleNotifications: Array<{
    userId: string;
    scheduleData: any;
    timestamp: Date;
  }> = [];

  constructor() {
    this.smsService = new SMSService();
  }

  /**
   * Pause SMS notifications for bulk schedule entry (admin/manager only)
   */
  pauseSMSNotifications(adminUserId: string): { success: boolean; message: string } {
    if (this.smsNotificationsPaused) {
      return {
        success: false,
        message: `SMS notifications already paused by ${this.pausedBy} at ${this.pausedAt?.toLocaleString()}`
      };
    }

    this.smsNotificationsPaused = true;
    this.pausedBy = adminUserId;
    this.pausedAt = new Date();
    this.queuedScheduleNotifications = []; // Reset queue

    console.log(`📵 SMS notifications PAUSED by ${adminUserId} at ${this.pausedAt.toLocaleString()}`);
    
    return {
      success: true,
      message: `SMS notifications paused for bulk schedule entry. Notifications will be queued until resumed.`
    };
  }

  /**
   * Resume SMS notifications and optionally send summary
   */
  async resumeSMSNotifications(
    adminUserId: string,
    sendSummary: boolean = true
  ): Promise<{ success: boolean; message: string; summary?: any }> {
    if (!this.smsNotificationsPaused) {
      return {
        success: false,
        message: 'SMS notifications are not currently paused'
      };
    }

    const pausedDuration = this.pausedAt ? Date.now() - this.pausedAt.getTime() : 0;
    const queuedCount = this.queuedScheduleNotifications.length;
    
    // Resume notifications
    this.smsNotificationsPaused = false;
    this.pausedBy = null;
    this.pausedAt = null;

    console.log(`📱 SMS notifications RESUMED by ${adminUserId}. Queued: ${queuedCount} notifications`);

    let summary = null;
    
    if (sendSummary && queuedCount > 0) {
      // Group notifications by user
      const userNotifications = new Map<string, any[]>();
      
      this.queuedScheduleNotifications.forEach(notification => {
        if (!userNotifications.has(notification.userId)) {
          userNotifications.set(notification.userId, []);
        }
        userNotifications.get(notification.userId)!.push(notification.scheduleData);
      });

      // Send summary notifications
      let sentSummaries = 0;
      for (const [userId, schedules] of Array.from(userNotifications.entries())) {
        try {
          await this.sendScheduleSummaryNotification(userId, schedules);
          sentSummaries++;
        } catch (error) {
          console.error(`Failed to send summary to user ${userId}:`, error);
        }
      }

      summary = {
        totalUsers: userNotifications.size,
        totalSchedules: queuedCount,
        sentSummaries,
        pausedDuration: Math.round(pausedDuration / 1000 / 60) // minutes
      };
    }

    // Clear the queue
    this.queuedScheduleNotifications = [];

    return {
      success: true,
      message: `SMS notifications resumed. ${sendSummary ? `Summary sent to ${summary?.sentSummaries} employees.` : 'No summary sent.'}`,
      summary
    };
  }

  /**
   * Get current SMS pause status
   */
  getSMSPauseStatus(): {
    isPaused: boolean;
    pausedBy?: string;
    pausedAt?: Date;
    queuedNotifications: number;
  } {
    return {
      isPaused: this.smsNotificationsPaused,
      pausedBy: this.pausedBy || undefined,
      pausedAt: this.pausedAt || undefined,
      queuedNotifications: this.queuedScheduleNotifications.length
    };
  }

  /**
   * Smart notification routing based on employee clock-in status and preferences
   */
  async sendSmartNotification(context: NotificationContext): Promise<{
    appNotification: boolean;
    smsNotification: boolean;
    reason: string;
  }> {
    try {
      // Check if SMS notifications are paused (except for emergency messages)
      if (this.smsNotificationsPaused && context.priority !== 'emergency' && !context.bypassClockStatus) {
        // Queue schedule notifications for later summary
        if (context.messageType === 'schedule_change') {
          this.queuedScheduleNotifications.push({
            userId: context.userId,
            scheduleData: context.content.metadata,
            timestamp: new Date()
          });
          
          return {
            appNotification: true,
            smsNotification: false,
            reason: `SMS notifications paused - schedule notification queued for summary`
          };
        }
        
        // For non-schedule notifications during pause, still send app notification
        return {
          appNotification: true,
          smsNotification: false,
          reason: `SMS notifications paused by ${this.pausedBy}`
        };
      }
      console.log(`Smart notification routing for user ${context.userId}:`, {
        messageType: context.messageType,
        priority: context.priority,
        forceSMS: context.forceSMS,
        bypassClockStatus: context.bypassClockStatus
      });

      // Get user's current work status
      const workStatus = await this.getUserWorkStatus(context.userId);
      const user = await storage.getUser(context.userId);
      
      if (!user) {
        throw new Error(`User not found: ${context.userId}`);
      }

      // Check SMS consent and preferences
      const hasSMSConsent = user.smsConsent;
      const smsEnabled = user.smsEnabled;
      const notificationTypes = user.smsNotificationTypes || ['emergency'];

      console.log(`User work status:`, workStatus);
      console.log(`SMS preferences - consent: ${hasSMSConsent}, enabled: ${smsEnabled}, types: ${notificationTypes.join(',')}`);

      // Determine notification routing
      let sendSMS = false;
      let sendApp = true; // Always send app notification
      let reason = '';

      // Force SMS if explicitly requested (overrides ALL smart routing)
      if (context.forceSMS && hasSMSConsent && smsEnabled) {
        sendSMS = true;
        reason = 'SMS explicitly requested - bypassing smart routing';
        console.log(`🚀 FORCE SMS: Sending SMS regardless of clock status or smart routing`);
      }
      // Emergency messages always get SMS (if consent given)
      else if (context.priority === 'emergency' || context.bypassClockStatus) {
        if (hasSMSConsent && smsEnabled && notificationTypes.includes('emergency')) {
          sendSMS = true;
          reason = 'Emergency message - SMS sent regardless of clock status';
        } else {
          reason = 'Emergency message - no SMS consent or disabled';
        }
      } 
      // Schedule changes get smart routing
      else if (context.messageType === 'schedule_change') {
        if (workStatus.isClocked) {
          // User is at work - app notification should be sufficient
          sendSMS = false;
          reason = `User clocked in at ${workStatus.location} - app notification only`;
        } else {
          // User not at work - send SMS if they have consent and it's enabled
          if (hasSMSConsent && smsEnabled && 
              (notificationTypes.includes('schedule') || notificationTypes.includes('all'))) {
            sendSMS = true;
            reason = 'User offline - SMS + app notification for schedule change';
          } else {
            sendSMS = false;
            reason = 'User offline but no SMS consent for schedule changes';
          }
        }
      }
      // Announcement notifications - send SMS if user has consent and opted in, regardless of work status
      else if (context.messageType === 'announcement') {
        if (hasSMSConsent && smsEnabled) {
          // Check if user wants SMS for announcements
          const allowedTypes = ['all', 'announcements'];
          const hasMatchingType = allowedTypes.some(type => notificationTypes.includes(type));
          
          if (hasMatchingType) {
            sendSMS = true;
            reason = workStatus.isClocked 
              ? 'Important announcement - SMS sent even while user is at work'
              : 'User offline - announcement SMS sent';
          } else {
            sendSMS = false;
            reason = 'User not opted in for announcement SMS notifications';
          }
        } else {
          sendSMS = false;
          reason = 'No SMS consent or SMS disabled for announcements';
        }
      }
      // Other message types follow user preferences based on work status
      else {
        if (!workStatus.isClocked && hasSMSConsent && smsEnabled) {
          // Check if user wants SMS for this type
          const allowedTypes = ['all', context.messageType];
          const hasMatchingType = allowedTypes.some(type => notificationTypes.includes(type));
          
          if (hasMatchingType) {
            sendSMS = true;
            reason = 'User offline and opted in for this notification type';
          } else {
            reason = 'User offline but not opted in for this notification type';
          }
        } else if (workStatus.isClocked) {
          reason = 'User at work - app notification sufficient';
        } else {
          reason = 'No SMS consent or disabled';
        }
      }

      // Send the notifications
      if (sendApp) {
        await this.sendAppNotification(context);
      }

      if (sendSMS) {
        await this.sendSMSNotification(context, user);
      }

      console.log(`Notification routing decision: App=${sendApp}, SMS=${sendSMS}. ${reason}`);

      return {
        appNotification: sendApp,
        smsNotification: sendSMS,
        reason
      };

    } catch (error) {
      console.error('Error in smart notification routing:', error);
      throw error;
    }
  }

  /**
   * Get user's current work status from time clock system
   */
  async getUserWorkStatus(userId: string): Promise<UserWorkStatus> {
    try {
      const currentEntry = await storage.getCurrentTimeEntry(userId);
      
      if (!currentEntry || currentEntry.clockOutTime) {
        return {
          isClocked: false,
          status: 'offline',
          lastActivity: currentEntry?.clockOutTime || undefined
        };
      }

      // User is clocked in
      const location = currentEntry.locationId ? await storage.getLocationById(currentEntry.locationId) : null;
      const status = currentEntry.breakStartTime && !currentEntry.breakEndTime ? 'on_break' : 'clocked_in';

      return {
        isClocked: true,
        status,
        location: location?.name,
        lastActivity: currentEntry.clockInTime
      };

    } catch (error) {
      console.error('Error getting user work status:', error);
      // Default to offline if we can't determine status
      return { isClocked: false, status: 'offline' };
    }
  }

  /**
   * Send in-app notification
   */
  private async sendAppNotification(context: NotificationContext): Promise<void> {
    // Create notification in database for in-app display
    // This would integrate with your existing notification system
    console.log(`📱 App notification sent to ${context.userId}: ${context.content.title}`);
    
    // TODO: Implement actual app notification storage/delivery
    // This could save to a notifications table for display in the app
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(context: NotificationContext, user: any): Promise<void> {
    if (!user.phone) {
      console.log(`No phone number for user ${context.userId} - skipping SMS`);
      return;
    }

    const smsMessage = this.formatSMSMessage(context);
    console.log(`🔧 DEBUG - SMS Message formatting:`, {
      originalTitle: context.content.title,
      originalMessage: context.content.message,
      priority: context.priority,
      formattedSMS: smsMessage
    });
    
    try {
      await this.smsService.sendSMS({
        to: user.phone,
        message: smsMessage,
        priority: context.priority
      });
      console.log(`📱 SMS sent to ${user.phone}: ${smsMessage}`);
    } catch (error) {
      console.error(`Failed to send SMS to ${user.phone}:`, error);
      throw error;
    }
  }

  /**
   * Format message for SMS delivery with sender information
   */
  private formatSMSMessage(context: NotificationContext): string {
    const { title, message, metadata } = context.content;
    
    // Extract sender information from metadata
    const senderName = metadata?.senderName || 'System';
    const senderRole = metadata?.senderRole || '';
    
    // Create header with sender info
    const header = `From: ${senderName}${senderRole ? ` (${senderRole})` : ''}`;
    
    // Add priority indicator with appropriate emoji for all priority levels
    let priorityPrefix = '';
    switch (context.priority) {
      case 'emergency':
        priorityPrefix = '🚨 EMERGENCY: ';
        break;
      case 'high':
        priorityPrefix = '⚠️ HIGH: ';
        break;
      case 'normal':
        priorityPrefix = '📢 ';
        break;
      case 'low':
        priorityPrefix = '💬 ';
        break;
      default:
        priorityPrefix = '📢 ';
    }
    
    // Extract 2-3 sentence preview from message content
    const messagePreview = message && message !== title 
      ? this.extractSentencePreview(message, 3)
      : this.extractSentencePreview(title, 3);
    
    // Build the message with header, priority, content preview, and link
    let smsText = `${header}\n${priorityPrefix}${title}`;
    
    // Add message preview if available
    if (messagePreview) {
      smsText += `\n\n${messagePreview}`;
    }

    // Add clickable link to view full message
    smsText += `\n\nView full message: https://PHFManager.co`;
    
    // Add footer signature
    const footer = `\n- Pine Hill Farm`;

    // Combine all parts
    const fullMessage = smsText + footer;

    // For very long SMS, truncate the preview but keep the essential parts
    if (fullMessage.length > 400) {
      // Truncate the preview to fit within reasonable SMS length
      const shorterPreview = this.extractSentencePreview(messagePreview, 2);
      return `${header}\n${priorityPrefix}${title}\n\n${shorterPreview}\n\nView full message: https://PHFManager.co${footer}`;
    }

    return fullMessage;
  }

  /**
   * Extract 2-3 sentences from text content for SMS preview
   */
  private extractSentencePreview(text: string, maxSentences: number = 3): string {
    if (!text || text.trim().length === 0) {
      return '';
    }

    // Clean up the text
    const cleanText = text.trim();
    
    // Split by sentence endings (., !, ?)
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    const sentences = cleanText.match(sentenceRegex) || [];
    
    // If no sentence endings found, just truncate to reasonable length
    if (sentences.length === 0) {
      const maxLength = 150;
      return cleanText.length > maxLength 
        ? cleanText.substring(0, maxLength - 3) + '...' 
        : cleanText;
    }
    
    // Take up to maxSentences
    const preview = sentences.slice(0, maxSentences).join(' ').trim();
    
    // If preview is too long (over 200 chars), truncate to 2 sentences
    if (preview.length > 200 && sentences.length > 1) {
      const shorterPreview = sentences.slice(0, 2).join(' ').trim();
      return shorterPreview.length > 200 
        ? shorterPreview.substring(0, 197) + '...'
        : shorterPreview;
    }
    
    return preview;
  }

  /**
   * Detect and notify about schedule changes
   */
  async handleScheduleChange(scheduleId: number, changes: any, changedBy: string): Promise<void> {
    try {
      // Note: We would need to add getWorkScheduleById to storage interface
      // For now, we'll work with the schedule data passed to us
      const schedule = changes.originalSchedule || { 
        id: scheduleId,
        userId: changes.userId,
        date: changes.date,
        shiftType: changes.shiftType || 'Regular'
      };
      
      if (!schedule.userId) {
        throw new Error(`No user ID provided for schedule: ${scheduleId}`);
      }

      const user = await storage.getUser(schedule.userId);
      if (!user) {
        console.error(`User not found for schedule: ${schedule.userId}`);
        return;
      }

      // Format change details with proper async handling
      const changeDetails = await this.formatScheduleChanges(changes);
      
      const notificationContext: NotificationContext = {
        userId: schedule.userId,
        messageType: 'schedule_change',
        priority: 'high',
        content: {
          title: 'Schedule Updated',
          message: `Your ${schedule.shiftType} shift on ${new Date(schedule.date).toLocaleDateString()} has been updated. ${changeDetails}`,
          metadata: {
            scheduleId,
            originalSchedule: schedule,
            changes,
            changedBy
          }
        }
      };

      // Send smart notification
      await this.sendSmartNotification(notificationContext);

    } catch (error) {
      console.error('Error handling schedule change notification:', error);
    }
  }

  /**
   * Format schedule changes for human-readable display with proper time formatting and location names
   */
  private async formatScheduleChanges(changes: any): Promise<string> {
    const changeMessages: string[] = [];

    if (changes.startTime) {
      const formattedTime = this.formatTimeForSMS(changes.startTime);
      changeMessages.push(`Start time: ${formattedTime}`);
    }
    if (changes.endTime) {
      const formattedTime = this.formatTimeForSMS(changes.endTime);
      changeMessages.push(`End time: ${formattedTime}`);
    }
    if (changes.locationId) {
      try {
        const location = await storage.getLocationById(changes.locationId);
        const locationName = location?.name || 'Unknown Location';
        changeMessages.push(`Location: ${locationName}`);
      } catch (error) {
        console.error('Error fetching location for SMS:', error);
        changeMessages.push('Location changed');
      }
    }
    if (changes.shiftType) {
      changeMessages.push(`Shift type: ${changes.shiftType}`);
    }
    if (changes.status) {
      changeMessages.push(`Status: ${changes.status}`);
    }

    return changeMessages.length > 0 ? changeMessages.join(', ') : 'Details updated';
  }

  /**
   * Format time for SMS display (convert ISO to readable AM/PM format)
   */
  private formatTimeForSMS(timeString: string): string {
    try {
      // Handle various time format inputs
      let dateObj: Date;
      
      if (timeString.includes('T')) {
        // ISO format: 2025-09-06T10:00:00
        // Treat as local time (already in Chicago timezone) to avoid double conversion
        const [datePart, timePart] = timeString.split('T');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hours, minutes, seconds = 0] = timePart.split(':').map(Number);
        dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
      } else if (timeString.includes(':')) {
        // Time only format: 10:00:00 or 10:00
        const today = new Date();
        const [hours, minutes] = timeString.split(':').map(Number);
        dateObj = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
      } else {
        // Fallback to original string
        return timeString;
      }

      // Format to readable AM/PM time (already in local timezone, no conversion needed)
      return dateObj.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
    } catch (error) {
      console.error('Error formatting time for SMS:', error);
      return timeString; // Return original if formatting fails
    }
  }

  /**
   * Send bulk notifications with smart routing
   */
  async sendBulkSmartNotifications(
    userIds: string[],
    context: Omit<NotificationContext, 'userId'>
  ): Promise<{
    sent: number;
    appNotifications: number;
    smsNotifications: number;
    errors: Array<{ userId: string; error: string }>;
  }> {
    console.log(`📤 sendBulkSmartNotifications called for ${userIds.length} users`, {
      forceSMS: context.forceSMS,
      priority: context.priority,
      messageType: context.messageType
    });

    const results = {
      sent: 0,
      appNotifications: 0,
      smsNotifications: 0,
      errors: [] as Array<{ userId: string; error: string }>
    };

    // Process notifications in parallel with reasonable concurrency
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (userId) => {
          try {
            console.log(`🔄 Processing notification for user ${userId}`);
            const result = await this.sendSmartNotification({
              ...context,
              userId
            });

            console.log(`✅ Notification result for user ${userId}:`, result);
            results.sent++;
            if (result.appNotification) results.appNotifications++;
            if (result.smsNotification) results.smsNotifications++;

          } catch (error) {
            console.error(`❌ Failed to send notification to user ${userId}:`, error);
            results.errors.push({
              userId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        })
      );
    }

    console.log(`📊 Bulk notification results:`, results);
    return results;
  }

  /**
   * Send a summary notification to a user about their schedule updates
   */
  private async sendScheduleSummaryNotification(userId: string, schedules: any[]): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        console.error(`User not found for summary notification: ${userId}`);
        return;
      }

      // Extract date from nested schedule structure and group by valid dates
      const schedulesByDate = schedules.reduce((acc, schedule) => {
        // Extract date from various possible locations
        const date = schedule.originalSchedule?.date || schedule.changes?.date || schedule.date;
        
        // Only group by valid dates
        if (date && date !== 'Unknown Date') {
          const dateKey = date;
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(schedule);
        } else {
          // Group invalid/unknown dates separately
          if (!acc['unknown']) acc['unknown'] = [];
          acc['unknown'].push(schedule);
        }
        return acc;
      }, {} as Record<string, any[]>);

      const validDates = Object.keys(schedulesByDate).filter(key => key !== 'unknown');
      const totalValidDates = validDates.length;
      const hasUnknownDates = schedulesByDate['unknown']?.length > 0;
      
      // Create a more accurate message based on the actual changes
      let message: string;
      if (totalValidDates === 1 && !hasUnknownDates) {
        const date = validDates[0];
        const changesForDay = schedulesByDate[date].length;
        try {
          const formattedDate = new Date(date).toLocaleDateString();
          if (changesForDay === 1) {
            message = `Your schedule has been updated for ${formattedDate}.`;
          } else {
            message = `Your schedule has been updated with ${changesForDay} change${changesForDay > 1 ? 's' : ''} for ${formattedDate}.`;
          }
        } catch (error) {
          // Fallback if date parsing fails
          message = `Your schedule has been updated with ${changesForDay} change${changesForDay > 1 ? 's' : ''}.`;
        }
      } else if (totalValidDates > 1) {
        message = `Your schedule has been updated across ${totalValidDates} day${totalValidDates > 1 ? 's' : ''}.`;
      } else {
        // All dates are unknown or invalid
        const totalChanges = schedules.length;
        message = `Your schedule has been updated with ${totalChanges} change${totalChanges > 1 ? 's' : ''}.`;
      }

      const summaryContext: NotificationContext = {
        userId,
        messageType: 'schedule_change',
        priority: 'high',
        content: {
          title: 'Schedule Ready',
          message,
          metadata: {
            summaryType: 'bulk_schedule_update',
            totalScheduleUpdates: schedules.length,
            totalValidDates,
            hasUnknownDates,
            schedulesByDate
          }
        },
        forceSMS: true // Force SMS for summary notifications
      };

      await this.sendSmartNotification(summaryContext);

    } catch (error) {
      console.error(`Failed to send schedule summary to user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Handle time off request status changes
   */
  async handleTimeOffStatusChange(
    timeOffRequestId: number, 
    requestUserId: string,
    newStatus: 'approved' | 'rejected' | 'cancelled',
    reviewedBy: string,
    comments?: string
  ): Promise<void> {
    try {
      const user = await storage.getUser(requestUserId);
      const reviewer = await storage.getUser(reviewedBy);
      
      if (!user) {
        console.error(`User not found for time-off notification: ${requestUserId}`);
        return;
      }

      const reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : 'Manager';
      let title: string;
      let message: string;
      
      switch (newStatus) {
        case 'approved':
          title = 'Time Off Approved';
          message = `Your time off request has been approved by ${reviewerName}.${comments ? ` Note: ${comments}` : ''}`;
          break;
        case 'rejected':
          title = 'Time Off Request Denied';
          message = `Your time off request has been denied by ${reviewerName}.${comments ? ` Reason: ${comments}` : ''}`;
          break;
        case 'cancelled':
          title = 'Time Off Request Cancelled';
          message = `Your time off request has been cancelled.${comments ? ` Reason: ${comments}` : ''}`;
          break;
        default:
          return; // Unknown status, don't send notification
      }

      const notificationContext: NotificationContext = {
        userId: requestUserId,
        messageType: 'time_off',
        priority: 'high',
        content: {
          title,
          message,
          metadata: {
            timeOffRequestId,
            status: newStatus,
            reviewedBy,
            reviewerName,
            comments
          }
        },
        forceSMS: true // Always send SMS for time off decisions
      };

      await this.sendSmartNotification(notificationContext);

    } catch (error) {
      console.error('Error handling time off status change notification:', error);
    }
  }

  /**
   * Handle shift swap request decisions
   */
  async handleShiftSwapDecision(
    swapRequestId: number,
    requestUserId: string,
    targetUserId: string,
    decision: 'approved' | 'declined',
    decidedBy: string,
    comments?: string
  ): Promise<void> {
    try {
      const requester = await storage.getUser(requestUserId);
      const target = await storage.getUser(targetUserId);
      const decisionMaker = await storage.getUser(decidedBy);
      
      if (!requester || !target) {
        console.error(`Users not found for shift swap notification: ${requestUserId}, ${targetUserId}`);
        return;
      }

      const decisionMakerName = decisionMaker ? `${decisionMaker.firstName} ${decisionMaker.lastName}` : 'Manager';
      
      // Notify both parties involved in the shift swap
      const notifications = [
        {
          userId: requestUserId,
          title: decision === 'approved' ? 'Shift Swap Approved' : 'Shift Swap Declined',
          message: decision === 'approved' 
            ? `Your shift swap request with ${target.firstName} ${target.lastName} has been approved by ${decisionMakerName}.${comments ? ` Note: ${comments}` : ''}`
            : `Your shift swap request with ${target.firstName} ${target.lastName} has been declined by ${decisionMakerName}.${comments ? ` Reason: ${comments}` : ''}`
        },
        {
          userId: targetUserId,
          title: decision === 'approved' ? 'Shift Swap Approved' : 'Shift Swap Declined',
          message: decision === 'approved'
            ? `The shift swap request from ${requester.firstName} ${requester.lastName} has been approved by ${decisionMakerName}.${comments ? ` Note: ${comments}` : ''}`
            : `The shift swap request from ${requester.firstName} ${requester.lastName} has been declined by ${decisionMakerName}.${comments ? ` Reason: ${comments}` : ''}`
        }
      ];

      // Send notifications to both users
      for (const notif of notifications) {
        const notificationContext: NotificationContext = {
          userId: notif.userId,
          messageType: 'shift_swap',
          priority: 'high',
          content: {
            title: notif.title,
            message: notif.message,
            metadata: {
              swapRequestId,
              decision,
              decidedBy,
              decisionMakerName,
              comments,
              otherParty: notif.userId === requestUserId ? targetUserId : requestUserId
            }
          },
          forceSMS: true // Always send SMS for shift swap decisions
        };

        await this.sendSmartNotification(notificationContext);
      }

    } catch (error) {
      console.error('Error handling shift swap decision notification:', error);
    }
  }
}

export const smartNotificationService = new SmartNotificationService();