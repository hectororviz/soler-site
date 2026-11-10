import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../../components/layout/Container';
import { EmptyState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { api, resolveCrest } from '../../services/api';
import { usePageMeta } from '../../lib/usePageTitle';

interface Slot { slot: string; title: string | null; body: string | null; imagePath: string | null }

export function ElClubPage() {
  usePageMeta({
    title: 'El Club — CSD Soler',
    description: 'Historia, identidad y comunidad del Club Social y Deportivo Soler de Malvinas Argentinas.',
    path: '/el-club',
  });
  const q = useQuery({
    queryKey: ['content-club'],
    queryFn: () => api.get<Slot | null>('/content?slot=club'),
    retry: 1,
  });
  const img = q.data?.imagePath ? resolveCrest(q.data.imagePath) : null;
  return (
    <Container className="py-10">
      <SectionHeading as="h1" title={q.data?.title || 'El Club'} description="Historia, fundación, autoridades e identidad." />
      {q.isPending ? (
        <div className="mt-6"><Skeleton className="h-64" /></div>
      ) : !q.data?.body && !q.data?.title ? (
        <div className="mt-6"><EmptyState title="Contenido en preparación" hint="Estamos cargando la historia del club." /></div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="whitespace-pre-line text-[15px] leading-relaxed">{q.data.body}</div>
          <div>
            {img ? (
              <img src={img} alt={q.data.title ?? 'Club Social y Deportivo Soler'} className="aspect-[4/3] w-full rounded-card border border-line object-cover" loading="lazy" decoding="async" width={640} height={480} />
            ) : (
              <img src="/escudo.svg" alt="Escudo del Club Social y Deportivo Soler" className="mx-auto h-48 object-contain" width={192} height={192} />
            )}
          </div>
        </div>
      )}
      <p className="mt-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"><ArrowLeft size={15} /> Volver al inicio</Link>
      </p>
    </Container>
  );
}
