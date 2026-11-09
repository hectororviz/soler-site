import { Module } from '@nestjs/common';
import { FixturesService } from './fixtures.service';
import { FixturesController } from './fixtures.controller';
import { AdminFixturesController } from './admin-fixtures.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [FixturesController, AdminFixturesController],
  providers: [FixturesService],
  exports: [FixturesService],
})
export class FixturesModule {}
