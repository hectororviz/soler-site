import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicClub } from '../catalog/club-mapper';

const VALID = ['PROGRAMADA', 'EN_VIVO', 'FINALIZADA', 'INTERRUMPIDA'];

@Injectable()
export class BroadcastsService {
  constructor(private readonly prisma: PrismaService) {}

  live() {
    return this.prisma.broadcast.findFirst({
      where: { status: 'EN_VIVO' },
      orderBy: { createdAt: 'desc' },
      include: {
        categoryMatch: {
          include: {
            category: true,
            fixtureMatch: { include: { homeClub: true, awayClub: true, matchday: { include: { tournament: true } } } },
          },
        },
      },
    }).then((b: any) => {
      if (!b) return null;
      const cm = b.categoryMatch;
      return {
        id: b.id,
        status: b.status,
        matchId: cm.fixtureMatchId,
        tournamentName: cm.fixtureMatch.matchday.tournament.name,
        categoryName: cm.category.name,
        home: toPublicClub(cm.fixtureMatch.homeClub),
        away: toPublicClub(cm.fixtureMatch.awayClub),
        kickoff: cm.kickoff,
        streamUrl: b.streamUrl,
        embedUrl: b.embedUrl,
      };
    });
  }

  list(scope?: string) {
    if (scope === 'active') return this.prisma.broadcast.findMany({ where: { status: { in: ['PROGRAMADA', 'EN_VIVO'] } }, orderBy: { createdAt: 'desc' } });
    return this.prisma.broadcast.findMany({ orderBy: { createdAt: 'desc' }, take: 50 });
  }

  async create(data: { categoryMatchId: string; status?: string; streamUrl?: string; embedUrl?: string }) {
    const cm = await this.prisma.categoryMatch.findUnique({ where: { id: data.categoryMatchId } });
    if (!cm) throw new BadRequestException('Encuentro inexistente.');
    if (data.status && !VALID.includes(data.status)) throw new BadRequestException('Estado inválido.');
    return this.prisma.broadcast.create({ data: { ...data, status: data.status ?? 'PROGRAMADA' } });
  }

  update(id: string, data: Partial<{ status: string; streamUrl: string; embedUrl: string }>) {
    if (data.status && !VALID.includes(data.status)) throw new BadRequestException('Estado inválido.');
    return this.prisma.broadcast.update({ where: { id }, data }).catch(() => {
      throw new NotFoundException('Transmisión inexistente.');
    });
  }
}
