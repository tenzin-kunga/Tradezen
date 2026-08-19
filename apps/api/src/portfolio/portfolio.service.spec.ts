import { Test, TestingModule } from '@nestjs/testing';
import { PortfolioService } from './portfolio.service';

jest.mock('../db/drizzle', () => ({
  db: {
    execute: jest.fn(),
  },
}));

import { db } from '../db/drizzle';

const summaryRows = [
  {
    total_trades: 3,
    realized_pnl: 150,
    win_count: 2,
    loss_count: 1,
    gross_profit: 200,
    gross_loss: 50,
    avg_win: 100,
    avg_loss: 50,
    best_trade: 120,
    worst_trade: -50,
    fomo_count: 0,
    vengeance_count: 1,
  },
];
const symbolRows = [
  {
    symbol: 'AAPL',
    trades: 2,
    wins: 2,
    realized_pnl: 200,
    avg_pnl: 100,
    longs: 2,
    shorts: 0,
  },
  {
    symbol: 'TSLA',
    trades: 1,
    wins: 0,
    realized_pnl: -50,
    avg_pnl: -50,
    longs: 0,
    shorts: 1,
  },
];
const strategyRows = [
  { strategy: 'Breakout', trades: 2, realized_pnl: 200, wins: 2 },
  { strategy: 'No Strategy', trades: 1, realized_pnl: -50, wins: 0 },
];
const directionRows = [{ long: 2, short: 1 }];

describe('PortfolioService', () => {
  let service: PortfolioService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PortfolioService],
    }).compile();
    service = module.get<PortfolioService>(PortfolioService);
    jest.clearAllMocks();
    const sequence = [summaryRows, symbolRows, strategyRows, directionRows];
    let call = 0;
    (db.execute as jest.Mock).mockImplementation(() => {
      const rows = sequence[call] ?? [];
      call += 1;
      return Promise.resolve(rows);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('computes summary, per-symbol rollup, and allocation', async () => {
    const p = await service.getPortfolio('u1');
    expect(p.summary.totalTrades).toBe(3);
    expect(p.summary.realizedPnl).toBe(150);
    expect(p.summary.profitFactor).toBe(4); // 200 / 50
    expect(p.summary.winRate).toBeCloseTo(66.67, 1);
    expect(p.symbols).toHaveLength(2);
    expect(p.symbols[0].symbol).toBe('AAPL');
    expect(p.symbols[0].allocationPct).toBeCloseTo((200 / 250) * 100, 1);
    expect(p.strategies[0].strategy).toBe('Breakout');
    expect(p.byDirection).toEqual({ long: 2, short: 1 });
  });

  it('returns zeros for a user with no trades', async () => {
    (db.execute as jest.Mock).mockResolvedValue([]);
    const p = await service.getPortfolio('u2');
    expect(p.summary.totalTrades).toBe(0);
    expect(p.summary.realizedPnl).toBe(0);
    expect(p.symbols).toHaveLength(0);
  });
});
