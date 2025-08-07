import React from 'react';

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

interface EmailCardProps {
  email: Email;
  compact?: boolean;
  onClick?: () => void;
}

const EmailCard: React.FC<EmailCardProps> = ({ email, compact = false, onClick }) => {
  const getStatusBadge = (status: Email['status']) => {
    const badges = {
      pending: { text: 'Pending', className: 'status-pending' },
      processed: { text: 'Processed', className: 'status-processed' },
      failed: { text: 'Failed', className: 'status-failed' },
      response_sent: { text: 'Response Sent', className: 'status-processed' }
    };
    
    const badge = badges[status] || badges.pending;
    return <span className={badge.className}>{badge.text}</span>;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString();
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className={`border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-sm' : ''
      } ${compact ? 'py-3' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between space-x-4">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-2">
            {email.isDemoRequest && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                🎯 Demo Request
              </span>
            )}
            {getStatusBadge(email.status)}
          </div>

          {/* From and Subject */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {email.contactInfo?.name || email.from}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {email.contactInfo?.email || email.from}
              </p>
            </div>
            <p className="text-xs text-gray-500 flex-shrink-0">
              {formatDate(email.receivedAt)}
            </p>
          </div>

          {/* Subject */}
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            {truncateText(email.subject, compact ? 50 : 80)}
          </h4>

          {/* Body Preview */}
          <p className="text-sm text-gray-600 line-clamp-2">
            {truncateText(email.body, compact ? 100 : 200)}
          </p>

          {/* Analysis Info */}
          {email.intentAnalysis && !compact && (
            <div className="mt-3 flex items-center space-x-4 text-xs text-gray-500">
              <span>
                Confidence: {Math.round(email.intentAnalysis.confidence * 100)}%
              </span>
              <span>•</span>
              <span>
                Intent: {email.intentAnalysis.intentType}
              </span>
              {email.calendarEvents && email.calendarEvents.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-green-600">
                    📅 {email.calendarEvents.length} event(s) scheduled
                  </span>
                </>
              )}
            </div>
          )}

          {/* Company Info */}
          {email.contactInfo?.company && !compact && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                🏢 {email.contactInfo.company}
              </span>
            </div>
          )}
        </div>

        {/* Action Icons */}
        {!compact && (
          <div className="flex flex-col items-center space-y-1">
            {email.status === 'response_sent' && (
              <div className="text-green-500" title="Response sent">
                ✅
              </div>
            )}
            {email.isDemoRequest && (
              <div className="text-blue-500" title="Demo request">
                🎯
              </div>
            )}
            {email.calendarEvents && email.calendarEvents.length > 0 && (
              <div className="text-purple-500" title="Has calendar events">
                📅
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailCard;