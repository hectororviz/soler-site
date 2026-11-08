import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { HomePage } from '../features/home/HomePage';
import { FixturePage } from '../features/fixtures/FixturePage';
import { AdminLayout, AdminSection } from '../features/admin/AdminLayout';
import { AdminLoginPage } from '../features/admin/pages/Login';
import { AdminDashboardPage } from '../features/admin/pages/Dashboard';
import { SeasonsPage } from '../features/admin/pages/Seasons';
import { TournamentsPage } from '../features/admin/pages/Tournaments';
import { TournamentDetailPage } from '../features/admin/pages/TournamentDetail';
import { CategoriesPage } from '../features/admin/pages/Categories';
import { ClubsPage } from '../features/admin/pages/Clubs';
import { FixtureAdminPage } from '../features/admin/pages/Fixture';
import { BroadcastsPage } from '../features/admin/pages/Broadcasts';
import { ContentPage } from '../features/admin/pages/Content';
import {
  CompeticionDetallePage,
  CompeticionesPage,
  ContactoPage,
  ElClubPage,
  GaleriaPage,
  NotFoundPage,
  PosicionesPage,
  ResultadosPage,
  SolerTVPage,
} from '../pages/stubs';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/competiciones', element: <CompeticionesPage /> },
      { path: '/competiciones/:torneoSlug', element: <CompeticionDetallePage /> },
      { path: '/fixture', element: <FixturePage /> },
      { path: '/resultados', element: <ResultadosPage /> },
      { path: '/posiciones', element: <PosicionesPage /> },
      { path: '/soler-tv', element: <SolerTVPage /> },
      { path: '/el-club', element: <ElClubPage /> },
      { path: '/galeria', element: <GaleriaPage /> },
      { path: '/contacto', element: <ContactoPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: <AdminSection />,
    children: [
      { path: 'login', element: <AdminLoginPage /> },
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <AdminDashboardPage /> },
          { path: 'temporadas', element: <SeasonsPage /> },
          { path: 'torneos', element: <TournamentsPage /> },
          { path: 'torneos/:id', element: <TournamentDetailPage /> },
          { path: 'categorias', element: <CategoriesPage /> },
          { path: 'clubes', element: <ClubsPage /> },
          { path: 'fixture', element: <FixtureAdminPage /> },
          { path: 'transmisiones', element: <BroadcastsPage /> },
          { path: 'contenido', element: <ContentPage /> },
          { path: 'sponsors', element: <ContentPage /> },
        ],
      },
    ],
  },
]);
