import { Test, TestingModule } from '@nestjs/testing';
import { SemanticRetrievalService } from './semantic-retrieval.service';
import { ProfileRegistry } from './profile-registry';
import { SemanticMetricsService } from './semantic-metrics.service';
import { RetrievalIntent } from './types';
import { EmbeddingService } from '../../embedding.service';

const mockRepository = {
  store: jest.fn(),
  search: jest.fn().mockResolvedValue([]),
  remove: jest.fn(),
  countByUser: jest.fn().mockResolvedValue(0),
};

const mockEmbeddingService = {
  generateEmbedding: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]),
};

describe('SemanticRetrievalService', () => {
  let service: SemanticRetrievalService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SemanticRetrievalService,
        ProfileRegistry,
        { provide: 'EmbeddingRepository', useValue: mockRepository },
        { provide: EmbeddingService, useValue: mockEmbeddingService },
        {
          provide: SemanticMetricsService,
          useValue: { recordRetrieval: jest.fn() },
        },
      ],
    }).compile();
    service = module.get<SemanticRetrievalService>(SemanticRetrievalService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('retrieve calls repository.search with profile params', async () => {
    mockRepository.search.mockResolvedValue([
      {
        id: '1',
        sourceType: 'trade',
        sourceId: 't1',
        chunkIndex: 0,
        content: 'AAPL trade',
        similarity: 0.85,
        metadata: { title: 'AAPL' },
      },
    ]);

    const results = await service.retrieve(
      'u1',
      'AAPL trades',
      RetrievalIntent.CHAT,
    );

    expect(mockEmbeddingService.generateEmbedding).toHaveBeenCalledWith(
      'u1',
      'AAPL trades',
    );
    expect(mockRepository.search).toHaveBeenCalledWith(
      'u1',
      [0.1, 0.2, 0.3],
      15,
      0.7,
    );
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('t1');
    expect(results[0].title).toBe('AAPL');
  });

  it('retrieve deduplicates by sourceId keeping highest similarity', async () => {
    mockRepository.search.mockResolvedValue([
      {
        id: '1',
        sourceType: 'knowledge_document',
        sourceId: 'd1',
        chunkIndex: 0,
        content: 'chunk a',
        similarity: 0.8,
        metadata: {},
      },
      {
        id: '2',
        sourceType: 'knowledge_document',
        sourceId: 'd1',
        chunkIndex: 1,
        content: 'chunk b',
        similarity: 0.9,
        metadata: {},
      },
      {
        id: '3',
        sourceType: 'trade',
        sourceId: 't1',
        chunkIndex: 0,
        content: 'trade',
        similarity: 0.75,
        metadata: {},
      },
    ]);

    const results = await service.retrieve('u1', 'query');

    expect(results).toHaveLength(2);
    expect(results[0].similarity).toBe(0.9);
    expect(results[1].similarity).toBe(0.75);
  });

  it('removeIndex delegates to repository', async () => {
    await service.removeIndex('trade', 't1');
    expect(mockRepository.remove).toHaveBeenCalledWith('trade', 't1');
  });
});

describe('ProfileRegistry', () => {
  it('returns correct profile for each intent', () => {
    const registry = new ProfileRegistry();
    expect(registry.get(RetrievalIntent.CHAT).maxResults).toBe(15);
    expect(registry.get(RetrievalIntent.COACH).similarityThreshold).toBe(0.75);
    expect(registry.get(RetrievalIntent.INSPECT).maxResults).toBe(5);
  });
});
