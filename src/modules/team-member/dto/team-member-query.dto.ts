import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class TeamMemberQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional() @IsOptional() @IsString() roleId?: string;
    @ApiPropertyOptional() @IsOptional() @IsString() departmentId?: string;

    @ApiPropertyOptional({ enum: ['PENDING', 'ACTIVE', 'INACTIVE'] })
    @IsOptional() @IsIn(['PENDING', 'ACTIVE', 'INACTIVE'])
    status?: 'PENDING' | 'ACTIVE' | 'INACTIVE';

    @ApiPropertyOptional({ description: 'Matches against name or email' })
    @IsOptional() @IsString()
    search?: string;
}