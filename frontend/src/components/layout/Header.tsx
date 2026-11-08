import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Radio, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Container } from './Container';

const links = [
  { to: '/', label: 'Inicio', end: true },
  { to: '/competiciones', label: 'Competiciones' },
  { to: '/fixture', label: 'Fixture' },
  { to: '/resultados', label: 'Resultados' },
  { to: '/posiciones', label: 'Posiciones' },
  { to: '/el-club', label: 'El Club' },
  { to: '/galeria', label: 'Galería' },
  { to: '/contacto', label: 'Contacto' },
];

function Crest() {
  return (
    <img
      src="/escudo.svg"
      alt="Escudo del Club Social y Deportivo Soler"
      className="h-10 w-10 object-contain"
      width={40}
      height={40}
    />
  );
}

export function Header({ liveActive = false }: { liveActive?: boolean }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open ]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
      <Container>
        <div className="flex h-16 items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2.5" aria-label="CSD Soler — inicio">
            <Crest />
            <span className="leading-tight">
              <span className="block font-display text-xl font-extrabold uppercase tracking-wide">CSD Soler</span>
              <span className="block text-[12px] text-ink-muted">Club Social y Deportivo Soler</span>
            </span>
          </Link>

          <nav aria-label="Principal" className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-[15px] font-medium transition-colors',
                    isActive ? 'text-primary' : 'text-ink hover:text-primary',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/soler-tv"
              className={cn(
                'inline-flex h-11 items-center gap-2 rounded-card px-4 text-sm font-bold transition-colors',
                liveActive ? 'bg-primary text-white hover:bg-primary-hover' : 'bg-pitch text-white hover:bg-black',
              )}
            >
              <Radio size={16} aria-hidden />
              Soler TV
              {liveActive && (
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-extrabold text-primary">EN VIVO</span>
              )}
            </Link>
            <button
              className="inline-flex h-11 w-11 items-center justify-center rounded-card border border-line lg:hidden"
              aria-expanded={open}
              aria-controls="menu-movil"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </Container>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú de navegación">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div id="menu-movil" className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-lift">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <span className="font-display text-xl font-extrabold uppercase">Menú</span>
              <button
                ref={closeRef}
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-card border border-line"
                aria-label="Cerrar menú"
              >
                <X size={20} />
              </button>
            </div>
            <nav aria-label="Móvil" className="flex flex-col gap-1 overflow-y-auto p-4">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-card px-4 py-3 text-base font-semibold',
                      isActive ? 'bg-primary-soft text-primary' : 'text-ink hover:bg-black/5',
                    )
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              <Link to="/soler-tv" onClick={() => setOpen(false)} className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-card bg-pitch font-bold text-white">
                <Radio size={16} aria-hidden /> Ir a Soler TV
              </Link>
              <Link to="/admin" onClick={() => setOpen(false)} className="inline-flex h-12 items-center justify-center rounded-card border border-line font-semibold text-ink-muted">
                Acceso administración
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
