import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { USE_MOCKS, mockFixture } from '../../services/mock';
import type { Category, FixtureRound, Tournament } from '../../types';

export interface FixtureFilters {
  torneo: string;
  categoria: string;
  fecha: string;
}

export function useFixtureFilters(): [FixtureFilters, (patch: Partial<FixtureFilters>) => void] {
  const [params, setParams] = useSearchParams();
  const filters: FixtureFilters = {
    torneo: params.get('torneo') ?? '',
    categoria: params.get('categoria') ?? '',
    fecha: params.get('fecha') ?? '',
  };
  const set = (patch: Partial<FixtureFilters>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (patch.torneo !== undefined && patch.categoria === undefined) {
      // al cambiar de torneo se resetea categoría y fecha si no se indican
      if (patch.categoria === undefined) next.delete('categoria');
      next.delete('fecha');
    }
    setParams(next, { replace: false });
  };
  return [filters, set];
}

async function fetchOr<T>(path: string, fallback: T): Promise<T> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 300));
    return fallback;
  }
  return api.get<T>(path);
}

export function useTournaments() {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: () =>
      fetchOr<Tournament[]>('/tournaments', [
        { id: 'juv-dom', slug: 'juveniles-domingos', name: 'Juveniles Domingos', seasonId: 's', seasonLabel: '2026', _count: { matchdays: 1 } },
        { id: 'juv-sab', slug: 'juveniles-sabados', name: 'Juveniles Sábados', seasonId: 's', seasonLabel: '2026', _count: { matchdays: 0 } },
        { id: 'fem', slug: 'futbol-femenino', name: 'Fútbol Femenino', seasonId: 's', seasonLabel: '2026', _count: { matchdays: 0 } },
      ]),
    retry: 1,
  });
}

export function useCategories(tournamentId: string) {
  return useQuery({
    queryKey: ['categories', tournamentId],
    queryFn: async () => {
      if (!tournamentId) return [] as Category[];
      if (USE_MOCKS) {
        const cats = new Map<string, Category>();
        for (const m of mockFixture) {
          for (const c of m.categories) {
            if (!cats.has(c.categoryId)) {
              cats.set(c.categoryId, { id: c.categoryId, tournamentId, name: c.categoryName, slug: c.categoryId });
            }
          }
        }
        return [...cats.values()];
      }
      return api.get<Category[]>(`/categories?tournament=${encodeURIComponent(tournamentId)}`);
    },
    enabled: !!tournamentId,
    retry: 1,
  });
}

export function useFixtureRounds(torneoSlug: string, categoria?: string) {
  return useQuery({
    queryKey: ['fixture', torneoSlug, categoria ?? ''],
    queryFn: () => {
      if (USE_MOCKS) {
        const rounds: FixtureRound[] = [
          {
            id: 'fecha-8',
            label: 'Fecha 8',
            order: 8,
            published: true,
            matches: (mockFixture as unknown as FixtureRound['matches']),
          },
        ];
        return Promise.resolve(rounds);
      }
      const q = new URLSearchParams();
      if (categoria) q.set('categoria', categoria);
      const suffix = q.toString() ? `?${q}` : '';
      return api.get<FixtureRound[]>(`/tournaments/${encodeURIComponent(torneoSlug)}/fixture${suffix}`);
    },
    enabled: !!torneoSlug,
    retry: 1,
  });
}

export function useRoundSelection(rounds: FixtureRound[] | undefined, fecha: string) {
  return useMemo(() => {
    if (!rounds?.length) return { round: undefined as FixtureRound | undefined, index: -1 };
    const index = Math.max(0, rounds.findIndex((r) => r.id === fecha));
    return { round: rounds[index], index };
  }, [rounds, fecha]);
}
