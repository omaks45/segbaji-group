import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min, MaxLength, MinLength,
} from 'class-validator';
import { ProjectCategory } from '../../../generated/prisma/client';

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

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ example: 45000000, description: 'Internal only' })
    @IsOptional() @IsNumber() @Min(0)
    contractValue?: number;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional() @IsInt() @Min(0)
    order?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean()
    isPublished?: boolean;
}

