import { isTokenExpired } from '@/hooks/useAuth';
import { authApi } from '@/services/authService';

const BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiRequest(url: string, options: RequestInit = {}) {
  let token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  // Normalize URL - handle cases where url is relative but BASE_URL is set
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;

  // If we have a BASE_URL (from Railway env), use it with /api prefix
  // Otherwise use relative URL (local dev proxy)
  const fullUrl = url.startsWith('http')
    ? url
    : (BASE_URL ? `${BASE_URL}/api${normalizedUrl}` : normalizedUrl);

  // Check token expiration and try to refresh if needed
  if (token && isTokenExpired(token) && refreshToken) {
    try {
      const refreshResponse = await authApi.refreshToken({ token, refreshToken });
      if (refreshResponse.success && refreshResponse.data) {
        token = refreshResponse.data.token;
        localStorage.setItem('token', token);
        localStorage.setItem('refreshToken', refreshResponse.data.refreshToken);
      } else {
        // Refresh failed, logout
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/';
        throw new Error('Session expired. Please login again.');
      }
    } catch (error) {
      // Refresh failed, logout
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/';
      throw new Error('Session expired. Please login again.');
    }
  } else if (token && isTokenExpired(token)) {
    // No refresh token available, logout
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Session expired. Please login again.');
  }

  const headers = {
    ...options.headers,
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  const response = await fetch(fullUrl, { ...options, headers });

  if (response.status === 401) {
    // Try to refresh token one more time if we get 401
    if (token && refreshToken) {
      try {
        const refreshResponse = await authApi.refreshToken({ token, refreshToken });
        if (refreshResponse.success && refreshResponse.data) {
          const newToken = refreshResponse.data.token;
          localStorage.setItem('token', newToken);
          localStorage.setItem('refreshToken', refreshResponse.data.refreshToken);

          // Retry the original request with new token
          const retryHeaders = {
            ...options.headers,
            'Authorization': `Bearer ${newToken}`,
          };
          return fetch(fullUrl, { ...options, headers: retryHeaders });
        }
      } catch (error) {
        console.error('Token refresh failed on 401:', error);
      }
    }

    // If refresh failed or no refresh token, logout
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/';
    throw new Error('Session expired. Please login again.');
  }

  return response;
}
