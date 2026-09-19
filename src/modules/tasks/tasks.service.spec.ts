import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { TasksService } from './tasks.service';
import type { PrismaService } from '../../common/prisma/prisma.service';
import type { JwtPayload } from '../auth/decorators/current-user.decorator';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

function buildMockPrisma() {
  return {
    task: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    department: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    $transaction: jest.fn((ops: unknown) => (Array.isArray(ops) ? Promise.all(ops) : ops)),
  } as unknown as PrismaService;
}

const superAdmin: JwtPayload = { sub: 'admin1', role: 'Super Admin', permissions: ['*'], sessionId: 's1', departmentId: 'deptAdmin' };
const engineeringTeamLead: JwtPayload = { sub: 'lead1', role: 'Team Leader', permissions: ['*:read', '*:write'], sessionId: 's2', departmentId: 'deptEngineering' };
const designStaff: JwtPayload = { sub: 'staff1', role: 'Interior Designer', permissions: ['content:read', 'content:write', 'leads:read', 'tasks:read'], sessionId: 's3', departmentId: 'deptDesign' };

describe('TasksService — department scoping', () => {
  let prisma: ReturnType<typeof buildMockPrisma>;
  let service: TasksService;
  let mailService: MailService;
  let configService: ConfigService;

  beforeEach(() => {
    prisma = buildMockPrisma();
    mailService = { sendMail: jest.fn().mockResolvedValue(undefined) } as unknown as MailService;
    configService = { get: jest.fn().mockReturnValue('http://localhost:5173') } as unknown as ConfigService;
    service = new TasksService(prisma, mailService, configService);
    (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'deptEngineering' });
    // Quiets the background "notify department leads" path for tests
    // that don't care about it — without this, any test hitting the
    // no-assignee branch logs an (expected, harmless) error because
    // findMany() is otherwise unmocked and returns undefined.
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('create', () => {
    it('Super Admin can create a task in ANY department', async () => {
      (prisma.task.create as jest.Mock).mockResolvedValue({ id: 't1' });
      await expect(
        service.create({ title: 'X', departmentId: 'deptDesign' } as never, superAdmin),
      ).resolves.toBeDefined();
    });

    it('a Team Lead can create a task in their OWN department', async () => {
      (prisma.task.create as jest.Mock).mockResolvedValue({ id: 't1' });
      await expect(
        service.create({ title: 'X', departmentId: 'deptEngineering' } as never, engineeringTeamLead),
      ).resolves.toBeDefined();
    });

    it('a Team Lead CANNOT create a task in a different department', async () => {
      await expect(
        service.create({ title: 'X', departmentId: 'deptDesign' } as never, engineeringTeamLead),
      ).rejects.toThrow(ForbiddenException);
    });

    it('a VIEW/EDIT-tier staff member cannot create tasks at all, even in their own department', async () => {
      await expect(
        service.create({ title: 'X', departmentId: 'deptDesign' } as never, designStaff),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects assigning to a user outside the task\'s department', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', departmentId: 'deptDesign' });
      await expect(
        service.create(
          { title: 'X', departmentId: 'deptEngineering', assigneeId: 'u1' } as never,
          engineeringTeamLead,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a departmentId that does not exist', async () => {
      (prisma.department.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.create({ title: 'X', departmentId: 'ghost-dept' } as never, superAdmin),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a projectId that does not exist', async () => {
      (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'deptEngineering' });
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.create(
          { title: 'X', departmentId: 'deptEngineering', projectId: 'ghost-project' } as never,
          engineeringTeamLead,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('translates an unexpected foreign-key violation into a clean 400 rather than a raw Prisma error', async () => {
      (prisma.department.findUnique as jest.Mock).mockResolvedValue({ id: 'deptEngineering' });
      const fkError = new Prisma.PrismaClientKnownRequestError('FK violation', {
        code: 'P2003',
        clientVersion: '7.9.1',
        meta: { field_name: 'Task_projectId_fkey (index)' },
      });
      (prisma.task.create as jest.Mock).mockRejectedValue(fkError);
      await expect(
        service.create({ title: 'X', departmentId: 'deptEngineering' } as never, engineeringTeamLead),
      ).rejects.toThrow(BadRequestException);
    });

    it('emails the assignee when a task is created with one', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'u1', departmentId: 'deptEngineering' }) // assignee validity check
        .mockResolvedValueOnce({ email: 'assignee@example.com', fullName: 'Jane' }) // notifyAssignee's assignee lookup
        .mockResolvedValueOnce({ fullName: 'Admin' }); // notifyAssignee's assignedBy lookup
      (prisma.department.findUnique as jest.Mock).mockResolvedValue({ name: 'Engineering' });
      (prisma.task.create as jest.Mock).mockResolvedValue({ id: 't1', title: 'X', departmentId: 'deptEngineering' });

      await service.create({ title: 'X', departmentId: 'deptEngineering', assigneeId: 'u1' } as never, engineeringTeamLead);
      await new Promise(process.nextTick); // let the fire-and-forget notification settle

      expect(mailService.sendMail).toHaveBeenCalledWith(
        'assignee@example.com',
        expect.stringContaining('New task assigned to you'),
        expect.any(String),
      );
    });

    it('emails department leads (not the creator) when a task is created with no assignee', async () => {
      (prisma.task.create as jest.Mock).mockResolvedValue({ id: 't1', title: 'X', departmentId: 'deptEngineering' });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ email: 'lead@example.com', fullName: 'Lead' }]);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ fullName: 'Admin' });
      (prisma.department.findUnique as jest.Mock).mockResolvedValue({ name: 'Engineering' });

      await service.create({ title: 'X', departmentId: 'deptEngineering' } as never, engineeringTeamLead);
      await new Promise(process.nextTick);

      expect(mailService.sendMail).toHaveBeenCalledWith(
        'lead@example.com',
        expect.stringContaining('needs delegation'),
        expect.any(String),
      );
    });

    it('does not throw when the assignee has no email on file', async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'u1', departmentId: 'deptEngineering' })
        .mockResolvedValueOnce({ email: null, fullName: 'Jane' });
      (prisma.task.create as jest.Mock).mockResolvedValue({ id: 't1', title: 'X', departmentId: 'deptEngineering' });

      await expect(
        service.create({ title: 'X', departmentId: 'deptEngineering', assigneeId: 'u1' } as never, engineeringTeamLead),
      ).resolves.toBeDefined();
      await new Promise(process.nextTick);
      expect(mailService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('findDepartmentTasks', () => {
    it('Super Admin MUST specify departmentId — no implicit "all departments" query', async () => {
      await expect(service.findDepartmentTasks(superAdmin, {} as never)).rejects.toThrow(BadRequestException);
    });

    it('a non-Super-Admin querying their OWN department succeeds', async () => {
      (prisma.task.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.task.count as jest.Mock).mockResolvedValue(0);
      await expect(
        service.findDepartmentTasks(designStaff, { departmentId: 'deptDesign' } as never),
      ).resolves.toBeDefined();
    });

    it('a non-Super-Admin querying ANOTHER department is rejected', async () => {
      await expect(
        service.findDepartmentTasks(designStaff, { departmentId: 'deptEngineering' } as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('updateMyTaskStatus', () => {
    it('rejects updating a task not assigned to you, even if you created it', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({ id: 't1', assigneeId: 'someoneElse' });
      await expect(service.updateMyTaskStatus('t1', 'lead1', 'IN_PROGRESS')).rejects.toThrow(ForbiddenException);
    });

    it('allows the actual assignee to update their own task', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue({ id: 't1', assigneeId: 'staff1' });
      (prisma.task.update as jest.Mock).mockResolvedValue({ id: 't1', status: 'IN_PROGRESS' });
      await expect(service.updateMyTaskStatus('t1', 'staff1', 'IN_PROGRESS')).resolves.toBeDefined();
    });

    it('throws NotFoundException for a task that does not exist', async () => {
      (prisma.task.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.updateMyTaskStatus('ghost', 'staff1', 'IN_PROGRESS')).rejects.toThrow(NotFoundException);
    });
  });
});