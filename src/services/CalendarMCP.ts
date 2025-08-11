import { CalendarEventModel } from '@/models/CalendarEvent';
import { 
  CalendarEvent, 
  EventDateTime, 
  TimeSlot, 
  CalendarQuery, 
  CreateEventOptions, 
  CalendarTools,
  FindAvailableSlotsParams,
  GetCalendarEventsParams,
  CreateCalendarEventParams
} from '@/types';
import { addDays } from 'date-fns';
import { google } from 'googleapis';
import { authService } from './AuthService';

/**
 * Calendar service with MCP-compatible tools for AI function calling
 * Uses Google Calendar API internally
 */
export class CalendarService {
  private calendar: any;

  constructor() {
    this.calendar = null;
  }

  private async ensureAuthenticated(): Promise<void> {
    const isValid = await authService.ensureValidToken();
    if (!isValid) {
      throw new Error('Calendar MCP Service requires authentication. Please authenticate first.');
    }

    if (!this.calendar) {
      const authClient = authService.getAuthenticatedClient();
      if (!authClient) {
        throw new Error('Failed to get authenticated client from authService');
      }
      this.calendar = google.calendar({ version: 'v3', auth: authClient });
      console.log('Calendar MCP: Initialized calendar client successfully');
    }
  }

  /**
   * MCP Tool: Find available time slots
   * This is designed to be called by AI via function calling
   */
  async find_available_slots(params: FindAvailableSlotsParams): Promise<TimeSlot[]> {
    await this.ensureAuthenticated();

    console.log('Calendar MCP: find_available_slots called with params:', JSON.stringify(params, null, 2));

    const {
      timeMin,
      timeMax,
      duration = 30,
      businessHoursStart = '09:00',
      businessHoursEnd = '17:00',
      workingDays = [1, 2, 3, 4, 5],
      maxResults = 5,
    } = params;

    // Validate required parameters
    if (!timeMin || !timeMax) {
      throw new Error('timeMin and timeMax are required parameters');
    }

    try {
      // Get busy times using freebusy API
      // Ensure dates are properly formatted with timezone
      const timeMinFormatted = new Date(timeMin).toISOString();
      const timeMaxFormatted = new Date(timeMax).toISOString();
      
      const freeBusyResponse = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMinFormatted,
          timeMax: timeMaxFormatted,
          items: [{ id: 'primary' }],
        },
      });

      const busyTimes = freeBusyResponse.data.calendars?.['primary']?.busy || [];

      // Generate available slots
      const availableSlots: TimeSlot[] = [];
      const current = new Date(timeMin);
      const end = new Date(timeMax);
      const durationMs = duration * 60 * 1000;

      while (current < end && availableSlots.length < maxResults) {
        // Skip non-working days
        if (!workingDays.includes(current.getDay())) {
          current.setDate(current.getDate() + 1);
          current.setHours(
            parseInt(businessHoursStart.split(':')[0]),
            parseInt(businessHoursStart.split(':')[1]),
            0,
            0
          );
          continue;
        }

        // Set to business hours start
        const dayStart = new Date(current);
        dayStart.setHours(
          parseInt(businessHoursStart.split(':')[0]),
          parseInt(businessHoursStart.split(':')[1]),
          0,
          0
        );

        const dayEnd = new Date(current);
        dayEnd.setHours(
          parseInt(businessHoursEnd.split(':')[0]),
          parseInt(businessHoursEnd.split(':')[1]),
          0,
          0
        );

        // Generate slots throughout the business day
        const slotStart = new Date(dayStart);

        while (slotStart < dayEnd && availableSlots.length < maxResults) {
          const slotEnd = new Date(slotStart.getTime() + durationMs);

          if (slotEnd > dayEnd) break;

          const slot: TimeSlot = {
            start: new Date(slotStart),
            end: new Date(slotEnd),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          };

          // Check for conflicts with busy times
          const hasConflict = busyTimes.some((busy: any) =>
            slot.start < new Date(busy.end) && slot.end > new Date(busy.start)
          );

          if (!hasConflict) {
            availableSlots.push(slot);
          }

          // Move to next 30-minute slot
          slotStart.setTime(slotStart.getTime() + 30 * 60 * 1000);
        }

        // Move to next day
        current.setDate(current.getDate() + 1);
        current.setHours(
          parseInt(businessHoursStart.split(':')[0]),
          parseInt(businessHoursStart.split(':')[1]),
          0,
          0
        );
      }

      console.log(`Calendar MCP: Found ${availableSlots.length} available slots`);
      return availableSlots;
    } catch (error) {
      console.error('Calendar MCP: Failed to find available slots:', error);
      console.error('Calendar MCP: Request parameters:', { timeMin, timeMax, duration, businessHoursStart, businessHoursEnd });
      if (error instanceof Error) {
        throw new Error(`Failed to find available time slots: ${error.message}`);
      }
      throw new Error('Failed to find available time slots');
    }
  }

  /**
   * MCP Tool: Get calendar events
   * This is designed to be called by AI via function calling
   */
  async get_calendar_events(params: GetCalendarEventsParams): Promise<CalendarEvent[]> {
    await this.ensureAuthenticated();

    const { timeMin, timeMax, maxResults = 50, query } = params;

    console.log('Calendar MCP: get_calendar_events called with params:', JSON.stringify(params, null, 2));

    // Ensure dates are properly formatted with timezone
    const timeMinFormatted = new Date(timeMin).toISOString();
    const timeMaxFormatted = new Date(timeMax).toISOString();

    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMinFormatted,
        timeMax: timeMaxFormatted,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
        q: query,
      });

      const events = response.data.items || [];
      const calendarEvents = events.map((event: any) => 
        CalendarEventModel.fromGoogleCalendarEvent(event)
      );

      console.log(`Calendar MCP: Retrieved ${calendarEvents.length} events`);
      return calendarEvents;
    } catch (error) {
      console.error('Calendar MCP: Failed to get calendar events:', error);
      console.error('Calendar MCP: Request parameters:', { timeMin, timeMax, maxResults, query });
      if (error instanceof Error) {
        throw new Error(`Failed to retrieve calendar events: ${error.message}`);
      }
      throw new Error('Failed to retrieve calendar events');
    }
  }

  /**
   * MCP Tool: Create calendar event
   * This is designed to be called by AI via function calling
   */
  async create_calendar_event(params: CreateCalendarEventParams): Promise<CalendarEvent> {
    await this.ensureAuthenticated();

    const {
      summary,
      description,
      startDateTime,
      endDateTime,
      attendeeEmail,
      attendeeName,
      location,
    } = params;

    try {
      // Get the current authenticated user's email to add them as an attendee
      let currentUserEmail: string | undefined;
      try {
        const authClient = authService.getAuthenticatedClient();
        if (authClient && authClient.credentials) {
          // Get user info using the authenticated client
          const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
          const userInfoResponse = await oauth2.userinfo.get();
          currentUserEmail = userInfoResponse.data.email || undefined;
          console.log('Calendar MCP: Got current user email:', currentUserEmail);
        }
      } catch (userError) {
        console.warn('Calendar MCP: Could not get current user email:', userError);
      }

      const eventData: any = {
        summary,
        description: description || `Meeting scheduled via AI assistant`,
        start: {
          dateTime: startDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endDateTime,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        location,
        conferenceData: {
          createRequest: {
            requestId: `ai-scheduled-${Date.now()}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      };

      // Build attendees list - always include both the external attendee and the calendar owner
      const attendees: Array<{ email: string; displayName?: string; responseStatus?: string }> = [];
      
      // Add external attendee if provided
      if (attendeeEmail) {
        attendees.push({
          email: attendeeEmail,
          displayName: attendeeName || attendeeEmail,
          responseStatus: 'needsAction'
        });
      }
      
      // Add the calendar owner (current user) as an attendee
      if (currentUserEmail) {
        attendees.push({
          email: currentUserEmail,
          displayName: 'You',
          responseStatus: 'accepted' // Auto-accept for the calendar owner
        });
      }

      if (attendees.length > 0) {
        eventData.attendees = attendees;
      }

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        sendUpdates: 'all',
        conferenceDataVersion: 1,
        requestBody: eventData,
      });

      console.log('Calendar MCP: Event created successfully:', response.data.id);
      console.log('Calendar MCP: Attendees added:', attendees.map(a => a.email).join(', '));
      return CalendarEventModel.fromGoogleCalendarEvent(response.data);
    } catch (error) {
      console.error('Calendar MCP: Failed to create event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  // Legacy methods for backward compatibility with existing code
  async findAvailableSlots(
    duration: number,
    timeMin: Date,
    timeMax: Date,
    calendarIds: string[] = ['primary'],
    businessHours: { start: string; end: string } = { start: '09:00', end: '17:00' },
    workingDays: number[] = [1, 2, 3, 4, 5]
  ): Promise<TimeSlot[]> {
    return this.find_available_slots({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      duration,
      businessHoursStart: businessHours.start,
      businessHoursEnd: businessHours.end,
      workingDays,
    });
  }

  async getEvents(calendarId: string = 'primary', options: CalendarQuery = {}): Promise<CalendarEvent[]> {
    const {
      timeMin = new Date(),
      timeMax = addDays(new Date(), 30),
      maxResults = 250,
      q: query,
    } = options;

    return this.get_calendar_events({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      maxResults,
      query,
    });
  }

  async createEvent(eventData: CreateEventOptions, calendarId: string = 'primary'): Promise<CalendarEvent> {
    return this.create_calendar_event({
      summary: eventData.summary,
      description: eventData.description,
      startDateTime: eventData.start.dateTime,
      endDateTime: eventData.end.dateTime,
      attendeeEmail: eventData.attendees?.[0]?.email,
      attendeeName: eventData.attendees?.[0]?.displayName,
      location: eventData.location,
    });
  }

  async createDemoEvent(
    attendeeEmail: string,
    attendeeName: string,
    timeSlot: TimeSlot,
    description?: string
  ): Promise<CalendarEvent> {
    return this.create_calendar_event({
      summary: `Product Demo - ${attendeeName}`,
      description: description || `Product demonstration meeting with ${attendeeName}`,
      startDateTime: timeSlot.start.toISOString(),
      endDateTime: timeSlot.end.toISOString(),
      attendeeEmail,
      attendeeName,
    });
  }

  /**
   * Get MCP tool definitions for AI function calling
   */
  getMCPTools(): any[] {
    return [
      {
        type: 'function',
        function: {
          name: 'find_available_slots',
          description: 'Find available time slots for scheduling meetings',
          parameters: {
            type: 'object',
            properties: {
              timeMin: {
                type: 'string',
                description: 'Start time for searching slots (ISO format)',
              },
              timeMax: {
                type: 'string',
                description: 'End time for searching slots (ISO format)',
              },
              duration: {
                type: 'number',
                description: 'Meeting duration in minutes',
                default: 30,
              },
              businessHoursStart: {
                type: 'string',
                description: 'Business hours start (HH:MM format)',
                default: '09:00',
              },
              businessHoursEnd: {
                type: 'string',
                description: 'Business hours end (HH:MM format)',
                default: '17:00',
              },
              workingDays: {
                type: 'array',
                items: { type: 'number' },
                description: 'Working days (0=Sunday, 1=Monday, etc.)',
                default: [1, 2, 3, 4, 5],
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of slots to return',
                default: 5,
              },
            },
            required: ['timeMin', 'timeMax'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_calendar_events',
          description: 'Get existing calendar events within a time range',
          parameters: {
            type: 'object',
            properties: {
              timeMin: {
                type: 'string',
                description: 'Start time for event search (ISO format)',
              },
              timeMax: {
                type: 'string',
                description: 'End time for event search (ISO format)',
              },
              maxResults: {
                type: 'number',
                description: 'Maximum number of events to return',
                default: 50,
              },
              query: {
                type: 'string',
                description: 'Search query to filter events (optional)',
              },
            },
            required: ['timeMin', 'timeMax'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'create_calendar_event',
          description: 'Create a new calendar event',
          parameters: {
            type: 'object',
            properties: {
              summary: {
                type: 'string',
                description: 'Event title/summary',
              },
              description: {
                type: 'string',
                description: 'Event description (optional)',
              },
              startDateTime: {
                type: 'string',
                description: 'Event start time (ISO format)',
              },
              endDateTime: {
                type: 'string',
                description: 'Event end time (ISO format)',
              },
              attendeeEmail: {
                type: 'string',
                description: 'Attendee email address (optional)',
              },
              attendeeName: {
                type: 'string',
                description: 'Attendee name (optional)',
              },
              location: {
                type: 'string',
                description: 'Event location (optional)',
              },
            },
            required: ['summary', 'startDateTime', 'endDateTime'],
          },
        },
      },
    ];
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.ensureAuthenticated();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const calendarService = new CalendarService();