import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateContactMessageDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString() @MinLength(2) @MaxLength(150)
  fullName!: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'phone must be a valid phone number' })
  phone?: string;

  @ApiPropertyOptional({ example: 'Question about surveying services' })
  @IsOptional() @IsString() @MaxLength(150)
  subject?: string;

  @ApiProperty({ example: 'I\u2019d like to know more about...', maxLength: 1000 })
  @IsString() @MinLength(5) @MaxLength(1000)
  message!: string;
}