import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Images } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../../components/layout/Container';
import { EmptyState, ErrorState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { MiniMd } from '../../lib/miniMd';
import { api, resolveCrest } from '../../services/api';
import { USE_MOCKS } from '../../services/mock';
import { ApiError } from '../../types';
import { usePageMeta } from '../../lib/usePageTitle';
import { AlbumLightbox } from './AlbumLightbox';

interface GalleryImage { id: string; imagePath: string; caption: string | null; order: number }
interface GalleryAlbum { id: string; title: string; body: string | null; coverImageId: string | null; order: number; images: GalleryImage[] }
interface GalleryPayload { albums: GalleryAlbum[]; loose: GalleryImage[] }

function coverOf(a: GalleryAlbum): GalleryImage | null {
  if (!a.images.length) return null;
  return a.images.find((i) => i.id === a.coverImageId) ?? a.images[0];
}

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
        return { albums: [], loose: [] } as GalleryPayload;
      }
      const data = await api.get<GalleryPayload | GalleryImage[]>('/gallery');
      if (Array.isArray(data)) return { albums: [], loose: data } as GalleryPayload;
      return data;
    },
    retry: 1,
  });
  const [open, setOpen] = useState<{ title: string; body: string | null; photos: { imagePath: string; caption: string | null }[]; index: number } | null>(null);

  const payload = q.data ?? { albums: [], loose: [] };
  const unavailable =
    q.error instanceof ApiError &&
    (q.error.kind === 'unavailable' || q.error.kind === 'network' || q.error.kind === 'timeout' || (q.error.status ?? 0) >= 500);
  const empty = !payload.albums.length && !payload.loose.length;
  return (
    <Container className="py-10">
      <SectionHeading as="h1" title="Galería" description="Los álbumes del club: una jornada, muchas fotos." />
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
      ) : empty ? (
        <div className="mt-6"><EmptyState title="Galería en preparación" hint="Las fotos aparecerán cuando se publiquen desde administración." /></div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {payload.albums.map((a) => {
            const cover = coverOf(a);
            const src = cover ? resolveCrest(cover.imagePath) : null;
            return (
              <li key={a.id} className="overflow-hidden rounded-card border border-line bg-white shadow-soft transition-shadow hover:shadow-lift">
                <button
                  onClick={() => setOpen({ title: a.title, body: a.body, photos: a.images.map((i) => ({ imagePath: i.imagePath, caption: i.caption })), index: 0 })}
                  className="block w-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`Abrir álbum ${a.title}`}
                >
                  <span className="relative block">
                    {src && <img src={src} alt={a.title} className="aspect-[3/2] h-56 w-full object-cover" loading="lazy" decoding="async" width={600} height={400} />}
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold text-white">
                      <Images size={13} aria-hidden /> {a.images.length} {a.images.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </span>
                  <span className="block px-4 py-3">
                    <span className="block font-display text-lg font-extrabold uppercase leading-tight">{a.title}</span>
                    {a.body?.trim() && (
                      <span className="mt-1 line-clamp-2 block text-sm text-ink-muted">
                        <MiniMd text={a.body.split('\n\n')[0]} className="space-y-1" />
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
          {payload.loose.map((g) => {
            const src = resolveCrest(g.imagePath);
            return (
              <li key={g.id} className="overflow-hidden rounded-card border border-line bg-white shadow-soft transition-shadow hover:shadow-lift">
                <button
                  onClick={() => setOpen({ title: g.caption ?? 'Foto', body: null, photos: [{ imagePath: g.imagePath, caption: g.caption }], index: 0 })}
                  className="block w-full cursor-zoom-in text-left focus-visible:outline-2 focus-visible:outline-primary"
                  aria-label={`Ampliar foto ${g.caption ?? ''}`}
                >
                  {src && <img src={src} alt={g.caption ?? 'Foto del club'} className="aspect-[3/2] h-56 w-full object-cover" loading="lazy" decoding="async" width={600} height={400} />}
                  {g.caption && <span className="block px-3 py-2 text-sm">{g.caption}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {open && (
        <AlbumLightbox
          title={open.title}
          body={open.body}
          photos={open.photos}
          index={open.index}
          onIndex={(i) => setOpen({ ...open, index: i })}
          onClose={() => setOpen(null)}
        />
      )}
      <p className="mt-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"><ArrowLeft size={15} /> Volver al inicio</Link>
      </p>
    </Container>
  );
}
