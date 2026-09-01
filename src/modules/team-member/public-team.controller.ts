import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TeamMembersService } from './team-member.service';
import { PublicTeamMemberDto } from './dto/public-team-member.dto';

@ApiTags('Team')
@Controller('team')
export class PublicTeamController {
    constructor(private readonly teamMembersService: TeamMembersService) {}

    @ApiOperation({ summary: 'Meet the Team — public' })
    @ApiOkResponse({ type: PublicTeamMemberDto, isArray: true })
    @Get()
    findAll() {
        return this.teamMembersService.findPublicTeam();
    }
}