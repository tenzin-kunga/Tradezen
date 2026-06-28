import { ApiProperty } from '@nestjs/swagger';

export class DashboardResponseDto {
  @ApiProperty({ example: 12 })
  weeklyTrades!: number;

  @ApiProperty({ example: 245.5 })
  weeklyPnl!: number;

  @ApiProperty({ example: 66.7 })
  weeklyWinRate!: number;

  @ApiProperty({ example: 45.2 })
  totalPnl!: number;

  @ApiProperty({ example: 62.5 })
  overallWinRate!: number;

  @ApiProperty({
    example: [
      { date: '2025-06-09', equity: 10230.5 },
      { date: '2025-06-10', equity: 10245.0 },
    ],
  })
  equityCurve!: { date: string; equity: number }[];

  @ApiProperty({
    example: {
      tradesToday: 3,
      winRateToday: 66.7,
      pnlToday: 120.5,
      openRisk: 50.0,
    },
  })
  dailySummary!: {
    tradesToday: number;
    winRateToday: number;
    pnlToday: number;
    openRisk: number;
  };

  @ApiProperty({
    example: {
      disciplineScore: 85,
      fomoScore: 'Low',
      revengeTradesThisMonth: 2,
      trendAlignment: 72,
    },
  })
  behaviorAnalytics!: {
    disciplineScore: number;
    fomoScore: 'Low' | 'Medium' | 'High';
    revengeTradesThisMonth: number;
    trendAlignment: number;
  };

  @ApiProperty({
    example: {
      bestStrategy: 'Breakout',
      bestDay: 'Tuesday',
      avgRR: 2.1,
      profitFactor: 1.8,
    },
  })
  insights!: {
    bestStrategy: string;
    bestDay: string;
    avgRR: number;
    profitFactor: number;
  };

  @ApiProperty({
    example: [
      { date: '2025-06-09', trades: 4, pnl: 85.0, disciplined: true },
      { date: '2025-06-10', trades: 3, pnl: 120.5, disciplined: false },
    ],
  })
  heatmap!: {
    date: string;
    trades: number;
    pnl: number;
    disciplined: boolean;
  }[];
}
