import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
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
import { buildTableCsv, buildTableXlsx, ExportColumn } from 'src/common/export/table-export.util';
import { parseExportFormat } from '../../common/export/parse-export-format.util';
import { sendFileResponse } from '../../common/export/send-file-response.util';
import { Client } from 'src/generated/prisma/client';
import type { Response as ExpressResponse } from 'express';


const CLIENT_EXPORT_COLUMNS: ExportColumn<Client>[] = [
  { header: 'Full Name', value: (c) => c.fullName },
  { header: 'Email', value: (c) => c.email },
  { header: 'Phone', value: (c) => c.phone },
  { header: 'Organization', value: (c) => c.organization },
  { header: 'Source', value: (c) => c.source },
  { header: 'Active', value: (c) => c.isActive },
  { header: 'Created', value: (c) => c.createdAt.toISOString() },
];

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

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Export clients as CSV or XLSX' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get('export')
  async exportClients(
    @Query() query: ClientQueryDto,
    @Query('format') formatQuery: unknown,
    @Res() res: ExpressResponse,
  ) {
    const format = parseExportFormat(formatQuery);
    const rows = await this.clientsService.findAllForExport(query);
    const buffer = format === 'xlsx'
      ? await buildTableXlsx(rows, CLIENT_EXPORT_COLUMNS, 'Clients')
      : buildTableCsv(rows, CLIENT_EXPORT_COLUMNS);
    sendFileResponse(res, buffer, 'clients-export', format);
  }
}