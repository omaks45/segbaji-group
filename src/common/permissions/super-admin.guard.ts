import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtPayload } from '../../modules/auth/decorators/current-user.decorator';

/**
 * Stricter than PermissionsGuard: requires the literal "*" permission,
 * not just a "*:write"-style resource wildcard. Used only for Role
 * management — editing another role's permissions is a direct
 * privilege-escalation path if left to the general wildcard check that
 * every other MANAGE-tier action relies on.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request & { user: JwtPayload }>();
        const granted = request.user?.permissions ?? [];
        if (!granted.includes('*')) {
        throw new ForbiddenException('This action requires Super Admin access');
        }
        return true;
    }
}