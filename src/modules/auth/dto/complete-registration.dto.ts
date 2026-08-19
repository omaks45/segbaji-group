import { IsString, Matches, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class CompleteRegistrationDto {
    @IsString()
    @MinLength(3)
    fullName!: string;

    @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be a valid phone number' })
    phone!: string;

    @IsString()
    @MinLength(8)
    password!: string;

    @Match('password', { message: 'confirmPassword must match password' })
    confirmPassword!: string;
}