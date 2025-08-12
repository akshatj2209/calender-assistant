import React from 'react';
import { useAppState, useAuth, useUser } from '../../hooks/useAppState';

const ContextDemo: React.FC = () => {
  const { clearErrors } = useAppState();
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const { currentUser, switchUser } = useUser();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Context Provider Demo</h2>
        <p className="text-gray-600 mb-6">
          This demonstrates clean global state management using React Context and useReducer.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Auth State */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-blue-800">Authentication State</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Authenticated:</span>{' '}
                <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                  {isAuthenticated ? 'Yes' : 'No'}
                </span>
              </div>
              {authUser && (
                <>
                  <div>
                    <span className="font-medium">Email:</span> {authUser.email}
                  </div>
                  <div>
                    <span className="font-medium">Name:</span> {authUser.name}
                  </div>
                  <div>
                    <span className="font-medium">Has Google Tokens:</span>{' '}
                    <span className={authUser.hasGoogleTokens ? 'text-green-600' : 'text-red-600'}>
                      {authUser.hasGoogleTokens ? 'Yes' : 'No'}
                    </span>
                  </div>
                </>
              )}
            </div>
            {isAuthenticated && (
              <button
                onClick={logout}
                className="mt-3 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Logout
              </button>
            )}
          </div>

          {/* User State */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-3 text-green-800">User State</h3>
            <div className="space-y-2 text-sm">
              {currentUser ? (
                <>
                  <div>
                    <span className="font-medium">ID:</span> {currentUser.id}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {currentUser.email}
                  </div>
                  <div>
                    <span className="font-medium">Name:</span> {currentUser.name}
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{' '}
                    {new Date(currentUser.createdAt).toLocaleDateString()}
                  </div>
                </>
              ) : (
                <div>No user loaded</div>
              )}
            </div>
            <div className="mt-3 space-x-2">
              <button
                onClick={() => switchUser('demo@example.com', 'Demo User')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Switch to Demo
              </button>
              <button
                onClick={() => switchUser('test@example.com', 'Test User')}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Switch to Test
              </button>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Global Actions</h3>
          <button
            onClick={clearErrors}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear All Errors
          </button>
        </div>

        {/* Benefits */}
        <div className="mt-6 bg-yellow-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">Benefits of This Approach</h3>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• Centralized state management with useReducer</li>
            <li>• Type-safe context with TypeScript</li>
            <li>• Clean separation of concerns</li>
            <li>• Easy to test and mock</li>
            <li>• Predictable state updates</li>
            <li>• No prop drilling</li>
            <li>• Consistent error handling</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ContextDemo;