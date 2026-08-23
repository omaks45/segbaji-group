import { ApiProperty } from '@nestjs/swagger';

export class ClientSummaryDto {
    @ApiProperty() total!: number;
    @ApiProperty() active!: number;
    @ApiProperty() inactive!: number;
}

export class ClientListItemDto {
    @ApiProperty() id!: string;
    @ApiProperty() fullName!: string;
    @ApiProperty() email!: string;
    @ApiProperty({ nullable: true }) phone!: string | null;
    @ApiProperty({ nullable: true }) organization!: string | null;
    @ApiProperty({ enum: ['QUOTE_REQUEST', 'CONTACT_MESSAGE', 'MANUAL'] }) source!: string;
    @ApiProperty() isActive!: boolean;
    @ApiProperty() createdAt!: Date;
}

export class ConvertToClientResponseDto {
    @ApiProperty({ example: 'Client created and linked' })
    message!: string;

    @ApiProperty() clientId!: string;

    @ApiProperty({ description: 'False if this linked to an existing client instead of creating a new one' })
    created!: boolean;
}