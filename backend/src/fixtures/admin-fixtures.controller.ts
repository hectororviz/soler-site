import { Controller, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { FixturesService } from './fixtures.service';
import { AdminGuard } from '../auth/admin.guard';

class MatchdayDto {
  @IsString() tournamentId!: string;
  @IsString() label!: string;
  @IsOptional() order?: number;
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

  @Post('matchdays')
  createMatchday(@Body() dto: MatchdayDto) {
    return this.fixtures.createMatchday(dto.tournamentId, dto.label, dto.order ?? 0);
  }

  @Post('matchdays/:id/matches')
  createMatch(@Param('id') id: string, @Body() dto: FixtureMatchDto) {
    return this.fixtures.createFixtureMatch(id, dto.homeClubId, dto.awayClubId);
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
