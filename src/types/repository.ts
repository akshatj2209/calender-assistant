// Repository-specific types and data transfer objects

import { ProcessingStatus, EmailDirection } from '@prisma/client';
import { User, GoogleTokens } from '@prisma/client';

// Email Repository types
export interface CreateEmailData {
  userId: string;
  gmailMessageId: string;
  gmailThreadId: string;
  messageIdHeader?: string | null;
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: Date;
  direction?: EmailDirection;
}

export interface UpdateEmailData {
  processingStatus?: ProcessingStatus;
  processedAt?: Date;
  isDemoRequest?: boolean;
  responseGenerated?: boolean;
  responseSent?: boolean;
  responseMessageId?: string | null;
  intentAnalysis?: any;
  timePreferences?: any;
  contactInfo?: any;
  errorMessage?: string | null;
}

export interface EmailSearchOptions {
  userId?: string;
  processingStatus?: ProcessingStatus;
  direction?: EmailDirection;
  isDemoRequest?: boolean;
  responseGenerated?: boolean;
  responseSent?: boolean;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EmailStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  demoRequests: number;
  responsesSent: number;
}

export interface DemoRequestOptions {
  responded?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

// User Repository types
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
  email?: string;
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

export interface UserWithTokens extends User {
  googleTokens?: GoogleTokens | null;
}

export interface UserStats {
  totalEmails: number;
  demoRequests: number;
  responsesSent: number;
  processingSuccessRate: number;
  avgResponseTime: number;
}

export interface GoogleTokensData {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scope?: string;
  expiresAt?: Date;
}

// Calendar Repository types
export interface CreateCalendarEventData {
  userId: string;
  emailRecordId?: string;
  googleEventId: string;
  calendarId?: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
  attendeeEmail: string;
  attendeeName?: string;
  isDemo?: boolean;
  meetingType?: string;
}

export interface UpdateCalendarEventData {
  summary?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  timezone?: string;
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  attendeeName?: string;
}

export interface CalendarEventSearchOptions {
  userId?: string;
  emailRecordId?: string;
  attendeeEmail?: string;
  status?: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CalendarStats {
  totalEvents: number;
  scheduled: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  avgMeetingDuration: number;
}