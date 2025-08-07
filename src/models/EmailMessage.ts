import { EmailMessage, ParsedEmail, EmailIntent, TimePreference, ContactInfo, EmailContext } from '../types';

export class EmailMessageModel implements EmailMessage {
  constructor(
    public id: string,
    public threadId: string,
    public from: string,
    public to: string,
    public subject: string,
    public body: string,
    public receivedAt: Date,
    public isProcessed: boolean = false,
    public isDemoRequest?: boolean
  ) {}

  static fromGmailMessage(gmailMessage: any): EmailMessageModel {
    const headers = gmailMessage.payload?.headers || [];
    const getHeader = (name: string) => 
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract body from Gmail message
    const extractBody = (payload: any): string => {
      if (payload.body?.data) {
        return Buffer.from(payload.body.data, 'base64url').toString();
      }
      
      if (payload.parts) {
        for (const part of payload.parts) {
          if (part.mimeType === 'text/plain' || part.mimeType === 'text/html') {
            if (part.body?.data) {
              return Buffer.from(part.body.data, 'base64url').toString();
            }
          }
          // Recursively search multipart messages
          const bodyFromPart = extractBody(part);
          if (bodyFromPart) return bodyFromPart;
        }
      }
      
      return '';
    };

    return new EmailMessageModel(
      gmailMessage.id,
      gmailMessage.threadId,
      getHeader('from'),
      getHeader('to'),
      getHeader('subject'),
      extractBody(gmailMessage.payload),
      new Date(parseInt(gmailMessage.internalDate)),
      false
    );
  }

  markAsProcessed(): void {
    this.isProcessed = true;
  }

  setDemoRequestStatus(isDemoRequest: boolean): void {
    this.isDemoRequest = isDemoRequest;
  }

  // Email content analysis helpers
  containsKeywords(keywords: string[]): boolean {
    const content = `${this.subject} ${this.body}`.toLowerCase();
    return keywords.some(keyword => content.includes(keyword.toLowerCase()));
  }

  isFromExternalDomain(internalDomains: string[] = []): boolean {
    const senderDomain = this.from.split('@')[1]?.toLowerCase();
    if (!senderDomain) return false;
    
    return !internalDomains.some(domain => 
      senderDomain === domain.toLowerCase() || 
      senderDomain.endsWith(`.${domain.toLowerCase()}`)
    );
  }

  isAutoReply(): boolean {
    const autoReplyHeaders = ['auto-submitted', 'x-auto-response-suppress'];
    const autoReplyKeywords = [
      'out of office',
      'auto-reply',
      'automatic reply',
      'vacation message',
      'away message'
    ];
    
    const content = `${this.subject} ${this.body}`.toLowerCase();
    return autoReplyKeywords.some(keyword => content.includes(keyword));
  }

  extractSenderInfo(): ContactInfo {
    // Parse "Name <email@domain.com>" format
    const fromMatch = this.from.match(/^(.+?)\s*<(.+?)>$/) || this.from.match(/^(.+)$/);
    const name = fromMatch && fromMatch.length > 2 ? fromMatch[1].trim() : '';
    const email = fromMatch && fromMatch.length > 2 ? fromMatch[2].trim() : this.from.trim();
    
    // Extract company from email domain
    const domain = email.split('@')[1];
    const company = domain ? this.domainToCompanyName(domain) : undefined;
    
    return {
      name: name || email.split('@')[0],
      email,
      company
    };
  }

  private domainToCompanyName(domain: string): string {
    // Remove common prefixes and suffixes
    const cleanDomain = domain
      .replace(/^(www\.|mail\.|mx\.)/, '')
      .replace(/\.(com|org|net|io|co).*$/, '');
    
    // Capitalize first letter
    return cleanDomain.charAt(0).toUpperCase() + cleanDomain.slice(1);
  }

  // Validation methods
  isValid(): boolean {
    return !!(
      this.id &&
      this.from &&
      this.to &&
      this.subject &&
      this.receivedAt
    );
  }

  // Email thread context
  isReply(): boolean {
    const subject = this.subject.toLowerCase();
    return subject.startsWith('re:') || 
           subject.startsWith('reply:') ||
           subject.includes('in reply to');
  }

  // Content analysis
  getWordCount(): number {
    return this.body.split(/\s+/).filter(word => word.length > 0).length;
  }

  hasAttachments(): boolean {
    // This would need to be determined from the Gmail message payload
    return false; // Placeholder
  }

  // Export for debugging/logging
  toJSON(): Partial<EmailMessage> {
    return {
      id: this.id,
      threadId: this.threadId,
      from: this.from,
      to: this.to,
      subject: this.subject,
      receivedAt: this.receivedAt,
      isProcessed: this.isProcessed,
      isDemoRequest: this.isDemoRequest
    };
  }

  toString(): string {
    return `EmailMessage(${this.id}): "${this.subject}" from ${this.from}`;
  }
}