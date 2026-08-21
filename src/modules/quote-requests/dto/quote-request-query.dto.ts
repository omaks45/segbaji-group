import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto';

export class QuoteRequestQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['NEW', 'CONTACTED', 'WON', 'LOST'] })
  @IsOptional() @IsIn(['NEW', 'CONTACTED', 'WON', 'LOST'])
  status?: 'NEW' | 'CONTACTED' | 'WON' | 'LOST';

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Matches against name or email' })
  @IsOptional() @IsString()
  search?: string;
}