import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateQuoteRequestDto {
    @ApiProperty({ example: 'clx4m5n6o7p8q9r0s1t2u3v', description: 'Get from GET /services' })
    @IsString()
    serviceId!: string;

    @ApiProperty({ example: 'Jane Doe' })
    @IsString() @MinLength(2) @MaxLength(150)
    fullName!: string;

    @ApiProperty({ example: 'jane.doe@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: '+2348012345678' })
    @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be a valid phone number' })
    phone!: string;

    @ApiProperty({ example: 'Lekki, Lagos' })
    @IsString() @MinLength(2) @MaxLength(200)
    projectLocation!: string;

    @ApiProperty({ example: 'Around ₦20M, flexible' })
    @IsString() @MinLength(1) @MaxLength(150)
    budgetRange!: string;

    @ApiProperty({ example: '2026-10-01' })
    @IsDateString()
    desiredStartDate!: string;

    @ApiProperty({ example: 'Looking to build a 4-bedroom bungalow...', maxLength: 500 })
    @IsString() @MinLength(10) @MaxLength(500)
    description!: string;
}