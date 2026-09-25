import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface JwtPayload {
    sub: string;
    role: string | null;
    permissions: string[];
    sessionId: string;
    departmentId: string | null;
    isTeamLead: boolean;
}

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): JwtPayload => {
        return ctx.switchToHttp().getRequest().user;
    },
);