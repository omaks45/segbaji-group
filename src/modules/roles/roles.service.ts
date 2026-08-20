import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PROTECTED_ROLE_NAME } from '../../common/permissions/super-admin.util';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public dropdown list — unchanged. */
  findAll() {
    return this.prisma.role.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllForAdmin() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      permissions: r.permissions,
      isActive: r.isActive,
      userCount: r._count.users,
    }));
  }

  async create(dto: CreateRoleDto) {
    try {
      return await this.prisma.role.create({ data: dto });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.findOneOrThrow(id);

    // The Super Admin role is a structural dependency for the rest of
    // the system (seed script, login, lockout checks all assume it
    // exists, is active, and grants "*") — protect it the same way a
    // foreign-key constraint would, since nothing in the schema enforces
    // this at the database level.
    if (role.name === PROTECTED_ROLE_NAME) {
      if (dto.isActive === false) {
        throw new BadRequestException(
          `"${PROTECTED_ROLE_NAME}" cannot be deactivated — the system always needs at least one role with full access.`,
        );
      }
      if (dto.permissions && !dto.permissions.includes('*')) {
        throw new BadRequestException(`"${PROTECTED_ROLE_NAME}" must always retain the "*" permission.`);
      }
      if (dto.name && dto.name !== PROTECTED_ROLE_NAME) {
        throw new BadRequestException(`"${PROTECTED_ROLE_NAME}" cannot be renamed.`);
      }
    }

    try {
      return await this.prisma.role.update({ where: { id }, data: dto });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  private async findOneOrThrow(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  private translateUniqueConstraintError(err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictException('A role with this name already exists');
    }
    return err;
  }
}