import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
    @ApiPropertyOptional({ example: 'The project is on schedule.' })
    @IsOptional() @IsString() @MaxLength(4000)
    content?: string;

    @ApiPropertyOptional({ description: 'IDs from prior POST /messaging/attachments uploads' })
    @IsOptional() @IsArray() @IsString({ each: true })
    attachmentIds?: string[];
}