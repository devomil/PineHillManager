import twilio from 'twilio';

// Environment variables for Twilio configuration
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER!;

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
      client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
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
}

export class SMSService {
  private fromPhoneNumber: string;

  constructor() {
    // Format phone number to E.164 format (+1XXXXXXXXXX)
    this.fromPhoneNumber = TWILIO_PHONE_NUMBER.startsWith('+') 
      ? TWILIO_PHONE_NUMBER 
      : `+1${TWILIO_PHONE_NUMBER.replace(/\D/g, '')}`;
    
    console.log(`SMS Service initialized with phone number: ${this.fromPhoneNumber}`);
  }

  /**
   * Send a single SMS message
   */
  async sendSMS({ to, message, priority }: SMSMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Check if Twilio is configured
      if (!twilioConfigured || !client) {
        console.warn('SMS disabled: Twilio not configured properly');
        return { success: false, error: 'SMS service not available' };
      }

      // Format recipient phone number
      const formattedTo = this.formatPhoneNumber(to);
      
      if (!formattedTo) {
        return { success: false, error: 'Invalid phone number format' };
      }

      // Add priority prefix for emergency messages
      const finalMessage = priority === 'emergency' 
        ? `🚨 EMERGENCY: ${message}` 
        : message;

      const twilioMessage = await client.messages.create({
        body: finalMessage,
        from: this.fromPhoneNumber,
        to: formattedTo,
      });

      console.log(`SMS sent successfully to ${formattedTo}, SID: ${twilioMessage.sid}`);
      
      return { 
        success: true, 
        messageId: twilioMessage.sid 
      };
    } catch (error: any) {
      console.error('SMS sending failed:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to send SMS' 
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
}

// Export singleton instance
export const smsService = new SMSService();