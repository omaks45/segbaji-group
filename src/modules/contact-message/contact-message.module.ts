import { Module } from '@nestjs/common';
import { ContactMessagesController } from './contact-message.controller';
import { ContactMessagesService } from './contact-message.service';
import { AuthModule } from '../auth/auth.module';
import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [AuthModule, ClientsModule],
  controllers: [ContactMessagesController],
  providers: [ContactMessagesService],
})
export class ContactMessagesModule {}