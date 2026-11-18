/**
 * Contenido del flyer construido SIEMPRE desde datos reales del fixture.
 * Nada se inventa: equipos, escudos, horarios y sede vienen del cruce.
 */
import { clubCrest } from '../../services/api';
import type { FixtureClash, FixtureRound } from '../../types';
import type { FlyerContent } from './types';

export interface ContentClubInput {
  name: string;
  shortName: string;
  crestUrl?: string | null;
  crestPath?: string | null;
}

export interface ContentCategoryInput {
  categoryName: string;
  kickoff: string | null;
  venue?: string | null;
}

function timeShort(iso: string | null): string {
  if (!iso) return 'A confirmar';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'A confirmar';
  return new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
}

function dayTexts(roundDate: string | null | undefined, kickoffs: (string | null)[]): { title: string; subtitle: string } {
  const raw = roundDate ?? kickoffs.find((k) => k && !Number.isNaN(new Date(k).getTime())) ?? null;
  if (!raw) return { title: 'DÍA A CONFIRMAR', subtitle: 'Horarios sujetos a cambios' };
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { title: 'DÍA A CONFIRMAR', subtitle: 'Horarios sujetos a cambios' };
  const title = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
    .format(d)
    .toUpperCase();
  const subtitle = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  return { title, subtitle };
}

function crestOf(club: ContentClubInput): string | null {
  return clubCrest({ crestUrl: club.crestUrl ?? null, crestPath: club.crestPath ?? null });
}

function mainVenue(categories: ContentCategoryInput[]): string | null {
  const counts = new Map<string, number>();
  for (const c of categories) {
    const v = (c.venue ?? '').trim();
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
}

export function buildContent(args: {
  tournamentName: string;
  roundLabel: string;
  roundDate?: string | null;
  home: ContentClubInput;
  away: ContentClubInput;
  categories: ContentCategoryInput[];
}): FlyerContent {
  const sorted = [...args.categories].sort((a, b) => {
    const ta = a.kickoff ? new Date(a.kickoff).getTime() : Number.POSITIVE_INFINITY;
    const tb = b.kickoff ? new Date(b.kickoff).getTime() : Number.POSITIVE_INFINITY;
    if (ta !== tb) return ta - tb;
    return a.categoryName.localeCompare(b.categoryName, 'es');
  });
  const { title, subtitle } = dayTexts(args.roundDate ?? null, sorted.map((c) => c.kickoff));
  return {
    tournamentName: args.tournamentName,
    roundLabel: args.roundLabel,
    dayTitle: title,
    daySubtitle: subtitle,
    homeName: args.home.shortName || args.home.name,
    homeCrest: crestOf(args.home),
    awayName: args.away.shortName || args.away.name,
    awayCrest: crestOf(args.away),
    venue: mainVenue(sorted),
    rows: sorted.map((c) => ({ category: c.categoryName, time: timeShort(c.kickoff) })),
  };
}

export function contentFromPublicRound(tournamentName: string, round: FixtureRound, clash: FixtureClash): FlyerContent {
  return buildContent({
    tournamentName,
    roundLabel: round.label,
    roundDate: round.date ?? null,
    home: { name: clash.home.name, shortName: clash.home.shortName, crestUrl: clash.home.crestUrl, crestPath: clash.home.crestPath },
    away: { name: clash.away.name, shortName: clash.away.shortName, crestUrl: clash.away.crestUrl, crestPath: clash.away.crestPath },
    categories: clash.categories.map((c) => ({ categoryName: c.categoryName, kickoff: c.kickoff, venue: c.venue })),
  });
}
