import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { ReportsQueryDto } from './dto/reports-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.REPORTS_READ)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @ApiOperation({ summary: 'KPI summary cards with period-over-period % change' })
  @Get('summary')
  summary(@Query() query: ReportsQueryDto) {
    return this.reportsService.getSummary(query);
  }

  @ApiOperation({ summary: 'Quote requests per day, for the line chart' })
  @Get('quote-requests-over-time')
  quoteRequestsOverTime(@Query() query: ReportsQueryDto) {
    return this.reportsService.getQuoteRequestsOverTime(query);
  }

  @ApiOperation({ summary: 'Project counts grouped by status, for the donut chart' })
  @Get('projects-by-status')
  projectsByStatus(@Query() query: ReportsQueryDto) {
    return this.reportsService.getProjectsByStatus(query);
  }

  @ApiOperation({ summary: 'Combined revenue per week, for the line chart' })
  @Get('revenue-over-time')
  revenueOverTime(@Query() query: ReportsQueryDto) {
    return this.reportsService.getRevenueOverTime(query);
  }

  @ApiOperation({ summary: 'Top 5 services ranked by quote request volume' })
  @Get('top-services')
  topServices(@Query() query: ReportsQueryDto) {
    return this.reportsService.getTopServices(query);
  }

  @ApiOperation({ summary: 'Project counts and percentage breakdown by state' })
  @Get('projects-by-location')
  projectsByLocation(@Query() query: ReportsQueryDto) {
    return this.reportsService.getProjectsByLocation(query);
  }

  @ApiOperation({ summary: 'Recent activity feed — quote requests, projects, clients, team joins' })
  @Get('recent-activity')
  recentActivity(@Query() query: ReportsQueryDto) {
    return this.reportsService.getRecentActivity(query);
  }
}