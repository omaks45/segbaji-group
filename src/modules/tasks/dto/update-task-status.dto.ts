import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateTaskStatusDto {
    @ApiProperty({ enum: ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'] })
    @IsIn(['IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    status!: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}