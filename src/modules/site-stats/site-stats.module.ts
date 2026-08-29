import { Module } from '@nestjs/common';
import { SiteStatsService } from './site-stats.service';
import { SiteStatsController } from './site-stats.controller';

@Module({
  controllers: [SiteStatsController],
  providers: [SiteStatsService],
})
export class SiteStatsModule {}
