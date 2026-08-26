import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateServiceDto {
    @ApiProperty({ example: 'Civil Engineering' })
    @IsString() @MinLength(2) @MaxLength(100)
    name!: string;

    @ApiPropertyOptional({ example: 'civil-engineering', description: 'Auto-generated from name if omitted' })
    @IsOptional() @IsString() @MaxLength(120)
    slug?: string;

    @ApiPropertyOptional({ example: 'We design and construct roads, drainage, and other civil infrastructure.' })
    @IsOptional() @IsString() @MaxLength(500)
    summary?: string;
}