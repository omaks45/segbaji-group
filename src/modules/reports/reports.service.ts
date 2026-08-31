import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import {
  DateRange, DateRangePreset, percentChange, priorPeriod, resolveDateRange,
} from '../../common/date-range/date-range.util';
import { ReportsQueryDto } from './dto/reports-query.dto';

const CACHE_TTL_SECONDS = 300; // 5 minutes — balances dashboard freshness against not recomputing on every load
const TOP_SERVICES_LIMIT = 5;
const RECENT_ACTIVITY_LIMIT = 20;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private range(query: ReportsQueryDto): DateRange {
    return resolveDateRange(query.preset, query.from, query.to);
  }

  private cacheKey(name: string, range: DateRange): string {
    return `reports:${name}:${range.start.toISOString()}:${range.end.toISOString()}`;
  }

  async getSummary(query: ReportsQueryDto) {
    const range = this.range(query);
    return this.redis.getOrSetJson(this.cacheKey('summary', range), CACHE_TTL_SECONDS, () =>
      this.computeSummary(range),
    );
  }

  private async computeSummary(range: DateRange) {
    const prior = priorPeriod(range);

    const [
      quoteRequestsNow, quoteRequestsPrior,
      projectsCreatedNow, projectsCreatedPrior,
      projectsCompletedNow, projectsCompletedPrior,
      revenueNow, revenuePrior,
      pendingNow, pendingPrior,
    ] = await Promise.all([
      this.prisma.quoteRequest.count({ where: { createdAt: { gte: range.start, lt: range.end } } }),
      this.prisma.quoteRequest.count({ where: { createdAt: { gte: prior.start, lt: prior.end } } }),
      this.prisma.project.count({ where: { createdAt: { gte: range.start, lt: range.end } } }),
      this.prisma.project.count({ where: { createdAt: { gte: prior.start, lt: prior.end } } }),
      this.prisma.project.count({ where: { completedAt: { gte: range.start, lt: range.end } } }),
      this.prisma.project.count({ where: { completedAt: { gte: prior.start, lt: prior.end } } }),
      this.computeRevenue(range),
      this.computeRevenue(prior),
      this.pendingAsOf(range.end),
      this.pendingAsOf(prior.end),
    ]);

    return {
      totalQuoteRequests: { value: quoteRequestsNow, percentChange: percentChange(quoteRequestsNow, quoteRequestsPrior) },
      projectsCreated: { value: projectsCreatedNow, percentChange: percentChange(projectsCreatedNow, projectsCreatedPrior) },
      projectsCompleted: { value: projectsCompletedNow, percentChange: percentChange(projectsCompletedNow, projectsCompletedPrior) },
      totalRevenue: {
        value: revenueNow.construction + revenueNow.propertySales,
        percentChange: percentChange(
          revenueNow.construction + revenueNow.propertySales,
          revenuePrior.construction + revenuePrior.propertySales,
        ),
      },
      revenueBreakdown: revenueNow,
      pendingProjects: { value: pendingNow, percentChange: percentChange(pendingNow, pendingPrior) },
    };
  }

  /**
   * Revenue = completed-project contract values (recognized at
   * completion, not creation) + sold-property prices. Property has no
   * `soldAt` field, so `updatedAt` stands in as an approximation of
   * "when this was marked sold" — imprecise if a sold listing is edited
   * again later for an unrelated reason. Flagged rather than presented
   * as exact; a real `soldAt` timestamp is the honest fix if this KPI's
   * precision ever matters more than it does right now.
   */
  private async computeRevenue(range: DateRange) {
    const [projectRevenue, propertyRevenue] = await Promise.all([
      this.prisma.project.aggregate({
        where: { completedAt: { gte: range.start, lt: range.end } },
        _sum: { contractValue: true },
      }),
      this.prisma.property.aggregate({
        where: { availabilityStatus: 'SOLD', updatedAt: { gte: range.start, lt: range.end } },
        _sum: { price: true },
      }),
    ]);
    return {
      construction: projectRevenue._sum.contractValue ?? 0,
      propertySales: propertyRevenue._sum.price ?? 0,
    };
  }

  /**
   * Reconstructs "how many projects were pending as of `date`" without
   * a status-history table: a project counts as pending at that moment
   * if it existed by then, was never cancelled, and either never
   * completed or completed after that moment.
   */
  private async pendingAsOf(date: Date): Promise<number> {
    return this.prisma.project.count({
      where: {
        createdAt: { lte: date },
        status: { not: 'CANCELLED' },
        OR: [{ completedAt: null }, { completedAt: { gt: date } }],
      },
    });
  }

  async getQuoteRequestsOverTime(query: ReportsQueryDto) {
    const range = this.range(query);
    return this.redis.getOrSetJson(this.cacheKey('quote-requests-over-time', range), CACHE_TTL_SECONDS, async () => {
      const rows = await this.prisma.quoteRequest.findMany({
        where: { createdAt: { gte: range.start, lt: range.end } },
        select: { createdAt: true },
      });
      return this.bucketByDay(rows.map((r) => r.createdAt));
    });
  }

  async getRevenueOverTime(query: ReportsQueryDto) {
    const range = this.range(query);
    return this.redis.getOrSetJson(this.cacheKey('revenue-over-time', range), CACHE_TTL_SECONDS, async () => {
      const [projects, properties] = await Promise.all([
        this.prisma.project.findMany({
          where: { completedAt: { gte: range.start, lt: range.end } },
          select: { completedAt: true, contractValue: true },
        }),
        this.prisma.property.findMany({
          where: { availabilityStatus: 'SOLD', updatedAt: { gte: range.start, lt: range.end } },
          select: { updatedAt: true, price: true },
        }),
      ]);

      const entries = [
        ...projects.map((p) => ({ date: p.completedAt!, value: p.contractValue ?? 0 })),
        ...properties.map((p) => ({ date: p.updatedAt, value: p.price })),
      ];
      return this.bucketByWeek(entries);
    });
  }

  async getProjectsByStatus(query: ReportsQueryDto) {
    const range = this.range(query);
    return this.redis.getOrSetJson(this.cacheKey('projects-by-status', range), CACHE_TTL_SECONDS, async () => {
      const grouped = await this.prisma.project.groupBy({
        by: ['status'],
        where: { createdAt: { gte: range.start, lt: range.end } },
        _count: true,
      });
      return grouped.map((g) => ({ status: g.status, count: g._count }));
    });
  }

  async getTopServices(query: ReportsQueryDto) {
    const range = this.range(query);
    return this.redis.getOrSetJson(this.cacheKey('top-services', range), CACHE_TTL_SECONDS, async () => {
      const grouped = await this.prisma.quoteRequest.groupBy({
        by: ['serviceId'],
        where: { createdAt: { gte: range.start, lt: range.end } },
        _count: true,
        orderBy: { _count: { serviceId: 'desc' } },
        take: TOP_SERVICES_LIMIT,
      });

      const services = await this.prisma.service.findMany({
        where: { id: { in: grouped.map((g) => g.serviceId) } },
        select: { id: true, name: true },
      });
      const nameById = new Map(services.map((s) => [s.id, s.name]));

      return grouped.map((g) => ({
        serviceId: g.serviceId,
        serviceName: nameById.get(g.serviceId) ?? 'Unknown',
        requestCount: g._count,
      }));
    });
  }

  async getProjectsByLocation(query: ReportsQueryDto) {
    const range = this.range(query);
    return this.redis.getOrSetJson(this.cacheKey('projects-by-location', range), CACHE_TTL_SECONDS, async () => {
      const grouped = await this.prisma.project.groupBy({
        by: ['state'],
        where: { createdAt: { gte: range.start, lt: range.end } },
        _count: true,
        orderBy: { _count: { state: 'desc' } },
      });
      const total = grouped.reduce((sum, g) => sum + g._count, 0);
      return grouped.map((g) => ({
        state: g.state,
        count: g._count,
        percentage: total === 0 ? 0 : Math.round((g._count / total) * 1000) / 10,
      }));
    });
  }

  /** Deliberately NOT cached — an activity feed showing 5-minute-stale
   * "recent" items would defeat its own purpose. It's also cheap
   * (5 small queries, small limits), unlike the aggregations above. */
  async getRecentActivity(query: ReportsQueryDto) {
    const range = this.range(query);

    const [quoteRequests, projectsCreated, projectsCompleted, newClients, newTeamMembers] = await Promise.all([
      this.prisma.quoteRequest.findMany({
        where: { createdAt: { gte: range.start, lt: range.end } },
        select: { fullName: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: RECENT_ACTIVITY_LIMIT,
      }),
      this.prisma.project.findMany({
        where: { createdAt: { gte: range.start, lt: range.end } },
        select: { title: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: RECENT_ACTIVITY_LIMIT,
      }),
      this.prisma.project.findMany({
        where: { completedAt: { gte: range.start, lt: range.end } },
        select: { title: true, completedAt: true },
        orderBy: { completedAt: 'desc' }, take: RECENT_ACTIVITY_LIMIT,
      }),
      this.prisma.client.findMany({
        where: { createdAt: { gte: range.start, lt: range.end } },
        select: { fullName: true, createdAt: true },
        orderBy: { createdAt: 'desc' }, take: RECENT_ACTIVITY_LIMIT,
      }),
      this.prisma.user.findMany({
        where: { joinedAt: { gte: range.start, lt: range.end } },
        select: { fullName: true, joinedAt: true },
        orderBy: { joinedAt: 'desc' }, take: RECENT_ACTIVITY_LIMIT,
      }),
    ]);

    const items = [
      ...quoteRequests.map((q) => ({ type: 'QUOTE_REQUEST', description: `New quote request from ${q.fullName}`, occurredAt: q.createdAt })),
      ...projectsCreated.map((p) => ({ type: 'PROJECT_CREATED', description: `Project created: ${p.title}`, occurredAt: p.createdAt })),
      ...projectsCompleted.map((p) => ({ type: 'PROJECT_COMPLETED', description: `Project completed: ${p.title}`, occurredAt: p.completedAt! })),
      ...newClients.map((c) => ({ type: 'NEW_CLIENT', description: `New client: ${c.fullName}`, occurredAt: c.createdAt })),
      ...newTeamMembers.map((u) => ({ type: 'TEAM_MEMBER_ADDED', description: `${u.fullName ?? 'A team member'} joined`, occurredAt: u.joinedAt! })),
    ];

    return items
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, RECENT_ACTIVITY_LIMIT);
  }

  /** Shared bucketing logic for both time-series endpoints — one
   * implementation instead of two near-identical loops. */
  private bucketByDay(dates: Date[]): { date: string; value: number }[] {
    const counts = new Map<string, number>();
    for (const date of dates) {
      const key = date.toISOString().slice(0, 10);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  }

  private bucketByWeek(entries: { date: Date; value: number }[]): { date: string; value: number }[] {
    const sums = new Map<string, number>();
    for (const entry of entries) {
      const weekStart = new Date(entry.date);
      const daysSinceMonday = (weekStart.getDay() + 6) % 7;
      weekStart.setDate(weekStart.getDate() - daysSinceMonday);
      const key = weekStart.toISOString().slice(0, 10);
      sums.set(key, (sums.get(key) ?? 0) + entry.value);
    }
    return [...sums.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  }
}