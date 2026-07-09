import { Test, TestingModule } from '@nestjs/testing';
import { MemoryProvider } from './memory-provider';
import { SemanticRetrievalService } from './semantic-retrieval.service';
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

describe('MemoryProvider', () => {
  let provider: MemoryProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MemoryProvider,
        { provide: SemanticRetrievalService, useValue: mockSemantic },
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

  it('supports returns true when no providers filter', () => {
    expect(provider.supports({})).toBe(true);
  });

  it('supports returns false when memory excluded', () => {
    expect(provider.supports({ providers: ['trades'] })).toBe(false);
  });
});
