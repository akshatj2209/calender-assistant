import { useState, useEffect } from 'react';
import { useApi } from './useApi';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export const useUser = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const api = useApi();

  useEffect(() => {
    const initializeUser = async () => {
      try {
        setLoading(true);
        setError(null);

        // Try to get user from localStorage first
        const savedUserId = localStorage.getItem('gmail_assistant_user_id');
        
        if (savedUserId) {
          try {
            const response = await api.users.getById(savedUserId);
            setCurrentUser((response.data as any).user);
            console.log('✅ Loaded existing user:', (response.data as any).user.email);
            return;
          } catch (err) {
            console.warn('⚠️ Saved user not found, will create new one');
            localStorage.removeItem('gmail_assistant_user_id');
          }
        }

        // Create a default user for development
        console.log('🔄 Creating default user...');
        const response = await api.users.create({
          email: 'user@gmail-assistant.dev',
          name: 'Demo User'
        });
        
        const user = (response.data as any).user;
        setCurrentUser(user);
        localStorage.setItem('gmail_assistant_user_id', user.id);
        console.log('✅ Created new user:', user.email);

      } catch (err: any) {
        console.error('❌ User initialization failed:', err);
        setError(err.message || 'Failed to initialize user');
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, []);

  const switchUser = async (email: string, name: string) => {
    try {
      setLoading(true);
      setError(null);

      // Try to find existing user by email
      try {
        const response = await api.users.getByEmail(email);
        const user = (response.data as any).user;
        setCurrentUser(user);
        localStorage.setItem('gmail_assistant_user_id', user.id);
        console.log('✅ Switched to existing user:', user.email);
        return user;
      } catch {
        // User doesn't exist, create new one
        const response = await api.users.create({ email, name });
        const user = (response.data as any).user;
        setCurrentUser(user);
        localStorage.setItem('gmail_assistant_user_id', user.id);
        console.log('✅ Created and switched to new user:', user.email);
        return user;
      }
    } catch (err: any) {
      console.error('❌ User switch failed:', err);
      setError(err.message || 'Failed to switch user');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const clearUser = () => {
    setCurrentUser(null);
    localStorage.removeItem('gmail_assistant_user_id');
    console.log('🔄 User cleared');
  };

  return {
    currentUser,
    loading,
    error,
    switchUser,
    clearUser,
    isAuthenticated: !!currentUser
  };
};