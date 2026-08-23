import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ClientQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ example: 'true' })
    @IsOptional() @IsBooleanString()
    isActive?: string;

    @ApiPropertyOptional({ enum: ['QUOTE_REQUEST', 'CONTACT_MESSAGE', 'MANUAL'] })
    @IsOptional() @IsIn(['QUOTE_REQUEST', 'CONTACT_MESSAGE', 'MANUAL'])
    source?: 'QUOTE_REQUEST' | 'CONTACT_MESSAGE' | 'MANUAL';

    @ApiPropertyOptional({ description: 'Matches against name, email, or organization' })
    @IsOptional() @IsString()
    search?: string;
}