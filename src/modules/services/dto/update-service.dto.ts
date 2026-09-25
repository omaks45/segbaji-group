import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateServiceDto {
    @ApiPropertyOptional({ example: 'Civil Engineering' })
    @IsOptional() @IsString() @MinLength(2) @MaxLength(100)
    name?: string;

    @ApiPropertyOptional({ example: 'civil-engineering' })
    @IsOptional() @IsString() @MaxLength(120)
    slug?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(500)
    summary?: string;

    @ApiPropertyOptional({
        example: 'A full walkthrough of our civil engineering process, from site survey through handover, including the equipment and standards we work to.',
        description: 'Longer body text shown on the service detail page',
    })
    @IsOptional() @IsString() @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ example: 'Construction', description: 'Free-text category tag, used for filtering on the public services page' })
    @IsOptional() @IsString() @MaxLength(60)
    category?: string;

    @ApiPropertyOptional({
        example: 'cmu48p9t50005ikeq3roox84w',
        description: 'Department this service routes quote requests to',
    })
    @IsOptional() @IsString()
    departmentId?: string;

    @ApiPropertyOptional({ example: 0 })
    @IsOptional() @IsInt() @Min(0)
    order?: number;

    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean()
    isActive?: boolean;
}