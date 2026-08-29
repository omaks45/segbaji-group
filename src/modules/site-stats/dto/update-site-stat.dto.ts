import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateSiteStatsDto {
    @ApiPropertyOptional({ example: 15 })
    @IsOptional() @IsNumber() @Min(0)
    yearsOfExperience?: number;

    @ApiPropertyOptional({ example: '+' })
    @IsOptional() @IsString() @MaxLength(10)
    yearsOfExperienceSuffix?: string;

    @ApiPropertyOptional({ example: 120 })
    @IsOptional() @IsNumber() @Min(0)
    projectsCompleted?: number;

    @ApiPropertyOptional({ example: '+' })
    @IsOptional() @IsString() @MaxLength(10)
    projectsCompletedSuffix?: string;

    @ApiPropertyOptional({ example: 4.8 })
    @IsOptional() @IsNumber() @Min(0)
    clientSatisfactionRating?: number;

    @ApiPropertyOptional({ example: '/5' })
    @IsOptional() @IsString() @MaxLength(10)
    clientSatisfactionSuffix?: string;

    @ApiPropertyOptional({ example: 25 })
    @IsOptional() @IsNumber() @Min(0)
    skilledProfessionals?: number;

    @ApiPropertyOptional({ example: '+' })
    @IsOptional() @IsString() @MaxLength(10)
    skilledProfessionalsSuffix?: string;
}