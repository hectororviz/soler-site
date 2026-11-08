import { Injectable, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicClub } from '../catalog/club-mapper';

const isSolerClub = (c: any) =>
  c && [c.slug, c.shortName, c.name].some((v: string) => v?.toLowerCase().includes('soler'));

const SOLER_SHORT = 'soler'; // legado: se usa isSolerClub (slug/nombre), no igualdad exacta

@Injectable()
export class FixturesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async createMatchday(tournamentId: string, label: string, order = 0) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new BadRequestException('Torneo inexistente.');
    const dup = await this.prisma.matchday.findUnique({ where: { tournamentId_label: { tournamentId, label } } });
    if (dup) throw new BadRequestException('Ya existe una fecha con esa etiqueta en este torneo.');
    return this.prisma.matchday.create({ data: { tournamentId, label, order } });
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
        kickoff: c.kickoff,
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
    let shaped = days.map((d: any) => this.shape(d, byT.get(d.tournamentId) ?? []));
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
    const days = await this.prisma.matchday.findMany({ where: { published: true }, ...this.detail() });
    const out: any[] = [];
    for (const d of days) {
      for (const m of this.shape(d, [], true).matches) {
        for (const c of m.categories) {
          if (['PROGRAMADO', 'PROXIMO'].includes(c.status)) {
            out.push({
              id: `${m.id}:${c.id}`,
              tournamentName: d.label,
              categoryName: c.categoryName,
              roundLabel: d.label,
              home: m.home,
              away: m.away,
              homeScore: null,
              awayScore: null,
              kickoff: c.kickoff,
              venue: c.venue,
              status: c.status === 'PROXIMO' ? 'PROXIMO' : 'PROGRAMADO',
              hasBroadcast: !!c.broadcastId,
            });
            if (out.length >= limit) return out;
          }
        }
      }
    }
    return out;
  }

  // ---------- Resultados y posiciones: fuente Ligas Deportivas (Etapa 3) ----------
  results() {
    throw new ServiceUnavailableException(
      'Integración con Ligas Deportivas pendiente (Etapa 3). No se muestran resultados inventados.',
    );
  }
  standings() {
    throw new ServiceUnavailableException(
      'Integración con Ligas Deportivas pendiente (Etapa 3). No se muestran posiciones inventadas.',
    );
  }
}
