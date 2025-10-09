import axios from 'axios';

// 创建axios实例 - 直接访问后端API
const apiClient = axios.create({
  baseURL: 'http://127.0.0.1:8002', // 直接访问后端，OPTIONS请求已修复
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Note: HTTP interceptors are set up in tokenManager.ts via setupTokenInterceptors()
// This provides advanced token management with automatic refresh capabilities

export default apiClient;