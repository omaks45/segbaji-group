import { ApiProperty } from '@nestjs/swagger';

export class PublicTeamMemberDto {
    @ApiProperty() id!: string;
    @ApiProperty() fullName!: string;
    @ApiProperty() publicDisplayTitle!: string;
    @ApiProperty({ nullable: true }) profilePictureUrl!: string | null;
    @ApiProperty({ nullable: true }) bio!: string | null;
}