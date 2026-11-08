import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ContentService } from './content.service';
import { AdminGuard } from '../auth/admin.guard';

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
}
