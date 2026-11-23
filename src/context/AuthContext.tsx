import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
  avatar?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const savedUser = localStorage.getItem('devilmotion_user');
      if (savedUser) return JSON.parse(savedUser);
    } catch {}
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Validate active JWT session on mount
  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('devilmotion_token');
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    api
      .getCurrentUser()
      .then(currentUser => {
        if (!active) return;
        if (currentUser) {
          setUser(currentUser);
          try {
            localStorage.setItem('devilmotion_user', JSON.stringify(currentUser));
          } catch {}
        } else {
          // Token expired or invalid
          setUser(null);
          localStorage.removeItem('devilmotion_token');
          localStorage.removeItem('devilmotion_user');
        }
      })
      .catch(() => {
        if (!active) return;
        // Keep cached user if offline
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    if (res?.user) {
      setUser(res.user);
      try {
        localStorage.setItem('devilmotion_user', JSON.stringify(res.user));
      } catch {}
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register(name, email, password);
    if (res?.user) {
      setUser(res.user);
      try {
        localStorage.setItem('devilmotion_user', JSON.stringify(res.user));
      } catch {}
    }
  }, []);

  const logout = useCallback(() => {
    api.logoutUser();
    setUser(null);
    try {
      localStorage.removeItem('devilmotion_user');
    } catch {}
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'ADMIN',
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
