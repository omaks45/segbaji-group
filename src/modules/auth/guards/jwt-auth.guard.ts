import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwt: JwtService,
        private readonly prisma: PrismaService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing bearer token');
        }

        let payload: JwtPayload;
        try {
        payload = this.jwt.verify(authHeader.slice(7));
        } catch {
        throw new UnauthorizedException('Invalid or expired token');
        }

        // Real-time revocation check on every guarded request — the
        // access token's own short expiry (checked above by jwt.verify)
        // and the session's revocation/expiry are two different clocks
        // serving two different purposes: one caps how long a stolen
        // token works on its own; this one lets a device be killed
        // instantly, regardless of how much of the access token's life
        // is left.
        const session = await this.prisma.session.findUnique({ where: { id: payload.sessionId } });
        if (!session || session.revokedAt || session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session has been revoked or expired');
        }

        // Fire-and-forget — a slow/failed write here shouldn't delay or
        // fail the actual request.
        void this.prisma.session
        .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});

        (request as Request & { user: JwtPayload }).user = payload;
        return true;
    }
}