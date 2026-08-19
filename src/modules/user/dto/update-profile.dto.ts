import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
    @ApiPropertyOptional({ example: 'Operations lead with 8 years in civil engineering.', maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    bio?: string;

    @ApiPropertyOptional({ example: 'https://example.com/profile.jpg' })
    @IsOptional()
    @IsUrl()
    profilePictureUrl?: string;
}