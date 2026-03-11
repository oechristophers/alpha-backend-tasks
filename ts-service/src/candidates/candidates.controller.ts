import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { FakeAuthGuard } from '../auth/fake-auth.guard';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CandidatesService } from './candidates.service';

@ApiTags('candidates')
@ApiSecurity('x-user-id')
@ApiSecurity('x-workspace-id')
@Controller('candidates')
@UseGuards(FakeAuthGuard)
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post(':candidateId/documents')
  @ApiOperation({ summary: 'Upload a document for a candidate' })
  @ApiParam({ name: 'candidateId', example: 'paste-candidate-id-here' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @ApiResponse({ status: 403, description: 'Candidate does not belong to your workspace' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.candidatesService.uploadDocument(user, candidateId, dto);
  }

  @Post(':candidateId/summaries/generate')
  @ApiOperation({ summary: 'Queue a summary generation request for a candidate' })
  @ApiParam({ name: 'candidateId', example: 'paste-candidate-id-here' })
  @ApiResponse({ status: 201, description: 'Summary queued — poll GET summaries for status' })
  @ApiResponse({ status: 403, description: 'Candidate does not belong to your workspace' })
  @ApiResponse({ status: 404, description: 'Candidate not found' })
  async generateSummary(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ) {
    return this.candidatesService.generateSummary(user, candidateId);
  }

  @Get(':candidateId/summaries')
  @ApiOperation({ summary: 'List all summaries for a candidate' })
  @ApiParam({ name: 'candidateId', example: 'paste-candidate-id-here' })
  @ApiResponse({ status: 200, description: 'List of summaries ordered by creation date descending' })
  async listSummaries(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ) {
    return this.candidatesService.listSummaries(user, candidateId);
  }

  @Get(':candidateId/summaries/:summaryId')
  @ApiOperation({ summary: 'Get a specific summary by ID' })
  @ApiParam({ name: 'candidateId', example: 'paste-candidate-id-here' })
  @ApiParam({ name: 'summaryId', example: 'paste-summary-id-here' })
  @ApiResponse({ status: 200, description: 'Summary record with status, score, and decision' })
  @ApiResponse({ status: 404, description: 'Summary not found' })
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Param('summaryId') summaryId: string,
  ) {
    return this.candidatesService.getSummary(user, candidateId, summaryId);
  }
}
