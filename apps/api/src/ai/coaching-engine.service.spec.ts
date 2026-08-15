import { Test } from '@nestjs/testing';
import { CoachingEngineService } from './coaching-engine.service';
import { CoachingWorkflow } from './workflows/coaching.workflow';
import { TradesService } from '../trades/trades.service';
import { BehavioralService } from '../analytics/behavioral.service';
import { SemanticSourceType } from './context/semantic/types';
import { FormatterRegistry } from './context/semantic/formatters/registry';
import { CoachingDocumentFormatter } from './context/semantic/formatters/coaching-document.formatter';

jest.mock('./workflows/coaching.workflow', () => ({
  CoachingWorkflow: class {},
}));

jest.mock('../db/drizzle', () => ({
  db: {
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        returning: jest.fn(() => Promise.resolve([{ id: 'sess-1' }])),
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

describe('CoachingEngineService', () => {
  let service: CoachingEngineService;
  const pipeline = { enqueue: jest.fn(), handleEvent: jest.fn() };
  const workflow = { run: jest.fn() };
  const tradesService = {
    getAnalytics: jest.fn().mockResolvedValue({ winRate: 30 }),
    getAdvancedAnalytics: jest.fn().mockResolvedValue({ sharpeRatio: -0.5 }),
  };
  const behavioralService = {
    analyzeBehavior: jest.fn().mockResolvedValue({
      fomo: { fomoScore: 80 },
      revenge: { revengeScore: 70 },
      scores: { discipline: 40, consistency: 40, lossChasing: 60 },
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        CoachingEngineService,
        { provide: CoachingWorkflow, useValue: workflow },
        { provide: TradesService, useValue: tradesService },
        { provide: BehavioralService, useValue: behavioralService },
        { provide: 'EmbeddingPipeline', useValue: pipeline },
        {
          provide: FormatterRegistry,
          useValue: {
            get: jest.fn(() => new CoachingDocumentFormatter()),
          },
        },
      ],
    }).compile();
    service = module.get(CoachingEngineService);
  });

  it('persists the session and enqueues embedding with the real session id on critical severity', async () => {
    workflow.run.mockResolvedValue({
      severity: 'critical',
      triggers: ['t1', 't2', 't3', 't4'],
      coachingMessage: 'slow down',
    });

    const result = await service.evaluateAndCoach('u1');

    expect(result.severity).toBe('critical');
    expect(pipeline.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sess-1',
        userId: 'u1',
        sourceType: SemanticSourceType.COACHING,
        title: 'Coaching session critical',
        content: 'slow down',
        metadata: { severity: 'critical', triggers: ['t1', 't2', 't3', 't4'] },
        provenance: {
          source: 'coaching',
          entity: 'coaching_session',
          operation: 'create',
        },
      }),
    );
  });

  it('does not enqueue embeddings for non-critical severity', async () => {
    workflow.run.mockResolvedValue({
      severity: 'low',
      triggers: ['t1'],
      coachingMessage: 'fine',
    });

    await service.evaluateAndCoach('u1');

    expect(pipeline.enqueue).not.toHaveBeenCalled();
  });

  it('does not fail the business operation when embedding fails', async () => {
    workflow.run.mockResolvedValue({
      severity: 'critical',
      triggers: ['t1', 't2', 't3', 't4'],
      coachingMessage: 'slow down',
    });
    pipeline.enqueue.mockRejectedValue(new Error('embed API down'));

    const result = await service.evaluateAndCoach('u1');

    expect(result.severity).toBe('critical');
    expect(result.coachingMessage).toBe('slow down');
  });
});
