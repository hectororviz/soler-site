import { Link } from 'react-router-dom';
import { Container } from './Container';

const STREAMING_URL = import.meta.env.VITE_STREAMING_URL ?? 'https://streaming.csdsoler.com.ar';
const YEAR = new Date().getFullYear();

export function Footer() {
  const year = YEAR;
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <Container className="py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-extrabold uppercase">CSD Soler</p>
            <p className="mt-2 text-sm text-ink-muted">
              Club Social y Deportivo Soler. Punto central de información deportiva e institucional.
            </p>
          </div>
          <nav aria-label="Secundaria">
            <p className="text-sm font-bold uppercase text-ink-muted">Secciones</p>
            <ul className="mt-3 space-y-2 text-[15px]">
              <li><Link className="hover:text-primary" to="/fixture">Fixture</Link></li>
              <li><Link className="hover:text-primary" to="/resultados">Resultados</Link></li>
              <li><Link className="hover:text-primary" to="/posiciones">Posiciones</Link></li>
              <li><Link className="hover:text-primary" to="/soler-tv">Soler TV</Link></li>
            </ul>
          </nav>
          <nav aria-label="Institucional">
            <p className="text-sm font-bold uppercase text-ink-muted">Club</p>
            <ul className="mt-3 space-y-2 text-[15px]">
              <li><Link className="hover:text-primary" to="/el-club">El Club</Link></li>
              <li><Link className="hover:text-primary" to="/galeria">Galería</Link></li>
              <li><Link className="hover:text-primary" to="/contacto">Contacto</Link></li>
              <li><Link className="hover:text-primary" to="/admin">Administración</Link></li>
            </ul>
          </nav>
          <div>
            <p className="text-sm font-bold uppercase text-ink-muted">Transmisiones</p>
            <a href={STREAMING_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block min-h-[44px] py-2 text-[15px] font-semibold text-primary hover:underline">
              streaming.csdsoler.com.ar
            </a>
            <p className="mt-2 text-sm text-ink-muted">Las transmisiones se habilitan solo cuando hay señal verificada.</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-6 text-sm text-ink-muted">
          <span>© {year} CSD Soler. Todos los derechos reservados.</span>
          <span>csdsoler.com.ar</span>
        </div>
      </Container>
    </footer>
  );
}
