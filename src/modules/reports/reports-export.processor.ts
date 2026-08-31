import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { ReportsService } from './reports.service';
import { REPORTS_EXPORT_QUEUE } from '../../common/queue/queue.constants';
import { buildCsvBuffer, buildXlsxBuffer, ReportExportData } from './report-file-builder';
import type { DateRangePreset } from '../../common/date-range/date-range.util';

interface GenerateJobData {
    reportId: string;
}

@Processor(REPORTS_EXPORT_QUEUE, { concurrency: 2 })
export class ReportsExportProcessor extends WorkerHost {
    private readonly logger = new Logger(ReportsExportProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly cloudinary: CloudinaryService,
        private readonly reportsService: ReportsService,
    ) {
        super();
    }

    async process(job: Job<GenerateJobData>): Promise<void> {
        const { reportId } = job.data;
        const report = await this.prisma.generatedReport.findUniqueOrThrow({ where: { id: reportId } });

        await this.prisma.generatedReport.update({ where: { id: reportId }, data: { status: 'PROCESSING' } });

        try {
        // Reuses ReportsService's own methods — same Redis-cached
        // aggregation logic the live dashboard uses, not a second
        // parallel implementation of the same queries.
        const query = { preset: report.preset as DateRangePreset, from: report.rangeFrom.toISOString(), to: report.rangeTo.toISOString() };
        const data: ReportExportData = {
            summary: await this.reportsService.getSummary(query as never),
            quoteRequestsOverTime: await this.reportsService.getQuoteRequestsOverTime(query as never),
            projectsByStatus: await this.reportsService.getProjectsByStatus(query as never),
            revenueOverTime: await this.reportsService.getRevenueOverTime(query as never),
            topServices: await this.reportsService.getTopServices(query as never),
            projectsByLocation: await this.reportsService.getProjectsByLocation(query as never),
        };

        const buffer = report.format === 'XLSX' ? await buildXlsxBuffer(data) : buildCsvBuffer(data);
        const filename = `report-${reportId}`;
        const result = await this.cloudinary.uploadRawBuffer(buffer, {
            folder: 'segbaji/reports',
            filename,
            format: report.format === 'XLSX' ? 'xlsx' : 'csv',
        });

        await this.prisma.generatedReport.update({
            where: { id: reportId },
            data: { status: 'COMPLETED', fileUrl: result.url, filePublicId: result.publicId, completedAt: new Date() },
        });
        } catch (err) {
        this.logger.error(`Report generation failed for ${reportId}: ${(err as Error).message}`);
        await this.prisma.generatedReport.update({
            where: { id: reportId },
            data: { status: 'FAILED', errorMessage: (err as Error).message },
        });
        throw err; // lets BullMQ's retry mechanism still take effect
        }
    }
}