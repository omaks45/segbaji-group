import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
    sub: string;
    role: string | null;
}

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): JwtPayload => {
        return ctx.switchToHttp().getRequest().user;
    },
);