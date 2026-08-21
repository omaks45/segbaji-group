import { ApiProperty } from '@nestjs/swagger';

export class ContactMessageSubmittedDto {
  @ApiProperty({ example: 'Thanks for reaching out — we\u2019ll respond soon.' })
  message!: string;

  @ApiProperty() id!: string;
}

export class ContactMessageSummaryDto {
  @ApiProperty() total!: number;
  @ApiProperty() unread!: number;
  @ApiProperty() read!: number;
  @ApiProperty() responded!: number;
}