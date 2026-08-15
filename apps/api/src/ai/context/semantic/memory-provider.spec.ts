import { Test, TestingModule } from '@nestjs/testing';
import { MemoryProvider } from './memory-provider';
import { SemanticRetrievalService } from './semantic-retrieval.service';
import { SemanticMetricsService } from './semantic-metrics.service';
import { RetrievalClient } from '../../retrieval-client';
import { RetrievalIntent } from './types';

const mockSemantic = {
  retrieve: jest.fn().mockResolvedValue([
    {
      id: 't1',
      sourceType: 'trade',
      title: 'AAPL',
      content: 'Bought AAPL at 150',
      similarity: 0.85,
      metadata: {},
    },
  ]),
};

const mockRetrievalClient = {
  isEnabled: jest.fn().mockReturnValue(false),
  isShadow: jest.fn().mockReturnValue(false),
  shouldCall: jest.fn().mockReturnValue(false),
  search: jest.fn(),
};

const mockMetricsService = {
  recordShadowComparison: jest.fn(),
};

describe('MemoryProvider', () => {
  let provider: MemoryProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryProvider,
        { provide: SemanticRetrievalService, useValue: mockSemantic },
        { provide: RetrievalClient, useValue: mockRetrievalClient },
        { provide: SemanticMetricsService, useValue: mockMetricsService },
      ],
    }).compile();
    provider = module.get<MemoryProvider>(MemoryProvider);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  it('build returns empty block when no lastUserMessage', async () => {
    const block = await provider.build('u1', {});
    expect(block.content).toContain('No relevant memories');
    expect(mockSemantic.retrieve).not.toHaveBeenCalled();
  });

  it('build calls semantic.retrieve with lastUserMessage', async () => {
    const block = await provider.build('u1', {}, 'AAPL analysis');
    expect(mockSemantic.retrieve).toHaveBeenCalledWith(
      'u1',
      'AAPL analysis',
      RetrievalIntent.CHAT,
    );
    expect(block.source).toBe('memory');
    expect(block.content).toContain('AAPL');
  });

  it('build uses RetrievalClient when enabled', async () => {
    mockRetrievalClient.isEnabled.mockReturnValue(true);
    mockRetrievalClient.shouldCall.mockReturnValue(true);
    mockRetrievalClient.search.mockResolvedValue({
      requestId: 'r1',
      documents: [
        {
          documentId: 't1',
          sourceId: 't1',
          sourceType: 'trade',
          content: 'Bought AAPL at 150',
          title: 'AAPL',
          score: 0.9,
          retrievalMethod: 'rrf',
        },
      ],
      debug: {
        candidates: 1,
        filtered: 1,
        latencyMs: 5,
        method: 'hybrid',
        breakdown: {},
      },
    });

    const block = await provider.build('u1', {}, 'AAPL analysis');
    expect(mockSemantic.retrieve).not.toHaveBeenCalled();
    expect(mockRetrievalClient.search).toHaveBeenCalledWith('u1', {
      query: 'AAPL analysis',
      intent: RetrievalIntent.CHAT,
      requestId: expect.any(String),
    });
    expect(block.content).toContain('AAPL');
  });

  it('shadow mode runs both paths and serves the old result', async () => {
    mockRetrievalClient.isShadow.mockReturnValue(true);
    mockRetrievalClient.shouldCall.mockReturnValue(true);
    mockRetrievalClient.search.mockResolvedValue({
      requestId: 'r2',
      documents: [
        {
          documentId: 't9',
          sourceId: 't9',
          sourceType: 'journal',
          content: 'New path content',
          title: 'NEW',
          score: 0.95,
          retrievalMethod: 'rrf',
        },
      ],
      debug: {
        candidates: 1,
        filtered: 1,
        latencyMs: 8,
        method: 'hybrid',
        breakdown: {},
        degraded: false,
      },
    });

    const block = await provider.build('u1', {}, 'AAPL analysis');
    expect(mockRetrievalClient.search).toHaveBeenCalled();
    expect(mockSemantic.retrieve).toHaveBeenCalled();
    // Serves the OLD path result, not the new one.
    expect(block.content).toContain('Bought AAPL');
    expect(block.content).not.toContain('New path content');
    expect(mockMetricsService.recordShadowComparison).toHaveBeenCalledWith({
      oldLatencyMs: expect.any(Number),
      newLatencyMs: expect.any(Number),
      oldCount: 1,
      newCount: 1,
      oldAvgScore: 0.85,
      newAvgScore: 0.95,
      oldTokens: expect.any(Number),
      newTokens: expect.any(Number),
      degraded: false,
    });
  });

  it('shadow mode records degraded flag on new-path failure', async () => {
    mockRetrievalClient.isShadow.mockReturnValue(true);
    mockRetrievalClient.shouldCall.mockReturnValue(true);
    mockRetrievalClient.search.mockResolvedValue({
      requestId: 'r3',
      documents: [],
      debug: {
        candidates: 0,
        filtered: 0,
        latencyMs: 0,
        method: 'vector',
        breakdown: {},
        degraded: true,
      },
    });

    await provider.build('u1', {}, 'AAPL analysis');
    expect(mockMetricsService.recordShadowComparison).toHaveBeenCalledWith(
      expect.objectContaining({ degraded: true, newCount: 0 }),
    );
    // Old path unaffected.
    expect(mockSemantic.retrieve).toHaveBeenCalledTimes(1);
  });

  it('supports returns true when no providers filter', () => {
    expect(provider.supports({})).toBe(true);
  });

  it('supports returns false when memory excluded', () => {
    expect(provider.supports({ providers: ['trades'] })).toBe(false);
  });
});
