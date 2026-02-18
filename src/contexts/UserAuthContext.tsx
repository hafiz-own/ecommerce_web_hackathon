import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, AuthTokens, getCurrentUser, loginWithGoogle, logout, handleGoogleCallback, isAuthenticated } from '@/lib/api/auth';

interface UserAuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType | null>(null);

export const useUserAuth = () => {
  const ctx = useContext(UserAuthContext);
  if (!ctx) throw new Error("useUserAuth must be used within UserAuthProvider");
  return ctx;
};

export const UserAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('[UserAuth] Error refreshing user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check for OAuth callback on mount
    if (window.location.search.includes('token=')) {
      handleGoogleCallback().then((authResponse) => {
        if (authResponse) {
          setUser(authResponse.user);
        }
        setIsLoading(false);
      }).catch((error) => {
        console.error('[UserAuth] OAuth callback error:', error);
        setIsLoading(false);
      });
    } else {
      // Regular auth check
      refreshUser();
    }
  }, []);

  const signOut = () => {
    logout();
    setUser(null);
  };

  return (
    <UserAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginWithGoogle,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
};
