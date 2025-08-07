import { google } from 'googleapis';
import { authService } from './AuthService';
import { CalendarEvent, TimeSlot, EventDateTime } from '@/types';
import { CalendarEventModel } from '@/models/CalendarEvent';
import { addDays, startOfDay, endOfDay } from 'date-fns';

export interface CalendarQuery {
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
  q?: string; // Search query
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

export class CalendarService {
  private calendar: any;

  constructor() {
    this.calendar = null;
  }

  private async ensureAuthenticated(): Promise<void> {
    const isValid = await authService.ensureValidToken();
    if (!isValid) {
      throw new Error('Calendar API requires authentication. Please authenticate first.');
    }

    if (!this.calendar) {
      const authClient = authService.getAuthenticatedClient();
      this.calendar = google.calendar({ version: 'v3', auth: authClient });
    }
  }

  async getCalendarList(): Promise<any[]> {
    await this.ensureAuthenticated();

    try {
      const response = await this.calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      console.error('Calendar: Failed to get calendar list:', error);
      throw new Error('Failed to retrieve calendar list');
    }
  }

  async getEvents(calendarId: string = 'primary', options: CalendarQuery = {}): Promise<CalendarEvent[]> {
    await this.ensureAuthenticated();

    const {
      timeMin = new Date(),
      timeMax = addDays(new Date(), 30),
      maxResults = 250,
      singleEvents = true,
      orderBy = 'startTime',
      q
    } = options;

    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        maxResults,
        singleEvents,
        orderBy,
        q
      });

      const events = response.data.items || [];
      return events.map((event: any) => CalendarEventModel.fromGoogleCalendarEvent(event));
    } catch (error) {
      console.error('Calendar: Failed to get events:', error);
      throw new Error('Failed to retrieve calendar events');
    }
  }

  async getEvent(eventId: string, calendarId: string = 'primary'): Promise<CalendarEvent> {
    await this.ensureAuthenticated();

    try {
      const response = await this.calendar.events.get({
        calendarId,
        eventId
      });

      return CalendarEventModel.fromGoogleCalendarEvent(response.data);
    } catch (error) {
      console.error(`Calendar: Failed to get event ${eventId}:`, error);
      throw new Error(`Failed to retrieve calendar event: ${eventId}`);
    }
  }

  async createEvent(eventData: CreateEventOptions, calendarId: string = 'primary'): Promise<CalendarEvent> {
    await this.ensureAuthenticated();

    try {
      const response = await this.calendar.events.insert({
        calendarId,
        sendUpdates: eventData.sendNotifications ? 'all' : 'none',
        requestBody: {
          summary: eventData.summary,
          description: eventData.description,
          start: {
            dateTime: eventData.start.dateTime,
            timeZone: eventData.start.timezone
          },
          end: {
            dateTime: eventData.end.dateTime,
            timeZone: eventData.end.timezone
          },
          attendees: eventData.attendees?.map(attendee => ({
            email: attendee.email,
            displayName: attendee.displayName
          })),
          location: eventData.location,
          conferenceData: eventData.conferenceData
        }
      });

      console.log('Calendar: Event created successfully:', response.data.id);
      return CalendarEventModel.fromGoogleCalendarEvent(response.data);
    } catch (error) {
      console.error('Calendar: Failed to create event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async updateEvent(
    eventId: string, 
    eventData: Partial<CreateEventOptions>,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    await this.ensureAuthenticated();

    try {
      const updateData: any = {};
      
      if (eventData.summary) updateData.summary = eventData.summary;
      if (eventData.description) updateData.description = eventData.description;
      if (eventData.location) updateData.location = eventData.location;
      
      if (eventData.start) {
        updateData.start = {
          dateTime: eventData.start.dateTime,
          timeZone: eventData.start.timezone
        };
      }
      
      if (eventData.end) {
        updateData.end = {
          dateTime: eventData.end.dateTime,
          timeZone: eventData.end.timezone
        };
      }
      
      if (eventData.attendees) {
        updateData.attendees = eventData.attendees.map(attendee => ({
          email: attendee.email,
          displayName: attendee.displayName
        }));
      }

      const response = await this.calendar.events.update({
        calendarId,
        eventId,
        sendUpdates: eventData.sendNotifications ? 'all' : 'none',
        requestBody: updateData
      });

      console.log('Calendar: Event updated successfully:', eventId);
      return CalendarEventModel.fromGoogleCalendarEvent(response.data);
    } catch (error) {
      console.error(`Calendar: Failed to update event ${eventId}:`, error);
      throw new Error(`Failed to update calendar event: ${eventId}`);
    }
  }

  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    await this.ensureAuthenticated();

    try {
      await this.calendar.events.delete({
        calendarId,
        eventId,
        sendUpdates: 'all'
      });

      console.log('Calendar: Event deleted successfully:', eventId);
    } catch (error) {
      console.error(`Calendar: Failed to delete event ${eventId}:`, error);
      throw new Error(`Failed to delete calendar event: ${eventId}`);
    }
  }

  async getFreeBusy(
    calendars: string[],
    timeMin: Date,
    timeMax: Date
  ): Promise<{ [calendarId: string]: TimeSlot[] }> {
    await this.ensureAuthenticated();

    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          items: calendars.map(id => ({ id }))
        }
      });

      const busyTimes: { [calendarId: string]: TimeSlot[] } = {};

      for (const [calendarId, data] of Object.entries(response.data.calendars || {})) {
        const calendarData = data as any;
        busyTimes[calendarId] = (calendarData.busy || []).map((busy: any) => ({
          start: new Date(busy.start),
          end: new Date(busy.end),
          timezone: 'UTC'
        }));
      }

      return busyTimes;
    } catch (error) {
      console.error('Calendar: Failed to get free/busy information:', error);
      throw new Error('Failed to retrieve free/busy information');
    }
  }

  async findAvailableSlots(
    duration: number, // in minutes
    timeMin: Date,
    timeMax: Date,
    calendarIds: string[] = ['primary'],
    businessHours: { start: string; end: string } = { start: '09:00', end: '17:00' },
    workingDays: number[] = [1, 2, 3, 4, 5] // Monday to Friday
  ): Promise<TimeSlot[]> {
    try {
      // Get busy times for all calendars
      const freeBusyData = await this.getFreeBusy(calendarIds, timeMin, timeMax);
      
      // Combine all busy times
      const allBusyTimes: TimeSlot[] = [];
      for (const busyTimes of Object.values(freeBusyData)) {
        allBusyTimes.push(...busyTimes);
      }

      // Generate potential time slots
      const availableSlots: TimeSlot[] = [];
      const current = new Date(timeMin);
      const end = new Date(timeMax);

      while (current < end) {
        // Skip non-working days
        if (!workingDays.includes(current.getDay())) {
          current.setDate(current.getDate() + 1);
          current.setHours(parseInt(businessHours.start.split(':')[0]), parseInt(businessHours.start.split(':')[1]), 0, 0);
          continue;
        }

        // Set to business hours start
        const dayStart = new Date(current);
        dayStart.setHours(parseInt(businessHours.start.split(':')[0]), parseInt(businessHours.start.split(':')[1]), 0, 0);
        
        const dayEnd = new Date(current);
        dayEnd.setHours(parseInt(businessHours.end.split(':')[0]), parseInt(businessHours.end.split(':')[1]), 0, 0);

        // Generate 30-minute slots throughout the business day
        const slotStart = new Date(dayStart);
        
        while (slotStart < dayEnd) {
          const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
          
          // Check if slot is beyond business hours
          if (slotEnd > dayEnd) {
            break;
          }

          const slot: TimeSlot = {
            start: new Date(slotStart),
            end: new Date(slotEnd),
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          };

          // Check for conflicts with busy times
          const hasConflict = allBusyTimes.some(busy => 
            slot.start < busy.end && slot.end > busy.start
          );

          if (!hasConflict) {
            availableSlots.push(slot);
          }

          // Move to next 30-minute slot
          slotStart.setTime(slotStart.getTime() + 30 * 60 * 1000);
        }

        // Move to next day
        current.setDate(current.getDate() + 1);
        current.setHours(parseInt(businessHours.start.split(':')[0]), parseInt(businessHours.start.split(':')[1]), 0, 0);
      }

      return availableSlots;
    } catch (error) {
      console.error('Calendar: Failed to find available slots:', error);
      throw new Error('Failed to find available time slots');
    }
  }

  async createDemoEvent(
    attendeeEmail: string,
    attendeeName: string,
    timeSlot: TimeSlot,
    description?: string
  ): Promise<CalendarEvent> {
    const eventData: CreateEventOptions = {
      summary: `Product Demo - ${attendeeName}`,
      description: description || `Product demonstration meeting with ${attendeeName}`,
      start: {
        dateTime: timeSlot.start.toISOString(),
        timezone: timeSlot.timezone
      },
      end: {
        dateTime: timeSlot.end.toISOString(),
        timezone: timeSlot.timezone
      },
      attendees: [
        {
          email: attendeeEmail,
          displayName: attendeeName
        }
      ],
      sendNotifications: true,
      conferenceData: {
        createRequest: {
          requestId: `demo-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      }
    };

    return this.createEvent(eventData);
  }

  async getUpcomingEvents(days: number = 7, calendarId: string = 'primary'): Promise<CalendarEvent[]> {
    const timeMin = new Date();
    const timeMax = addDays(new Date(), days);

    return this.getEvents(calendarId, {
      timeMin,
      timeMax,
      orderBy: 'startTime'
    });
  }

  async getTodaysEvents(calendarId: string = 'primary'): Promise<CalendarEvent[]> {
    const today = new Date();
    
    return this.getEvents(calendarId, {
      timeMin: startOfDay(today),
      timeMax: endOfDay(today),
      orderBy: 'startTime'
    });
  }

  async searchEvents(query: string, calendarId: string = 'primary'): Promise<CalendarEvent[]> {
    return this.getEvents(calendarId, {
      q: query,
      timeMin: new Date(),
      maxResults: 50
    });
  }

  // Utility method to test connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getCalendarList();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get calendar settings and info
  async getCalendarInfo(calendarId: string = 'primary'): Promise<any> {
    await this.ensureAuthenticated();

    try {
      const response = await this.calendar.calendars.get({
        calendarId
      });

      return response.data;
    } catch (error) {
      console.error('Calendar: Failed to get calendar info:', error);
      throw new Error('Failed to retrieve calendar information');
    }
  }

  // Get API usage stats
  async getApiUsage(): Promise<any> {
    try {
      const calendars = await this.getCalendarList();
      const primaryCalendar = calendars.find(cal => cal.primary) || calendars[0];
      
      return {
        calendarsCount: calendars.length,
        primaryCalendar: primaryCalendar?.summary,
        timezone: primaryCalendar?.timeZone
      };
    } catch (error) {
      console.error('Calendar: Failed to get API usage:', error);
      return null;
    }
  }
}

// Export singleton instance
export const calendarService = new CalendarService();