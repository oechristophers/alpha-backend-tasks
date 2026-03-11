import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';

import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import {
  CandidateSummaryResult,
  SUMMARIZATION_PROVIDER,
  SummarizationProvider,
} from '../llm/summarization-provider.interface';
import { QueueService } from '../queue/queue.service';

export interface SummaryJobPayload {
  summaryId: string;
  candidateId: string;
  workspaceId: string;
}

@Injectable()
export class SummaryWorker implements OnModuleInit {
  private readonly logger = new Logger(SummaryWorker.name);
  private readonly pollIntervalMs = 2000;
  private running = false;

  constructor(
    @InjectRepository(CandidateDocument)
    private readonly documentRepository: Repository<CandidateDocument>,
    @InjectRepository(CandidateSummary)
    private readonly summaryRepository: Repository<CandidateSummary>,
    @Inject(SUMMARIZATION_PROVIDER)
    private readonly summarizationProvider: SummarizationProvider,
    private readonly queueService: QueueService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.startPolling();
  }

  private startPolling(): void {
    if (this.running) return;
    this.running = true;
    this.logger.log('Summary worker started polling for jobs');
    this.poll();
  }

  private poll(): void {
    if (!this.running) return;

    const job = this.queueService.dequeue('generate-candidate-summary');
    if (job) {
      this.processJob(job.payload as SummaryJobPayload)
        .catch((err) => this.logger.error(`Unhandled job error: ${err.message}`, err.stack));
    }

    setTimeout(() => this.poll(), this.pollIntervalMs);
  }

  async processJob(payload: SummaryJobPayload): Promise<void> {
    const { summaryId, candidateId } = payload;
    this.logger.log(`Processing summary ${summaryId} for candidate ${candidateId}`);

    try {
      const documents = await this.documentRepository.find({
        where: { candidateId },
      });

      const documentTexts = documents.map((d) => d.rawText);

      const result = await this.summarizationProvider.generateCandidateSummary({
        candidateId,
        documents: documentTexts,
      });

      this.validateResult(result);

      const promptVersion = this.configService.get<string>('SUMMARY_PROMPT_VERSION') ?? 'v1';
      const providerName = this.configService.get<string>('USE_FAKE_SUMMARIZER') === 'true'
        ? 'fake'
        : 'gemini';

      await this.summaryRepository.update(summaryId, {
        status: 'completed',
        score: result.score,
        strengths: result.strengths,
        concerns: result.concerns,
        summary: result.summary,
        recommendedDecision: result.recommendedDecision,
        provider: providerName,
        promptVersion,
      });

      this.logger.log(`Summary ${summaryId} completed successfully`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Summary ${summaryId} failed: ${message}`);

      await this.summaryRepository.update(summaryId, {
        status: 'failed',
        errorMessage: message,
      });
    }
  }

  private validateResult(result: CandidateSummaryResult): void {
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
      throw new Error(`Invalid score: ${result.score}. Must be a number between 0 and 100.`);
    }
    if (!Array.isArray(result.strengths)) {
      throw new Error('Invalid strengths: must be an array of strings.');
    }
    if (!Array.isArray(result.concerns)) {
      throw new Error('Invalid concerns: must be an array of strings.');
    }
    if (typeof result.summary !== 'string' || result.summary.length === 0) {
      throw new Error('Invalid summary: must be a non-empty string.');
    }
    const validDecisions = ['advance', 'hold', 'reject'];
    if (!validDecisions.includes(result.recommendedDecision)) {
      throw new Error(`Invalid recommendedDecision: ${result.recommendedDecision}. Must be one of: ${validDecisions.join(', ')}`);
    }
  }
}
