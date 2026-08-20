import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateTeamMemberDto {
    @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() roleId?: string;

    @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE'] })
    @IsOptional() @IsIn(['ACTIVE', 'INACTIVE'])
    status?: 'ACTIVE' | 'INACTIVE';
}