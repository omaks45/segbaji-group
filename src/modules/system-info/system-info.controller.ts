import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemInfoService } from './system-info.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

@ApiTags('System')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions(PERMISSIONS.REPORTS_READ)
@Controller('system-info')
export class SystemInfoController {
  constructor(private readonly systemInfoService: SystemInfoService) {}

  @ApiOperation({ summary: 'API version, DB/Redis status, database size, and record counts' })
  @Get()
  get() {
    return this.systemInfoService.getInfo();
  }
}