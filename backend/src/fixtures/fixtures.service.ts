import { Injectable, BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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

  async createMatchday(tournamentId: string, label: string, order = 0) {
    const t = await this.prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!t) throw new BadRequestException('Torneo inexistente.');
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
    const byClub = new Map(parts.map((p) => [p.clubId, p.categoryIds]));
    const home = byClub.get(homeClubId) ?? [];
    const away = byClub.get(awayClubId) ?? [];
    const all = matchday.tournament.categories.map((c) => c.id);
    const enabled = all.filter(
      (id) => (home.length === 0 || home.includes(id)) && (away.length === 0 || away.includes(id)),
    );
    if (!enabled.length) throw new BadRequestException('Los clubes no comparten categorías habilitadas.');

    return this.prisma.fixtureMatch.create({
      data: {
        matchdayId,
        homeClubId,
        awayClubId,
        categories: { create: enabled.map((categoryId) => ({ categoryId })) },
      },
      include: { categories: { include: { category: true } }, homeClub: true, awayClub: true },
    });
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
  private shape(matchday: any, solerFirst = false) {
    const matches = (matchday.matches ?? []).map((m: any) => ({
      id: m.id,
      roundId: matchday.id,
      roundLabel: matchday.label,
      tournamentId: matchday.tournamentId,
      home: m.homeClub,
      away: m.awayClub,
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
    return { id: matchday.id, label: matchday.label, order: matchday.order, published: matchday.published, matches };
  }

  private detail() {
    return {
      include: {
        matches: {
          include: {
            homeClub: true,
            awayClub: true,
            categories: { include: { category: true, broadcasts: true } },
          },
        },
      },
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
    let shaped = days.map((d) => this.shape(d));
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
      for (const m of this.shape(d, true).matches) {
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
