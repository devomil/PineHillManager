import { storage } from './storage';
import { SMSService } from './sms-service';

export interface NotificationContext {
  userId: string;
  messageType: 'schedule_change' | 'emergency' | 'announcement' | 'reminder';
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

  constructor() {
    this.smsService = new SMSService();
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
      // Regular announcements follow user preferences
      else {
        if (!workStatus.isClocked && hasSMSConsent && smsEnabled) {
          // Check if user wants SMS for this type
          const allowedTypes = ['all', 'announcements', context.messageType];
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
    
    // Build the message with header, priority, content
    let smsText = `${header}\n${priorityPrefix}${title}`;
    
    if (message && message !== title) {
      smsText += ` - ${message}`;
    }

    // Add context for schedule changes
    if (context.messageType === 'schedule_change') {
      smsText += ' Check your app for details.';
    }
    
    // Add footer signature
    const footer = `\n- Pine Hill Farm`;

    // Combine all parts
    const fullMessage = smsText + footer;

    // For SMS longer than 160 chars, we'll allow multi-part SMS
    // Most carriers support up to 1600 characters across multiple segments
    if (fullMessage.length > 300) {
      // If too long, truncate the main message but keep header and footer
      const availableSpace = 300 - header.length - footer.length - priorityPrefix.length - 10; // 10 for separators
      const truncatedContent = title.length > availableSpace 
        ? title.substring(0, availableSpace - 3) + '...'
        : title;
      return `${header}\n${priorityPrefix}${truncatedContent}${footer}`;
    }

    return fullMessage;
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

      // Format change details
      const changeDetails = this.formatScheduleChanges(changes);
      
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
   * Format schedule changes for human-readable display
   */
  private formatScheduleChanges(changes: any): string {
    const changeMessages: string[] = [];

    if (changes.startTime) {
      changeMessages.push(`Start time: ${changes.startTime}`);
    }
    if (changes.endTime) {
      changeMessages.push(`End time: ${changes.endTime}`);
    }
    if (changes.locationId) {
      changeMessages.push(`Location changed`);
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
            const result = await this.sendSmartNotification({
              ...context,
              userId
            });

            results.sent++;
            if (result.appNotification) results.appNotifications++;
            if (result.smsNotification) results.smsNotifications++;

          } catch (error) {
            console.error(`Failed to send notification to user ${userId}:`, error);
            results.errors.push({
              userId,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        })
      );
    }

    return results;
  }
}

export const smartNotificationService = new SmartNotificationService();