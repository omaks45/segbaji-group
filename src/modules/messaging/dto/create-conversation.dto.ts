import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ConversationType } from '../../../generated/prisma/client';

export class CreateConversationDto {
    @ApiProperty({ enum: ConversationType })
    @IsEnum(ConversationType)
    type!: ConversationType;

    @ApiPropertyOptional({ example: 'Lekki Duplex — Team Chat', description: 'Required for GROUP, ignored for DIRECT' })
    @IsOptional() @IsString() @MaxLength(150)
    name?: string;

    @ApiProperty({ example: ['user_id_1'], description: 'For DIRECT, exactly one other user ID. For GROUP, every member.' })
    @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsString({ each: true })
    participantIds!: string[];

    @ApiPropertyOptional() @IsOptional() @IsString()
    clientId?: string;

    @ApiPropertyOptional() @IsOptional() @IsString()
    projectId?: string;
}