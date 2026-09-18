import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { hasPermission } from '../../common/permissions/has-permission.util';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';

const TASK_INCLUDE = {
  assignee: { select: { id: true, fullName: true, profilePictureUrl: true } },
  assignedBy: { select: { id: true, fullName: true } },
  department: { select: { id: true, name: true } },
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The one place that decides "can this user act on tasks in this
   * department." Deliberately NOT a generic NestJS guard — this is the
   * only feature that needs department-scoped authority right now, so
   * the check lives here rather than as a new cross-cutting framework.
   * Super Admin bypasses entirely; anyone else must hold tasks:write
   * AND have this exact department on their own account.
   */
  private assertCanManageDepartment(user: JwtPayload, departmentId: string) {
    if (hasPermission(user.permissions, '*')) return;
    if (!hasPermission(user.permissions, PERMISSIONS.TASKS_WRITE) || user.departmentId !== departmentId) {
      throw new ForbiddenException('You can only manage tasks within your own department');
    }
  }

  /** Read access is looser than write: any tasks:read holder can view
   * their OWN department's board; only Super Admin can view another. */
  private resolveReadableDepartment(user: JwtPayload, requested?: string): string {
    const isSuperAdmin = hasPermission(user.permissions, '*');
    if (isSuperAdmin) {
      if (!requested) throw new BadRequestException('departmentId is required when querying as Super Admin');
      return requested;
    }
    if (requested && requested !== user.departmentId) {
      throw new ForbiddenException('You can only view tasks for your own department');
    }
    if (!user.departmentId) throw new BadRequestException('Your account has no department assigned');
    return user.departmentId;
  }

  async create(dto: CreateTaskDto, creator: JwtPayload) {
    this.assertCanManageDepartment(creator, dto.departmentId);

    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.assigneeId } });
      if (!assignee || assignee.departmentId !== dto.departmentId) {
        throw new BadRequestException('assigneeId must belong to the same department as the task');
      }
    }

    return this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        departmentId: dto.departmentId,
        assigneeId: dto.assigneeId,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        projectId: dto.projectId,
        propertyId: dto.propertyId,
        assignedById: creator.sub,
        status: dto.assigneeId ? 'ASSIGNED' : 'PENDING',
      },
      include: TASK_INCLUDE,
    });
  }

  async findDepartmentTasks(user: JwtPayload, query: TaskQueryDto) {
    const departmentId = this.resolveReadableDepartment(user, query.departmentId);
    const where: Prisma.TaskWhereInput = {
      departmentId,
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.assigneeId && { assigneeId: query.assigneeId }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        include: TASK_INCLUDE,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  async findMine(userId: string, query: TaskQueryDto) {
    const where: Prisma.TaskWhereInput = {
      assigneeId: userId,
      ...(query.status && { status: query.status }),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({
        where,
        ...paginationSkipTake(query.page, query.pageSize),
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        include: TASK_INCLUDE,
      }),
      this.prisma.task.count({ where }),
    ]);
    return { items, meta: buildPaginationMeta(query.page, query.pageSize, total) };
  }

  async update(id: string, dto: UpdateTaskDto, user: JwtPayload) {
    const task = await this.findOrThrow(id);
    this.assertCanManageDepartment(user, task.departmentId);

    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.assigneeId } });
      if (!assignee || assignee.departmentId !== task.departmentId) {
        throw new BadRequestException('assigneeId must belong to the same department as the task');
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        ...(dto.assigneeId && task.status === 'PENDING' && { status: 'ASSIGNED' }),
        ...(dto.status === 'COMPLETED' && !task.completedAt && { completedAt: new Date() }),
      },
      include: TASK_INCLUDE,
    });
  }

  /** Self-service — the assignee moving their own task along, no department-authority check needed. */
  async updateMyTaskStatus(id: string, userId: string, status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') {
    const task = await this.findOrThrow(id);
    if (task.assigneeId !== userId) {
      throw new ForbiddenException('You can only update the status of tasks assigned to you');
    }
    return this.prisma.task.update({
      where: { id },
      data: { status, ...(status === 'COMPLETED' && { completedAt: new Date() }) },
      include: TASK_INCLUDE,
    });
  }

  private async findOrThrow(id: string) {
    const task = await this.prisma.task.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}