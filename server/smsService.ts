import twilio from 'twilio';

class SMSService {
  private client: twilio.Twilio | null = null;
  private fromPhoneNumber: string | null = null;

  constructor() {
    this.initializeTwilio();
  }

  private initializeTwilio() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

    if (accountSid && authToken && this.fromPhoneNumber) {
      this.client = twilio(accountSid, authToken);
      console.log('SMS service initialized successfully');
    } else {
      console.log('SMS service not configured - missing Twilio credentials');
    }
  }

  async sendSMS(to: string, message: string): Promise<boolean> {
    if (!this.client || !this.fromPhoneNumber) {
      console.log('SMS service not configured');
      return false;
    }

    try {
      const result = await this.client.messages.create({
        body: message,
        from: this.fromPhoneNumber,
        to: to
      });

      console.log(`SMS sent successfully: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  async sendTimeOffAlert(managerPhone: string, employeeName: string): Promise<boolean> {
    const message = `Pine Hill Farm: ${employeeName} has submitted a time-off request that needs your approval. Check the dashboard for details.`;
    return this.sendSMS(managerPhone, message);
  }

  async sendShiftCoverageAlert(managerPhone: string, requesterName: string, shiftDate: string): Promise<boolean> {
    const message = `Pine Hill Farm: ${requesterName} needs shift coverage for ${shiftDate}. Urgent attention required.`;
    return this.sendSMS(managerPhone, message);
  }

  async sendApprovalDecision(employeePhone: string, type: 'approved' | 'denied', requestType: string): Promise<boolean> {
    const status = type === 'approved' ? 'approved' : 'denied';
    const message = `Pine Hill Farm: Your ${requestType} request has been ${status}. Check the app for details.`;
    return this.sendSMS(employeePhone, message);
  }

  isConfigured(): boolean {
    return this.client !== null && this.fromPhoneNumber !== null;
  }
}

export const smsService = new SMSService();