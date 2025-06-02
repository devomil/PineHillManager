import { storage } from './storage';

// Notification service that stores notifications in database
// Provides foundation for mobile app notifications

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

class NotificationService {
  async sendToUser(userId: string, payload: NotificationPayload): Promise<void> {
    try {
      // Store notification in database
      await storage.createNotification({
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.tag || 'general',
        relatedId: payload.data?.relatedId || null,
      });

      console.log(`Notification stored for user ${userId}: ${payload.title}`);
    } catch (error) {
      console.error('Error sending notification to user:', error);
    }
  }

  async sendToAllManagers(payload: NotificationPayload): Promise<void> {
    try {
      // Get all users with admin role
      const allUsers = await storage.getAllUsers();
      const managers = allUsers.filter(user => user.role === 'admin');
      
      if (managers.length === 0) {
        console.log('No managers found to notify');
        return;
      }

      // Store notifications in database for each manager
      await Promise.all(
        managers.map(manager =>
          storage.createNotification({
            userId: manager.id,
            title: payload.title,
            body: payload.body,
            type: payload.tag || 'general',
            relatedId: payload.data?.relatedId || null,
          })
        )
      );

      console.log(`Notifications stored for ${managers.length} managers`);
    } catch (error) {
      console.error('Error sending notification to managers:', error);
    }
  }

  // Time-sensitive approval notifications
  async notifyTimeOffRequest(requestId: number, employeeName: string): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Time Off Request Needs Approval',
      body: `${employeeName} has requested time off and needs your approval.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'time_off_request',
      data: {
        type: 'time_off_request',
        relatedId: requestId,
        url: '/time'
      },
      actions: [
        {
          action: 'approve',
          title: 'Approve',
        },
        {
          action: 'view',
          title: 'View Details',
        }
      ]
    };

    await this.sendToAllManagers(payload);
  }

  async notifyShiftCoverageRequest(requestId: number, requesterName: string, shiftDate: string): Promise<void> {
    const payload: NotificationPayload = {
      title: 'Shift Coverage Request',
      body: `${requesterName} needs coverage for their shift on ${shiftDate}.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'shift_coverage',
      data: {
        type: 'shift_coverage',
        relatedId: requestId,
        url: '/time'
      },
      actions: [
        {
          action: 'cover',
          title: 'Cover Shift',
        },
        {
          action: 'view',
          title: 'View Details',
        }
      ]
    };

    await this.sendToAllManagers(payload);
  }

  async notifyApprovalDecision(userId: string, type: 'approved' | 'denied', requestType: string): Promise<void> {
    const payload: NotificationPayload = {
      title: `Request ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      body: `Your ${requestType} request has been ${type}.`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'approval_decision',
      data: {
        type: 'approval_decision',
        decision: type,
        url: '/time'
      }
    };

    await this.sendToUser(userId, payload);
  }

  async notifyUrgentMessage(userId: string, subject: string, senderName: string): Promise<void> {
    const payload: NotificationPayload = {
      title: 'New Message',
      body: `${senderName}: ${subject}`,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'urgent_message',
      data: {
        type: 'message',
        url: '/communication'
      }
    };

    await this.sendToUser(userId, payload);
  }
}

export const notificationService = new NotificationService();