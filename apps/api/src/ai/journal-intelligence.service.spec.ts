import { Test } from '@nestjs/testing';
import { JournalIntelligenceService } from './journal-intelligence.service';
import { JournalAnalysisWorkflow } from './workflows/journal-analysis.workflow';
import { SemanticSourceType } from './context/semantic/types';
import { FormatterRegistry } from './context/semantic/formatters/registry';
import { InsightDocumentFormatter } from './context/semantic/formatters/insight-document.formatter';

jest.mock('./workflows/journal-analysis.workflow', () => ({
  JournalAnalysisWorkflow: class {},
}));

jest.mock('../db/drizzle', () => ({
  db: {
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{ id: 'insight-1' }])),
      })),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  },
}));

describe('JournalIntelligenceService', () => {
  let service: JournalIntelligenceService;
  const pipeline = { enqueue: jest.fn(), handleEvent: jest.fn() };
  const workflow = { run: jest.fn() };

  const result = {
    sentiment: 'mixed',
    patterns: ['revenge trading'],
    insights: ['reduce size after loss'],
    summary: 'summary text',
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        JournalIntelligenceService,
        { provide: JournalAnalysisWorkflow, useValue: workflow },
        { provide: 'EmbeddingPipeline', useValue: pipeline },
        {
          provide: FormatterRegistry,
          useValue: {
            get: jest.fn(() => new InsightDocumentFormatter()),
          },
        },
      ],
    }).compile();
    service = module.get(JournalIntelligenceService);
    workflow.run.mockResolvedValue(result);
  });

  it('persists the insight and enqueues embedding with the real insight id', async () => {
    const res = await service.analyzeJournals('u1', '2026-01-01', '2026-01-31');

    expect(res.summary).toBe('summary text');
    expect(pipeline.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'insight-1',
        userId: 'u1',
        sourceType: SemanticSourceType.AI_INSIGHT,
        title: 'Insight journal_analysis',
        content: 'summary text',
        metadata: {
          sentiment: 'mixed',
          patterns: ['revenge trading'],
          insights: ['reduce size after loss'],
          dateFrom: '2026-01-01',
          dateTo: '2026-01-31',
          insightType: 'journal_analysis',
        },
        provenance: {
          source: 'journal_intelligence',
          entity: 'ai_insight',
          operation: 'create',
        },
      }),
    );
  });

  it('does not fail the business operation when embedding fails', async () => {
    pipeline.enqueue.mockRejectedValue(new Error('embed API down'));

    const res = await service.analyzeJournals('u1', '2026-01-01', '2026-01-31');

    expect(res.summary).toBe('summary text');
    expect(res.sentiment).toBe('mixed');
  });
});
