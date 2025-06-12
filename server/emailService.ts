import sgMail from '@sendgrid/mail';

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SENDGRID_API_KEY not found - email notifications disabled');
}

interface SupportTicketData {
  category: string;
  subject: string;
  description: string;
  submittedBy: {
    name: string;
    email: string;
  };
  assignedTo: {
    name: string;
    email: string;
  };
}

export async function sendSupportTicketNotification(ticketData: SupportTicketData): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.log('SendGrid not configured - skipping email notification');
    return false;
  }

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-family: 'Great Vibes', cursive; font-size: 2.5em;">Pine Hill Farm</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Employee Support System</p>
      </div>
      
      <div style="padding: 30px; background: #ffffff;">
        <h2 style="color: #1e40af; margin-top: 0;">New Support Ticket Submitted</h2>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #374151;">Ticket Details</h3>
          <p><strong>Category:</strong> ${ticketData.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
          <p><strong>Subject:</strong> ${ticketData.subject}</p>
          <p><strong>Submitted by:</strong> ${ticketData.submittedBy.name} (${ticketData.submittedBy.email})</p>
        </div>
        
        <div style="background: #ffffff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #374151;">Description:</h4>
          <p style="line-height: 1.6; color: #6b7280;">${ticketData.description}</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>Action Required:</strong> This ticket has been assigned to you. Please respond within 24 hours.
          </p>
        </div>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 14px;">
        <p>Pine Hill Farm Employee Management System</p>
        <p>This is an automated notification. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  const msg = {
    to: ticketData.assignedTo.email,
    from: {
      email: 'noreply@pinehillfarm.co',
      name: 'Pine Hill Farm Support System'
    },
    subject: `New Support Ticket: ${ticketData.subject}`,
    html: emailHtml,
    text: `
New Support Ticket Submitted

Category: ${ticketData.category.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
Subject: ${ticketData.subject}
Submitted by: ${ticketData.submittedBy.name} (${ticketData.submittedBy.email})

Description:
${ticketData.description}

Please respond within 24 hours.

Pine Hill Farm Employee Management System
    `.trim()
  };

  try {
    await sgMail.send(msg);
    console.log(`Support ticket notification sent to ${ticketData.assignedTo.email}`);
    return true;
  } catch (error) {
    console.error('Error sending support ticket notification:', error);
    return false;
  }
}