import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAppState';
import LoadingSpinner from '../UI/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTokens?: boolean; // Whether to require valid Google tokens
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireTokens = true 
}) => {
  const { user, loading, initialized, isAuthenticated, hasValidTokens } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (initialized && !loading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }

      if (requireTokens && !hasValidTokens) {
        router.push('/login');
        return;
      }
    }
  }, [loading, initialized, isAuthenticated, hasValidTokens, requireTokens, router]);

  // Show loading while authentication is being initialized or checked
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-gray-400 text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (requireTokens && !hasValidTokens) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-yellow-400 text-6xl mb-4">🔑</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Google Account Connection Required
          </h2>
          <p className="text-gray-600 mb-4">
            You need to connect your Gmail and Calendar accounts to use this app.
          </p>
          <button 
            onClick={() => router.push('/login')}
            className="btn-primary"
          >
            Connect Google Account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;