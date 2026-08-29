import { ApiProperty } from '@nestjs/swagger';

export class SeoMetaResponseDto {
    @ApiProperty({ enum: ['HOME', 'ABOUT', 'SERVICES', 'PROPERTIES', 'PROJECTS', 'CONTACT', 'QUOTE'] })
    pageKey!: string;

    @ApiProperty() title!: string;
    @ApiProperty() description!: string;
}