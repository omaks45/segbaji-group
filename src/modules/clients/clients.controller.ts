import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientQueryDto } from './dto/client-query.dto';
import { ClientListItemDto, ClientSummaryDto } from './dto/client-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';

@ApiTags('Clients')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @ApiOperation({ summary: 'Manually create a client' })
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @Post()
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @ApiOperation({ summary: 'Client counts — total/active/inactive' })
  @ApiOkResponse({ type: ClientSummaryDto })
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get('summary')
  summary() {
    return this.clientsService.findSummary();
  }

  @ApiOperation({ summary: 'List clients — filter by status/source/search, paginated' })
  @ApiOkResponse({ type: ClientListItemDto, isArray: true })
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get()
  findAll(@Query() query: ClientQueryDto) {
    return this.clientsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get a client, including every lead that converted into them' })
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @ApiOperation({ summary: 'Update a client, including activating/deactivating them' })
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }
}