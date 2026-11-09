import { Module } from '@nestjs/common';
import { SupabaseResultsService } from './supabase-results.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SupabaseResultsService],
  exports: [SupabaseResultsService],
})
export class SupabaseModule {}
