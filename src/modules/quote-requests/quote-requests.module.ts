import { Module } from '@nestjs/common';
import { QuoteRequestsController } from './quote-requests.controller';
import { QuoteRequestsService } from './quote-requests.service';
import { AuthModule } from '../auth/auth.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [AuthModule, ClientsModule],
  controllers: [QuoteRequestsController],
  providers: [QuoteRequestsService],
})
export class QuoteRequestsModule {}