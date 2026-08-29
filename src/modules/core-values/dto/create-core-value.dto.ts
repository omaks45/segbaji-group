import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateCoreValueDto {
    @ApiProperty({ example: 'Integrity' })
    @IsString() @MinLength(2) @MaxLength(100)
    title!: string;

    @ApiPropertyOptional({ example: 'We uphold honesty and transparency in all we do.' })
    @IsOptional() @IsString() @MaxLength(300)
    description?: string;

    @ApiPropertyOptional({ example: 'shield' })
    @IsOptional() @IsString() @MaxLength(60)
    icon?: string;
}