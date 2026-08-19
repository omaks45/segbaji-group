import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'owner@segbajison.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'your-password' })
    @IsString()
    password!: string;
}