import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectCategory, ProjectStatus } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ProjectAdminQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ProjectCategory })
    @IsOptional() @IsEnum(ProjectCategory)
    category?: ProjectCategory;

    @ApiPropertyOptional({ example: 'Lagos' })
    @IsOptional() @IsString()
    state?: string;

    @ApiPropertyOptional({ enum: ProjectStatus })
    @IsOptional() @IsEnum(ProjectStatus)
    status?: ProjectStatus;

    @ApiPropertyOptional({ description: 'Matches against title or location' })
    @IsOptional() @IsString()
    search?: string;
}