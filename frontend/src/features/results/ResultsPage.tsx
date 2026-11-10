import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { ClubBadge } from '../../components/sports/badges';
import { api } from '../../services/api';
import { USE_MOCKS, mockResults } from '../../services/mock';
import type { FixtureClash, FixtureRound } from '../../types';
import { ApiError } from '../../types';
import { useTournaments } from '../fixtures/useFixture';
import { usePageMeta } from '../../lib/usePageTitle';

function mockResultRounds(): FixtureRound[] {
  const matches: FixtureClash[] = mockResults.map((m) => ({
    id: m.id,
    roundId: 'fecha-7',
    roundLabel: m.roundLabel,
    tournamentId: m.tournamentName,
    home: m.home,
    away: m.away,
    isSoler: [m.home.shortName, m.home.name, m.away.shortName, m.away.name].some((v) =>
      v?.toLowerCase().includes('soler'),
    ),
    categories: [
      {
        id: `${m.id}-c1`,
        categoryId: m.categoryName,
        categoryName: m.categoryName,
        kickoff: m.kickoff,
        venue: m.venue,
        status: 'FINALIZADO',
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        broadcastId: null,
      },
    ],
  }));
  if (!matches.length) return [];
  return [{ id: 'fecha-7', label: matches[0].roundLabel || 'Fecha 7', order: 7, published: true, matches }];
}

function isUnavailable(err: unknown): boolean {
  return (
    err instanceof ApiError &&
    (err.kind === 'unavailable' || err.kind === 'network' || err.kind === 'timeout' || (err.status ?? 0) >= 500)
  );
}

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
  usePageMeta({
    title: 'Resultados — CSD Soler',
    description: 'Marcadores oficiales del Club Soler cargados en Ligas Deportivas. Nunca mostramos resultados inventados.',
    path: '/resultados',
  });
  const tournamentsQ = useTournaments();
  const tournaments = tournamentsQ.data ?? [];
  const [params, setParams] = useSearchParams();
  const torneoParam = params.get('torneo') ?? '';
  const fechaParam = params.get('fecha') ?? '';
  const activeSlug = torneoParam || tournaments[0]?.slug || '';
  const setTorneoParam = (slug: string) => {
    const next = new URLSearchParams(params);
    if (slug) next.set('torneo', slug);
    else next.delete('torneo');
    next.delete('fecha');
    setParams(next, { replace: false });
  };
  const setFechaParam = (id: string) => {
    const next = new URLSearchParams(params);
    if (id) next.set('fecha', id);
    else next.delete('fecha');
    setParams(next, { replace: false });
  };

  const roundsQ = useQuery({
    queryKey: ['result-rounds', activeSlug],
    queryFn: async () => {
      if (USE_MOCKS) {
        await new Promise((r) => setTimeout(r, 300));
        return mockResultRounds();
      }
      return api.get<FixtureRound[]>(`/results/rounds?torneo=${encodeURIComponent(activeSlug)}`);
    },
    enabled: !!activeSlug,
    retry: 1,
  });
  const rounds = roundsQ.data ?? [];
  const effectiveId = fechaParam || rounds[rounds.length - 1]?.id || '';
  const index = Math.max(0, rounds.findIndex((r) => r.id === effectiveId));
  const round = rounds[index];

  const goRound = (dir: 1 | -1) => {
    if (!rounds.length) return;
    const next = rounds[Math.min(rounds.length - 1, Math.max(0, index + dir))];
    if (next) setFechaParam(next.id);
  };

  return (
    <Container className="py-10">
      <SectionHeading
        as="h1"
        title="Resultados"
        description="Marcadores oficiales cargados en Ligas Deportivas. Nunca mostramos resultados inventados."
      />
      <div className="flex flex-wrap gap-2">
        {tournaments.map((t) => (
          <button
            key={t.id}
            onClick={() => setTorneoParam(t.slug)}
            aria-pressed={t.slug === activeSlug}
            className={`rounded-card border px-4 py-2.5 text-sm font-bold ${t.slug === activeSlug ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-white'}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {roundsQ.isPending || tournamentsQ.isPending ? (
        <div className="mt-6 space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : roundsQ.isError ? (
        <div className="mt-6">
          {isUnavailable(roundsQ.error) ? (
            <EmptyState
              title="Resultados temporalmente no disponibles"
              hint="Estamos integrando los resultados oficiales de Ligas Deportivas (Etapa 3). El fixture publicado sigue disponible."
              action={
                <span className="flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" onClick={() => roundsQ.refetch()}>Reintentar</Button>
                  <Link to="/fixture"><Button variant="secondary">Ver fixture</Button></Link>
                </span>
              }
            />
          ) : (
            <ErrorState onRetry={() => roundsQ.refetch()} />
          )}
        </div>
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
                onChange={(e) => setFechaParam(e.target.value)}
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
