import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, gte, lte } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { goals, trades } from '@tradezen/db';
import { CreateGoalDto, UpdateGoalDto } from './dto';
import type { GoalType } from './dto';

@Injectable()
export class GoalsService {
  async create(userId: string, dto: CreateGoalDto) {
    const result = await db
      .insert(goals)
      .values({
        userId,
        type: dto.type,
        target: String(dto.target),
        period: dto.period ?? 'monthly',
        direction: dto.direction ?? 'higher',
        startDate: dto.startDate,
        endDate: dto.endDate ?? null,
      })
      .returning();
    return result[0];
  }

  async findAll(userId: string) {
    const userGoals = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(goals.createdAt);

    const results = await Promise.all(
      userGoals.map((g) => this.computeProgress(userId, g)),
    );
    return results;
  }

  async findOne(userId: string, id: string) {
    const result = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)));
    if (!result[0]) throw new NotFoundException('Goal not found');
    return this.computeProgress(userId, result[0]);
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const updateData: Partial<typeof goals.$inferInsert> = {};
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.target !== undefined) updateData.target = String(dto.target);
    if (dto.period !== undefined) updateData.period = dto.period;
    if (dto.direction !== undefined) updateData.direction = dto.direction;
    if (dto.startDate !== undefined) updateData.startDate = dto.startDate;
    if (dto.endDate !== undefined) updateData.endDate = dto.endDate;

    if (Object.keys(updateData).length === 0) {
      return this.findOne(userId, id);
    }

    updateData.updatedAt = new Date();

    const result = await db
      .update(goals)
      .set(updateData)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    if (!result[0]) throw new NotFoundException('Goal not found');
    return this.computeProgress(userId, result[0]);
  }

  async remove(userId: string, id: string) {
    const result = await db
      .delete(goals)
      .where(and(eq(goals.id, id), eq(goals.userId, userId)))
      .returning();
    if (!result[0]) throw new NotFoundException('Goal not found');
    return { deleted: true };
  }

  async computeProgress(userId: string, goal: typeof goals.$inferSelect) {
    const now = new Date();
    let periodStart: Date;
    const periodEnd: Date | null = goal.endDate ? new Date(goal.endDate) : null;

    switch (goal.period) {
      case 'weekly': {
        const dayOfWeek = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        break;
      }
      case 'yearly': {
        periodStart = new Date(now.getFullYear(), 0, 1);
        break;
      }
      case 'monthly':
      default: {
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      }
    }

    const goalStart = new Date(goal.startDate);
    if (goalStart > periodStart) periodStart = goalStart;

    // Also include end-of-period cap
    const periodEndCap = new Date(periodStart);
    switch (goal.period) {
      case 'weekly':
        periodEndCap.setDate(periodEndCap.getDate() + 7);
        break;
      case 'yearly':
        periodEndCap.setFullYear(periodEndCap.getFullYear() + 1);
        break;
      case 'monthly':
      default:
        periodEndCap.setMonth(periodEndCap.getMonth() + 1);
        break;
    }

    const currentValue = await this.calcMetric(
      goal.type as GoalType,
      userId,
      periodStart,
      periodEnd ?? periodEndCap,
    );
    const target = Number(goal.target);
    const progress =
      target !== 0
        ? Math.min(100, Math.round((currentValue / target) * 100))
        : 0;

    return {
      ...goal,
      target,
      currentValue,
      progress,
      periodStart: periodStart.toISOString(),
      periodEnd: (periodEnd ?? periodEndCap).toISOString(),
    };
  }

  private async calcMetric(
    type: GoalType,
    userId: string,
    from: Date,
    to: Date,
  ): Promise<number> {
    const periodTrades = await db
      .select({
        pnl: trades.pnl,
        direction: trades.direction,
        createdAt: trades.createdAt,
      })
      .from(trades)
      .where(
        and(
          eq(trades.userId, userId),
          gte(trades.createdAt, from),
          lte(trades.createdAt, to),
        ),
      );

    if (periodTrades.length === 0) return 0;

    switch (type) {
      case 'total_trades':
        return periodTrades.length;

      case 'monthly_pnl': {
        const total = periodTrades.reduce((sum, t) => sum + Number(t.pnl), 0);
        return Math.round(total * 100) / 100;
      }

      case 'monthly_win_rate': {
        const wins = periodTrades.filter((t) => Number(t.pnl) >= 0).length;
        return Math.round((wins / periodTrades.length) * 100);
      }

      case 'profit_factor': {
        const grossProfit = periodTrades
          .filter((t) => Number(t.pnl) > 0)
          .reduce((sum, t) => sum + Number(t.pnl), 0);
        const grossLoss = periodTrades
          .filter((t) => Number(t.pnl) < 0)
          .reduce((sum, t) => sum + Math.abs(Number(t.pnl)), 0);
        if (grossLoss === 0) return grossProfit > 0 ? 999 : 0;
        return Math.round((grossProfit / grossLoss) * 100) / 100;
      }

      case 'avg_rr': {
        const wins = periodTrades.filter((t) => Number(t.pnl) > 0);
        const losses = periodTrades.filter((t) => Number(t.pnl) < 0);
        if (wins.length === 0 || losses.length === 0) return 0;
        const avgWin =
          wins.reduce((s, t) => s + Number(t.pnl), 0) / wins.length;
        const avgLoss =
          losses.reduce((s, t) => s + Math.abs(Number(t.pnl)), 0) /
          losses.length;
        if (avgLoss === 0) return 0;
        return Math.round((avgWin / avgLoss) * 10) / 10;
      }

      case 'consecutive_wins': {
        const sorted = [...periodTrades].sort(
          (a, b) =>
            (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
        );
        let streak = 0;
        let maxStreak = 0;
        for (const t of sorted) {
          if (Number(t.pnl) >= 0) {
            streak++;
            if (streak > maxStreak) maxStreak = streak;
          } else {
            streak = 0;
          }
        }
        return maxStreak;
      }

      case 'max_drawdown': {
        const sorted = [...periodTrades].sort(
          (a, b) =>
            (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0),
        );
        let peak = 0;
        let maxDd = 0;
        let cumPnl = 0;
        for (const t of sorted) {
          cumPnl += Number(t.pnl);
          if (cumPnl > peak) peak = cumPnl;
          const dd = peak - cumPnl;
          if (dd > maxDd) maxDd = dd;
        }
        return Math.round(maxDd * 100) / 100;
      }

      default:
        return 0;
    }
  }
}
