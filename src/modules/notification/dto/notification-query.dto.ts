import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class NotificationsQueryDto extends PaginationQueryDto {
    @ApiPropertyOptional({ example: 'true', description: 'Pass "true" to return only unread notifications' })
    @IsOptional() @IsBooleanString()
    unreadOnly?: string;
}