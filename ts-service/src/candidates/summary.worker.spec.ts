import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { SUMMARIZATION_PROVIDER } from '../llm/summarization-provider.interface';
import { QueueService } from '../queue/queue.service';
import { SummaryWorker } from './summary.worker';

describe('SummaryWorker', () => {
  let worker: SummaryWorker;

  const documentRepository = {
    find: jest.fn(),
  };

  const summaryRepository = {
    update: jest.fn(),
  };

  const mockProvider = {
    generateCandidateSummary: jest.fn(),
  };

  const queueService = {
    dequeue: jest.fn(),
  };

  const configService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        SUMMARY_PROMPT_VERSION: 'v1',
        USE_FAKE_SUMMARIZER: 'true',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SummaryWorker,
        { provide: getRepositoryToken(CandidateDocument), useValue: documentRepository },
        { provide: getRepositoryToken(CandidateSummary), useValue: summaryRepository },
        { provide: SUMMARIZATION_PROVIDER, useValue: mockProvider },
        { provide: QueueService, useValue: queueService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    worker = module.get<SummaryWorker>(SummaryWorker);
  });

  it('processes a job successfully and updates summary to completed', async () => {
    documentRepository.find.mockResolvedValue([
      { rawText: 'Resume content here' },
      { rawText: 'Cover letter content' },
    ]);

    mockProvider.generateCandidateSummary.mockResolvedValue({
      score: 85,
      strengths: ['Strong technical skills', 'Good communication'],
      concerns: ['Limited leadership experience'],
      summary: 'A strong candidate with solid technical background.',
      recommendedDecision: 'advance',
    });

    summaryRepository.update.mockResolvedValue({ affected: 1 });

    await worker.processJob({
      summaryId: 's-1',
      candidateId: 'c-1',
      workspaceId: 'ws-1',
    });

    expect(documentRepository.find).toHaveBeenCalledWith({ where: { candidateId: 'c-1' } });
    expect(mockProvider.generateCandidateSummary).toHaveBeenCalledWith({
      candidateId: 'c-1',
      documents: ['Resume content here', 'Cover letter content'],
    });
    expect(summaryRepository.update).toHaveBeenCalledWith('s-1', {
      status: 'completed',
      score: 85,
      strengths: ['Strong technical skills', 'Good communication'],
      concerns: ['Limited leadership experience'],
      summary: 'A strong candidate with solid technical background.',
      recommendedDecision: 'advance',
      provider: 'fake',
      promptVersion: 'v1',
    });
  });

  it('marks summary as failed when provider throws', async () => {
    documentRepository.find.mockResolvedValue([]);
    mockProvider.generateCandidateSummary.mockRejectedValue(new Error('API timeout'));
    summaryRepository.update.mockResolvedValue({ affected: 1 });

    await worker.processJob({
      summaryId: 's-1',
      candidateId: 'c-1',
      workspaceId: 'ws-1',
    });

    expect(summaryRepository.update).toHaveBeenCalledWith('s-1', {
      status: 'failed',
      errorMessage: 'API timeout',
    });
  });

  it('marks summary as failed when provider returns invalid score', async () => {
    documentRepository.find.mockResolvedValue([{ rawText: 'Some text' }]);
    mockProvider.generateCandidateSummary.mockResolvedValue({
      score: 150,
      strengths: ['Good'],
      concerns: ['Bad'],
      summary: 'A candidate.',
      recommendedDecision: 'advance',
    });
    summaryRepository.update.mockResolvedValue({ affected: 1 });

    await worker.processJob({
      summaryId: 's-1',
      candidateId: 'c-1',
      workspaceId: 'ws-1',
    });

    expect(summaryRepository.update).toHaveBeenCalledWith('s-1', {
      status: 'failed',
      errorMessage: expect.stringContaining('Invalid score'),
    });
  });

  it('marks summary as failed when provider returns invalid decision', async () => {
    documentRepository.find.mockResolvedValue([{ rawText: 'Some text' }]);
    mockProvider.generateCandidateSummary.mockResolvedValue({
      score: 70,
      strengths: ['Good'],
      concerns: ['Bad'],
      summary: 'A candidate.',
      recommendedDecision: 'maybe',
    });
    summaryRepository.update.mockResolvedValue({ affected: 1 });

    await worker.processJob({
      summaryId: 's-1',
      candidateId: 'c-1',
      workspaceId: 'ws-1',
    });

    expect(summaryRepository.update).toHaveBeenCalledWith('s-1', {
      status: 'failed',
      errorMessage: expect.stringContaining('Invalid recommendedDecision'),
    });
  });
});
