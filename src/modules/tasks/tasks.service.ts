import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { hasPermission } from '../../common/permissions/has-permission.util';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { translatePrismaWriteError } from '../../common/prisma/prisma-error.util';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { NotificationsService } from '../notification/notification.service';

const TASK_INCLUDE = {
  assignee: { select: { id: true, fullName: true, profilePictureUrl: true } },
  assignedBy: { select: { id: true, fullName: true } },
  department: { select: { id: true, name: true } },
};

interface NotifiableTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: Date | null;
  departmentId: string;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly notifications: NotificationsService
  ) {}

  private assertCanManageDepartment(user: JwtPayload, departmentId: string) {
    if (hasPermission(user.permissions, '*')) return;
    if (!hasPermission(user.permissions, PERMISSIONS.TASKS_WRITE) || user.departmentId !== departmentId) {
      throw new ForbiddenException('You can only manage tasks within your own department');
    }
  }

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

    const department = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
    if (!department) throw new BadRequestException('departmentId does not match a real department');

    if (dto.assigneeId) {
      const assignee = await this.prisma.user.findUnique({ where: { id: dto.assigneeId } });
      if (!assignee || assignee.departmentId !== dto.departmentId) {
        throw new BadRequestException('assigneeId must belong to the same department as the task');
      }
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) throw new BadRequestException('projectId does not match a real project');
    }

    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({ where: { id: dto.propertyId } });
      if (!property) throw new BadRequestException('propertyId does not match a real property');
    }

    let task;
    try {
      task = await this.prisma.task.create({
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
    } catch (err) {
      throw translatePrismaWriteError(err, {
        projectId: 'projectId', propertyId: 'propertyId', assigneeId: 'assigneeId', departmentId: 'departmentId',
      });
    }

    // Fire-and-forget — a failed notification should never undo or block
    // an otherwise-successful task creation. Logged, not thrown.
    if (dto.assigneeId) {
      void this.notifyAssignee(task, dto.assigneeId, creator.sub).catch((err) =>
        this.logger.error(`Failed to send task-assignment email: ${(err as Error).message}`),
      );
    } else {
      void this.notifyDepartmentLeads(task, creator.sub).catch((err) =>
        this.logger.error(`Failed to notify department leads of unassigned task: ${(err as Error).message}`),
      );
    }

    return task;
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

    let updated;
    try {
      updated = await this.prisma.task.update({
        where: { id },
        data: {
          ...dto,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          ...(dto.assigneeId && task.status === 'PENDING' && { status: 'ASSIGNED' }),
          ...(dto.status === 'COMPLETED' && !task.completedAt && { completedAt: new Date() }),
        },
        include: TASK_INCLUDE,
      });
    } catch (err) {
      throw translatePrismaWriteError(err, { assigneeId: 'assigneeId' });
    }

    // Covers both a first-time delegation (PENDING → ASSIGNED) and a
    // reassignment to someone new — either way, the person who now owns
    // it should hear about it.
    if (dto.assigneeId) {
      void this.notifyAssignee(updated, dto.assigneeId, user.sub).catch((err) =>
        this.logger.error(`Failed to send task-assignment email: ${(err as Error).message}`),
      );
    }

    return updated;
  }

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

  private async notifyAssignee(task: NotifiableTask, assigneeId: string, assignedById: string) {
    const [assignee, assignedBy, department] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: assigneeId }, select: { email: true, fullName: true } }),
      this.prisma.user.findUnique({ where: { id: assignedById }, select: { fullName: true } }),
      this.prisma.department.findUnique({ where: { id: task.departmentId }, select: { name: true } }),
    ]);
    if (!assignee?.email) return;

    const dashboardUrl = `${this.config.get<string>('appUrl')}/tasks`;
    await this.mail.sendMail(
      assignee.email,
      `New task assigned to you: ${task.title}`,
      `<p>Hi ${assignee.fullName ?? ''},</p>
        <p><strong>${assignedBy?.fullName ?? 'An admin'}</strong> assigned you a new task in <strong>${department?.name ?? 'your department'}</strong>.</p>
        <p><strong>${task.title}</strong></p>
        ${task.description ? `<p>${task.description}</p>` : ''}
        <p>Priority: ${task.priority}${task.dueDate ? ` &middot; Due: ${task.dueDate.toISOString().slice(0, 10)}` : ''}</p>
        <p><a href="${dashboardUrl}">View it on your dashboard</a></p>`,
    );
  }

  private async notifyDepartmentLeads(task: NotifiableTask, assignedById: string) {
    const [leads, assignedBy, department] = await Promise.all([
      this.prisma.user.findMany({
        where: { departmentId: task.departmentId, status: 'ACTIVE', role: { permissions: { has: '*:write' } } },
        select: { email: true, fullName: true },
      }),
      this.prisma.user.findUnique({ where: { id: assignedById }, select: { fullName: true } }),
      this.prisma.department.findUnique({ where: { id: task.departmentId }, select: { name: true } }),
    ]);
    if (leads.length === 0) return;

    const dashboardUrl = `${this.config.get<string>('appUrl')}/tasks`;
    await Promise.all(
      leads
        .filter((lead): lead is { email: string; fullName: string | null } => Boolean(lead.email))
        .map((lead) =>
          this.mail.sendMail(
            lead.email,
            `New task needs delegation: ${task.title}`,
            `<p>Hi ${lead.fullName ?? ''},</p>
              <p><strong>${assignedBy?.fullName ?? 'An admin'}</strong> assigned a new task to <strong>${department?.name ?? 'your department'}</strong> — it doesn't have an owner yet.</p>
              <p><strong>${task.title}</strong></p>
              ${task.description ? `<p>${task.description}</p>` : ''}
              <p>Priority: ${task.priority}</p>
              <p><a href="${dashboardUrl}">Assign it from your department dashboard</a></p>`,
          ),
        ),
    );
  }
}