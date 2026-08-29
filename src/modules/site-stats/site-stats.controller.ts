import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteStatsService } from './site-stats.service';
import { UpdateSiteStatsDto } from './dto/update-site-stat.dto';
import { SiteStatsResponseDto } from './dto/site-stats-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

@ApiTags('Site Stats')
@Controller('site-stats')
export class SiteStatsController {
  constructor(private readonly siteStatsService: SiteStatsService) {}

  @ApiOperation({ summary: 'Get the trust-indicator stats shown on Home/About — public' })
  @ApiOkResponse({ type: SiteStatsResponseDto })
  @Get()
  find() {
    return this.siteStatsService.find();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update the trust-indicator stats' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch()
  update(@Body() dto: UpdateSiteStatsDto) {
    return this.siteStatsService.update(dto);
  }
}