import { ApiProperty } from '@nestjs/swagger';

export class DepartmentAdminResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ nullable: true }) description!: string | null;
    @ApiProperty() isActive!: boolean;
    @ApiProperty({ description: 'Number of users currently assigned' })
    userCount!: number;
}