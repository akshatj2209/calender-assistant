// Core data models and interfaces for the Gmail Calendar Assistant

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
  duration?: number; // in minutes
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
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  workingDays: DayOfWeek[];
  meetingDuration: number; // minutes
  bufferTime: number; // minutes
  travelBufferTime: number; // minutes
  maxLookaheadDays: number;
  minAdvanceNotice: number; // hours
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

export interface ProcessingResult {
  success: boolean;
  message: string;
  emailsProcessed: number;
  responsesGenerated: number;
  errors: ProcessingError[];
}

export interface ProcessingError {
  type: 'gmail_api' | 'calendar_api' | 'openai_api' | 'parsing' | 'validation';
  message: string;
  emailId?: string;
  timestamp: Date;
  retryable: boolean;
}

export interface MonitoringMetrics {
  totalEmailsProcessed: number;
  demoRequestsDetected: number;
  responsesGenerated: number;
  successRate: number;
  averageResponseTime: number;
  apiUsage: {
    gmail: number;
    calendar: number;
    openai: number;
  };
  errors: ProcessingError[];
  lastProcessedAt?: Date;
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

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface GmailApiResponse {
  messages: EmailMessage[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface CalendarApiResponse {
  events: CalendarEvent[];
  nextPageToken?: string;
  timeMin: string;
  timeMax: string;
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

// Frontend Types
export interface DashboardData {
  metrics: MonitoringMetrics;
  recentActivity: RecentActivity[];
  systemStatus: SystemStatus;
  configuration: Partial<AppConfig>;
}

export interface RecentActivity {
  id: string;
  type: 'email_received' | 'demo_detected' | 'response_sent' | 'meeting_scheduled' | 'error';
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
  metadata?: Record<string, any>;
}

export interface SystemStatus {
  isRunning: boolean;
  lastCheck: Date;
  gmailConnection: 'connected' | 'disconnected' | 'error';
  calendarConnection: 'connected' | 'disconnected' | 'error';
  openaiConnection: 'connected' | 'disconnected' | 'error';
  uptime: number; // seconds
}

// Validation Schemas (for runtime validation)
export interface ValidationSchema {
  email: {
    maxSubjectLength: number;
    maxBodyLength: number;
    requiredFields: string[];
  };
  timeSlot: {
    minDurationMinutes: number;
    maxDurationMinutes: number;
    maxAdvanceDays: number;
  };
  response: {
    maxBodyLength: number;
    requiredSections: string[];
  };
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalField<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;