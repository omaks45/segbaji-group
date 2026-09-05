import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from './decorators/current-user.decorator';

/**
 * The one place that answers "is this token still good right now" —
 * used by both JwtAuthGuard (REST) and WsJwtGuard (WebSocket), so the
 * two auth layers can never quietly drift into checking different
 * things. A session revoked via /auth/security/sessions/:id now kills
 * a live socket connection too, not just future REST calls.
 */
@Injectable()
export class TokenValidatorService {
    constructor(
        private readonly jwt: JwtService,
        private readonly prisma: PrismaService,
    ) {}

    async validate(rawToken: string): Promise<JwtPayload> {
        let payload: JwtPayload;
        try {
        payload = this.jwt.verify(rawToken);
        } catch {
        throw new UnauthorizedException('Invalid or expired token');
        }

        const session = await this.prisma.session.findUnique({ where: { id: payload.sessionId } });
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session has been revoked or expired');
        }

        void this.prisma.session
        .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

        return payload;
    }
}