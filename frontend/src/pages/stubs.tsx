import { Link, useParams } from 'react-router-dom';
import { Container } from '../components/layout/Container';
import { EmptyState, SectionHeading } from '../components/ui/feedback';

function Shell({ title, desc, to }: { title: string; desc: string; to?: string }) {
  return (
    <Container className="py-10">
      <SectionHeading title={title} description={desc} />
      <EmptyState
        title="Sección en construcción sobre esta base"
        hint="La estructura, navegación y sistema de diseño ya están listos. Esta pantalla se completa en la siguiente fase con su API correspondiente."
        action={to ? undefined : <Link to="/" className="text-sm font-bold text-primary hover:underline">Volver al inicio</Link>}
      />
      {to && (
        <p className="mt-4 text-sm text-ink-muted">
          Dependencia de API: <code className="rounded bg-black/5 px-1.5 py-0.5">{to}</code>
        </p>
      )}
    </Container>
  );
}

export function CompeticionesPage() {
  return <Shell title="Competiciones" desc="Torneos activos administrados desde el backoffice." to="GET /api/v1/tournaments" />;
}
export function CompeticionDetallePage() {
  const { torneoSlug } = useParams();
  return <Shell title={`Torneo: ${torneoSlug ?? ''}`} desc="Detalle con selector de categoría y accesos a fixture, resultados y posiciones." to="GET /api/v1/tournaments/:slug + /categories?tournament=" />;
}
export function ResultadosPage() {
  return <Shell title="Resultados" desc="Historial oficial desde Ligas Deportivas vía API propia." to="GET /api/v1/results?torneo=&categoria=" />;
}
export function PosicionesPage() {
  return <Shell title="Posiciones" desc="Tablas completas por categoría con destaque de Soler sin alterar el orden." to="GET /api/v1/standings?torneo=&categoria=" />;
}
export function SolerTVPage() {
  return <Shell title="Soler TV" desc="Transmisiones con estado verificado. Integración desacoplada por adaptador." to="GET /api/v1/broadcasts (estados PROGRAMADA/EN_VIVO/FINALIZADA/INTERRUMPIDA)" />;
}
export function ElClubPage() {
  return <Shell title="El Club" desc="Historia, fundación, autoridades e identidad. Contenido administrable." to="GET /api/v1/content?slot=club" />;
}
export function GaleriaPage() {
  return <Shell title="Galería" desc="Fotografías optimizadas y responsive, con autorizaciones." to="GET /api/v1/content?slot=gallery + archivos" />;
}
export function ContactoPage() {
  return <Shell title="Contacto" desc="Datos institucionales y sponsors configurables. Nada inventado." to="GET /api/v1/content?slot=contacto + /api/v1/sponsors" />;
}
export function AdminPage() {
  return (
    <Container className="py-10">
      <SectionHeading title="Administración" description="Acceso privado. Requiere backend NestJS + Prisma + PostgreSQL (Etapa 1-2)." />
      <EmptyState title="Login pendiente de backend" hint="Endpoints: POST /api/v1/admin/auth/login · CRUD temporadas/torneos/categorías/clubes · fixture administrativo." />
    </Container>
  );
}
export function NotFoundPage() {
  return (
    <Container className="py-16 text-center">
      <h1 className="font-display text-5xl font-extrabold uppercase">404</h1>
      <p className="mt-2 text-ink-muted">La página no existe.</p>
      <Link to="/" className="mt-4 inline-block font-bold text-primary hover:underline">Volver al inicio</Link>
    </Container>
  );
}
