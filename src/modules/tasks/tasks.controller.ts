import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @ApiOperation({ summary: 'Tasks assigned to me' })
  @Get('mine')
  findMine(@Query() query: TaskQueryDto, @CurrentUser() user: JwtPayload) {
    return this.tasksService.findMine(user.sub, query);
  }

  @ApiOperation({ summary: "My department's task board (Super Admin must pass ?departmentId=)" })
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.TASKS_READ)
  @Get('department')
  findDepartmentTasks(@Query() query: TaskQueryDto, @CurrentUser() user: JwtPayload) {
    return this.tasksService.findDepartmentTasks(user, query);
  }

  @ApiOperation({ summary: 'Create and assign a task (Team Lead: own department only; Super Admin: any)' })
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.TASKS_WRITE)
  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: JwtPayload) {
    return this.tasksService.create(dto, user);
  }

  @ApiOperation({ summary: 'Edit/reassign a task (Team Lead: own department only; Super Admin: any)' })
  @UseGuards(PermissionsGuard)
  @RequirePermissions(PERMISSIONS.TASKS_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: JwtPayload) {
    return this.tasksService.update(id, dto, user);
  }

  @ApiOperation({ summary: 'Update the status of a task assigned to ME' })
  @Patch(':id/status')
  updateMyStatus(@Param('id') id: string, @Body() dto: UpdateTaskStatusDto, @CurrentUser() user: JwtPayload) {
    return this.tasksService.updateMyTaskStatus(id, user.sub, dto.status);
  }
}