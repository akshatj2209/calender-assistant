import { EmailRepository } from '@/database/repositories/EmailRepository';
import { ScheduledResponseRepository } from '@/database/repositories/ScheduledResponseRepository';
import { UserRepository, UserWithTokens } from '@/database/repositories/UserRepository';
import { calendarService } from '@/services/CalendarService';
import { GmailService } from '@/services/GmailService';
import { CronJob } from 'cron';
// import { openAIService } from '@/services/OpenAIService';
import { EmailMessage } from '@/types';
import { Prisma, ProcessingStatus } from '@prisma/client';

interface TimePreferences {
  preferredDays?: string[];
  preferredTimes?: string[];
  timeRange?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  urgency?: 'low' | 'medium' | 'high';
  [key: string]: unknown;
}

interface ContactInfo {
  name: string;
  email: string;
  company?: string;
  [key: string]: unknown;
}

interface IntentAnalysis {
  isDemoRequest: boolean;
  confidence: number;
  reasoning: string;
  [key: string]: unknown;
}

interface TimeSlot {
  start: Date;
  end: Date;
  formatted: string;
  [key: string]: unknown;
}

interface CalendarEvent {
  start?: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  [key: string]: unknown;
}

export class EmailProcessingJob {
  private cronJob: CronJob;
  private emailRepository: EmailRepository;
  private userRepository: UserRepository;
  private scheduledResponseRepository: ScheduledResponseRepository;
  private isRunning: boolean = false;

  constructor() {
    this.emailRepository = new EmailRepository();
    this.userRepository = new UserRepository();
    this.scheduledResponseRepository = new ScheduledResponseRepository();
    
    // Run every 5 minutes: '0 */5 * * * *'
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
      // Get all active users (includes googleTokens by default)
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
      const userGmailService = new GmailService();
      
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

  private async processSingleEmail(userId: string, email: EmailMessage, userGmailService?: GmailService): Promise<void> {
    try {
      // Check if email already exists
      const existing = await this.emailRepository.findByGmailMessageId(email.id);
      if (existing) {
        console.log(`🤖 Email ${email.id} already processed, skipping`);
        return;
      }

      // Determine if this email is inbound (sent TO user) or outbound (sent BY user)
      const user = await this.userRepository.findById(userId);
      const userEmail = user?.email?.toLowerCase();
      const emailFrom = email.from.toLowerCase();
      const emailTo = email.to.toLowerCase();
      const isInboundEmail = !emailFrom.includes(userEmail || '');
      
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
        from: email.from,
        to: email.to,
        subject: email.subject,
        body: email.body,
        receivedAt: email.receivedAt || new Date()
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

      // 2. AI Analysis - Check if it's a demo request (only for inbound emails)
      const intentAnalysis = await this.analyzeEmailIntent(email);
      
      if (!intentAnalysis.isDemoRequest) {
        console.log(`🤖 Email is not a demo request: ${email.subject}`);
        await this.emailRepository.markAsProcessed(emailRecord.id, false);
        return;
      }

      console.log(`🤖 Demo request detected: ${email.subject} (confidence: ${intentAnalysis.confidence})`);

      // 3. Extract time preferences and contact info
      const timePreferences = await this.extractTimePreferences(email);
      const contactInfo = this.extractContactInfo(email);

      // 4. Calculate when email will be sent (1 hour delay)
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 1);

      // 5. Find available time slots (starting after email send time + buffer)
      const timeSlots = await this.findAvailableTimeSlots(userId, timePreferences, scheduledAt);

      if (timeSlots.length === 0) {
        console.log(`🤖 No available time slots found for: ${email.subject}`);
        await this.emailRepository.markAsFailed(emailRecord.id);
        return;
      }

      // 6. Generate response
      const response = await this.generateResponse(email, contactInfo, timeSlots);

      console.log(`🤖 Creating scheduled response:`);
      console.log(`🤖   - Assigned to userId: ${userId}`);
      console.log(`🤖   - User email: ${user?.email}`);
      console.log(`🤖   - Recipient: ${contactInfo.name} <${contactInfo.email}>`);
      console.log(`🤖   - Subject: ${response.subject}`);
      console.log(`🤖   - Scheduled for: ${scheduledAt.toISOString()}`);

      const createdResponse = await this.scheduledResponseRepository.create({
        userId,
        emailRecordId: emailRecord.id,
        recipientEmail: contactInfo.email,
        recipientName: contactInfo.name,
        subject: response.subject,
        body: response.body,
        proposedTimeSlots: timeSlots as Prisma.InputJsonValue,
        scheduledAt
      });

      console.log(`🤖 ✅ Scheduled response created with ID: ${createdResponse.id}`);

      // 7. Mark email as processed
      await this.emailRepository.markAsProcessed(emailRecord.id, true);

      console.log(`🤖 Successfully processed email: ${email.subject}`);
      
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

  private async analyzeEmailIntent(email: EmailMessage): Promise<IntentAnalysis> {
    const prompt = `
      Analyze this email and determine if it's requesting a product demo, sales meeting, or business consultation.
      
      Subject: ${email.subject}
      From: ${email.from}
      Body: ${email.body}
      
      Look for:
      - Explicit requests for demos, meetings, calls
      - Interest in learning more about products/services
      - Requests for consultations or discussions
      - Follow-ups from conferences, LinkedIn, referrals
      - General business inquiries that could lead to sales opportunities
      
      Return JSON with:
      {
        "isDemoRequest": boolean,
        "confidence": number (0-1),
        "reasoning": "brief explanation of decision"
      }
    `;

    try {
      // Note: This is a placeholder. Replace with actual OpenAI service call
      const response = JSON.stringify({
        isDemoRequest: this.fallbackIntentAnalysis(email).isDemoRequest,
        confidence: this.fallbackIntentAnalysis(email).confidence,
        reasoning: "Fallback keyword analysis used"
      });
      
      return JSON.parse(response);
    } catch (error) {
      console.error('🤖 AI analysis failed, using fallback:', error);
      return this.fallbackIntentAnalysis(email);
    }
  }

  private fallbackIntentAnalysis(email: EmailMessage): IntentAnalysis {
    const demoKeywords = [
      'demo', 'meeting', 'schedule', 'interested', 'learn more', 
      'product tour', 'walkthrough', 'consultation', 'discuss',
      'show me', 'see the product', 'chat about', 'explore'
    ];
    
    const content = `${email.subject} ${email.body}`.toLowerCase();
    
    const matchedKeywords = demoKeywords.filter(keyword => content.includes(keyword));
    const hasKeywords = matchedKeywords.length > 0;
    
    return {
      isDemoRequest: hasKeywords,
      confidence: hasKeywords ? Math.min(0.8, matchedKeywords.length * 0.2) : 0.2,
      reasoning: `Fallback analysis - ${hasKeywords ? `Found keywords: ${matchedKeywords.join(', ')}` : 'No relevant keywords found'}`
    };
  }

  private async extractTimePreferences(email: EmailMessage): Promise<TimePreferences> {
    // Fallback time preference extraction
    const content = `${email.subject} ${email.body}`.toLowerCase();
    
    const timeKeywords = {
      morning: ['morning', 'am', '9am', '10am', '11am'],
      afternoon: ['afternoon', 'pm', '1pm', '2pm', '3pm', '4pm'],
      evening: ['evening', '5pm', '6pm', 'after work']
    };

    let timeRange: 'morning' | 'afternoon' | 'evening' | 'flexible' = 'flexible';
    
    for (const [range, keywords] of Object.entries(timeKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        timeRange = range as 'morning' | 'afternoon' | 'evening';
        break;
      }
    }

    const urgencyKeywords = {
      high: ['urgent', 'asap', 'immediately', 'today', 'this week'],
      low: ['eventually', 'sometime', 'no rush', 'when you can']
    };

    let urgency: 'low' | 'medium' | 'high' = 'medium';
    
    if (urgencyKeywords.high.some(keyword => content.includes(keyword))) {
      urgency = 'high';
    } else if (urgencyKeywords.low.some(keyword => content.includes(keyword))) {
      urgency = 'low';
    }

    return {
      timeRange,
      urgency
    };
  }

  private extractContactInfo(email: EmailMessage): ContactInfo {
    // Extract name from "Name <email>" format
    const fromMatch = email.from.match(/^(.+?)\s*<(.+?)>$/);
    
    const contactEmail = fromMatch ? fromMatch[2].trim() : email.from;
    const contactName = fromMatch ? fromMatch[1].trim() : contactEmail.split('@')[0];

    return {
      name: contactName,
      email: contactEmail,
      company: this.extractCompanyFromEmail(contactEmail)
    };
  }

  private extractCompanyFromEmail(emailAddress: string): string | undefined {
    const domain = emailAddress.split('@')[1];
    if (!domain) {
      return undefined;
    }
    
    const cleanDomain = domain
      .replace(/^(www\.|mail\.)/, '')
      .replace(/\.(com|org|net|io|co).*$/, '');
    
    return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
  }

  private async findAvailableTimeSlots(userId: string, preferences: TimePreferences, emailSendTime: Date): Promise<TimeSlot[]> {
    try {
      // Calculate minimum start time for slots: email send time + 2.5 hour buffer
      const minSlotStartTime = new Date(emailSendTime.getTime() + (2.5 * 60 * 60 * 1000));
      
      // Find next 7 days for availability from the minimum start time
      const startDate = new Date(minSlotStartTime);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      console.log(`🤖 Finding time slots:`);
      console.log(`🤖   - Email will be sent: ${emailSendTime.toISOString()}`);
      console.log(`🤖   - Earliest slot time: ${minSlotStartTime.toISOString()}`);
      console.log(`🤖   - Search until: ${endDate.toISOString()}`);

      // Get calendar events
      const events = await calendarService.getEvents('primary', {
        timeMin: startDate,
        timeMax: endDate
      }) as unknown as CalendarEvent[];

      // Generate time slots (simplified algorithm)
      const timeSlots = this.generateTimeSlots(startDate, endDate, events || [], preferences, minSlotStartTime);

      // Return top 3 slots
      return timeSlots.slice(0, 3);
      
    } catch (error) {
      console.error('🤖 Error finding time slots:', error);
      return [];
    }
  }

  private generateTimeSlots(startDate: Date, endDate: Date, events: CalendarEvent[], preferences: TimePreferences, minSlotStartTime: Date): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const current = new Date(startDate);
    
    // Start at the later of: business hours start (9 AM) or minimum slot time
    const businessStart = new Date(current);
    businessStart.setHours(9, 0, 0, 0);
    
    if (current < businessStart) {
      current.setTime(businessStart.getTime());
    }
    
    // Ensure we don't start before the minimum slot time
    if (current < minSlotStartTime) {
      current.setTime(minSlotStartTime.getTime());
      // Round up to next 30-minute slot
      const minutes = current.getMinutes();
      if (minutes % 30 !== 0) {
        current.setMinutes(Math.ceil(minutes / 30) * 30, 0, 0);
      }
    }

    while (current < endDate && slots.length < 5) {
      // Skip weekends
      if (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
        continue;
      }

      // Check business hours (9 AM - 5 PM)
      if (current.getHours() >= 17) {
        current.setDate(current.getDate() + 1);
        current.setHours(9, 0, 0, 0);
        continue;
      }

      // Ensure slot is not before minimum start time
      if (current < minSlotStartTime) {
        current.setMinutes(current.getMinutes() + 30);
        continue;
      }

      // Check if slot conflicts with existing events
      const slotEnd = new Date(current.getTime() + 30 * 60 * 1000); // 30 minutes
      const hasConflict = events.some((event: CalendarEvent) => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '');
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '');
        return current < eventEnd && slotEnd > eventStart;
      });

      if (!hasConflict) {
        slots.push({
          start: new Date(current),
          end: new Date(slotEnd),
          formatted: current.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            timeZoneName: 'short'
          })
        });
      }

      // Move to next 30-minute slot
      current.setMinutes(current.getMinutes() + 30);
    }

    return slots;
  }

  private async generateResponse(email: EmailMessage, contactInfo: ContactInfo, timeSlots: TimeSlot[]): Promise<{ subject: string; body: string }> {
    const slotsText = timeSlots
      .map((slot, index) => `${index + 1}. ${slot.formatted}`)
      .join('\n');

    const subject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
    
    const body = `Hi ${contactInfo.name},

Thank you for your interest in our product! I'd be happy to schedule a demo for you.

Based on my current availability, here are a few times that work well:

${slotsText}

Please let me know which option works best for you, and I'll send over a calendar invite with the meeting details.

Looking forward to showing you what we've built!

Best regards,
Sales Team`;

    return { subject, body };
  }

  // Manual trigger for testing
  async triggerProcessing(): Promise<void> {
    return this.processEmails();
  }

  getStatus(): { isRunning: boolean; isStarted: boolean; lastRun?: Date; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      isStarted: true, // CronJob doesn't expose running property
      lastRun: undefined, // CronJob lastDate/nextDate have type issues
      nextRun: undefined
    };
  }
}

// Export singleton
export const emailProcessingJob = new EmailProcessingJob();