import { CronJob } from 'cron';
import { ScheduledResponseRepository } from '@/repositories/ScheduledResponseRepository';
import { gmailService } from '@/services/GmailService';
import { ResponseStatus } from '@prisma/client';

export class ResponseSenderJob {
  private cronJob: CronJob;
  private scheduledResponseRepository: ScheduledResponseRepository;
  private isRunning: boolean = false;

  constructor() {
    this.scheduledResponseRepository = new ScheduledResponseRepository();
    
    // Run every minute: '0 * * * * *'
    this.cronJob = new CronJob('0 * * * * *', () => {
      this.sendQueuedResponses();
    }, null, false, 'America/Los_Angeles');
  }

  start() {
    console.log('📤 Starting Response Sender Job - every minute');
    this.cronJob.start();
  }

  stop() {
    console.log('📤 Stopping Response Sender Job');
    this.cronJob.stop();
  }

  async sendQueuedResponses() {
    if (this.isRunning) {
      console.log('📤 Response sender already running, skipping...');
      return;
    }

    this.isRunning = true;

    try {
      // Get responses ready to send (limit to 5 per run)
      const readyResponses = await this.scheduledResponseRepository.findReadyToSend(5);
      
      if (readyResponses.length === 0) {
        return; // No responses to send
      }

      console.log(`📤 Found ${readyResponses.length} responses ready to send`);

      for (const response of readyResponses) {
        await this.sendResponse(response);
      }
      
      console.log('📤 Response sending completed');
    } catch (error) {
      console.error('📤 Response sending failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async sendResponse(response: any) {
    try {
      console.log(`📤 Sending response to: ${response.recipientEmail}`);

      // Send email via Gmail
      const sentMessage = await gmailService.sendEmail({
        to: response.recipientEmail,
        subject: response.subject,
        body: response.body,
        replyToMessageId: response.emailRecord?.gmailMessageId
      });

      // Mark as sent
      await this.scheduledResponseRepository.markAsSent(response.id, sentMessage.id);

      console.log(`📤 Successfully sent response to: ${response.recipientEmail}`);
      
    } catch (error) {
      console.error(`📤 Error sending response ${response.id}:`, error);
      
      // Mark as failed
      await this.scheduledResponseRepository.markAsFailed(response.id);
    }
  }

  // Manual trigger for testing
  async triggerSending() {
    return this.sendQueuedResponses();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isStarted: true, // CronJob doesn't expose running property
      lastRun: undefined, // CronJob lastDate/nextDate have type issues  
      nextRun: undefined
    };
  }
}

// Export singleton
export const responseSenderJob = new ResponseSenderJob();