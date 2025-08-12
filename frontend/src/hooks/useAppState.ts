import { useAppContext } from '../context/AppContext';

export const useAppState = () => {
  const { state, checkAuthStatus, logout, refreshTokens, switchUser, clearUser } = useAppContext();
  
  return {
    // Auth state
    authUser: state.auth.user,
    isAuthenticated: !!state.auth.user,
    hasValidTokens: state.auth.user?.hasGoogleTokens || false,
    authLoading: state.auth.loading,
    authError: state.auth.error,
    
    // User state
    currentUser: state.user.currentUser,
    userLoading: state.user.loading,
    userError: state.user.error,
    
    // Actions
    checkAuthStatus,
    logout,
    refreshTokens,
    switchUser,
    clearUser,
  };
};

export const useAuth = () => {
  const { state, logout, refreshTokens, checkAuthStatus } = useAppContext();
  
  return {
    user: state.auth.user,
    loading: state.auth.loading,
    error: state.auth.error,
    initialized: state.appInitialized,
    isAuthenticated: !!state.auth.user,
    hasValidTokens: state.auth.user?.hasGoogleTokens || false,
    logout,
    refreshTokens,
    checkAuthStatus
  };
};

export const useUser = () => {
  const { state, switchUser, clearUser } = useAppContext();
  
  return {
    currentUser: state.user.currentUser,
    loading: state.user.loading,
    error: state.user.error,
    switchUser,
    clearUser,
    isAuthenticated: !!state.user.currentUser
  };
};