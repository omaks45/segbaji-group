import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateQuoteRequestStatusDto {
  @ApiProperty({ enum: ['NEW', 'CONTACTED', 'WON', 'LOST'] })
  @IsIn(['NEW', 'CONTACTED', 'WON', 'LOST'])
  status!: 'NEW' | 'CONTACTED' | 'WON' | 'LOST';
}