import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ReorderPropertyImagesDto {
    @ApiProperty({ example: ['img_1', 'img_2'] })
    @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsString({ each: true })
    imageIds!: string[];
}