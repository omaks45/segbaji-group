import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SiteSettingsService } from './site-settings.service';
import { UpdateSiteSettingsDto } from './dto/update-site-settings.dto';
import { SiteSettingsResponseDto } from './dto/site-settings-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

@ApiTags('Site Settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @ApiOperation({ summary: 'Get contact info, socials, and mission/vision/story — public' })
  @ApiOkResponse({ type: SiteSettingsResponseDto })
  @Get()
  find(): Promise<SiteSettingsResponseDto> {
    return this.siteSettingsService.find();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update site settings' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch()
  update(@Body() dto: UpdateSiteSettingsDto): Promise<SiteSettingsResponseDto> {
    return this.siteSettingsService.update(dto);
  }
}