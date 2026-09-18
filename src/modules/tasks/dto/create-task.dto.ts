import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { TaskPriority } from '../../../generated/prisma/client';

export class CreateTaskDto {
    @ApiProperty({ example: 'Survey the new Ogun plot' })
    @IsString() @MinLength(2) @MaxLength(150)
    title!: string;

    @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000)
    description?: string;

    @ApiProperty({ example: 'dept_engineering_id' })
    @IsString()
    departmentId!: string;

    @ApiPropertyOptional({ description: 'Omit to assign to the whole department (Team Lead delegates from there)' })
    @IsOptional() @IsString()
    assigneeId?: string;

    @ApiPropertyOptional({ enum: TaskPriority })
    @IsOptional() @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @ApiPropertyOptional({ example: '2026-09-20' })
    @IsOptional() @IsDateString()
    dueDate?: string;

    @ApiPropertyOptional() @IsOptional() @IsString()
    projectId?: string;

    @ApiPropertyOptional() @IsOptional() @IsString()
    propertyId?: string;
}