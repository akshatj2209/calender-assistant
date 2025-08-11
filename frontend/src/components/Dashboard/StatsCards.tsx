import React from 'react';
import type { StatsCardProps } from '../../types/dashboard';

const StatsCards: React.FC<StatsCardProps> = ({ stats }) => {
  const cards = [
    {
      title: 'Total Emails',
      value: stats.totalEmails,
      icon: '📧',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%',
      changeType: 'positive' as const
    },
    {
      title: 'Demo Requests',
      value: stats.demoRequests,
      icon: '🎯',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8%',
      changeType: 'positive' as const
    },
    {
      title: 'Scheduled Meetings',
      value: stats.scheduledMeetings,
      icon: '📅',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+15%',
      changeType: 'positive' as const
    },
    {
      title: 'Response Rate',
      value: `${Math.round(stats.responseRate)}%`,
      icon: '⚡',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      change: '+5%',
      changeType: 'positive' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className={`p-2 rounded-lg ${card.bgColor}`}>
              <span className="text-2xl">{card.icon}</span>
            </div>
            <div className={`text-sm font-medium ${
              card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {card.change}
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-gray-900">
              {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
            </h3>
            <p className="text-sm text-gray-600 mt-1">{card.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;