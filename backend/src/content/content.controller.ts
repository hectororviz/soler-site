import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ContentService } from './content.service';
import { AdminGuard } from '../auth/admin.guard';

const FILES_DIR = process.env.FILES_DIR ?? './uploads';

class ContentDto {
  @IsString() slot!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() imagePath?: string;
}
class SponsorDto {
  @IsString() name!: string;
  @IsOptional() @IsString() logoPath?: string;
  @IsOptional() @IsString() href?: string;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
class GalleryDto {
  @IsString() imagePath!: string;
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsInt() order?: number;
}

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Get('content')
  getContent(@Query('slot') slot?: string) {
    return this.content.content(slot);
  }

  @Get('sponsors')
  sponsors() {
    return this.content.sponsors();
  }

  @Get('gallery')
  gallery() {
    return this.content.gallery();
  }
}

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminContentController {
  constructor(private readonly content: ContentService) {}

  @Post('content')
  upsert(@Body() dto: ContentDto) {
    const { slot, ...data } = dto;
    return this.content.upsertContent(slot, data);
  }

  @Get('sponsors')
  all() {
    return this.content.allSponsors();
  }
  @Post('sponsors')
  create(@Body() dto: SponsorDto) {
    return this.content.createSponsor(dto);
  }
  @Patch('sponsors/:id')
  update(@Param('id') id: string, @Body() dto: Partial<SponsorDto>) {
    return this.content.updateSponsor(id, dto);
  }
  @Delete('sponsors/:id')
  remove(@Param('id') id: string) {
    return this.content.deleteSponsor(id);
  }

  /** Subida genérica de imagen (galería, bloques, logos). */
  @Post('files')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, file, cb) => {
          const folder = /^image\/(png|jpeg|svg\+xml|webp)$/.test(file.mimetype) ? 'gallery' : 'misc';
          const dir = `${FILES_DIR}/${folder}`;
          if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (_req, file, cb) => {
          const safe = `${Date.now()}-${Math.round(Math.random() * 1e6)}${extname(file.originalname)}`;
          cb(null, safe);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!/image\/(png|jpeg|svg\+xml|webp)/.test(file.mimetype)) {
          return cb(new BadRequestException('Formato de imagen no permitido.'), false);
        }
        cb(null, true);
      },
      limits: { fileSize: 4 * 1024 * 1024 },
    }),
  )
  uploadFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo requerido.');
    const folder = file.destination.endsWith('gallery') ? 'gallery' : 'misc';
    return { imagePath: `/files/${folder}/${file.filename}` };
  }

  @Get('gallery')
  allGallery() {
    return this.content.allGallery();
  }
  @Post('gallery')
  createGallery(@Body() dto: GalleryDto) {
    return this.content.createGalleryImage(dto);
  }
  @Patch('gallery/:id')
  updateGallery(@Param('id') id: string, @Body() dto: Partial<GalleryDto & { active: boolean }>) {
    const { imagePath, ...data } = dto;
    void imagePath;
    return this.content.updateGalleryImage(id, data);
  }
  @Delete('gallery/:id')
  removeGallery(@Param('id') id: string) {
    return this.content.deleteGalleryImage(id);
  }
}
