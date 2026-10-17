import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, loginApi, registerApi, getCurrentUserApi } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (userData: {
    name: string;
    email: string;
    password: string;
    role: 'Admin' | 'Manager' | 'Operator';
    department?: string;
  }) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  hasRole: (roles: ('Admin' | 'Manager' | 'Operator')[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('mining_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load session on startup if token exists
  useEffect(() => {
    const verifyExistingSession = async () => {
      const storedToken = localStorage.getItem('mining_auth_token');
      const storedUser = localStorage.getItem('mining_user_profile');

      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
        // Verify token with backend
        const res = await getCurrentUserApi();
        if (res.success && res.user) {
          setUser(res.user);
          localStorage.setItem('mining_user_profile', JSON.stringify(res.user));
        }
      } catch (err) {
        console.warn('Stored session invalid or expired:', err);
        // If expired or invalid token
        localStorage.removeItem('mining_auth_token');
        localStorage.removeItem('mining_user_profile');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    verifyExistingSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await loginApi(email, password);
      if (res.success && res.token && res.user) {
        localStorage.setItem('mining_auth_token', res.token);
        localStorage.setItem('mining_user_profile', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        return { success: true, message: res.message || 'Login successful.' };
      }
      return { success: false, message: res.message || 'Login failed.' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unable to connect to login server.';
      return { success: false, message: msg };
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    role: 'Admin' | 'Manager' | 'Operator';
    department?: string;
  }) => {
    try {
      const res = await registerApi(userData);
      if (res.success && res.token && res.user) {
        localStorage.setItem('mining_auth_token', res.token);
        localStorage.setItem('mining_user_profile', JSON.stringify(res.user));
        setToken(res.token);
        setUser(res.user);
        return { success: true, message: res.message || 'Registration successful.' };
      }
      return { success: false, message: res.message || 'Registration failed.' };
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Unable to register user.';
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('mining_auth_token');
    localStorage.removeItem('mining_user_profile');
    setToken(null);
    setUser(null);
  };

  const hasRole = (roles: ('Admin' | 'Manager' | 'Operator')[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        hasRole,
      }}
    >
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
