import { storage } from './storage';

// Import web-push conditionally to avoid startup errors
let webpush: any = null;
let isWebPushEnabled = false;

// Try to initialize web-push with VAPID keys if available
const initializeWebPush = async () => {
  try {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
      webpush = await import('web-push');
      webpush.setVapidDetails(
        'mailto:support@pinehillfarm.com',
        process.env.VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
      );
      isWebPushEnabled = true;
      console.log('Push notifications enabled with VAPID keys');
    } else {
      console.log('Push notifications disabled - VAPID keys not configured');
    }
  } catch (error) {
    console.error('Failed to initialize web-push:', error);
  }
};

// Initialize web-push
initializeWebPush();

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
      // Get user's push subscriptions
      const subscriptions = await storage.getPushSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        console.log(`No push subscriptions found for user ${userId}`);
        return;
      }

      // Store notification in database
      await storage.createNotification({
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.tag || 'general',
        relatedId: payload.data?.relatedId || null,
      });

      // Send push notifications to all user's devices
      const promises = subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            },
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );
        } catch (error) {
          console.error(`Failed to send notification to subscription ${subscription.id}:`, error);
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Error sending notification to user:', error);
    }
  }

  async sendToAllManagers(payload: NotificationPayload): Promise<void> {
    try {
      // Get all manager push subscriptions
      const subscriptions = await storage.getAllManagerPushSubscriptions();
      
      if (subscriptions.length === 0) {
        console.log('No manager push subscriptions found');
        return;
      }

      // Store notifications in database for each manager
      const managerIds = Array.from(new Set(subscriptions.map(s => s.userId)));
      await Promise.all(
        managerIds.map(managerId =>
          storage.createNotification({
            userId: managerId,
            title: payload.title,
            body: payload.body,
            type: payload.tag || 'general',
            relatedId: payload.data?.relatedId || null,
          })
        )
      );

      // Send push notifications to all manager devices
      const promises = subscriptions.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dhKey,
              auth: subscription.authKey,
            },
          };

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload)
          );
        } catch (error) {
          console.error(`Failed to send notification to manager subscription ${subscription.id}:`, error);
        }
      });

      await Promise.allSettled(promises);
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