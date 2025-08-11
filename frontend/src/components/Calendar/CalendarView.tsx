import React from 'react';
import EventCard from './EventCard';
import type { CalendarEvent } from '../../types/calendar';

interface CalendarViewProps {
  events: CalendarEvent[];
  compact?: boolean;
  onEventSelect?: (event: CalendarEvent) => void;
  onRefresh?: () => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  events, 
  compact = false, 
  onEventSelect,
  onRefresh 
}) => {
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  if (sortedEvents.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-6xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No events found</h3>
        <p className="text-gray-600 mb-4">
          {compact ? 'Upcoming meetings will appear here' : 'No calendar events match your current filters'}
        </p>
        {onRefresh && (
          <button onClick={onRefresh} className="btn-primary">
            🔄 Refresh Calendar
          </button>
        )}
      </div>
    );
  }

  // Group events by date for better organization
  const groupedEvents = compact ? 
    { 'Upcoming': sortedEvents } :
    sortedEvents.reduce((groups, event) => {
      const eventDate = new Date(event.startTime);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      let dateKey: string;
      
      if (eventDate.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (eventDate.toDateString() === tomorrow.toDateString()) {
        dateKey = 'Tomorrow';
      } else {
        dateKey = eventDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'short',
          day: 'numeric'
        });
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(event);
      
      return groups;
    }, {} as Record<string, CalendarEvent[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
        <div key={dateKey}>
          {!compact && (
            <h3 className="text-sm font-medium text-gray-900 mb-3 sticky top-0 bg-white py-2">
              {dateKey} ({dateEvents.length})
            </h3>
          )}
          
          <div className="space-y-3">
            {dateEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                compact={compact}
                onClick={() => onEventSelect?.(event)}
              />
            ))}
          </div>
        </div>
      ))}
      
      {compact && sortedEvents.length >= 5 && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-600">
            Showing {sortedEvents.length} upcoming events
          </p>
        </div>
      )}
    </div>
  );
};

export default CalendarView;