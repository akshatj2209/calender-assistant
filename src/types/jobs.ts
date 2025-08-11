// Job-specific types for background processing

// Email Processing Job types
export interface JobStatus {
  isRunning: boolean;
  isStarted: boolean;
  lastRun?: Date;
  lastSuccess?: Date;
  lastError?: string;
  processedCount: number;
  errorCount: number;
}

export interface ProcessingResult {
  success: boolean;
  processed: number;
  errors: ProcessingError[];
  duration: number;
}

export interface ProcessingError {
  emailId: string;
  error: string;
  timestamp: Date;
}

// For job-specific processing, some types might overlap with main types
// but are simplified for internal job processing
export interface JobTimePreferences {
  preferredDays?: string[];
  preferredTimes?: string[];
  timeRange?: 'morning' | 'afternoon' | 'evening' | 'flexible';
  specificDates?: string[];
  timezone?: string;
  duration?: number;
}

export interface JobContactInfo {
  name: string;
  email: string;
  company?: string;
  timezone?: string;
  phoneNumber?: string;
}

export interface JobIntentAnalysis {
  isDemoRequest: boolean;
  confidence: number;
  reasoning: string;
  intentType: 'demo' | 'meeting' | 'call' | 'presentation' | 'unknown';
  urgency: 'low' | 'medium' | 'high';
  keywords: string[];
}

export interface JobTimeSlot {
  start: Date;
  end: Date;
  formatted: string;
  timezone: string;
}

export interface JobCalendarEvent {
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  summary?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: string;
    organizer?: boolean;
  }>;
}

export interface EmailProcessingJobConfig {
  checkIntervalMinutes: number;
  maxEmailsPerCheck: number;
  retryAttempts: number;
  retryDelayMs: number;
  businessHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
  timezone: string;
}

export interface ResponseSenderJobConfig {
  checkIntervalMinutes: number;
  maxResponsesPerCheck: number;
  retryAttempts: number;
  retryDelayMs: number;
}