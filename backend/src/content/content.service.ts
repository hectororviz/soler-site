import { BadRequestException, Injectable } from '@nestjs/common';
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

  gallery() {
    return this.prisma.galleryImage.findMany({ where: { active: true }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  }
  allGallery() {
    return this.prisma.galleryImage.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] });
  }
  async createGalleryImage(data: { imagePath: string; caption?: string; order?: number; albumId?: string }) {
    if (data.albumId) {
      const album = await this.prisma.galleryAlbum.findUnique({ where: { id: data.albumId } });
      if (!album) throw new BadRequestException('Álbum inexistente.');
    }
    return this.prisma.galleryImage.create({ data });
  }
  async updateGalleryImage(id: string, data: Partial<{ caption: string | null; order: number; active: boolean; albumId: string | null }>) {
    if (data.albumId !== undefined && data.albumId !== null) {
      const album = await this.prisma.galleryAlbum.findUnique({ where: { id: data.albumId } });
      if (!album) throw new BadRequestException('Álbum inexistente.');
    }
    return this.prisma.galleryImage.update({ where: { id }, data });
  }
  deleteGalleryImage(id: string) {
    return this.prisma.galleryImage.delete({ where: { id } });
  }

  // ---- Álbumes de galería ----
  galleryAlbums() {
    return this.prisma.galleryAlbum.findMany({
      where: { active: true },
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { images: { where: { active: true }, orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] } },
    });
  }
  allGalleryAlbums() {
    return this.prisma.galleryAlbum.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      include: { images: { orderBy: [{ order: 'asc' }, { createdAt: 'desc' }] } },
    });
  }
  async galleryPublic() {
    const [albums, loose] = await Promise.all([
      this.galleryAlbums(),
      this.prisma.galleryImage.findMany({
        where: { active: true, albumId: null },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);
    return { albums, loose };
  }
  createGalleryAlbum(data: { title: string; body?: string; order?: number }) {
    return this.prisma.galleryAlbum.create({ data });
  }
  async updateGalleryAlbum(id: string, data: Partial<{ title: string; body: string | null; coverImageId: string | null; order: number; active: boolean }>) {
    if (data.coverImageId !== undefined && data.coverImageId !== null) {
      const img = await this.prisma.galleryImage.findUnique({ where: { id: data.coverImageId } });
      if (!img || img.albumId !== id) {
        throw new BadRequestException('La portada debe ser una foto del álbum.');
      }
    }
    return this.prisma.galleryAlbum.update({ where: { id }, data });
  }
  deleteGalleryAlbum(id: string) {
    // Las fotos pasan a sueltas (FK con ON DELETE SET NULL).
    return this.prisma.galleryAlbum.delete({ where: { id } });
  }
}
