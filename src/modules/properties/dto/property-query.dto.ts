import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { LandCondition, PropertyType, TitleType } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class PropertyQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: PropertyType }) @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
    @ApiPropertyOptional() @IsOptional() @IsString() state?: string;
    @ApiPropertyOptional({ enum: LandCondition }) @IsOptional() @IsEnum(LandCondition) landCondition?: LandCondition;
    @ApiPropertyOptional({ enum: TitleType }) @IsOptional() @IsEnum(TitleType) titleType?: TitleType;

    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minLandSize?: number;
    @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxLandSize?: number;
}