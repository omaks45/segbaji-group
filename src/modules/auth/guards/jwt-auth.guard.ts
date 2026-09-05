import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { TokenValidatorService } from '../token-validator.service';
import type { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(private readonly tokenValidator: TokenValidatorService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing bearer token');
        }

        const payload = await this.tokenValidator.validate(authHeader.slice(7));
        (request as Request & { user: JwtPayload }).user = payload;
        return true;
    }
}