import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const PROTECTED_ROLE_NAME = 'Super Admin';

/**
 * Call before any action that would remove someone's active Super Admin
 * status (deactivating them, or reassigning them off the role). Throws
 * if fewer than 2 active Super Admins currently exist — meaning the
 * person being acted on is the last one.
 */
export async function assertNotLastActiveSuperAdmin(prisma: PrismaService): Promise<void> {
    const activeSuperAdminCount = await prisma.user.count({
        where: { status: 'ACTIVE', role: { name: PROTECTED_ROLE_NAME } },
    });
    if (activeSuperAdminCount <= 1) {
        throw new BadRequestException(
        'Cannot remove the last active Super Admin — promote another user to Super Admin first.',
        );
    }
}