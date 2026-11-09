import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicClub } from './club-mapper';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Seasons ----
  seasons() {
    return this.prisma.season.findMany({ orderBy: { label: 'desc' } });
  }
  createSeason(label: string) {
    return this.prisma.season.create({ data: { label } });
  }

  // ---- Tournaments ----
  tournaments(seasonId?: string) {
    return this.prisma.tournament.findMany({
      where: seasonId ? { seasonId } : undefined,
      include: {
        season: true,
        categories: { orderBy: { order: 'asc' } },
        _count: { select: { matchdays: { where: { published: true } } } },
      },
      orderBy: { name: 'asc' },
    });
  }
  tournamentDetail(slug: string) {
    return this.prisma.tournament.findUnique({
      where: { slug },
      include: { season: true, categories: { orderBy: { order: 'asc' } } },
    });
  }
  async createTournament(data: { name: string; seasonId: string; description?: string; externalId?: string; slug?: string }) {
    const season = await this.prisma.season.findUnique({ where: { id: data.seasonId } });
    if (!season) throw new BadRequestException('Temporada inexistente.');
    return this.prisma.tournament.create({
      data: { ...data, slug: data.slug ?? slugify(data.name) },
    });
  }

  // ---- Categories ----
  categories(tournamentId: string) {
    return this.prisma.category.findMany({ where: { tournamentId }, orderBy: { order: 'asc' } });
  }
  async createCategory(data: { tournamentId: string; name: string; slug?: string; externalId?: string; order?: number; kickoffTime?: string | null }) {
    const t = await this.prisma.tournament.findUnique({ where: { id: data.tournamentId } });
    if (!t) throw new BadRequestException('Torneo inexistente.');
    if (data.kickoffTime !== undefined && data.kickoffTime !== null && !/^\d{1,2}:\d{2}$/.test(data.kickoffTime)) {
      throw new BadRequestException('Hora inválida (formato HH:MM).');
    }
    return this.prisma.category.create({ data: { ...data, slug: data.slug ?? slugify(data.name) } });
  }
  async updateCategory(id: string, data: { name?: string; externalId?: string; kickoffTime?: string | null }) {
    if (data.kickoffTime !== undefined && data.kickoffTime !== null && data.kickoffTime !== '' && !/^\d{1,2}:\d{2}$/.test(data.kickoffTime)) {
      throw new BadRequestException('Hora inválida (formato HH:MM).');
    }
    const clean: any = { ...data };
    if (clean.kickoffTime === '') clean.kickoffTime = null;
    return this.prisma.category.update({ where: { id }, data: clean }).catch(() => {
      throw new NotFoundException('Categoría inexistente.');
    });
  }

  // ---- Clubs ----
  async clubs() {
    const rows = await this.prisma.club.findMany({ orderBy: { name: 'asc' } });
    return rows.map(toPublicClub);
  }
  async createClub(data: { name: string; shortName: string; slug?: string; externalId?: string; crestPath?: string }) {
    const row = await this.prisma.club.create({ data: { ...data, slug: data.slug ?? slugify(data.shortName) } });
    return toPublicClub(row);
  }
  async updateClub(id: string, data: Partial<{ name: string; shortName: string; externalId: string; crestPath: string }>) {
    const row = await this.prisma.club.update({ where: { id }, data }).catch(() => {
      throw new NotFoundException('Club inexistente.');
    });
    return toPublicClub(row);
  }

  // ---- Participants ----
  async participants(tournamentId: string) {
    const rows = await this.prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      include: { club: true },
      orderBy: { club: { name: 'asc' } },
    });
    return rows.map((p: any) => ({ ...p, club: toPublicClub(p.club) }));
  }
  async addParticipant(tournamentId: string, clubId: string, categoryIds: string[] = []) {
    const [t, c] = await Promise.all([
      this.prisma.tournament.findUnique({ where: { id: tournamentId } }),
      this.prisma.club.findUnique({ where: { id: clubId } }),
    ]);
    if (!t || !c) throw new BadRequestException('Torneo o club inexistente.');
    if (categoryIds.length) {
      const count = await this.prisma.category.count({ where: { id: { in: categoryIds }, tournamentId } });
      if (count !== categoryIds.length) throw new BadRequestException('Alguna categoría no pertenece al torneo.');
    }
    return this.prisma.tournamentParticipant.upsert({
      where: { tournamentId_clubId: { tournamentId, clubId } },
      create: { tournamentId, clubId, categoryIds },
      update: { categoryIds },
    });
  }
  removeParticipant(tournamentId: string, clubId: string) {
    return this.prisma.tournamentParticipant.delete({
      where: { tournamentId_clubId: { tournamentId, clubId } },
    }).catch(() => {
      throw new NotFoundException('Participante inexistente.');
    });
  }
}
