import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ConversationQueryDto {
    @ApiPropertyOptional({ enum: ['ALL', 'UNREAD', 'PROJECT', 'CLIENT', 'TEAM'] })
    @IsOptional() @IsIn(['ALL', 'UNREAD', 'PROJECT', 'CLIENT', 'TEAM'])
    filter?: 'ALL' | 'UNREAD' | 'PROJECT' | 'CLIENT' | 'TEAM';
}