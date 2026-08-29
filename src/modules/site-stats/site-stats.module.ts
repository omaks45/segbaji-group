import { Module } from '@nestjs/common';
import { SiteStatsController } from './site-stats.controller';
import { SiteStatsService } from './site-stats.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [SiteStatsController],
  providers: [SiteStatsService],
})
export class SiteStatsModule {}