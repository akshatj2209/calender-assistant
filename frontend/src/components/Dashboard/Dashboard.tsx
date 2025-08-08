import React, { useEffect, useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useUser } from '../../hooks/useUser';
import CalendarView from '../Calendar/CalendarView';
import EmailList from '../Email/EmailList';
import Header from '../Layout/Header';
import LoadingSpinner from '../UI/LoadingSpinner';
import StatsCards from './StatsCards';

interface DashboardData {
  emails: any[];
  calendarEvents: any[];
  stats: {
    totalEmails: number;
    demoRequests: number;
    scheduledMeetings: number;
    responseRate: number;
  };
}

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'emails' | 'calendar' | 'scheduled-responses'>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const api = useApi();
  const { currentUser, loading: userLoading, error: userError } = useUser();

  const fetchDashboardData = async () => {
    if (!currentUser) {
      console.log('⏳ Waiting for user to be loaded...');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📊 Fetching dashboard data for user:', currentUser.email);

      // Fetch all data in parallel with individual error handling
      // Note: Use live Google Calendar upcoming endpoint so we include external events
      const [emailsResult, googleEventsResult, emailStatsResult, calendarStatsResult] = await Promise.allSettled([
        api.get(`/emails?limit=10&userId=${currentUser.id}`),
        api.get(`/calendar/upcoming?days=7`),
        api.get(`/emails/stats?days=30&userId=${currentUser.id}`),
        api.get(`/calendar-events/stats?days=30&userId=${currentUser.id}`)
      ]);

      // Process results with fallbacks
      const emails = emailsResult.status === 'fulfilled' 
        ? ((emailsResult.value.data as any)?.emails || [])
        : [];
      
      // Map Google Calendar events to UI shape expected by CalendarView
      const calendarEvents = googleEventsResult.status === 'fulfilled'
        ? (((googleEventsResult.value.data as any)?.events || []).map((ev: any) => {
            const startDateTime = ev?.start?.dateTime || ev?.start?.date;
            const endDateTime = ev?.end?.dateTime || ev?.end?.date;
            const timezone = ev?.start?.timezone || ev?.start?.timeZone || 'UTC';
            const attendees = Array.isArray(ev?.attendees) ? ev.attendees : [];
            const primaryAttendee = attendees.find((a: any) => !a.organizer) || attendees[0] || {};
            const statusRaw = (ev?.status || 'confirmed') as string;
            const status = statusRaw === 'confirmed' ? 'confirmed' : statusRaw === 'cancelled' ? 'cancelled' : 'scheduled';
            return {
              id: ev.id,
              summary: ev.summary || 'Busy',
              description: ev.description,
              startTime: startDateTime,
              endTime: endDateTime,
              timezone,
              attendeeEmail: primaryAttendee.email || '',
              attendeeName: primaryAttendee.displayName || primaryAttendee.name || undefined,
              isDemo: false,
              status,
              meetingType: 'meeting',
            };
          }))
        : [];

      const emailStats = emailStatsResult.status === 'fulfilled' 
        ? (emailStatsResult.value.data as any)?.stats 
        : { total: 0, demoRequests: 0, responsesSent: 0 };

      const calendarStats = calendarStatsResult.status === 'fulfilled' 
        ? (calendarStatsResult.value.data as any)?.stats 
        : { totalEvents: 0 };

      // Log what we got
      console.log('📧 Emails fetched:', emails.length);
      console.log('📅 Calendar events fetched:', calendarEvents.length);
      console.log('📊 Email stats:', emailStats);
      console.log('📊 Calendar stats:', calendarStats);

      const data: DashboardData = {
        emails,
        calendarEvents,
        stats: {
          totalEmails: emailStats.total || 0,
          demoRequests: emailStats.demoRequests || 0,
          scheduledMeetings: calendarStats.totalEvents || 0,
          responseRate: emailStats.responsesSent && emailStats.total 
            ? Math.round((emailStats.responsesSent / emailStats.total) * 100)
            : 0
        }
      };

      setDashboardData(data);

      // Log any failed requests
      [emailsResult, googleEventsResult, emailStatsResult, calendarStatsResult].forEach((result, index) => {
        if (result.status === 'rejected') {
          const endpoints = ['/emails', '/api/calendar/upcoming', '/emails/stats', '/calendar-events/stats'];
          console.warn(`⚠️ Failed to fetch ${endpoints[index]}:`, result.reason);
        }
      });

    } catch (err: any) {
      console.error('❌ Dashboard fetch error:', err);
      const errorMessage = err.status === 0 
        ? 'Cannot connect to server. Please check if the backend is running on http://localhost:3001'
        : err.response?.data?.error || err.message || 'Failed to load dashboard data';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchDashboardData();
    }
  }, [currentUser]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  // Show loading while user is being loaded or dashboard data is being fetched
  if (userLoading || (currentUser && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">
            {userLoading ? 'Initializing user...' : 'Loading dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  // Show error if user loading failed or dashboard loading failed
  if (userError || error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">
            {userError || error}
          </p>
          <button 
            onClick={handleRefresh}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show error if no user is available
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-600 text-xl mb-4">⚠️ No User</div>
          <p className="text-gray-600 mb-4">
            Unable to load user. Please refresh the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onRefresh={handleRefresh}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <StatsCards stats={dashboardData?.stats || {
              totalEmails: 0,
              demoRequests: 0,
              scheduledMeetings: 0,
              responseRate: 0
            }} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Emails */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Emails</h3>
                  <button 
                    onClick={() => setActiveTab('emails')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View All →
                  </button>
                </div>
                <EmailList 
                  emails={dashboardData?.emails.slice(0, 5) || []}
                  compact={true}
                />
              </div>

              {/* Upcoming Meetings */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Upcoming Meetings</h3>
                  <button 
                    onClick={() => setActiveTab('calendar')}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Calendar →
                  </button>
                </div>
                <CalendarView 
                  events={dashboardData?.calendarEvents.slice(0, 5) || []}
                  compact={true}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Email Management</h2>
              <button 
                onClick={handleRefresh}
                className="btn-secondary"
              >
                🔄 Refresh
              </button>
            </div>
            <EmailList 
              emails={dashboardData?.emails || []}
              compact={false}
            />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Calendar Events</h2>
              <button 
                onClick={handleRefresh}
                className="btn-secondary"
              >
                🔄 Refresh
              </button>
            </div>
            <CalendarView 
              events={dashboardData?.calendarEvents || []}
              compact={false}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;