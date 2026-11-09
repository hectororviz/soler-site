import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicClub } from '../catalog/club-mapper';
import { fetchAll } from './supabase.client';

/** Torneo propio -> ligas de origen (solo zonas donde juega Soler). */
const LEAGUES: Record<string, string[]> = {
  'futbol-femenino': ['Fútbol Femenino - Viernes - Grupo 4'],
  'juveniles-domingos': ['Liga de Fútbol Infantil - Domingo Super Liga'],
  'juveniles-sabados': ['Liga de Fútbol Infantil - Sábados zona "A"'],
};

/** Nombre de categoría en el origen -> nombre en nuestro torneo. */
const CATEGORY_OVERRIDE: Record<string, string> = {
  'SUB 9': 'Sub-9',
  'SUB 11': 'Sub-11',
  'SUB 13': 'Sub-13',
  'SUB 15': 'Sub-15',
  'SUB 17': 'Sub-17',
  '1° FEM': 'Primera',
  DAMAS: 'Damas',
  '2020': '2020/21',
};

const CLUB_ALIAS: Record<string, string> = {
  'Deportivo Soler': 'Club Social y Deportivo Soler',
  'Dep. Soler': 'Club Social y Deportivo Soler',
  'Def. Soler': 'Club Social y Deportivo Soler',
  'Torino JR': 'Torino',
  'El Torino': 'Torino',
  'Mundialito Camp': 'Mundialito',
  'Fátima': 'Fatima',
  'Dep. La Quinta': 'La Quinta',
  'Baby Olivos': 'Deportivo Baby Olivos',
  Malvinense: 'Deportivo Malvinense',
  'Malvinense JR': 'Deportivo Malvinense',
  'Dep. Guadalupe': 'Guadalupe JR',
  'Deportivo VM': 'Deportivo Villa de Mayo',
  'Unión Vecinal VM': 'Unión Vecinal Villa de Mayo',
  'SF Los Olivos': 'Sociedad de Fomento Los Olivos',
  'SF El Ombú': 'El Ombu',
  'Huracanes VDM': 'Huracanes de VDM',
  'D. Barrio Olivos': 'Dep. Barrio Olivos',
  Barca: 'El Barca FC',
  'Dep Polvorines': 'Dep. Polvorines',
};

function norm(s: string): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
}

function stripFem(name: string): string {
  return name.replace(/\s+FEM\s*$/i, '').trim();
}

function slugify(value: string): string {
  return value.toLowerCase().trim().normalize('NFD').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
}

const isSolerClub = (c: any) =>
  c && [c.slug, c.shortName, c.name].some((v: string) => v?.toLowerCase().includes('soler'));

interface SrcLeague { id: string; name: string }
interface SrcCategory { id: string; name: string; sort_order: number }
interface SrcTeam { id: string; name: string; short_name: string | null; logo_url: string | null }
interface SrcMatch {
  id: string; category_id: string; local_team_id: string | null; away_team_id: string | null;
  matchday: number; match_date: string | null; venue: string | null; status: string;
  local_goals: number | null; away_goals: number | null;
}

@Injectable()
export class SupabaseResultsService {
  constructor(private readonly prisma: PrismaService) {}

  private async load(tournamentSlug?: string) {
    const tournaments = await this.prisma.tournament.findMany({ include: { categories: true } });
    const wanted = tournamentSlug ? tournaments.filter((t) => t.slug === tournamentSlug) : tournaments;
    const leagues = await fetchAll<SrcLeague>('leagues', 'select=id,name');
    const clubs = await this.prisma.club.findMany();

    const scopes: {
      tournament: (typeof tournaments)[number];
      league: SrcLeague;
      categories: Map<string, { name: string; slug: string }>;
      teams: Map<string, any>;
    }[] = [];

    for (const t of wanted) {
      for (const leagueName of LEAGUES[t.slug] ?? []) {
        const league = leagues.find((l) => l.name === leagueName);
        if (!league) continue;
        const [srcCats, srcTeams] = await Promise.all([
          fetchAll<SrcCategory>('categories', `league_id=eq.${league.id}&select=id,name,sort_order&order=sort_order`),
          fetchAll<SrcTeam>('teams', 'select=id,name,short_name,logo_url'),
        ]);
        const categories = new Map<string, { name: string; slug: string }>();
        for (const c of srcCats) {
          const ours = CATEGORY_OVERRIDE[c.name] ?? c.name;
          const slug = t.categories.find((k) => k.slug === slugify(ours))?.slug
            ?? t.categories.find((k) => k.slug === slugify(c.name))?.slug;
          if (slug) categories.set(c.id, { name: t.categories.find((k) => k.slug === slug)!.name, slug });
        }
        const teams = new Map<string, any>();
        for (const tm of srcTeams) {
          const canonical = CLUB_ALIAS[stripFem(tm.name)] ?? stripFem(tm.name);
          const club = clubs.find((c) => norm(c.name) === norm(canonical) || norm(c.shortName) === norm(canonical));
          teams.set(
            tm.id,
            club
              ? toPublicClub(club)
              : { id: `src:${tm.id}`, name: tm.name, shortName: tm.short_name || tm.name, crestUrl: tm.logo_url ?? null },
          );
        }
        scopes.push({ tournament: t, league, categories, teams });
      }
    }
    if (!scopes.length) throw new ServiceUnavailableException('Sin correspondencia con Ligas Deportivas.');
    return scopes;
  }

  private async matches(tournamentSlug?: string) {
    const scopes = await this.load(tournamentSlug);
    const out: any[] = [];
    for (const s of scopes) {
      const rows = await fetchAll<SrcMatch>(
        'matches',
        `league_id=eq.${s.league.id}&select=*&order=match_date.desc`,
      );
      for (const m of rows) {
        const cat = s.categories.get(m.category_id);
        if (!cat || m.status !== 'finalizado' || m.local_goals == null || m.away_goals == null) continue;
        const home = m.local_team_id ? s.teams.get(m.local_team_id) : null;
        const away = m.away_team_id ? s.teams.get(m.away_team_id) : null;
        if (!home || !away) continue;
        out.push({
          id: m.id,
          tournamentName: s.tournament.name,
          categoryName: cat.name,
          categorySlug: cat.slug,
          roundLabel: m.matchday ? `Fecha ${m.matchday}` : 'Fecha',
          home, away,
          homeScore: m.local_goals, awayScore: m.away_goals,
          kickoff: m.match_date, venue: m.venue || null,
          status: 'FINALIZADO', hasBroadcast: false,
        });
      }
    }
    out.sort((a, b) => new Date(b.kickoff ?? 0).getTime() - new Date(a.kickoff ?? 0).getTime());
    return out;
  }

  async results(query: { tournament?: string; category?: string; limit?: number }) {
    let rows = await this.matches(query.tournament);
    if (query.category) rows = rows.filter((r) => r.categorySlug === query.category);
    return rows.slice(0, query.limit ?? 50);
  }

  async standings(query: { tournament?: string; category?: string }) {
    if (!query.tournament) throw new ServiceUnavailableException('Indicá el torneo.');
    if (!query.category) throw new ServiceUnavailableException('Indicá la categoría.');
    const rows = await this.matches(query.tournament);
    const wanted = query.category === 'general' ? rows : rows.filter((r) => r.categorySlug === query.category);
    if (!wanted.length) return [];
    const table = new Map<string, any>();
    const row = (club: any) => {
      let r = table.get(club.id);
      if (!r) {
        r = { club, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0 };
        table.set(club.id, r);
      }
      return r;
    };
    for (const m of wanted) {
      const h = row(m.home), a = row(m.away);
      h.played++; a.played++;
      h.goalsFor += m.homeScore; h.goalsAgainst += m.awayScore;
      a.goalsFor += m.awayScore; a.goalsAgainst += m.homeScore;
      if (m.homeScore > m.awayScore) { h.won++; h.points += 3; a.lost++; }
      else if (m.homeScore < m.awayScore) { a.won++; a.points += 3; h.lost++; }
      else { h.drawn++; a.drawn++; h.points++; a.points++; }
    }
    const list = [...table.values()].map((r) => ({ ...r, goalDiff: r.goalsFor - r.goalsAgainst }));
    list.sort(
      (x, y) => y.points - x.points || y.goalDiff - x.goalDiff || y.goalsFor - x.goalsFor
        || String(x.club.name).localeCompare(String(y.club.name)),
    );
    return list.map((r, i) => ({
      position: i + 1,
      club: r.club,
      played: r.played, won: r.won, drawn: r.drawn, lost: r.lost,
      goalDiff: r.goalDiff, points: r.points,
      isSoler: !!isSolerClub(r.club),
    }));
  }
}
