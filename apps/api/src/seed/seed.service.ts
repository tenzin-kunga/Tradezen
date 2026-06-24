import { Injectable } from '@nestjs/common';
import { count, eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { trades, journals, tags, tradeTags } from '@tradezen/db';

interface SeedTrade {
  symbol: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  exitPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  lotSize: number;
  pnl: number;
  strategy: string;
  fomoCheck: boolean;
  vengeanceTrade: boolean;
  trendAlignment: boolean;
  notes: string;
  tradeDate: Date;
  commission: number;
  tagIndices: number[];
}

const SEED_TAGS = [
  { name: 'Breakout', color: '#22c55e', category: 'setup' as const },
  { name: 'SMC', color: '#3b82f6', category: 'setup' as const },
  { name: 'Trend Following', color: '#a855f7', category: 'setup' as const },
  { name: 'Reversal', color: '#f59e0b', category: 'setup' as const },
  { name: 'Scalping', color: '#ec4899', category: 'psychology' as const },
  { name: 'Range', color: '#14b8a6', category: 'market' as const },
  { name: 'News Trade', color: '#f97316', category: 'market' as const },
  { name: 'Fibonacci', color: '#06b6d4', category: 'setup' as const },
];

const SYMBOLS = ['EURUSD', 'GBPUSD', 'BTCUSD', 'XAUUSD', 'GBPJPY', 'US30', 'ETHUSD', 'AUDUSD', 'USDJPY', 'NAS100'];
const STRATEGIES = ['BREAKOUT', 'SMC', 'TREND_FOLLOWING', 'REVERSAL', 'SCALPING'];
const NOTES_POOL = [
  'Clean break of structure, rode the momentum',
  'Smart money stop hunt, then price reversed as expected',
  'Trend is your friend, rode the 20 EMA',
  'Caught the reversal at key support level',
  'Quick scalp in the London session, 15 pips',
  'Price respected the 61.8% Fibonacci retracement',
  'FOMC news trade, high volatility play',
  'Choppy range day, got stopped out twice',
  'Took profit too early, left money on the table',
  'Disciplined exit at target, no regrets',
  'Broke my rules, entered on impulse',
  'Waited for confirmation, nice trend day',
  'Double bottom pattern, textbook reversal',
  'Overstayed my welcome, turned winner into loser',
  'Good risk management, small loss but followed the plan',
];

function pickTags(): number[] {
  const count = Math.floor(Math.random() * 3) + 1;
  const pool = [0, 1, 2, 3, 4, 5, 6, 7];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

function getBasePrice(symbol: string): number {
  const prices: Record<string, number> = {
    EURUSD: 1.08, GBPUSD: 1.27, BTCUSD: 67000, XAUUSD: 2300,
    GBPJPY: 190, US30: 39000, ETHUSD: 3400, AUDUSD: 0.66,
    USDJPY: 150, NAS100: 19000,
  };
  return prices[symbol] ?? 1.0;
}

function generateSeedTrades(): SeedTrade[] {
  const trades: SeedTrade[] = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - 90);

  for (let i = 0; i < 30; i++) {
    const symIdx = i < 20 ? i % SYMBOLS.length : Math.floor(Math.random() * SYMBOLS.length);
    const symbol = SYMBOLS[symIdx];
    const direction = Math.random() > 0.5 ? 'buy' : 'sell';
    const isWin = i < 18;
    const strategy = STRATEGIES[i % STRATEGIES.length];
    const basePrice = getBasePrice(symbol);

    const entryOffset = (Math.random() - 0.5) * basePrice * 0.003;
    const entryPrice = basePrice + entryOffset;

    const pnlPercent = isWin
      ? 0.002 + Math.random() * 0.008
      : -(0.002 + Math.random() * 0.005);
    const exitPrice = direction === 'buy'
      ? entryPrice * (1 + pnlPercent)
      : entryPrice * (1 - pnlPercent);

    const slWidth = basePrice * 0.002;
    const stopLoss = direction === 'buy' ? entryPrice - slWidth : entryPrice + slWidth;
    const tpWidth = basePrice * (0.003 + Math.random() * 0.005);
    const takeProfit = direction === 'buy' ? entryPrice + tpWidth : entryPrice - tpWidth;

    const lotSize = 0.01 + Math.floor(Math.random() * 10) * 0.01;
    const commission = lotSize * 0.5;

    const tradeDate = new Date(baseDate);
    tradeDate.setDate(tradeDate.getDate() + Math.floor(i * 2.5) + Math.floor(Math.random() * 2));
    tradeDate.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
    const contractSize = 100000;
    const rawPnl = direction === 'buy'
      ? (exitPrice - entryPrice) * lotSize * contractSize
      : (entryPrice - exitPrice) * lotSize * contractSize;
    const netPnl = rawPnl - commission;

    trades.push({
      symbol,
      direction,
      entryPrice: Math.round(entryPrice * 100000) / 100000,
      exitPrice: Math.round(exitPrice * 100000) / 100000,
      stopLoss: Math.round(stopLoss * 100000) / 100000,
      takeProfit: Math.round(takeProfit * 100000) / 100000,
      lotSize,
      pnl: Math.round(netPnl * 100) / 100,
      strategy,
      fomoCheck: Math.random() < 0.15,
      vengeanceTrade: Math.random() < 0.1,
      trendAlignment: Math.random() > 0.3,
      notes: NOTES_POOL[Math.floor(Math.random() * NOTES_POOL.length)],
      tradeDate,
      commission,
      tagIndices: pickTags(),
    });
  }

  return trades;
}

const SEED_JOURNALS = [
  {
    preMarketNotes: 'Asian session showed strong buying pressure on EURUSD. Expecting continuation if London opens with same momentum. Key level at 1.0850.',
    postMarketNotes: 'Good session overall. Took 3 trades, 2 winners 1 loser. The loser was a revenge trade after a false breakout. Need to wait for confirmation.',
    mood: 'Focused',
    marketConditions: 'Trending with good volatility. London session provided clear direction.',
    lessons: 'Patience is key. The revenge trade cost me 2R. Stick to the plan even when market seems obvious.',
  },
  {
    preMarketNotes: 'Range-bound conditions on major pairs. NFP tomorrow so expect low volatility today. Focus on 15min scalps with tight stops.',
    postMarketNotes: 'Tough day. Took 5 trades, won 2 lost 3. Market was choppy and my entries were early. Should have waited for better risk/reward.',
    mood: 'Frustrated',
    marketConditions: 'Low volatility range day. Most pairs stayed within 20-pip ranges.',
    lessons: 'In range days, fade the extremes don\'t chase breakouts. Cut losses faster in low vol conditions.',
  },
  {
    preMarketNotes: 'BTC showing signs of accumulation around 67K. Watching for a breakout above 68K for a momentum play. Risk management critical.',
    postMarketNotes: 'Beautiful trade! BTC broke out and ran 2% before resistance. Took partial profits at 1:2 and 1:3. Let the runner go with a trailing stop.',
    mood: 'Confident',
    marketConditions: 'Risk-on sentiment. Crypto leading the move with strong volume.',
    lessons: 'Trailing stops work well in strong trends. Let winners run and cut losers short.',
  },
  {
    preMarketNotes: 'Aussie weakened after RBA minutes. Considering AUDUSD shorts if it breaks below 0.6600. Watch for lunchtime reversal.',
    postMarketNotes: 'Breakout trade worked perfectly. AUDUSD dropped 40 pips after the break. Scaled out at 1:1.5 and 1:3. No revenge trades today.',
    mood: 'Disciplined',
    marketConditions: 'Trend following day. Clear levels held and price respected technicals.',
    lessons: 'When the stars align (fundamentals + technicals + price action), trade with confidence. 3R day.',
  },
  {
    preMarketNotes: 'US30 at resistance after a 3-day rally. Looking for reversal signals on lower timeframes. Also watching XAUUSD for support hold.',
    postMarketNotes: 'Mixed session. US30 reversal was premature - got stopped out. Gold trade worked well. Overall flat for the day which is acceptable.',
    mood: 'Neutral',
    marketConditions: 'Mixed conditions. Indices strong, commodities weak.',
    lessons: 'Don\'t anticipate reversals without confirmation. Let price prove itself first.',
  },
];

@Injectable()
export class SeedService {
  async seedData(userId: string) {
    const existingCount = await db
      .select({ c: count() })
      .from(trades)
      .where(eq(trades.userId, userId));
    if (Number(existingCount[0]?.c ?? 0) > 0) {
      return;
    }

    const insertedTags = await db
      .insert(tags)
      .values(
        SEED_TAGS.map((t) => ({
          userId,
          name: t.name,
          color: t.color,
          category: t.category,
          isSample: true,
        })),
      )
      .returning();

    const generatedTrades = generateSeedTrades();
    const insertedTradeRows: any[] = [];
    const batchSize = 10;

    for (let i = 0; i < generatedTrades.length; i += batchSize) {
      const batch = generatedTrades.slice(i, i + batchSize);
      const result = await db
        .insert(trades)
        .values(
          batch.map((t) => ({
            userId,
            symbol: t.symbol,
            direction: t.direction,
            entryPrice: String(t.entryPrice),
            exitPrice: String(t.exitPrice),
            stopLoss: t.stopLoss !== null ? String(t.stopLoss) : null,
            takeProfit: t.takeProfit !== null ? String(t.takeProfit) : null,
            lotSize: String(t.lotSize),
            pnl: String(t.pnl),
            strategy: t.strategy,
            fomoCheck: t.fomoCheck,
            vengeanceTrade: t.vengeanceTrade,
            trendAlignment: t.trendAlignment,
            notes: t.notes,
            tradeDate: t.tradeDate,
            commission: String(t.commission),
            isSample: true,
          })),
        )
        .returning();
      insertedTradeRows.push(...result);
    }

    const tagTradeValues: { tradeId: string; tagId: string }[] = [];
    for (let i = 0; i < generatedTrades.length; i++) {
      for (const tagIdx of generatedTrades[i].tagIndices) {
        tagTradeValues.push({
          tradeId: insertedTradeRows[i].id,
          tagId: insertedTags[tagIdx].id,
        });
      }
    }
    if (tagTradeValues.length > 0) {
      await db.insert(tradeTags).values(tagTradeValues);
    }

    const now = new Date();
    for (let i = 0; i < SEED_JOURNALS.length; i++) {
      const journalDate = new Date(now);
      journalDate.setDate(journalDate.getDate() - (SEED_JOURNALS.length - 1 - i) * 7);
      const j = SEED_JOURNALS[i];
      try {
        await db
          .insert(journals)
          .values({
            userId,
            date: journalDate.toISOString().slice(0, 10),
            preMarketNotes: j.preMarketNotes,
            postMarketNotes: j.postMarketNotes,
            mood: j.mood,
            marketConditions: j.marketConditions,
            lessons: j.lessons,
            isSample: true,
          });
      } catch {
        // Skip if journal for this date already exists
      }
    }
  }

  async deleteSampleData(userId: string) {
    const sampleTrades = await db
      .select({ id: trades.id })
      .from(trades)
      .where(and(eq(trades.userId, userId), eq(trades.isSample, true)));

    if (sampleTrades.length > 0) {
      const sampleTradeIds = sampleTrades.map((t) => t.id);
      await db.delete(tradeTags).where(inArray(tradeTags.tradeId, sampleTradeIds));
      await db.delete(trades).where(and(eq(trades.userId, userId), eq(trades.isSample, true)));
    }

    await db.delete(tags).where(and(eq(tags.userId, userId), eq(tags.isSample, true)));
    await db.delete(journals).where(and(eq(journals.userId, userId), eq(journals.isSample, true)));
  }

  async deleteAllUserData(userId: string) {
    const userTrades = await db
      .select({ id: trades.id })
      .from(trades)
      .where(eq(trades.userId, userId));
    if (userTrades.length > 0) {
      await db.delete(tradeTags).where(
        inArray(
          tradeTags.tradeId,
          userTrades.map((t) => t.id),
        ),
      );
    }
    await db.delete(trades).where(eq(trades.userId, userId));
    await db.delete(journals).where(eq(journals.userId, userId));
    await db.delete(tags).where(eq(tags.userId, userId));
  }
}
