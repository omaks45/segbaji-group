import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginationMeta, paginationSkipTake } from '../../common/pagination/pagination.util';
import { resolveDateRange } from '../../common/date-range/date-range.util';
import { REPORTS_EXPORT_QUEUE } from '../../common/queue/queue.constants';
import { GenerateReportDto } from './dto/generate-report.dto';
import type { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';

@Injectable()
export class ReportsExportService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue(REPORTS_EXPORT_QUEUE) private readonly queue: Queue,
    ) {}

    async generate(dto: GenerateReportDto, generatedById: string) {
        // Resolved up front so the stored record shows exactly what range
        // it covers, and so an invalid CUSTOM range fails immediately
        // rather than surfacing as a FAILED job a moment later.
        const range = resolveDateRange(dto.preset, dto.from, dto.to);

        const record = await this.prisma.generatedReport.create({
        data: {
            name: dto.name ?? `Report — ${dto.preset}`,
            description: dto.description,
            format: dto.format,
            preset: dto.preset,
            rangeFrom: range.start,
            rangeTo: range.end,
            status: 'PENDING',
            generatedById,
        },
        });

        await this.queue.add('generate', { reportId: record.id });

        return { id: record.id, status: record.status };
    }

    async findAll(query: PaginationQueryDto) {
        const [rows, total] = await this.prisma.$transaction([
        this.prisma.generatedReport.findMany({
            ...paginationSkipTake(query.page, query.pageSize),
            orderBy: { createdAt: 'desc' },
            include: { generatedBy: { select: { fullName: true } } },
        }),
        this.prisma.generatedReport.count(),
        ]);

        return {
        items: rows.map((r) => ({ ...r, generatedByName: r.generatedBy.fullName ?? 'Unknown' })),
        meta: buildPaginationMeta(query.page, query.pageSize, total),
        };
    }

    async findOne(id: string) {
        const report = await this.prisma.generatedReport.findUnique({
        where: { id },
        include: { generatedBy: { select: { fullName: true } } },
        });
        if (!report) throw new NotFoundException('Report not found');
        return { ...report, generatedByName: report.generatedBy.fullName ?? 'Unknown' };
    }
}