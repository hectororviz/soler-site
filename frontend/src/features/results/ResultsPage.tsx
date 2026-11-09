import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { ClubBadge } from '../../components/sports/badges';
import { api } from '../../services/api';
import type { FixtureClash, FixtureRound } from '../../types';
import { useTournaments } from '../fixtures/useFixture';
import { usePageTitle } from '../../lib/usePageTitle';

const isSoler = (c: { shortName: string; name: string }) =>
  [c.shortName, c.name].some((v) => v?.toLowerCase().includes('soler'));

function ResultClashCard({ clash }: { clash: FixtureClash }) {
  const homeSoler = isSoler(clash.home);
  const awaySoler = isSoler(clash.away);
  return (
    <article className="rounded-card border border-line bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <span className="flex flex-1 items-center justify-between gap-2">
          <ClubBadge club={clash.home} strong={homeSoler} />
          <span className="font-display text-lg font-bold text-ink-muted">VS</span>
          <ClubBadge club={clash.away} strong={awaySoler} />
        </span>
      </div>
      <ul className="mt-3 divide-y divide-line border-t border-line">
        {clash.categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <span className="w-16 shrink-0 text-center font-display text-2xl font-extrabold tabular-nums">{c.homeScore ?? '\u2013'}</span>
            <span className="flex-1 text-center text-sm font-semibold">{c.categoryName}</span>
            <span className="w-16 shrink-0 text-center font-display text-2xl font-extrabold tabular-nums">{c.awayScore ?? '\u2013'}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function ResultadosPage() {
  usePageTitle('Resultados — CSD Soler');
  const tournamentsQ = useTournaments();
  const tournaments = tournamentsQ.data ?? [];
  const [torneo, setTorneo] = useState('');
  const activeSlug = torneo || tournaments[0]?.slug || '';

  const roundsQ = useQuery({
    queryKey: ['result-rounds', activeSlug],
    queryFn: () => api.get<FixtureRound[]>(`/results/rounds?torneo=${encodeURIComponent(activeSlug)}`),
    enabled: !!activeSlug,
    retry: 1,
  });
  const rounds = roundsQ.data ?? [];
  const [fecha, setFecha] = useState('');
  const effectiveId = fecha || rounds[rounds.length - 1]?.id || '';
  const index = Math.max(0, rounds.findIndex((r) => r.id === effectiveId));
  const round = rounds[index];

  const goRound = (dir: 1 | -1) => {
    if (!rounds.length) return;
    const next = rounds[Math.min(rounds.length - 1, Math.max(0, index + dir))];
    if (next) setFecha(next.id);
  };

  return (
    <Container className="py-10">
      <SectionHeading
        title="Resultados"
        description="Marcadores oficiales cargados en Ligas Deportivas. Nunca mostramos resultados inventados."
      />
      <div className="flex flex-wrap gap-2">
        {tournaments.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTorneo(t.slug); setFecha(''); }}
            className={`rounded-card border px-4 py-2.5 text-sm font-bold ${t.slug === activeSlug ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {roundsQ.isPending || tournamentsQ.isPending ? (
        <div className="mt-6 space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : roundsQ.isError ? (
        <div className="mt-6"><ErrorState onRetry={() => roundsQ.refetch()} /></div>
      ) : !rounds.length ? (
        <div className="mt-6">
          <EmptyState title="Sin resultados" hint="Todavía no hay partidos finalizados en este torneo." action={<Link to="/fixture"><Button variant="secondary">Ver fixture</Button></Link>} />
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button variant="secondary" size="sm" onClick={() => goRound(-1)} disabled={index <= 0} aria-label="Fecha anterior">
              <ArrowLeft size={16} /> Anterior
            </Button>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-extrabold uppercase" aria-live="polite">{round?.label}</span>
              <select
                value={round?.id ?? ''}
                onChange={(e) => setFecha(e.target.value)}
                aria-label="Saltar a otra fecha"
                className="h-11 rounded-card border border-line bg-white px-3 text-sm font-semibold"
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            <Button variant="secondary" size="sm" onClick={() => goRound(1)} disabled={index >= rounds.length - 1} aria-label="Fecha siguiente">
              Siguiente <ArrowRight size={16} />
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            {round?.matches.map((m) => <ResultClashCard key={m.id} clash={m} />)}
          </div>
        </>
      )}
      <p className="mt-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"><ArrowLeft size={15} /> Volver al inicio</Link>
      </p>
    </Container>
  );
}
