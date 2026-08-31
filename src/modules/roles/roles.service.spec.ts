import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { RolesService } from './roles.service';
import type { PrismaService } from '../../common/prisma/prisma.service';

function buildMockPrisma() {
    return {
        role: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    } as unknown as PrismaService;
    }

    describe('RolesService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let service: RolesService;

    beforeEach(() => {
        prisma = buildMockPrisma();
        service = new RolesService(prisma);
    });

    describe('update — Super Admin protections', () => {
        const superAdminRole = { id: '1', name: 'Super Admin', permissions: ['*'], isActive: true };

        beforeEach(() => {
        (prisma.role.findUnique as jest.Mock).mockResolvedValue(superAdminRole);
        });

        it('blocks deactivating the Super Admin role', async () => {
        await expect(service.update('1', { isActive: false } as never)).rejects.toThrow(BadRequestException);
        expect(prisma.role.update).not.toHaveBeenCalled();
        });

        it('blocks removing the "*" permission from the Super Admin role', async () => {
        await expect(
            service.update('1', { permissions: ['content:read'] } as never),
        ).rejects.toThrow(BadRequestException);
        });

        it('allows updating Super Admin permissions as long as "*" is retained', async () => {
        (prisma.role.update as jest.Mock).mockResolvedValue({ ...superAdminRole, permissions: ['*', 'extra:key'] });
        await expect(
            service.update('1', { permissions: ['*', 'extra:key'] } as never),
        ).resolves.toBeDefined();
        });

        it('blocks renaming the Super Admin role', async () => {
        await expect(service.update('1', { name: 'Owner' } as never)).rejects.toThrow(BadRequestException);
        });
    });

    describe('update — non-protected roles', () => {
        it('allows normal updates on a non-Super-Admin role', async () => {
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: '2', name: 'Site Engineer', permissions: [] });
        (prisma.role.update as jest.Mock).mockResolvedValue({ id: '2', isActive: false });

        const result = await service.update('2', { isActive: false } as never);
        expect(result.isActive).toBe(false);
        });

        it('throws NotFoundException for a missing role', async () => {
        (prisma.role.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.update('missing', {} as never)).rejects.toThrow(NotFoundException);
        });

        it('translates a duplicate name into ConflictException', async () => {
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: '2', name: 'Site Engineer', permissions: [] });
        const err = new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: '7.9.1' });
        (prisma.role.update as jest.Mock).mockRejectedValue(err);

        await expect(service.update('2', { name: 'Surveyor' } as never)).rejects.toThrow(ConflictException);
        });
    });

    describe('create', () => {
        it('creates a role with the given permissions', async () => {
        (prisma.role.create as jest.Mock).mockResolvedValue({ id: '3', name: 'Test Viewer', permissions: ['content:read'] });
        const result = await service.create({ name: 'Test Viewer', permissions: ['content:read'] } as never);
        expect(result.permissions).toEqual(['content:read']);
        });
    });
});