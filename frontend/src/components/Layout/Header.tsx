import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface HeaderProps {
  onRefresh: () => void;
  activeTab: 'overview' | 'emails' | 'calendar';
  onTabChange: (tab: 'overview' | 'emails' | 'calendar') => void;
}

const Header: React.FC<HeaderProps> = ({ onRefresh, activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  
  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '📊' },
    { id: 'emails' as const, label: 'Emails', icon: '📧' },
    { id: 'calendar' as const, label: 'Calendar', icon: '📅' }
  ];

  const handleLogout = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await logout();
      window.location.reload();
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">🤖</span>
              <h1 className="text-xl font-bold text-gray-900">Gmail Calendar Assistant</h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onRefresh}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
              title="Refresh data"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <div className="h-6 w-px bg-gray-300"></div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-600">Connected</span>
              </div>

              {user && (
                <>
                  <div className="h-6 w-px bg-gray-300"></div>
                  <div className="flex items-center space-x-3">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-gray-500 text-xs">{user.email}</div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
                      title="Sign out"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;