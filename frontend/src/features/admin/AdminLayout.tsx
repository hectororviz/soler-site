import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { useAdminAuth } from './auth';
import { AdminAuthProvider } from './auth';

const links = [
  { to: '/admin', label: 'Panel', end: true },
  { to: '/admin/fixture', label: 'Fixture' },
  { to: '/admin/clubes', label: 'Clubes' },
  { to: '/admin/torneos', label: 'Torneos' },
  { to: '/admin/categorias', label: 'Categorías' },
  { to: '/admin/temporadas', label: 'Temporadas' },
  { to: '/admin/transmisiones', label: 'Transmisiones' },
  { to: '/admin/contenido', label: 'Contenido' },
  { to: '/admin/galeria', label: 'Galería' },
  { to: '/admin/sponsors', label: 'Sponsors' },
];

function Shell() {
  const { token, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  if (!token) return <Navigate to="/admin/login" replace />;

  const out = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar escritorio */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-pitch text-white lg:flex">
        <div className="flex h-16 items-center gap-2 px-4">
          <img src="/escudo.svg" alt="" className="h-8 w-8 object-contain" width={32} height={32} />
          <span className="font-display text-lg font-extrabold uppercase">Admin Soler</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Administración">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                cn('rounded-card px-3 py-2.5 text-[15px] font-semibold', isActive ? 'bg-primary text-white' : 'text-white/80 hover:bg-white/10')
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3">
          <button onClick={out} className="flex w-full items-center gap-2 rounded-card border border-white/20 px-3 py-2.5 font-semibold text-white/80 hover:text-white">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar móvil */}
        <header className="flex h-16 items-center justify-between border-b border-line bg-white px-4 lg:hidden">
          <Link to="/admin" className="flex items-center gap-2 font-display text-lg font-extrabold uppercase">
            <img src="/escudo.svg" alt="" className="h-8 w-8 object-contain" width={32} height={32} /> Admin Soler
          </Link>
          <button
            className="inline-flex h-11 w-11 items-center justify-center rounded-card border border-line"
            aria-expanded={open}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </header>
        {open && (
          <nav className="flex flex-col gap-1 border-b border-line bg-white p-3 lg:hidden" aria-label="Administración móvil">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn('rounded-card px-3 py-2.5 font-semibold', isActive ? 'bg-primary-soft text-primary' : 'text-ink')
                }
              >
                {l.label}
              </NavLink>
            ))}
            <button onClick={out} className="flex items-center gap-2 rounded-card px-3 py-2.5 font-semibold text-ink-muted">
              <LogOut size={16} /> Salir
            </button>
          </nav>
        )}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminSection() {
  useEffect(() => {
    let meta = document.head.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    const prev = meta.content;
    meta.content = 'noindex,nofollow';
    return () => {
      meta.content = prev;
    };
  }, []);
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}

export function AdminLayout() {
  return <Shell />;
}
