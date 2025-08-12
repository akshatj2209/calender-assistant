import React, { useState } from 'react';
import { useAppState } from '../../hooks/useAppState';
import Header from '../Layout/Header';
import LoadingSpinner from '../UI/LoadingSpinner';
import DashboardStatsCards from './DashboardStatsCards';
import DashboardEmailList from './DashboardEmailList';
import DashboardCalendarView from './DashboardCalendarView';
import type { DashboardTab } from '../../types/dashboard';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  
  const {
    currentUser,
    userLoading,
    userError,
    clearErrors
  } = useAppState();

  const handleRefresh = () => {
    // Full page refresh now works properly with persistent context
    window.location.reload();
  };

  // Show loading while user is being loaded
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Initializing user...</p>
        </div>
      </div>
    );
  }

  // Show error if user loading failed
  if (userError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{userError}</p>
          <div className="space-x-2">
            <button onClick={handleRefresh} className="btn-primary">
              Try Again
            </button>
            <button onClick={clearErrors} className="btn-secondary">
              Clear Error
            </button>
          </div>
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
            <DashboardStatsCards />
            
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
                <DashboardEmailList compact={true} limit={5} />
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
                <DashboardCalendarView compact={true} limit={5} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Email Management</h2>
            </div>
            <DashboardEmailList compact={false} />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Calendar Events</h2>
            </div>
            <DashboardCalendarView compact={false} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;