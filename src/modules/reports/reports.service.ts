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

  /**
   * "projectsCompleted" and "pendingProjects" are REMOVED here — both
   * depended on Project.status/completedAt, which no longer exist since
   * Project is now a pure title+description+category+media gallery with no
   * lifecycle tracking. There's no clean substitute: isPublished is a
   * draft/live toggle, not a project-progress state, so mapping it onto
   * "pending" would misrepresent what it means. If you want a
   * published-vs-draft count somewhere, say so and I'll add it back under
   * an honestly-named field rather than reusing "pending".
   */
  private async computeSummary(range: DateRange) {
    const prior = priorPeriod(range);

    const [
      quoteRequestsNow, quoteRequestsPrior,
      projectsCreatedNow, projectsCreatedPrior,
      revenueNow, revenuePrior,
    ] = await Promise.all([
      this.prisma.quoteRequest.count({ where: { createdAt: { gte: range.start, lt: range.end } } }),
      this.prisma.quoteRequest.count({ where: { createdAt: { gte: prior.start, lt: prior.end } } }),
      this.prisma.project.count({ where: { createdAt: { gte: range.start, lt: range.end } } }),
      this.prisma.project.count({ where: { createdAt: { gte: prior.start, lt: prior.end } } }),
      this.computeRevenue(range),
      this.computeRevenue(prior),
    ]);

    return {
      totalQuoteRequests: { value: quoteRequestsNow, percentChange: percentChange(quoteRequestsNow, quoteRequestsPrior) },
      projectsCreated: { value: projectsCreatedNow, percentChange: percentChange(projectsCreatedNow, projectsCreatedPrior) },
      totalRevenue: {
        value: revenueNow.propertySales,
        percentChange: percentChange(revenueNow.propertySales, revenuePrior.propertySales),
      },
    };
  }

  /**
   * Revenue is now Property-sales-only. Project no longer carries a
   * contractValue-recognition timestamp (completedAt is gone), and per
   * your call, construction contract value isn't part of this KPI going
   * forward. Property still has no `soldAt` field, so `updatedAt` remains
   * the same approximation as before — flagged, not presented as exact.
   */
  private async computeRevenue(range: DateRange) {
    const propertyRevenue = await this.prisma.property.aggregate({
      where: { availabilityStatus: 'SOLD', updatedAt: { gte: range.start, lt: range.end } },
      _sum: { price: true },
    });
    return {
      propertySales: propertyRevenue._sum.price ?? 0,
    };
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

  /** Property-sales-only now, for the same reason as computeRevenue() above. */
  async getRevenueOverTime(query: ReportsQueryDto) {
    const range = this.range(query);
    return this.redis.getOrSetJson(this.cacheKey('revenue-over-time', range), CACHE_TTL_SECONDS, async () => {
      const properties = await this.prisma.property.findMany({
        where: { availabilityStatus: 'SOLD', updatedAt: { gte: range.start, lt: range.end } },
        select: { updatedAt: true, price: true },
      });
      const entries = properties.map((p) => ({ date: p.updatedAt, value: p.price }));
      return this.bucketByWeek(entries);
    });
  }

  /**
   * JUDGMENT CALL: previously grouped by Project.status (removed).
   * Repurposed to group by isPublished — the only lifecycle-adjacent field
   * left on Project — since a "breakdown by state" of some kind seemed
   * more useful to keep than to delete outright. The response shape
   * changed from { status: string, count } to { isPublished: boolean,
   * count }, so your frontend's chart for this needs updating regardless
   * of which fix you'd picked. If this isn't useful, tell me and I'll
   * remove the endpoint/method entirely instead.
   */
  async getProjectsByStatus(query: ReportsQueryDto) {
    const range = this.range(query);
    return this.redis.getOrSetJson(this.cacheKey('projects-by-status', range), CACHE_TTL_SECONDS, async () => {
      const grouped = await this.prisma.project.groupBy({
        by: ['isPublished'],
        where: { createdAt: { gte: range.start, lt: range.end } },
        _count: true,
      });
      return grouped.map((g) => ({ isPublished: g.isPublished, count: g._count }));
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

  /**
   * JUDGMENT CALL: previously grouped by Project.state (removed — location
   * data no longer exists on Project at all). Repurposed to group by
   * category, the only remaining Project taxonomy field. Method name kept
   * as-is to avoid also renaming the route, but the response shape changed
   * from { state, count, percentage } to { category, count, percentage } —
   * your frontend's chart needs updating either way. If a location-based
   * breakdown genuinely still matters to you, that data no longer exists
   * anywhere on Project and would need a field added back deliberately —
   * say so rather than assuming this repurposing covers it.
   */
  async getProjectsByLocation(query: ReportsQueryDto) {
    const range = this.range(query);
    return this.redis.getOrSetJson(this.cacheKey('projects-by-location', range), CACHE_TTL_SECONDS, async () => {
      const grouped = await this.prisma.project.groupBy({
        by: ['category'],
        where: { createdAt: { gte: range.start, lt: range.end } },
        _count: true,
        orderBy: { _count: { category: 'desc' } },
      });
      const total = grouped.reduce((sum, g) => sum + g._count, 0);
      return grouped.map((g) => ({
        category: g.category,
        count: g._count,
        percentage: total === 0 ? 0 : Math.round((g._count / total) * 1000) / 10,
      }));
    });
  }

  /** Deliberately NOT cached — an activity feed showing 5-minute-stale
   * "recent" items would defeat its own purpose. It's also cheap
   * (4 small queries, small limits), unlike the aggregations above.
   * PROJECT_COMPLETED activity type removed — no completedAt to source it from. */
  async getRecentActivity(query: ReportsQueryDto) {
    const range = this.range(query);

    const [quoteRequests, projectsCreated, newClients, newTeamMembers] = await Promise.all([
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
      // entry.value is a Prisma Decimal for property prices — Number()
      // converts it for safe addition (Decimal + number doesn't type-check,
      // and won't arithmetically add correctly either).
      sums.set(key, (sums.get(key) ?? 0) + Number(entry.value));
    }
    return [...sums.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
  }
}