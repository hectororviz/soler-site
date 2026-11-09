import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicClub } from '../catalog/club-mapper';
import { SupabaseResultsService } from '../supabase/supabase-results.service';

const isSolerClub = (c: any) =>
  c && [c.slug, c.shortName, c.name].some((v: string) => v?.toLowerCase().includes('soler'));

/**
 * Horario efectivo: el cargado por partido, o día de la fecha + hora fija
 * de la categoría ("15:00"). Devuelve ISO local sin zona para que el
 * navegador lo interprete en hora local.
 */
function effectiveKickoff(override: any, matchdayDate: any, categoryTime?: string | null): string | null {
  if (override) return override;
  if (!matchdayDate || !categoryTime) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(categoryTime);
  if (!m) return null;
  const d = new Date(matchdayDate);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(parseInt(m[1], 10))}:${m[2]}:00`;
}

const SOLER_SHORT = 'soler'; // legado: se usa isSolerClub (slug/nombre), no igualdad exacta

@Injectable()
export class FixturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ligas: SupabaseResultsService,
  ) {}

  // ---------- Matchdays ----------
  matchdays(tournamentId: string) {
    return this.prisma.matchday.findMany({
      where: { tournamentId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { matches: true } } },
    });
  }

  /** Detalle completo para administración (incluye fechas NO publicadas). */
  adminMatchdays(tournamentId: string) {
    return this.prisma.matchday.findMany({ where: { tournamentId }, ...this.detail() });
  }

  adminMatchday(id: string) {
    return this.prisma.matchday.findUnique({ where: { id }, include: this.matchInclude() });
  }

  async createMatchday(tournamentId: string, label: string, order = 0, date?: Date) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new BadRequestException('Torneo inexistente.');
    const dup = await this.prisma.matchday.findUnique({ where: { tournamentId_label: { tournamentId, label } } });
    if (dup) throw new BadRequestException('Ya existe una fecha con esa etiqueta en este torneo.');
    return this.prisma.matchday.create({ data: { tournamentId, label, order, date } });
  }

  async updateMatchday(id: string, data: { label?: string; date?: string | null }) {
    const clean: any = {};
    if (data.label !== undefined) clean.label = data.label;
    if (data.date !== undefined) clean.date = data.date ? new Date(data.date) : null;
    if (clean.date instanceof Date && Number.isNaN(clean.date.getTime())) {
      throw new BadRequestException('Fecha inválida.');
    }
    return this.prisma.matchday.update({ where: { id }, data: clean }).catch(() => {
      throw new NotFoundException('Fecha inexistente.');
    });
  }

  async publishMatchday(id: string, published: boolean) {
    return this.prisma.matchday.update({ where: { id }, data: { published } }).catch(() => {
      throw new NotFoundException('Fecha inexistente.');
    });
  }

  // ---------- FixtureMatch: enfrentamiento entre 2 clubes ----------
  /**
   * Crea el enfrentamiento y genera los encuentros por categoría habilitada.
   * Valida inscripción de ambos clubes y duplicados (spec §2.3, §3.3).
   */
  async createFixtureMatch(matchdayId: string, homeClubId: string, awayClubId: string) {
    if (homeClubId === awayClubId) throw new BadRequestException('Local y visitante deben ser distintos.');
    const matchday = await this.prisma.matchday.findUnique({
      where: { id: matchdayId },
      include: { tournament: { include: { categories: true } } },
    });
    if (!matchday) throw new NotFoundException('Fecha inexistente.');

    const parts = await this.prisma.tournamentParticipant.findMany({
      where: { tournamentId: matchday.tournamentId, clubId: { in: [homeClubId, awayClubId] } },
    });
    if (parts.length !== 2) throw new BadRequestException('Ambos clubes deben estar inscriptos en el torneo.');

    const existing = await this.prisma.fixtureMatch.findFirst({
      where: {
        matchdayId,
        OR: [
          { homeClubId, awayClubId },
          { homeClubId: awayClubId, awayClubId: homeClubId },
        ],
      },
    });
    if (existing) throw new BadRequestException('Enfrentamiento duplicado en esta fecha.');

    // Intersección de categorías habilitadas (vacío = todas).
    const byClub = new Map<string, string[]>(parts.map((p: any) => [p.clubId, p.categoryIds] as [string, string[]]));
    const home: string[] = byClub.get(homeClubId) ?? [];
    const away: string[] = byClub.get(awayClubId) ?? [];
    const all = matchday.tournament.categories.map((c: any) => c.id);
    const enabled = all.filter(
      (id: any) => (home.length === 0 || home.includes(id)) && (away.length === 0 || away.includes(id)),
    );
    if (!enabled.length) throw new BadRequestException('Los clubes no comparten categorías habilitadas.');

    return this.prisma.fixtureMatch.create({
      data: {
        matchdayId,
        homeClubId,
        awayClubId,
        categories: { create: enabled.map((categoryId: any) => ({ categoryId })) },
      },
      include: { categories: { include: { category: true } }, homeClub: true, awayClub: true },
    });
  }

  removeFixtureMatch(id: string) {
    return this.prisma.fixtureMatch.delete({ where: { id } }).catch(() => {
      throw new NotFoundException('Cruce inexistente.');
    });
  }

  /** Marca todo el cruce (todos sus encuentros por categoría). */
  async updateFixtureMatchStatus(id: string, status: string) {
    if (!['PROGRAMADO', 'PROXIMO', 'EN_VIVO', 'FINALIZADO', 'SUSPENDIDO'].includes(status)) {
      throw new BadRequestException('Estado inválido.');
    }
    const m = await this.prisma.fixtureMatch.findUnique({ where: { id } });
    if (!m) throw new NotFoundException('Cruce inexistente.');
    await this.prisma.categoryMatch.updateMany({ where: { fixtureMatchId: id }, data: { status } });
    return this.prisma.fixtureMatch.findUnique({
      where: { id },
      include: { homeClub: true, awayClub: true, categories: { include: { category: true, broadcasts: true } } },
    });
  }

  // ---------- Segunda rueda: espeja las fechas existentes ----------
  /**
   * Genera la segunda rueda espejando las fechas actuales del torneo
   * (local/visitante invertidos, misma cantidad de fechas).
   * Copia la sede de cada encuentro; horario y estado arrancan frescos.
   * No toca las fechas existentes.
   */
  async generateSecondLeg(tournamentId: string) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new NotFoundException('Torneo inexistente.');
    const days = await this.prisma.matchday.findMany({
      where: { tournamentId },
      orderBy: { order: 'asc' },
      include: { matches: { orderBy: { createdAt: 'asc' }, include: { categories: true } } },
    });
    if (!days.length) throw new BadRequestException('No hay fechas para espejar.');
    let maxNum = 0;
    for (const d of days) {
      const m = /^Fecha\s+(\d+)/i.exec(d.label);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    let maxOrder = Math.max(...days.map((d) => d.order));
    const createdIds: string[] = [];
    for (const d of days) {
      maxNum += 1;
      maxOrder += 1;
      const label = /^Fecha\s+\d+/i.test(d.label)
        ? d.label.replace(/^Fecha\s+\d+/i, `Fecha ${maxNum}`)
        : `${d.label} (Vuelta)`;
      const next = await this.prisma.matchday.create({ data: { tournamentId, label, order: maxOrder } });
      for (const m of d.matches) {
        const mirrored = await this.createFixtureMatch(next.id, m.awayClubId, m.homeClubId);
        for (const cm of (mirrored as any).categories ?? []) {
          const src = m.categories.find((c) => c.categoryId === cm.categoryId);
          if (src?.venue) {
            await this.prisma.categoryMatch.update({ where: { id: cm.id }, data: { venue: src.venue } });
          }
        }
      }
      createdIds.push(next.id);
    }
    return this.prisma.matchday.findMany({ where: { id: { in: createdIds } }, ...this.detail() });
  }

  async updateCategoryMatch(id: string, data: { kickoff?: string; venue?: string; status?: string }) {
    if (data.status && !['PROGRAMADO', 'PROXIMO', 'EN_VIVO', 'FINALIZADO', 'SUSPENDIDO'].includes(data.status)) {
      throw new BadRequestException('Estado inválido.');
    }
    return this.prisma.categoryMatch
      .update({
        where: { id },
        data: {
          kickoff: data.kickoff ? new Date(data.kickoff) : undefined,
          venue: data.venue,
          status: data.status,
        },
      })
      .catch(() => {
        throw new NotFoundException('Encuentro inexistente.');
      });
  }

  // ---------- Lectura pública (solo fechas publicadas) ----------
  private shape(matchday: any, participantClubs: any[] = [], solerFirst = false) {
    const matches = (matchday.matches ?? []).map((m: any) => ({
      id: m.id,
      roundId: matchday.id,
      roundLabel: matchday.label,
      tournamentId: matchday.tournamentId,
      home: toPublicClub(m.homeClub),
      away: toPublicClub(m.awayClub),
      isSoler: isSolerClub(m.homeClub) || isSolerClub(m.awayClub),
      categories: (m.categories ?? []).map((c: any) => ({
        id: c.id,
        categoryId: c.categoryId,
        categoryName: c.category?.name ?? c.categoryId,
        kickoff: effectiveKickoff(c.kickoff, (matchday as any).date, c.category?.kickoffTime),
        venue: c.venue,
        status: c.status,
        homeScore: null, // el marcador oficial vive en Ligas Deportivas (Etapa 3)
        awayScore: null,
        broadcastId: c.broadcasts?.[0]?.id ?? null,
      })),
    }));
    if (solerFirst) matches.sort((a: any, b: any) => Number(b.isSoler) - Number(a.isSoler));
    // Libre: inscriptos que no juegan en esta fecha (torneos con cantidad impar).
    const playing = new Set<string>();
    for (const m of matchday.matches ?? []) {
      if (m.homeClubId) playing.add(m.homeClubId);
      if (m.awayClubId) playing.add(m.awayClubId);
    }
    const libre = participantClubs.filter((c: any) => !playing.has(c.id)).map(toPublicClub);
    return { id: matchday.id, label: matchday.label, order: matchday.order, published: matchday.published, matches, libre };
  }

  private matchInclude() {
    return {
      matches: {
        include: {
          homeClub: true,
          awayClub: true,
          categories: { include: { category: true, broadcasts: true } },
        },
      },
    } as const;
  }

  private detail() {
    return {
      include: this.matchInclude(),
      orderBy: { order: 'asc' as const },
    };
  }

  async publicFixture(tournamentSlug?: string, categorySlug?: string) {
    const where: any = { published: true };
    if (tournamentSlug) {
      const t = await this.prisma.tournament.findUnique({ where: { slug: tournamentSlug } });
      if (!t) throw new NotFoundException('Torneo inexistente.');
      where.tournamentId = t.id;
    }
    const days = await this.prisma.matchday.findMany({ where, ...this.detail() });
    const tids = [...new Set(days.map((d) => d.tournamentId))];
    const parts = tids.length
      ? await this.prisma.tournamentParticipant.findMany({
          where: { tournamentId: { in: tids } },
          include: { club: true },
        })
      : [];
    const byT = new Map<string, any[]>();
    for (const p of parts) {
      if (!byT.has(p.tournamentId)) byT.set(p.tournamentId, []);
      byT.get(p.tournamentId)!.push(p.club);
    }
    let shaped = days.map((d: any) => this.shape(d, byT.get(d.tournamentId) ?? [], true));
    if (categorySlug) {
      shaped = shaped
        .map((d: any) => ({
          ...d,
          matches: d.matches
            .map((m: any) => ({ ...m, categories: m.categories.filter((c: any) => c.categoryId === categorySlug || c.categoryName === categorySlug) }))
            .filter((m: any) => m.categories.length > 0),
        }))
        .filter((d: any) => d.matches.length > 0);
    }
    return shaped;
  }

  async upcoming(limit = 6) {
    const days = await this.prisma.matchday.findMany({
      where: { published: true },
      include: { tournament: true, ...this.matchInclude() },
      orderBy: { order: 'asc' },
    });
    const out: any[] = [];
    for (const d of days) {
      for (const m of this.shape(d, [], true).matches) {
        if (!isSolerClub(m.home) && !isSolerClub(m.away)) continue;
        const cats = m.categories.filter(
          (c: any) => ['PROGRAMADO', 'PROXIMO'].includes(c.status) && c.kickoff,
        );
        if (!cats.length) continue;
        const kickoffs = cats.map((c: any) => c.kickoff).sort();
        out.push({
          id: m.id,
          tournamentName: (d as any).tournament?.name ?? d.label,
          roundLabel: d.label,
          home: m.home,
          away: m.away,
          kickoff: kickoffs[0],
          venue: cats.find((c: any) => c.venue)?.venue ?? null,
          categoryCount: cats.length,
          status: cats.some((c: any) => c.status === 'PROXIMO') ? 'PROXIMO' : 'PROGRAMADO',
          hasBroadcast: cats.some((c: any) => c.broadcastId),
        });
      }
    }
    out.sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    return out.slice(0, limit);
  }

  // ---------- Resultados y posiciones: fuente Supabase Ligas Deportivas ----------
  results(query: { tournament?: string; category?: string; limit?: number } = {}) {
    return this.ligas.results(query);
  }
  standings(query: { tournament?: string; category?: string } = {}) {
    return this.ligas.standings(query);
  }
}
