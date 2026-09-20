import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

// Exact mirror of ReorderProjectImagesDto — same shape, just for videos.
export class ReorderProjectVideosDto {
    @ApiProperty({ type: [String], description: 'Video IDs in the desired display order — must be the full existing set, not a subset.' })
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    videoIds!: string[];
}