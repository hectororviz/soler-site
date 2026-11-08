import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, getAdminToken, setAdminToken } from '../../services/api';

interface AdminAuth {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AdminAuth | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const navigate = useNavigate();

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ accessToken: string }>('/admin/auth/login', { username, password });
    setAdminToken(res.accessToken);
    setToken(res.accessToken);
  }, []);

  const logout = useCallback(() => {
    setAdminToken(null);
    setToken(null);
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  return <Ctx.Provider value={{ token, login, logout }}>{children}</Ctx.Provider>;
}

export function useAdminAuth(): AdminAuth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth fuera del provider');
  return ctx;
}
