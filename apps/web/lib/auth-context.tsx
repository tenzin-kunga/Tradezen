"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout, refreshToken, setAccessToken } from "./api";

type User = {
  id: string;
  email: string;
  username: string;
  created_at: string;
  initial_capital: number;
  default_lot_size: number;
  timezone: string;
  theme: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Try to restore session on mount
  useEffect(() => {
    (async () => {
      try {
        const storedToken = window.localStorage.getItem("tradezen_access_token");
        if (storedToken) {
          setAccessToken(storedToken);
        }

        const refreshed = await refreshToken();
        if (refreshed) {
          const me = await getMe();
          setUser(me);
        }
      } catch {
        window.localStorage.removeItem("tradezen_access_token");
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (identifier: string, password: string, rememberMe: boolean = true) => {
    const res = await apiLogin({ identifier, password, remember_me: rememberMe });
    setUser(res.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const res = await apiRegister({ email, username, password });
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
