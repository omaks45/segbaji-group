import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import type { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

@Injectable()
export class SecurityService {
    constructor(private readonly prisma: PrismaService) {}

    async listSessions(userId: string, currentSessionId: string) {
        const sessions = await this.prisma.session.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { lastUsedAt: 'desc' },
        });
        return sessions.map((s) => ({
        id: s.id,
        userAgent: s.userAgent,
        ipAddress: s.ipAddress,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        isCurrent: s.id === currentSessionId,
        }));
    }

    async revokeSession(userId: string, sessionId: string) {
        const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId } });
        if (!session) throw new NotFoundException('Session not found');
        await this.prisma.session.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
        return { message: 'Session revoked' };
    }

    async revokeOtherSessions(userId: string, currentSessionId: string) {
        await this.prisma.session.updateMany({
        where: { userId, id: { not: currentSessionId }, revokedAt: null },
        data: { revokedAt: new Date() },
        });
        return { message: 'All other sessions revoked' };
    }

    async listLoginActivity(userId: string, query: PaginationQueryDto) {
        const [items, total] = await this.prisma.$transaction([
        this.prisma.loginActivity.findMany({
            where: { userId },
            ...paginationSkipTake(query.page, query.pageSize),
            orderBy: { createdAt: 'desc' },
        }),
        this.prisma.loginActivity.count({ where: { userId } }),
        ]);
        return { items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
    }
}