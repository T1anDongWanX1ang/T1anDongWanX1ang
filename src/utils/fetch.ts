// 带认证的fetch wrapper
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('access_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // 如果是401错误，清除token并重定向到登录页
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    window.location.href = '/';
  }

  return response;
}