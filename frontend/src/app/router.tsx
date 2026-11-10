import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { lazyPage, susp } from './lazy';

const HomePage = lazyPage(() => import('../features/home/HomePage'), 'HomePage');
const FixturePage = lazyPage(() => import('../features/fixtures/FixturePage'), 'FixturePage');
const CompeticionesPage = lazyPage(() => import('../features/competitions/CompetitionsPage'), 'CompeticionesPage');
const CompeticionDetallePage = lazyPage(
  () => import('../features/competitions/CompetitionsPage'),
  'CompeticionDetallePage',
);
const ResultadosPage = lazyPage(() => import('../features/results/ResultsPage'), 'ResultadosPage');
const PosicionesPage = lazyPage(() => import('../features/standings/StandingsPage'), 'PosicionesPage');
const ElClubPage = lazyPage(() => import('../features/club/ElClubPage'), 'ElClubPage');
const GaleriaPage = lazyPage(() => import('../features/gallery/GalleryPage'), 'GaleriaPage');
const ContactoPage = lazyPage(() => import('../features/contact/ContactPage'), 'ContactoPage');
const SolerTVPage = lazyPage(() => import('../pages/stubs'), 'SolerTVPage');
const NotFoundPage = lazyPage(() => import('../pages/stubs'), 'NotFoundPage');

const AdminLayout = lazyPage(() => import('../features/admin/AdminLayout'), 'AdminLayout');
const AdminSection = lazyPage(() => import('../features/admin/AdminLayout'), 'AdminSection');
const AdminLoginPage = lazyPage(() => import('../features/admin/pages/Login'), 'AdminLoginPage');
const AdminDashboardPage = lazyPage(() => import('../features/admin/pages/Dashboard'), 'AdminDashboardPage');
const SeasonsPage = lazyPage(() => import('../features/admin/pages/Seasons'), 'SeasonsPage');
const TournamentsPage = lazyPage(() => import('../features/admin/pages/Tournaments'), 'TournamentsPage');
const TournamentDetailPage = lazyPage(
  () => import('../features/admin/pages/TournamentDetail'),
  'TournamentDetailPage',
);
const CategoriesPage = lazyPage(() => import('../features/admin/pages/Categories'), 'CategoriesPage');
const ClubsPage = lazyPage(() => import('../features/admin/pages/Clubs'), 'ClubsPage');
const FixtureAdminPage = lazyPage(() => import('../features/admin/pages/Fixture'), 'FixtureAdminPage');
const BroadcastsPage = lazyPage(() => import('../features/admin/pages/Broadcasts'), 'BroadcastsPage');
const ContentPage = lazyPage(() => import('../features/admin/pages/Content'), 'ContentPage');
const GalleryAdminPage = lazyPage(() => import('../features/admin/pages/Gallery'), 'GalleryPage');

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: susp(<HomePage />) },
      { path: '/competiciones', element: susp(<CompeticionesPage />) },
      { path: '/competiciones/:torneoSlug', element: susp(<CompeticionDetallePage />) },
      { path: '/fixture', element: susp(<FixturePage />) },
      { path: '/resultados', element: susp(<ResultadosPage />) },
      { path: '/posiciones', element: susp(<PosicionesPage />) },
      { path: '/soler-tv', element: susp(<SolerTVPage />) },
      { path: '/el-club', element: susp(<ElClubPage />) },
      { path: '/galeria', element: susp(<GaleriaPage />) },
      { path: '/contacto', element: susp(<ContactoPage />) },
      { path: '*', element: susp(<NotFoundPage />) },
    ],
  },
  {
    path: '/admin',
    element: susp(<AdminSection />),
    children: [
      { path: 'login', element: susp(<AdminLoginPage />) },
      {
        element: susp(<AdminLayout />),
        children: [
          { index: true, element: susp(<AdminDashboardPage />) },
          { path: 'temporadas', element: susp(<SeasonsPage />) },
          { path: 'torneos', element: susp(<TournamentsPage />) },
          { path: 'torneos/:id', element: susp(<TournamentDetailPage />) },
          { path: 'categorias', element: susp(<CategoriesPage />) },
          { path: 'clubes', element: susp(<ClubsPage />) },
          { path: 'fixture', element: susp(<FixtureAdminPage />) },
          { path: 'transmisiones', element: susp(<BroadcastsPage />) },
          { path: 'contenido', element: susp(<ContentPage />) },
          { path: 'galeria', element: susp(<GalleryAdminPage />) },
          { path: 'sponsors', element: susp(<ContentPage />) },
        ],
      },
    ],
  },
]);
