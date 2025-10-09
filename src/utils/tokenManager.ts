/**
 * Token Manager - 处理访问令牌的自动刷新和管理
 */
import { apiClient, authApi } from './api';

interface TokenInfo {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
}

class TokenManager {
  private refreshPromise: Promise<string> | null = null;
  private isRefreshing = false;

  /**
   * 获取当前访问令牌
   */
  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  /**
   * 获取刷新令牌
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  /**
   * 保存令牌信息
   */
  saveTokens(tokenInfo: TokenInfo): void {
    localStorage.setItem('access_token', tokenInfo.access_token);
    localStorage.setItem('refresh_token', tokenInfo.refresh_token);

    if (tokenInfo.expires_at) {
      localStorage.setItem('token_expires_at', tokenInfo.expires_at.toString());
    }
  }

  /**
   * 清除所有令牌
   */
  clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('token_expires_at');
  }

  /**
   * 检查访问令牌是否即将过期（提前1小时）
   */
  isTokenExpiring(): boolean {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return false;

    const expirationTime = parseInt(expiresAt);
    const currentTime = Date.now() / 1000;
    const oneHour = 60 * 60; // 1 hour in seconds

    return (expirationTime - currentTime) < oneHour;
  }

  /**
   * 检查token是否已经过期
   */
  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;

    const expirationTime = parseInt(expiresAt);
    const currentTime = Date.now() / 1000;

    return currentTime >= expirationTime;
  }

  /**
   * 刷新访问令牌
   */
  async refreshAccessToken(): Promise<string> {
    // 防止多个并发刷新请求
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performRefresh(refreshToken);

    try {
      const newAccessToken = await this.refreshPromise;
      return newAccessToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * 执行实际的令牌刷新
   */
  private async _performRefresh(refreshToken: string): Promise<string> {
    try {
      const response = await apiClient.post(authApi.refresh(), {
        refresh_token: refreshToken
      });

      const { access_token, refresh_token: new_refresh_token, expires_in, user_info } = response.data;

      // 计算过期时间
      const expiresAt = Math.floor(Date.now() / 1000) + expires_in;

      // 保存新的令牌
      this.saveTokens({
        access_token,
        refresh_token: new_refresh_token,
        expires_at: expiresAt
      });

      console.log('Token refreshed successfully');
      return access_token;
    } catch (error: any) {
      console.error('Token refresh failed:', error);

      // 刷新失败，清除所有令牌并重定向到登录页
      this.clearTokens();

      // 触发重新登录
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }

      throw new Error('Token refresh failed, please login again');
    }
  }

  /**
   * 预防性令牌检查（检查令牌是否过期）
   */
  async ensureValidToken(): Promise<string | null> {
    const accessToken = this.getAccessToken();

    if (!accessToken) {
      console.log('🚫 TokenManager: No access token available');
      return null;
    }

    // 检查token是否已过期
    if (this.isTokenExpired()) {
      console.log('⏰ TokenManager: Token expired, clearing tokens');
      this.clearTokens();
      return null;
    }

    console.log('✅ TokenManager: Using existing valid token');
    return accessToken;
  }
}

// 导出单例实例
export const tokenManager = new TokenManager();

/**
 * HTTP 拦截器 - 自动处理令牌过期
 */
export const setupTokenInterceptors = () => {
  // 请求拦截器：确保令牌有效
  apiClient.interceptors.request.use(
    async (config) => {
      console.log('🚀 TokenManager: Request interceptor triggered for:', config.url);
      const token = await tokenManager.ensureValidToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('✅ TokenManager: Added Authorization header');
      } else {
        console.log('⚠️ TokenManager: No valid token available');
      }

      // 对于GET请求，移除Content-Type头以避免CORS预检
      if (config.method === 'get') {
        delete config.headers['Content-Type'];
        console.log('🔧 TokenManager: Removed Content-Type for GET request');
      }

      return config;
    },
    (error) => {
      console.error('❌ TokenManager: Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // 响应拦截器：处理401错误
  apiClient.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error) => {
      const originalRequest = error.config;

      // 处理401错误且不是刷新令牌请求
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // 尝试刷新令牌
          const newToken = await tokenManager.refreshAccessToken();

          // 重新设置请求头并重试原始请求
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch (refreshError) {
          // 刷新失败，用户需要重新登录
          console.error('Auto token refresh failed:', refreshError);
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );
};