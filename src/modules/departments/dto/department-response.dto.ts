import { ApiProperty } from '@nestjs/swagger';

export class DepartmentResponseDto {
    @ApiProperty({ example: 'clx9z8y7x6w5v4u3t2s1r0q' })
    id!: string;

    @ApiProperty({ example: 'Engineering' })
    name!: string;
}