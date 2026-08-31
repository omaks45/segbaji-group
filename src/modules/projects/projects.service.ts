import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, ProjectStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { slugify } from '../../common/slug/slugify.util';
import { assertExactIdSet } from '../../common/ordering/assert-exact-id-set.util';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ReorderProjectsDto } from './dto/reorder-projects.dto';
import { ReorderProjectImagesDto } from './dto/reorder-project-images.dto';
import { ProjectQueryDto } from './dto/project-query.dto';
import { ProjectAdminQueryDto } from './dto/project-admin-query.dto';

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
      // insensitive — "Lagos", "lagos", "LAGOS" must all match the same
      // saved value, since state is free text, not an enum.
      ...(query.state && { state: { equals: query.state, mode: 'insensitive' } }),
      ...(query.featured !== undefined && { isFeatured: query.featured === 'true' }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true, slug: true, title: true, category: true,
          location: true, state: true, coverImageUrl: true, isFeatured: true,
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  /**
   * Explicit select, not a fetch-then-omit — contractValue never enters
   * this code path at all, rather than being fetched and stripped after
   * the fact. Cheap insurance against ever accidentally leaking it.
   */
  async findBySlug(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: { slug, isPublished: true },
      select: {
        id: true, slug: true, title: true, category: true, location: true, state: true,
        status: true, description: true, clientName: true, coverImageUrl: true, completedAt: true,
        images: {
          orderBy: { order: 'asc' },
          select: { id: true, imageUrl: true, caption: true, order: true },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async findAllForAdmin(query: ProjectAdminQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      ...(query.category && { category: query.category }),
      ...(query.state && { state: { equals: query.state, mode: 'insensitive' } }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: { _count: { select: { images: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      items: rows.map((p) => ({ ...p, imageCount: p._count.images })),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findOneForAdmin(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' } } },
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
    const existing = await this.findOneOrThrow(id);
    const data: Prisma.ProjectUpdateInput = {
      ...dto,
      ...(dto.slug && { slug: slugify(dto.slug) }),
      ...(dto.status === ProjectStatus.COMPLETED &&
        !existing.completedAt && { completedAt: new Date() }),
    };
    try {
      return await this.prisma.project.update({ where: { id }, data });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async updateCoverImage(id: string, file: Express.Multer.File) {
    const project = await this.findOneOrThrow(id);
    const result = await this.cloudinary.uploadBuffer(file.buffer, { folder: 'segbaji/projects' });
    const updated = await this.prisma.project.update({
      where: { id },
      data: { coverImageUrl: result.url, coverImagePublicId: result.publicId },
      select: { id: true, coverImageUrl: true },
    });
    if (project.coverImagePublicId) void this.cloudinary.deleteAsset(project.coverImagePublicId);
    return updated;
  }

  async reorder(dto: ReorderProjectsDto) {
    const existing = await this.prisma.project.findMany({ select: { id: true } });
    assertExactIdSet(existing.map((p) => p.id), dto.projectIds, 'projectIds');

    await this.prisma.$transaction(
      dto.projectIds.map((id, index) =>
        this.prisma.project.update({ where: { id }, data: { order: index } }),
      ),
    );
    return { message: 'Order updated' };
  }

  // --- Gallery images ---

  async addImage(projectId: string, file: Express.Multer.File, caption?: string) {
    await this.findOneOrThrow(projectId);
    const result = await this.cloudinary.uploadBuffer(file.buffer, { folder: 'segbaji/projects' });
    const maxOrder = await this.prisma.projectImage.aggregate({
      where: { projectId },
      _max: { order: true },
    });
    return this.prisma.projectImage.create({
      data: {
        projectId,
        imageUrl: result.url,
        publicId: result.publicId,
        caption,
        order: (maxOrder._max.order ?? -1) + 1,
      },
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
    );
    return { message: 'Order updated' };
  }

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

  /** Names the actual conflicting field (from Prisma's own error meta)
   * instead of a fixed guess — "title" was never unique, only "slug"
   * ever was, so the old message was simply wrong. */
  private translateUniqueConstraintError(err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'slug';
      return new ConflictException(`A project with this ${target} already exists`);
    }
    return err;
  }
}