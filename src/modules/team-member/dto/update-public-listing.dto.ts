import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min, MaxLength } from 'class-validator';

export class UpdatePublicListingDto {
    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean()
    isPubliclyListed?: boolean;

    @ApiPropertyOptional({ example: 'Surveyor/Team Leader' })
    @IsOptional() @IsString() @MaxLength(150)
    publicDisplayTitle?: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional() @IsInt() @Min(0)
    publicDisplayOrder?: number;
    }