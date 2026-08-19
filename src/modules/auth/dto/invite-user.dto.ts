import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString } from 'class-validator';

export class InviteUserDto {
    @ApiProperty({ example: 'jane.doe@example.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'clx1a2b3c4d5e6f7g8h9i0j', description: 'Role ID — get from GET /roles' })
    @IsString()
    roleId!: string;

    @ApiProperty({ example: 'clx9z8y7x6w5v4u3t2s1r0q', description: 'Department ID — get from GET /departments' })
    @IsString()
    departmentId!: string;
}