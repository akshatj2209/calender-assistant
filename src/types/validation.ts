// Validation schema types extracted from controllers

// Email Controller validation types
export interface CreateEmailData {
  userId: string;
  gmailMessageId: string;
  gmailThreadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: string;
}

export interface UpdateEmailData {
  processingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  isDemoRequest?: boolean;
  intentAnalysis?: any;
  timePreferences?: any;
  contactInfo?: any;
  responseGenerated?: boolean;
  responseSent?: boolean;
  responseMessageId?: string;
}

export interface EmailSearchFilters {
  userId?: string;
  processingStatus?: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
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

// Calendar Controller validation types
export interface CreateEventData {
  userId: string;
  emailRecordId?: string;
  googleEventId: string;
  calendarId?: string;
  summary: string;
  startTime: string;
  endTime: string;
  timezone: string;
  attendeeEmail: string;
  attendeeName?: string;
}

export interface UpdateEventData {
  summary?: string;
  startTime?: string;
  endTime?: string;
  timezone?: string;
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  attendeeName?: string;
}

export interface EventSearchFilters {
  userId?: string;
  emailRecordId?: string;
  attendeeEmail?: string;
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// User Controller validation types
export interface CreateUserData {
  email: string;
  name?: string;
  salesName?: string;
  salesEmail?: string;
  companyName?: string;
  emailSignature?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  workingDays?: number[];
  timezone?: string;
  meetingDuration?: number;
  bufferTime?: number;
}

export interface UpdateUserData {
  name?: string;
  salesName?: string;
  salesEmail?: string;
  companyName?: string;
  emailSignature?: string;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  workingDays?: number[];
  timezone?: string;
  meetingDuration?: number;
  bufferTime?: number;
}

export interface GoogleTokensData {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: string;
}