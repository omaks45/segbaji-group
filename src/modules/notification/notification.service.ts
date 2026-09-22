import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationType } from '../../generated/prisma/client';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { NotificationsQueryDto } from './dto/notification-query.dto';

interface NotifyInput {
  recipientIds: string[];
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Core fan-out: creates one Notification row per recipient. Callers
   * (QuoteRequestsService, ContactMessagesService, MessagingService,
   * TasksService) resolve WHO should be notified using their own existing
   * logic — e.g. TasksService already has notifyDepartmentLeads()'s
   * recipient-lookup query; this service doesn't duplicate that, it just
   * takes the resolved list of recipientIds and does the actual writing +
   * (once wired to a gateway) the live push.
   *
   * Deliberately fire-and-forget from the caller's side, same pattern as
   * your existing task-assignment email notifications — a notification
   * failure should never fail the action that triggered it (creating a
   * quote request, sending a message, etc).
   */
  async notifyUsers(input: NotifyInput): Promise<void> {
    if (!input.recipientIds.length) return;

    try {
      const rows = await this.prisma.notification.createManyAndReturn({
        data: input.recipientIds.map((recipientId) => ({
          recipientId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link,
        })),
      });

      // Live push happens here once wired to a gateway — see the note in
      // the accompanying message about NotificationsGateway. Left as a
      // clear extension point rather than guessed at, since it needs to
      // match your actual messaging.gateway.ts auth/room pattern exactly.
      // for (const row of rows) {
      //   this.gateway.pushToUser(row.recipientId, row);
      // }
    } catch (err) {
      this.logger.error(`Failed to create notifications: ${(err as Error).message}`);
    }
  }

  async findMine(userId: string, query: NotificationsQueryDto) {
    const where = {
      recipientId: userId,
      ...(query.unreadOnly === 'true' && { isRead: false }),
    };

    const [items, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { recipientId: userId, isRead: false } }),
    ]);

    return { items, unreadCount, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { recipientId: userId, isRead: false } });
    return { count };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, recipientId: userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    return { message: 'All notifications marked as read' };
  }
}