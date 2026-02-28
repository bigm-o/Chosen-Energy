import { ApiResponse } from '@/types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  email: string;
  fullName: string;
  role: string;
}

export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<ApiResponse<LoginResponse>> => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  register: async (data: any): Promise<ApiResponse<LoginResponse>> => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  refreshToken: async (data: RefreshTokenRequest): Promise<ApiResponse<RefreshTokenResponse>> => {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  validateToken: async (token: string): Promise<ApiResponse<{ valid: boolean }>> => {
    const response = await fetch(`${API_URL}/auth/validate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    return response.json();
  },
};
