import { ApiProperty } from '@nestjs/swagger';

export class KpiValueDto {
    @ApiProperty() value!: number;
    @ApiProperty({ nullable: true, description: 'null means "new" — previous period was 0' })
    percentChange!: number | null;
}

export class RevenueBreakdownDto {
    @ApiProperty() construction!: number;
    @ApiProperty() propertySales!: number;
}

export class ReportsSummaryDto {
    @ApiProperty({ type: KpiValueDto }) totalQuoteRequests!: KpiValueDto;
    @ApiProperty({ type: KpiValueDto }) projectsCreated!: KpiValueDto;
    @ApiProperty({ type: KpiValueDto }) projectsCompleted!: KpiValueDto;
    @ApiProperty({ type: KpiValueDto }) totalRevenue!: KpiValueDto;
    @ApiProperty({ type: RevenueBreakdownDto }) revenueBreakdown!: RevenueBreakdownDto;
    @ApiProperty({ type: KpiValueDto }) pendingProjects!: KpiValueDto;
}

export class TimeSeriesPointDto {
    @ApiProperty({ example: '2026-08-05' }) date!: string;
    @ApiProperty() value!: number;
}

export class ProjectsByStatusDto {
    @ApiProperty() status!: string;
    @ApiProperty() count!: number;
}

export class TopServiceDto {
    @ApiProperty() serviceId!: string;
    @ApiProperty() serviceName!: string;
    @ApiProperty() requestCount!: number;
}

export class ProjectsByLocationDto {
    @ApiProperty() state!: string;
    @ApiProperty() count!: number;
    @ApiProperty() percentage!: number;
}

export class ActivityItemDto {
    @ApiProperty({ enum: ['QUOTE_REQUEST', 'PROJECT_CREATED', 'PROJECT_COMPLETED', 'NEW_CLIENT', 'TEAM_MEMBER_ADDED'] })
    type!: string;
    @ApiProperty() description!: string;
    @ApiProperty() occurredAt!: Date;
}