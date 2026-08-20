import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { DepartmentResponseDto } from './dto/department-response.dto';
import { DepartmentAdminResponseDto } from './dto/department-admin-response.dto';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

@ApiTags('Departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @ApiOperation({ summary: 'List active departments (for dropdowns) — public' })
  @ApiOkResponse({ type: DepartmentResponseDto, isArray: true })
  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all departments with user counts — admin' })
  @ApiOkResponse({ type: DepartmentAdminResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_READ)
  @Get('admin')
  findAllForAdmin() {
    return this.departmentsService.findAllForAdmin();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a department' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_WRITE)
  @Post()
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a department, including activating/deactivating it' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.DEPARTMENTS_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }
}