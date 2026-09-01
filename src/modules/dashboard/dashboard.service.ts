import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

function summarize(grouped: { _count: number; [key: string]: unknown }[], field: string, keys: string[]) {
  const counts: Record<string, number> = {};
  keys.forEach((k) => (counts[k] = 0));
  for (const row of grouped) counts[row[field] as string] = row._count;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return { total, ...counts };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [team, quoteRequests, contactMessages, clientTotal, clientActive, properties, projects] = await Promise.all([
      this.prisma.user.groupBy({ by: ['status'], _count: true }),
      this.prisma.quoteRequest.groupBy({ by: ['status'], _count: true }),
      this.prisma.contactMessage.groupBy({ by: ['status'], _count: true }),
      this.prisma.client.count(),
      this.prisma.client.count({ where: { isActive: true } }),
      this.prisma.property.groupBy({ by: ['availabilityStatus'], _count: true }),
      this.prisma.project.groupBy({ by: ['status'], _count: true }),
    ]);

    return {
      team: summarize(team, 'status', ['PENDING', 'ACTIVE', 'INACTIVE']),
      quoteRequests: summarize(quoteRequests, 'status', ['NEW', 'CONTACTED', 'WON', 'LOST']),
      contactMessages: summarize(contactMessages, 'status', ['UNREAD', 'READ', 'RESPONDED']),
      clients: { total: clientTotal, active: clientActive, inactive: clientTotal - clientActive },
      properties: summarize(properties, 'availabilityStatus', ['AVAILABLE', 'UNDER_OFFER', 'SOLD', 'DRAFT']),
      projects: summarize(projects, 'status', ['IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED']),
    };
  }
}