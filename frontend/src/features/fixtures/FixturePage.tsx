import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Link2, Check } from 'lucide-react';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { ClubBadge } from '../../components/sports/badges';
import { formatKickoff } from '../../lib/format';
import { cn } from '../../lib/utils';
import type { FixtureClash, FixtureRound } from '../../types';
import { ApiError } from '../../types';
import { useCategories, useFixtureFilters, useFixtureRounds, useRoundSelection, useTournaments } from './useFixture';
import { usePageTitle } from '../../lib/usePageTitle';

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: document.title });
        return;
      }
      throw new Error('no-share');
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* portapapeles no disponible */
      }
    }
  };
  return (
    <Button variant="secondary" size="sm" onClick={share}>
      {copied ? <Check size={15} /> : <Link2 size={15} />}
      {copied ? '¡Enlace copiado!' : 'Compartir fecha'}
    </Button>
  );
}

function ClashCard({ clash }: { clash: FixtureClash }) {
  const isSoler = (c: { shortName: string; name: string }) =>
    [c.shortName, c.name].some((v) => v?.toLowerCase().includes('soler'));
  const homeSoler = isSoler(clash.home);
  const awaySoler = isSoler(clash.away);
  const firstKickoff = clash.categories.find((c) => c.kickoff)?.kickoff ?? null;
  const venue = clash.categories.find((c) => c.venue)?.venue ?? null;
  return (
    <article
      className={cn(
        'rounded-card border bg-white px-4 py-3 shadow-soft',
        clash.isSoler ? 'border border-l-4 border-line border-l-primary' : 'border-line',
      )}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <span className="flex flex-1 items-center justify-between gap-2">
          <ClubBadge club={clash.home} strong={homeSoler} />
          <span className="font-display text-lg font-bold text-ink-muted">VS</span>
          <ClubBadge club={clash.away} strong={awaySoler} />
        </span>
        <span className="hidden shrink-0 text-[13px] text-ink-muted sm:block">
          {formatKickoff(firstKickoff)}{venue ? ` · ${venue}` : ''}
        </span>
      </div>
    </article>
  );
}

export function FixturePage() {
  usePageTitle('Fixture — CSD Soler');
  const [filters, setFilters] = useFixtureFilters();
  const tournamentsQ = useTournaments();
  const tournaments = tournamentsQ.data ?? [];
  // Default: primer torneo CON fechas publicadas (no el primero alfabético,
  // que puede estar vacío). El filtro explícito en URL siempre prevalece.
  const defaultSlug =
    tournaments.find((t) => (t._count?.matchdays ?? 0) > 0)?.slug ?? tournaments[0]?.slug ?? '';
  const activeSlug = filters.torneo || defaultSlug;
  const activeTournament = tournaments.find((t) => t.slug === activeSlug);
  const categoriesQ = useCategories(activeTournament?.id ?? '');
  const roundsQ = useFixtureRounds(activeSlug, filters.categoria);
  const rounds: FixtureRound[] | undefined = roundsQ.data;
  // Por defecto: primera fecha no jugada (no toda FINALIZADO); si están todas jugadas, la última.
  const firstUnplayed = (rounds ?? []).find((r) =>
    r.matches.length === 0 ||
    r.matches.some((m) => m.categories.some((c) => (c.status as string) !== 'FINALIZADO')),
  );
  const { round, index } = useRoundSelection(rounds, filters.fecha || firstUnplayed?.id || '');
  const withData = tournaments.filter((t) => t.slug !== activeSlug && (t._count?.matchdays ?? 0) > 0);

  const goRound = (dir: 1 | -1) => {
    if (!rounds?.length) return;
    const next = rounds[Math.min(rounds.length - 1, Math.max(0, index + dir))];
    if (next) setFilters({ fecha: next.id });
  };

  return (
    <Container className="py-10">
      <SectionHeading
        title="Fixture"
        description="Todas las fechas y cruces del torneo, no solo los partidos de Soler. Los horarios y sedes pueden variar por categoría."
        link={<ShareButton />}
      />

      {/* Filtros sincronizados con URL */}
      <Card className="flex flex-wrap gap-3 p-4">
        <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm font-semibold">
          Torneo
          <select
            value={activeSlug}
            onChange={(e) => setFilters({ torneo: e.target.value })}
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
            value={filters.categoria}
            onChange={(e) => setFilters({ categoria: e.target.value })}
            className="h-11 rounded-card border border-line bg-white px-3 font-normal"
          >
            <option value="">Todas</option>
            {(categoriesQ.data ?? []).map((c) => (
              <option key={c.id} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </label>
      </Card>

      {roundsQ.isPending || tournamentsQ.isPending ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : roundsQ.isError ? (
        <div className="mt-6">
          {roundsQ.error instanceof ApiError && (roundsQ.error.kind === 'unavailable' || roundsQ.error.kind === 'network') ? (
            <EmptyState title="Fixture temporalmente no disponible" hint="No se pudo conectar con el servidor. El resto del sitio sigue funcionando." action={<Button variant="secondary" onClick={() => roundsQ.refetch()}>Reintentar</Button>} />
          ) : (
            <ErrorState onRetry={() => roundsQ.refetch()} />
          )}
        </div>
      ) : !rounds?.length ? (
        <div className="mt-6">
          <EmptyState
            title={`Sin fixture publicado en ${activeTournament?.name ?? 'este torneo'}`}
            hint={
              withData.length > 0
                ? 'Este torneo todavía no tiene fechas publicadas. Probá con otro:'
                : 'Cuando el administrador publique una fecha, aparecerá acá.'
            }
            action={
              withData.length > 0 ? (
                <span className="flex flex-wrap justify-center gap-2">
                  {withData.map((t) => (
                    <Button key={t.id} variant="secondary" size="sm" onClick={() => setFilters({ torneo: t.slug })}>
                      {t.name}
                    </Button>
                  ))}
                </span>
              ) : undefined
            }
          />
        </div>
      ) : (
        <>
          {/* Navegación por jornadas */}
          <div className="mt-6 flex items-center justify-between gap-2">
            <Button variant="secondary" size="sm" onClick={() => goRound(-1)} disabled={index <= 0} aria-label="Fecha anterior">
              <ArrowLeft size={16} /> Anterior
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="font-display text-2xl font-extrabold uppercase" aria-live="polite">{round?.label}</span>
              {round && round.matches.length > 0 &&
                round.matches.every((m) => m.categories.length > 0 && m.categories.every((c) => c.status === 'FINALIZADO')) && (
                  <span className="rounded-full bg-pitch px-2.5 py-1 text-xs font-bold text-white">Jugada</span>
                )}
              <select
                value={round?.id ?? ''}
                onChange={(e) => setFilters({ fecha: e.target.value })}
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
            {round?.matches.map((m) => <ClashCard key={m.id} clash={m} />)}
            {(round?.libre ?? []).length > 0 && (
              <p className="rounded-card border border-dashed border-line bg-white px-4 py-3 text-center text-sm text-ink-muted">
                Libre: <span className="font-semibold text-ink">{(round?.libre ?? []).map((c) => c.shortName).join(', ')}</span>
              </p>
            )}
          </div>
          <p className="mt-6 text-center text-sm text-ink-muted">
            <Link to="/resultados" className="font-semibold text-primary hover:underline">Ver resultados oficiales</Link>
            {' · '}
            <Link to="/posiciones" className="font-semibold text-primary hover:underline">Ver posiciones</Link>
          </p>
        </>
      )}
    </Container>
  );
}
