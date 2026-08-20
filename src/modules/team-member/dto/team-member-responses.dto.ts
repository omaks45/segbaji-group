import { ApiProperty } from '@nestjs/swagger';

export class TeamMemberSummaryDto {
    @ApiProperty() total!: number;
    @ApiProperty() active!: number;
    @ApiProperty() inactive!: number;
    @ApiProperty() pending!: number;
}

export class TeamMemberListItemDto {
    @ApiProperty() id!: string;
    @ApiProperty({ nullable: true }) fullName!: string | null;
    @ApiProperty() email!: string;
    @ApiProperty({ nullable: true }) phone!: string | null;
    @ApiProperty({ enum: ['PENDING', 'ACTIVE', 'INACTIVE'] }) status!: string;
    @ApiProperty({ nullable: true }) role!: string | null;
    @ApiProperty({ nullable: true }) department!: string | null;
    @ApiProperty({ nullable: true }) joinedAt!: Date | null;
    @ApiProperty({ nullable: true }) invitedAt!: Date | null;
}

export class PaginationMetaDto {
    @ApiProperty() page!: number;
    @ApiProperty() pageSize!: number;
    @ApiProperty() total!: number;
    @ApiProperty() totalPages!: number;
}

export class PaginatedTeamMembersDto {
    @ApiProperty({ type: [TeamMemberListItemDto] }) items!: TeamMemberListItemDto[];
    @ApiProperty({ type: PaginationMetaDto }) meta!: PaginationMetaDto;
}