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
    console.log('🔍 AuthContext: Starting authentication check...');
    try {
      const token = localStorage.getItem('access_token');
      const tokenExpires = localStorage.getItem('token_expires_at');
      const refreshToken = localStorage.getItem('refresh_token');

      console.log('🔍 AuthContext: Token info:', {
        hasToken: !!token,
        hasRefreshToken: !!refreshToken,
        tokenExpires: tokenExpires,
        currentTime: Math.floor(Date.now() / 1000)
      });

      if (!token) {
        console.log('❌ AuthContext: No access token found');
        setAuthState({
          isAuthenticated: false,
          user: null,
          isLoading: false
        });
        return false;
      }

      // 检查token是否已过期（提前检查避免无效请求）
      if (tokenExpires) {
        const expirationTime = parseInt(tokenExpires);
        const currentTime = Math.floor(Date.now() / 1000);
        if (currentTime >= expirationTime) {
          console.log('⏰ AuthContext: Token expired, clearing auth state');
          // Token已过期，直接清除状态而不是尝试请求
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('token_expires_at');

          setAuthState({
            isAuthenticated: false,
            user: null,
            isLoading: false
          });
          return false;
        }
      }

      console.log('📡 AuthContext: Making API call to verify token...');
      // 验证token并获取用户信息 - 添加超时限制
      const response = await Promise.race([
        apiClient.get(usersApi.profile()),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Authentication timeout')), 5000)
        )
      ]) as any;
      const user = response.data;

      console.log('✅ AuthContext: Authentication successful, user:', user);

      setAuthState({
        isAuthenticated: true,
        user: user,
        isLoading: false
      });
      return true;
    } catch (error: any) {
      console.error('❌ AuthContext: Authentication check failed:', error);
      console.error('❌ AuthContext: Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });

      // Clear invalid tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expires_at');

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

  // Logout
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

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