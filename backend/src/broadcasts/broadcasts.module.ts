import { Module } from '@nestjs/common';
import { BroadcastsService } from './broadcasts.service';
import { BroadcastsController, AdminBroadcastsController } from './broadcasts.controller';

@Module({
  controllers: [BroadcastsController, AdminBroadcastsController],
  providers: [BroadcastsService],
})
export class BroadcastsModule {}
