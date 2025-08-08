import React, { useState, useEffect } from 'react';
import { ScheduledResponse } from './ScheduledResponsesList';

interface ScheduledResponseEditModalProps {
  response: ScheduledResponse;
  onSave: (updatedData: Partial<ScheduledResponse>) => void;
  onClose: () => void;
}

// Helper functions for timezone handling
const toLocalDateTimeString = (utcDateString: string): string => {
  const date = new Date(utcDateString);
  // Get local timezone offset and adjust
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 16);
};

const toUTCFromLocal = (localDateTimeString: string): string => {
  const date = new Date(localDateTimeString);
  return date.toISOString();
};

const formatTimeSlotForDisplay = (slot: any): string => {
  if (!slot || !slot.start) return 'Invalid slot';
  const startDate = new Date(slot.start);
  const endDate = slot.end ? new Date(slot.end) : new Date(startDate.getTime() + 30 * 60 * 1000); // Default 30 min
  return `${startDate.toLocaleString()} - ${endDate.toLocaleTimeString()}`;
};

const ScheduledResponseEditModal: React.FC<ScheduledResponseEditModalProps> = ({
  response,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState({
    subject: response.subject,
    body: response.body,
    scheduledAt: toLocalDateTimeString(response.scheduledAt)
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.body.trim()) {
      newErrors.body = 'Body is required';
    }

    if (!formData.scheduledAt) {
      newErrors.scheduledAt = 'Scheduled time is required';
    } else {
      // Create date from local datetime input and check against current local time
      const scheduledDate = new Date(formData.scheduledAt);
      const now = new Date();
      
      if (scheduledDate <= now) {
        newErrors.scheduledAt = 'Cannot schedule for a past date or current time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const updatedData = {
        subject: formData.subject.trim(),
        body: formData.body.trim(),
        scheduledAt: toUTCFromLocal(formData.scheduledAt),
        // Keep the original proposed time slots unchanged
        proposedTimeSlots: response.proposedTimeSlots
      };

      await onSave(updatedData);
    } catch (error) {
      console.error('Error saving response:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Scheduled Response</h2>
            <p className="text-sm text-gray-600 mt-1">
              To: {response.recipientName ? `${response.recipientName} <${response.recipientEmail}>` : response.recipientEmail}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                className={`input ${errors.subject ? 'border-red-500' : ''}`}
                placeholder="Enter email subject"
              />
              {errors.subject && (
                <p className="text-red-600 text-sm mt-1">{errors.subject}</p>
              )}
            </div>

            {/* Scheduled Time */}
            <div>
              <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-2">
                Scheduled Time (Local Time)
              </label>
              <input
                type="datetime-local"
                id="scheduledAt"
                value={formData.scheduledAt}
                onChange={(e) => handleChange('scheduledAt', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className={`input ${errors.scheduledAt ? 'border-red-500' : ''}`}
              />
              {errors.scheduledAt && (
                <p className="text-red-600 text-sm mt-1">{errors.scheduledAt}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                Current time: {new Date().toLocaleString()}
              </p>
            </div>

            {/* Body */}
            <div>
              <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">
                Message Body
              </label>
              <textarea
                id="body"
                value={formData.body}
                onChange={(e) => handleChange('body', e.target.value)}
                rows={10}
                className={`input ${errors.body ? 'border-red-500' : ''}`}
                placeholder="Enter the email message body"
              />
              {errors.body && (
                <p className="text-red-600 text-sm mt-1">{errors.body}</p>
              )}
            </div>

            {/* Proposed Time Slots - Read Only Display */}
            {response.proposedTimeSlots && Array.isArray(response.proposedTimeSlots) && response.proposedTimeSlots.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed Time Slots (Read Only)
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="space-y-2">
                    {response.proposedTimeSlots.map((slot: any, index: number) => (
                      <div key={index} className="text-sm text-gray-700 bg-white px-3 py-2 rounded border">
                        <span className="font-medium">Slot {index + 1}:</span> {formatTimeSlotForDisplay(slot)}
                      </div>
                    ))}
                  </div>
                  <p className="text-gray-500 text-xs mt-2">
                    Time slots cannot be edited here. They are part of the original response.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 flex-shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduledResponseEditModal;