import type { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

/**
 * BullMQ requires maxRetriesPerRequest: null on its Redis connection —
 * a hard library requirement, incompatible with RedisService's client
 * (deliberately fast-failing for health checks). Separate connection,
 * same REDIS_URL.
 */
export function buildBullConnection(config: ConfigService): ConnectionOptions {
    return {
        ...parseRedisUrl(config.get<string>('redis.url')!),
        maxRetriesPerRequest: null,
    };
}

function parseRedisUrl(url: string) {
    const parsed = new URL(url);
    return {
        host: parsed.hostname,
        port: Number(parsed.port || 6379),
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
}