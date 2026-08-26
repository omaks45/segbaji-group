import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() slug!: string;
    @ApiProperty() name!: string;
}

export class ServiceFeatureResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() title!: string;
    @ApiProperty({ nullable: true }) description!: string | null;
    @ApiProperty({ nullable: true }) icon!: string | null;
}

export class ServiceDetailResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() slug!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ nullable: true }) summary!: string | null;
    @ApiProperty({ nullable: true }) heroImageUrl!: string | null;
    @ApiProperty({ type: [ServiceFeatureResponseDto] }) features!: ServiceFeatureResponseDto[];
}

export class ServiceAdminResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() slug!: string;
    @ApiProperty() name!: string;
    @ApiProperty({ nullable: true }) summary!: string | null;
    @ApiProperty({ nullable: true }) heroImageUrl!: string | null;
    @ApiProperty() order!: number;
    @ApiProperty() isActive!: boolean;
    @ApiProperty({ description: 'Number of sub-service features' }) featureCount!: number;
}