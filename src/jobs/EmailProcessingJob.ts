import { CalendarRepository } from '@/database/repositories/CalendarRepository';
import { EmailRepository } from '@/database/repositories/EmailRepository';
import { ScheduledResponseRepository } from '@/database/repositories/ScheduledResponseRepository';
import { UserRepository, UserWithTokens } from '@/database/repositories/UserRepository';
import { calendarService } from '@/services/CalendarMCP';
import { gmailService } from '@/services/GmailService';
import { openaiService } from '@/services/OpenAIService';
import { EmailMessage } from '@/types';
import { EmailDirection, Prisma, ProcessingStatus } from '@prisma/client';
import { CronJob } from 'cron';

export class EmailProcessingJob {
  private cronJob: CronJob;
  private emailRepository: EmailRepository;
  private userRepository: UserRepository;
  private scheduledResponseRepository: ScheduledResponseRepository;
  private calendarRepository: CalendarRepository;
  private isRunning: boolean = false;

  constructor() {
    this.emailRepository = new EmailRepository();
    this.userRepository = new UserRepository();
    this.scheduledResponseRepository = new ScheduledResponseRepository();
    this.calendarRepository = new CalendarRepository();
    
    this.cronJob = new CronJob('0 */5 * * * *', () => {
      this.processEmails().catch((error) => {
        console.error('🤖 Email processing job failed:', error);
      });
    }, null, false, 'America/Los_Angeles');
  }

  start(): void {
    console.log('🤖 Starting Email Processing Job (Sync + Process) - every 5 minutes');
    this.cronJob.start();
  }

  stop(): void {
    console.log('🤖 Stopping Email Processing Job');
    this.cronJob.stop();
  }

  async processEmails(): Promise<void> {
    if (this.isRunning) {
      console.log('🤖 Email processing already running, skipping...');
      return;
    }

    this.isRunning = true;
    console.log('🤖 Starting email sync and processing...');

    try {
      const users = await this.userRepository.findMany({}) as UserWithTokens[];
      
      for (const user of users) {
        try {
          await this.processUserEmails(user);
        } catch (error) {
          console.error(`🤖 Failed to process emails for user ${user.email}:`, error);
        }
      }
      
      console.log('🤖 Email processing completed');
    } catch (error) {
      console.error('🤖 Email processing failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processUserEmails(user: UserWithTokens): Promise<void> {
    try {
      console.log(`🤖 Processing emails for user: ${user.email}`);

      // Skip users without valid Google tokens
      if (!user.googleTokens || !user.googleTokens.accessToken) {
        console.log(`🤖 User ${user.email} has no Google tokens, skipping email processing`);
        return;
      }

      // Initialize GmailService with user-specific tokens
      if (!user.googleTokens.accessToken || !user.googleTokens.refreshToken) {
        console.log(`🤖 User ${user.email} has incomplete Google tokens, skipping`);
        return;
      }

      // Create a user-specific Gmail service instance
      const userGmailService = gmailService;
      
      // Set user-specific tokens
      try {
        userGmailService.setUserTokens(user.googleTokens.accessToken, user.googleTokens.refreshToken);
        
        // Verify we can access the user's Gmail by getting their profile
        const profile = await userGmailService.getProfile();
        const authenticatedEmail = profile.emailAddress?.toLowerCase();
        const targetEmail = user.email?.toLowerCase();
        
        if (authenticatedEmail !== targetEmail) {
          console.error(`🤖 ⚠️ CRITICAL: Token mismatch! Expected ${targetEmail}, got ${authenticatedEmail}`);
          return;
        }
        
        console.log(`🤖 ✅ Successfully authenticated Gmail service for user: ${user.email}`);
      } catch (error) {
        console.error(`🤖 Failed to authenticate Gmail service for user ${user.email}, skipping:`, error);
        return;
      }

      // Get user's last processed email time (last 24 hours max)
      const lastEmail = await this.emailRepository.findMany({
        userId: user.id,
        limit: 1,
        sortBy: 'receivedAt',
        sortOrder: 'desc'
      });

      const lastSyncTime = lastEmail[0]?.receivedAt || new Date(Date.now() - 24 * 60 * 60 * 1000);
      const searchAfter = Math.floor(lastSyncTime.getTime() / 1000);
      
      // Get ALL emails (inbound and outbound) for complete logging and processing
      // This includes: received emails, sent emails, conversation threads
      // Use OR operator to search both inbox and sent emails
      const query = `after:${searchAfter} -from:noreply -from:no-reply -from:donotreply`;
      
      console.log(`🤖 Fetching emails with query: ${query} for user: ${user.email}`);
      
      const emails = await userGmailService.searchEmails(query, 20);
      console.log(`🤖 Found ${emails.length} emails to analyze for user ${user.email} (inbound, outbound, and conversations)`);

      for (const email of emails) {
        await this.processSingleEmail(user.id, email, userGmailService);
      }
      
    } catch (error) {
      console.error(`🤖 Error processing emails for user ${user.id}:`, error);
    }
  }

  private async processEmailWithMCP(userId: string, email: EmailMessage, emailRecord: any, user: any): Promise<void> {
    try { 
      const sentScheduledResponses = await this.scheduledResponseRepository.findSentResponsesByThreadId(email.threadId);
      if (sentScheduledResponses.length > 0) {
        // This is a reply to a sent scheduled response, check if we need to create calendar event
        await this.processReplyToScheduledResponse(userId, email, sentScheduledResponses);
        await this.emailRepository.markAsProcessed(emailRecord.id, false);
        return;
      }  
      // Let AI analyze email and directly check calendar for available slots
      const mcpAnalysis = await openaiService.analyzeEmailAndSchedule(email);  
      
      console.log(`🤖 MCP-AI Demo request detected: ${email.subject} (confidence: ${mcpAnalysis.confidence})`);
      console.log(`🤖 MCP-AI found ${mcpAnalysis.proposedTimeSlots.length} available time slots`);

      // Convert AI-found time slots to our internal format
      const timeSlots = mcpAnalysis.proposedTimeSlots.map(slot => ({
        start: new Date(slot.start),
        end: new Date(slot.end),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        formatted: slot.formatted,
      }));

      // Calculate when email will be sent (1 hour delay)
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 1);

      console.log(`🤖 Creating MCP-scheduled response:`);
      console.log(`🤖   - Assigned to userId: ${userId}`);
      console.log(`🤖   - User email: ${user.email}`);
      console.log(`🤖   - Recipient: ${mcpAnalysis.contactInfo.name} <${mcpAnalysis.contactInfo.email}>`);
      console.log(`🤖   - Scheduled for: ${scheduledAt.toISOString()}`);
      console.log(`🤖   - AI Generated Response Preview: ${mcpAnalysis.emailResponse.substring(0, 100)}...`);
      console.log(`🤖   - AI Generated Response Length: ${mcpAnalysis.emailResponse.length} characters`);
      console.log(`🤖   - AI Generated Response Full: ${JSON.stringify(mcpAnalysis.emailResponse)}`);

      // Create scheduled response with AI-generated content
      const createdResponse = await this.scheduledResponseRepository.create({
        userId,
        emailRecordId: emailRecord.id,
        recipientEmail: mcpAnalysis.contactInfo.email,
        recipientName: mcpAnalysis.contactInfo.name,
        subject: `Re: ${email.subject}`,
        body: mcpAnalysis.emailResponse,
        proposedTimeSlots: timeSlots as Prisma.InputJsonValue,
        scheduledAt,
      });

      console.log(`🤖 ✅ MCP-scheduled response created with ID: ${createdResponse.id}`);

      // Send Slack notification if configured
      await this.sendSlackNotification(email, mcpAnalysis.contactInfo, createdResponse, timeSlots);

      // Mark email as processed  
      await this.emailRepository.markAsProcessed(emailRecord.id, true);

    } catch (error) {
      console.error(`🤖 Error in MCP email processing:`, error);
      // Mark as failed since MCP is now the primary system
      await this.emailRepository.markAsFailed(emailRecord.id);
      throw error;
    }
  }


  private async processSingleEmail(userId: string, email: EmailMessage, userGmailService?: any): Promise<void> {
    try {
      // Check if email already exists
      const existing = await this.emailRepository.findByGmailMessageId(email.id);
      if (existing) {
        // Check if this might be a reply to a scheduled response that needs calendar event creation
        const sentScheduledResponses = await this.scheduledResponseRepository.findSentResponsesByThreadId(email.threadId);
        if (sentScheduledResponses.length > 0) {
          await this.processReplyToScheduledResponse(userId, email, sentScheduledResponses);
        } else {
          console.log(`🤖 Email ${email.id} already processed, skipping`);
        }
        return;
      }
      let messageIdHeader: string | null = null;
      if (userGmailService) {
        try {
          const fullMessage = await userGmailService.getMessage(email.id);
          messageIdHeader = this.extractMessageIdHeader(fullMessage);
          console.log(`📧 Extracted Message-ID: ${messageIdHeader}`);
        } catch (error) {
          console.warn(`📧 Could not extract Message-ID for ${email.id}:`, error);
        }
      }

      // Determine if this email is inbound (sent TO user) or outbound (sent BY user)
      const user = await this.userRepository.findById(userId);
      const userEmail = user?.email?.toLowerCase();
      const emailFrom = email.from.toLowerCase();
      const emailTo = email.to.toLowerCase();
      const isInboundEmail = !emailFrom.includes(userEmail || '');
      const emailDirection = isInboundEmail ? EmailDirection.INBOUND : EmailDirection.OUTBOUND;
      
      console.log(`🤖 Email analysis for user ${userEmail}:`);
      console.log(`🤖   - Email from: ${emailFrom}`);
      console.log(`🤖   - Email to: ${emailTo}`);
      console.log(`🤖   - User email: ${userEmail}`);
      console.log(`🤖   - Classified as: ${isInboundEmail ? 'INBOUND' : 'OUTBOUND'}`);
      
      // Additional safety check: verify this email actually belongs to this user
      if (!emailFrom.includes(userEmail || '') && !emailTo.includes(userEmail || '')) {
        console.error(`🤖 ⚠️  CRITICAL: Email doesn't belong to user ${userEmail}! Skipping to prevent wrong assignment.`);
        console.error(`🤖   - Email from: ${emailFrom}`);
        console.error(`🤖   - Email to: ${emailTo}`);
        console.error(`🤖   - Subject: ${email.subject}`);
        return;
      }
      
      console.log(`🤖 Processing ${isInboundEmail ? 'INBOUND' : 'OUTBOUND'} email: ${email.subject}`);

      // Store email in database first (for complete logging)
      const emailRecord = await this.emailRepository.create({
        userId,
        gmailMessageId: email.id,
        gmailThreadId: email.threadId,
        messageIdHeader,
        from: email.from,
        to: email.to,
        subject: email.subject,
        body: email.body,
        receivedAt: email.receivedAt || new Date(),
        direction: emailDirection
      });

      // Mark as processing
      await this.emailRepository.update(emailRecord.id, {
        processingStatus: ProcessingStatus.PROCESSING
      });

      // Only process INBOUND emails for demo requests (outbound emails are just logged)
      if (!isInboundEmail) {
        console.log(`🤖 Outbound email logged: ${email.subject}`);
        await this.emailRepository.markAsProcessed(emailRecord.id, false);
        return;
      }

      // 1. Pre-filtering - Skip newsletters, bounces, etc. (only for inbound emails)
      if (this.shouldSkipEmail(email)) {
        console.log(`🤖 Skipping inbound email (pre-filter): ${email.subject}`);
        await this.emailRepository.update(emailRecord.id, {
          processingStatus: ProcessingStatus.SKIPPED
        });
        return;
      }

      // 2. AI Analysis - Use MCP-integrated AI
      console.log(`🤖 Using AI-MCP analysis for: ${email.subject}`);
      await this.processEmailWithMCP(userId, email, emailRecord, user!);
      
    } catch (error) {
      console.error(`🤖 Error processing email:`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      try {
        // Try to find the email record to mark as failed
        const existing = await this.emailRepository.findByGmailMessageId(email.id);
        if (existing) {
          await this.emailRepository.markAsFailed(existing.id);
        }
      } catch (markFailedError) {
        console.error('🤖 Error marking email as failed:', markFailedError);
      }
    }
  }

  private shouldSkipEmail(email: EmailMessage): boolean {
    const subject = email.subject.toLowerCase();
    const body = email.body.toLowerCase();
    const from = email.from.toLowerCase();

    // Skip newsletters and marketing emails
    const newsletterIndicators = [
      'unsubscribe', 'newsletter', 'marketing', 'promotion', 
      'sale', 'discount', 'offer', 'deals', 'no-reply'
    ];

    // Skip bounce and delivery failures
    const bounceIndicators = [
      'delivery failure', 'bounce', 'postmaster', 'mailer-daemon',
      'delivery status notification', 'returned mail'
    ];

    // Skip automated emails
    const automatedIndicators = [
      'do-not-reply', 'noreply', 'auto-reply', 'out of office',
      'automatic reply', 'vacation response'
    ];

    const allSkipIndicators = [...newsletterIndicators, ...bounceIndicators, ...automatedIndicators];

    return allSkipIndicators.some(indicator => 
      subject.includes(indicator) || body.includes(indicator) || from.includes(indicator)
    );
  }

  // Old fallback methods removed - now using OpenAI service for all AI tasks

  /**
   * Extract Message-ID header from Gmail message for proper threading
   */
  private extractMessageIdHeader(gmailMessage: any): string | null {
    try {
      if (!gmailMessage?.payload?.headers) {
        return null;
      }

      // Find the Message-ID header
      const messageIdHeader = gmailMessage.payload.headers.find(
        (header: any) => header.name?.toLowerCase() === 'message-id'
      );

      return messageIdHeader?.value || null;
    } catch (error) {
      console.error('📧 Error extracting Message-ID header:', error);
      return null;
    }
  }


  // Manual trigger for testing
  async triggerProcessing(): Promise<void> {
    return this.processEmails();
  }

  private async processReplyToScheduledResponse(
    userId: string,
    email: EmailMessage,
    sentScheduledResponses: any[]
  ): Promise<void> {
    try {
      console.log(`🤖 Processing reply to scheduled response for email: ${email.subject}`);
      
      // Extract attendee email from the reply
      const attendeeEmail = email.from.includes('<') ? email.from.split('<')[1].replace('>', '') : email.from;
      
      // Check if calendar event already exists for this thread and attendee
      const existingEvent = await this.calendarRepository.findEventByThreadAndAttendee(
        userId, 
        email.threadId, 
        attendeeEmail
      );
      
      if (existingEvent) {
        console.log(`🤖 ✅ Calendar event already exists for this thread and attendee: ${existingEvent.googleEventId}`);
        console.log(`🤖 Event details: ${existingEvent.summary} on ${existingEvent.startTime.toISOString()}`);
        return;
      }
      
      // Use AI to analyze if this reply accepts one of the proposed time slots
      const user = await this.userRepository.findById(userId);
      if (!user) {
        console.error(`🤖 User not found: ${userId}`);
        return;
      }

      // Get the most recent scheduled response
      const latestScheduledResponse = sentScheduledResponses[0];
      if (!latestScheduledResponse || !latestScheduledResponse.proposedTimeSlots) {
        console.log(`🤖 No valid scheduled response with time slots found`);
        return;
      }

      console.log(`🤖 Analyzing reply for calendar event creation...`);
      
      // Use AI to analyze the reply and determine if a calendar event should be created
      const mcpAnalysis = await openaiService.analyzeReplyForCalendarEvent(email, latestScheduledResponse);
      
      if (mcpAnalysis.shouldCreateEvent && mcpAnalysis.selectedTimeSlot) {
        console.log(`🤖 AI determined calendar event should be created`);
        
        // Create calendar event using the selected time slot
        const calendarEvent = await calendarService.create_calendar_event({
          summary: `Meeting with ${email.from.split('<')[0].trim() || 'Guest'}`,
          description: `Meeting scheduled based on email conversation`,
          startDateTime: mcpAnalysis.selectedTimeSlot.start,
          endDateTime: mcpAnalysis.selectedTimeSlot.end,
          attendeeEmail: attendeeEmail,
          attendeeName: email.from.split('<')[0].trim() || email.from
        });

        console.log(`🤖 ✅ Calendar event created: ${calendarEvent.id}`);
        
        // Store calendar event record in database
        // We need to find the email record for this reply email, not use the scheduled response ID
        const replyEmailRecord = await this.emailRepository.findByGmailMessageId(email.id);
        
        await this.calendarRepository.create({
          userId,
          emailRecordId: replyEmailRecord?.id, // Use the reply email's record ID, can be null
          googleEventId: calendarEvent.id!,
          calendarId: 'primary',
          summary: calendarEvent.summary,
          startTime: new Date(mcpAnalysis.selectedTimeSlot.start),
          endTime: new Date(mcpAnalysis.selectedTimeSlot.end),
          timezone: calendarEvent.start.timezone || 'UTC',
          attendeeEmail: attendeeEmail,
          attendeeName: email.from.split('<')[0].trim() || email.from
        });

        console.log(`🤖 ✅ Calendar event record saved to database`);
      } else {
        console.log(`🤖 AI determined no calendar event needed: ${mcpAnalysis.reason || 'No clear time slot acceptance'}`);
      }

    } catch (error) {
      console.error(`🤖 Error processing reply to scheduled response:`, error);
    }
  }

  getStatus(): { isRunning: boolean; isStarted: boolean; lastRun?: Date; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      isStarted: true, // CronJob doesn't expose running property
      lastRun: undefined, // CronJob lastDate/nextDate have type issues
      nextRun: undefined
    };
  }

  private async sendSlackNotification(
    email: EmailMessage, 
    contactInfo: { name: string; email: string }, 
    scheduledResponse: any,
    timeSlots: any[]
  ): Promise<void> {
    try {
      const slackWebhookUrl = process.env.SLACK_NOTIFICATION_URL;
      
      if (!slackWebhookUrl) {
        console.log('🤖 SLACK_NOTIFICATION_URL not configured, skipping Slack notification');
        return;
      }

      const slotsText = timeSlots
        .map((slot, index) => `${index + 1}. ${slot.formatted}`)
        .join('\n');

      const message = {
        text: "🎯 Demo Request Received & Auto-Reply Generated!",
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🎯 New Demo Request Processed"
            }
          },
          {
            type: "section",
            fields: [
              {
                type: "mrkdwn",
                text: `*Contact:* ${contactInfo.name}\n*Email:* ${contactInfo.email}`
              },
              {
                type: "mrkdwn",
                text: `*Subject:* ${email.subject}\n*Scheduled At:* ${scheduledResponse.scheduledAt.toLocaleString()}`
              }
            ]
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Proposed Time Slots:*\n${slotsText}`
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*Auto-Generated Reply Preview:*\n_${scheduledResponse.body.substring(0, 200)}${scheduledResponse.body.length > 200 ? '...' : ''}_`
            }
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "📊 Open Dashboard"
                },
                url: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}`,
                style: "primary"
              },
              {
                type: "button",
                text: {
                  type: "plain_text",
                  text: "✏️ Edit Response"
                },
                url: `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/scheduled-responses`
              }
            ]
          }
        ]
      };

      const response = await fetch(slackWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (response.ok) {
        console.log('🤖 ✅ Slack notification sent successfully');
      } else {
        console.error('🤖 ❌ Failed to send Slack notification:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('🤖 ❌ Error sending Slack notification:', error);
    }
  }
}

// Export singleton
export const emailProcessingJob = new EmailProcessingJob();