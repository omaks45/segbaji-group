import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'At-a-glance counts across every module — admin home screen' })
  @RequirePermissions(PERMISSIONS.REPORTS_READ)
  @Get('overview')
  overview() {
    return this.dashboardService.getOverview();
  }

  @ApiOperation({ summary: 'Polymorphic personal dashboard — content varies by role and department' })
  @Get('me')
  getMyDashboard(@CurrentUser() user: JwtPayload) {
    return this.dashboardService.getPersonalizedOverview(user);
  }
}