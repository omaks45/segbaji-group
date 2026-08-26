import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateServiceFeatureDto {
    @ApiProperty({ example: 'Structural Engineering' })
    @IsString() @MinLength(2) @MaxLength(150)
    title!: string;

    @ApiPropertyOptional({ example: 'We design safe, strong, and efficient structures that stand the test of time.' })
    @IsOptional() @IsString() @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ example: 'building', description: 'Icon key/name used by the frontend' })
    @IsOptional() @IsString() @MaxLength(60)
    icon?: string;
}