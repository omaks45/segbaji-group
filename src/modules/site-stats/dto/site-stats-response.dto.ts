import { ApiProperty } from '@nestjs/swagger';

export class SiteStatsResponseDto {
    @ApiProperty() yearsOfExperience!: number;
    @ApiProperty() yearsOfExperienceSuffix!: string;
    @ApiProperty() projectsCompleted!: number;
    @ApiProperty() projectsCompletedSuffix!: string;
    @ApiProperty() clientSatisfactionRating!: number;
    @ApiProperty() clientSatisfactionSuffix!: string;
    @ApiProperty() skilledProfessionals!: number;
    @ApiProperty() skilledProfessionalsSuffix!: string;
}