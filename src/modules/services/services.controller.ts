import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ServicesService } from './services.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ReorderServicesDto } from './dto/reorder-services.dto';
import { CreateServiceFeatureDto } from './dto/create-service-feature.dto';
import { UpdateServiceFeatureDto } from './dto/update-service-feature.dto';
import { ReorderServiceFeaturesDto } from './dto/reorder-service-features.dto';
import {
  ServiceAdminResponseDto, ServiceDetailResponseDto, ServiceResponseDto,
} from './dto/service-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

@ApiTags('Services')
@Controller('services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @ApiOperation({ summary: 'List active services (for dropdowns) — public' })
  @ApiOkResponse({ type: ServiceResponseDto, isArray: true })
  @Get()
  findAll() {
    return this.servicesService.findAll();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all services with feature counts — admin' })
  @ApiOkResponse({ type: ServiceAdminResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('admin')
  findAllForAdmin() {
    return this.servicesService.findAllForAdmin();
  }

  @ApiOperation({ summary: 'Get a service detail page by slug — public' })
  @ApiOkResponse({ type: ServiceDetailResponseDto })
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.servicesService.findBySlug(slug);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a service' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post()
  create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Reorder services (affects public display order)' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch('reorder')
  reorder(@Body() dto: ReorderServicesDto) {
    return this.servicesService.reorder(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a service, including activating/deactivating it' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Upload/replace a service's hero image" })
  @ApiConsumes('multipart/form-data')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post(':id/hero-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(new BadRequestException('File must be an image'), false);
        }
        callback(null, true);
      },
    }),
  )
  uploadHeroImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded — field name must be "file"');
    return this.servicesService.updateHeroImage(id, file);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add a sub-service/feature to a service' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post(':id/features')
  addFeature(@Param('id') id: string, @Body() dto: CreateServiceFeatureDto) {
    return this.servicesService.addFeature(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Reorder a service's features" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id/features/reorder')
  reorderFeatures(@Param('id') id: string, @Body() dto: ReorderServiceFeaturesDto) {
    return this.servicesService.reorderFeatures(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a sub-service/feature' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id/features/:featureId')
  updateFeature(
    @Param('id') id: string,
    @Param('featureId') featureId: string,
    @Body() dto: UpdateServiceFeatureDto,
  ) {
    return this.servicesService.updateFeature(id, featureId, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a sub-service/feature' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Delete(':id/features/:featureId')
  removeFeature(@Param('id') id: string, @Param('featureId') featureId: string) {
    return this.servicesService.removeFeature(id, featureId);
  }
}