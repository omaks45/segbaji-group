import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from '@jest/globals';
import { SuperAdminGuard } from './super-admin.guard';

function mockContext(permissions: string[] | undefined): ExecutionContext {
    return {
        switchToHttp: () => ({ getRequest: () => ({ user: { permissions } }) }),
    } as unknown as ExecutionContext;
    }

    describe('SuperAdminGuard', () => {
    it('allows a user with the exact "*" permission', () => {
        expect(new SuperAdminGuard().canActivate(mockContext(['*']))).toBe(true);
    });

    it('rejects a user with only "*:write" — resource wildcard is not enough', () => {
        expect(() => new SuperAdminGuard().canActivate(mockContext(['*:write']))).toThrow(
        ForbiddenException,
        );
    });

    it('rejects a user with no permissions', () => {
        expect(() => new SuperAdminGuard().canActivate(mockContext(undefined))).toThrow(
        ForbiddenException,
        );
    });
});