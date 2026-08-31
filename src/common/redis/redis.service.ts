/* eslint-disable prettier/prettier */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.client = new Redis(this.config.get<string>('REDIS_URL')!, {
      maxRetriesPerRequest: 2,
      lazyConnect: false,
    });
    this.client.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  async ping(): Promise<boolean> {
    return (await this.client.ping()) === 'PONG';
  }

  /** Used by ReportsService to avoid recomputing expensive aggregations
 * on every dashboard load. Generic on purpose — the next module that
 * needs caching reuses this instead of writing its own get/set pair. */
  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async setJson(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async getOrSetJson<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) return cached;
    const fresh = await compute();
    await this.setJson(key, fresh, ttlSeconds);
    return fresh;
  }
}