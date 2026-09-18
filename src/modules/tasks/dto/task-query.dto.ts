import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class TaskQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ description: 'Super Admin only — required to look at a department other than your own' })
    @IsOptional() @IsString()
    departmentId?: string;

    @ApiPropertyOptional({ enum: TaskStatus })
    @IsOptional() @IsEnum(TaskStatus)
    status?: TaskStatus;

    @ApiPropertyOptional({ enum: TaskPriority })
    @IsOptional() @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @ApiPropertyOptional()
    @IsOptional() @IsString()
    assigneeId?: string;
}