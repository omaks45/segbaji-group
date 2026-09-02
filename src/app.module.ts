import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { envValidationSchema } from './common/config/env.validation';
import configuration from './common/config/app-config';
import { PrismaModule } from './common/prisma/prisma.module';
import { RedisModule } from './common/redis/redis.module';
import { MailModule } from './modules/mail/mail.module';
import { HealthModule } from './common/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { UsersModule } from './modules/user/user.module';
import { RolesModule } from './modules/roles/roles.module';
import { ServicesModule } from './modules/services/services.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { TeamMembersModule } from './modules/team-member/team-member.module';
import { QuoteRequestsModule } from './modules/quote-requests/quote-requests.module';
import { ContactMessagesModule } from './modules/contact-message/contact-message.module';
import { SiteSettingsModule } from './modules/site-settings/site-settings.module';
import { CoreValuesModule } from './modules/core-values/core-values.module';
import { SiteStatsModule } from './modules/site-stats/site-stats.module';
import { SeoMetaModule } from './modules/seo-meta/seo-meta.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BullModule } from '@nestjs/bullmq';
import { buildBullConnection } from './common/queue/bullmq-connection.factory';
import { SystemInfoModule } from './modules/system-info/system-info.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      load: [configuration],
    }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 60 }], // generous default: 60 req/min per IP
    }),
        BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: buildBullConnection(config),
      }),
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RolesModule,
    DepartmentsModule,
    ServicesModule,
    CloudinaryModule,
    TeamMembersModule,
    QuoteRequestsModule,
    ContactMessagesModule,
    ServicesModule,
    SiteStatsModule,
    SiteSettingsModule,
    CoreValuesModule,
    SeoMetaModule,
    ProjectsModule,
    PropertiesModule,
    ReportsModule,
    DashboardModule,
    SystemInfoModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}