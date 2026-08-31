import { ReportsService } from './reports.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { RedisService } from '../../common/redis/redis.service';

function buildMockPrisma() {
  return {
    quoteRequest: { count: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    project: { count: jest.fn(), aggregate: jest.fn(), findMany: jest.fn(), groupBy: jest.fn() },
    property: { aggregate: jest.fn(), findMany: jest.fn() },
    service: { findMany: jest.fn() },
    client: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  } as unknown as PrismaService;
}

function buildMockRedis() {
  return {
    getOrSetJson: jest.fn((_key: string, _ttl: number, compute: () => Promise<unknown>) => compute()),
  } as unknown as RedisService;
}

describe('ReportsService', () => {
  let prisma: ReturnType<typeof buildMockPrisma>;
  let redis: ReturnType<typeof buildMockRedis>;
  let service: ReportsService;

  beforeEach(() => {
    prisma = buildMockPrisma();
    redis = buildMockRedis();
    service = new ReportsService(prisma, redis);
  });

  describe('getSummary — revenue combination', () => {
    it('sums construction and property-sales revenue into one total', async () => {
      (prisma.quoteRequest.count as jest.Mock).mockResolvedValue(0);
      (prisma.project.count as jest.Mock).mockResolvedValue(0);
      (prisma.project.aggregate as jest.Mock).mockResolvedValue({ _sum: { contractValue: 30000000 } });
      (prisma.property.aggregate as jest.Mock).mockResolvedValue({ _sum: { price: 20000000 } });

      const result = await service.getSummary({ preset: 'THIS_MONTH' } as never);

      expect(result.totalRevenue.value).toBe(50000000);
      expect(result.revenueBreakdown).toEqual({ construction: 30000000, propertySales: 20000000 });
    });

    it('treats a null sum (no matching rows) as 0, not null or NaN', async () => {
      (prisma.quoteRequest.count as jest.Mock).mockResolvedValue(0);
      (prisma.project.count as jest.Mock).mockResolvedValue(0);
      (prisma.project.aggregate as jest.Mock).mockResolvedValue({ _sum: { contractValue: null } });
      (prisma.property.aggregate as jest.Mock).mockResolvedValue({ _sum: { price: null } });

      const result = await service.getSummary({ preset: 'THIS_MONTH' } as never);

      expect(result.totalRevenue.value).toBe(0);
    });
  });

  describe('getSummary — caching', () => {
    it('delegates through RedisService.getOrSetJson rather than querying unconditionally', async () => {
      (prisma.quoteRequest.count as jest.Mock).mockResolvedValue(0);
      (prisma.project.count as jest.Mock).mockResolvedValue(0);
      (prisma.project.aggregate as jest.Mock).mockResolvedValue({ _sum: { contractValue: 0 } });
      (prisma.property.aggregate as jest.Mock).mockResolvedValue({ _sum: { price: 0 } });

      await service.getSummary({ preset: 'THIS_MONTH' } as never);

      expect(redis.getOrSetJson).toHaveBeenCalledWith(
        expect.stringContaining('reports:summary:'),
        300,
        expect.any(Function),
      );
    });
  });

  describe('bucketByDay / bucketByWeek — via getQuoteRequestsOverTime / getRevenueOverTime', () => {
    it('groups multiple same-day quote requests into a single bucket', async () => {
      (prisma.quoteRequest.findMany as jest.Mock).mockResolvedValue([
        { createdAt: new Date('2026-08-05T09:00:00Z') },
        { createdAt: new Date('2026-08-05T15:00:00Z') },
        { createdAt: new Date('2026-08-06T09:00:00Z') },
      ]);

      const result = await service.getQuoteRequestsOverTime({ preset: 'THIS_MONTH' } as never);

      expect(result).toEqual([
        { date: '2026-08-05', value: 2 },
        { date: '2026-08-06', value: 1 },
      ]);
    });

    it('combines project and property revenue into the same weekly bucket when they land in the same week', async () => {
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { completedAt: new Date('2026-08-03T00:00:00Z'), contractValue: 10000000 }, // Monday of that week
      ]);
      (prisma.property.findMany as jest.Mock).mockResolvedValue([
        { updatedAt: new Date('2026-08-05T00:00:00Z'), price: 5000000 }, // same week
      ]);

      const result = await service.getRevenueOverTime({ preset: 'THIS_MONTH' } as never);

      expect(result).toEqual([{ date: '2026-08-03', value: 15000000 }]);
    });
  });

  describe('getProjectsByLocation — percentage calculation', () => {
    it('computes percentages that reflect each state\'s share of the total', async () => {
      (prisma.project.groupBy as jest.Mock).mockResolvedValue([
        { state: 'Lagos', _count: 3 },
        { state: 'Ogun', _count: 1 },
      ]);

      const result = await service.getProjectsByLocation({ preset: 'THIS_MONTH' } as never);

      expect(result).toEqual([
        { state: 'Lagos', count: 3, percentage: 75 },
        { state: 'Ogun', count: 1, percentage: 25 },
      ]);
    });

    it('returns an empty array without dividing by zero when there is no data', async () => {
      (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);
      const result = await service.getProjectsByLocation({ preset: 'THIS_MONTH' } as never);
      expect(result).toEqual([]);
    });
  });

  describe('getRecentActivity', () => {
    it('merges all five activity sources into one feed, sorted newest-first', async () => {
      (prisma.quoteRequest.findMany as jest.Mock).mockResolvedValue([
        { fullName: 'Jane', createdAt: new Date('2026-08-10T10:00:00Z') },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([
        { title: 'Lekki Duplex', createdAt: new Date('2026-08-09T10:00:00Z') },
      ]);
      (prisma.project.findMany as jest.Mock).mockResolvedValueOnce([
        { title: 'Lekki Duplex', createdAt: new Date('2026-08-09T10:00:00Z') },
      ]).mockResolvedValueOnce([
        { title: 'Ikeja Office', completedAt: new Date('2026-08-12T10:00:00Z') },
      ]);
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecentActivity({ preset: 'THIS_MONTH' } as never);

      expect(result[0].type).toBe('PROJECT_COMPLETED'); // Aug 12 — most recent
      expect(result[result.length - 1].occurredAt.getTime()).toBeLessThanOrEqual(result[0].occurredAt.getTime());
    });

    it('is not cached — calls RedisService.getOrSetJson zero times', async () => {
      (prisma.quoteRequest.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.client.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRecentActivity({ preset: 'THIS_MONTH' } as never);

      expect(redis.getOrSetJson).not.toHaveBeenCalled();
    });
  });
});