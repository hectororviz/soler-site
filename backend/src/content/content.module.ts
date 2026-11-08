import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import { ContentController, AdminContentController } from './content.controller';

@Module({
  controllers: [ContentController, AdminContentController],
  providers: [ContentService],
})
export class ContentModule {}
