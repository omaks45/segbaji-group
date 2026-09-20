import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectCategory } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ProjectAdminQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ enum: ProjectCategory })
    @IsOptional() @IsEnum(ProjectCategory)
    category?: ProjectCategory;

    @ApiPropertyOptional({ description: 'Matches against title only (location dropped from the model)' })
    @IsOptional() @IsString()
    search?: string;
    }
