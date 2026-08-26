import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TeamMembersService } from './team-member.service';
import { TeamMemberQueryDto } from './dto/team-member-query.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';
import { PaginatedTeamMembersDto, TeamMemberSummaryDto } from './dto/team-member-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Team Members')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('team-members')
export class TeamMembersController {
  constructor(private readonly teamMembersService: TeamMembersService) {}

  @ApiOperation({ summary: 'Total/Active/Inactive/Pending team member counts' })
  @ApiOkResponse({ type: TeamMemberSummaryDto })
  @RequirePermissions(PERMISSIONS.TEAM_READ)
  @Get('summary')
  summary() {
    return this.teamMembersService.findSummary();
  }

  @ApiOperation({ summary: 'List team members — filter by role/department/status/search, paginated' })
  @ApiOkResponse({ type: PaginatedTeamMembersDto })
  @RequirePermissions(PERMISSIONS.TEAM_READ)
  @Get()
  findAll(@Query() query: TeamMemberQueryDto) {
    return this.teamMembersService.findAll(query);
  }

  @ApiOperation({ summary: "Get a single team member's detail" })
  @RequirePermissions(PERMISSIONS.TEAM_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.teamMembersService.findOne(id);
  }

  @ApiOperation({ summary: 'Reassign department/role, or activate/deactivate a team member' })
  @RequirePermissions(PERMISSIONS.TEAM_WRITE)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTeamMemberDto,
    @CurrentUser() currentUser: JwtPayload,
  ) {
    return this.teamMembersService.update(id, dto, currentUser.sub);
  }

  @ApiOperation({ summary: 'Resend an invite email to a still-pending team member' })
  @RequirePermissions(PERMISSIONS.TEAM_WRITE)
  @Post(':id/resend-invite')
  resendInvite(@Param('id') id: string) {
    return this.teamMembersService.resendInvite(id);
  }
}