import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { DateRangePreset } from '../../../common/date-range/date-range.util';
import { ReportFormat } from '../../../generated/prisma/client';

export class GenerateReportDto {
    @ApiPropertyOptional({ example: 'August Performance Report' })
    @IsOptional() @IsString() @MaxLength(150)
    name?: string;

    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)
    description?: string;

    @ApiProperty({ enum: ReportFormat })
    @IsEnum(ReportFormat)
    format!: ReportFormat;

    @ApiProperty({ enum: DateRangePreset })
    @IsEnum(DateRangePreset)
    preset!: DateRangePreset;

    @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
    @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
}