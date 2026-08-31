import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PropertiesService } from './properties.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

function buildMockPrisma() {
  return {
    property: {
      create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(),
      findMany: jest.fn(), count: jest.fn(), groupBy: jest.fn(),
    },
    propertyImage: {
      create: jest.fn(), update: jest.fn(), delete: jest.fn(),
      findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(),
    },
    propertyNearbyPlace: { upsert: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
  } as unknown as PrismaService;
}

function buildMockCloudinary() {
  return { uploadBuffer: jest.fn(), deleteAsset: jest.fn() } as unknown as CloudinaryService;
}

describe('PropertiesService', () => {
  let prisma: ReturnType<typeof buildMockPrisma>;
  let cloudinary: ReturnType<typeof buildMockCloudinary>;
  let service: PropertiesService;

  beforeEach(() => {
    prisma = buildMockPrisma();
    cloudinary = buildMockCloudinary();
    service = new PropertiesService(prisma, cloudinary);
  });

  describe('findAll — public visibility rule', () => {
    it('only queries AVAILABLE and UNDER_OFFER statuses, never SOLD or DRAFT', async () => {
      (prisma.property.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ page: 1, pageSize: 10 } as never);

      const callArgs = (prisma.property.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.availabilityStatus).toEqual({ in: ['AVAILABLE', 'UNDER_OFFER'] });
    });

    it('combines price range and land size range filters correctly', async () => {
      (prisma.property.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.property.count as jest.Mock).mockResolvedValue(0);

      await service.findAll({ page: 1, pageSize: 10, minPrice: 10000000, maxPrice: 50000000, minLandSize: 2 } as never);

      const callArgs = (prisma.property.findMany as jest.Mock).mock.calls[0][0];
      expect(callArgs.where.price).toEqual({ gte: 10000000, lte: 50000000 });
      expect(callArgs.where.landSizeValue).toEqual({ gte: 2 });
    });
  });

  describe('findBySlug', () => {
    it('throws NotFoundException for a SOLD property (not publicly viewable)', async () => {
      (prisma.property.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.findBySlug('sold-plot')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findSummary', () => {
    it('aggregates all four statuses, defaulting missing ones to zero', async () => {
      (prisma.property.groupBy as jest.Mock).mockResolvedValue([
        { availabilityStatus: 'AVAILABLE', _count: 5 },
        { availabilityStatus: 'DRAFT', _count: 2 },
      ]);
      const result = await service.findSummary();
      expect(result).toEqual({ total: 7, available: 5, underOffer: 0, sold: 0, draft: 2 });
    });
  });

  describe('create', () => {
    it('translates a duplicate slug into ConflictException naming the real field', async () => {
      const err = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '7.9.1', meta: { target: ['slug'] } });
      (prisma.property.create as jest.Mock).mockRejectedValue(err);
      await expect(service.create({ title: 'X' } as never)).rejects.toThrow(ConflictException);
    });
  });

  describe('gallery images', () => {
    it('places the first image at order 0', async () => {
      (prisma.property.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
      (prisma.propertyImage.aggregate as jest.Mock).mockResolvedValue({ _max: { order: null } });
      (prisma.propertyImage.create as jest.Mock).mockResolvedValue({ id: 'img1', order: 0 });
      (cloudinary.uploadBuffer as jest.Mock).mockResolvedValue({ url: 'https://x.jpg', publicId: 'x' });

      await service.addImage('p1', { buffer: Buffer.from('x') } as Express.Multer.File);
      expect(prisma.propertyImage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 0 }),
      });
    });

    it('rejects a reorder with a mismatched ID set', async () => {
      (prisma.propertyImage.findMany as jest.Mock).mockResolvedValue([{ id: '1' }, { id: '2' }]);
      await expect(service.reorderImages('p1', { imageIds: ['1'] } as never)).rejects.toThrow(BadRequestException);
    });

    it('deletes the DB row and triggers Cloudinary cleanup on image removal', async () => {
      (prisma.propertyImage.findFirst as jest.Mock).mockResolvedValue({ id: 'img1', publicId: 'cld1' });
      await service.removeImage('p1', 'img1');
      expect(prisma.propertyImage.delete).toHaveBeenCalledWith({ where: { id: 'img1' } });
      expect(cloudinary.deleteAsset).toHaveBeenCalledWith('cld1');
    });
  });

  describe('nearby places — upsert-by-type', () => {
    it('upserts using the compound propertyId_type key, not a generated ID', async () => {
      (prisma.property.findUnique as jest.Mock).mockResolvedValue({ id: 'p1' });
      (prisma.propertyNearbyPlace.upsert as jest.Mock).mockResolvedValue({ id: 'np1' });

      await service.upsertNearbyPlace('p1', 'SCHOOL' as never, { distanceOrTime: '9 mins' } as never);

      expect(prisma.propertyNearbyPlace.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { propertyId_type: { propertyId: 'p1', type: 'SCHOOL' } } }),
      );
    });

    it('throws NotFoundException when removing a type that was never set', async () => {
      (prisma.propertyNearbyPlace.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.removeNearbyPlace('p1', 'HOSPITAL' as never)).rejects.toThrow(NotFoundException);
    });

    it('deletes the correct row when the type does exist', async () => {
      (prisma.propertyNearbyPlace.findUnique as jest.Mock).mockResolvedValue({ id: 'np1' });
      await service.removeNearbyPlace('p1', 'HOSPITAL' as never);
      expect(prisma.propertyNearbyPlace.delete).toHaveBeenCalledWith({ where: { id: 'np1' } });
    });
  });
});