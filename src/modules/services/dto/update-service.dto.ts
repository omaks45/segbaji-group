import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateServiceDto {
    @ApiPropertyOptional({ example: 'Civil Engineering' })
    @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ example: 'civil-engineering' })
    @IsOptional() @IsString() @MaxLength(120)
    slug?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(500)
    summary?: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional() @IsInt() @Min(0)
    order?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean()
    isActive?: boolean;
}