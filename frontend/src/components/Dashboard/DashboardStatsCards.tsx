import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useAppState } from '../../hooks/useAppState';
import StatsCards from './StatsCards';
import type { DashboardStats } from '../../types/dashboard';

const DashboardStatsCards: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalEmails: 0,
    demoRequests: 0,
    scheduledMeetings: 0,
    responseRate: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const api = useApi();
  const { currentUser } = useAppState();

  const fetchStats = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);
      
      const [emailStatsResult, calendarStatsResult] = await Promise.allSettled([
        api.get(`/emails/stats?days=30&userId=${currentUser.id}`),
        api.get(`/calendar-events/stats?days=30&userId=${currentUser.id}`)
      ]);

      const emailStats = emailStatsResult.status === 'fulfilled' 
        ? (emailStatsResult.value.data as any)?.stats 
        : { total: 0, demoRequests: 0, responsesSent: 0 };

      const calendarStats = calendarStatsResult.status === 'fulfilled' 
        ? (calendarStatsResult.value.data as any)?.stats 
        : { totalEvents: 0 };

      const dashboardStats: DashboardStats = {
        totalEmails: emailStats.total || 0,
        demoRequests: emailStats.demoRequests || 0,
        scheduledMeetings: calendarStats.totalEvents || 0,
        responseRate: emailStats.responsesSent && emailStats.total 
          ? Math.round((emailStats.responsesSent / emailStats.total) * 100)
          : 0
      };

      setStats(dashboardStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchStats();
    }
  }, [currentUser]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
              <div className="w-12 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="mt-4">
              <div className="w-16 h-8 bg-gray-200 rounded mb-2"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-400 text-4xl mb-4">⚠️</div>
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchStats} className="btn-primary">
          Reload Stats
        </button>
      </div>
    );
  }

  return <StatsCards stats={stats} />;
};

export default DashboardStatsCards;