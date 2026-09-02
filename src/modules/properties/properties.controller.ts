import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseEnumPipe, Patch, Post, Put, Query,
  Res,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { PropertyAdminQueryDto } from './dto/property-admin-query.dto';
import { ReorderPropertyImagesDto } from './dto/reorder-property-images.dto';
import { UpsertNearbyPlaceDto } from './dto/upsert-nearby-place.dto';
import { NearbyPlaceType, Property } from '../../generated/prisma/client';
import { imageUploadOptions } from '../../common/upload/image-upload.options';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { buildTableCsv, buildTableXlsx, ExportColumn } from '../../common/export/table-export.util';
import { sendFileResponse } from '../../common/export/send-file-response.util';
import { parseExportFormat } from '../../common/export/parse-export-format.util';
import type { Response as ExpressResponse } from 'express';


const IMAGE_BODY_SCHEMA = { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } };

const PROPERTY_EXPORT_COLUMNS: ExportColumn<Property>[] = [
  { header: 'Title', value: (p) => p.title },
  { header: 'Type', value: (p) => p.propertyType },
  { header: 'Land Size', value: (p) => `${p.landSizeValue} ${p.landSizeUnit}` },
  { header: 'Price', value: (p) => p.price },
  { header: 'Price Type', value: (p) => p.priceType },
  { header: 'Negotiable', value: (p) => p.isPriceNegotiable },
  { header: 'Location', value: (p) => p.location },
  { header: 'State', value: (p) => p.state },
  { header: 'Title Type', value: (p) => p.titleType },
  { header: 'Status', value: (p) => p.availabilityStatus },
  { header: 'Created', value: (p) => p.createdAt.toISOString() },
];

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @ApiOperation({ summary: 'List available/under-offer properties — filterable, paginated, public' })
  @Get()
  findAll(@Query() query: PropertyQueryDto) {
    return this.propertiesService.findAll(query);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Total/Available/Under-Offer/Sold/Draft counts — admin' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('admin/summary')
  summary() {
    return this.propertiesService.findSummary();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all properties (any status) — admin' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('admin')
  findAllForAdmin(@Query() query: PropertyAdminQueryDto) {
    return this.propertiesService.findAllForAdmin(query);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Export properties as CSV or XLSX' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('admin/export')
  async exportProperties(@Query() query: PropertyAdminQueryDto, @Res() res: ExpressResponse) {
    const format = parseExportFormat(query.format);
    const rows = await this.propertiesService.findAllForExport(query);
    const buffer = format === 'xlsx'
      ? await buildTableXlsx(rows, PROPERTY_EXPORT_COLUMNS, 'Properties')
      : buildTableCsv(rows, PROPERTY_EXPORT_COLUMNS);
    sendFileResponse(res, buffer, 'properties-export', format);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get full property detail for editing (any status) — admin' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('admin/:id')
  findOneForAdmin(@Param('id') id: string) {
    return this.propertiesService.findOneForAdmin(id);
  }

  @ApiOperation({ summary: 'Get a property detail page by slug — public' })
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.propertiesService.findBySlug(slug);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a property' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post()
  create(@Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a property, including availability status and the features checklist' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    return this.propertiesService.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Upload/replace a property's cover image" })
  @ApiConsumes('multipart/form-data')
  @ApiBody(IMAGE_BODY_SCHEMA)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post(':id/cover-image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions()))
  uploadCoverImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded — field name must be "file"');
    return this.propertiesService.updateCoverImage(id, file);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add an image to the property gallery' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' }, caption: { type: 'string' } } } })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions()))
  addImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File, @Body('caption') caption?: string) {
    if (!file) throw new BadRequestException('No file uploaded — field name must be "file"');
    return this.propertiesService.addImage(id, file, caption);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Reorder a property's gallery images" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id/images/reorder')
  reorderImages(@Param('id') id: string, @Body() dto: ReorderPropertyImagesDto) {
    return this.propertiesService.reorderImages(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a property gallery image' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Delete(':id/images/:imageId')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.propertiesService.removeImage(id, imageId);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Set (or replace) the nearby place for a given type' })
  @ApiParam({ name: 'type', enum: NearbyPlaceType })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Put(':id/nearby-places/:type')
  upsertNearbyPlace(
    @Param('id') id: string,
    @Param('type', new ParseEnumPipe(NearbyPlaceType)) type: NearbyPlaceType,
    @Body() dto: UpsertNearbyPlaceDto,
  ) {
    return this.propertiesService.upsertNearbyPlace(id, type, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Remove the nearby place of a given type' })
  @ApiParam({ name: 'type', enum: NearbyPlaceType })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Delete(':id/nearby-places/:type')
  removeNearbyPlace(@Param('id') id: string, @Param('type', new ParseEnumPipe(NearbyPlaceType)) type: NearbyPlaceType) {
    return this.propertiesService.removeNearbyPlace(id, type);
  }


}