import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService], // QuoteRequestsModule and ContactMessagesModule need this for their convert actions
})
export class ClientsModule {}