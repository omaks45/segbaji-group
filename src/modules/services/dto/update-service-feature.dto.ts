import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateServiceFeatureDto {
    @ApiPropertyOptional({ example: 'Structural Engineering' })
    @IsOptional() @IsString() @MinLength(2) @MaxLength(150)
    title?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ example: 'building' })
    @IsOptional() @IsString() @MaxLength(60)
    icon?: string;
}