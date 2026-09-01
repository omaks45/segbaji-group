import { ApiProperty } from '@nestjs/swagger';

export class SessionResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty({ nullable: true }) userAgent!: string | null;
    @ApiProperty({ nullable: true }) ipAddress!: string | null;
    @ApiProperty() createdAt!: Date;
    @ApiProperty() lastUsedAt!: Date;
    @ApiProperty({ description: 'True if this is the session making the current request' })
    isCurrent!: boolean;
}

export class LoginActivityResponseDto {
    @ApiProperty() id!: string;
    @ApiProperty() email!: string;
    @ApiProperty() success!: boolean;
    @ApiProperty({ nullable: true }) reason!: string | null;
    @ApiProperty({ nullable: true }) ipAddress!: string | null;
    @ApiProperty() createdAt!: Date;
}