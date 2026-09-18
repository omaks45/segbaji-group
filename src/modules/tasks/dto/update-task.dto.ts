import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TaskPriority, TaskStatus } from '../../../generated/prisma/client';

export class UpdateTaskDto {
    @ApiPropertyOptional() @IsOptional() @IsString() @MinLength(2) @MaxLength(150)
    title?: string;

    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ description: 'Reassign — must belong to the same department as the task' })
    @IsOptional() @IsString()
    assigneeId?: string;

    @ApiPropertyOptional({ enum: TaskPriority })
    @IsOptional() @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @ApiPropertyOptional({ enum: TaskStatus })
    @IsOptional() @IsEnum(TaskStatus)
    status?: TaskStatus;

    @ApiPropertyOptional() @IsOptional() @IsDateString()
    dueDate?: string;
}