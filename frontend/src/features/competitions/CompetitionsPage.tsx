import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../../components/layout/Container';
import { Button } from '../../components/ui/Button';
import { EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { api } from '../../services/api';
import type { Category } from '../../types';
import { useTournaments } from '../fixtures/useFixture';
import { usePageTitle } from '../../lib/usePageTitle';

export function CompeticionesPage() {
  usePageTitle('Competiciones — CSD Soler');
  const q = useTournaments();
  const list = q.data ?? [];
  return (
    <Container className="py-10">
      <SectionHeading title="Competiciones" description="Torneos municipales donde compite el club." />
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
  usePageTitle('Torneo — CSD Soler');
  const tournamentsQ = useTournaments();
  const t = (tournamentsQ.data ?? []).find((x) => x.slug === torneoSlug);
  const catsQ = useQuery({
    queryKey: ['categories', t?.id],
    queryFn: () => api.get<Category[]>(`/categories?tournament=${encodeURIComponent(t!.id)}`),
    enabled: !!t,
    retry: 1,
  });
  const cats = catsQ.data ?? [];
  if (tournamentsQ.isPending) {
    return (
      <Container className="py-10"><SectionHeading title="Torneo" description="" />
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
      <SectionHeading title={t.name} description={t.description ?? `Temporada ${t.seasonLabel}`} />
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
