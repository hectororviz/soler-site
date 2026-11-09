import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { IsString, IsOptional, IsArray } from 'class-validator';
import { CatalogService } from './catalog.service';
import { AdminGuard } from '../auth/admin.guard';

const FILES_DIR = process.env.FILES_DIR ?? './uploads';

class SeasonDto {
  @IsString() label!: string;
}
class TournamentDto {
  @IsString() name!: string;
  @IsString() seasonId!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() externalId?: string;
}
class CategoryDto {
  @IsString() tournamentId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() externalId?: string;
  @IsOptional() @IsString() kickoffTime?: string;
}
class CategoryUpdateDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() externalId?: string;
  @IsOptional() @IsString() kickoffTime?: string;
}
class ClubDto {
  @IsString() name!: string;
  @IsString() shortName!: string;
  @IsOptional() @IsString() externalId?: string;
}
class ParticipantDto {
  @IsString() clubId!: string;
  @IsOptional() @IsArray() categoryIds?: string[];
}

/** Administración: todo bajo /admin, protegido por JWT (spec §3, §8). */
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Post('seasons') createSeason(@Body() dto: SeasonDto) {
    return this.catalog.createSeason(dto.label);
  }
  @Get('seasons') seasons() {
    return this.catalog.seasons();
  }

  @Post('tournaments') createTournament(@Body() dto: TournamentDto) {
    return this.catalog.createTournament(dto);
  }

  @Post('categories') createCategory(@Body() dto: CategoryDto) {
    return this.catalog.createCategory(dto);
  }
  @Patch('categories/:id') updateCategory(@Param('id') id: string, @Body() dto: CategoryUpdateDto) {
    return this.catalog.updateCategory(id, dto);
  }

  @Post('clubs') createClub(@Body() dto: ClubDto) {
    return this.catalog.createClub(dto);
  }
  @Patch('clubs/:id') updateClub(@Param('id') id: string, @Body() dto: Partial<ClubDto>) {
    return this.catalog.updateClub(id, dto);
  }

  @Post('clubs/crest')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = `${FILES_DIR}/crests`;
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
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadCrest(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Archivo requerido.');
    return { crestPath: `/files/crests/${file.filename}` };
  }

  @Get('tournaments/:id/participants') participants(@Param('id') id: string) {
    return this.catalog.participants(id);
  }
  @Post('tournaments/:id/participants') addParticipant(@Param('id') id: string, @Body() dto: ParticipantDto) {
    return this.catalog.addParticipant(id, dto.clubId, dto.categoryIds ?? []);
  }
  @Delete('tournaments/:id/participants/:clubId') removeParticipant(
    @Param('id') id: string,
    @Param('clubId') clubId: string,
  ) {
    return this.catalog.removeParticipant(id, clubId);
  }

  @Get('dashboard')
  async dashboard() {
    const [tournaments, clubs] = await Promise.all([
      this.catalog.tournaments(),
      this.catalog.clubs(),
    ]);
    return {
      tournaments: tournaments.length,
      clubs: clubs.length,
      // matchdays y broadcasts los aporta el módulo de fixtures.
    };
  }
}
