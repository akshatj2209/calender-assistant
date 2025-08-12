import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
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
  dashboard: {
    loading: boolean;
    error: string | null;
  };
  appInitialized: boolean;
}

type AppAction =
  | { type: 'AUTH_LOADING'; payload: boolean }
  | { type: 'AUTH_SUCCESS'; payload: AuthUser | null }
  | { type: 'AUTH_ERROR'; payload: string | null }
  | { type: 'USER_LOADING'; payload: boolean }
  | { type: 'USER_SUCCESS'; payload: User | null }
  | { type: 'USER_ERROR'; payload: string | null }
  | { type: 'DASHBOARD_LOADING'; payload: boolean }
  | { type: 'DASHBOARD_ERROR'; payload: string | null }
  | { type: 'APP_INITIALIZED' }
  | { type: 'CLEAR_ALL_ERRORS' };

interface AppContextType {
  state: AppState;
  actions: {
    checkAuthStatus: () => Promise<void>;
    logout: () => Promise<void>;
    refreshTokens: () => Promise<boolean>;
    switchUser: (email: string, name: string) => Promise<User | null>;
    clearUser: () => void;
    setDashboardLoading: (loading: boolean) => void;
    setDashboardError: (error: string | null) => void;
    clearErrors: () => void;
  };
}

const initialState: AppState = {
  auth: {
    user: null,
    loading: true,
    error: null,
  },
  user: {
    currentUser: null,
    loading: true,
    error: null,
  },
  dashboard: {
    loading: false,
    error: null,
  },
  appInitialized: false,
};

const appReducer = (state: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        auth: { ...state.auth, loading: action.payload }
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        auth: { ...state.auth, user: action.payload, loading: false, error: null }
      };
    case 'AUTH_ERROR':
      return {
        ...state,
        auth: { ...state.auth, error: action.payload, loading: false }
      };
    case 'USER_LOADING':
      return {
        ...state,
        user: { ...state.user, loading: action.payload }
      };
    case 'USER_SUCCESS':
      return {
        ...state,
        user: { ...state.user, currentUser: action.payload, loading: false, error: null }
      };
    case 'USER_ERROR':
      return {
        ...state,
        user: { ...state.user, error: action.payload, loading: false }
      };
    case 'DASHBOARD_LOADING':
      return {
        ...state,
        dashboard: { ...state.dashboard, loading: action.payload }
      };
    case 'DASHBOARD_ERROR':
      return {
        ...state,
        dashboard: { ...state.dashboard, error: action.payload }
      };
    case 'APP_INITIALIZED':
      return {
        ...state,
        appInitialized: true
      };
    case 'CLEAR_ALL_ERRORS':
      return {
        ...state,
        auth: { ...state.auth, error: null },
        user: { ...state.user, error: null },
        dashboard: { ...state.dashboard, error: null },
      };
    default:
      return state;
  }
};

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
  const [state, dispatch] = useReducer(appReducer, initialState);
  const api = useApi();

  const checkAuthStatus = async () => {
    try {
      dispatch({ type: 'AUTH_LOADING', payload: true });
      dispatch({ type: 'AUTH_ERROR', payload: null });

      const userId = localStorage.getItem('gmail_assistant_user_id');
      
      if (!userId) {
        dispatch({ type: 'AUTH_SUCCESS', payload: null });
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
        dispatch({ type: 'AUTH_SUCCESS', payload: user });
      } else {
        dispatch({ type: 'AUTH_SUCCESS', payload: null });
        localStorage.removeItem('gmail_assistant_user_id');
        localStorage.removeItem('gmail_assistant_user_email');
      }
    } catch (err: any) {
      if (err.status === 401 || err.status === 404) {
        localStorage.removeItem('gmail_assistant_user_id');
        localStorage.removeItem('gmail_assistant_user_email');
        dispatch({ type: 'AUTH_SUCCESS', payload: null });
      } else {
        dispatch({ type: 'AUTH_ERROR', payload: err.message || 'Failed to check authentication status' });
      }
    }
  };

  const logout = async () => {
    try {
      if (state.auth.user) {
        await api.post('/auth/logout', { userId: state.auth.user.id });
      }
    } catch (err) {
      console.warn('Logout API call failed:', err);
    } finally {
      localStorage.removeItem('gmail_assistant_user_id');
      localStorage.removeItem('gmail_assistant_user_email');
      
      // Clear auth and user state, keep app initialized for immediate redirect
      dispatch({ type: 'AUTH_SUCCESS', payload: null });
      dispatch({ type: 'USER_SUCCESS', payload: null });
    }
  };

  const refreshTokens = async (): Promise<boolean> => {
    if (!state.auth.user) return false;

    try {
      const response = await api.post('/auth/refresh', { userId: state.auth.user.id });
      return (response.data as any)?.success || false;
    } catch (err) {
      return false;
    }
  };

  const initializeUser = async () => {
    try {
      dispatch({ type: 'USER_LOADING', payload: true });
      dispatch({ type: 'USER_ERROR', payload: null });

      const savedUserId = localStorage.getItem('gmail_assistant_user_id');
      const savedUserEmail = localStorage.getItem('gmail_assistant_user_email');
      
      if (savedUserId) {
        try {
          const response = await api.users.getById(savedUserId);
          const user = (response.data as any).user;
          dispatch({ type: 'USER_SUCCESS', payload: user });
          
          localStorage.setItem('gmail_assistant_user_id', user.id);
          localStorage.setItem('gmail_assistant_user_email', user.email);
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
      dispatch({ type: 'USER_SUCCESS', payload: user });
      localStorage.setItem('gmail_assistant_user_id', user.id);
      localStorage.setItem('gmail_assistant_user_email', user.email);

    } catch (err: any) {
      dispatch({ type: 'USER_ERROR', payload: err.message || 'Failed to initialize user' });
    }
  };

  const switchUser = async (email: string, name: string): Promise<User | null> => {
    try {
      dispatch({ type: 'USER_LOADING', payload: true });
      dispatch({ type: 'USER_ERROR', payload: null });

      try {
        const response = await api.users.getByEmail(email);
        const user = (response.data as any).user;
        dispatch({ type: 'USER_SUCCESS', payload: user });
        localStorage.setItem('gmail_assistant_user_id', user.id);
        return user;
      } catch {
        const response = await api.users.create({ email, name });
        const user = (response.data as any).user;
        dispatch({ type: 'USER_SUCCESS', payload: user });
        localStorage.setItem('gmail_assistant_user_id', user.id);
        return user;
      }
    } catch (err: any) {
      dispatch({ type: 'USER_ERROR', payload: err.message || 'Failed to switch user' });
      return null;
    }
  };

  const clearUser = () => {
    dispatch({ type: 'USER_SUCCESS', payload: null });
    localStorage.removeItem('gmail_assistant_user_id');
  };

  const setDashboardLoading = (loading: boolean) => {
    dispatch({ type: 'DASHBOARD_LOADING', payload: loading });
  };

  const setDashboardError = (error: string | null) => {
    dispatch({ type: 'DASHBOARD_ERROR', payload: error });
  };

  const clearErrors = () => {
    dispatch({ type: 'CLEAR_ALL_ERRORS' });
  };

  useEffect(() => {
    const initializeApp = async () => {
      const savedUserId = localStorage.getItem('gmail_assistant_user_id');
      
      try {
        if (savedUserId) {
          // When we have saved user, wait for both user and auth to complete
          await initializeUser();
          await checkAuthStatus();
          // Only mark as initialized after BOTH complete
          dispatch({ type: 'APP_INITIALIZED' });
        } else {
          // No saved user - mark as initialized immediately
          dispatch({ type: 'AUTH_SUCCESS', payload: null });
          dispatch({ type: 'USER_SUCCESS', payload: null });
          dispatch({ type: 'APP_INITIALIZED' });
        }
      } catch (error) {
        // Handle any initialization errors
        dispatch({ type: 'AUTH_SUCCESS', payload: null });
        dispatch({ type: 'USER_SUCCESS', payload: null });
        dispatch({ type: 'APP_INITIALIZED' });
      }
    };
    
    initializeApp();
  }, []);

  const contextValue: AppContextType = {
    state,
    actions: {
      checkAuthStatus,
      logout,
      refreshTokens,
      switchUser,
      clearUser,
      setDashboardLoading,
      setDashboardError,
      clearErrors,
    },
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};