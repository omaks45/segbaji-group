import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { APP_VERSION } from '../../common/constants/app-version.constant';

@Injectable()
export class SystemInfoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getInfo() {
    const [dbSizeRow, userCount, propertyCount, projectCount, clientCount, dbOk, redisOk] = await Promise.all([
      this.prisma.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) as size`,
      this.prisma.user.count(),
      this.prisma.property.count(),
      this.prisma.project.count(),
      this.prisma.client.count(),
      this.checkDatabase(),
      this.redis.ping().catch(() => false),
    ]);

    return {
      apiVersion: APP_VERSION,
      nodeEnv: process.env.NODE_ENV ?? 'development',
      databaseStatus: dbOk ? 'up' : 'down',
      redisStatus: redisOk ? 'up' : 'down',
      databaseSize: dbSizeRow[0]?.size ?? 'unknown',
      recordCounts: { users: userCount, properties: propertyCount, projects: projectCount, clients: clientCount },
      serverTime: new Date(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}