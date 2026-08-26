import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsString } from 'class-validator';

export class ReorderServicesDto {
    @ApiProperty({ example: ['svc_1', 'svc_2'], description: 'Service IDs in the desired display order' })
    @IsArray() @ArrayMinSize(1) @ArrayUnique() @IsString({ each: true })
    serviceIds!: string[];
}