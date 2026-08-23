import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateClientDto {
    @ApiProperty({ example: 'Adaeze Okonkwo' })
    @IsString() @MinLength(2) @MaxLength(150)
    fullName!: string;

    @ApiProperty({ example: 'adaeze@example.com' })
    @IsEmail()
    email!: string;

    @ApiPropertyOptional({ example: '+2348012345678' })
    @IsOptional()
    @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be a valid phone number' })
    phone?: string;

    @ApiPropertyOptional({ example: 'Okonkwo Holdings Ltd' })
    @IsOptional() @IsString() @MaxLength(150)
    organization?: string;

    @ApiPropertyOptional({ example: 'Referred by an existing client' })
    @IsOptional() @IsString() @MaxLength(1000)
    notes?: string;
    }