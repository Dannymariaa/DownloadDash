import React, { createContext, useState, useContext, useEffect } from 'react';
import downloadDash from '@/api/downloadDashClient';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState({ authenticated: false, plan: 'free', entitlements: { adFree: false } });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      // For local hosting, always authenticated
      setAppPublicSettings({ id: 'local', public_settings: {} });
      await checkUserAuth();
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentAccount = await downloadDash.auth.me();
      setAccount({
        authenticated: Boolean(currentAccount.authenticated),
        plan: currentAccount.plan || 'free',
        entitlements: { adFree: Boolean(currentAccount.entitlements?.adFree) },
        subscription: currentAccount.subscription || null,
        ...currentAccount,
      });
      setUser(currentAccount.authenticated ? currentAccount : null);
      setIsAuthenticated(Boolean(currentAccount.authenticated));
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setUser(null);
      setAccount({ authenticated: false, plan: 'free', entitlements: { adFree: false } });
    }
  };

  const logout = async (shouldRedirect = true) => {
    await downloadDash.auth.logout().catch(() => {});
    setUser(null);
    setIsAuthenticated(false);
    setAccount({ authenticated: false, plan: 'free', entitlements: { adFree: false } });
    
    if (shouldRedirect) {
      window.location.href = '/';
    } else {
      await checkUserAuth();
    }
  };

  const navigateToLogin = () => {
    downloadDash.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      account,
      entitlements: account.entitlements || { adFree: false },
      plan: account.plan || 'free',
      isPro: account.plan === 'pro' && Boolean(account.entitlements?.adFree),
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
