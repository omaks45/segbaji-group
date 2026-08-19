import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly jwt: JwtService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing bearer token');
        }

        try {
        const payload = this.jwt.verify(authHeader.slice(7));
        (request as Request & { user: unknown }).user = payload;
        return true;
        } catch {
        throw new UnauthorizedException('Invalid or expired token');
        }
    }
}