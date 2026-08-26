import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ReorderServiceFeaturesDto {
    @ApiProperty({ example: ['feat_1', 'feat_2'], description: 'Feature IDs in the desired display order' })
    @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsString({ each: true })
    featureIds!: string[];
}