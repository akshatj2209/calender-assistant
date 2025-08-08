import React, { useState } from 'react';
import { ScheduledResponse } from './ScheduledResponsesList';

interface ScheduledResponseCardProps {
  response: ScheduledResponse;
  onEdit: (response: ScheduledResponse) => void;
  onReschedule: (responseId: string, newDate: Date) => void;
  onDelete: (responseId: string) => void;
  onSendNow: (responseId: string) => void;
}

const ScheduledResponseCard: React.FC<ScheduledResponseCardProps> = ({
  response,
  onEdit,
  onReschedule,
  onDelete,
  onSendNow
}) => {
  const [showRescheduleInput, setShowRescheduleInput] = useState(false);
  const [newScheduleDate, setNewScheduleDate] = useState('');

  // Debug: Log when component receives new props
  console.log('ScheduledResponseCard received response:', {
    id: response.id,
    scheduledAt: response.scheduledAt,
    updatedAt: response.updatedAt
  });

  const getStatusBadge = (status: ScheduledResponse['status']) => {
    const badges = {
      DRAFT: { text: 'Draft', className: 'status-pending' },
      SCHEDULED: { text: 'Scheduled', className: 'status-processed' },
      SENT: { text: 'Sent', className: 'bg-green-100 text-green-800' },
      CANCELLED: { text: 'Cancelled', className: 'bg-gray-100 text-gray-800' },
      FAILED: { text: 'Failed', className: 'status-failed' },
      EDITING: { text: 'Editing', className: 'bg-blue-100 text-blue-800' }
    };
    
    const badge = badges[status] || badges.DRAFT;
    return <span className={`status-badge ${badge.className}`}>{badge.text}</span>;
  };

  const formatDate = (dateString: string) => {
    console.log('Formatting date for card:', dateString);
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    
    console.log('Parsed date:', date.toISOString());
    console.log('Current date:', now.toISOString());
    
    // Check if it's the same calendar day
    const dateDay = date.toDateString();
    const nowDay = now.toDateString();
    
    // Check if it's tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDay = tomorrow.toDateString();
    
    if (diffTime < 0) {
      return date.toLocaleString() + ' (Overdue)';
    } else if (diffTime < 60 * 60 * 1000) { // Less than 1 hour
      const minutes = Math.ceil(diffTime / (1000 * 60));
      return `in ${minutes} minute(s)`;
    } else if (dateDay === nowDay) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (dateDay === tomorrowDay) {
      return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      // For dates further in the future, show the day of week if within a week
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        return `${date.toLocaleDateString('en-US', { weekday: 'long' })} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    }
    
    return date.toLocaleString();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleRescheduleSubmit = () => {
    if (!newScheduleDate) return;
    
    const date = new Date(newScheduleDate);
    const now = new Date();
    
    if (date <= now) {
      alert('Cannot schedule for a past date or current time');
      return;
    }
    
    onReschedule(response.id, date);
    setShowRescheduleInput(false);
    setNewScheduleDate('');
  };

  const formatTimeSlots = (timeSlots: any) => {
    if (!timeSlots || !Array.isArray(timeSlots)) return 'No time slots';
    
    return timeSlots.map((slot: any, index: number) => (
      <span key={index} className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mr-2 mb-1">
        {new Date(slot.start).toLocaleString([], { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        })}
      </span>
    ));
  };

  const canEdit = ['DRAFT', 'SCHEDULED'].includes(response.status);
  const canSend = ['DRAFT', 'SCHEDULED'].includes(response.status);
  const canReschedule = ['DRAFT', 'SCHEDULED'].includes(response.status);

  return (
    <div className="card">
      <div className="flex items-start justify-between space-x-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-3">
            {getStatusBadge(response.status)}
            <span className="text-sm text-gray-500">
              Scheduled: {formatDate(response.scheduledAt)}
            </span>
          </div>

          {/* Recipient Info */}
          <div className="mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">To:</span>
              <span className="text-sm text-gray-700">
                {response.recipientName ? `${response.recipientName} <${response.recipientEmail}>` : response.recipientEmail}
              </span>
            </div>
            {response.emailRecord && (
              <div className="mt-1 text-xs text-gray-500">
                Reply to: {truncateText(response.emailRecord.subject, 60)}
                <span className="ml-2">
                  (from {new Date(response.emailRecord.receivedAt).toLocaleDateString()})
                </span>
              </div>
            )}
          </div>

          {/* Subject */}
          <div className="mb-3">
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Subject: {response.subject}
            </h4>
          </div>

          {/* Body Preview */}
          <div className="mb-3">
            <p className="text-sm text-gray-600 line-clamp-3">
              {truncateText(response.body, 200)}
            </p>
          </div>

          {/* Time Slots */}
          {response.proposedTimeSlots && (
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Proposed Time Slots:</div>
              <div className="flex flex-wrap">
                {formatTimeSlots(response.proposedTimeSlots)}
              </div>
            </div>
          )}

          {/* Reschedule Input */}
          {showRescheduleInput && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="datetime-local"
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="input text-sm"
                />
                <button
                  onClick={handleRescheduleSubmit}
                  className="btn-primary text-sm py-1 px-2"
                >
                  Confirm
                </button>
                <button
                  onClick={() => {
                    setShowRescheduleInput(false);
                    setNewScheduleDate('');
                  }}
                  className="btn-secondary text-sm py-1 px-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>Created: {new Date(response.createdAt).toLocaleDateString()}</span>
            {response.lastEditedAt && (
              <>
                <span>•</span>
                <span>Last edited: {new Date(response.lastEditedAt).toLocaleDateString()}</span>
              </>
            )}
            {response.sentAt && (
              <>
                <span>•</span>
                <span>Sent: {new Date(response.sentAt).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2 flex-shrink-0">
          {canEdit && (
            <button
              onClick={() => onEdit(response)}
              className="btn-secondary text-sm py-1 px-3"
              title="Edit response"
            >
              ✏️ Edit
            </button>
          )}
          
          {canSend && (
            <button
              onClick={() => onSendNow(response.id)}
              className="btn-primary text-sm py-1 px-3"
              title="Send immediately"
            >
              📤 Send Now
            </button>
          )}
          
          {canReschedule && (
            <button
              onClick={() => setShowRescheduleInput(!showRescheduleInput)}
              className="btn-secondary text-sm py-1 px-3"
              title="Reschedule"
            >
              🕒 Reschedule
            </button>
          )}
          
          {['DRAFT', 'SCHEDULED'].includes(response.status) && (
            <button
              onClick={() => onDelete(response.id)}
              className="bg-red-100 hover:bg-red-200 text-red-700 font-medium py-1 px-3 rounded-lg transition-colors duration-200 text-sm"
              title="Cancel response"
            >
              🗑️ Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledResponseCard;