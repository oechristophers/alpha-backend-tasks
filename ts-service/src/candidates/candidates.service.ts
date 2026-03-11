import { randomUUID } from 'crypto';

import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthUser } from '../auth/auth.types';
import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { QueueService } from '../queue/queue.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Injectable()
export class CandidatesService {
  private readonly logger = new Logger(CandidatesService.name);

  constructor(
    @InjectRepository(SampleCandidate)
    private readonly candidateRepository: Repository<SampleCandidate>,
    @InjectRepository(CandidateDocument)
    private readonly documentRepository: Repository<CandidateDocument>,
    @InjectRepository(CandidateSummary)
    private readonly summaryRepository: Repository<CandidateSummary>,
    private readonly queueService: QueueService,
  ) {}

  async uploadDocument(
    user: AuthUser,
    candidateId: string,
    dto: UploadDocumentDto,
  ): Promise<CandidateDocument> {
    await this.ensureCandidateBelongsToWorkspace(candidateId, user.workspaceId);

    const doc = this.documentRepository.create({
      id: randomUUID(),
      candidateId,
      workspaceId: user.workspaceId,
      documentType: dto.documentType,
      fileName: dto.fileName,
      storageKey: `documents/${user.workspaceId}/${candidateId}/${randomUUID()}-${dto.fileName}`,
      rawText: dto.rawText,
    });

    const saved = await this.documentRepository.save(doc);
    this.logger.log(`Document ${saved.id} uploaded for candidate ${candidateId}`);
    return saved;
  }

  async generateSummary(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateSummary> {
    await this.ensureCandidateBelongsToWorkspace(candidateId, user.workspaceId);

    const summaryRecord = this.summaryRepository.create({
      id: randomUUID(),
      candidateId,
      workspaceId: user.workspaceId,
      status: 'pending',
    });

    const saved = await this.summaryRepository.save(summaryRecord);

    this.queueService.enqueue('generate-candidate-summary', {
      summaryId: saved.id,
      candidateId,
      workspaceId: user.workspaceId,
    });

    this.logger.log(`Summary ${saved.id} queued for candidate ${candidateId}`);
    return saved;
  }

  async listSummaries(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateSummary[]> {
    await this.ensureCandidateBelongsToWorkspace(candidateId, user.workspaceId);

    return this.summaryRepository.find({
      where: { candidateId, workspaceId: user.workspaceId },
      order: { createdAt: 'DESC' },
    });
  }

  async getSummary(
    user: AuthUser,
    candidateId: string,
    summaryId: string,
  ): Promise<CandidateSummary> {
    await this.ensureCandidateBelongsToWorkspace(candidateId, user.workspaceId);

    const summary = await this.summaryRepository.findOne({
      where: { id: summaryId, candidateId, workspaceId: user.workspaceId },
    });

    if (!summary) {
      throw new NotFoundException(`Summary ${summaryId} not found`);
    }

    return summary;
  }

  private async ensureCandidateBelongsToWorkspace(
    candidateId: string,
    workspaceId: string,
  ): Promise<void> {
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    if (candidate.workspaceId !== workspaceId) {
      throw new ForbiddenException(
        'You do not have access to this candidate',
      );
    }
  }
}
