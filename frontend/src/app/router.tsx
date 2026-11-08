import { createBrowserRouter } from 'react-router-dom';
import { PublicLayout } from '../components/layout/PublicLayout';
import { HomePage } from '../features/home/HomePage';
import { FixturePage } from '../features/fixtures/FixturePage';
import {
  AdminPage,
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
      { path: '/admin', element: <AdminPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
