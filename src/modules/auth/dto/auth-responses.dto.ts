
import { ApiProperty } from '@nestjs/swagger';

export class MessageResponseDto {
    @ApiProperty({ example: 'If that email has an account, a reset link has been sent' })
    message!: string;
}

export class InviteResponseDto {
    @ApiProperty({ example: 'Invite sent' })
    message!: string;

    @ApiProperty({ example: 'clx1a2b3c4d5e6f7g8h9i0j' })
    userId!: string;
}

export class LoginUserDto {
    @ApiProperty({ example: 'clx1a2b3c4d5e6f7g8h9i0j' })
    id!: string;

    @ApiProperty({ example: 'Jane Doe' })
    fullName!: string | null;

    @ApiProperty({ example: 'jane.doe@example.com' })
    email!: string;

    @ApiProperty({ example: 'Site Engineer', nullable: true })
    role!: string | null;
}

export class LoginResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
    accessToken!: string;

    @ApiProperty({ type: LoginUserDto })
    user!: LoginUserDto;
}

export class ValidateInviteResponseDto {
    @ApiProperty({ example: 'jane.doe@example.com' })
    email!: string;
}