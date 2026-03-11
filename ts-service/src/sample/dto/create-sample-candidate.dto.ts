import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSampleCandidateDto {
  @ApiProperty({
    description: 'Full name of the candidate',
    example: 'Jane Smith',
    minLength: 2,
    maxLength: 160,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  fullName!: string;

  @ApiPropertyOptional({
    description: 'Email address of the candidate',
    example: 'jane.smith@example.com',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;
}
