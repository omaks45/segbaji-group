import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { PropertyAvailabilityStatus, PropertyType } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class PropertyAdminQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: PropertyType }) @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
    @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
    @ApiPropertyOptional({ enum: PropertyAvailabilityStatus })
    @IsOptional() @IsEnum(PropertyAvailabilityStatus) availabilityStatus?: PropertyAvailabilityStatus;
    @ApiPropertyOptional({ description: 'Matches against title or location' })
    @IsOptional() @IsString() search?: string;
    @ApiPropertyOptional({ enum: ['csv', 'xlsx'], description: 'Only used by the export endpoint' })
    @IsOptional() @IsIn(['csv', 'xlsx'])
    format?: 'csv' | 'xlsx';
}