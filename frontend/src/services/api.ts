import { ApiError } from '../types';

/**
 * Cliente HTTP centralizado. Todo el frontend consume la API propia.
 * Nunca llamar a Supabase de Ligas Deportivas desde el navegador.
 *
 * Base configurable: VITE_API_URL (ej. https://api.csdsoler.com.ar/api/v1).
 * En dev sin backend, el cliente lanza ApiError(kind=unavailable) y las
 * pantallas muestran estado "integración no disponible", no datos inventados.
 */

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
const TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 8000);
const ADMIN_TOKEN_KEY = 'csd-admin-token';

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null) {
  try {
    if (token) localStorage.setItem(ADMIN_TOKEN_KEY, token);
    else localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
}

interface RequestOptions {
  signal?: AbortSignal;
  admin?: boolean;
  body?: unknown;
  form?: boolean;
}

async function request<T>(path: string, method: string, opts: RequestOptions = {}): Promise<T> {
  if (!BASE) {
    throw new ApiError('API no configurada (VITE_API_URL).', 'unavailable');
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const externalSignal = opts.signal;
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  try {
    const headers: Record<string, string> = {};
    if (!opts.form) headers['Content-Type'] = 'application/json';
    if (opts.admin) {
      const token = getAdminToken();
      if (!token) throw new ApiError('Sesión administrativa requerida.', 'http', 401);
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      signal: controller.signal,
      body: opts.form ? (opts.body as FormData) : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    if (res.status === 204) return undefined as T;
    const text = await res.text();
    const data = text ? (JSON.parse(text) as T) : (undefined as T);
    if (!res.ok) {
      const msg = (data as { message?: string })?.message ?? `Error ${res.status}.`;
      if (res.status === 401) throw new ApiError(msg || 'No autorizado.', 'http', 401);
      if (res.status === 403) throw new ApiError(msg || 'Operación restringida.', 'http', 403);
      if (res.status === 404) throw new ApiError(msg || 'Recurso no encontrado.', 'http', 404);
      if (res.status >= 500) throw new ApiError('Servicio temporalmente no disponible.', 'unavailable', res.status);
      throw new ApiError(msg, 'http', res.status);
    }
    return data;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('Tiempo de espera agotado. Reintentá.', 'timeout');
    }
    throw new ApiError('Sin conexión o servicio no disponible.', 'network');
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>(path, 'GET', opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, 'POST', { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>(path, 'PATCH', { ...opts, body }),
  del: <T>(path: string, opts?: RequestOptions) => request<T>(path, 'DELETE', opts),
  upload: <T>(path: string, file: File, field = 'file', opts?: RequestOptions) => {
    const form = new FormData();
    form.append(field, file);
    return request<T>(path, 'POST', { ...opts, body: form, form: true });
  },
};

export const apiConfig = {
  base: BASE || '(no configurada)',
  timeoutMs: TIMEOUT_MS,
};

/** Origen del backend (sin /api/v1), para resolver archivos como /files/crests/x.jpg. */
export const apiOrigin = BASE.replace(/\/api\/v\d+$/, '') || '';

export function resolveCrest(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/api/v1/files/') && apiOrigin) return `${apiOrigin}${path}`;
  if (path.startsWith('/files/') && apiOrigin) return `${apiOrigin}${path}`;
  return path;
}

/** Acepta payloads con `crestUrl` (nuevo) o `crestPath` (histórico de la DB). */
export function clubCrest(raw: { crestUrl?: string | null; crestPath?: string | null } | null | undefined): string | null {
  if (!raw) return null;
  return resolveCrest(raw.crestUrl ?? raw.crestPath ?? null);
}
