import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { DateRangePreset } from '../../../common/date-range/date-range.util';

export class ReportsQueryDto {
    @ApiPropertyOptional({ enum: DateRangePreset, default: DateRangePreset.THIS_MONTH })
    @IsOptional() @IsEnum(DateRangePreset)
    preset: DateRangePreset = DateRangePreset.THIS_MONTH;

    @ApiPropertyOptional({ example: '2026-08-01', description: 'Required when preset=CUSTOM' })
    @IsOptional() @IsDateString()
    from?: string;

    @ApiPropertyOptional({ example: '2026-08-31', description: 'Required when preset=CUSTOM' })
    @IsOptional() @IsDateString()
    to?: string;
}