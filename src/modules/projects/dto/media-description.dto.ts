// --- DTOs for project image/video captions ---

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Sent alongside the multipart file on upload, and reused for
// PATCH .../images/:imageId and PATCH .../videos/:videoId to edit the
// caption after the fact without re-uploading the file.
export class MediaDescriptionDto {
    @ApiPropertyOptional({ example: 'Foundation stage, March 2026' })
    @IsOptional()
    @IsString()
    @MaxLength(300)
    description?: string;
}
