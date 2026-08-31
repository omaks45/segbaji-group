import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { GeneratedReportsController } from './generated-reports.controller';
import { ReportsExportService } from './reports-export.service';
import { ReportsExportProcessor } from './reports-export.processor';
import { REPORTS_EXPORT_QUEUE } from '../../common/queue/queue.constants';
import { buildBullConnection } from '../../common/queue/bullmq-connection.factory';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    BullModule.registerQueueAsync({
      name: REPORTS_EXPORT_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: buildBullConnection(config),
        defaultJobOptions: { attempts: 2, removeOnComplete: 50, removeOnFail: 50 },
      }),
    }),
  ],
  controllers: [ReportsController, GeneratedReportsController],
  providers: [ReportsService, ReportsExportService, ReportsExportProcessor],
})
export class ReportsModule {}