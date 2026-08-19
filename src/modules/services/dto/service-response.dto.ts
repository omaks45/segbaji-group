import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto {
    @ApiProperty({ example: 'clx4m5n6o7p8q9r0s1t2u3v' })
    id!: string;

    @ApiProperty({ example: 'Civil Engineering' })
    name!: string;
}