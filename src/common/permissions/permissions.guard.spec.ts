import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, jest } from '@jest/globals';
import { PermissionsGuard } from './permissions.guard';

function mockContext(
    userPermissions: string[] | undefined,
    required: string[] | undefined,
    ) {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(required);
    const context = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
        getRequest: () => ({ user: { permissions: userPermissions } }),
        }),
    } as unknown as ExecutionContext;
    return { reflector, context };
    }

    describe('PermissionsGuard', () => {
    it('allows the request when the route has no @RequirePermissions', () => {
        const { reflector, context } = mockContext(undefined, undefined);
        expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
    });

    it('allows a user with the exact required permission', () => {
        const { reflector, context } = mockContext(
        ['departments:write'],
        ['departments:write'],
        );
        expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
    });

    it('allows a user with the "*" wildcard regardless of what is required', () => {
        const { reflector, context } = mockContext(['*'], ['departments:write']);
        expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
    });

    it('allows a user with a "*:action" resource wildcard matching the required action', () => {
        const { reflector, context } = mockContext(
        ['*:write'],
        ['departments:write'],
        );
        expect(new PermissionsGuard(reflector).canActivate(context)).toBe(true);
    });

    it('rejects a user missing the required permission', () => {
        const { reflector, context } = mockContext(
        ['content:read'],
        ['departments:write'],
        );
        expect(() => new PermissionsGuard(reflector).canActivate(context)).toThrow(
        ForbiddenException,
        );
    });

    it('rejects a user with no permissions at all', () => {
        const { reflector, context } = mockContext(undefined, [
        'departments:write',
        ]);
        expect(() => new PermissionsGuard(reflector).canActivate(context)).toThrow(
        ForbiddenException,
        );
    });
});