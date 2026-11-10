import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Trophy } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { Container } from '../../components/layout/Container';
import { BroadcastCard } from '../../components/sports/BroadcastCard';
import { ClubBadge } from '../../components/sports/badges';
import { clubCrest } from '../../services/api';
import { formatKickoff } from '../../lib/format';
import { cn } from '../../lib/utils';
import type { Club, UpcomingClash } from '../../types';
import { useLiveBroadcast, useResults, useUpcoming } from './useHomeData';
import { useCategories, useTournaments } from '../fixtures/useFixture';
import { useQuery } from '@tanstack/react-query';
import { api, resolveCrest } from '../../services/api';
import { MiniMd } from '../../lib/miniMd';

import { usePageMeta } from '../../lib/usePageTitle';

/** Fila con scroll horizontal arrastrable (mouse/táctil), sin barra visible + flechas. */
function DragRow({ children, title }: { children: ReactNode; title?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * 340, behavior: 'smooth' });
  };
  return (
    <div>
      {(title) && (
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-sm font-bold uppercase text-ink-muted">{title}</p>
          <span className="inline-flex gap-2">
            <button
              aria-label="Desplazar a la izquierda"
              onClick={() => nudge(-1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-line bg-white text-ink hover:border-primary"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              aria-label="Desplazar a la derecha"
              onClick={() => nudge(1)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-card border border-line bg-white text-ink hover:border-primary"
            >
              <ArrowRight size={16} />
            </button>
          </span>
        </div>
      )}
      <div
        ref={ref}
        role="region"
        aria-label={typeof title === 'string' ? title : 'Carrusel'}
        tabIndex={0}
        className="flex snap-x snap-mandatory scroll-px-4 cursor-grab gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [touch-action:pan-y] active:cursor-grabbing [&::-webkit-scrollbar]:hidden"
        onPointerDown={(e) => {
          const el = ref.current;
          if (!el || (e.target as HTMLElement).closest('button,a')) return;
          drag.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
          el.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const el = ref.current;
          const d = drag.current;
          if (!d.down || !el) return;
          const dx = e.clientX - d.startX;
          if (Math.abs(dx) > 6) d.moved = true;
          el.scrollLeft = d.startScroll - dx;
        }}
        onPointerUp={() => { drag.current.down = false; }}
        onPointerCancel={() => { drag.current.down = false; }}
        onClickCapture={(e) => {
          if (drag.current.moved) {
            e.preventDefault();
            e.stopPropagation();
            drag.current.moved = false;
          }
        }}
      >
        {children}
      </div>
      <p aria-hidden className="mt-1 text-xs text-ink-muted sm:hidden">Deslizá para ver más →</p>
    </div>
  );
}

function ResultRow({ tournamentId, slug, label }: { tournamentId: string; slug: string; label: string }) {
  const r = useResults(slug);
  const catsQ = useCategories(tournamentId);
  if (r.status === 'loading' || catsQ.isPending) {
    return (
      <div className="mt-4">
        <DragRow title={label}>
          <Skeleton className="h-44 w-80 shrink-0" />
        </DragRow>
      </div>
    );
  }
  if (r.status !== 'ready') return null;
  const soler = r.data.filter((m) =>
    [m.home.shortName, m.home.name, m.away.shortName, m.away.name].some((v) => v?.toLowerCase().includes('soler')),
  );
  // Último resultado por categoría, ordenado como las categorías del torneo.
  const latest = new Map<string, (typeof soler)[number]>();
  for (const m of soler) {
    const key = m.categorySlug ?? m.categoryName;
    if (!latest.has(key)) latest.set(key, m);
  }
  const order = new Map((catsQ.data ?? []).map((c, i) => [c.slug, i]));
  const cards = [...latest.values()].sort(
    (a, b) => (order.get(a.categorySlug ?? '') ?? 999) - (order.get(b.categorySlug ?? '') ?? 999),
  );
  if (!cards.length) return null;
  return (
    <div className="mt-6 select-none">
      <DragRow title={label}>
        {cards.map((m) => (
          <HomeResultCard key={m.id} match={m} />
        ))}
      </DragRow>
    </div>
  );
}

function HomeResultCard({ match }: { match: { id: string; tournamentName: string; categoryName: string; roundLabel: string; home: Club; away: Club; homeScore: number | null; awayScore: number | null; kickoff: string | null; venue: string | null } }) {
  return (
    <article className="w-80 shrink-0 snap-start rounded-card border border-line bg-white p-4 shadow-soft sm:w-96">
      <div className="flex items-center justify-between gap-2 text-[13px]">
        <span className="inline-flex items-center rounded-full bg-pitch px-2 py-0.5 font-bold text-white">{match.tournamentName}</span>
        <span className="font-semibold text-ink-muted">{match.roundLabel}</span>
      </div>
      <p className="mt-2 font-display text-lg font-extrabold uppercase tracking-wide">{match.categoryName}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <CrestImg club={match.home} />
          <span className="truncate text-sm font-bold">{match.home.shortName}</span>
        </span>
        <span className="shrink-0 font-display text-3xl font-extrabold tabular-nums">
          {match.homeScore ?? '–'} <span className="text-ink-muted">–</span> {match.awayScore ?? '–'}
        </span>
        <span className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <span className="truncate text-right text-sm font-bold">{match.away.shortName}</span>
          <CrestImg club={match.away} />
        </span>
      </div>
      <p className="mt-2 text-[13px] text-ink-muted">
        {formatKickoff(match.kickoff)}
        {match.venue ? (
          (match.away.mapsUrl ?? match.home.mapsUrl) ? (
            <> · <a href={(match.away.mapsUrl ?? match.home.mapsUrl)!} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">Cómo llegar: {match.venue}</a></>
          ) : (
            ` · ${match.venue}`
          )
        ) : null}
      </p>
    </article>
  );
}

function CrestImg({ club }: { club: Club }) {
  const src = clubCrest(club);
  if (!src) {
    return (
      <span
        aria-hidden
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-pitch font-display text-xs font-bold text-gold"
      >
        {club.shortName.slice(0, 2).toUpperCase()}
      </span>
    );
  }
  return <img src={src} alt={`Escudo de ${club.name}`} className="h-8 w-8 shrink-0 object-contain" loading="lazy" decoding="async" width={32} height={32} />;
}

function UpcomingClashCard({ clash }: { clash: UpcomingClash }) {  return (
    <article className="w-72 shrink-0 snap-start rounded-card border border-line bg-white p-4 shadow-soft sm:w-80">
      <div className="flex items-center justify-between gap-2 text-[13px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center rounded-full bg-pitch px-2 py-0.5 font-bold text-white">{clash.tournamentName}</span>
        </span>
        <span className="font-semibold">{clash.roundLabel}</span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <ClubBadge club={clash.home} strong />
        <ClubBadge club={clash.away} strong />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-muted">
        <CalendarDays size={15} aria-hidden className="shrink-0" />
        {formatKickoff(clash.kickoff)}
        {clash.venue ? (
          clash.away.mapsUrl ? (
            <> · <a href={clash.away.mapsUrl} target="_blank" rel="noreferrer" className="font-semibold text-primary hover:underline">Cómo llegar: {clash.venue}</a></>
          ) : (
            ` · ${clash.venue}`
          )
        ) : null}
      </p>
      <p className={cn('mt-1 text-[13px] text-ink-muted')}>
        {clash.categoryCount} {clash.categoryCount === 1 ? 'categoría' : 'categorías'}
      </p>
      <Link
        to={`/fixture?partido=${clash.id}`}
        className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
      >
        Ver fixture <ArrowRight size={15} className="ml-1 self-center" />
      </Link>
    </article>
  );
}

const STREAMING_URL = import.meta.env.VITE_STREAMING_URL ?? 'https://streaming.csdsoler.com.ar';

const competitions = [
  {
    slug: 'futbol-femenino',
    name: 'Fútbol Femenino',
    desc: 'Sub 9 a Primera y Damas. Torneo municipal de Malvinas Argentinas.',
    grad: 'from-primary to-pitch',
  },
  {
    slug: 'juveniles-sabados',
    name: 'Juveniles Sábados',
    desc: 'Categorías 2012 a 2020. Fixture completo por jornadas.',
    grad: 'from-pitch to-field',
  },
  {
    slug: 'juveniles-domingos',
    name: 'Juveniles Domingos',
    desc: 'Categorías 2011 a 2020. Fixture completo por jornadas.',
    grad: 'from-field to-pitch',
  },
];

function usePageMetaHome() {
  usePageMeta({
    title: 'CSD Soler — Club Social y Deportivo Soler',
    description:
      'Club Social y Deportivo Soler: fixture por fechas, próximos partidos, resultados oficiales, posiciones y Soler TV. Fútbol femenino y juveniles de Malvinas Argentinas.',
    path: '/',
  });
}

export function HomePage() {
  usePageMetaHome();
  const upcoming = useUpcoming();
  const live = useLiveBroadcast();
  const tournamentsQ = useTournaments();
  const heroQ = useQuery({
    queryKey: ['content', 'hero'],
    queryFn: () => api.get<{ title: string | null; body: string | null; imagePath: string | null } | null>('/content?slot=hero'),
    retry: 1,
  });
  const heroImg = (heroQ.data?.imagePath ? resolveCrest(heroQ.data.imagePath) : null) ?? '/hero.jpg';
  const heroTitle = heroQ.data?.title?.trim() || 'Más que un club, un lugar para compartir en familia.';
  const heroBody = heroQ.data?.body?.trim() || 'Viví toda la actividad deportiva del Club Social y Deportivo Soler.';
  const tournamentsBySlug = new Map((tournamentsQ.data ?? []).map((t) => [t.slug, t.id]));

  return (
    <>
      {/* 1. Hero fotográfico */}
      <section className="relative overflow-hidden bg-pitch text-white" aria-label="Presentación del club">
        <img
          src={heroImg}
          alt="Equipos y comunidad del Club Social y Deportivo Soler"
          className="absolute inset-0 h-full w-full object-cover"
          loading="eager"
          fetchPriority="high"
          decoding="async"
          width={1600}
          height={900}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15"
        />
        <Container className="relative py-12 sm:py-16 md:py-24">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold tracking-wide">
            <Trophy size={14} aria-hidden /> Malvinas Argentinas · Fútbol femenino y juveniles
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl md:text-7xl">
            {heroTitle}
          </h1>
          <div className="mt-4 max-w-xl text-base text-white/80 md:text-lg">
            <MiniMd text={heroBody} className="space-y-2" linkClassName="font-semibold text-gold hover:underline" />
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/fixture" className="inline-flex h-12 w-full items-center justify-center rounded-card bg-primary px-6 font-bold text-white hover:bg-primary-hover sm:w-auto">
              Ver próximos partidos
            </Link>
            <Link to="/el-club" className="inline-flex h-12 w-full items-center justify-center rounded-card border border-white/30 px-6 font-bold text-white hover:bg-white/10 sm:w-auto">
              Conocer el club
            </Link>
          </div>
          <dl className="mt-8 flex flex-wrap gap-6 text-sm text-white/70">
            <div className="flex items-center gap-2"><CalendarDays size={16} aria-hidden /> Fixture por fechas</div>
            <div className="flex items-center gap-2"><MapPin size={16} aria-hidden /> Sedes y horarios por categoría</div>
          </dl>
        </Container>
      </section>

      {/* 2. Partido en vivo — solo si hay señal verificada */}
      {live.status === 'live' && (
        <Container className="mt-8">
          <SectionHeading title="Ahora en vivo" description="Transmisión verificada por el sistema de streaming." link={<Link to="/soler-tv" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">Ir a Soler TV <ArrowRight size={15} /></Link>} />
          <BroadcastCard broadcast={live.data} />
        </Container>
      )}
      {live.status === 'unavailable' && (
        <Container className="mt-8">
          <p role="status" className="rounded-card border border-line bg-white px-4 py-3 text-sm text-ink-muted">
            No se pudo verificar el estado del streaming. No mostramos indicador EN VIVO sin confirmación.
          </p>
        </Container>
      )}

      {/* 3. Próximos encuentros */}
      <Container className="mt-12">
        <SectionHeading
          title="Próximos partidos"
          description="Lo próximo de Soler. Horarios y sedes pueden variar por categoría."
          link={<Link to="/fixture" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">Fixture completo <ArrowRight size={15} /></Link>}
        />
        {upcoming.status === 'loading' && (
          <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-44" />)}</div>
        )}
        {upcoming.status === 'ready' && (
          <DragRow>
            {upcoming.data.map((m) => <UpcomingClashCard key={m.id} clash={m} />)}
          </DragRow>
        )}
        {upcoming.status === 'empty' && (
          <EmptyState title="No hay partidos programados" hint="Cuando se publique una fecha del fixture, aparecerá acá." action={<Link to="/fixture"><Button variant="secondary">Ver fixture</Button></Link>} />
        )}
        {upcoming.status === 'unavailable' && (
          <EmptyState title="Fixture temporalmente no disponible" hint={upcoming.message} />
        )}
        {upcoming.status === 'error' && <ErrorState hint={upcoming.message} onRetry={upcoming.retry} />}
      </Container>

      {/* 4. Últimos resultados (solo Soler, por torneo) */}
      <Container className="mt-12">
        <SectionHeading
          title="Últimos resultados"
          description="Marcadores confirmados desde Ligas Deportivas. Nunca mostramos resultados inventados."
          link={<Link to="/resultados" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">Todos los resultados <ArrowRight size={15} /></Link>}
        />
        <ResultRow slug="futbol-femenino" label="Fútbol Femenino" tournamentId={tournamentsBySlug.get('futbol-femenino') ?? ''} />
        <ResultRow slug="juveniles-sabados" label="Juveniles Sábados" tournamentId={tournamentsBySlug.get('juveniles-sabados') ?? ''} />
        <ResultRow slug="juveniles-domingos" label="Juveniles Domingos" tournamentId={tournamentsBySlug.get('juveniles-domingos') ?? ''} />
      </Container>

      {/* 5. Competiciones */}
      <Container className="mt-12">
        <SectionHeading title="Competiciones" description="Tres torneos municipales. Estructura configurable desde administración." />
        <div className="grid gap-4 md:grid-cols-3">
          {competitions.map((c) => (
            <Link key={c.slug} to={`/competiciones/${c.slug}`} className="group overflow-hidden rounded-card border border-line bg-white shadow-soft transition-shadow hover:shadow-lift">
              <div className={`bg-gradient-to-br ${c.grad} px-5 py-8 text-white`}>
                <p className="font-display text-3xl font-extrabold uppercase leading-none">{c.name}</p>
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <p className="text-sm text-ink-muted">{c.desc}</p>
                <ArrowRight size={18} className="shrink-0 text-primary transition-transform group-hover:translate-x-1" aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      </Container>

      {/* 6. Soler TV */}
      <section className="mt-12 bg-pitch py-12 text-white" aria-label="Soler TV">
        <Container>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-gold">Soler TV</p>
              <h2 className="mt-1 font-display text-4xl font-extrabold uppercase">Viví los partidos en directo</h2>
              <p className="mt-2 max-w-xl text-white/70">Solo mostramos transmisiones habilitadas con estado verificado. Sin señal confirmada, sin botón EN VIVO.</p>
            </div>
            <Link to="/soler-tv" className="inline-flex h-12 w-full items-center justify-center rounded-card bg-primary px-6 font-bold text-white hover:bg-primary-hover sm:w-auto">
              Ir a Soler TV
            </Link>
          </div>
          <div className="mt-6">
            {live.status === 'live' ? (
              <BroadcastCard broadcast={live.data} />
            ) : (
              <Card className="border-white/10 bg-white/5 p-6 text-center !shadow-none">
                <p className="font-display text-2xl font-bold uppercase">Sin transmisión en este momento</p>
                <p className="mt-2 text-sm text-white/70">
                  Plataforma: <a className="font-semibold text-gold hover:underline" href={STREAMING_URL} target="_blank" rel="noopener noreferrer">{STREAMING_URL.replace('https://', '')}</a>
                </p>
              </Card>
            )}
          </div>
        </Container>
      </section>

      {/* 7. Institucional */}
      <Container className="mt-12">
        <div className="grid items-center gap-6 md:grid-cols-2">
          <div className="overflow-hidden rounded-card border border-line bg-white">
            <div aria-hidden className="flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-black/5 to-black/10 font-display text-4xl font-extrabold uppercase text-ink-muted">
              Foto del club
            </div>
          </div>
          <div>
            <h2 className="font-display text-4xl font-extrabold uppercase">El club de barrio</h2>
            <p className="mt-3 text-[15px] text-ink-muted">
              Historia, identidad y comunidad. Este bloque muestra contenido real administrado desde el backoffice. Si no hay contenido cargado, no se muestran títulos vacíos.
            </p>
            <Link to="/el-club" className="mt-4 inline-flex h-11 items-center rounded-card border border-line bg-white px-5 font-semibold hover:border-primary hover:text-primary">
              Conocer el club <ArrowRight size={16} className="ml-2" aria-hidden />
            </Link>
          </div>
        </div>
      </Container>

      {/* 8-9. Galería + Sponsors (vacíos reales, sin inventar) */}
      <Container className="mt-12">
        <SectionHeading title="Galería" link={<Link to="/galeria" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline">Ver galería <ArrowRight size={15} /></Link>} />
        <EmptyState title="Galería en preparación" hint="Las fotos reales del club aparecerán acá cuando se publiquen desde administración." />
      </Container>

      <Container className="mt-12">
        <SectionHeading title="Sponsors" description="Acompañan al club." />
        <div className="rounded-card border border-line bg-white px-6 py-8 text-center text-sm text-ink-muted">
          Espacio reservado para sponsors configurables. No mostramos marcas inventadas.
        </div>
      </Container>
    </>
  );
}
