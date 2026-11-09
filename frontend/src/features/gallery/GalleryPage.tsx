import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../../components/layout/Container';
import { EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { api, resolveCrest } from '../../services/api';
import { usePageTitle } from '../../lib/usePageTitle';

interface GalleryImage { id: string; imagePath: string; caption: string | null }

export function GaleriaPage() {
  usePageTitle('Galería — CSD Soler');
  const q = useQuery({
    queryKey: ['gallery'],
    queryFn: () => api.get<GalleryImage[]>('/gallery'),
    retry: 1,
  });
  const rows = q.data ?? [];
  return (
    <Container className="py-10">
      <SectionHeading title="Galería" description="Fotos del club." />
      {q.isPending ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
      ) : q.isError ? (
        <div className="mt-6"><ErrorState onRetry={() => q.refetch()} /></div>
      ) : !rows.length ? (
        <div className="mt-6"><EmptyState title="Galería en preparación" hint="Las fotos aparecerán cuando se publiquen desde administración." /></div>
      ) : (
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((g) => {
            const src = resolveCrest(g.imagePath);
            return (
              <li key={g.id} className="overflow-hidden rounded-card border border-line bg-white shadow-soft">
                {src && <img src={src} alt={g.caption ?? 'Foto del club'} className="h-56 w-full object-cover" loading="lazy" />}
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
