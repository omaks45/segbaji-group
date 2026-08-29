import { Body, Controller, Get, Param, ParseEnumPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SeoMetaService } from './seo-meta.service';
import { UpsertSeoMetaDto } from './dto/upsert-seo-meta.dto';
import { SeoMetaResponseDto } from './dto/seo-meta-response.dto';
import { PageKey } from '../../generated/prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

@ApiTags('SEO Meta')
@Controller('seo-meta')
export class SeoMetaController {
  constructor(private readonly seoMetaService: SeoMetaService) {}

  @ApiOperation({ summary: 'List SEO metadata for every configured page — public' })
  @ApiOkResponse({ type: SeoMetaResponseDto, isArray: true })
  @Get()
  findAll() {
    return this.seoMetaService.findAll();
  }

  @ApiOperation({ summary: 'Get SEO metadata for one page — public' })
  @ApiParam({ name: 'pageKey', enum: PageKey })
  @ApiOkResponse({ type: SeoMetaResponseDto })
  @Get(':pageKey')
  findOne(@Param('pageKey', new ParseEnumPipe(PageKey)) pageKey: PageKey) {
    return this.seoMetaService.findOne(pageKey);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Set SEO metadata for one page' })
  @ApiParam({ name: 'pageKey', enum: PageKey })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':pageKey')
  upsert(
    @Param('pageKey', new ParseEnumPipe(PageKey)) pageKey: PageKey,
    @Body() dto: UpsertSeoMetaDto,
  ) {
    return this.seoMetaService.upsert(pageKey, dto);
  }
}