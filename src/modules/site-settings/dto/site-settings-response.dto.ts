import { ApiProperty } from '@nestjs/swagger';

export class SiteSettingsResponseDto {
    @ApiProperty({ nullable: true }) officeAddress!: string | null;
    @ApiProperty({ nullable: true }) phonePrimary!: string | null;
    @ApiProperty({ nullable: true }) phoneSecondary!: string | null;
    @ApiProperty({ nullable: true }) email!: string | null;
    @ApiProperty({ nullable: true }) officeHours!: string | null;
    @ApiProperty({ nullable: true }) facebookUrl!: string | null;
    @ApiProperty({ nullable: true }) instagramUrl!: string | null;
    @ApiProperty({ nullable: true }) twitterUrl!: string | null;
    @ApiProperty({ nullable: true }) linkedinUrl!: string | null;
    @ApiProperty({ nullable: true }) whatsappNumber!: string | null;
    @ApiProperty({ nullable: true }) missionStatement!: string | null;
    @ApiProperty({ nullable: true }) visionStatement!: string | null;
    @ApiProperty({ nullable: true }) companyStory!: string | null;
    @ApiProperty({ nullable: true }) officeLatitude!: number | null;
    @ApiProperty({ nullable: true }) officeLongitude!: number | null;
}