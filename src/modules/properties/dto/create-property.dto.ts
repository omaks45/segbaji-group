import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';
import {
    LandCondition, LandSizeUnit, PriceType, PropertyType, TitleType,
} from '../../../generated/prisma/client';

export class CreatePropertyDto {
    @ApiProperty({ example: '7 Acres of Land, Lagos-Ibadan Expressway' })
    @IsString() @MinLength(2) @MaxLength(200)
    title!: string;

    @ApiPropertyOptional({ example: '7acres-lagos-ibadan-expressway' })
    @IsOptional() @IsString() @MaxLength(220)
    slug?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(2000)
    description?: string;

    @ApiProperty({ enum: PropertyType })
    @IsEnum(PropertyType)
    propertyType!: PropertyType;

    @ApiProperty({ example: 7 })
    @IsNumber() @Min(0.01)
    landSizeValue!: number;

    @ApiProperty({ enum: LandSizeUnit })
    @IsEnum(LandSizeUnit)
    landSizeUnit!: LandSizeUnit;

    @ApiProperty({ example: 200000000 })
    @IsNumber() @Min(0)
    price!: number;

    @ApiPropertyOptional({ enum: PriceType })
    @IsOptional() @IsEnum(PriceType)
    priceType?: PriceType;

    @ApiPropertyOptional({ example: false })
    @IsOptional() @IsBoolean()
    isPriceNegotiable?: boolean;

    @ApiProperty({ example: 'Lagos Ibadan Expressway before Ogere Bridge' })
    @IsString() @MinLength(2) @MaxLength(200)
    location!: string;

    @ApiProperty({ example: 'Ogun' })
    @IsString() @MinLength(2) @MaxLength(100)
    state!: string;

    @ApiProperty({ enum: LandCondition })
    @IsEnum(LandCondition)
    landCondition!: LandCondition;

    @ApiProperty({ enum: TitleType })
    @IsEnum(TitleType)
    titleType!: TitleType;

    @ApiPropertyOptional({ example: 6.4474 })
    @IsOptional() @IsNumber()
    latitude?: number;

    @ApiPropertyOptional({ example: 3.3903 })
    @IsOptional() @IsNumber()
    longitude?: number;

    @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() hasVerifiedTitle?: boolean;
    @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() hasDryLand?: boolean;
    @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() hasGoodRoadNetwork?: boolean;
    @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() hasSecureEnvironment?: boolean;
    @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() hasElectricityNearby?: boolean;
    @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() hasDrainageSystem?: boolean;
    @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() hasSurveyPlan?: boolean;
    @ApiPropertyOptional({ example: false }) @IsOptional() @IsBoolean() isGovernmentApproved?: boolean;
}