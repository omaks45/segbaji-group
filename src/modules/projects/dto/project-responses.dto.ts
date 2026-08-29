import { ApiProperty } from '@nestjs/swagger';
import { ProjectCategory, ProjectStatus } from '../../../generated/prisma/client';

export class ProjectImageResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() imageUrl!: string;
    @ApiProperty({ nullable: true }) caption!: string | null;
    @ApiProperty() order!: number;
}

export class ProjectListItemDto {
    @ApiProperty() id!: string;
    @ApiProperty() slug!: string;
    @ApiProperty() title!: string;
    @ApiProperty({ enum: ProjectCategory }) category!: ProjectCategory;
    @ApiProperty() location!: string;
    @ApiProperty() state!: string;
    @ApiProperty({ nullable: true }) coverImageUrl!: string | null;
    @ApiProperty() isFeatured!: boolean;
}

export class ProjectDetailDto {
    @ApiProperty() id!: string;
    @ApiProperty() slug!: string;
    @ApiProperty() title!: string;
    @ApiProperty({ enum: ProjectCategory }) category!: ProjectCategory;
    @ApiProperty() location!: string;
    @ApiProperty() state!: string;
    @ApiProperty({ enum: ProjectStatus }) status!: ProjectStatus;
    @ApiProperty({ nullable: true }) description!: string | null;
    @ApiProperty({ nullable: true }) clientName!: string | null;
    @ApiProperty({ nullable: true }) coverImageUrl!: string | null;
    @ApiProperty({ nullable: true }) completedAt!: Date | null;
    @ApiProperty({ type: [ProjectImageResponseDto] }) images!: ProjectImageResponseDto[];
}

export class ProjectAdminListItemDto {
    @ApiProperty() id!: string;
    @ApiProperty() slug!: string;
    @ApiProperty() title!: string;
    @ApiProperty({ enum: ProjectCategory }) category!: ProjectCategory;
    @ApiProperty() location!: string;
    @ApiProperty() state!: string;
    @ApiProperty({ enum: ProjectStatus }) status!: ProjectStatus;
    @ApiProperty() isFeatured!: boolean;
    @ApiProperty() isPublished!: boolean;
    @ApiProperty() imageCount!: number;
}