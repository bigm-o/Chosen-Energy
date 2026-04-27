import { isTokenExpired } from '@/hooks/useAuth';
import { authApi } from '@/services/authService';

const RAW_BASE_URL = import.meta.env.VITE_API_URL || '';
const BASE_URL = RAW_BASE_URL && !RAW_BASE_URL.startsWith('http') ? `https://${RAW_BASE_URL}` : RAW_BASE_URL;

export function getFileUrl(path: string | null | undefined) {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const serverBase = BASE_URL || 'http://localhost:5100';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${serverBase}${normalizedPath}`;
}

export async function apiRequest(url: string, options: RequestInit = {}) {
  let token = localStorage.getItem('token');
  const refreshToken = localStorage.getItem('refreshToken');

  // Normalize URL - handle cases where url is relative but BASE_URL is set
  let normalizedUrl = url.startsWith('/') ? url : `/${url}`;

  // If we have a BASE_URL (from Railway env), use it with /api prefix
  // Ensure we don't double up on /api if the url already has it
  let fullUrl;
  if (url.startsWith('http')) {
    fullUrl = url;
  } else if (BASE_URL) {
    // If the path already has /api, don't add it again
    const path = normalizedUrl.startsWith('/api/') ? normalizedUrl.substring(4) : normalizedUrl;
    fullUrl = `${BASE_URL}/api${path}`;
  } else {
    fullUrl = normalizedUrl;
  }

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

  const headers: any = {
    ...options.headers,
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  // Automatically set Content-Type to application/json if body is a string
  // and no Content-Type is explicitly provided.
  // DO NOT set it for FormData as fetch needs to set the boundary.
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

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
