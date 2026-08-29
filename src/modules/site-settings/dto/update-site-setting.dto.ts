import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, IsUrl, Matches, MaxLength } from 'class-validator';

export class UpdateSiteSettingsDto {
    @ApiPropertyOptional({ example: '26A, Adeshina Street, Off Awolowo Road, Ikeja.' })
    @IsOptional() @IsString() @MaxLength(300)
    officeAddress?: string;

    @ApiPropertyOptional({ example: '+2348030513175' })
    @IsOptional() @Matches(/^\+?[0-9]{7,15}$/, { message: 'phonePrimary must be a valid phone number' })
    phonePrimary?: string;

    @ApiPropertyOptional({ example: '+2348135143043' })
    @IsOptional() @Matches(/^\+?[0-9]{7,15}$/, { message: 'phoneSecondary must be a valid phone number' })
    phoneSecondary?: string;

    @ApiPropertyOptional({ example: 'segbaji76@gmail.com' })
    @IsOptional() @IsEmail()
    email?: string;

    @ApiPropertyOptional({ example: 'Monday - Friday: 8:00AM - 5:00PM\nSaturday: Closed\nSunday: Closed' })
    @IsOptional() @IsString() @MaxLength(500)
    officeHours?: string;

    @ApiPropertyOptional() @IsOptional() @IsUrl() @MaxLength(300)
    facebookUrl?: string;

    @ApiPropertyOptional() @IsOptional() @IsUrl() @MaxLength(300)
    instagramUrl?: string;

    @ApiPropertyOptional() @IsOptional() @IsUrl() @MaxLength(300)
    twitterUrl?: string;

    @ApiPropertyOptional() @IsOptional() @IsUrl() @MaxLength(300)
    linkedinUrl?: string;

    @ApiPropertyOptional({ example: '+2348030513175' })
    @IsOptional() @Matches(/^\+?[0-9]{7,15}$/, { message: 'whatsappNumber must be a valid phone number' })
    whatsappNumber?: string;

    @ApiPropertyOptional({ maxLength: 2000 })
    @IsOptional() @IsString() @MaxLength(2000)
    missionStatement?: string;

    @ApiPropertyOptional({ maxLength: 2000 })
    @IsOptional() @IsString() @MaxLength(2000)
    visionStatement?: string;

    @ApiPropertyOptional({ maxLength: 3000 })
    @IsOptional() @IsString() @MaxLength(3000)
    companyStory?: string;
}