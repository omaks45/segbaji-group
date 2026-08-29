import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MaxLength, MinLength } from 'class-validator';
import { ProjectCategory, ProjectStatus } from '../../../generated/prisma/client';

export class CreateProjectDto {
    @ApiProperty({ example: '4-Bedroom Duplex, Lekki' })
    @IsString() @MinLength(2) @MaxLength(150)
    title!: string;

    @ApiPropertyOptional({ example: '4-bedroom-duplex-lekki', description: 'Auto-generated from title if omitted' })
    @IsOptional() @IsString() @MaxLength(180)
    slug?: string;

    @ApiProperty({ enum: ProjectCategory })
    @IsEnum(ProjectCategory)
    category!: ProjectCategory;

    @ApiProperty({ example: 'Lekki Phase 1' })
    @IsString() @MinLength(2) @MaxLength(150)
    location!: string;

    @ApiProperty({ example: 'Lagos' })
    @IsString() @MinLength(2) @MaxLength(100)
    state!: string;

    @ApiPropertyOptional({ enum: ProjectStatus })
    @IsOptional() @IsEnum(ProjectStatus)
    status?: ProjectStatus;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ example: 'Lagos State Government', description: 'Only set if the client approved being named publicly' })
    @IsOptional() @IsString() @MaxLength(150)
    clientName?: string;

    @ApiPropertyOptional({ example: 45000000, description: 'Internal only — never exposed on public endpoints' })
    @IsOptional() @IsNumber() @Min(0)
    contractValue?: number;
}