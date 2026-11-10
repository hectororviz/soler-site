import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { api } from '../../services/api';
import type { Category } from '../../types';
import { useTournaments } from '../fixtures/useFixture';
import { usePageMeta } from '../../lib/usePageTitle';
import { MiniMd } from '../../lib/miniMd';

interface Slot { slot: string; title: string | null; body: string | null; imagePath: string | null }

function useSlot(name: string) {
  return useQuery({
    queryKey: ['content', name],
    queryFn: () => api.get<Slot | null>(`/content?slot=${name}`),
    retry: 1,
  });
}

export function IntroSlot({ slot }: { slot: string }) {
  const q = useSlot(slot);
  if (q.isPending) return <div className="mt-6"><Skeleton className="h-24" /></div>;
  if (!q.data?.title && !q.data?.body) return null;
  return (
    <div className="mt-6 max-w-3xl">
      {q.data.title && <h2 className="font-display text-xl font-bold uppercase">{q.data.title}</h2>}
      {q.data.body && <MiniMd text={q.data.body} className="mt-1 space-y-2 text-[15px] leading-relaxed text-ink-muted" />}
    </div>
  );
}

export function CompeticionesPage() {
  usePageMeta({
    title: 'Competiciones — CSD Soler',
    description: 'Torneos municipales donde compite el club: Juveniles Domingos, Sábados y Fútbol Femenino. Temporada 2026.',
    path: '/competiciones',
  });
  const q = useTournaments();
  const list = q.data ?? [];
  return (
    <Container className="py-10">
      <SectionHeading as="h1" title="Competiciones" description="Torneos municipales donde compite el club." />
      <IntroSlot slot="competiciones" />
      {q.isPending ? (
        <div className="mt-6 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : q.isError ? (
        <div className="mt-6"><ErrorState onRetry={() => q.refetch()} /></div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {list.map((t) => (
            <Link
              key={t.id}
              to={`/competiciones/${t.slug}`}
              className="group rounded-card border border-line bg-white p-5 shadow-soft transition-shadow hover:shadow-lift"
            >
              <p className="font-display text-2xl font-extrabold uppercase leading-tight">{t.name}</p>
              {t.description && <p className="mt-1 text-sm text-ink-muted">{t.description}</p>}
              <p className="mt-2 text-[13px] text-ink-muted">
                Temporada {t.seasonLabel} · {(t._count?.matchdays ?? 0)} fechas publicadas
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:underline">
                Ver torneo <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}

export function CompeticionDetallePage() {
  const { torneoSlug } = useParams();
  const tournamentsQ = useTournaments();
  const t = (tournamentsQ.data ?? []).find((x) => x.slug === torneoSlug);
  usePageMeta({
    title: t ? `${t.name} — CSD Soler` : 'Torneo — CSD Soler',
    description: t
      ? `${t.name}: fixture, resultados y posiciones. ${t.description ?? `Temporada ${t.seasonLabel}`} Club Soler.`
      : 'Detalle del torneo del Club Soler: fixture, resultados y posiciones.',
    path: `/competiciones/${torneoSlug ?? ''}`,
  });
  const catsQ = useQuery({
    queryKey: ['categories', t?.id],
    queryFn: () => api.get<Category[]>(`/categories?tournament=${encodeURIComponent(t!.id)}`),
    enabled: !!t,
    retry: 1,
  });
  const cats = catsQ.data ?? [];
  if (tournamentsQ.isPending) {
    return (
      <Container className="py-10"><SectionHeading as="h1" title="Torneo" description="" />
        <div className="mt-6"><Skeleton className="h-28" /></div>
      </Container>
    );
  }
  if (!t) {
    return (
      <Container className="py-10">
        <EmptyState title="Torneo no encontrado" hint="Volvé al listado de competiciones." action={<Link to="/competiciones"><Button variant="secondary">Ver competiciones</Button></Link>} />
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <SectionHeading as="h1" title={t.name} description={t.description ?? `Temporada ${t.seasonLabel}`} />
      <IntroSlot slot="torneo-detalle" />
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/fixture?torneo=${t.slug}`} className="rounded-card border border-line bg-white px-4 py-2.5 text-sm font-bold hover:border-primary">Fixture</Link>
        <Link to={`/resultados?torneo=${t.slug}`} className="rounded-card border border-line bg-white px-4 py-2.5 text-sm font-bold hover:border-primary">Resultados</Link>
        <Link to={`/posiciones?torneo=${t.slug}`} className="rounded-card border border-line bg-white px-4 py-2.5 text-sm font-bold hover:border-primary">Posiciones</Link>
      </div>
      <h2 className="mt-8 font-display text-xl font-bold uppercase">Categorías ({cats.length})</h2>
      {catsQ.isPending ? (
        <div className="mt-3"><Skeleton className="h-16" /></div>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {cats.map((c) => (
            <li key={c.id} className="rounded-card border border-line bg-white px-4 py-2 text-sm font-semibold">{c.name}</li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-center">
        <Link to="/competiciones" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"><ArrowLeft size={15} /> Todas las competiciones</Link>
      </p>
    </Container>
  );
}
