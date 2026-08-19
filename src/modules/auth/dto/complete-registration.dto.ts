import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class CompleteRegistrationDto {
    @ApiProperty({ example: 'Jane Doe' })
    @IsString()
    @MinLength(2)
    fullName!: string;

    @ApiProperty({ example: '+2348012345678' })
    @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be a valid phone number' })
    phone!: string;

    @ApiProperty({ example: 'a-strong-password-123', minLength: 8 })
    @IsString()
    @MinLength(8)
    password!: string;

    @ApiProperty({ example: 'a-strong-password-123', description: 'Must match password' })
    @Match('password', { message: 'confirmPassword must match password' })
    confirmPassword!: string;
}