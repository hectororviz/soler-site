import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  content(slot?: string) {
    if (slot) return this.prisma.pageContent.findUnique({ where: { slot } });
    return this.prisma.pageContent.findMany();
  }
  upsertContent(slot: string, data: { title?: string; body?: string; imagePath?: string }) {
    return this.prisma.pageContent.upsert({ where: { slot }, create: { slot, ...data }, update: data });
  }

  sponsors() {
    return this.prisma.sponsor.findMany({ where: { active: true }, orderBy: { order: 'asc' } });
  }
  allSponsors() {
    return this.prisma.sponsor.findMany({ orderBy: { order: 'asc' } });
  }
  createSponsor(data: { name: string; logoPath?: string; href?: string; order?: number }) {
    return this.prisma.sponsor.create({ data });
  }
  updateSponsor(id: string, data: Partial<{ name: string; logoPath: string; href: string; order: number; active: boolean }>) {
    return this.prisma.sponsor.update({ where: { id }, data });
  }
  deleteSponsor(id: string) {
    return this.prisma.sponsor.delete({ where: { id } });
  }
}
