import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectCategory } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ProjectQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ProjectCategory })
    @IsOptional() @IsEnum(ProjectCategory)
    category?: ProjectCategory;

    @ApiPropertyOptional({ example: 'Lagos' })
    @IsOptional() @IsString()
    state?: string;

    @ApiPropertyOptional({ example: 'true' })
    @IsOptional() @IsBooleanString()
    featured?: string;
}