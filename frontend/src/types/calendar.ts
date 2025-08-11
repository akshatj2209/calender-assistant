// Calendar-related types for frontend

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  timezone: string;
  attendeeEmail: string;
  attendeeName?: string;
  isDemo: boolean;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed';
  meetingType: string;
  emailRecord?: EmailRecord;
}

export interface EmailRecord {
  id: string;
  subject: string;
  from: string;
}

export interface CalendarEventSearchParams {
  userId?: string;
  emailRecordId?: string;
  attendeeEmail?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CalendarStats {
  totalEvents: number;
  scheduledEvents: number;
  confirmedEvents: number;
  cancelledEvents: number;
  completedEvents: number;
}