import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PropertyAvailabilityStatus, PropertyType } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class PropertyAdminQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: PropertyType }) @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
    @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
    @ApiPropertyOptional({ enum: PropertyAvailabilityStatus })
    @IsOptional() @IsEnum(PropertyAvailabilityStatus) availabilityStatus?: PropertyAvailabilityStatus;
    @ApiPropertyOptional({ description: 'Matches against title or location' })
    @IsOptional() @IsString() search?: string;
}