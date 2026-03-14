export type UserRole = 'MD' | 'Admin' | 'GarageManager' | 'Driver';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  themePreference?: 'light' | 'dark';
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}
