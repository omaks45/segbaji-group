import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query,
  UploadedFiles, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';
import { ReorderProjectImagesDto } from './dto/reorder-project-images.dto';
import { ReorderProjectVideosDto } from './dto/reorder-project-video.dto';
import { MediaDescriptionDto } from './dto/media-description.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { ProjectAdminQueryDto } from './dto/project-admin-query.dto';
import { imageUploadOptions } from '../../common/upload/image-upload.options';
import { videoUploadOptions } from '../../common/upload/video-upload.options';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

// Bulk-upload field is always called "files" (plural) — send 1 or many in the
// same multipart request. A single-file upload is just a bulk upload of one.
const MAX_FILES_PER_UPLOAD = 20;

const BULK_IMAGE_BODY_SCHEMA = {
  schema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description: `Up to ${MAX_FILES_PER_UPLOAD} image files in one request.`,
      },
      descriptions: {
        type: 'string',
        description:
          'Optional. A JSON-stringified array of captions, same order as "files" ' +
          '(e.g. \'["Foundation stage", "Roofing complete"]\'). Omit entirely, or ' +
          'pass fewer captions than files — any file without a matching caption is saved with no caption.',
      },
    },
    required: ['files'],
  },
};

const BULK_VIDEO_BODY_SCHEMA = {
  schema: {
    type: 'object',
    properties: {
      files: {
        type: 'array',
        items: { type: 'string', format: 'binary' },
        description: `Up to ${MAX_FILES_PER_UPLOAD} video files in one request (mp4, mov, webm, mkv).`,
      },
      descriptions: {
        type: 'string',
        description: 'Optional. Same JSON-array-of-captions convention as the image bulk-upload endpoint.',
      },
    },
    required: ['files'],
  },
};

function parseDescriptions(raw: string | undefined, fileCount: number): (string | undefined)[] {
  if (!raw) return new Array(fileCount).fill(undefined);
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Array(fileCount).fill(undefined);
    return new Array(fileCount).fill(undefined).map((_, i) => parsed[i] ?? undefined);
  } catch {
    return new Array(fileCount).fill(undefined);
  }
}

@ApiTags('Projects')
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ============================================================
  // PUBLIC
  // ============================================================

  @ApiOperation({ summary: 'List published projects, paginated, public. Each item includes a coverImageUrl (its first gallery image).' })
  @Get()
  findAll(@Query() query: ProjectQueryDto) {
    return this.projectsService.findAll(query);
  }

  // ============================================================
  // ADMIN — project CRUD
  // ============================================================

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all projects (published or draft), with image/video counts — admin' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('admin')
  findAllForAdmin(@Query() query: ProjectAdminQueryDto) {
    return this.projectsService.findAllForAdmin(query);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get full project detail for editing — admin' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_READ)
  @Get('admin/:id')
  findOneForAdmin(@Param('id') id: string) {
    return this.projectsService.findOneForAdmin(id);
  }

  @ApiOperation({ summary: 'Get a project detail page by slug — public (includes images[] and videos[])' })
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.projectsService.findBySlug(slug);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a project',
    description:
      'JSON body, NOT multipart. Only "title" is required — description, category, contractValue, ' +
      'and isPublished are all optional. "slug" is generated by the server from the title, do not ' +
      'send it. Images and videos are never part of this call — create the project first, then ' +
      'upload media into it via the gallery endpoints below.',
  })
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
  @ApiOperation({
    summary: 'Update a project — title, slug, description, category, contractValue, order, isPublished',
    description:
      'JSON body, NOT multipart. All fields optional — send only what changes. Sending "slug" ' +
      're-slugifies whatever string you send (spaces/casing handled server-side); sending "title" ' +
      'alone does NOT auto-regenerate the slug on update (only on create) — send "slug" explicitly ' +
      'if you want it changed too.',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete a project entirely',
    description:
      'Permanently deletes the project along with ALL of its gallery images and videos — both the ' +
      'database records and the actual files stored on Cloudinary. This cannot be undone. Use the ' +
      'individual image/video delete endpoints instead if you only want to remove specific media ' +
      'while keeping the project itself.',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectsService.remove(id);
  }

  // NOTE: the old POST :id/cover-image endpoint has been REMOVED. There is
  // no more dedicated cover image field — the public list endpoint now
  // derives coverImageUrl automatically from the first gallery image
  // (by display order). Just upload images via the gallery endpoint below
  // and put whichever one should lead the gallery first in the order.

  // ============================================================
  // ADMIN — IMAGE GALLERY
  //   POST   /projects/:id/images              bulk upload (1–20 files)
  //   PATCH  /projects/:id/images/:imageId      edit caption only
  //   PATCH  /projects/:id/images/reorder       reorder gallery
  //   DELETE /projects/:id/images/:imageId      remove one image
  // ============================================================

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Bulk-upload images to the project gallery',
    description:
      `Multipart/form-data. Field name is "files" (plural) — select and send up to ${MAX_FILES_PER_UPLOAD} ` +
      'images in ONE request; do not loop single-file calls for a multi-image upload. ' +
      'Optional "descriptions" field: a JSON-stringified array of captions in the same order as "files". ' +
      'The first image (by order) is used as the project\'s cover/thumbnail everywhere it\'s needed publicly. ' +
      'Returns an array of the created gallery image records.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(BULK_IMAGE_BODY_SCHEMA)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_UPLOAD, imageUploadOptions()))
  addImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('descriptions') descriptionsRaw?: string,
  ) {
    if (!files?.length) throw new BadRequestException('No files uploaded — field name must be "files"');
    const descriptions = parseDescriptions(descriptionsRaw, files.length);
    return this.projectsService.addImages(id, files, descriptions);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Edit a gallery image's caption (does not replace the file itself)" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id/images/:imageId')
  updateImageDescription(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: MediaDescriptionDto,
  ) {
    return this.projectsService.updateImageDescription(id, imageId, dto.description);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Reorder a project's gallery images — the first one becomes the public cover/thumbnail" })
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

  // ============================================================
  // ADMIN — VIDEO GALLERY  (exact same shape as the image gallery above)
  //   POST   /projects/:id/videos              bulk upload (1–20 files)
  //   PATCH  /projects/:id/videos/:videoId      edit caption only
  //   PATCH  /projects/:id/videos/reorder       reorder gallery
  //   DELETE /projects/:id/videos/:videoId      remove one video
  // ============================================================

  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Bulk-upload videos to the project gallery',
    description:
      `Multipart/form-data. Field name is "files" (plural) — send up to ${MAX_FILES_PER_UPLOAD} ` +
      'video clips in ONE request, same convention as the image bulk-upload endpoint. Accepted ' +
      'formats: mp4, mov, webm, mkv. Optional "descriptions" field works identically to the image ' +
      'endpoint. Returns an array of created video records, each including an auto-generated ' +
      'thumbnailUrl and duration (in seconds) supplied by Cloudinary.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody(BULK_VIDEO_BODY_SCHEMA)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post(':id/videos')
  @UseInterceptors(FilesInterceptor('files', MAX_FILES_PER_UPLOAD, videoUploadOptions()))
  addVideos(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('descriptions') descriptionsRaw?: string,
  ) {
    if (!files?.length) throw new BadRequestException('No files uploaded — field name must be "files"');
    const descriptions = parseDescriptions(descriptionsRaw, files.length);
    return this.projectsService.addVideos(id, files, descriptions);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Edit a gallery video's caption (does not replace the file itself)" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id/videos/:videoId')
  updateVideoDescription(
    @Param('id') id: string,
    @Param('videoId') videoId: string,
    @Body() dto: MediaDescriptionDto,
  ) {
    return this.projectsService.updateVideoDescription(id, videoId, dto.description);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Reorder a project's gallery videos" })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id/videos/reorder')
  reorderVideos(@Param('id') id: string, @Body() dto: ReorderProjectVideosDto) {
    return this.projectsService.reorderVideos(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a project gallery video' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Delete(':id/videos/:videoId')
  removeVideo(@Param('id') id: string, @Param('videoId') videoId: string) {
    return this.projectsService.removeVideo(id, videoId);
  }
}