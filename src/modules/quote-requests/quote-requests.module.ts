import { Module } from '@nestjs/common';
import { QuoteRequestsController } from './quote-requests.controller';
import { QuoteRequestsService } from './quote-requests.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [QuoteRequestsController],
  providers: [QuoteRequestsService],
})
export class QuoteRequestsModule {}