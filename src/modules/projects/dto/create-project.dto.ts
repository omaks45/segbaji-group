import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';
import { ProjectCategory } from '../../../generated/prisma/client';

export class CreateProjectDto {
    @ApiProperty({ example: '4-Bedroom Duplex, Lekki' })
    @IsString() @MinLength(2) @MaxLength(150)
    title!: string;

    @ApiPropertyOptional({ example: '4-bedroom-duplex-lekki', description: 'Auto-generated from title if omitted' })
    @IsOptional() @IsString() @MaxLength(180)
    slug?: string;

    @ApiPropertyOptional({ enum: ProjectCategory })
    @IsOptional() @IsEnum(ProjectCategory)
    category?: ProjectCategory;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ example: 45000000, description: 'Internal only — never exposed on public endpoints' })
    @IsOptional() @IsNumber() @Min(0)
    contractValue?: number;

    @ApiPropertyOptional({ example: true, default: true, description: 'Draft/publish toggle — set false to prepare a project before it goes live' })
    @IsOptional() @IsBoolean()
    isPublished?: boolean;
}

