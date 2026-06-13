import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AnalysisService } from './analysis.service';
import { Analysis, AnalysisStatus } from './analysis.entity';
import { AgentResult, AgentResultStatus } from '../agent-result/agent-result.entity';
import { TechnicalAgent } from '../agents/technical/technical.agent';
import { NewsSentimentAgent } from '../agents/news-sentiment/news-sentiment.agent';

const makeAnalysis = (overrides: Partial<Analysis> = {}): Analysis => ({
  id: 'test-uuid',
  ticker: 'AAPL',
  status: AnalysisStatus.COMPLETED,
  createdAt: new Date(),
  completedAt: new Date(),
  agentResults: [],
  ...overrides,
} as Analysis);

describe('AnalysisService', () => {
  let service: AnalysisService;
  let analysisRepo: any;
  let agentResultRepo: any;

  beforeEach(async () => {
    analysisRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    agentResultRepo = {
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalysisService,
        { provide: getRepositoryToken(Analysis), useValue: analysisRepo },
        { provide: getRepositoryToken(AgentResult), useValue: agentResultRepo },
        { provide: TechnicalAgent, useValue: { agentName: 'technical', analyze: jest.fn() } },
        { provide: NewsSentimentAgent, useValue: { agentName: 'news_sentiment', analyze: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => '24' } },
      ],
    }).compile();

    service = module.get<AnalysisService>(AnalysisService);
  });

  describe('createOrGetAnalysis', () => {
    it('returns cached analysis when a completed one exists within 24h', async () => {
      const cached = makeAnalysis();
      analysisRepo.findOne.mockResolvedValueOnce(cached);

      const result = await service.createOrGetAnalysis('AAPL');

      expect(result.cached).toBe(true);
      expect(result.analysis.id).toBe('test-uuid');
      expect(analysisRepo.save).not.toHaveBeenCalled();
    });

    it('creates new analysis when no recent completed one exists', async () => {
      analysisRepo.findOne.mockResolvedValueOnce(null);
      const newAnalysis = makeAnalysis({ status: AnalysisStatus.RUNNING });
      analysisRepo.save.mockResolvedValueOnce(newAnalysis);

      const result = await service.createOrGetAnalysis('AAPL');

      expect(result.cached).toBe(false);
      expect(analysisRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'AAPL', status: AnalysisStatus.RUNNING }),
      );
    });

    it('normalizes ticker to uppercase', async () => {
      analysisRepo.findOne.mockResolvedValueOnce(null);
      analysisRepo.save.mockResolvedValueOnce(makeAnalysis({ ticker: 'AAPL', status: AnalysisStatus.RUNNING }));

      await service.createOrGetAnalysis('aapl');

      expect(analysisRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ ticker: 'AAPL' }),
      );
    });
  });
});
