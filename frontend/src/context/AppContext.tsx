import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useApi } from '../hooks/useApi';
import type { AuthUser, User } from '../types/user';

interface AppState {
  auth: {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
  };
  user: {
    currentUser: User | null;
    loading: boolean;
    error: string | null;
  };
  appInitialized: boolean;
}

interface AppContextType {
  state: AppState;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  switchUser: (email: string, name: string) => Promise<User | null>;
  clearUser: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);
  
  const [appInitialized, setAppInitialized] = useState(false);
  
  const api = useApi();

  const state: AppState = {
    auth: {
      user: authUser,
      loading: authLoading,
      error: authError,
    },
    user: {
      currentUser,
      loading: userLoading,
      error: userError,
    },
    appInitialized,
  };

  const checkAuthStatus = async () => {
    try {
      setAuthLoading(true);
      setAuthError(null);

      const userId = localStorage.getItem('gmail_assistant_user_id');
      
      if (!userId) {
        setAuthUser(null);
        setAuthLoading(false);
        return;
      }

      const response = await api.get(`/auth/status?userId=${userId}`);
      const responseData = response.data as any;
      
      if (responseData?.authenticated && responseData?.hasValidTokens) {
        const user: AuthUser = {
          id: responseData.user?.id,
          email: responseData.user?.email,
          name: responseData.user?.name,
          hasGoogleTokens: responseData.hasValidTokens
        };
        setAuthUser(user);
      } else {
        setAuthUser(null);
        localStorage.removeItem('gmail_assistant_user_id');
        localStorage.removeItem('gmail_assistant_user_email');
      }
      setAuthLoading(false);
    } catch (err: any) {
      if (err.status === 401 || err.status === 404) {
        localStorage.removeItem('gmail_assistant_user_id');
        localStorage.removeItem('gmail_assistant_user_email');
        setAuthUser(null);
      } else {
        setAuthError(err.message || 'Failed to check authentication status');
      }
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (authUser) {
        await api.post('/auth/logout', { userId: authUser.id });
      }
    } catch (err) {
      console.warn('Logout API call failed:', err);
    } finally {
      localStorage.removeItem('gmail_assistant_user_id');
      localStorage.removeItem('gmail_assistant_user_email');
      
      setAuthUser(null);
      setCurrentUser(null);
      setAuthError(null);
      setUserError(null);
    }
  };

  const refreshTokens = async (): Promise<boolean> => {
    if (!authUser) return false;

    try {
      const response = await api.post('/auth/refresh', { userId: authUser.id });
      return (response.data as any)?.success || false;
    } catch (err) {
      return false;
    }
  };

  const initializeUser = async () => {
    try {
      setUserLoading(true);
      setUserError(null);

      const savedUserId = localStorage.getItem('gmail_assistant_user_id');
      const savedUserEmail = localStorage.getItem('gmail_assistant_user_email');
      
      if (savedUserId) {
        try {
          const response = await api.users.getById(savedUserId);
          const user = (response.data as any).user;
          setCurrentUser(user);
          
          localStorage.setItem('gmail_assistant_user_id', user.id);
          localStorage.setItem('gmail_assistant_user_email', user.email);
          setUserLoading(false);
          return;
        } catch (err) {
          localStorage.removeItem('gmail_assistant_user_id');
          localStorage.removeItem('gmail_assistant_user_email');
        }
      }

      const userEmail = savedUserEmail || 'user@gmail-assistant.dev';
      const userName = savedUserEmail ? 'User' : 'Demo User';

      const response = await api.users.create({
        email: userEmail,
        name: userName
      });
      
      const user = (response.data as any).user;
      setCurrentUser(user);
      localStorage.setItem('gmail_assistant_user_id', user.id);
      localStorage.setItem('gmail_assistant_user_email', user.email);
      setUserLoading(false);

    } catch (err: any) {
      setUserError(err.message || 'Failed to initialize user');
      setUserLoading(false);
    }
  };

  const switchUser = async (email: string, name: string): Promise<User | null> => {
    try {
      setUserLoading(true);
      setUserError(null);

      try {
        const response = await api.users.getByEmail(email);
        const user = (response.data as any).user;
        setCurrentUser(user);
        localStorage.setItem('gmail_assistant_user_id', user.id);
        setUserLoading(false);
        return user;
      } catch {
        const response = await api.users.create({ email, name });
        const user = (response.data as any).user;
        setCurrentUser(user);
        localStorage.setItem('gmail_assistant_user_id', user.id);
        setUserLoading(false);
        return user;
      }
    } catch (err: any) {
      setUserError(err.message || 'Failed to switch user');
      setUserLoading(false);
      return null;
    }
  };

  const clearUser = () => {
    setCurrentUser(null);
    localStorage.removeItem('gmail_assistant_user_id');
  };

  useEffect(() => {
    const initializeApp = async () => {
      const savedUserId = localStorage.getItem('gmail_assistant_user_id');
      
      try {
        if (savedUserId) {
          await initializeUser();
          await checkAuthStatus();
          setAppInitialized(true);
        } else {
          setAuthUser(null);
          setAuthLoading(false);
          setCurrentUser(null);
          setUserLoading(false);
          setAppInitialized(true);
        }
      } catch (error) {
        setAuthUser(null);
        setAuthLoading(false);
        setCurrentUser(null);
        setUserLoading(false);
        setAppInitialized(true);
      }
    };
    
    initializeApp();
  }, []);

  const contextValue: AppContextType = {
    state,
    checkAuthStatus,
    logout,
    refreshTokens,
    switchUser,
    clearUser,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};