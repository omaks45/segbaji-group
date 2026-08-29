import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertSeoMetaDto {
    @ApiProperty({ example: 'Segbaji & Son Nig. Ltd. — Construction & Land Sales' })
    @IsString() @MinLength(5) @MaxLength(70)
    title!: string;

    @ApiProperty({ example: 'Trusted construction, civil engineering, surveying, and land sales across Nigeria.' })
    @IsString() @MinLength(20) @MaxLength(160)
    description!: string;
}