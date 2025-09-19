import { currentApiConfig, API_ENDPOINTS } from '../config/api';
import apiClient from './axios';

// 构建完整的API URL
export function buildApiUrl(endpoint: string, params?: Record<string, string>): string {
  let url = endpoint;

  // 替换路径参数
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`{${key}}`, value);
    });
  }

  // 添加基础URL
  return `${currentApiConfig.baseUrl}${url}`;
}

// 导出配置好的axios实例
export { apiClient };

// 认证相关API
export const authApi = {
  challenge: () => buildApiUrl(API_ENDPOINTS.auth.challenge),
  verify: () => buildApiUrl(API_ENDPOINTS.auth.verify),
  logout: () => buildApiUrl(API_ENDPOINTS.auth.logout),
};

// 用户管理相关API
export const usersApi = {
  profile: () => buildApiUrl(API_ENDPOINTS.users.profile),
  list: () => buildApiUrl(API_ENDPOINTS.users.list),
  create: () => buildApiUrl(API_ENDPOINTS.users.create),
  update: (userId: string) => buildApiUrl(API_ENDPOINTS.users.update, { userId }),
  delete: (userId: string) => buildApiUrl(API_ENDPOINTS.users.delete, { userId }),
};