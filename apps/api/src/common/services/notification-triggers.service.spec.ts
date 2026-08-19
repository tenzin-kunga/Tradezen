import { NotificationTriggersService } from './notification-triggers.service';

describe('NotificationTriggersService', () => {
  let service: NotificationTriggersService;
  let notificationService: any;
  let aiInsightsService: any;

  beforeEach(() => {
    notificationService = {
      isTypeEnabled: jest.fn().mockResolvedValue(true),
      create: jest.fn().mockResolvedValue(undefined),
    };
    aiInsightsService = {
      getCoachingPush: jest.fn().mockResolvedValue(null),
    };

    service = new NotificationTriggersService(
      notificationService,
      { getAnalytics: jest.fn().mockResolvedValue({ maxDrawdown: 0 }) } as any,
      {
        analyzeBehavior: jest.fn().mockResolvedValue({
          fomo: { fomoScore: 0 },
        }),
      } as any,
      { getStreak: jest.fn().mockResolvedValue({ currentStreak: 5 }) } as any,
      aiInsightsService,
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
