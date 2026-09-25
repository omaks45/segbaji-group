import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateServiceDto {
    @ApiProperty({ example: 'Civil Engineering' })
    @IsString() @MinLength(2) @MaxLength(100)
    name!: string;

    @ApiPropertyOptional({ example: 'civil-engineering', description: 'Auto-generated from name if omitted' })
    @IsOptional() @IsString() @MaxLength(120)
    slug?: string;

    @ApiPropertyOptional({ example: 'We design and construct roads, drainage, and other civil infrastructure.' })
    @IsOptional() @IsString() @MaxLength(500)
    summary?: string;

    @ApiPropertyOptional({
        example: 'A full walkthrough of our civil engineering process, from site survey through handover, including the equipment and standards we work to.',
        description: 'Longer body text shown on the service detail page (the summary is the short teaser)',
    })
    @IsOptional() @IsString() @MaxLength(2000)
    description?: string;

    @ApiPropertyOptional({ example: 'Construction', description: 'Free-text category tag, used for filtering on the public services page' })
    @IsOptional() @IsString() @MaxLength(60)
    category?: string;

    @ApiPropertyOptional({
        example: 'cmu48p9t50005ikeq3roox84w',
        description: 'Department this service routes quote requests to. Leave unset if this service isn’t tied to a specific department yet.',
    })
    @IsOptional() @IsString()
    departmentId?: string;
}