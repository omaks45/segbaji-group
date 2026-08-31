import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength, MinLength,
} from 'class-validator';
import {
    LandCondition, LandSizeUnit, PriceType, PropertyAvailabilityStatus, PropertyType, TitleType,
} from '../../../generated/prisma/client';

export class UpdatePropertyDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(220) slug?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
    @ApiPropertyOptional({ enum: PropertyType }) @IsOptional() @IsEnum(PropertyType) propertyType?: PropertyType;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0.01) landSizeValue?: number;
    @ApiPropertyOptional({ enum: LandSizeUnit }) @IsOptional() @IsEnum(LandSizeUnit) landSizeUnit?: LandSizeUnit;
    @ApiPropertyOptional() @IsOptional() @IsNumber() @Min(0) price?: number;
    @ApiPropertyOptional({ enum: PriceType }) @IsOptional() @IsEnum(PriceType) priceType?: PriceType;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isPriceNegotiable?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(200) location?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(100) state?: string;
    @ApiPropertyOptional({ enum: LandCondition }) @IsOptional() @IsEnum(LandCondition) landCondition?: LandCondition;
    @ApiPropertyOptional({ enum: TitleType }) @IsOptional() @IsEnum(TitleType) titleType?: TitleType;
    @ApiPropertyOptional({ enum: PropertyAvailabilityStatus })
    @IsOptional() @IsEnum(PropertyAvailabilityStatus) availabilityStatus?: PropertyAvailabilityStatus;
    @ApiPropertyOptional() @IsOptional() @IsNumber() latitude?: number;
    @ApiPropertyOptional() @IsOptional() @IsNumber() longitude?: number;
    @ApiPropertyOptional() @IsOptional() @IsInt() @Min(0) order?: number;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;

    @ApiPropertyOptional() @IsOptional() @IsBoolean() hasVerifiedTitle?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() hasDryLand?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() hasGoodRoadNetwork?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSecureEnvironment?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() hasElectricityNearby?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() hasDrainageSystem?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() hasSurveyPlan?: boolean;
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isGovernmentApproved?: boolean;
}