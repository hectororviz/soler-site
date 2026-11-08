import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { FixturesModule } from './fixtures/fixtures.module';
import { BroadcastsModule } from './broadcasts/broadcasts.module';
import { ContentModule } from './content/content.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    FixturesModule,
    BroadcastsModule,
    ContentModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
