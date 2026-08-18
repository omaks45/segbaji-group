/* eslint-disable prettier/prettier */
import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../../modules/mail/mail.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
  ) {}

  @ApiOperation({ summary: 'Checks database, Redis, and mail connectivity' })
  @Get()
  async check(@Res() res: Response) {
    const [dbOk, redisOk] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const healthy = dbOk && redisOk;
    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: healthy ? 'ok' : 'degraded',
      database: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    });
  }

  private async checkDb(): Promise<boolean> {
    try { await this.prisma.$queryRaw`SELECT 1`; return true; } catch { return false; }
  }

  private async checkRedis(): Promise<boolean> {
    try { return await this.redis.ping(); } catch { return false; }
  }
}