import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SecurityService } from './security.service';
import { SessionResponseDto, LoginActivityResponseDto } from './dto/security-responses.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from './decorators/current-user.decorator';

@ApiTags('Security')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('auth/security')
export class SecurityController {
    constructor(private readonly securityService: SecurityService) {}

    @ApiOperation({ summary: "List the logged-in user's active sessions/devices" })
    @ApiOkResponse({ type: SessionResponseDto, isArray: true })
    @Get('sessions')
    listSessions(@CurrentUser() user: JwtPayload) {
        return this.securityService.listSessions(user.sub, user.sessionId);
    }

    @ApiOperation({ summary: 'Revoke one session (log out that specific device)' })
    @Delete('sessions/:id')
    revokeSession(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
        return this.securityService.revokeSession(user.sub, id);
    }

    @ApiOperation({ summary: 'Revoke every session except the one making this request' })
    @Post('sessions/revoke-others')
    revokeOtherSessions(@CurrentUser() user: JwtPayload) {
        return this.securityService.revokeOtherSessions(user.sub, user.sessionId);
    }

    @ApiOperation({ summary: "The logged-in user's own recent login attempts, success and failure" })
    @ApiOkResponse({ type: LoginActivityResponseDto, isArray: true })
    @Get('login-activity')
    listLoginActivity(@CurrentUser() user: JwtPayload, @Query() query: PaginationQueryDto) {
        return this.securityService.listLoginActivity(user.sub, query);
    }
}