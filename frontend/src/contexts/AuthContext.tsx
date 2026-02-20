import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { login as loginApi, logout as logoutApi, isAuthenticated, getVendorProfile, VendorProfile } from '@/lib/auth';
import SplashScreen from '@/components/SplashScreen';

interface AuthContextType {
  user: VendorProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      if (isAuthenticated()) {
        const profile = await getVendorProfile();
        setUser(profile);
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await loginApi({ email, password });
      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    logoutApi();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {isLoading ? <SplashScreen message="Preparing your account" subMessage="Checking your Vendora session" /> : children}
    </AuthContext.Provider>
  );
};
