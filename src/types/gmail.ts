// Gmail Service types

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
  threadId?: string;
  isHtml?: boolean;
}

export interface GmailMessageListResponse {
  messages: any[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}