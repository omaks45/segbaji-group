import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export class UpdateContactMessageStatusDto {
  @ApiProperty({ enum: ['READ', 'RESPONDED'] })
  @IsIn(['READ', 'RESPONDED'])
  status!: 'READ' | 'RESPONDED';
}