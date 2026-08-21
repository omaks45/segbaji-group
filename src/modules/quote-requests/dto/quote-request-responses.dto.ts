import { ApiProperty } from '@nestjs/swagger';

export class QuoteRequestSubmittedDto {
  @ApiProperty({ example: 'Thanks — we\u2019ll be in touch shortly.' })
  message!: string;

  @ApiProperty() id!: string;
}

export class QuoteRequestSummaryDto {
  @ApiProperty() total!: number;
  @ApiProperty() new!: number;
  @ApiProperty() contacted!: number;
  @ApiProperty() won!: number;
  @ApiProperty() lost!: number;
}

export class QuoteRequestListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() serviceName!: string;
  @ApiProperty() projectLocation!: string;
  @ApiProperty() budgetRange!: string;
  @ApiProperty() desiredStartDate!: Date;
  @ApiProperty({ enum: ['NEW', 'CONTACTED', 'WON', 'LOST'] }) status!: string;
  @ApiProperty() createdAt!: Date;
}