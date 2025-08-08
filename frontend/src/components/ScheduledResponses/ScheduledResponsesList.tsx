import React, { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useApi';
import { useUser } from '../../hooks/useUser';
import ScheduledResponseCard from './ScheduledResponseCard';
import ScheduledResponseEditModal from './ScheduledResponseEditModal';
import LoadingSpinner from '../UI/LoadingSpinner';

export interface ScheduledResponse {
  id: string;
  userId: string;
  emailRecordId: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  body: string;
  proposedTimeSlots: any;
  scheduledAt: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED' | 'FAILED' | 'EDITING';
  sentAt?: string;
  sentMessageId?: string;
  lastEditedAt?: string;
  editedBy?: string;
  createdAt: string;
  updatedAt: string;
  emailRecord?: {
    id: string;
    from: string;
    subject: string;
    receivedAt: string;
  };
}

const ScheduledResponsesList: React.FC = () => {
  const [responses, setResponses] = useState<ScheduledResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingResponse, setEditingResponse] = useState<ScheduledResponse | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const api = useApi();
  const { currentUser } = useUser();

  const fetchResponses = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/scheduled-responses/drafts?userId=${currentUser.id}`);
      setResponses(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('Error fetching scheduled responses:', err);
      setError(err.message || 'Failed to load scheduled responses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResponses();
  }, [currentUser]);

  const handleEdit = (response: ScheduledResponse) => {
    setEditingResponse(response);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData: Partial<ScheduledResponse>) => {
    if (!editingResponse) return;

    try {
      const response = await api.put(`/scheduled-responses/${editingResponse.id}`, updatedData);
      
      console.log('API response from edit:', response.data);
      console.log('Updated data being applied:', updatedData);
      
      // Update the local state with the new data - create completely new array to force re-render
      setResponses(prev => {
        const newResponses = prev.map(r => {
          if (r.id === editingResponse.id) {
            // Create a completely new object to ensure React detects the change
            const updatedResponse: ScheduledResponse = {
              ...r,
              subject: updatedData.subject || r.subject,
              body: updatedData.body || r.body,
              scheduledAt: updatedData.scheduledAt || r.scheduledAt,
              proposedTimeSlots: updatedData.proposedTimeSlots || r.proposedTimeSlots,
              updatedAt: new Date().toISOString(),
              lastEditedAt: new Date().toISOString()
            };
            console.log('Updated response in list:', updatedResponse);
            console.log('Old scheduledAt:', r.scheduledAt);
            console.log('New scheduledAt:', updatedResponse.scheduledAt);
            return updatedResponse;
          }
          return r;
        });
        console.log('Full updated responses array:', newResponses);
        return newResponses;
      });
      
      setShowEditModal(false);
      setEditingResponse(null);
    } catch (err: any) {
      console.error('Error updating response:', err);
      alert('Failed to update response: ' + (err.message || 'Unknown error'));
    }
  };

  const handleReschedule = async (responseId: string, newScheduledAt: Date) => {
    try {
      await api.post(`/scheduled-responses/${responseId}/reschedule`, {
        scheduledAt: newScheduledAt.toISOString()
      });
      
      await fetchResponses(); // Refresh the list
    } catch (err: any) {
      console.error('Error rescheduling response:', err);
      alert('Failed to reschedule response: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDelete = async (responseId: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled response?')) {
      return;
    }

    try {
      await api.post(`/scheduled-responses/${responseId}/cancel`);
      await fetchResponses(); // Refresh the list
    } catch (err: any) {
      console.error('Error cancelling response:', err);
      alert('Failed to cancel response: ' + (err.message || 'Unknown error'));
    }
  };

  const handleSendNow = async (responseId: string) => {
    if (!confirm('Are you sure you want to send this response immediately?')) {
      return;
    }

    try {
      await api.post(`/scheduled-responses/${responseId}/send`);
      await fetchResponses(); // Refresh the list
    } catch (err: any) {
      console.error('Error sending response:', err);
      alert('Failed to send response: ' + (err.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Loading scheduled responses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchResponses} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {responses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📧</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No scheduled responses
            </h3>
            <p className="text-gray-600">
              When you have scheduled email responses, they will appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Scheduled Responses ({responses.length})
                </h2>
                <p className="text-sm text-gray-600">
                  Manage and edit your upcoming email responses
                </p>
              </div>
              <button onClick={fetchResponses} className="btn-secondary">
                🔄 Refresh
              </button>
            </div>

            {responses.map((response) => (
              <ScheduledResponseCard
                key={`${response.id}-${response.updatedAt}`}
                response={response}
                onEdit={handleEdit}
                onReschedule={handleReschedule}
                onDelete={handleDelete}
                onSendNow={handleSendNow}
              />
            ))}
          </>
        )}
      </div>

      {showEditModal && editingResponse && (
        <ScheduledResponseEditModal
          response={editingResponse}
          onSave={handleSaveEdit}
          onClose={() => {
            setShowEditModal(false);
            setEditingResponse(null);
          }}
        />
      )}
    </>
  );
};

export default ScheduledResponsesList;