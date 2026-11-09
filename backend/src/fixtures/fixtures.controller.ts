import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { FixturesService } from './fixtures.service';

@Controller()
export class FixturesController {
  constructor(private readonly fixtures: FixturesService) {}

  @Get('fixtures')
  fixture(@Query('torneo') torneo?: string, @Query('categoria') categoria?: string) {
    return this.fixtures.publicFixture(torneo, categoria);
  }

  @Get('fixtures/upcoming')
  upcoming(@Query('limit', new ParseIntPipe({ optional: true })) limit = 6) {
    return this.fixtures.upcoming(Math.min(limit, 20));
  }

  @Get('results')
  results(
    @Query('torneo') torneo?: string,
    @Query('categoria') categoria?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ) {
    return this.fixtures.results({ tournament: torneo, category: categoria, limit: Math.min(limit, 100) });
  }

  @Get('standings')
  standings(@Query('torneo') torneo?: string, @Query('categoria') categoria?: string) {
    return this.fixtures.standings({ tournament: torneo, category: categoria });
  }

  @Get('tournaments/:slug/fixture')
  byTournament(@Param('slug') slug: string, @Query('categoria') categoria?: string) {
    return this.fixtures.publicFixture(slug, categoria);
  }
}
