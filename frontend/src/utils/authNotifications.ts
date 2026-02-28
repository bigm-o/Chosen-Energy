import { toast } from 'sonner';

export const authNotifications = {
  tokenRefreshed: () => {
    toast.success('Session refreshed automatically', {
      duration: 2000,
    });
  },
  
  tokenExpired: () => {
    toast.error('Session expired. Please login again.', {
      duration: 4000,
    });
  },
  
  tokenExpiringSoon: () => {
    toast.warning('Your session will expire soon', {
      duration: 3000,
    });
  },
  
  loginSuccess: () => {
    toast.success('Login successful!', {
      duration: 2000,
    });
  },
  
  logoutSuccess: () => {
    toast.info('Logged out successfully', {
      duration: 2000,
    });
  },
};