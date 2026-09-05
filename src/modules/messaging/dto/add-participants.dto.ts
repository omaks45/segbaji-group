import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class AddParticipantsDto {
    @ApiProperty({ example: ['user_id_1', 'user_id_2'] })
    @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsString({ each: true })
    userIds!: string[];
}