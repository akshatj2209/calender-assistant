// Calendar MCP Service types

import { CalendarEvent, EventDateTime } from './index';

export interface CalendarQuery {
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
  q?: string;
}

export interface CreateEventOptions {
  summary: string;
  description?: string;
  start: EventDateTime;
  end: EventDateTime;
  attendees?: Array<{ email: string; displayName?: string }>;
  location?: string;
  sendNotifications?: boolean;
  conferenceData?: any;
}

// MCP Tool parameter types
export interface FindAvailableSlotsParams {
  timeMin: string;
  timeMax: string;
  duration?: number;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  workingDays?: number[];
  maxResults?: number;
}

export interface GetCalendarEventsParams {
  timeMin: string;
  timeMax: string;
  maxResults?: number;
  query?: string;
}

export interface CreateCalendarEventParams {
  summary: string;
  description?: string;
  startDateTime: string;
  endDateTime: string;
  attendeeEmail?: string;
  attendeeName?: string;
  location?: string;
}

// MCP Tool definitions for calendar operations
export interface CalendarTools {
  find_available_slots: {
    description: 'Find available time slots for scheduling meetings';
    parameters: FindAvailableSlotsParams;
  };
  get_calendar_events: {
    description: 'Get existing calendar events within a time range';
    parameters: GetCalendarEventsParams;
  };
  create_calendar_event: {
    description: 'Create a new calendar event';
    parameters: CreateCalendarEventParams;
  };
}