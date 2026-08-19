import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class ResetPasswordDto {
    @ApiProperty({ example: 'a-new-strong-password', minLength: 8 })
    @IsString()
    @MinLength(8)
    newPassword!: string;

    @ApiProperty({ example: 'a-new-strong-password', description: 'Must match newPassword' })
    @Match('newPassword', { message: 'confirmPassword must match newPassword' })
    confirmPassword!: string;
}