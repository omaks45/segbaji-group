import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuoteRequestsService } from './quote-requests.service';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto';
import { QuoteRequestQueryDto } from './dto/quote-request-query.dto';
import { UpdateQuoteRequestStatusDto } from './dto/update-quote-request-status.dto';
import { QuoteRequestSubmittedDto, QuoteRequestSummaryDto } from './dto/quote-request-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { ConvertToClientResponseDto } from '../clients/dto/client-responses.dto';
import { Res } from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { buildTableCsv, buildTableXlsx, ExportColumn } from '../../common/export/table-export.util';
import { sendFileResponse } from '../../common/export/send-file-response.util';
import { parseExportFormat } from '../../common/export/parse-export-format.util';



type QuoteRequestExportRow = Prisma.QuoteRequestGetPayload<{ include: { service: { select: { name: true } } } }>;

const QUOTE_REQUEST_EXPORT_COLUMNS: ExportColumn<QuoteRequestExportRow>[] = [
  { header: 'Full Name', value: (q) => q.fullName },
  { header: 'Email', value: (q) => q.email },
  { header: 'Phone', value: (q) => q.phone },
  { header: 'Service', value: (q) => q.service.name },
  { header: 'Location', value: (q) => q.projectLocation },
  { header: 'Budget', value: (q) => q.budgetRange },
  { header: 'Desired Start', value: (q) => q.desiredStartDate.toISOString().slice(0, 10) },
  { header: 'Status', value: (q) => q.status },
  { header: 'Created', value: (q) => q.createdAt.toISOString() },
];
@ApiTags('Quote Requests')
@Controller('quote-requests')
export class QuoteRequestsController {
  constructor(private readonly quoteRequestsService: QuoteRequestsService) {}

  @ApiOperation({ summary: 'Submit a quote request — public' })
  @ApiOkResponse({ type: QuoteRequestSubmittedDto })
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // stricter than the app default — this is the spam-prone endpoint
  @Post()
  create(@Body() dto: CreateQuoteRequestDto) {
    return this.quoteRequestsService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Quote request counts by status' })
  @ApiOkResponse({ type: QuoteRequestSummaryDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get('summary')
  summary() {
    return this.quoteRequestsService.findSummary();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List quote requests — filter by status/service/search, paginated' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get()
  findAll(@Query() query: QuoteRequestQueryDto) {
    return this.quoteRequestsService.findAll(query);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a single quote request' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.quoteRequestsService.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a quote request\u2019s status' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateQuoteRequestStatusDto) {
    return this.quoteRequestsService.updateStatus(id, dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Convert this quote request into a Client record' })
  @ApiOkResponse({ type: ConvertToClientResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @Post(':id/convert-to-client')
  convertToClient(@Param('id') id: string) {
    return this.quoteRequestsService.convertToClient(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Export quote requests as CSV or XLSX' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get('export')
  async exportQuoteRequests(
    @Query() query: QuoteRequestQueryDto,
    @Query('format') formatQuery: unknown,
    @Res() res: ExpressResponse,
  ) {
    const format = parseExportFormat(formatQuery);
    const rows = await this.quoteRequestsService.findAllForExport(query);
    const buffer = format === 'xlsx'
      ? await buildTableXlsx(rows, QUOTE_REQUEST_EXPORT_COLUMNS, 'Quote Requests')
      : buildTableCsv(rows, QUOTE_REQUEST_EXPORT_COLUMNS);
    sendFileResponse(res, buffer, 'quote-requests-export', format);
  }
}