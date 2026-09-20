import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { hasPermission } from '../../common/permissions/has-permission.util';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';

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

  /**
   * Existing company-wide overview — unchanged except for `projects`.
   * Project no longer has a `status` enum (dropped along with location,
   * state, clientName, isFeatured, completedAt when the module was
   * simplified to a pure gallery), so there's nothing left to group by
   * there. Swapped for a simple published/draft count using the one
   * lifecycle-adjacent field that's left, isPublished — same shape
   * pattern as the existing `clients` breakdown below it.
   */
  async getOverview() {
    const [
      team, quoteRequests, contactMessages, clientTotal, clientActive,
      properties, projectsPublished, projectsDraft,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['status'], _count: true }),
      this.prisma.quoteRequest.groupBy({ by: ['status'], _count: true }),
      this.prisma.contactMessage.groupBy({ by: ['status'], _count: true }),
      this.prisma.client.count(),
      this.prisma.client.count({ where: { isActive: true } }),
      this.prisma.property.groupBy({ by: ['availabilityStatus'], _count: true }),
      this.prisma.project.count({ where: { isPublished: true } }),
      this.prisma.project.count({ where: { isPublished: false } }),
    ]);

    return {
      team: summarize(team, 'status', ['PENDING', 'ACTIVE', 'INACTIVE']),
      quoteRequests: summarize(quoteRequests, 'status', ['NEW', 'CONTACTED', 'WON', 'LOST']),
      contactMessages: summarize(contactMessages, 'status', ['UNREAD', 'READ', 'RESPONDED']),
      clients: { total: clientTotal, active: clientActive, inactive: clientTotal - clientActive },
      properties: summarize(properties, 'availabilityStatus', ['AVAILABLE', 'UNDER_OFFER', 'SOLD', 'DRAFT']),
      projects: { total: projectsPublished + projectsDraft, published: projectsPublished, draft: projectsDraft },
    };
  }

  /**
   * The polymorphic personal dashboard — ONE method, whose returned
   * `widgets` object varies based on the caller's permissions and
   * department. This is the whole answer to "what's different between
   * departments": nothing here branches on a department NAME, only on
   * what the caller's role actually grants.
   */
  async getPersonalizedOverview(user: JwtPayload) {
    const isSuperAdmin = hasPermission(user.permissions, '*');
    const canManageTasks = hasPermission(user.permissions, PERMISSIONS.TASKS_WRITE);
    const canReadTasks = canManageTasks || hasPermission(user.permissions, PERMISSIONS.TASKS_READ);
    const canReadContent = hasPermission(user.permissions, PERMISSIONS.CONTENT_READ);
    const canReadLeads = hasPermission(user.permissions, PERMISSIONS.LEADS_READ);

    const widgets: Record<string, unknown> = {
      myTasks: await this.buildMyTasksSummary(user.sub),
    };

    if (canReadTasks && user.departmentId) {
      widgets.departmentTasks = await this.buildDepartmentTasksSummary(user.departmentId);
    }
    if (canManageTasks && user.departmentId && !isSuperAdmin) {
      widgets.teamOverview = await this.buildDepartmentTeamSummary(user.departmentId);
    }
    if (canReadContent) {
      widgets.contentSummary = await this.buildContentSummary();
    }
    if (canReadLeads) {
      widgets.leadsSummary = await this.buildLeadsSummary();
    }
    if (isSuperAdmin) {
      widgets.companyOverview = await this.getOverview();
    }

    return {
      scope: isSuperAdmin ? 'COMPANY' : 'DEPARTMENT',
      departmentId: user.departmentId,
      widgets,
    };
  }

  private async buildMyTasksSummary(userId: string) {
    const grouped = await this.prisma.task.groupBy({ by: ['status'], where: { assigneeId: userId }, _count: true });
    return summarize(grouped, 'status', ['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
  }

  private async buildDepartmentTasksSummary(departmentId: string) {
    const grouped = await this.prisma.task.groupBy({
      by: ['status'],
      where: { departmentId },
      _count: true,
    });
    return summarize(grouped, 'status', ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);
  }

  private async buildDepartmentTeamSummary(departmentId: string) {
    const grouped = await this.prisma.user.groupBy({
      by: ['status'],
      where: { departmentId },
      _count: true,
    });
    return summarize(grouped, 'status', ['PENDING', 'ACTIVE', 'INACTIVE']);
  }

  private async buildContentSummary() {
    const [projects, properties, services] = await Promise.all([
      this.prisma.project.count(),
      this.prisma.property.count(),
      this.prisma.service.count(),
    ]);
    return { projects, properties, services };
  }

  private async buildLeadsSummary() {
    const [newQuoteRequests, unreadMessages] = await Promise.all([
      this.prisma.quoteRequest.count({ where: { status: 'NEW' } }),
      this.prisma.contactMessage.count({ where: { status: 'UNREAD' } }),
    ]);
    return { newQuoteRequests, unreadMessages };
  }
}