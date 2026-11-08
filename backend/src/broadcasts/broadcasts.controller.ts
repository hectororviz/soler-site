import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { IsString, IsOptional } from 'class-validator';
import { BroadcastsService } from './broadcasts.service';
import { AdminGuard } from '../auth/admin.guard';

class BroadcastDto {
  @IsString() categoryMatchId!: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() streamUrl?: string;
  @IsOptional() @IsString() embedUrl?: string;
}

@Controller()
export class BroadcastsController {
  constructor(private readonly broadcasts: BroadcastsService) {}

  @Get('broadcasts/live')
  live() {
    return this.broadcasts.live();
  }

  @Get('broadcasts')
  list(@Query('scope') scope?: string) {
    return this.broadcasts.list(scope);
  }
}

@UseGuards(AdminGuard)
@Controller('admin')
export class AdminBroadcastsController {
  constructor(private readonly broadcasts: BroadcastsService) {}

  @Post('broadcasts')
  create(@Body() dto: BroadcastDto) {
    return this.broadcasts.create(dto);
  }

  @Patch('broadcasts/:id')
  update(@Param('id') id: string, @Body() dto: Partial<BroadcastDto>) {
    return this.broadcasts.update(id, dto);
  }
}
