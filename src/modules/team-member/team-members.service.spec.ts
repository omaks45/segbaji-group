import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TeamMembersService } from './team-member.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthService } from '../auth/auth.service';
import * as superAdminUtil from '../../common/permissions/super-admin.util';

jest.mock('../../common/permissions/super-admin.util', () => ({
    ...jest.requireActual('../../common/permissions/super-admin.util'),
    assertNotLastActiveSuperAdmin: jest.fn(),
}));

function buildMockPrisma() {
    return {
        user: {
        groupBy: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        },
        role: { findUnique: jest.fn() },
        department: { findUnique: jest.fn() },
        $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
    } as unknown as PrismaService;
    }

    describe('TeamMembersService', () => {
    let prisma: ReturnType<typeof buildMockPrisma>;
    let authService: AuthService;
    let service: TeamMembersService;

    beforeEach(() => {
        jest.clearAllMocks();
        prisma = buildMockPrisma();
        authService = { resendInvite: jest.fn() } as unknown as AuthService;
        service = new TeamMembersService(prisma, authService);
    });

    describe('findSummary', () => {
        it('aggregates status counts into total/active/inactive/pending', async () => {
        (prisma.user.groupBy as jest.Mock).mockResolvedValue([
            { status: 'ACTIVE', _count: 5 },
            { status: 'PENDING', _count: 2 },
        ]);
        const result = await service.findSummary();
        expect(result).toEqual({ total: 7, active: 5, inactive: 0, pending: 2 });
        });
    });

    describe('update — self-lockout protection', () => {
        it('blocks a user from changing their own status', async () => {
        await expect(
            service.update('user1', { status: 'INACTIVE' } as never, 'user1'),
        ).rejects.toThrow(ForbiddenException);
        });

        it('blocks a user from changing their own role', async () => {
        await expect(
            service.update('user1', { roleId: 'role2' } as never, 'user1'),
        ).rejects.toThrow(ForbiddenException);
        });

        it('allows a user to have their department changed by someone else without hitting the self-lockout check', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user1', roleId: 'role1', role: { name: 'Site Engineer' }, status: 'ACTIVE',
        });
        (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'dept2', isActive: true });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user1' });

        await expect(
            service.update('user1', { departmentId: 'dept2' } as never, 'admin1'),
        ).resolves.toBeDefined();
        });
    });

    describe('update — last-Super-Admin protection', () => {
        it('checks the lockout guard when deactivating an active Super Admin', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user2', roleId: 'roleSA', role: { name: 'Super Admin' }, status: 'ACTIVE',
        });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user2' });

        await service.update('user2', { status: 'INACTIVE' } as never, 'admin1');

        expect(superAdminUtil.assertNotLastActiveSuperAdmin).toHaveBeenCalledWith(prisma);
        });

        it('checks the lockout guard when reassigning an active Super Admin to a different role', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user2', roleId: 'roleSA', role: { name: 'Super Admin' }, status: 'ACTIVE',
        });
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role2', isActive: true });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user2' });

        await service.update('user2', { roleId: 'role2' } as never, 'admin1');

        expect(superAdminUtil.assertNotLastActiveSuperAdmin).toHaveBeenCalled();
        });

        it('does not check the lockout guard for a non-Super-Admin user', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user3', roleId: 'role1', role: { name: 'Site Engineer' }, status: 'ACTIVE',
        });
        (prisma.user.update as jest.Mock).mockResolvedValue({ id: 'user3' });

        await service.update('user3', { status: 'INACTIVE' } as never, 'admin1');

        expect(superAdminUtil.assertNotLastActiveSuperAdmin).not.toHaveBeenCalled();
        });

        it('propagates the lockout error and never calls update', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user2', roleId: 'roleSA', role: { name: 'Super Admin' }, status: 'ACTIVE',
        });
        (superAdminUtil.assertNotLastActiveSuperAdmin as jest.Mock).mockRejectedValue(
            new BadRequestException('last admin'),
        );

        await expect(
            service.update('user2', { status: 'INACTIVE' } as never, 'admin1'),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.user.update).not.toHaveBeenCalled();
        });
    });

    describe('update — role/department validation', () => {
        it('rejects an inactive role', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user3', roleId: 'role1', role: { name: 'Site Engineer' }, status: 'ACTIVE',
        });
        (prisma.role.findUnique as jest.Mock).mockResolvedValue({ id: 'role2', isActive: false });

        await expect(
            service.update('user3', { roleId: 'role2' } as never, 'admin1'),
        ).rejects.toThrow(BadRequestException);
        });

        it('throws NotFoundException for a missing user', async () => {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        await expect(service.update('missing', {} as never, 'admin1')).rejects.toThrow(NotFoundException);
        });
    });

    describe('resendInvite', () => {
        it('delegates to AuthService.resendInvite', async () => {
        (authService.resendInvite as jest.Mock).mockResolvedValue({ message: 'Invite resent' });
        const result = await service.resendInvite('user1');
        expect(authService.resendInvite).toHaveBeenCalledWith('user1');
        expect(result).toEqual({ message: 'Invite resent' });
        });
    });
});