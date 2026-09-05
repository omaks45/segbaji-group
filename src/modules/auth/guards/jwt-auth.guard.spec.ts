import { UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import type { ExecutionContext } from '@nestjs/common';
import type { TokenValidatorService } from '../token-validator.service';
import type { JwtPayload } from '../decorators/current-user.decorator';

function mockContext(authHeader: string | undefined) {
    const request: Record<string, unknown> = { headers: { authorization: authHeader } };
    return {
        switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    }

    describe('JwtAuthGuard', () => {
    let tokenValidator: TokenValidatorService;
    let guard: JwtAuthGuard;

    beforeEach(() => {
        tokenValidator = { validate: jest.fn() } as unknown as TokenValidatorService;
        guard = new JwtAuthGuard(tokenValidator);
    });

    it('rejects a request with no bearer header', async () => {
        await expect(guard.canActivate(mockContext(undefined))).rejects.toThrow(UnauthorizedException);
        expect(tokenValidator.validate).not.toHaveBeenCalled();
    });

    it('rejects a token that TokenValidatorService rejects', async () => {
        (tokenValidator.validate as jest.Mock).mockRejectedValue(new UnauthorizedException('Invalid or expired token'));
        await expect(guard.canActivate(mockContext('Bearer bad'))).rejects.toThrow(UnauthorizedException);
    });

    it('allows a valid token and attaches the payload to the request', async () => {
        const payload: JwtPayload = { sub: 'u1', sessionId: 's1', role: null, permissions: [] };
        (tokenValidator.validate as jest.Mock).mockResolvedValue(payload);

        const context = mockContext('Bearer good');
        const result = await guard.canActivate(context);

        expect(result).toBe(true);
        expect(tokenValidator.validate).toHaveBeenCalledWith('good');
    });
});