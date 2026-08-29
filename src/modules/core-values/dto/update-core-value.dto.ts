import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateCoreValueDto {
    @ApiPropertyOptional({ example: 'Integrity' })
    @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
    title?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(300)
    description?: string;

    @ApiPropertyOptional({ example: 'shield' })
    @IsOptional() @IsString() @MaxLength(60)
    icon?: string;
}