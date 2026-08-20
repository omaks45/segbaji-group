import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const PERMISSION_PATTERN = /^(\*|\*:[a-z]+|[a-z]+:[a-z]+)$/;

export class CreateRoleDto {
    @ApiProperty({ example: 'Site Engineer' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    name!: string;

    @ApiProperty({
        example: ['content:read', 'content:write', 'leads:read'],
        description: 'Permission keys — "resource:action", "*:action" (any resource), or "*" (everything)',
    })
    @IsArray()
    @ArrayUnique()
    @IsString({ each: true })
    @Matches(PERMISSION_PATTERN, {
        each: true,
        message: 'each permission must match "resource:action", "*:action", or "*"',
    })
    permissions!: string[];
}