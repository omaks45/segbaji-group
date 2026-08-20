import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, jest } from '@jest/globals';
import { assertNotLastActiveSuperAdmin } from './super-admin.util';
import { PrismaService } from '../prisma/prisma.service';

function mockPrisma(count: number): PrismaService {
    return { user: { count: jest.fn<() => Promise<number>>().mockResolvedValue(count) } } as unknown as PrismaService;
    }

    describe('assertNotLastActiveSuperAdmin', () => {
    it('does nothing when more than one active Super Admin exists', async () => {
        await expect(assertNotLastActiveSuperAdmin(mockPrisma(2))).resolves.toBeUndefined();
    });

    it('throws when only one active Super Admin remains', async () => {
        await expect(assertNotLastActiveSuperAdmin(mockPrisma(1))).rejects.toThrow(BadRequestException);
    });

    it('throws defensively even if the count is somehow zero', async () => {
        await expect(assertNotLastActiveSuperAdmin(mockPrisma(0))).rejects.toThrow(BadRequestException);
    });
});