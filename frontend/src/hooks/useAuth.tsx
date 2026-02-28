import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User } from '@/types';
import { authApi, LoginRequest } from '@/services/authService';
import { authNotifications } from '@/utils/authNotifications';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to decode JWT and check expiration
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true;
  }
}

// Helper function to get token expiration time
function getTokenExpiration(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000; // Convert to milliseconds
  } catch {
    return null;
  }
}

// Helper function to check if token will expire soon (within 5 minutes)
function isTokenExpiringSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    const fiveMinutesFromNow = currentTime + (5 * 60); // 5 minutes in seconds
    return payload.exp < fiveMinutesFromNow;
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [hasShownExpiryWarning, setHasShownExpiryWarning] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setHasShownExpiryWarning(false);
    authNotifications.logoutSuccess();
  }, []);

  // Function to refresh the token
  const refreshAuthToken = useCallback(async () => {
    const storedToken = localStorage.getItem('token');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    
    if (!storedToken || !storedRefreshToken) {
      authNotifications.tokenExpired();
      logout();
      return false;
    }

    try {
      const response = await authApi.refreshToken({
        token: storedToken,
        refreshToken: storedRefreshToken
      });

      if (response.success && response.data) {
        const newToken = response.data.token;
        const newRefreshToken = response.data.refreshToken;
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('refreshToken', newRefreshToken);
        setToken(newToken);
        setRefreshToken(newRefreshToken);
        setHasShownExpiryWarning(false);
        
        authNotifications.tokenRefreshed();
        return true;
      } else {
        authNotifications.tokenExpired();
        logout();
        return false;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      authNotifications.tokenExpired();
      logout();
      return false;
    }
  }, [logout]);

  // Check token validity on mount and set up automatic refresh
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const userData = localStorage.getItem('user');
    
    if (storedToken && storedRefreshToken && userData) {
      if (isTokenExpired(storedToken)) {
        // Try to refresh the token
        refreshAuthToken();
        return;
      }
      
      setToken(storedToken);
      setRefreshToken(storedRefreshToken);
      setUser(JSON.parse(userData));
      
      // Set up automatic logout when token expires (with buffer)
      const expiration = getTokenExpiration(storedToken);
      if (expiration) {
        const timeUntilExpiry = expiration - Date.now();
        if (timeUntilExpiry > 0) {
          const timeoutId = setTimeout(() => {
            authNotifications.tokenExpired();
            logout();
          }, timeUntilExpiry);
          
          return () => clearTimeout(timeoutId);
        }
      }
    }
  }, [logout, refreshAuthToken]);

  // Periodic token validation and refresh (every 2 minutes)
  useEffect(() => {
    if (!token) return;
    
    const interval = setInterval(async () => {
      if (isTokenExpired(token)) {
        authNotifications.tokenExpired();
        logout();
      } else if (isTokenExpiringSoon(token) && !hasShownExpiryWarning) {
        setHasShownExpiryWarning(true);
        authNotifications.tokenExpiringSoon();
        // Try to refresh token if it's expiring soon
        await refreshAuthToken();
      }
    }, 120000); // Check every 2 minutes
    
    return () => clearInterval(interval);
  }, [token, logout, refreshAuthToken, hasShownExpiryWarning]);

  const login = async (data: LoginRequest) => {
    const response = await authApi.login(data);
    if (response.success && response.data) {
      const userData: User = {
        id: '',
        email: response.data.email,
        fullName: response.data.fullName,
        role: response.data.role as any,
        isActive: true,
      };
      const newToken = response.data.token;
      const newRefreshToken = response.data.refreshToken;
      
      // Validate token before storing
      if (isTokenExpired(newToken)) {
        throw new Error('Received expired token');
      }
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(newToken);
      setRefreshToken(newRefreshToken);
      setUser(userData);
      setHasShownExpiryWarning(false);
      
      authNotifications.loginSuccess();
      
      // Set up automatic logout for new token
      const expiration = getTokenExpiration(newToken);
      if (expiration) {
        const timeUntilExpiry = expiration - Date.now();
        if (timeUntilExpiry > 0) {
          setTimeout(() => {
            authNotifications.tokenExpired();
            logout();
          }, timeUntilExpiry);
        }
      }
    } else {
      throw new Error(response.message || 'Login failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Export helper functions for use in other parts of the app
export { isTokenExpired, getTokenExpiration };
