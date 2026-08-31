import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { ServicesService } from './services.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

function buildMockPrisma() {
    return {
        service: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        serviceFeature: {
        create: jest.fn(), update: jest.fn(), delete: jest.fn(),
        findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(),
        },
        $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
    } as unknown as PrismaService;
    }

    function buildMockCloudinary() {
    return { uploadBuffer: jest.fn(), deleteAsset: jest.fn() } as unknown as CloudinaryService;
    }

    describe('ServicesService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let cloudinary: ReturnType<typeof buildMockCloudinary>;
    let service: ServicesService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        cloudinary = buildMockCloudinary();
        service = new ServicesService(prisma, cloudinary);
    });

    describe('create', () => {
        it('slugifies the name when no slug is given', async () => {
        (prisma.service.create as jest.Mock).mockResolvedValue({ id: '1', slug: 'civil-engineering' });
        await service.create({ name: 'Civil Engineering' } as never);
        expect(prisma.service.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ slug: 'civil-engineering' }),
        });
        });

        it('translates a duplicate name/slug into ConflictException', async () => {
        const err = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '7.9.1' });
        (prisma.service.create as jest.Mock).mockRejectedValue(err);
        await expect(service.create({ name: 'X' } as never)).rejects.toThrow(ConflictException);
        });
    });

    describe('findBySlug', () => {
        it('throws NotFoundException for an inactive or missing service', async () => {
        (prisma.service.findFirst as jest.Mock).mockResolvedValue(null);
        await expect(service.findBySlug('missing')).rejects.toThrow(NotFoundException);
        });
    });

    describe('reorder', () => {
        it('rejects a partial ID list', async () => {
        (prisma.service.findMany as jest.Mock).mockResolvedValue([{ id: '1' }, { id: '2' }]);
        await expect(service.reorder({ serviceIds: ['1'] } as never)).rejects.toThrow(BadRequestException);
        });

        it('applies order based on array position', async () => {
        (prisma.service.findMany as jest.Mock).mockResolvedValue([{ id: '1' }, { id: '2' }]);
        (prisma.service.update as jest.Mock).mockResolvedValue({});
        await service.reorder({ serviceIds: ['2', '1'] } as never);
        expect(prisma.service.update).toHaveBeenCalledWith({ where: { id: '2' }, data: { order: 0 } });
        expect(prisma.service.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { order: 1 } });
        });
    });

    describe('addFeature', () => {
        it('throws NotFoundException for a missing parent service', async () => {
        (prisma.service.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.addFeature('missing', {} as never)).rejects.toThrow(NotFoundException);
        });

        it('places the first feature at order 0', async () => {
        (prisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 's1' });
        (prisma.serviceFeature.aggregate as jest.Mock).mockResolvedValue({ _max: { order: null } });
        (prisma.serviceFeature.create as jest.Mock).mockResolvedValue({ id: 'f1', order: 0 });

        const result = await service.addFeature('s1', { title: 'Structural Engineering' } as never);
        expect(prisma.serviceFeature.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ order: 0 }),
        });
        expect(result.order).toBe(0);
        });

        it('appends subsequent features after the current max order', async () => {
        (prisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 's1' });
        (prisma.serviceFeature.aggregate as jest.Mock).mockResolvedValue({ _max: { order: 2 } });
        (prisma.serviceFeature.create as jest.Mock).mockResolvedValue({ id: 'f2', order: 3 });

        await service.addFeature('s1', { title: 'Infrastructure' } as never);
        expect(prisma.serviceFeature.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ order: 3 }),
        });
        });
    });

    describe('removeFeature', () => {
        it('throws NotFoundException when the feature does not belong to the given service', async () => {
        (prisma.serviceFeature.findFirst as jest.Mock).mockResolvedValue(null);
        await expect(service.removeFeature('s1', 'f-not-here')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateHeroImage', () => {
        it('uploads and cleans up the previous hero image', async () => {
        (prisma.service.findUnique as jest.Mock).mockResolvedValue({ id: 's1', heroImagePublicId: 'old' });
        (cloudinary.uploadBuffer as jest.Mock).mockResolvedValue({ url: 'https://x.jpg', publicId: 'new' });
        (prisma.service.update as jest.Mock).mockResolvedValue({ id: 's1', heroImageUrl: 'https://x.jpg' });

        await service.updateHeroImage('s1', { buffer: Buffer.from('x') } as Express.Multer.File);
        expect(cloudinary.deleteAsset).toHaveBeenCalledWith('old');
        });
    });
});