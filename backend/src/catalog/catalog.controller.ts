import { Controller, Get, Query, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

/** Lectura pública: torneos, categorías y clubes. */
@Controller()
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('tournaments')
  tournaments(@Query('season') season?: string) {
    return this.catalog.tournaments(season);
  }

  @Get('tournaments/:slug')
  tournament(@Param('slug') slug: string) {
    return this.catalog.tournamentDetail(slug);
  }

  @Get('categories')
  categories(@Query('tournament') tournament: string) {
    return this.catalog.categories(tournament);
  }

  @Get('clubs')
  clubs() {
    return this.catalog.clubs();
  }
}
