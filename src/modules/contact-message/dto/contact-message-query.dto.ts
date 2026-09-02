import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class ContactMessageQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['UNREAD', 'READ', 'RESPONDED'] })
  @IsOptional() @IsIn(['UNREAD', 'READ', 'RESPONDED'])
  status?: 'UNREAD' | 'READ' | 'RESPONDED';

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['csv', 'xlsx'], description: 'Only used by the export endpoint' })
  @IsOptional() @IsIn(['csv', 'xlsx'])
  format?: 'csv' | 'xlsx';
}