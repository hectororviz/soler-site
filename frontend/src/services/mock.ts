import type { Broadcast, Club, FixtureMatch, MatchSummary, Sponsor, StandingRow } from '../types';

/**
 * Datos de desarrollo — SOLO para visualizar componentes sin backend.
 * Reglas (§20): nunca se activan en producción, nunca se presentan como
 * oficiales, y la UI debe distinguir "sin registros" de "integración caída".
 *
 * Uso: VITE_USE_MOCKS=true (dev). En producción el flag queda en false y
 * los servicios lanzan ApiError(kind=unavailable).
 */

export const USE_MOCKS = import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true';

const soler: Club = { id: 'soler', name: 'Club Social y Deportivo Soler', shortName: 'Soler', crestUrl: '/escudo.svg' };
const rival = (id: string, shortName: string): Club => ({ id, name: `Club ${shortName}`, shortName, crestUrl: null });

export const mockUpcoming: MatchSummary[] = [
  {
    id: 'm1', tournamentName: 'Juveniles Domingos', categoryName: '2011',
    roundLabel: 'Fecha 8', home: soler, away: rival('torino', 'Torino'),
    homeScore: null, awayScore: null, kickoff: new Date(Date.now() + 86400000 * 2).toISOString(),
    venue: 'Cancha Soler', status: 'PROXIMO', hasBroadcast: true,
  },
  {
    id: 'm2', tournamentName: 'Fútbol Femenino', categoryName: 'Primera',
    roundLabel: 'Fecha 5', home: rival('mundialito', 'Mundialito'), away: soler,
    homeScore: null, awayScore: null, kickoff: new Date(Date.now() + 86400000 * 3).toISOString(),
    venue: 'Polideportivo Malvinas', status: 'PROGRAMADO', hasBroadcast: false,
  },
  {
    id: 'm3', tournamentName: 'Juveniles Sábados', categoryName: '2015',
    roundLabel: 'Fecha 8', home: soler, away: rival('baby', 'Baby'),
    homeScore: null, awayScore: null, kickoff: new Date(Date.now() + 86400000 * 5).toISOString(),
    venue: 'Cancha Soler', status: 'PROXIMO', hasBroadcast: false,
  },
];

export const mockResults: MatchSummary[] = [
  {
    id: 'r1', tournamentName: 'Juveniles Domingos', categoryName: '2013',
    roundLabel: 'Fecha 7', home: soler, away: rival('torino', 'Torino'),
    homeScore: 3, awayScore: 1, kickoff: new Date(Date.now() - 86400000 * 2).toISOString(),
    venue: 'Cancha Soler', status: 'FINALIZADO', hasBroadcast: false,
  },
  {
    id: 'r2', tournamentName: 'Fútbol Femenino', categoryName: 'Sub 15',
    roundLabel: 'Fecha 4', home: rival('mundialito', 'Mundialito'), away: soler,
    homeScore: 0, awayScore: 2, kickoff: new Date(Date.now() - 86400000 * 4).toISOString(),
    venue: 'Polideportivo Malvinas', status: 'FINALIZADO', hasBroadcast: false,
  },
];

export const mockLive: Broadcast | null = null;
// Para previsualizar el bloque EN VIVO en dev, descomentar:
// export const mockLive: Broadcast | null = {
//   id: 'b1', status: 'EN_VIVO', matchId: 'm1',
//   tournamentName: 'Juveniles Domingos', categoryName: '2011',
//   home: soler, away: rival('torino', 'Torino'),
//   kickoff: new Date().toISOString(), streamUrl: 'https://streaming.csdsoler.com.ar',
// };

export const mockFixture: FixtureMatch[] = [
  {
    id: 'f1', roundId: 'fecha-8', roundLabel: 'Fecha 8', tournamentId: 'juv-dom',
    home: soler, away: rival('torino', 'Torino'), isSolerMatch: true,
    categories: [
      { id: 'f1-c1', categoryId: 'c2011', categoryName: '2011', kickoff: new Date(Date.now() + 86400000 * 2).toISOString(), venue: 'Cancha Soler', status: 'PROXIMO', homeScore: null, awayScore: null, broadcastId: 'b1' },
      { id: 'f1-c2', categoryId: 'c2013', categoryName: '2013', kickoff: new Date(Date.now() + 86400000 * 2).toISOString(), venue: 'Cancha Soler 2', status: 'PROXIMO', homeScore: null, awayScore: null, broadcastId: null },
    ],
  },
  {
    id: 'f2', roundId: 'fecha-8', roundLabel: 'Fecha 8', tournamentId: 'juv-dom',
    home: rival('mundialito', 'Mundialito'), away: rival('baby', 'Baby'), isSolerMatch: false,
    categories: [
      { id: 'f2-c1', categoryId: 'c2011', categoryName: '2011', kickoff: new Date(Date.now() + 86400000 * 2).toISOString(), venue: 'Cancha Mundialito', status: 'PROGRAMADO', homeScore: null, awayScore: null, broadcastId: null },
    ],
  },
];

export const mockStandings: StandingRow[] = [
  { position: 1, club: soler, played: 7, won: 6, drawn: 1, lost: 0, goalDiff: 14, points: 19, isSoler: true },
  { position: 2, club: rival('torino', 'Torino'), played: 7, won: 5, drawn: 1, lost: 1, goalDiff: 9, points: 16, isSoler: false },
  { position: 3, club: rival('mundialito', 'Mundialito'), played: 7, won: 4, drawn: 2, lost: 1, goalDiff: 6, points: 14, isSoler: false },
  { position: 4, club: rival('baby', 'Baby'), played: 7, won: 2, drawn: 1, lost: 4, goalDiff: -5, points: 7, isSoler: false },
];

export const mockSponsors: Sponsor[] = [];
