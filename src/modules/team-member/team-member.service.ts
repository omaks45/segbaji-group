import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { assertNotLastActiveSuperAdmin, PROTECTED_ROLE_NAME } from '../../common/permissions/super-admin.util';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { AuthService } from '../auth/auth.service';
import { TeamMemberQueryDto } from './dto/team-member-query.dto';
import { UpdateTeamMemberDto } from './dto/update-team-member.dto';

@Injectable()
export class TeamMembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /** Powers the Total/Active/Inactive/Pending stat cards. One grouped
   * query instead of four separate counts — same total DB round trips
   * regardless of how many status values exist. */
  async findSummary() {
    const grouped = await this.prisma.user.groupBy({ by: ['status'], _count: true });
    const counts: Record<'PENDING' | 'ACTIVE' | 'INACTIVE', number> = {
      PENDING: 0, ACTIVE: 0, INACTIVE: 0,
    };
    for (const row of grouped) counts[row.status] = row._count;
    return {
      total: counts.PENDING + counts.ACTIVE + counts.INACTIVE,
      active: counts.ACTIVE,
      inactive: counts.INACTIVE,
      pending: counts.PENDING,
    };
  }

  async findAll(query: TeamMemberQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.roleId && { roleId: query.roleId }),
      ...(query.departmentId && { departmentId: query.departmentId }),
      ...(query.status && { status: query.status }),
      ...(query.search && {
        OR: [
          { fullName: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    // findMany + count run as one round trip via $transaction, not two
    // sequential awaits — halves the latency on every paginated request.
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, fullName: true, email: true, phone: true, status: true,
          joinedAt: true, invitedAt: true,
          role: { select: { name: true } },
          department: { select: { name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: rows.map((u) => ({
        ...u,
        role: u.role?.name ?? null,
        department: u.department?.name ?? null,
      })),
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, fullName: true, email: true, phone: true, bio: true,
        profilePictureUrl: true, status: true, joinedAt: true, invitedAt: true,
        role: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new NotFoundException('Team member not found');
    return user;
  }

  async update(id: string, dto: UpdateTeamMemberDto, actingUserId: string) {
    if (id === actingUserId && (dto.status !== undefined || dto.roleId !== undefined)) {
      throw new ForbiddenException(
        'You cannot change your own role or status — ask another admin to do this.',
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id }, include: { role: true } });
    if (!user) throw new NotFoundException('Team member not found');

    const isCurrentlyActiveSuperAdmin = user.role?.name === PROTECTED_ROLE_NAME && user.status === 'ACTIVE';
    const wouldLoseSuperAdminStatus =
      dto.status === 'INACTIVE' || (dto.roleId !== undefined && dto.roleId !== user.roleId);

    if (isCurrentlyActiveSuperAdmin && wouldLoseSuperAdminStatus) {
      await assertNotLastActiveSuperAdmin(this.prisma);
    }

    if (dto.roleId) {
      const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (!role || !role.isActive) throw new BadRequestException('roleId does not match an active role');
    }
    if (dto.departmentId) {
      const department = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
      if (!department || !department.isActive) {
        throw new BadRequestException('departmentId does not match an active department');
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true, fullName: true, email: true, status: true,
        role: { select: { name: true } },
        department: { select: { name: true } },
      },
    });
  }

  resendInvite(id: string) {
    return this.authService.resendInvite(id);
  }
}