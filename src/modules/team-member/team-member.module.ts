import { Module } from '@nestjs/common';
import { TeamMembersController } from './team-member.controller';
import { TeamMembersService } from './team-member.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TeamMembersController],
  providers: [TeamMembersService],
})
export class TeamMembersModule {}