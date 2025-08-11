// Core data models and interfaces for the Gmail Calendar Assistant

// Re-export specialized types
export * from './gmail';
export * from './calendar-mcp';
export * from './validation';
export * from './repository';
export * from './jobs';

export interface EmailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: Date;
  isProcessed: boolean;
  isDemoRequest?: boolean;
}

export interface ParsedEmail {
  message: EmailMessage;
  intent: EmailIntent;
  timePreferences: TimePreference;
  contactInfo: ContactInfo;
  context: EmailContext;
}

export interface EmailIntent {
  isDemoRequest: boolean;
  confidence: number;
  intentType: 'demo' | 'meeting' | 'call' | 'presentation' | 'unknown';
  urgency: 'low' | 'medium' | 'high';
  keywords: string[];
}

export interface TimePreference {
  preferredDays?: DayOfWeek[];
  preferredTimes?: TimeOfDay[];
  timeRange?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  specificDates?: Date[];
  timezone?: string;
  duration?: number;
  avoidTimes?: TimeSlot[];
}

export interface ContactInfo {
  name: string;
  email: string;
  company?: string;
  timezone?: string;
  phoneNumber?: string;
}

export interface EmailContext {
  isReply: boolean;
  previousEmails?: EmailMessage[];
  mentionedProducts?: string[];
  industry?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'enterprise' | 'unknown';
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees: Attendee[];
  location?: string;
  isPrivate: boolean;
  status: 'confirmed' | 'tentative' | 'cancelled';
  recurringEventId?: string;
}

export interface EventDateTime {
  dateTime: string; // ISO 8601 format
  timezone: string;
}

export interface Attendee {
  email: string;
  name?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  organizer?: boolean;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  timezone: string;
}

export interface AvailabilitySlot extends TimeSlot {
  isAvailable: boolean;
  conflictingEvents?: CalendarEvent[];
  bufferType?: 'none' | 'standard' | 'travel';
}

export interface MeetingProposal {
  timeSlots: TimeSlot[];
  reasoning: string;
  confidence: number;
  alternatives?: TimeSlot[];
}

export interface EmailResponse {
  to: string;
  subject: string;
  body: string;
  originalMessageId: string;
  proposedTimes: TimeSlot[];
  calendarInvite?: CalendarInvite;
}

export interface CalendarInvite {
  summary: string;
  description: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees: Attendee[];
  location?: string;
  conferenceData?: ConferenceData;
}

export interface ConferenceData {
  type: 'hangoutsMeet' | 'zoom' | 'teams';
  conferenceId?: string;
  joinUrl?: string;
  dialIn?: string;
}

export interface BusinessRules {
  businessHours: {
    start: string;
    end: string;
  };
  workingDays: DayOfWeek[];
  meetingDuration: number;
  bufferTime: number;
  travelBufferTime: number;
  maxLookaheadDays: number;
  minAdvanceNotice: number;
  timezone: string;
}

export interface AppConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  monitoring: {
    checkIntervalMinutes: number;
    maxEmailsPerCheck: number;
    retryAttempts: number;
    retryDelayMs: number;
  };
  businessRules: BusinessRules;
}


// Enums
export enum DayOfWeek {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export enum TimeOfDay {
  EARLY_MORNING = '06:00',
  MORNING = '09:00',
  LATE_MORNING = '11:00',
  EARLY_AFTERNOON = '13:00',
  AFTERNOON = '15:00',
  LATE_AFTERNOON = '17:00',
  EVENING = '19:00',
}

export enum ProcessingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}


// MCP-specific Types
export interface MCPAnalysisResult {
  isDemoRequest: boolean;
  confidence: number;
  contactInfo: ContactInfo;
  proposedTimeSlots: Array<{
    start: string;
    end: string;
    formatted: string;
  }>;
  emailResponse: string;
  reasoning: string;
}

export interface MCPToolCall {
  name: 'find_available_slots' | 'get_calendar_events' | 'create_calendar_event';
  parameters: Record<string, any>;
}



// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalField<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;