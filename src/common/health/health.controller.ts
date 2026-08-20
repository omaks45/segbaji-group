import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { MailService } from '../../modules/mail/mail.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  @ApiOperation({ summary: 'Checks database, Redis, mail, and Cloudinary connectivity' })
  @Get()
  async check(@Res() res: Response) {
    const [dbOk, redisOk, mailOk, cloudinaryOk] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.mail.verifyConnection(),
      this.cloudinary.verifyConnection(),
    ]);

    const healthy = dbOk && redisOk && mailOk && cloudinaryOk;

    res.status(healthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: healthy ? 'ok' : 'degraded',
      database: dbOk ? 'up' : 'down',
      redis: redisOk ? 'up' : 'down',
      mail: mailOk ? 'up' : 'down',
      cloudinary: cloudinaryOk ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    });
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return await this.redis.ping();
    } catch {
      return false;
    }
  }
}