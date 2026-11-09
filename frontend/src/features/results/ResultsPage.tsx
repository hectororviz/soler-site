import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { MatchCard } from '../../components/sports/MatchCard';
import { api } from '../../services/api';
import type { MatchSummary } from '../../types';
import { useCategories, useTournaments } from '../fixtures/useFixture';
import { usePageTitle } from '../../lib/usePageTitle';

export function ResultadosPage() {
  usePageTitle('Resultados — CSD Soler');
  const [torneo, setTorneo] = useState('');
  const [categoria, setCategoria] = useState('');
  const tournamentsQ = useTournaments();
  const tournaments = tournamentsQ.data ?? [];
  const activeSlug = torneo || tournaments[0]?.slug || '';
  const activeTournament = tournaments.find((t) => t.slug === activeSlug);
  const categoriesQ = useCategories(activeTournament?.id ?? '');

  const q = useQuery({
    queryKey: ['results', activeSlug, categoria],
    queryFn: () => {
      const p = new URLSearchParams();
      if (activeSlug) p.set('torneo', activeSlug);
      if (categoria) p.set('categoria', categoria);
      p.set('limit', '50');
      return api.get<MatchSummary[]>(`/results?${p.toString()}`);
    },
    enabled: !!activeSlug,
    retry: 1,
  });
  const rows = q.data ?? [];

  return (
    <Container className="py-10">
      <SectionHeading
        title="Resultados"
        description="Marcadores oficiales cargados en Ligas Deportivas. Nunca mostramos resultados inventados."
      />
      <Card className="flex flex-wrap gap-3 p-4">
        <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm font-semibold">
          Torneo
          <select
            value={activeSlug}
            onChange={(e) => { setTorneo(e.target.value); setCategoria(''); }}
            className="h-11 rounded-card border border-line bg-white px-3 font-normal"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.slug}>{t.name}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm font-semibold">
          Categoría
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="h-11 rounded-card border border-line bg-white px-3 font-normal"
          >
            <option value="">Todas</option>
            {(categoriesQ.data ?? []).map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
      </Card>

      {q.isPending || tournamentsQ.isPending ? (
        <div className="mt-6 space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-44" />)}</div>
      ) : q.isError ? (
        <div className="mt-6"><ErrorState onRetry={() => q.refetch()} /></div>
      ) : !rows.length ? (
        <div className="mt-6">
          <EmptyState title="Sin resultados" hint="Todavía no hay partidos finalizados con este filtro." action={<Link to="/fixture"><Button variant="secondary">Ver fixture</Button></Link>} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {rows.map((m) => <MatchCard key={m.id} match={m} />)}
        </div>
      )}
      <p className="mt-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"><ArrowLeft size={15} /> Volver al inicio</Link>
      </p>
    </Container>
  );
}
