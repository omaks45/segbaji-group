import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class EditMessageDto {
    @ApiProperty({ example: 'Updated: the project is on schedule.' })
    @IsString() @MinLength(1) @MaxLength(4000)
    content!: string;
}