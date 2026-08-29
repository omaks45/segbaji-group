import { ApiProperty } from '@nestjs/swagger';

export class CoreValueResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() title!: string;
    @ApiProperty({ nullable: true }) description!: string | null;
    @ApiProperty({ nullable: true }) icon!: string | null;
    @ApiProperty() order!: number;
}