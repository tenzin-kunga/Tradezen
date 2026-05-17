import { Injectable, Logger } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { TradesService } from '../../trades/trades.service';
import { BehavioralService } from '../../analytics/behavioral.service';
import { JournalsService } from '../../journals/journals.service';

@Injectable()
export class NotificationTriggersService {
  private readonly logger = new Logger('NotificationTriggers');

  constructor(
    private readonly notificationService: NotificationService,
    private readonly tradesService: TradesService,
    private readonly behavioralService: BehavioralService,
    private readonly journalsService: JournalsService,
  ) {}

  async checkAndNotify(userId: string): Promise<void> {
    try {
      const analytics = await this.tradesService.getAnalytics(userId);
      const behavioral = await this.behavioralService.analyzeBehavior(userId);

      // Drawdown alert
      if ((analytics as any).maxDrawdown > 1000) {
        await this.notificationService.create(
          userId,
          'drawdown_alert',
          'Significant Drawdown Detected',
          `Your maximum drawdown is $${(analytics as any).maxDrawdown.toFixed(2)}. Consider reviewing your risk management.`,
          { maxDrawdown: (analytics as any).maxDrawdown },
        );
      }

      // FOMO warning (fomoScore is 0-1 scale)
      if (behavioral.fomo.fomoScore > 0.7) {
        await this.notificationService.create(
          userId,
          'fomo_warning',
          'High FOMO Risk',
          `Your FOMO score is ${Math.round(behavioral.fomo.fomoScore * 100)}/100. Take a break and review your trading plan before your next trade.`,
          { fomoScore: behavioral.fomo.fomoScore },
        );
      }

      // Losing streak
      const advanced = await this.tradesService.getAdvancedAnalytics(userId);
      if ((advanced as any).currentStreak?.type === 'loss' && (advanced as any).currentStreak?.count >= 3) {
        await this.notificationService.create(
          userId,
          'coaching',
          'Losing Streak Alert',
          `You're on a ${(advanced as any).currentStreak.count}-trade losing streak. Consider stepping back and reviewing your strategy.`,
          { streak: (advanced as any).currentStreak },
        );
      }

      // Journal reminder (no journal in 3 days)
      const streak = await this.journalsService.getStreak(userId);
      if ((streak as any).currentStreak === 0) {
        await this.notificationService.create(
          userId,
          'journal_reminder',
          'Journal Reminder',
          'You haven\'t journaled recently. Taking 2 minutes to reflect on your trading can significantly improve your performance.',
          {},
        );
      }
    } catch (error) {
      this.logger.error(`Notification trigger failed: ${(error as Error).message}`);
    }
  }
}
