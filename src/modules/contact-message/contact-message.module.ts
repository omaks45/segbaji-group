import { Module } from '@nestjs/common';
import { ContactMessagesController } from './contact-message.controller';
import { ContactMessagesService } from './contact-message.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ContactMessagesController],
  providers: [ContactMessagesService],
})
export class ContactMessagesModule {}