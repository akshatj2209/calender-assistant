// Email-related types for frontend

export interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  status: 'pending' | 'processed' | 'failed' | 'response_sent';
  isDemoRequest?: boolean;
  intentAnalysis?: IntentAnalysis;
  contactInfo?: ContactInfo;
  calendarEvents?: any[];
}

export interface IntentAnalysis {
  confidence: number;
  intentType: string;
  urgency?: 'low' | 'medium' | 'high';
  keywords?: string[];
}

export interface ContactInfo {
  name: string;
  email: string;
  company?: string;
  timezone?: string;
  phoneNumber?: string;
}

export interface EmailSearchParams {
  userId?: string;
  processingStatus?: string;
  isDemoRequest?: boolean;
  responseGenerated?: boolean;
  responseSent?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmailStats {
  total: number;
  demoRequests: number;
  responsesSent: number;
  pending: number;
  processed: number;
  failed: number;
}