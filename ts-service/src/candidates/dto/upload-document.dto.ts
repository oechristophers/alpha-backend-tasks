import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const DOCUMENT_TYPES = ['resume', 'cover_letter', 'portfolio', 'reference', 'other'] as const;

export class UploadDocumentDto {
  @ApiProperty({
    description: 'Type of document being uploaded',
    enum: DOCUMENT_TYPES,
    example: 'resume',
  })
  @IsString()
  @IsIn(DOCUMENT_TYPES)
  documentType!: string;

  @ApiProperty({
    description: 'Original file name',
    example: 'john-doe-resume.pdf',
    maxLength: 255,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @ApiProperty({
    description: 'Full text content of the document',
    example: 'John Doe — Senior Software Engineer with 8 years of experience in Node.js and TypeScript...',
  })
  @IsString()
  @MinLength(1)
  rawText!: string;
}
