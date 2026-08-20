import { ApiProperty } from '@nestjs/swagger';

export class RoleAdminResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ type: [String] }) permissions!: string[];
    @ApiProperty() isActive!: boolean;
    @ApiProperty({ description: 'Number of users currently assigned' }) userCount!: number;
}