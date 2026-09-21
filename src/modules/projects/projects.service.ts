import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { slugify } from '../../common/slug/slugify.util';
import { assertExactIdSet } from '../../common/ordering/assert-exact-id-set.util';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';
import { ReorderProjectImagesDto } from './dto/reorder-project-images.dto';
import { ReorderProjectVideosDto } from './dto/reorder-project-video.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { ProjectAdminQueryDto } from './dto/project-admin-query.dto';

// Transactions that only WRITE use this — gives Neon's pooled connection a
// bit more room before Prisma gives up, since a cold/waking connection can
// take a couple of seconds to become available.
const WRITE_TX_OPTIONS = { maxWait: 10000, timeout: 15000 };

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(query: ProjectQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      isPublished: true,
      ...(query.category && { category: query.category }),
    };

    // NOTE: this used to be this.prisma.$transaction([findMany, count]).
    // findMany + count here are two independent READS with no atomicity
    // requirement between them (a project created half a second apart from
    // the count being taken is not a real consistency problem for a public
    // gallery listing). Wrapping plain reads in $transaction forces Prisma
    // to acquire and hold a dedicated transactional connection for both
    // queries at once, which is exactly what was timing out against Neon's
    // pooled connection ("Unable to start a transaction in the given
    // time."). Promise.all runs them concurrently without that requirement
    // and is both faster and far less likely to time out.
    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          category: true,
          images: {
            take: 1,
            orderBy: { order: 'asc' },
            select: { imageUrl: true },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    // Flatten the single cover-preview image for list-view cards, since the
    // model no longer carries a dedicated coverImageUrl field — the first
    // gallery image (by order) serves as the thumbnail instead.
    return {
      items: items.map(({ images, ...rest }) => ({ ...rest, coverImageUrl: images[0]?.imageUrl ?? null })),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findBySlug(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: { slug, isPublished: true },
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        description: true,
        images: {
          orderBy: { order: 'asc' },
          select: { id: true, imageUrl: true, caption: true, order: true },
        },
        videos: {
          orderBy: { order: 'asc' },
          select: { id: true, videoUrl: true, thumbnailUrl: true, duration: true, caption: true, order: true },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findAllForAdmin(query: ProjectAdminQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      ...(query.category && { category: query.category }),
      ...(query.search && {
        title: { contains: query.search, mode: 'insensitive' },
      }),
    };

    // Same reasoning as findAll() above — two independent reads, no need
    // for $transaction here.
    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: { _count: { select: { images: true, videos: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: rows.map((p) => ({ ...p, imageCount: p._count.images, videoCount: p._count.videos })),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findOneForAdmin(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        videos: { orderBy: { order: 'asc' } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async create(dto: CreateProjectDto) {
    const slug = slugify(dto.slug ?? dto.title);
    try {
      return await this.prisma.project.create({ data: { ...dto, slug } });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async update(id: string, dto: UpdateProjectDto) {
    await this.findOneOrThrow(id);

    // Slug resolution:
    //  - dto.slug sent explicitly       -> re-slugify whatever was sent (an
    //    explicit slug always wins, even if title is also being changed in
    //    the same request).
    //  - dto.slug NOT sent, but dto.title IS -> regenerate the slug from the
    //    new title, same as create() does. This is the behavior that was
    //    added on request: renaming a project now keeps its slug in sync
    //    unless the caller explicitly overrides it.
    //  - neither sent -> slug is left untouched entirely.
    const slug = dto.slug
      ? slugify(dto.slug)
      : dto.title
        ? slugify(dto.title)
        : undefined;

    const data: Prisma.ProjectUpdateInput = {
      ...dto,
      ...(slug && { slug }),
    };
    try {
      return await this.prisma.project.update({ where: { id }, data });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async remove(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { images: true, videos: true },
    });
    if (!project) throw new NotFoundException('Project not found');

    // Delete the DB rows first (project + its images/videos) inside one
    // transaction, so a failure partway through never leaves a project
    // gone while its media rows linger, or vice versa. This does NOT
    // depend on whether the schema has onDelete: Cascade set on the
    // images/videos relations — deleting them explicitly here works
    // either way.
    await this.prisma.$transaction(
      [
        this.prisma.projectImage.deleteMany({ where: { projectId: id } }),
        this.prisma.projectVideo.deleteMany({ where: { projectId: id } }),
        this.prisma.project.delete({ where: { id } }),
      ],
      WRITE_TX_OPTIONS,
    );

    // Cloudinary cleanup happens AFTER the DB transaction commits, and is
    // fire-and-forget (same pattern as removeImage/removeVideo below) — a
    // slow or failed Cloudinary delete should never block or fail the
    // actual project deletion the admin asked for. Orphaned Cloudinary
    // files from a failed cleanup are a much smaller problem than a
    // project stuck undeletable because of a flaky third-party API call.
    for (const image of project.images) {
      void this.cloudinary.deleteAsset(image.publicId);
    }
    for (const video of project.videos) {
      void this.cloudinary.deleteAsset(video.publicId, 'video');
    }

    return { message: 'Project deleted' };
  }

  // updateCoverImage() has been REMOVED — there is no more dedicated
  // coverImageUrl/coverImagePublicId field. The first gallery image (by
  // order) now serves as the cover automatically (see findAll above).
  // If you still want an explicit "pin this as cover" action, that's a
  // one-line addition to reorderImages rather than a separate upload
  // endpoint — say so and I'll add it back in that shape.

  async reorder(dto: ReorderProjectsDto) {
    const existing = await this.prisma.project.findMany({ select: { id: true } });
    assertExactIdSet(existing.map((p) => p.id), dto.projectIds, 'projectIds');

    await this.prisma.$transaction(
      dto.projectIds.map((id, index) =>
        this.prisma.project.update({ where: { id }, data: { order: index } }),
      ),
      WRITE_TX_OPTIONS,
    );
    return { message: 'Order updated' };
  }

  // ============================================================
  // Gallery images
  // ============================================================

  async addImages(projectId: string, files: Express.Multer.File[], captions: (string | undefined)[]) {
    await this.findOneOrThrow(projectId);

    const maxOrder = await this.prisma.projectImage.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    let nextOrder = (maxOrder._max.order ?? -1) + 1;

    const uploaded = await Promise.all(
      files.map((file) => this.cloudinary.uploadBuffer(file.buffer, { folder: 'segbaji/projects' })),
    );

    return this.prisma.$transaction(
      uploaded.map((result, i) =>
        this.prisma.projectImage.create({
          data: {
            projectId,
            imageUrl: result.url,
            publicId: result.publicId,
            caption: captions[i],
            order: nextOrder++,
          },
        }),
      ),
      WRITE_TX_OPTIONS,
    );
  }

  async updateImageDescription(projectId: string, imageId: string, description?: string) {
    await this.findImageOrThrow(projectId, imageId);
    return this.prisma.projectImage.update({
      where: { id: imageId },
      data: { caption: description },
    });
  }

  async removeImage(projectId: string, imageId: string) {
    const image = await this.findImageOrThrow(projectId, imageId);
    await this.prisma.projectImage.delete({ where: { id: imageId } });
    void this.cloudinary.deleteAsset(image.publicId);
    return { message: 'Image deleted' };
  }

  async reorderImages(projectId: string, dto: ReorderProjectImagesDto) {
    const existing = await this.prisma.projectImage.findMany({
      where: { projectId },
      select: { id: true },
    });
    assertExactIdSet(existing.map((i) => i.id), dto.imageIds, 'imageIds');

    await this.prisma.$transaction(
      dto.imageIds.map((id, index) =>
        this.prisma.projectImage.update({ where: { id }, data: { order: index } }),
      ),
      WRITE_TX_OPTIONS,
    );
    return { message: 'Order updated' };
  }

  // ============================================================
  // Gallery videos — exact same shape as the image gallery above
  // ============================================================

  async addVideos(projectId: string, files: Express.Multer.File[], captions: (string | undefined)[]) {
    await this.findOneOrThrow(projectId);

    const maxOrder = await this.prisma.projectVideo.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    let nextOrder = (maxOrder._max.order ?? -1) + 1;

    const uploaded = await Promise.all(
      files.map((file) => this.cloudinary.uploadVideoBuffer(file.buffer, { folder: 'segbaji/projects' })),
    );

    return this.prisma.$transaction(
      uploaded.map((result, i) =>
        this.prisma.projectVideo.create({
          data: {
            projectId,
            videoUrl: result.url,
            publicId: result.publicId,
            thumbnailUrl: result.thumbnailUrl,
            duration: result.duration,
            caption: captions[i],
            order: nextOrder++,
          },
        }),
      ),
      WRITE_TX_OPTIONS,
    );
  }

  async updateVideoDescription(projectId: string, videoId: string, description?: string) {
    await this.findVideoOrThrow(projectId, videoId);
    return this.prisma.projectVideo.update({
      where: { id: videoId },
      data: { caption: description },
    });
  }

  async removeVideo(projectId: string, videoId: string) {
    const video = await this.findVideoOrThrow(projectId, videoId);
    await this.prisma.projectVideo.delete({ where: { id: videoId } });
    void this.cloudinary.deleteAsset(video.publicId, 'video');
    return { message: 'Video deleted' };
  }

  async reorderVideos(projectId: string, dto: ReorderProjectVideosDto) {
    const existing = await this.prisma.projectVideo.findMany({
      where: { projectId },
      select: { id: true },
    });
    assertExactIdSet(existing.map((v) => v.id), dto.videoIds, 'videoIds');

    await this.prisma.$transaction(
      dto.videoIds.map((id, index) =>
        this.prisma.projectVideo.update({ where: { id }, data: { order: index } }),
      ),
      WRITE_TX_OPTIONS,
    );
    return { message: 'Order updated' };
  }

  // ============================================================
  // Private lookups
  // ============================================================

  private async findOneOrThrow(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  private async findImageOrThrow(projectId: string, imageId: string) {
    const image = await this.prisma.projectImage.findFirst({ where: { id: imageId, projectId } });
    if (!image) throw new NotFoundException('Image not found on this project');
    return image;
  }

  private async findVideoOrThrow(projectId: string, videoId: string) {
    const video = await this.prisma.projectVideo.findFirst({ where: { id: videoId, projectId } });
    if (!video) throw new NotFoundException('Video not found on this project');
    return video;
  }

  private translateUniqueConstraintError(err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'slug';
      return new ConflictException(`A project with this ${target} already exists`);
    }
    return err;
  }
}