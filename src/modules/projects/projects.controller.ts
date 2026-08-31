import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query,
  UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';
import { ReorderProjectImagesDto } from './dto/reorder-project-images.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { ProjectAdminQueryDto } from './dto/project-admin-query.dto';
import { imageUploadOptions } from '../../common/upload/image-upload.options';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

const IMAGE_BODY_SCHEMA = {
  schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
};

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @ApiOperation({ summary: 'List published projects — filter by category/state/featured, paginated, public' })
  @Get()
  findAll(@Query() query: ProjectQueryDto) {
    return this.projectsService.findAll(query);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all projects (any status) with image counts — admin' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('admin')
  findAllForAdmin(@Query() query: ProjectAdminQueryDto) {
    return this.projectsService.findAllForAdmin(query);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get full project detail for editing (any status, includes contractValue) — admin' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('admin/:id')
  findOneForAdmin(@Param('id') id: string) {
    return this.projectsService.findOneForAdmin(id);
  }

  @ApiOperation({ summary: 'Get a project detail page by slug — public' })
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.projectsService.findBySlug(slug);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a project' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Reorder projects (affects public display order)' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch('reorder')
  reorder(@Body() dto: ReorderProjectsDto) {
    return this.projectsService.reorder(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a project, including status, featured flag, and publish state' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Upload/replace a project's cover image" })
  @ApiConsumes('multipart/form-data')
  @ApiBody(IMAGE_BODY_SCHEMA)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post(':id/cover-image')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions()))
  uploadCoverImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded — field name must be "file"');
    return this.projectsService.updateCoverImage(id, file);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Add an image to the project gallery' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' }, caption: { type: 'string' } },
    },
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post(':id/images')
  @UseInterceptors(FileInterceptor('file', imageUploadOptions()))
  addImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
  ) {
    if (!file) throw new BadRequestException('No file uploaded — field name must be "file"');
    return this.projectsService.addImage(id, file, caption);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Reorder a project's gallery images" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id/images/reorder')
  reorderImages(@Param('id') id: string, @Body() dto: ReorderProjectImagesDto) {
    return this.projectsService.reorderImages(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a project gallery image' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Delete(':id/images/:imageId')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.projectsService.removeImage(id, imageId);
  }
}