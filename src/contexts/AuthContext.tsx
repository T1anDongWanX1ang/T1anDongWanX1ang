import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usersApi, apiClient } from '../utils/api';

interface User {
  id: string;
  wallet_address: string;
  display_name?: string;
  role: 'admin' | 'user' | 'moderator';
  status: 'active' | 'inactive' | 'banned';
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
}

interface AuthContextType {
  authState: AuthState;
  login: (user: User, token: string) => void;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true
  });

  // 检查认证状态
  const checkAuth = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('access_token');

      if (!token) {
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false
        });
        return false;
      }

      // 验证token并获取用户信息
      const response = await apiClient.get(usersApi.profile());
      const user = response.data;

      setAuthState({
        isAuthenticated: true,
        user: user,
        isLoading: false
      });
      return true;
    } catch (error: any) {
      console.error('Authentication check failed:', error);

      // 清除无效token
      localStorage.removeItem('access_token');

      setAuthState({
        isAuthenticated: false,
        user: null,
        isLoading: false
      });
      return false;
    }
  };

  // 登录
  const login = (user: User, token: string) => {
    localStorage.setItem('access_token', token);

    setAuthState({
      isAuthenticated: true,
      user: user,
      isLoading: false
    });
  };

  // 登出
  const logout = () => {
    localStorage.removeItem('access_token');

    setAuthState({
      isAuthenticated: false,
      user: null,
      isLoading: false
    });
  };

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuth();
  }, []);

  const value: AuthContextType = {
    authState,
    login,
    logout,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// 自定义hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}