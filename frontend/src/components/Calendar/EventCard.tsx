import React from 'react';

interface CalendarEvent {
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
  emailRecord?: {
    id: string;
    subject: string;
    from: string;
  };
}

interface EventCardProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick?: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, compact = false, onClick }) => {
  const getStatusBadge = (status: CalendarEvent['status']) => {
    const badges = {
      scheduled: { text: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
      confirmed: { text: 'Confirmed', className: 'bg-green-100 text-green-800' },
      cancelled: { text: 'Cancelled', className: 'bg-red-100 text-red-800' },
      completed: { text: 'Completed', className: 'bg-gray-100 text-gray-800' }
    };
    
    const badge = badges[status] || badges.scheduled;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.text}
      </span>
    );
  };

  const formatTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    return `${start.toLocaleTimeString('en-US', timeOptions)} - ${end.toLocaleTimeString('en-US', timeOptions)}`;
  };

  const getDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    
    if (durationMinutes < 60) {
      return `${durationMinutes}m`;
    }
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  };

  const getMeetingIcon = (meetingType: string, isDemo: boolean) => {
    if (isDemo) return '🎯';
    if (meetingType.toLowerCase().includes('demo')) return '🎯';
    if (meetingType.toLowerCase().includes('call')) return '📞';
    if (meetingType.toLowerCase().includes('meeting')) return '🤝';
    return '📅';
  };

  return (
    <div 
      className={`border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      } ${compact ? 'py-3' : ''} ${
        event.status === 'cancelled' ? 'opacity-60' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between space-x-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-lg">
              {getMeetingIcon(event.meetingType, event.isDemo)}
            </span>
            
            {event.isDemo && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Demo Meeting
              </span>
            )}
            
            {getStatusBadge(event.status)}
          </div>

          {/* Event Title */}
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {event.summary}
          </h4>

          {/* Time and Duration */}
          <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
            <span>⏰ {formatTime(event.startTime, event.endTime)}</span>
            <span>•</span>
            <span>{getDuration(event.startTime, event.endTime)}</span>
          </div>

          {/* Attendee */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
            <span>👤</span>
            <span>{event.attendeeName || event.attendeeEmail}</span>
            {event.attendeeName && (
              <span className="text-xs text-gray-400">({event.attendeeEmail})</span>
            )}
          </div>

          {/* Description */}
          {event.description && !compact && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
              {event.description}
            </p>
          )}

          {/* Email Link */}
          {event.emailRecord && !compact && (
            <div className="mt-3 p-2 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Related Email:</div>
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  {event.emailRecord.subject}
                </span>
                <span className="text-gray-500 ml-2">
                  from {event.emailRecord.from}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Status Indicators */}
        {!compact && (
          <div className="flex flex-col items-center space-y-1">
            {event.status === 'confirmed' && (
              <div className="text-green-500" title="Confirmed">
                ✅
              </div>
            )}
            {event.status === 'cancelled' && (
              <div className="text-red-500" title="Cancelled">
                ❌
              </div>
            )}
            {event.isDemo && (
              <div className="text-blue-500" title="Demo meeting">
                🎯
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {!compact && event.status === 'scheduled' && (
        <div className="mt-4 flex items-center space-x-2">
          <button className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors duration-200">
            ✅ Confirm
          </button>
          <button className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors duration-200">
            ❌ Cancel
          </button>
          <button className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors duration-200">
            ✏️ Edit
          </button>
        </div>
      )}
    </div>
  );
};

export default EventCard;