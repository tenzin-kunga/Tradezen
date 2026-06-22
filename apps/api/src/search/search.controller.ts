import { Controller, Get, Query } from '@nestjs/common';
import { ilike, or, and, eq, count, asc, desc } from 'drizzle-orm';
import { db } from '../db/drizzle';
import { trades, journals, tags } from '@tradezen/db';
import { CurrentUser } from '../auth/current-user.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('search')
@ApiBearerAuth()
@Controller('search')
export class SearchController {
  @Get('global')
  @ApiOperation({ summary: 'Global search across trades, journals, and tags' })
  async globalSearch(
    @CurrentUser('id') userId: string,
    @Query('q') q: string,
  ) {
    if (!q || q.trim().length < 2) {
      return { trades: [], journals: [], tags: [] };
    }

    const term = `%${q.trim()}%`;

    const [tradeResults, journalResults, tagResults] = await Promise.all([
      db
        .select({
          id: trades.id,
          symbol: trades.symbol,
          direction: trades.direction,
          pnl: trades.pnl,
          strategy: trades.strategy,
          notes: trades.notes,
          createdAt: trades.createdAt,
        })
        .from(trades)
        .where(
          and(
            eq(trades.userId, userId),
            or(
              ilike(trades.symbol, term),
              ilike(trades.notes ?? '', term),
              ilike(trades.strategy ?? '', term),
            ),
          ),
        )
        .orderBy(desc(trades.createdAt))
        .limit(5),

      db
        .select({
          id: journals.id,
          date: journals.date,
          mood: journals.mood,
          lessons: journals.lessons,
        })
        .from(journals)
        .where(
          and(
            eq(journals.userId, userId),
            or(
              ilike(journals.preMarketNotes ?? '', term),
              ilike(journals.postMarketNotes ?? '', term),
              ilike(journals.lessons ?? '', term),
              ilike(journals.marketConditions ?? '', term),
            ),
          ),
        )
        .orderBy(desc(journals.date))
        .limit(5),

      db
        .select({
          id: tags.id,
          name: tags.name,
          color: tags.color,
          category: tags.category,
        })
        .from(tags)
        .where(
          and(
            eq(tags.userId, userId),
            ilike(tags.name, term),
          ),
        )
        .orderBy(asc(tags.name))
        .limit(5),
    ]);

    return {
      trades: tradeResults,
      journals: journalResults,
      tags: tagResults,
    };
  }
}
