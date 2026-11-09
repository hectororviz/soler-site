import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { USE_MOCKS, mockLive, mockResults, mockUpcoming } from '../../services/mock';
import type { Broadcast, MatchSummary, UpcomingClash } from '../../types';
import { ApiError } from '../../types';

export type DataState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'empty' }
  | { status: 'unavailable'; message: string }
  | { status: 'error'; message: string; retry: () => void };

function isUnavailable(err: unknown): err is ApiError {
  return err instanceof ApiError && (err.kind === 'unavailable' || err.kind === 'network' || err.kind === 'timeout');
}

function toState<T>(query: { isPending: boolean; isError: boolean; error: unknown; data: T | undefined; refetch: () => void }): DataState<T> {
  if (query.isPending) return { status: 'loading' };
  if (query.isError) {
    const err: unknown = query.error;
    if (isUnavailable(err)) {
      return { status: 'unavailable', message: err.message };
    }
    return { status: 'error', message: err instanceof Error ? err.message : 'Error desconocido.', retry: () => query.refetch() };
  }
  const d = query.data as T | undefined;
  if (!d || (Array.isArray(d) && d.length === 0)) return { status: 'empty' };
  return { status: 'ready', data: d };
}

async function fetchOrMock<T>(path: string, mock: T): Promise<T> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 350));
    return mock;
  }
  return api.get<T>(path);
}

export function useUpcoming() {
  const q = useQuery({
    queryKey: ['upcoming'],
    queryFn: () => fetchOrMock<UpcomingClash[]>('/fixtures/upcoming?limit=6', mockUpcoming as unknown as UpcomingClash[]),
    retry: 1,
  });
  return toState(q);
}

export function useResults(torneo?: string) {
  const q = useQuery({
    queryKey: ['results-recent', torneo ?? 'all'],
    queryFn: () => fetchOrMock<MatchSummary[]>(
      torneo ? `/results?torneo=${encodeURIComponent(torneo)}&limit=20` : '/results?limit=6',
      mockResults,
    ),
    retry: 1,
  });
  return toState(q);
}

export function useLiveBroadcast() {
  const q = useQuery({
    queryKey: ['broadcast-live'],
    queryFn: () => fetchOrMock<Broadcast | null>('/broadcasts/live', mockLive),
    retry: 1,
    refetchInterval: 30000,
  });
  if (q.isPending) return { status: 'loading' } as const;
  if (q.isError) {
    const err: unknown = q.error;
    if (err instanceof ApiError && (err as ApiError).kind !== 'http')
      return { status: 'unavailable' as const, message: (err as ApiError).message };
    return { status: 'error' as const, message: 'No se pudo verificar la transmisión.', retry: () => q.refetch() };
  }
  if (!q.data || q.data.status !== 'EN_VIVO') return { status: 'none' as const };
  return { status: 'live' as const, data: q.data };
}
