import { ScheduledResponseRepository } from '@/database/repositories/ScheduledResponseRepository';
import { gmailService } from '@/services/GmailService';
import { CronJob } from 'cron';

export class ResponseSenderJob {
  private cronJob: CronJob;
  private scheduledResponseRepository: ScheduledResponseRepository;
  private isRunning: boolean = false;
  private lastEmailSentAt: Date | null = null;
  private readonly EMAIL_SEND_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

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
      // Check rate limiting - only send 1 email per 10 minutes
      const now = new Date();
      if (this.lastEmailSentAt) {
        const timeSinceLastEmail = now.getTime() - this.lastEmailSentAt.getTime();
        if (timeSinceLastEmail < this.EMAIL_SEND_INTERVAL_MS) {
          const remainingWaitTime = Math.ceil((this.EMAIL_SEND_INTERVAL_MS - timeSinceLastEmail) / 60000);
          console.log(`📤 Rate limiting: Must wait ${remainingWaitTime} more minutes before sending next email`);
          return;
        }
      }

      // Get responses ready to send (limit to 1 due to rate limiting)
      const readyResponses = await this.scheduledResponseRepository.findReadyToSend(1);
      
      if (readyResponses.length === 0) {
        return; // No responses to send
      }

      console.log(`📤 Found ${readyResponses.length} response(s) ready to send`);

      // Send only the first response (rate limited to 1 email per 10 minutes)
      const response = readyResponses[0];
      
      // Check if this response is too old (expired)
      const responseAge = now.getTime() - new Date(response.createdAt).getTime();
      const maxAge = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
      
      if (responseAge > maxAge) {
        console.log(`📤 Response ${response.id} is too old (${Math.round(responseAge / 1000 / 60 / 60)} hours), marking as expired`);
        await this.expireResponse(response);
      } else {
        await this.sendResponse(response);
        this.lastEmailSentAt = new Date();
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
        replyToMessageId: response.emailRecord?.gmailMessageId,
        threadId: response.emailRecord?.gmailThreadId
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

  private async expireResponse(response: any) {
    try {
      console.log(`📤 Expiring response ${response.id} to: ${response.recipientEmail}`);
      
      // Mark as expired
      await this.scheduledResponseRepository.markAsExpired(response.id);
      
      // TODO: Notify user that response expired
      console.log(`📤 ⚠️  Response expired: ${response.subject} to ${response.recipientEmail}`);
      console.log(`📤 User can manually send this response from the UI if needed`);
      
    } catch (error) {
      console.error(`📤 Error expiring response ${response.id}:`, error);
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