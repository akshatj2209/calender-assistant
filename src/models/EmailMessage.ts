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


  extractSenderInfo(): ContactInfo {
    // Parse "Name <email@domain.com>" format
    const fromMatch = this.from.match(/^(.+?)\s*<(.+?)>$/) || this.from.match(/^(.+)$/);
    const name = fromMatch && fromMatch.length > 2 ? fromMatch[1].trim() : '';
    const email = fromMatch && fromMatch.length > 2 ? fromMatch[2].trim() : this.from.trim();
    
    // Extract company from email domain
    const domain = email.split('@')[1];
    const company = domain ? 
      domain.replace(/^(www\.|mail\.|mx\.)/, '').replace(/\.(com|org|net|io|co).*$/, '').charAt(0).toUpperCase() + 
      domain.replace(/^(www\.|mail\.|mx\.)/, '').replace(/\.(com|org|net|io|co).*$/, '').slice(1) : 
      undefined;
    
    return {
      name: name || email.split('@')[0],
      email,
      company
    };
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