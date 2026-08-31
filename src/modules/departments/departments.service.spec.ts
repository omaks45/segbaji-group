import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { DepartmentsService } from './departments.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

function buildMockPrisma() {
    return {
        department: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        },
        user: { count: jest.fn() },
    } as unknown as PrismaService;
    }

    describe('DepartmentsService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let service: DepartmentsService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        service = new DepartmentsService(prisma);
    });

    describe('create', () => {
        it('creates a department', async () => {
        (prisma.department.create as jest.Mock).mockResolvedValue({ id: '1', name: 'Engineering' });
        const result = await service.create({ name: 'Engineering' } as never);
        expect(result).toEqual({ id: '1', name: 'Engineering' });
        });

        it('translates a duplicate name into ConflictException', async () => {
        const err = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '7.9.1' });
        (prisma.department.create as jest.Mock).mockRejectedValue(err);
        await expect(service.create({ name: 'Engineering' } as never)).rejects.toThrow(ConflictException);
        });
    });

    describe('update', () => {
        it('throws NotFoundException for a missing department', async () => {
        (prisma.department.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.update('missing', {} as never)).rejects.toThrow(NotFoundException);
        });

        it('blocks deactivation when users are still assigned', async () => {
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: '1', name: 'Engineering' });
        (prisma.user.count as jest.Mock).mockResolvedValue(3);

        await expect(service.update('1', { isActive: false } as never)).rejects.toThrow(BadRequestException);
        expect(prisma.department.update).not.toHaveBeenCalled();
        });

        it('allows deactivation when no users are assigned', async () => {
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: '1', name: 'Engineering' });
        (prisma.user.count as jest.Mock).mockResolvedValue(0);
        (prisma.department.update as jest.Mock).mockResolvedValue({ id: '1', isActive: false });

        const result = await service.update('1', { isActive: false } as never);
        expect(result.isActive).toBe(false);
        });

        it('does not check user count when isActive is not being changed', async () => {
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: '1', name: 'Engineering' });
        (prisma.department.update as jest.Mock).mockResolvedValue({ id: '1', name: 'New Name' });

        await service.update('1', { name: 'New Name' } as never);
        expect(prisma.user.count).not.toHaveBeenCalled();
        });

        it('translates a rename conflict into ConflictException', async () => {
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: '1', name: 'Engineering' });
        const err = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '7.9.1' });
        (prisma.department.update as jest.Mock).mockRejectedValue(err);

        await expect(service.update('1', { name: 'Operations' } as never)).rejects.toThrow(ConflictException);
        });
    });
});