import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../../services/api';
import { AdminPage, Panel } from '../components';
import { Skeleton } from '../../../components/ui/feedback';
import { usePageTitle } from '../../../lib/usePageTitle';

interface Counts {
  tournaments: number;
  clubs: number;
}

const quick = [
  { to: '/admin/fixture', label: 'Cargar fixture', desc: 'Fecha → enfrentamientos → publicar' },
  { to: '/admin/clubes', label: 'Gestionar clubes', desc: 'Altas, escudos y datos' },
  { to: '/admin/transmisiones', label: 'Programar transmisión', desc: 'Vincular encuentro y estado' },
  { to: '/admin/contenido', label: 'Editar contenido', desc: 'Club, contacto y galería' },
];

export function AdminDashboardPage() {
  usePageTitle('Panel — Admin CSD Soler');
  const q = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get<Counts>('/admin/dashboard', { admin: true }),
    retry: 1,
  });

  return (
    <AdminPage title="Panel general" desc="Métricas reales de la API. Nada de datos inventados.">
      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Torneos configurados">
          {q.isPending ? <Skeleton className="h-10 w-20" /> : q.isSuccess ? (
            <p className="font-display text-5xl font-extrabold">{q.data.tournaments}</p>
          ) : (
            <p className="text-sm text-ink-muted">No disponible (¿backend caído o sin sesión?).</p>
          )}
        </Panel>
        <Panel title="Clubes registrados">
          {q.isPending ? <Skeleton className="h-10 w-20" /> : q.isSuccess ? (
            <p className="font-display text-5xl font-extrabold">{q.data.clubs}</p>
          ) : (
            <p className="text-sm text-ink-muted">No disponible (¿backend caído o sin sesión?).</p>
          )}
        </Panel>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {quick.map((l) => (
          <Link key={l.to} to={l.to} className="rounded-card border border-line bg-white p-4 shadow-soft transition-shadow hover:shadow-lift">
            <p className="font-display text-xl font-bold uppercase">{l.label}</p>
            <p className="text-sm text-ink-muted">{l.desc}</p>
          </Link>
        ))}
      </div>
    </AdminPage>
  );
}
