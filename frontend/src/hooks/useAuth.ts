import { useState, useEffect } from 'react';
import { useApi } from './useApi';

interface User {
  id: string;
  email: string;
  name: string;
  hasGoogleTokens: boolean;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user ID exists in localStorage
      const userId = localStorage.getItem('gmail_assistant_user_id');
      if (!userId) {
        setUser(null);
        setLoading(false);
        return;
      }

      console.log('🔍 Checking auth status for user:', userId);

      // Verify user exists and has valid tokens
      const response = await api.get(`/auth/status?userId=${userId}`);
      
      if (response.data.authenticated) {
        setUser({
          id: response.data.user.id,
          email: response.data.user.email,
          name: response.data.user.name,
          hasGoogleTokens: response.data.hasValidTokens
        });
        console.log('✅ User authenticated:', response.data.user.email);
      } else {
        console.log('❌ User not authenticated');
        setUser(null);
        // Clear invalid data
        localStorage.removeItem('gmail_assistant_user_id');
        localStorage.removeItem('gmail_assistant_user_email');
      }
    } catch (err: any) {
      console.error('❌ Auth status check failed:', err);
      
      // If 401 or user not found, clear local storage
      if (err.status === 401 || err.status === 404) {
        localStorage.removeItem('gmail_assistant_user_id');
        localStorage.removeItem('gmail_assistant_user_email');
        setUser(null);
      } else {
        setError(err.message || 'Failed to check authentication status');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Call backend logout if user exists
      if (user) {
        await api.post('/auth/logout', { userId: user.id });
      }
    } catch (err) {
      console.warn('Logout API call failed:', err);
      // Continue with local logout even if API fails
    } finally {
      // Clear local storage
      localStorage.removeItem('gmail_assistant_user_id');
      localStorage.removeItem('gmail_assistant_user_email');
      
      // Clear state
      setUser(null);
      setError(null);
      setLoading(false);
      
      console.log('👋 User logged out');
    }
  };

  const refreshTokens = async () => {
    if (!user) return false;

    try {
      const response = await api.post('/auth/refresh', { userId: user.id });
      
      if (response.data.success) {
        console.log('🔄 Tokens refreshed successfully');
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('❌ Token refresh failed:', err);
      return false;
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    hasValidTokens: user?.hasGoogleTokens || false,
    logout,
    refreshTokens,
    checkAuthStatus
  };
};