import { Controller, Post, Patch, Delete, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { FixturesService } from './fixtures.service';
import { AdminGuard } from '../auth/admin.guard';

class MatchdayDto {
  @IsString() tournamentId!: string;
  @IsString() label!: string;
  @IsOptional() order?: number;
  @IsOptional() @IsString() date?: string;
}
class MatchdayUpdateDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() date?: string | null;
}
class FixtureMatchDto {
  @IsString() homeClubId!: string;
  @IsString() awayClubId!: string;
}
class CategoryMatchDto {
  @IsOptional() @IsString() kickoff?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsString() status?: string;
}
class PublishDto {
  @IsBoolean() published!: boolean;
}

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminFixturesController {
  constructor(private readonly fixtures: FixturesService) {}

  @Get('matchdays')
  adminMatchdays(@Query('tournament') tournament: string) {
    return this.fixtures.adminMatchdays(tournament);
  }

  @Get('matchdays/:id')
  adminMatchday(@Param('id') id: string) {
    return this.fixtures.adminMatchday(id);
  }

  @Post('matchdays')
  createMatchday(@Body() dto: MatchdayDto) {
    const data: any = { tournamentId: dto.tournamentId, label: dto.label, order: dto.order ?? 0 };
    if (dto.date) data.date = new Date(dto.date);
    return this.fixtures.createMatchday(data.tournamentId, data.label, data.order, data.date);
  }

  @Patch('matchdays/:id')
  updateMatchday(@Param('id') id: string, @Body() dto: MatchdayUpdateDto) {
    return this.fixtures.updateMatchday(id, dto);
  }

  @Post('matchdays/:id/matches')
  createMatch(@Param('id') id: string, @Body() dto: FixtureMatchDto) {
    return this.fixtures.createFixtureMatch(id, dto.homeClubId, dto.awayClubId);
  }

  @Patch('matches/:id/status')
  setMatchStatus(@Param('id') id: string, @Body() dto: CategoryMatchDto) {
    return this.fixtures.updateFixtureMatchStatus(id, dto.status!);
  }

  @Delete('matches/:id')
  removeMatch(@Param('id') id: string) {
    return this.fixtures.removeFixtureMatch(id);
  }

  @Post('tournaments/:id/fixture/second-leg')
  secondLeg(@Param('id') id: string) {
    return this.fixtures.generateSecondLeg(id);
  }

  @Patch('matchdays/:id/publish')
  publish(@Param('id') id: string, @Body() dto: PublishDto) {
    return this.fixtures.publishMatchday(id, dto.published);
  }

  @Patch('category-matches/:id')
  updateCategoryMatch(@Param('id') id: string, @Body() dto: CategoryMatchDto) {
    return this.fixtures.updateCategoryMatch(id, dto);
  }
}
