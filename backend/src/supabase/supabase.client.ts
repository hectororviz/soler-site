import { Injectable, ServiceUnavailableException } from '@nestjs/common';

const BASE_URL = process.env.SUPABASE_URL ?? 'https://yvwazzwwlpkfhyefnqfo.supabase.co';
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl2d2F6end3bHBrZmh5ZWZucWZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MTE0NjIsImV4cCI6MjA5NDA4NzQ2Mn0.3Eg9XRcZr6y98vG4rI2c0Sv-W6gQdoadzeDu7JgHRiQ';

const PAGE = 1000;
const TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { exp: number; data: any }>();

async function rest<T>(path: string): Promise<T> {
  const key = `GET ${path}`;
  const hit = cache.get(key);
  if (hit && hit.exp > Date.now()) return hit.data as T;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/rest/v1/${path}`, {
      headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
    });
  } catch {
    throw new ServiceUnavailableException('Ligas Deportivas no disponible.');
  }
  if (!res.ok) throw new ServiceUnavailableException('Ligas Deportivas no disponible.');
  const data = (await res.json()) as T;
  cache.set(key, { exp: Date.now() + TTL_MS, data });
  return data;
}

/** Pagina completa (PostgREST limita a 1000 filas por defecto). */
export async function fetchAll<T>(resource: string, params: string): Promise<T[]> {
  const out: T[] = [];
  let offset = 0;
  for (;;) {
    const page = await rest<T[]>(`${resource}?${params}&limit=${PAGE}&offset=${offset}`);
    out.push(...page);
    if (page.length < PAGE) return out;
    offset += PAGE;
  }
}
