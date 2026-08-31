import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportsExportService } from './reports-export.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { GeneratedReportDto } from './dto/generated-report-responses.dto';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/permissions/permissions.guard';
import { RequirePermissions } from '../../common/permissions/require-permissions.decorator';
import { PERMISSIONS } from '../../common/permissions/permission.constants';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Generated Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports/generated')
export class GeneratedReportsController {
    constructor(private readonly reportsExportService: ReportsExportService) {}

    @ApiOperation({ summary: 'Generate a new report (runs as a background job — poll GET /:id for status)' })
    @RequirePermissions(PERMISSIONS.REPORTS_WRITE)
    @Post()
    generate(@Body() dto: GenerateReportDto, @CurrentUser() user: JwtPayload) {
        return this.reportsExportService.generate(dto, user.sub);
    }

    @ApiOperation({ summary: 'List previously generated reports — the "Detailed Reports" history' })
    @ApiOkResponse({ type: GeneratedReportDto, isArray: true })
    @RequirePermissions(PERMISSIONS.REPORTS_READ)
    @Get()
    findAll(@Query() query: PaginationQueryDto) {
        return this.reportsExportService.findAll(query);
    }

    @ApiOperation({ summary: 'Get one report — check status/fileUrl while a generation job is in progress' })
    @ApiOkResponse({ type: GeneratedReportDto })
    @RequirePermissions(PERMISSIONS.REPORTS_READ)
    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.reportsExportService.findOne(id);
    }
    }