import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Login from '../pages/Login';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { authState, login } = useAuth();

  console.log('🛡️ ProtectedRoute: Current auth state:', {
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    user: authState.user,
    requireAdmin
  });

  // 加载中状态
  if (authState.isLoading) {
    console.log('⏳ ProtectedRoute: Still loading, showing loading screen');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking login status...</p>
        </div>
      </div>
    );
  }

  // 未认证，显示登录页面
  if (!authState.isAuthenticated) {
    return <Login onLoginSuccess={(user) => {
      // Login组件已经保存了token和用户信息，直接更新AuthContext状态
      console.log('🎉 ProtectedRoute: Login successful, user:', user);
      const token = localStorage.getItem('access_token');
      if (token) {
        login(user, token);
      }
    }} />;
  }

  // 需要管理员权限但用户不是管理员
  if (requireAdmin && authState.user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="mt-2 text-sm text-gray-600">You don't have permission to access this page</p>
          <div className="mt-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
              Current role: {authState.user?.role}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 已认证且有权限，显示受保护的内容
  return <>{children}</>;
}