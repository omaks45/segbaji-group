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
}