import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { QueueService } from '../queue/queue.service';
import { CandidatesService } from './candidates.service';

describe('CandidatesService', () => {
  let service: CandidatesService;

  const candidateRepository = {
    findOne: jest.fn(),
  };

  const documentRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const summaryRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const queueService = {
    enqueue: jest.fn(),
  };

  const user = { userId: 'user-1', workspaceId: 'ws-1' };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        { provide: getRepositoryToken(SampleCandidate), useValue: candidateRepository },
        { provide: getRepositoryToken(CandidateDocument), useValue: documentRepository },
        { provide: getRepositoryToken(CandidateSummary), useValue: summaryRepository },
        { provide: QueueService, useValue: queueService },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
  });

  describe('uploadDocument', () => {
    it('uploads a document for a valid candidate in the same workspace', async () => {
      candidateRepository.findOne.mockResolvedValue({ id: 'c-1', workspaceId: 'ws-1' });
      documentRepository.create.mockImplementation((v: unknown) => v);
      documentRepository.save.mockImplementation(async (v: unknown) => v);

      const result = await service.uploadDocument(user, 'c-1', {
        documentType: 'resume',
        fileName: 'resume.pdf',
        rawText: 'Experienced engineer...',
      });

      expect(candidateRepository.findOne).toHaveBeenCalledWith({ where: { id: 'c-1' } });
      expect(documentRepository.create).toHaveBeenCalled();
      expect(result.candidateId).toBe('c-1');
      expect(result.workspaceId).toBe('ws-1');
      expect(result.documentType).toBe('resume');
      expect(result.rawText).toBe('Experienced engineer...');
    });

    it('throws NotFoundException when candidate does not exist', async () => {
      candidateRepository.findOne.mockResolvedValue(null);

      await expect(
        service.uploadDocument(user, 'nonexistent', {
          documentType: 'resume',
          fileName: 'resume.pdf',
          rawText: 'text',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when candidate belongs to a different workspace', async () => {
      candidateRepository.findOne.mockResolvedValue({ id: 'c-1', workspaceId: 'other-ws' });

      await expect(
        service.uploadDocument(user, 'c-1', {
          documentType: 'resume',
          fileName: 'resume.pdf',
          rawText: 'text',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('generateSummary', () => {
    it('creates a pending summary and enqueues a job', async () => {
      candidateRepository.findOne.mockResolvedValue({ id: 'c-1', workspaceId: 'ws-1' });
      summaryRepository.create.mockImplementation((v: unknown) => v);
      summaryRepository.save.mockImplementation(async (v: unknown) => ({
        ...(v as Record<string, unknown>),
        id: 'summary-1',
      }));
      queueService.enqueue.mockReturnValue({ id: 'job-1' });

      const result = await service.generateSummary(user, 'c-1');

      expect(result.status).toBe('pending');
      expect(result.candidateId).toBe('c-1');
      expect(queueService.enqueue).toHaveBeenCalledWith('generate-candidate-summary', {
        summaryId: 'summary-1',
        candidateId: 'c-1',
        workspaceId: 'ws-1',
      });
    });

    it('rejects when candidate not found', async () => {
      candidateRepository.findOne.mockResolvedValue(null);

      await expect(service.generateSummary(user, 'c-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('listSummaries', () => {
    it('returns summaries scoped to workspace', async () => {
      candidateRepository.findOne.mockResolvedValue({ id: 'c-1', workspaceId: 'ws-1' });
      summaryRepository.find.mockResolvedValue([{ id: 's-1' }, { id: 's-2' }]);

      const result = await service.listSummaries(user, 'c-1');

      expect(result).toHaveLength(2);
      expect(summaryRepository.find).toHaveBeenCalledWith({
        where: { candidateId: 'c-1', workspaceId: 'ws-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('getSummary', () => {
    it('returns a specific summary', async () => {
      candidateRepository.findOne.mockResolvedValue({ id: 'c-1', workspaceId: 'ws-1' });
      summaryRepository.findOne.mockResolvedValue({ id: 's-1', candidateId: 'c-1' });

      const result = await service.getSummary(user, 'c-1', 's-1');

      expect(result.id).toBe('s-1');
    });

    it('throws NotFoundException when summary does not exist', async () => {
      candidateRepository.findOne.mockResolvedValue({ id: 'c-1', workspaceId: 'ws-1' });
      summaryRepository.findOne.mockResolvedValue(null);

      await expect(service.getSummary(user, 'c-1', 'nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
