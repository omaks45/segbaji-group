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
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';
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
  @ApiOperation({ summary: 'Quote request counts by status — scoped to the caller’s department unless they hold org-wide access' })
  @ApiOkResponse({ type: QuoteRequestSummaryDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get('summary')
  summary(@CurrentUser() user: JwtPayload) {
    return this.quoteRequestsService.findSummary(user);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List quote requests — filter by status/service/search, paginated, department-scoped' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get()
  findAll(@Query() query: QuoteRequestQueryDto, @CurrentUser() user: JwtPayload) {
    return this.quoteRequestsService.findAll(query, user);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Export quote requests as CSV or XLSX — department-scoped' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get('export')
  async exportQuoteRequests(
    @Query() query: QuoteRequestQueryDto,
    @CurrentUser() user: JwtPayload,
    @Res() res: ExpressResponse,
  ) {
    const format = parseExportFormat(query.format);
    const rows = await this.quoteRequestsService.findAllForExport(query, user);
    const buffer = format === 'xlsx'
      ? await buildTableXlsx(rows, QUOTE_REQUEST_EXPORT_COLUMNS, 'Quote Requests')
      : buildTableCsv(rows, QUOTE_REQUEST_EXPORT_COLUMNS);
    sendFileResponse(res, buffer, 'quote-requests-export', format);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a single quote request — 404s if outside the caller’s department' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.quoteRequestsService.findOne(id, user);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a quote request’s status' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateQuoteRequestStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.quoteRequestsService.updateStatus(id, dto, user);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Convert this quote request into a Client record' })
  @ApiOkResponse({ type: ConvertToClientResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @Post(':id/convert-to-client')
  convertToClient(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.quoteRequestsService.convertToClient(id, user);
  }

}