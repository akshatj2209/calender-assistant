import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAppState } from '../../hooks/useAppState';
import EmailList from '../Email/EmailList';
import type { Email } from '../../types/email';

interface DashboardEmailListProps {
  compact?: boolean;
  limit?: number;
}

const DashboardEmailList: React.FC<DashboardEmailListProps> = ({ 
  compact = false, 
  limit = compact ? 5 : 50 
}) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const api = useApi();
  const { currentUser } = useAppState();

  const fetchEmails = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/emails?limit=${limit}&userId=${currentUser.id}`);
      setEmails((response.data as any)?.emails || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchEmails();
    }
  }, [currentUser, limit]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading emails...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchEmails} className="btn-primary">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <EmailList 
      emails={compact ? emails.slice(0, limit) : emails}
      compact={compact}
      onRefresh={fetchEmails}
    />
  );
};

export default DashboardEmailList;