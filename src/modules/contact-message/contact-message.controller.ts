import { Body, Controller, Get, Param, Patch, Post, Query, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactMessagesService } from './contact-message.service';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';
import { ContactMessageQueryDto } from './dto/contact-message-query.dto';
import { UpdateContactMessageStatusDto } from './dto/update-contact-message.dto';
import { ContactMessageSubmittedDto, ContactMessageSummaryDto } from './dto/contact-message-responses.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { ConvertToClientResponseDto } from '../clients/dto/client-responses.dto';
import type { ContactMessage } from '../../generated/prisma/client';
import { ExportColumn } from 'src/common/export/table-export.util';
import type { Response as ExpressResponse } from 'express';
import { buildTableCsv, buildTableXlsx} from '../../common/export/table-export.util';
import { sendFileResponse } from '../../common/export/send-file-response.util';
import { parseExportFormat } from '../../common/export/parse-export-format.util';


const CONTACT_MESSAGE_EXPORT_COLUMNS: ExportColumn<ContactMessage>[] = [
  { header: 'Full Name', value: (c) => c.fullName },
  { header: 'Email', value: (c) => c.email },
  { header: 'Phone', value: (c) => c.phone },
  { header: 'Subject', value: (c) => c.subject },
  { header: 'Message', value: (c) => c.message },
  { header: 'Status', value: (c) => c.status },
  { header: 'Created', value: (c) => c.createdAt.toISOString() },
];

@ApiTags('Contact Messages')
@Controller('contact-messages')
export class ContactMessagesController {
  constructor(private readonly contactMessagesService: ContactMessagesService) {}

  @ApiOperation({ summary: 'Submit a contact message — public' })
  @ApiOkResponse({ type: ContactMessageSubmittedDto })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  create(@Body() dto: CreateContactMessageDto) {
    return this.contactMessagesService.create(dto);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Contact message counts by status' })
  @ApiOkResponse({ type: ContactMessageSummaryDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get('summary')
  summary() {
    return this.contactMessagesService.findSummary();
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List contact messages — filter by status/search, paginated' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get()
  findAll(@Query() query: ContactMessageQueryDto) {
    return this.contactMessagesService.findAll(query);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a single contact message (marks it read)' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.contactMessagesService.findOne(id);
  }

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a contact message\u2019s status' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateContactMessageStatusDto) {
    return this.contactMessagesService.updateStatus(id, dto);
  }


  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Convert this contact message into a Client record' })
  @ApiOkResponse({ type: ConvertToClientResponseDto })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_WRITE)
  @Post(':id/convert-to-client')
  convertToClient(@Param('id') id: string) {
    return this.contactMessagesService.convertToClient(id);
  }


  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Export contact messages as CSV or XLSX' })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(PERMISSIONS.LEADS_READ)
  @Get('export')
  async exportContactMessages(
    @Query() query: ContactMessageQueryDto,
    @Query('format') formatQuery: unknown,
    @Res() res: ExpressResponse,
  ) {
    const format = parseExportFormat(formatQuery);
    const rows = await this.contactMessagesService.findAllForExport(query);
    const buffer = format === 'xlsx'
      ? await buildTableXlsx(rows, CONTACT_MESSAGE_EXPORT_COLUMNS, 'Contact Messages')
      : buildTableCsv(rows, CONTACT_MESSAGE_EXPORT_COLUMNS);
    sendFileResponse(res, buffer, 'contact-messages-export', format);
  }
}