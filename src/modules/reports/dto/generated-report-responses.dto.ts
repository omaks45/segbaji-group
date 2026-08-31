import { ApiProperty } from '@nestjs/swagger';

export class GeneratedReportDto {
    @ApiProperty() id!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ nullable: true }) description!: string | null;
    @ApiProperty({ enum: ['CSV', 'XLSX'] }) format!: string;
    @ApiProperty({ enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] }) status!: string;
    @ApiProperty({ nullable: true }) fileUrl!: string | null;
    @ApiProperty({ nullable: true }) errorMessage!: string | null;
    @ApiProperty() generatedByName!: string;
    @ApiProperty() createdAt!: Date;
    @ApiProperty({ nullable: true }) completedAt!: Date | null;
}