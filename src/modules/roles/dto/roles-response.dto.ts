import { ApiProperty } from '@nestjs/swagger';

export class RoleResponseDto {
    @ApiProperty({ example: 'clx1a2b3c4d5e6f7g8h9i0j' })
    id!: string;

    @ApiProperty({ example: 'Site Engineer' })
    name!: string;
}