import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
}