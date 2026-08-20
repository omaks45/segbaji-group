import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from './require-permissions.decorator';
import type { PermissionKey } from './permission.constants';
import type { JwtPayload } from '../../modules/auth/decorators/current-user.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const required = this.reflector.getAllAndOverride<PermissionKey[]>(
        PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
        );

        // Route didn't opt in via @RequirePermissions — nothing to enforce.
        // (Always run this AFTER JwtAuthGuard, which is what populates
        // request.user in the first place.)
        if (!required || required.length === 0) return true;

        const request = context
        .switchToHttp()
        .getRequest<Request & { user: JwtPayload }>();
        const granted = request.user?.permissions ?? [];

        const allowed = required.every((perm) => hasPermission(granted, perm));
        if (!allowed) {
        throw new ForbiddenException(
            `Missing required permission: ${required.join(', ')}`,
        );
        }
        return true;
    }
}

function hasPermission(granted: string[], required: string): boolean {
    if (granted.includes('*')) return true;
    if (granted.includes(required)) return true;
    const [, action] = required.split(':');
    return granted.includes(`*:${action}`);
}