import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ReorderPublicTeamDto {
    @ApiProperty({ example: ['user_1', 'user_2'] })
    @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsString({ each: true })
    userIds!: string[];
}