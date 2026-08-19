import { IsString, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class ResetPasswordDto {
    @IsString()
    @MinLength(8)
    newPassword!: string;

    @Match('newPassword', { message: 'confirmPassword must match newPassword' })
    confirmPassword!: string;
}