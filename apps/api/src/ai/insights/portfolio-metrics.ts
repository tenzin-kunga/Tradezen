import { db } from '../../db/drizzle';
import { sql } from 'drizzle-orm';
import { rowsOf } from '../corpus-baseline.service';

export interface DirectionalExpectancy {
  long: number;
  short: number;
  longTrades: number;
  shortTrades: number;
}

// Derived portfolio analytics live here, not in the global context builder.
// Isolating the query keeps the builder thin and makes it trivial to later
// move this into PortfolioService without touching the rules.
export async function computeDirectionalExpectancy(
  userId: string,
): Promise<DirectionalExpectancy> {
  const res = await db.execute(sql`
    SELECT
      direction,
      COUNT(*)::int AS trades,
      COALESCE(AVG(pnl), 0)::float8 AS avg_pnl
    FROM trades
    WHERE user_id = ${userId}
    GROUP BY direction
  `);

  const rows = rowsOf(res) as {
    direction: string;
    trades: number;
    avg_pnl: number;
  }[];

  let long = 0;
  let short = 0;
  let longTrades = 0;
  let shortTrades = 0;

  for (const r of rows) {
    if (r.direction === 'long') {
      long = Number(r.avg_pnl);
      longTrades = Number(r.trades);
    } else if (r.direction === 'short') {
      short = Number(r.avg_pnl);
      shortTrades = Number(r.trades);
    }
  }

  return { long, short, longTrades, shortTrades };
}
