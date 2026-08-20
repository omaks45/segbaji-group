import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateDepartmentDto {
    @ApiProperty({ example: 'Engineering' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name!: string;

    @ApiPropertyOptional({ example: 'Technical and engineering solutions' })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    description?: string;
}