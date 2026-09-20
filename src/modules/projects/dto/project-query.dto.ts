import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ProjectCategory } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ProjectQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ProjectCategory })
    @IsOptional() @IsEnum(ProjectCategory)
    category?: ProjectCategory;
}

