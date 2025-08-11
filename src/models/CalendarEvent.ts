import { CalendarEvent, EventDateTime, Attendee, TimeSlot } from '../types';

export class CalendarEventModel implements CalendarEvent {
  constructor(
    public id: string,
    public summary: string,
    public start: EventDateTime,
    public end: EventDateTime,
    public attendees: Attendee[],
    public description?: string,
    public location?: string,
    public isPrivate: boolean = false,
    public status: 'confirmed' | 'tentative' | 'cancelled' = 'confirmed',
    public recurringEventId?: string
  ) {}

  static fromGoogleCalendarEvent(googleEvent: any): CalendarEventModel {
    const attendees: Attendee[] = (googleEvent.attendees || []).map((attendee: any) => ({
      email: attendee.email,
      name: attendee.displayName,
      responseStatus: attendee.responseStatus || 'needsAction',
      organizer: attendee.organizer || false
    }));

    return new CalendarEventModel(
      googleEvent.id,
      googleEvent.summary || 'Busy',
      {
        dateTime: googleEvent.start?.dateTime || googleEvent.start?.date,
        timezone: googleEvent.start?.timeZone || 'UTC'
      },
      {
        dateTime: googleEvent.end?.dateTime || googleEvent.end?.date,
        timezone: googleEvent.end?.timeZone || 'UTC'
      },
      attendees,
      googleEvent.description,
      googleEvent.location,
      googleEvent.visibility === 'private',
      googleEvent.status || 'confirmed',
      googleEvent.recurringEventId
    );
  }

  // Time calculations
  getDurationMinutes(): number {
    const startTime = new Date(this.start.dateTime);
    const endTime = new Date(this.end.dateTime);
    return (endTime.getTime() - startTime.getTime()) / (1000 * 60);
  }

  getStartDate(): Date {
    return new Date(this.start.dateTime);
  }

  getEndDate(): Date {
    return new Date(this.end.dateTime);
  }

  // Conflict checking
  conflictsWith(timeSlot: TimeSlot): boolean {
    const eventStart = this.getStartDate();
    const eventEnd = this.getEndDate();
    
    // Check for any overlap
    return (
      (timeSlot.start < eventEnd && timeSlot.end > eventStart) ||
      (eventStart < timeSlot.end && eventEnd > timeSlot.start)
    );
  }

  // Event classification
  isAllDay(): boolean {
    // All-day events in Google Calendar use date instead of dateTime
    return !this.start.dateTime.includes('T') || !this.end.dateTime.includes('T');
  }

  isBusy(): boolean {
    // Events that should block scheduling
    return this.status === 'confirmed' && 
           !this.isDeclined() &&
           !this.isCancelled();
  }

  isDeclined(): boolean {
    const organizerOrSelf = this.attendees.find(a => a.organizer) || this.attendees[0];
    return organizerOrSelf?.responseStatus === 'declined';
  }

  isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  isTentative(): boolean {
    return this.status === 'tentative';
  }

  isRecurring(): boolean {
    return !!this.recurringEventId;
  }

  // Attendee management
  hasAttendee(email: string): boolean {
    return this.attendees.some(a => 
      a.email.toLowerCase() === email.toLowerCase()
    );
  }

  // Validation
  isValid(): boolean {
    return !!(
      this.id &&
      this.summary &&
      this.start?.dateTime &&
      this.end?.dateTime &&
      this.getStartDate() < this.getEndDate()
    );
  }

  // Display helpers
  getFormattedTimeRange(): string {
    const startDate = this.getStartDate();
    const endDate = this.getEndDate();
    
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
    
    if (this.isAllDay()) {
      return formatter.format(startDate).split(' at ')[0]; // Remove time part
    }
    
    const startStr = formatter.format(startDate);
    const endStr = formatter.format(endDate);
    
    // Same day - show time range
    if (startDate.toDateString() === endDate.toDateString()) {
      const timeStart = startStr.split(' at ')[1];
      const timeEnd = endStr.split(' at ')[1];
      return `${startStr.split(' at ')[0]} ${timeStart} - ${timeEnd}`;
    }
    
    return `${startStr} - ${endStr}`;
  }

  // Debug/logging
  toJSON(): Partial<CalendarEvent> {
    return {
      id: this.id,
      summary: this.summary,
      start: this.start,
      end: this.end,
      attendees: this.attendees,
      location: this.location,
      status: this.status
    };
  }

  toString(): string {
    return `CalendarEvent(${this.id}): "${this.summary}" ${this.getFormattedTimeRange()}`;
  }
}