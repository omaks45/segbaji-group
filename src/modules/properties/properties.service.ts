import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, NearbyPlaceType, PropertyAvailabilityStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { slugify } from '../../common/slug/slugify.util';
import { assertExactIdSet } from '../../common/ordering/assert-exact-id-set.util';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertyQueryDto } from './dto/property-query.dto';
import { PropertyAdminQueryDto } from './dto/property-admin-query.dto';
import { ReorderPropertyImagesDto } from './dto/reorder-property-images.dto';
import { UpsertNearbyPlaceDto } from './dto/upsert-nearby-place.dto';

// A listing is "on the market" for public purposes once it's not still
// a draft and not already sold — mirrors Project.isPublished, just
// expressed through the status enum instead of a second boolean.
const PUBLIC_STATUSES: PropertyAvailabilityStatus[] = ['AVAILABLE', 'UNDER_OFFER'];

@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(query: PropertyQueryDto) {
    const where: Prisma.PropertyWhereInput = {
      availabilityStatus: { in: PUBLIC_STATUSES },
      ...(query.propertyType && { propertyType: query.propertyType }),
      ...(query.state && { state: { equals: query.state, mode: 'insensitive' } }),
      ...(query.landCondition && { landCondition: query.landCondition }),
      ...(query.titleType && { titleType: query.titleType }),
      ...((query.minPrice !== undefined || query.maxPrice !== undefined) && {
        price: { ...(query.minPrice !== undefined && { gte: query.minPrice }), ...(query.maxPrice !== undefined && { lte: query.maxPrice }) },
      }),
      ...((query.minLandSize !== undefined || query.maxLandSize !== undefined) && {
        landSizeValue: { ...(query.minLandSize !== undefined && { gte: query.minLandSize }), ...(query.maxLandSize !== undefined && { lte: query.maxLandSize }) },
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true, slug: true, title: true, propertyType: true,
          landSizeValue: true, landSizeUnit: true, price: true, priceType: true,
          isPriceNegotiable: true, location: true, state: true, titleType: true,
          coverImageUrl: true, isFeatured: true,
        },
      }),
      this.prisma.property.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  async findBySlug(slug: string) {
    const property = await this.prisma.property.findFirst({
      where: { slug, availabilityStatus: { in: PUBLIC_STATUSES } },
      include: {
        images: { orderBy: { order: 'asc' } },
        nearbyPlaces: true,
      },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  /// --- Admin-only methods (drafts, sold, etc.) ---
  async findAllForAdmin(query: PropertyAdminQueryDto) {
    const where = this.buildAdminWhere(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: { _count: { select: { images: true } } },
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      items: rows.map((p) => ({ ...p, imageCount: p._count.images })),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  private buildAdminWhere(query: PropertyAdminQueryDto): Prisma.PropertyWhereInput {
    return {
      ...(query.propertyType && { propertyType: query.propertyType }),
      ...(query.state && { state: { equals: query.state, mode: 'insensitive' } }),
      ...(query.availabilityStatus && { availabilityStatus: query.availabilityStatus }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' } },
          { location: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  /** Also used for admin summary counts (Total/Available/Sold/Draft). */
  async findSummary() {
    const grouped = await this.prisma.property.groupBy({ by: ['availabilityStatus'], _count: true });
    const counts: Record<PropertyAvailabilityStatus, number> = {
      AVAILABLE: 0, UNDER_OFFER: 0, SOLD: 0, DRAFT: 0,
    };
    for (const row of grouped) counts[row.availabilityStatus] = row._count;
    return {
      total: counts.AVAILABLE + counts.UNDER_OFFER + counts.SOLD + counts.DRAFT,
      available: counts.AVAILABLE,
      underOffer: counts.UNDER_OFFER,
      sold: counts.SOLD,
      draft: counts.DRAFT,
    };
  }

  async findOneForAdmin(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { images: { orderBy: { order: 'asc' } }, nearbyPlaces: true },
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async create(dto: CreatePropertyDto) {
    const slug = slugify(dto.slug ?? dto.title);
    try {
      return await this.prisma.property.create({ data: { ...dto, slug } });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async update(id: string, dto: UpdatePropertyDto) {
    await this.findOneOrThrow(id);
    const data = { ...dto, ...(dto.slug && { slug: slugify(dto.slug) }) };
    try {
      return await this.prisma.property.update({ where: { id }, data });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async updateCoverImage(id: string, file: Express.Multer.File) {
    const property = await this.findOneOrThrow(id);
    const result = await this.cloudinary.uploadBuffer(file.buffer, { folder: 'segbaji/properties' });
    const updated = await this.prisma.property.update({
      where: { id },
      data: { coverImageUrl: result.url, coverImagePublicId: result.publicId },
      select: { id: true, coverImageUrl: true },
    });
    if (property.coverImagePublicId) void this.cloudinary.deleteAsset(property.coverImagePublicId);
    return updated;
  }

  // --- Gallery images (identical shape to Projects) ---

  async addImage(propertyId: string, file: Express.Multer.File, caption?: string) {
    await this.findOneOrThrow(propertyId);
    const result = await this.cloudinary.uploadBuffer(file.buffer, { folder: 'segbaji/properties' });
    const maxOrder = await this.prisma.propertyImage.aggregate({
      where: { propertyId }, _max: { order: true },
    });
    return this.prisma.propertyImage.create({
      data: { propertyId, imageUrl: result.url, publicId: result.publicId, caption, order: (maxOrder._max.order ?? -1) + 1 },
    });
  }

  async removeImage(propertyId: string, imageId: string) {
    const image = await this.findImageOrThrow(propertyId, imageId);
    await this.prisma.propertyImage.delete({ where: { id: imageId } });
    void this.cloudinary.deleteAsset(image.publicId);
    return { message: 'Image deleted' };
  }

  async reorderImages(propertyId: string, dto: ReorderPropertyImagesDto) {
    const existing = await this.prisma.propertyImage.findMany({ where: { propertyId }, select: { id: true } });
    assertExactIdSet(existing.map((i) => i.id), dto.imageIds, 'imageIds');

    await this.prisma.$transaction(
      dto.imageIds.map((id, index) =>
        this.prisma.propertyImage.update({ where: { id }, data: { order: index } }),
      ),
    );
    return { message: 'Order updated' };
  }

  // --- Nearby places (upsert-by-type, not a reorder-list) ---

  async upsertNearbyPlace(propertyId: string, type: NearbyPlaceType, dto: UpsertNearbyPlaceDto) {
    await this.findOneOrThrow(propertyId);
    return this.prisma.propertyNearbyPlace.upsert({
      where: { propertyId_type: { propertyId, type } },
      update: { label: dto.label, distanceOrTime: dto.distanceOrTime },
      create: { propertyId, type, label: dto.label, distanceOrTime: dto.distanceOrTime },
    });
  }

  async removeNearbyPlace(propertyId: string, type: NearbyPlaceType) {
    const existing = await this.prisma.propertyNearbyPlace.findUnique({
      where: { propertyId_type: { propertyId, type } },
    });
    if (!existing) throw new NotFoundException('No nearby place of this type set for this property');
    await this.prisma.propertyNearbyPlace.delete({ where: { id: existing.id } });
    return { message: 'Nearby place removed' };
  }

  private async findOneOrThrow(id: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  private async findImageOrThrow(propertyId: string, imageId: string) {
    const image = await this.prisma.propertyImage.findFirst({ where: { id: imageId, propertyId } });
    if (!image) throw new NotFoundException('Image not found on this property');
    return image;
  }

  private translateUniqueConstraintError(err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'slug';
      return new ConflictException(`A property with this ${target} already exists`);
    }
    return err;
  }

  findAllForExport(query: PropertyAdminQueryDto) {
    return this.prisma.property.findMany({
      where: this.buildAdminWhere(query),
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });
  }
}