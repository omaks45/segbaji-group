import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CoreValuesService } from './core-values.service';
import { CreateCoreValueDto } from './dto/create-core-value.dto';
import { UpdateCoreValueDto } from './dto/update-core-value.dto';
import { ReorderCoreValuesDto } from './dto/reorder-core-values.dto';
import { CoreValueResponseDto } from './dto/core-value-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

@ApiTags('Core Values')
@Controller('core-values')
export class CoreValuesController {
  constructor(private readonly coreValuesService: CoreValuesService) {}

  @ApiOperation({ summary: 'List core values, in display order — public' })
  @ApiOkResponse({ type: CoreValueResponseDto, isArray: true })
  @Get()
  findAll() {
    return this.coreValuesService.findAll();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a core value' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Post()
  create(@Body() dto: CreateCoreValueDto) {
    return this.coreValuesService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Reorder core values' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch('reorder')
  reorder(@Body() dto: ReorderCoreValuesDto) {
    return this.coreValuesService.reorder(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a core value' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCoreValueDto) {
    return this.coreValuesService.update(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a core value' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.CONTENT_WRITE)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.coreValuesService.remove(id);
  }
}