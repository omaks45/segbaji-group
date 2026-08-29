import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ReorderProjectsDto {
    @ApiProperty({ example: ['proj_1', 'proj_2'] })
    @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsString({ each: true })
    projectIds!: string[];
}