import twilio from 'twilio';
import { storage } from './storage';

// Environment variables for Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || null;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || null;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || null;

// Check Twilio configuration
let client: any = null;
let twilioConfigured = false;

try {
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    // Validate Account SID format (should start with 'AC')
    if (!TWILIO_ACCOUNT_SID.startsWith('AC')) {
      console.warn('⚠️ Twilio Account SID should start with "AC". Current value may be an API Key.');
      console.warn('Please check your Twilio credentials configuration.');
      twilioConfigured = false;
    } else {
      client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) || null;
      twilioConfigured = true;
      console.log('✅ Twilio SMS service configured successfully');
    }
  } else {
    console.warn('⚠️ Twilio environment variables not found. SMS functionality will be disabled.');
    twilioConfigured = false;
  }
} catch (error) {
  console.error('❌ Failed to initialize Twilio client:', error);
  twilioConfigured = false;
}

export interface SMSMessage {
  to: string;
  message: string;
  priority: 'emergency' | 'high' | 'normal' | 'low';
  messageId?: string;
}

export interface SMSDeliveryStatus {
  messageId: string;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  errorCode?: string;
  errorMessage?: string;
  timestamp?: Date;
  retryCount?: number;
}

export interface SMSRetryOptions {
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
}

export class SMSService {
  private fromPhoneNumber: string;
  private deliveryStatusMap: Map<string, SMSDeliveryStatus> = new Map();
  private retryQueue: Map<string, { attempt: number; nextRetryAt: Date; smsMessage: SMSMessage }> = new Map();
  
  // Default retry configuration
  private defaultRetryOptions: SMSRetryOptions = {
    maxRetries: 3,
    retryDelayMs: 5000, // Start with 5 seconds
    backoffMultiplier: 2 // Double delay each retry
  };

  constructor() {
    // Format phone number to E.164 format (+1XXXXXXXXXX)
    this.fromPhoneNumber = TWILIO_PHONE_NUMBER 
      ? (TWILIO_PHONE_NUMBER.startsWith('+') 
        ? TWILIO_PHONE_NUMBER 
        : `+1${TWILIO_PHONE_NUMBER.replace(/\D/g, '')}`)
      : '';
    
    console.log(`SMS Service initialized with phone number: ${this.fromPhoneNumber}`);
    
    // Start retry processor
    this.startRetryProcessor();
  }

  /**
   * Send a single SMS message with enhanced error handling and retry capability
   */
  async sendSMS({ to, message, priority, messageId }: SMSMessage, retryOptions?: Partial<SMSRetryOptions>): Promise<{ success: boolean; messageId?: string; error?: string; willRetry?: boolean }> {
    const startTime = Date.now();
    const options = { ...this.defaultRetryOptions, ...retryOptions };
    
    try {
      // Check if Twilio is configured
      if (!twilioConfigured || !client) {
        const error = 'SMS service not available - Twilio not configured properly';
        console.warn(error);
        await this.logSMSAttempt(to, message, false, error, 0, undefined, priority);
        return { success: false, error };
      }

      // Format recipient phone number
      const formattedTo = this.formatPhoneNumber(to);
      
      if (!formattedTo) {
        const error = 'Invalid phone number format';
        console.error(`SMS failed for ${to}: ${error}`);
        await this.logSMSAttempt(to, message, false, error, Date.now() - startTime, undefined, priority);
        return { success: false, error };
      }

      // Note: Message formatting (including emojis) is handled by smart-notifications.ts
      // SMS service just sends the pre-formatted message
      const finalMessage = message;

      // Attempt to send SMS
      const twilioMessage = await client.messages.create({
        body: finalMessage,
        from: this.fromPhoneNumber,
        to: formattedTo,
        // statusCallback: `${process.env.BASE_URL || 'http://localhost:5000'}/api/sms/status-callback`,
      });

      const deliveryStatus: SMSDeliveryStatus = {
        messageId: twilioMessage.sid,
        status: 'sent',
        timestamp: new Date(),
        retryCount: 0
      };
      
      this.deliveryStatusMap.set(twilioMessage.sid, deliveryStatus);
      
      console.log(`✅ SMS sent successfully to ${formattedTo}, SID: ${twilioMessage.sid}, Priority: ${priority}`);
      await this.logSMSAttempt(formattedTo, finalMessage, true, undefined, Date.now() - startTime, twilioMessage.sid, priority);
      
      return { 
        success: true, 
        messageId: twilioMessage.sid 
      };
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send SMS';
      const duration = Date.now() - startTime;
      
      console.error(`❌ SMS sending failed to ${to}: ${errorMessage}`);
      await this.logSMSAttempt(to, message, false, errorMessage, duration, undefined, priority);
      
      // Determine if this error is retryable
      const isRetryable = this.isRetryableError(error);
      
      if (isRetryable && options.maxRetries > 0) {
        // Add to retry queue
        const retryId = messageId || `retry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const nextRetryAt = new Date(Date.now() + options.retryDelayMs);
        
        this.retryQueue.set(retryId, {
          attempt: 1,
          nextRetryAt,
          smsMessage: { to, message, priority, messageId: retryId }
        });
        
        console.log(`📋 SMS queued for retry: ${retryId}, next attempt at ${nextRetryAt.toISOString()}`);
        
        return { 
          success: false, 
          error: errorMessage,
          willRetry: true
        };
      }
      
      return { 
        success: false, 
        error: errorMessage,
        willRetry: false
      };
    }
  }

  /**
   * Send SMS to multiple recipients (bulk SMS)
   */
  async sendBulkSMS(recipients: string[], message: string, priority: 'emergency' | 'high' | 'normal' | 'low' = 'normal'): Promise<{
    successful: { phone: string; messageId: string }[];
    failed: { phone: string; error: string }[];
  }> {
    const results = {
      successful: [] as { phone: string; messageId: string }[],
      failed: [] as { phone: string; error: string }[],
    };

    // Send messages in parallel but with rate limiting
    const promises = recipients.map(async (phone) => {
      const result = await this.sendSMS({ to: phone, message, priority });
      
      if (result.success && result.messageId) {
        results.successful.push({ phone, messageId: result.messageId });
      } else {
        results.failed.push({ phone, error: result.error || 'Unknown error' });
      }
    });

    await Promise.all(promises);
    
    console.log(`Bulk SMS completed: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    return results;
  }

  /**
   * Check delivery status of a message
   */
  async getDeliveryStatus(messageId: string): Promise<SMSDeliveryStatus | null> {
    try {
      const message = await client.messages(messageId).fetch();
      
      return {
        messageId,
        status: message.status as SMSDeliveryStatus['status'],
        errorCode: message.errorCode?.toString() || undefined,
        errorMessage: message.errorMessage || undefined,
      };
    } catch (error) {
      console.error('Failed to fetch message status:', error);
      return null;
    }
  }

  /**
   * Send emergency broadcast to all active employees
   */
  async sendEmergencyBroadcast(message: string, employeePhones: string[]): Promise<{
    sent: number;
    failed: number;
    details: { successful: { phone: string; messageId: string }[]; failed: { phone: string; error: string }[] };
  }> {
    console.log(`🚨 Sending emergency broadcast to ${employeePhones.length} employees`);
    
    const results = await this.sendBulkSMS(employeePhones, message, 'emergency');
    
    return {
      sent: results.successful.length,
      failed: results.failed.length,
      details: results,
    };
  }

  /**
   * Send SMS notification for direct message reply
   */
  async sendDirectMessageReplyNotification(
    recipientPhone: string, 
    senderName: string, 
    replyContent: string, 
    originalSubject?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Extract 2-3 sentences from the reply content for preview
      const previewContent = this.extractSentencePreview(replyContent, 3);

      // Format the SMS message with preview and link
      let smsMessage: string;
      if (originalSubject) {
        smsMessage = `💬 ${senderName} replied to "${originalSubject}":\n\n${previewContent}\n\nView full message: https://PHFManager.co`;
      } else {
        smsMessage = `💬 ${senderName} sent you a message:\n\n${previewContent}\n\nView full message: https://PHFManager.co`;
      }

      // Send the SMS
      const result = await this.sendSMS({
        to: recipientPhone,
        message: smsMessage,
        priority: 'normal'
      });

      console.log(`📱 Direct message reply SMS sent to ${recipientPhone} from ${senderName}`);
      return result;

    } catch (error) {
      console.error('Error sending direct message reply SMS:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Send SMS notification for announcement response
   */
  async sendAnnouncementResponseNotification(
    recipientPhone: string, 
    senderName: string, 
    responseContent: string, 
    announcementTitle?: string,
    isReplyToResponse: boolean = false,
    parentResponseAuthor?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Extract 2-3 sentences from the response content for preview
      const previewContent = this.extractSentencePreview(responseContent, 3);

      // Format the SMS message based on context
      let smsMessage: string;
      
      if (isReplyToResponse && parentResponseAuthor) {
        // Response to someone's response
        smsMessage = `💬 ${senderName} replied to your response`;
        if (announcementTitle) {
          smsMessage += ` on "${announcementTitle}"`;
        }
        smsMessage += `:\n\n${previewContent}\n\nView full message: https://PHFManager.co`;
      } else {
        // Initial response to announcement
        smsMessage = `💬 ${senderName} responded`;
        if (announcementTitle) {
          smsMessage += ` to "${announcementTitle}"`;
        }
        smsMessage += `:\n\n${previewContent}\n\nView full message: https://PHFManager.co`;
      }

      // Send the SMS
      const result = await this.sendSMS({
        to: recipientPhone,
        message: smsMessage,
        priority: 'normal'
      });

      console.log(`📱 Announcement response SMS sent to ${recipientPhone} from ${senderName}`);
      return result;

    } catch (error) {
      console.error('Error sending announcement response SMS:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
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
      const maxLength = 200;
      return cleanText.length > maxLength 
        ? cleanText.substring(0, maxLength - 3) + '...' 
        : cleanText;
    }
    
    // Take up to maxSentences
    const preview = sentences.slice(0, maxSentences).join(' ').trim();
    
    // If preview is too long (over 250 chars), truncate to 2 sentences
    if (preview.length > 250 && sentences.length > 1) {
      const shorterPreview = sentences.slice(0, 2).join(' ').trim();
      return shorterPreview.length > 250 
        ? shorterPreview.substring(0, 247) + '...'
        : shorterPreview;
    }
    
    return preview;
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string | null {
    if (!phone) return null;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Check if it's a valid US phone number (10 or 11 digits)
    if (digits.length === 10) {
      return `+1${digits}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it already starts with +, assume it's properly formatted
    if (phone.startsWith('+')) {
      return phone;
    }
    
    return null;
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): boolean {
    return this.formatPhoneNumber(phone) !== null;
  }

  /**
   * Handle SMS compliance keywords (STOP, START, etc.)
   */
  async handleComplianceKeyword(phone: string, keyword: string): Promise<string> {
    const normalizedKeyword = keyword.toUpperCase().trim();
    
    switch (normalizedKeyword) {
      case 'STOP':
      case 'STOPALL':
      case 'UNSUBSCRIBE':
      case 'CANCEL':
      case 'END':
      case 'QUIT':
        // TODO: Update user's SMS consent in database
        return 'You have been unsubscribed from SMS notifications. Reply START to re-subscribe.';
      
      case 'START':
      case 'YES':
      case 'UNSTOP':
        // TODO: Update user's SMS consent in database
        return 'You have been re-subscribed to SMS notifications. Reply STOP to unsubscribe.';
      
      case 'HELP':
      case 'INFO':
        return 'Pine Hill Farm SMS: Reply STOP to unsubscribe, START to re-subscribe. Msg & data rates may apply.';
      
      default:
        return '';
    }
  }

  /**
   * Start the retry processor that handles failed message retries
   */
  private startRetryProcessor(): void {
    setInterval(async () => {
      if (this.retryQueue.size === 0) return;
      
      const now = new Date();
      const retryIds = Array.from(this.retryQueue.keys());
      
      for (const retryId of retryIds) {
        const retryData = this.retryQueue.get(retryId);
        if (!retryData || retryData.nextRetryAt > now) continue;
        
        // Remove from queue before retry attempt
        this.retryQueue.delete(retryId);
        
        const { attempt, smsMessage } = retryData;
        console.log(`🔄 Retrying SMS (attempt ${attempt + 1}): ${retryId}`);
        
        // Calculate new retry delay with backoff
        const newRetryOptions = {
          maxRetries: this.defaultRetryOptions.maxRetries - attempt,
          retryDelayMs: this.defaultRetryOptions.retryDelayMs * Math.pow(this.defaultRetryOptions.backoffMultiplier, attempt),
          backoffMultiplier: this.defaultRetryOptions.backoffMultiplier
        };
        
        // Attempt retry
        const result = await this.sendSMS(smsMessage, newRetryOptions);
        
        // If retry failed and more retries available, it will be automatically re-queued
        if (result.success) {
          console.log(`✅ SMS retry successful: ${retryId}`);
        } else if (!result.willRetry) {
          console.log(`❌ SMS retry failed permanently: ${retryId} - ${result.error}`);
        }
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Twilio error codes that are retryable
    const retryableErrorCodes = [
      20429, // Too Many Requests
      21211, // Invalid 'To' phone number (might be temporary issue)
      30001, // Queue overflow
      30002, // Account suspended (might be temporary)
      30003, // Unreachable destination handset
      30004, // Message blocked
      30005, // Unknown destination handset
      30006, // Landline or unreachable carrier
      30007, // Carrier violation
      11200, // HTTP retrieval failure
      11750, // TwiML Response body too large
    ];
    
    // Network/timeout errors are typically retryable
    const retryableMessages = [
      'timeout',
      'network',
      'connection',
      'temporarily',
      'rate limit',
      'service unavailable',
      'internal server error'
    ];
    
    // Check Twilio error codes
    if (error.code && retryableErrorCodes.includes(Number(error.code))) {
      return true;
    }
    
    // Check error messages
    const errorMessage = (error.message || '').toLowerCase();
    return retryableMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Calculate SMS cost based on message segments and type
   */
  private calculateSMSCost(message: string, priority: string = 'normal'): number {
    // SMS segment calculation (160 chars for GSM, 70 for Unicode)
    const segments = this.calculateMessageSegments(message);
    
    // Twilio pricing (in cents) - approximate US rates
    const baseRate = 0.75; // $0.0075 per segment
    const priorityMultiplier = priority === 'emergency' ? 1.5 : 1.0;
    
    return Math.ceil(segments * baseRate * priorityMultiplier);
  }

  /**
   * Calculate number of SMS segments
   */
  private calculateMessageSegments(message: string): number {
    // Check if message contains Unicode characters
    const hasUnicode = /[^\x00-\x7F]/.test(message);
    const segmentLength = hasUnicode ? 70 : 160;
    
    return Math.ceil(message.length / segmentLength);
  }

  /**
   * Log SMS attempt for analytics and debugging
   */
  private async logSMSAttempt(
    to: string, 
    message: string, 
    success: boolean, 
    error?: string, 
    duration?: number, 
    messageId?: string,
    priority: string = 'normal'
  ): Promise<void> {
    const cost = this.calculateSMSCost(message, priority);
    const segments = this.calculateMessageSegments(message);
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      to,
      messageLength: message.length,
      segments,
      cost,
      priority,
      success,
      error,
      duration: duration || 0,
      messageId
    };
    
    try {
      // Save to database for analytics
      await storage.logSMSDelivery({
        messageId: messageId || `temp_${Date.now()}`,
        phoneNumber: to,
        message: message.substring(0, 1000), // Limit message length in DB
        status: success ? 'sent' : 'failed',
        segments,
        cost,
        priority,
        errorCode: error ? 'SEND_FAILED' : undefined,
        errorMessage: error,
        sentAt: new Date(),
      });

      // Log communication event for analytics
      await storage.logCommunicationEvent({
        eventType: 'sms_sent',
        source: 'sms',
        messageId: messageId || `temp_${Date.now()}`,
        userId: null, // Could be enhanced to track which user sent it
        channelId: null,
        cost,
        priority,
        eventTimestamp: new Date(),
        metadata: { 
          phoneNumber: to, 
          segments, 
          success,
          duration 
        },
      });

      // Broadcast real-time analytics update
      const analyticsService = (global as any).analyticsService;
      if (analyticsService) {
        await analyticsService.broadcastCommunicationUpdate('sms_sent', {
          messageId: messageId || `temp_${Date.now()}`,
          phoneNumber: to,
          segments,
          cost,
          priority,
          success,
          timestamp: new Date().toISOString(),
          duration
        });
      }

      if (success) {
        console.log(`📊 SMS Analytics: ${JSON.stringify(logEntry)}`);
      } else {
        console.error(`📊 SMS Error Log: ${JSON.stringify(logEntry)}`);
      }
    } catch (dbError) {
      console.error('Failed to log SMS attempt to database:', dbError);
      // Continue without failing the SMS operation
    }
  }

  /**
   * Update delivery status from Twilio webhook
   */
  updateDeliveryStatus(messageId: string, status: string, errorCode?: string, errorMessage?: string): void {
    const existingStatus = this.deliveryStatusMap.get(messageId);
    
    const updatedStatus: SMSDeliveryStatus = {
      messageId,
      status: status as SMSDeliveryStatus['status'],
      errorCode,
      errorMessage,
      timestamp: new Date(),
      retryCount: existingStatus?.retryCount || 0
    };
    
    this.deliveryStatusMap.set(messageId, updatedStatus);
    
    console.log(`📱 SMS Status Update: ${messageId} -> ${status}${errorCode ? ` (Error: ${errorCode})` : ''}`);
  }

  /**
   * Get delivery statistics for analytics
   */
  getDeliveryStats(): {
    totalMessages: number;
    successful: number;
    failed: number;
    pending: number;
    deliveryRate: number;
  } {
    const statuses = Array.from(this.deliveryStatusMap.values());
    const total = statuses.length;
    const successful = statuses.filter(s => s.status === 'delivered' || s.status === 'sent').length;
    const failed = statuses.filter(s => s.status === 'failed' || s.status === 'undelivered').length;
    const pending = statuses.filter(s => s.status === 'queued' || s.status === 'sending').length;
    
    return {
      totalMessages: total,
      successful,
      failed,
      pending,
      deliveryRate: total > 0 ? (successful / total) * 100 : 0
    };
  }

  /**
   * Clear old delivery status records (cleanup)
   */
  cleanupDeliveryStatus(olderThanHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    
    // Convert map entries to array to avoid TypeScript iteration issue
    const entries = Array.from(this.deliveryStatusMap.entries());
    for (const [messageId, status] of entries) {
      if (status.timestamp && status.timestamp < cutoffTime) {
        this.deliveryStatusMap.delete(messageId);
      }
    }
    
    console.log(`🧹 Cleaned up SMS delivery status records older than ${olderThanHours} hours`);
  }
}

// Export singleton instance
export const smsService = new SMSService();