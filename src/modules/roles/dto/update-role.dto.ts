import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    ArrayUnique, IsArray, IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength,
} from 'class-validator';

const PERMISSION_PATTERN = /^(\*|\*:[a-z]+|[a-z]+:[a-z]+)$/;

export class UpdateRoleDto {
    @ApiPropertyOptional({ example: 'Site Engineer' })
    @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ example: ['content:read', 'content:write'] })
    @IsOptional() @IsArray() @ArrayUnique() @IsString({ each: true })
    @Matches(PERMISSION_PATTERN, { each: true, message: 'each permission must match "resource:action", "*:action", or "*"' })
    permissions?: string[];

    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean()
    isActive?: boolean;
}