import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAppState } from '../../hooks/useAppState';
import CalendarView from '../Calendar/CalendarView';
import type { CalendarEvent } from '../../types/calendar';

interface DashboardCalendarViewProps {
  compact?: boolean;
  limit?: number;
  days?: number;
}

const DashboardCalendarView: React.FC<DashboardCalendarViewProps> = ({ 
  compact = false, 
  limit = compact ? 5 : 50,
  days = 7 
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const api = useApi();
  const { currentUser } = useAppState();

  const fetchEvents = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/calendar/upcoming?days=${days}`);
      const googleEvents = (response.data as any)?.events || [];
      
      // Map Google Calendar events to UI shape expected by CalendarView
      const calendarEvents = googleEvents.map((ev: any) => {
        const startDateTime = ev?.start?.dateTime || ev?.start?.date;
        const endDateTime = ev?.end?.dateTime || ev?.end?.date;
        const timezone = ev?.start?.timezone || ev?.start?.timeZone || 'UTC';
        const attendees = Array.isArray(ev?.attendees) ? ev.attendees : [];
        const primaryAttendee = attendees.find((a: any) => !a.organizer) || attendees[0] || {};
        const statusRaw = (ev?.status || 'confirmed') as string;
        const status = statusRaw === 'confirmed' ? 'confirmed' : statusRaw === 'cancelled' ? 'cancelled' : 'scheduled';
        
        return {
          id: ev.id,
          summary: ev.summary || 'Busy',
          description: ev.description,
          startTime: startDateTime,
          endTime: endDateTime,
          timezone,
          attendeeEmail: primaryAttendee.email || '',
          attendeeName: primaryAttendee.displayName || primaryAttendee.name || undefined,
          isDemo: false,
          status,
          meetingType: 'meeting' as const,
        };
      });
      
      setEvents(calendarEvents);
    } catch (err: any) {
      setError(err.message || 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchEvents();
    }
  }, [currentUser, days]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading calendar events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchEvents} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <CalendarView 
      events={compact ? events.slice(0, limit) : events}
      compact={compact}
      onRefresh={fetchEvents}
    />
  );
};

export default DashboardCalendarView;