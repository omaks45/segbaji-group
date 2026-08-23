import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsBoolean, IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength,
} from 'class-validator';

export class UpdateClientDto {
    @ApiPropertyOptional({ example: 'Adaeze Okonkwo' })
    @IsOptional() @IsString() @MinLength(2) @MaxLength(150)
    fullName?: string;

    @ApiPropertyOptional({ example: 'adaeze@example.com' })
    @IsOptional() @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: '+2348012345678' })
    @IsOptional()
    @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be a valid phone number' })
    phone?: string;

    @ApiPropertyOptional({ example: 'Okonkwo Holdings Ltd' })
    @IsOptional() @IsString() @MaxLength(150)
    organization?: string;

    @ApiPropertyOptional()
    @IsOptional() @IsString() @MaxLength(1000)
    notes?: string;

    @ApiPropertyOptional({ example: true })
    @IsOptional() @IsBoolean()
    isActive?: boolean;
}