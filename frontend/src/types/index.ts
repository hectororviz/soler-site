/**
 * Tipos compartidos del frontend.
 * Reflejan el contrato esperado de /api/v1 (ver docs/FRONTEND-API-CONTRACT.md).
 * No duplican lógica de backend: solo modelan lo que la API entrega.
 */

export type MatchStatus = 'EN_VIVO' | 'PROXIMO' | 'FINALIZADO' | 'SUSPENDIDO' | 'PROGRAMADO';
export type BroadcastStatus = 'PROGRAMADA' | 'EN_VIVO' | 'FINALIZADA' | 'INTERRUMPIDA';

export interface Club {
  id: string;
  name: string;
  shortName: string;
  crestUrl: string | null;
  /** Alias histórico del backend (DB `crestPath`). El frontend acepta ambos. */
  crestPath?: string | null;
  /** ID externo Ligas Deportivas, cuando corresponda. Nunca matchear solo por nombre. */
  externalId?: string | null;
}

export interface Tournament {
  id: string;
  slug: string;
  name: string;
  seasonId: string;
  seasonLabel: string;
  description?: string | null;
  /** Fechas publicadas (para elegir default con datos). */
  _count?: { matchdays: number };
}

export interface Category {
  id: string;
  tournamentId: string;
  name: string;
  slug: string;
}

export interface CategoryMatch {
  id: string;
  categoryId: string;
  categoryName: string;
  kickoff: string | null; // ISO
  venue: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  broadcastId: string | null;
}

export interface FixtureMatch {
  id: string;
  roundId: string;
  roundLabel: string;
  tournamentId: string;
  home: Club;
  away: Club;
  isSolerMatch: boolean;
  categories: CategoryMatch[];
}

export interface MatchSummary {
  id: string;
  tournamentName: string;
  categoryName: string;
  roundLabel: string;
  home: Club;
  away: Club;
  homeScore: number | null;
  awayScore: number | null;
  kickoff: string | null;
  venue: string | null;
  status: MatchStatus;
  hasBroadcast: boolean;
}

export interface StandingRow {
  position: number;
  club: Club;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number | null;
  points: number;
  isSoler: boolean;
}

export interface Broadcast {
  id: string;
  status: BroadcastStatus;
  matchId: string;
  tournamentName: string;
  categoryName: string;
  home: Club;
  away: Club;
  kickoff: string | null;
  streamUrl: string | null;
  /** URL embebible si el proveedor lo permite; si no, se usa streamUrl en pestaña nueva. */
  embedUrl?: string | null;
}

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string | null;
  href: string | null;
  order: number;
}

export interface GalleryImage {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface FixtureCategory {
  id: string;
  categoryId: string;
  categoryName: string;
  kickoff: string | null;
  venue: string | null;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  broadcastId: string | null;
}

export interface FixtureClash {
  id: string;
  roundId: string;
  roundLabel: string;
  tournamentId: string;
  home: Club;
  away: Club;
  isSoler: boolean;
  categories: FixtureCategory[];
}

export interface FixtureRound {
  id: string;
  label: string;
  order: number;
  published: boolean;
  matches: FixtureClash[];
}

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'unavailable';

export class ApiError extends Error {
  kind: ApiErrorKind;
  status?: number;
  constructor(message: string, kind: ApiErrorKind = 'http', status?: number) {
    super(message);
    this.kind = kind;
    this.status = status;
  }
}
