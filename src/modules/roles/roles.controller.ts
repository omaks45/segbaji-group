import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RoleResponseDto } from './dto/roles-response.dto';
import { RoleAdminResponseDto } from './dto/role-admin-response.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/permissions/super-admin.guard';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: 'List active roles (for dropdowns) — public' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List all roles with permissions and user counts (Super Admin only)' })
  @ApiOkResponse({ type: RoleAdminResponseDto, isArray: true })
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get('admin')
  findAllForAdmin() {
    return this.rolesService.findAllForAdmin();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a role (Super Admin only)' })
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Update a role's name, permissions, or active status (Super Admin only)" })
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }
}