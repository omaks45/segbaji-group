import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ReorderCoreValuesDto {
    @ApiProperty({ example: ['cv_1', 'cv_2'] })
    @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsString({ each: true })
    coreValueIds!: string[];
}