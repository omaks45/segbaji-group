import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { RoleResponseDto } from './dto/roles-response.dto';

@ApiTags('Roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @ApiOperation({ summary: 'List all active roles' })
  @ApiOkResponse({ type: RoleResponseDto, isArray: true })
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
}