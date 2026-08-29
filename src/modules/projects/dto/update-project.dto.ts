import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength, MinLength,
} from 'class-validator';
import { ProjectCategory, ProjectStatus } from '../../../generated/prisma/client';

export class UpdateProjectDto {
    @ApiPropertyOptional({ example: '4-Bedroom Duplex, Lekki' })
    @IsOptional() @IsString() @MinLength(2) @MaxLength(150)
    title?: string;

    @ApiPropertyOptional({ example: '4-bedroom-duplex-lekki' })
    @IsOptional() @IsString() @MaxLength(180)
    slug?: string;

    @ApiPropertyOptional({ enum: ProjectCategory })
    @IsOptional() @IsEnum(ProjectCategory)
    category?: ProjectCategory;

    @ApiPropertyOptional({ example: 'Lekki Phase 1' })
    @IsOptional() @IsString() @MinLength(2) @MaxLength(150)
    location?: string;

    @ApiPropertyOptional({ example: 'Lagos' })
    @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
    state?: string;

    @ApiPropertyOptional({ enum: ProjectStatus })
    @IsOptional() @IsEnum(ProjectStatus)
    status?: ProjectStatus;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ example: 'Lagos State Government' })
    @IsOptional() @IsString() @MaxLength(150)
    clientName?: string;

    @ApiPropertyOptional({ example: 45000000, description: 'Internal only' })
    @IsOptional() @IsNumber() @Min(0)
    contractValue?: number;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional() @IsInt() @Min(0)
    order?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean()
    isFeatured?: boolean;

    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean()
    isPublished?: boolean;
}