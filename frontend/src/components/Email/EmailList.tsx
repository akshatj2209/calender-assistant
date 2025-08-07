import React from 'react';
import EmailCard from './EmailCard';

interface Email {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  status: 'pending' | 'processed' | 'failed' | 'response_sent';
  isDemoRequest?: boolean;
  intentAnalysis?: {
    confidence: number;
    intentType: string;
  };
  contactInfo?: {
    name: string;
    email: string;
    company?: string;
  };
  calendarEvents?: any[];
}

interface EmailListProps {
  emails: Email[];
  compact?: boolean;
  onEmailSelect?: (email: Email) => void;
  onRefresh?: () => void;
}

const EmailList: React.FC<EmailListProps> = ({ 
  emails, 
  compact = false, 
  onEmailSelect,
  onRefresh 
}) => {
  if (emails.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-6xl mb-4">📧</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No emails found</h3>
        <p className="text-gray-600 mb-4">
          {compact ? 'Recent emails will appear here' : 'No emails match your current filters'}
        </p>
        {onRefresh && (
          <button onClick={onRefresh} className="btn-primary">
            🔄 Refresh Emails
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {emails.map((email) => (
        <EmailCard
          key={email.id}
          email={email}
          compact={compact}
          onClick={() => onEmailSelect?.(email)}
        />
      ))}
      
      {compact && emails.length >= 5 && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-600">
            Showing {emails.length} recent emails
          </p>
        </div>
      )}
    </div>
  );
};

export default EmailList;