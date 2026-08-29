import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { slugify } from '../../common/slug/slugify.util';
import { assertExactIdSet } from '../../common/ordering/assert-exact-id-set.util';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ReorderServicesDto } from './dto/reorder-services.dto';
import { CreateServiceFeatureDto } from './dto/create-service-feature.dto';
import { UpdateServiceFeatureDto } from './dto/update-service-feature.dto';
import { ReorderServiceFeaturesDto } from './dto/reorder-service-features.dto';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  /** Public dropdown list — same shape as before, now includes slug for routing. */
  findAll() {
    return this.prisma.service.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true },
      orderBy: { order: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const service = await this.prisma.service.findFirst({
      where: { slug, isActive: true },
      include: { features: { orderBy: { order: 'asc' } } },
    });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async findAllForAdmin() {
    const services = await this.prisma.service.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { features: true } } },
    });
    return services.map((s) => ({
      id: s.id,
      slug: s.slug,
      name: s.name,
      summary: s.summary,
      heroImageUrl: s.heroImageUrl,
      order: s.order,
      isActive: s.isActive,
      featureCount: s._count.features,
    }));
  }

  async create(dto: CreateServiceDto) {
    const slug = slugify(dto.slug ?? dto.name);
    try {
      return await this.prisma.service.create({
        data: { name: dto.name, slug, summary: dto.summary },
      });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async update(id: string, dto: UpdateServiceDto) {
    await this.findOneOrThrow(id);
    const data = { ...dto, ...(dto.slug && { slug: slugify(dto.slug) }) };
    try {
      return await this.prisma.service.update({ where: { id }, data });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async updateHeroImage(id: string, file: Express.Multer.File) {
    const service = await this.findOneOrThrow(id);
    const result = await this.cloudinary.uploadBuffer(file.buffer, { folder: 'segbaji/services' });
    const updated = await this.prisma.service.update({
      where: { id },
      data: { heroImageUrl: result.url, heroImagePublicId: result.publicId },
      select: { id: true, heroImageUrl: true },
    });
    if (service.heroImagePublicId) void this.cloudinary.deleteAsset(service.heroImagePublicId);
    return updated;
  }

  /** One transaction, O(n) writes where n = total service count (small,
   * fixed) — not n sequential round trips. */
  async reorder(dto: ReorderServicesDto) {
    const existing = await this.prisma.service.findMany({ select: { id: true } });
    assertExactIdSet(existing.map((s) => s.id), dto.serviceIds, 'serviceIds');

    await this.prisma.$transaction(
      dto.serviceIds.map((serviceId, index) =>
        this.prisma.service.update({ where: { id: serviceId }, data: { order: index } }),
      ),
    );
    return { message: 'Order updated' };
  }

  // --- Features ---

  async addFeature(serviceId: string, dto: CreateServiceFeatureDto) {
    await this.findOneOrThrow(serviceId);
    const maxOrder = await this.prisma.serviceFeature.aggregate({
      where: { serviceId },
      _max: { order: true },
    });
    return this.prisma.serviceFeature.create({
      data: { ...dto, serviceId, order: (maxOrder._max.order ?? -1) + 1 },
    });
  }

  async updateFeature(serviceId: string, featureId: string, dto: UpdateServiceFeatureDto) {
    await this.findFeatureOrThrow(serviceId, featureId);
    return this.prisma.serviceFeature.update({ where: { id: featureId }, data: dto });
  }

  /** Hard delete is safe here — unlike Departments/Roles/Team, nothing
   * else in the system references a ServiceFeature, so there's no
   * dangling-reference risk to guard against. */
  async removeFeature(serviceId: string, featureId: string) {
    await this.findFeatureOrThrow(serviceId, featureId);
    await this.prisma.serviceFeature.delete({ where: { id: featureId } });
    return { message: 'Feature deleted' };
  }

  async reorderFeatures(serviceId: string, dto: ReorderServiceFeaturesDto) {
    const existing = await this.prisma.serviceFeature.findMany({
      where: { serviceId },
      select: { id: true },
    });
    assertExactIdSet(existing.map((f) => f.id), dto.featureIds, 'featureIds');

    await this.prisma.$transaction(
      dto.featureIds.map((featureId, index) =>
        this.prisma.serviceFeature.update({ where: { id: featureId }, data: { order: index } }),
      ),
    );
    return { message: 'Order updated' };
  }

  private async findOneOrThrow(id: string) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  private async findFeatureOrThrow(serviceId: string, featureId: string) {
    const feature = await this.prisma.serviceFeature.findFirst({ where: { id: featureId, serviceId } });
    if (!feature) throw new NotFoundException('Feature not found on this service');
    return feature;
  }

  private translateUniqueConstraintError(err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictException('A service with this name or slug already exists');
    }
    return err;
  }
}