import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Container } from '../../components/layout/Container';
import { EmptyState, SectionHeading, Skeleton } from '../../components/ui/feedback';
import { api, resolveCrest } from '../../services/api';
import { usePageMeta } from '../../lib/usePageTitle';

interface Slot { slot: string; title: string | null; body: string | null; imagePath: string | null }
interface Sponsor { id: string; name: string; logoUrl: string | null; logoPath?: string | null; href: string | null }

export function ContactoPage() {
  usePageMeta({
    title: 'Contacto — CSD Soler',
    description: 'Datos institucionales y sponsors del Club Social y Deportivo Soler. Contacto oficial del club.',
    path: '/contacto',
  });
  const slotQ = useQuery({
    queryKey: ['content-contacto'],
    queryFn: () => api.get<Slot | null>('/content?slot=contacto'),
    retry: 1,
  });
  const sponsorsQ = useQuery({
    queryKey: ['sponsors'],
    queryFn: () => api.get<Sponsor[]>('/sponsors'),
    retry: 1,
  });
  const sponsors = sponsorsQ.data ?? [];
  return (
    <Container className="py-10">
      <SectionHeading as="h1" title={slotQ.data?.title || 'Contacto'} description="Datos institucionales y sponsors." />
      {slotQ.isPending ? (
        <div className="mt-6"><Skeleton className="h-40" /></div>
      ) : slotQ.data?.body ? (
        <div className="mt-6 max-w-3xl whitespace-pre-line text-[15px] leading-relaxed">{slotQ.data.body}</div>
      ) : (
        <div className="mt-6"><EmptyState title="Contenido en preparación" hint="Estamos cargando los datos de contacto." /></div>
      )}
      {sponsors.length > 0 && (
        <>
          <h2 className="mt-10 font-display text-xl font-bold uppercase">Sponsors</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sponsors.map((s) => {
              const logo = s.logoUrl ?? (s.logoPath ? resolveCrest(s.logoPath) : null);
              const inner = (
                <span className="flex items-center gap-3 rounded-card border border-line bg-white p-4 shadow-soft">
                  {logo ? <img src={logo} alt={s.name} className="h-12 w-auto object-contain" loading="lazy" decoding="async" width={96} height={48} /> : null}
                  <span className="font-semibold">{s.name}</span>
                </span>
              );
              return (
                <li key={s.id}>
                  {s.href ? <a href={s.href} target="_blank" rel="noreferrer" className="block transition-shadow hover:shadow-lift">{inner}</a> : inner}
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-6 text-center">
        <Link to="/" className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"><ArrowLeft size={15} /> Volver al inicio</Link>
      </p>
    </Container>
  );
}
