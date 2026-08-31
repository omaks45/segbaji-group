import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpsertNearbyPlaceDto {
    @ApiPropertyOptional({ example: 'Lekki Model College' })
    @IsOptional() @IsString() @MaxLength(150)
    label?: string;

    @ApiProperty({ example: '9 mins' })
    @IsString() @MinLength(1) @MaxLength(50)
    distanceOrTime!: string;
}