import { NotificationTriggersService } from './notification-triggers.service';
import { NotificationService } from './notification.service';
import { TradesService } from '../../trades/trades.service';
import { BehavioralService } from '../../analytics/behavioral.service';
import { JournalsService } from '../../journals/journals.service';
import { AiInsightsService } from '../../ai/ai-insights.service';

describe('NotificationTriggersService', () => {
  let service: NotificationTriggersService;
  const notificationService = {
    isTypeEnabled: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue(undefined),
  };
  const aiInsightsService = {
    getCoachingPush: jest.fn().mockResolvedValue(null),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationTriggersService(
      notificationService as unknown as NotificationService,
      {
        getAnalytics: jest.fn().mockResolvedValue({ maxDrawdown: 0 }),
      } as unknown as TradesService,
      {
        analyzeBehavior: jest.fn().mockResolvedValue({
          fomo: { fomoScore: 0 },
        }),
      } as unknown as BehavioralService,
      {
        getStreak: jest.fn().mockResolvedValue({ currentStreak: 5 }),
      } as unknown as JournalsService,
      aiInsightsService as unknown as AiInsightsService,
    );
  });

  it('creates a coaching notification with enriched metadata when a push is selected', async () => {
    aiInsightsService.getCoachingPush.mockResolvedValue({
      ruleId: 'portfolio.concentration:AAPL',
      category: 'risk',
      title: 'Concentration Risk',
      message: 'msg',
      source: 'portfolio',
      severity: 'high',
      priority: 1,
    });

    await service.checkAndNotify('u');

    expect(notificationService.create).toHaveBeenCalledWith(
      'u',
      'coaching',
      'Concentration Risk',
      'msg',
      expect.objectContaining({
        ruleId: 'portfolio.concentration:AAPL',
        source: 'portfolio',
        category: 'risk',
        severity: 'high',
        priority: 1,
      }),
    );
  });

  it('does not create a coaching notification when no push is selected', async () => {
    aiInsightsService.getCoachingPush.mockResolvedValue(null);

    await service.checkAndNotify('u');

    expect(notificationService.create).not.toHaveBeenCalledWith(
      'u',
      'coaching',
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
  });
});
