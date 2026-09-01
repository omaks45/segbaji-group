import { Module } from '@nestjs/common';
import { TeamMembersController } from './team-member.controller';
import { TeamMembersService } from './team-member.service';
import { AuthModule } from '../auth/auth.module';
import { PublicTeamController } from './public-team.controller';

@Module({
  imports: [AuthModule],
  controllers: [TeamMembersController, PublicTeamController],
  providers: [TeamMembersService],
})
export class TeamMembersModule {}