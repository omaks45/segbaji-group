import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async findAllForAdmin() {
    const departments = await this.prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
    return departments.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      isActive: d.isActive,
      userCount: d._count.users,
    }));
  }

  async create(dto: CreateDepartmentDto) {
    try {
      return await this.prisma.department.create({ data: dto });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const department = await this.findOneOrThrow(id);

    if (dto.isActive === false) {
      const userCount = await this.prisma.user.count({ where: { departmentId: id } });
      if (userCount > 0) {
        throw new BadRequestException(
          `Cannot deactivate "${department.name}" — ${userCount} user(s) are still assigned to it. Reassign them first.`,
        );
      }
    }

    try {
      return await this.prisma.department.update({ where: { id }, data: dto });
    } catch (err) {
      throw this.translateUniqueConstraintError(err);
    }
  }

  private async findOneOrThrow(id: string) {
    const department = await this.prisma.department.findUnique({ where: { id } });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  private translateUniqueConstraintError(err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return new ConflictException('A department with this name already exists');
    }
    return err;
  }
}