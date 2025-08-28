import { storage } from './storage';
import { smsService } from './smsService';

let schedulerInterval: NodeJS.Timeout | null = null;

// Process and send scheduled messages
async function processScheduledMessages() {
  try {
    // Get all scheduled messages that are due to be sent
    const messagesForDelivery = await storage.getScheduledMessagesForDelivery();
    
    if (messagesForDelivery.length === 0) {
      return; // No messages to process
    }

    console.log(`📅 Processing ${messagesForDelivery.length} scheduled message(s)...`);
    
    // Debug: Show current time and scheduled times
    const currentTime = new Date();
    console.log(`🕐 Current time: ${currentTime.toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT (${currentTime.toISOString()})`);
    
    for (const message of messagesForDelivery) {
      console.log(`📋 Message #${message.id} scheduled for: ${message.scheduledFor} (stored as: ${typeof message.scheduledFor})`);
      try {
        // Get target employees based on targetEmployees array
        let targetEmployees = [];
        
        if (message.targetEmployees && message.targetEmployees.length > 0) {
          // Get specific employees
          for (const empId of message.targetEmployees) {
            try {
              const employee = await storage.getUser(empId);
              if (employee && employee.smsEnabled && employee.phone) {
                targetEmployees.push(employee);
              }
            } catch (error) {
              console.warn(`Could not find employee ${empId}:`, error);
            }
          }
        } else {
          // Default to all staff if no specific targets
          const allEmployees = await storage.getUsers();
          targetEmployees = allEmployees.filter(emp => emp.smsEnabled && emp.phone);
        }

        console.log(`📱 Sending to ${targetEmployees.length} employee(s)`);

        // Send SMS to each target employee if SMS is enabled for the message
        if (message.smsEnabled && targetEmployees.length > 0) {
          const messageText = `${message.title}\n\n${message.content}\n\n- Pine Hill Farm`;
          
          for (const employee of targetEmployees) {
            try {
              const success = await smsService.sendSMS(employee.phone!, messageText);
              console.log(`📤 SMS ${success ? 'sent' : 'failed'} to ${employee.firstName} ${employee.lastName} (${employee.phone})`);
            } catch (error) {
              console.error(`Failed to send SMS to ${employee.firstName} ${employee.lastName}:`, error);
            }
          }
        }

        // Create announcement record for tracking
        const announcementData = {
          title: message.title,
          content: message.content,
          authorId: message.authorId,
          priority: message.priority,
          targetAudience: message.targetAudience,
          targetEmployees: message.targetEmployees,
          smsEnabled: message.smsEnabled,
          publishedAt: new Date(),
          status: 'published' as const
        };

        const announcement = await storage.createAnnouncement(announcementData);
        console.log(`✅ Created announcement record #${announcement.id}`);

        // Update scheduled message status to 'sent'
        await storage.updateScheduledMessage(message.id, {
          status: 'sent' as const,
          sentAt: new Date()
        });

        console.log(`✅ Scheduled message #${message.id} processed successfully at ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} CT`);

      } catch (error) {
        console.error(`Failed to process scheduled message #${message.id}:`, error);
        
        // Update message status to 'failed'
        await storage.updateScheduledMessage(message.id, {
          status: 'failed' as const
        });
      }
    }

  } catch (error) {
    console.error('Error in scheduled message processor:', error);
  }
}

// Start the message scheduler
export function startMessageScheduler() {
  if (schedulerInterval) {
    console.log('📅 Message scheduler already running');
    return;
  }

  console.log('🚀 Starting message scheduler - checking every 30 seconds');

  // Check for scheduled messages every 30 seconds
  schedulerInterval = setInterval(async () => {
    await processScheduledMessages();
  }, 30000); // 30 seconds

  // Run once immediately on startup
  processScheduledMessages();
}

// Stop the message scheduler
export function stopMessageScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('📅 Message scheduler stopped');
  }
}