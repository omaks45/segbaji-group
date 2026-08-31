import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, ProjectStatus } from '../../generated/prisma/client';
import { ProjectsService } from './projects.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { CloudinaryService } from '../../common/cloudinary/cloudinary.service';

function buildMockPrisma() {
    return {
        project: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        },
        projectImage: {
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
        },
        $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
    } as unknown as PrismaService;
    }

    function buildMockCloudinary() {
    return {
        uploadBuffer: jest.fn(),
        deleteAsset: jest.fn(),
    } as unknown as CloudinaryService;
    }

    describe('ProjectsService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let cloudinary: ReturnType<typeof buildMockCloudinary>;
    let service: ProjectsService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        cloudinary = buildMockCloudinary();
        service = new ProjectsService(prisma, cloudinary);
    });

    describe('create', () => {
        it('generates a slug from the title when none is provided', async () => {
        (prisma.project.create as jest.Mock).mockResolvedValue({ id: '1', slug: 'lekki-duplex' });

        await service.create({
            title: 'Lekki Duplex',
            category: 'RESIDENTIAL',
            location: 'Lekki',
            state: 'Lagos',
        } as never);

        expect(prisma.project.create).toHaveBeenCalledWith({
            data: expect.objectContaining({ slug: 'lekki-duplex' }),
        });
        });

        it('translates a unique constraint violation into a ConflictException naming the actual conflicting field', async () => {
        const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: '7.9.1',
            meta: { target: ['slug'] },
        });
        (prisma.project.create as jest.Mock).mockRejectedValue(prismaError);

        await expect(
            service.create({ title: 'Dup', category: 'RESIDENTIAL', location: 'X', state: 'Y' } as never),
        ).rejects.toThrow(ConflictException);
        });
    });

    describe('update — completedAt auto-stamping', () => {
        it('sets completedAt the first time status flips to COMPLETED', async () => {
        (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: '1', completedAt: null });
        (prisma.project.update as jest.Mock).mockResolvedValue({ id: '1' });

        await service.update('1', { status: ProjectStatus.COMPLETED } as never);

        expect(prisma.project.update).toHaveBeenCalledWith({
            where: { id: '1' },
            data: expect.objectContaining({ completedAt: expect.any(Date) }),
        });
        });

        it('does not overwrite an existing completedAt on a subsequent update', async () => {
        const existingDate = new Date('2026-01-01');
        (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: '1', completedAt: existingDate });
        (prisma.project.update as jest.Mock).mockResolvedValue({ id: '1' });

        await service.update('1', { status: ProjectStatus.COMPLETED } as never);

        const callArgs = (prisma.project.update as jest.Mock).mock.calls[0][0];
        expect(callArgs.data.completedAt).toBeUndefined();
        });

        it('throws NotFoundException when the project does not exist', async () => {
        (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.update('missing', {} as never)).rejects.toThrow(NotFoundException);
        });
    });

    describe('reorder', () => {
        it('rejects when the provided ID list does not exactly match existing projects', async () => {
        (prisma.project.findMany as jest.Mock).mockResolvedValue([{ id: '1' }, { id: '2' }]);
        await expect(service.reorder({ projectIds: ['1'] })).rejects.toThrow(BadRequestException);
        });

        it("updates every project's order to match its position in the list", async () => {
        (prisma.project.findMany as jest.Mock).mockResolvedValue([{ id: '1' }, { id: '2' }]);
        (prisma.project.update as jest.Mock).mockResolvedValue({});

        await service.reorder({ projectIds: ['2', '1'] });

        expect(prisma.project.update).toHaveBeenCalledWith({ where: { id: '2' }, data: { order: 0 } });
        expect(prisma.project.update).toHaveBeenCalledWith({ where: { id: '1' }, data: { order: 1 } });
        });
    });

    describe('updateCoverImage', () => {
        it('uploads the new image and cleans up the old one', async () => {
        (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: '1', coverImagePublicId: 'old-id' });
        (cloudinary.uploadBuffer as jest.Mock).mockResolvedValue({ url: 'https://new.jpg', publicId: 'new-id' });
        (prisma.project.update as jest.Mock).mockResolvedValue({ id: '1', coverImageUrl: 'https://new.jpg' });

        await service.updateCoverImage('1', { buffer: Buffer.from('x') } as Express.Multer.File);

        expect(cloudinary.deleteAsset).toHaveBeenCalledWith('old-id');
        });

        it('does not attempt cleanup when there was no previous image', async () => {
        (prisma.project.findUnique as jest.Mock).mockResolvedValue({ id: '1', coverImagePublicId: null });
        (cloudinary.uploadBuffer as jest.Mock).mockResolvedValue({ url: 'https://new.jpg', publicId: 'x' });
        (prisma.project.update as jest.Mock).mockResolvedValue({ id: '1' });

        await service.updateCoverImage('1', { buffer: Buffer.from('x') } as Express.Multer.File);

        expect(cloudinary.deleteAsset).not.toHaveBeenCalled();
        });
    });

    describe('removeImage', () => {
        it('deletes the DB row and triggers Cloudinary cleanup', async () => {
        (prisma.projectImage.findFirst as jest.Mock).mockResolvedValue({ id: 'img1', publicId: 'cld1' });
        (prisma.projectImage.delete as jest.Mock).mockResolvedValue({});

        await service.removeImage('proj1', 'img1');

        expect(prisma.projectImage.delete).toHaveBeenCalledWith({ where: { id: 'img1' } });
        expect(cloudinary.deleteAsset).toHaveBeenCalledWith('cld1');
        });

        it('throws NotFoundException for an image that does not belong to the project', async () => {
        (prisma.projectImage.findFirst as jest.Mock).mockResolvedValue(null);
        await expect(service.removeImage('proj1', 'img-not-here')).rejects.toThrow(NotFoundException);
        });
    });
});