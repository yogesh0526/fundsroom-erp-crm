import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  quickLogin: (role: Role) => Promise<void>;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_CREDENTIALS: Record<Role, { email: string; pass: string }> = {
  ADMIN: { email: 'admin@erp.com', pass: 'Admin@123' },
  SALES: { email: 'sales@erp.com', pass: 'Sales@123' },
  WAREHOUSE: { email: 'warehouse@erp.com', pass: 'Warehouse@123' },
  ACCOUNTS: { email: 'accounts@erp.com', pass: 'Accounts@123' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('erp_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('erp_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('erp_token');
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.data.data);
          localStorage.setItem('erp_user', JSON.stringify(res.data.data));
        } catch {
          localStorage.removeItem('erp_token');
          localStorage.removeItem('erp_user');
          setUser(null);
          setToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login({ email, password: pass });
    const { token: receivedToken, user: receivedUser } = res.data.data;
    localStorage.setItem('erp_token', receivedToken);
    localStorage.setItem('erp_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
  };

  const quickLogin = async (role: Role) => {
    const creds = ROLE_CREDENTIALS[role];
    await login(creds.email, creds.pass);
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const hasRole = (...roles: Role[]) => {
    if (!user) return false;
    if (user.role === 'ADMIN') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        quickLogin,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
