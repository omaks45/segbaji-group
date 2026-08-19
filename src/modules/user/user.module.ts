import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './user.controller';
import { UsersService } from './user.service';

@Module({
  imports: [AuthModule], // for JwtAuthGuard
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}