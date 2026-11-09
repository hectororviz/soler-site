import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { StandingsTable } from '../../components/sports/StandingsTable';
import { api } from '../../services/api';
import type { StandingRow } from '../../types';
import { useCategories, useTournaments } from '../fixtures/useFixture';
import { usePageTitle } from '../../lib/usePageTitle';

export function PosicionesPage() {
  usePageTitle('Posiciones — CSD Soler');
  const [torneo, setTorneo] = useState('');
  const [categoria, setCategoria] = useState('general');
  const tournamentsQ = useTournaments();
  const tournaments = tournamentsQ.data ?? [];
  const activeSlug = torneo || tournaments[0]?.slug || '';
  const activeTournament = tournaments.find((t) => t.slug === activeSlug);
  const categoriesQ = useCategories(activeTournament?.id ?? '');

  const q = useQuery({
    queryKey: ['standings', activeSlug, categoria],
    queryFn: () => {
      const p = new URLSearchParams();
      if (activeSlug) p.set('torneo', activeSlug);
      p.set('categoria', categoria || 'general');
      return api.get<StandingRow[]>(`/standings?${p.toString()}`);
    },
    enabled: !!activeSlug,
    retry: 1,
  });
  const rows = q.data ?? [];

  return (
    <Container className="py-10">
      <SectionHeading
        title="Posiciones"
        description="Tablas oficiales calculadas desde Ligas Deportivas. Soler resaltado en negrita."
      />
      <Card className="flex flex-wrap gap-3 p-4">
        <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm font-semibold">
          Torneo
          <select
            value={activeSlug}
            onChange={(e) => { setTorneo(e.target.value); setCategoria('general'); }}
            className="h-11 rounded-card border border-line bg-white px-3 font-normal"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </label>
      </Card>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={() => setCategoria('general')}
          className={`rounded-card border px-4 py-2.5 text-sm font-bold ${categoria === 'general' ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white'}`}
        >
          General
        </button>
        {(categoriesQ.data ?? []).map((c) => (
          <button
            key={c.id}
            onClick={() => setCategoria(c.slug)}
            className={`rounded-card border px-4 py-2.5 text-sm font-bold ${categoria === c.slug ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white'}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {q.isPending || tournamentsQ.isPending ? (
        <div className="mt-6 space-y-3">{[0].map((i) => <Skeleton key={i} className="h-64" />)}</div>
      ) : q.isError ? (
        <div className="mt-6"><ErrorState onRetry={() => q.refetch()} /></div>
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
