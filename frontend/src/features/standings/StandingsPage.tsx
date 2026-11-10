import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { StandingsTable } from '../../components/sports/StandingsTable';
import { api } from '../../services/api';
import { USE_MOCKS, mockStandings } from '../../services/mock';
import type { StandingRow } from '../../types';
import { ApiError } from '../../types';
import { useCategories, useTournaments } from '../fixtures/useFixture';
import { usePageMeta } from '../../lib/usePageTitle';

export function PosicionesPage() {
  usePageMeta({
    title: 'Posiciones — CSD Soler',
    description: 'Tablas oficiales por categoría con Soler resaltado. Calculadas desde Ligas Deportivas.',
    path: '/posiciones',
  });
  const [params, setParams] = useSearchParams();
  const torneoParam = params.get('torneo') ?? '';
  const categoriaParam = params.get('categoria') ?? 'general';
  const tournamentsQ = useTournaments();
  const tournaments = tournamentsQ.data ?? [];
  const activeSlug = torneoParam || tournaments[0]?.slug || '';
  const categoria = categoriaParam || 'general';
  const setTorneoCat = (slug: string, cat: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('torneo', slug);
    else next.delete('torneo');
    if (cat && cat !== 'general') next.set('categoria', cat);
    else next.delete('categoria');
    setParams(next, { replace: false });
  };
  const activeTournament = tournaments.find((t) => t.slug === activeSlug);
  const categoriesQ = useCategories(activeTournament?.id ?? '');

  const q = useQuery({
    queryKey: ['standings', activeSlug, categoria],
    queryFn: async () => {
      if (USE_MOCKS) {
        await new Promise((r) => setTimeout(r, 300));
        return mockStandings;
      }
      const p = new URLSearchParams();
      if (activeSlug) p.set('torneo', activeSlug);
      p.set('categoria', categoria || 'general');
      return api.get<StandingRow[]>(`/standings?${p.toString()}`);
    },
    enabled: !!activeSlug,
    retry: 1,
  });
  const rows = q.data ?? [];
  const unavailable =
    q.error instanceof ApiError &&
    (q.error.kind === 'unavailable' || q.error.kind === 'network' || q.error.kind === 'timeout' || (q.error.status ?? 0) >= 500);

  return (
    <Container className="py-10">
      <SectionHeading
        as="h1"
        title="Posiciones"
        description="Tablas oficiales calculadas desde Ligas Deportivas. Soler resaltado en negrita."
      />
      <Card className="flex flex-wrap gap-3 p-4">
        <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm font-semibold">
          Torneo
          <select
            value={activeSlug}
            onChange={(e) => setTorneoCat(e.target.value, 'general')}
            aria-label="Elegir torneo"
            className="h-11 rounded-card border border-line bg-white px-3 font-normal"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </label>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Elegir categoría">
        <button
          onClick={() => setTorneoCat(activeSlug, 'general')}
          aria-pressed={categoria === 'general'}
          className={`rounded-card border px-4 py-2.5 text-sm font-bold ${categoria === 'general' ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white'}`}
        >
          General
        </button>
        {(categoriesQ.data ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => setTorneoCat(activeSlug, c.slug)}
            aria-pressed={categoria === c.slug}
            className={`rounded-card border px-4 py-2.5 text-sm font-bold ${categoria === c.slug ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {q.isPending || tournamentsQ.isPending ? (
        <div className="mt-6 space-y-3">{[0].map((i) => <Skeleton key={i} className="h-64" />)}</div>
      ) : q.isError ? (
        <div className="mt-6">
          {unavailable ? (
            <EmptyState
              title="Posiciones temporalmente no disponibles"
              hint="Estamos integrando las tablas oficiales de Ligas Deportivas (Etapa 3). El fixture publicado sigue disponible."
              action={
                <span className="flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" onClick={() => q.refetch()}>Reintentar</Button>
                  <Link to="/fixture"><Button variant="secondary">Ver fixture</Button></Link>
                </span>
              }
            />
          ) : (
            <ErrorState onRetry={() => q.refetch()} />
          )}
        </div>
      ) : !rows.length ? (
        <div className="mt-6">
          <EmptyState title="Sin tabla" hint="Todavía no hay partidos finalizados en esta categoría." action={<Link to="/fixture"><Button variant="secondary">Ver fixture</Button></Link>} />
        </div>
      ) : (
        <div className="mt-6"><StandingsTable rows={rows} /></div>
      )}
      <p className="mt-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"><ArrowLeft size={15} /> Volver al inicio</Link>
      </p>
    </Container>
  );
}
