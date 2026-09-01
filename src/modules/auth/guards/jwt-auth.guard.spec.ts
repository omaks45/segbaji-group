import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { ExecutionContext } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../../../common/prisma/prisma.service';

function mockContext(authHeader: string | undefined) {
    const request: Record<string, unknown> = { headers: { authorization: authHeader } };
    return {
        switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    }

    describe('JwtAuthGuard', () => {
    let jwt: JwtService;
    let prisma: PrismaService;
    let guard: JwtAuthGuard;

    beforeEach(() => {
        jwt = { verify: jest.fn() } as unknown as JwtService;
        prisma = {
        session: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
        } as unknown as PrismaService;
        guard = new JwtAuthGuard(jwt, prisma);
    });

    it('rejects a request with no bearer header', async () => {
        await expect(guard.canActivate(mockContext(undefined))).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a token that fails signature/expiry verification', async () => {
        (jwt.verify as jest.Mock).mockImplementation(() => { throw new Error('expired'); });
        await expect(guard.canActivate(mockContext('Bearer bad'))).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a valid JWT whose session has been revoked', async () => {
        (jwt.verify as jest.Mock).mockReturnValue({ sub: 'u1', sessionId: 's1' });
        (prisma.session.findUnique as jest.Mock).mockResolvedValue({
        id: 's1', revokedAt: new Date(), expiresAt: new Date(Date.now() + 100000),
        });
        await expect(guard.canActivate(mockContext('Bearer good'))).rejects.toThrow(UnauthorizedException);
    });

    it('rejects a valid JWT whose session has expired', async () => {
        (jwt.verify as jest.Mock).mockReturnValue({ sub: 'u1', sessionId: 's1' });
        (prisma.session.findUnique as jest.Mock).mockResolvedValue({
        id: 's1', revokedAt: null, expiresAt: new Date(Date.now() - 1000),
        });
        await expect(guard.canActivate(mockContext('Bearer good'))).rejects.toThrow(UnauthorizedException);
    });

    it('rejects when the session no longer exists at all', async () => {
        (jwt.verify as jest.Mock).mockReturnValue({ sub: 'u1', sessionId: 'gone' });
        (prisma.session.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(guard.canActivate(mockContext('Bearer good'))).rejects.toThrow(UnauthorizedException);
    });

    it('allows a valid, unrevoked, unexpired session and bumps lastUsedAt', async () => {
        (jwt.verify as jest.Mock).mockReturnValue({ sub: 'u1', sessionId: 's1' });
        (prisma.session.findUnique as jest.Mock).mockResolvedValue({
        id: 's1', revokedAt: null, expiresAt: new Date(Date.now() + 100000),
        });

        const context = mockContext('Bearer good');
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(prisma.session.update).toHaveBeenCalledWith({
        where: { id: 's1' }, data: { lastUsedAt: expect.any(Date) },
        });
    });
});