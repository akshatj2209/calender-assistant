import { useAppContext } from '../context/AppContext';

export const useAppState = () => {
  const { state, actions } = useAppContext();
  
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
    
    // Dashboard state
    dashboardLoading: state.dashboard.loading,
    dashboardError: state.dashboard.error,
    
    // Actions
    checkAuthStatus: actions.checkAuthStatus,
    logout: actions.logout,
    refreshTokens: actions.refreshTokens,
    switchUser: actions.switchUser,
    clearUser: actions.clearUser,
    setDashboardLoading: actions.setDashboardLoading,
    setDashboardError: actions.setDashboardError,
    clearErrors: actions.clearErrors,
  };
};

export const useAuth = () => {
  const { state, actions } = useAppContext();
  
  return {
    user: state.auth.user,
    loading: state.auth.loading,
    error: state.auth.error,
    initialized: state.appInitialized,
    isAuthenticated: !!state.auth.user,
    hasValidTokens: state.auth.user?.hasGoogleTokens || false,
    logout: actions.logout,
    refreshTokens: actions.refreshTokens,
    checkAuthStatus: actions.checkAuthStatus
  };
};

export const useUser = () => {
  const { state, actions } = useAppContext();
  
  return {
    currentUser: state.user.currentUser,
    loading: state.user.loading,
    error: state.user.error,
    switchUser: actions.switchUser,
    clearUser: actions.clearUser,
    isAuthenticated: !!state.user.currentUser
  };
};