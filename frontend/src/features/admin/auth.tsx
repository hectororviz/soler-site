import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ADMIN_UNAUTHORIZED_EVENT, api, getAdminToken, setAdminToken } from '../../services/api';

interface AdminAuth {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  sessionExpired: boolean;
}

const Ctx = createContext<AdminAuth | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAdminToken());
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ accessToken: string }>('/admin/auth/login', { username, password });
    setAdminToken(res.accessToken);
    setToken(res.accessToken);
    setSessionExpired(false);
  }, []);

  const logout = useCallback(() => {
    setAdminToken(null);
    setToken(null);
    setSessionExpired(false);
    navigate('/admin/login', { replace: true });
  }, [navigate]);

  // El back responde 401 cuando el JWT venció (12h). Como el layout solo
  // chequea `if (!token)`, un token vencido dejaba entrar y las listas
  // quedaban vacías. Acá se fuerza el logout global y el aviso.
  useEffect(() => {
    const onUnauthorized = () => {
      setAdminToken(null);
      setToken((current) => {
        if (current !== null) setSessionExpired(true);
        return null;
      });
      navigate('/admin/login', { replace: true });
    };
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [navigate]);

  return <Ctx.Provider value={{ token, login, logout, sessionExpired }}>{children}</Ctx.Provider>;
}

export function useAdminAuth(): AdminAuth {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAdminAuth fuera del provider');
  return ctx;
}
