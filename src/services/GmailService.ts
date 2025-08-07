import { EmailMessageModel } from '@/models/EmailMessage';
import { EmailMessage } from '@/types';
import { google } from 'googleapis';
import { authService } from './AuthService';

export interface GmailQuery {
  query?: string;
  maxResults?: number;
  pageToken?: string;
  labelIds?: string[];
}

export interface EmailSendOptions {
  to: string;
  subject: string;
  body: string;
  replyToMessageId?: string;
  isHtml?: boolean;
}

export class GmailService {
  private gmail: any;

  constructor() {
    this.gmail = null;
  }

  private async ensureAuthenticated(): Promise<void> {
    const isValid = await authService.ensureValidToken();
    if (!isValid) {
      throw new Error('Gmail API requires authentication. Please authenticate first.');
    }

    if (!this.gmail) {
      const authClient = authService.getAuthenticatedClient();
      this.gmail = google.gmail({ version: 'v1', auth: authClient });
    }
  }

  async getProfile(): Promise<any> {
    await this.ensureAuthenticated();
    
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return response.data;
    } catch (error) {
      console.error('Gmail: Failed to get profile:', error);
      throw new Error('Failed to retrieve Gmail profile');
    }
  }

  async listMessages(options: GmailQuery = {}): Promise<{
    messages: any[];
    nextPageToken?: string;
    resultSizeEstimate: number;
  }> {
    await this.ensureAuthenticated();

    const {
      query = '',
      maxResults = 10,
      pageToken,
      labelIds = ['INBOX']
    } = options;

    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
        pageToken,
        labelIds
      });
      console.log('Gmail: List messages response:', response.data);

      return {
        messages: response.data.messages || [],
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate || 0
      };
    } catch (error) {
      console.error('Gmail: Failed to list messages:', error);
      throw new Error('Failed to retrieve Gmail messages');
    }
  }

  async getMessage(messageId: string): Promise<any> {
    await this.ensureAuthenticated();

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      return response.data;
    } catch (error) {
      console.error(`Gmail: Failed to get message ${messageId}:`, error);
      throw new Error(`Failed to retrieve Gmail message: ${messageId}`);
    }
  }

  async getMessages(messageIds: string[]): Promise<any[]> {
    await this.ensureAuthenticated();

    try {
      const messagePromises = messageIds.map(id => this.getMessage(id));
      return await Promise.all(messagePromises);
    } catch (error) {
      console.error('Gmail: Failed to get multiple messages:', error);
      throw new Error('Failed to retrieve Gmail messages');
    }
  }

  async searchEmails(searchQuery: string, maxResults: number = 50): Promise<EmailMessage[]> {
    try {
      const listResult = await this.listMessages({
        query: searchQuery,
        maxResults
      });
      console.log('Gmail: Search emails response:', listResult);

      if (!listResult.messages || listResult.messages.length === 0) {
        return [];
      }

      // Get full message details
      const messageIds = listResult.messages.map(msg => msg.id);
      const fullMessages = await this.getMessages(messageIds);

      // Convert to EmailMessage models
      return fullMessages.map(msg => EmailMessageModel.fromGmailMessage(msg));
    } catch (error) {
      console.error('Gmail: Failed to search emails:', error);
      throw new Error(`Failed to search emails: ${error}`);
    }
  }

  async getUnreadEmails(maxResults: number = 10): Promise<EmailMessage[]> {
    return this.searchEmails('is:unread', maxResults);
  }

  async getRecentEmails(maxResults: number = 20): Promise<EmailMessage[]> {
    return this.searchEmails('newer_than:1d', maxResults);
  }

  async searchDemoRequests(maxResults: number = 10): Promise<EmailMessage[]> {
    const demoKeywords = [
      'demo', 'demonstration', 'product tour', 'meeting', 
      'schedule', 'interested', 'learn more', 'walkthrough'
    ];

    const searchQuery = `is:unread (${demoKeywords.map(k => `"${k}"`).join(' OR ')})`;
    return this.searchEmails(searchQuery, maxResults);
  }

  async sendEmail(options: EmailSendOptions): Promise<any> {
    await this.ensureAuthenticated();

    const { to, subject, body, replyToMessageId, isHtml = false } = options;

    try {
      // Create email message in RFC 2822 format
      const headers = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'MIME-Version: 1.0',
        `Content-Type: text/${isHtml ? 'html' : 'plain'}; charset=utf-8`,
        'Content-Transfer-Encoding: base64'
      ];

      if (replyToMessageId) {
        headers.push(`In-Reply-To: ${replyToMessageId}`);
        headers.push(`References: ${replyToMessageId}`);
      }

      const email = [
        headers.join('\n'),
        '',
        body
      ].join('\n');

      // Encode email in base64url format
      const encodedEmail = Buffer.from(email)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedEmail,
          threadId: replyToMessageId // If replying, maintain thread
        }
      });

      console.log('Gmail: Email sent successfully:', response.data.id);
      return response.data;
    } catch (error) {
      console.error('Gmail: Failed to send email:', error);
      throw new Error(`Failed to send email: ${error}`);
    }
  }

  async sendDemoResponse(
    recipientEmail: string, 
    recipientName: string,
    proposedTimes: Date[],
    originalMessageId?: string
  ): Promise<any> {
    const timeFormatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const formattedTimes = proposedTimes
      .map((time, index) => `${index + 1}. ${timeFormatter.format(time)}`)
      .join('\n');

    const subject = originalMessageId ? 'Re: Demo Request' : 'Demo Scheduling Options';
    
    const body = `Hi ${recipientName},

Thank you for your interest in our product! I'd be happy to schedule a demo for you.

Based on my current availability, here are a few times that work well:

${formattedTimes}

Please let me know which option works best for you, and I'll send over a calendar invite with the meeting details.

Looking forward to showing you what we've built!

Best regards,
${authService.getAuthenticatedClient().salesName || 'Sales Team'}`;

    return this.sendEmail({
      to: recipientEmail,
      subject,
      body,
      replyToMessageId: originalMessageId
    });
  }

  async markAsRead(messageId: string): Promise<void> {
    await this.ensureAuthenticated();

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });

      console.log(`Gmail: Marked message ${messageId} as read`);
    } catch (error) {
      console.error(`Gmail: Failed to mark message ${messageId} as read:`, error);
      throw new Error(`Failed to mark message as read: ${messageId}`);
    }
  }

  async addLabel(messageId: string, labelId: string): Promise<void> {
    await this.ensureAuthenticated();

    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: [labelId]
        }
      });

      console.log(`Gmail: Added label ${labelId} to message ${messageId}`);
    } catch (error) {
      console.error(`Gmail: Failed to add label to message ${messageId}:`, error);
      throw new Error(`Failed to add label to message: ${messageId}`);
    }
  }

  async createLabel(name: string, color?: string): Promise<any> {
    await this.ensureAuthenticated();

    try {
      const response = await this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          labelListVisibility: 'labelShow',
          messageListVisibility: 'show',
          color: color ? {
            textColor: '#000000',
            backgroundColor: color
          } : undefined
        }
      });

      console.log(`Gmail: Created label "${name}":`, response.data.id);
      return response.data;
    } catch (error) {
      console.error(`Gmail: Failed to create label "${name}":`, error);
      throw new Error(`Failed to create label: ${name}`);
    }
  }

  async getLabels(): Promise<any[]> {
    await this.ensureAuthenticated();

    try {
      const response = await this.gmail.users.labels.list({ userId: 'me' });
      return response.data.labels || [];
    } catch (error) {
      console.error('Gmail: Failed to get labels:', error);
      throw new Error('Failed to retrieve Gmail labels');
    }
  }

  // Utility method to test connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getProfile();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get API usage stats (if available)
  async getApiUsage(): Promise<any> {
    // This would require additional API calls or monitoring
    // For now, return basic info
    try {
      const profile = await this.getProfile();
      return {
        emailAddress: profile.emailAddress,
        historyId: profile.historyId,
        messagesTotal: profile.messagesTotal,
        threadsTotal: profile.threadsTotal
      };
    } catch (error) {
      console.error('Gmail: Failed to get API usage:', error);
      return null;
    }
  }
}

// Export singleton instance
export const gmailService = new GmailService();