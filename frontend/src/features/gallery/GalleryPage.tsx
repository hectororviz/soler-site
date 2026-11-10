import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../../components/layout/Container';
import { EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { api, resolveCrest } from '../../services/api';
import { USE_MOCKS } from '../../services/mock';
import { ApiError } from '../../types';
import { usePageMeta } from '../../lib/usePageTitle';

interface GalleryImage { id: string; imagePath: string; caption: string | null }

export function GaleriaPage() {
  usePageMeta({
    title: 'Galería — CSD Soler',
    description: 'Fotos del Club Social y Deportivo Soler: equipos, cancha y comunidad.',
    path: '/galeria',
  });
  const q = useQuery({
    queryKey: ['gallery'],
    queryFn: async () => {
      if (USE_MOCKS) {
        await new Promise((r) => setTimeout(r, 300));
        return [] as GalleryImage[];
      }
      return api.get<GalleryImage[]>('/gallery');
    },
    retry: 1,
  });
  const rows = q.data ?? [];
  const unavailable =
    q.error instanceof ApiError &&
    (q.error.kind === 'unavailable' || q.error.kind === 'network' || q.error.kind === 'timeout' || (q.error.status ?? 0) >= 500);
  return (
    <Container className="py-10">
      <SectionHeading as="h1" title="Galería" description="Fotos del club." />
      {q.isPending ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : q.isError ? (
        <div className="mt-6">
          {unavailable ? (
            <EmptyState
              title="Galería temporalmente no disponible"
              hint="No se pudo conectar con el servidor. Las fotos publicadas aparecerán acá cuando se restablezca el servicio."
            />
          ) : (
            <ErrorState onRetry={() => q.refetch()} />
          )}
        </div>
      ) : !rows.length ? (
        <div className="mt-6"><EmptyState title="Galería en preparación" hint="Las fotos aparecerán cuando se publiquen desde administración." /></div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((g) => {
            const src = resolveCrest(g.imagePath);
            return (
              <li key={g.id} className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
                {src && <img src={src} alt={g.caption ?? 'Foto del club'} className="aspect-[3/2] h-56 w-full object-cover" loading="lazy" decoding="async" width={600} height={400} />}
                {g.caption && <p className="px-3 py-2 text-sm">{g.caption}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"><ArrowLeft size={15} /> Volver al inicio</Link>
      </p>
    </Container>
  );
}
