import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../db/drizzle';
import { watchlists, watchlistItems, symbols } from '@tradezen/db';
import { eq, and, asc } from 'drizzle-orm';
import { SymbolsService } from '../symbols/symbols.service';
import {
  CreateWatchlistDto,
  CreateWatchlistItemDto,
  UpdateWatchlistItemDto,
  ReorderWatchlistDto,
} from './dto';

@Injectable()
export class WatchlistService {
  constructor(private readonly symbolsService: SymbolsService) {}

  async listWatchlists(userId: string) {
    return db
      .select()
      .from(watchlists)
      .where(eq(watchlists.userId, userId))
      .orderBy(asc(watchlists.createdAt));
  }

  async createWatchlist(userId: string, dto: CreateWatchlistDto) {
    const [watchlist] = await db
      .insert(watchlists)
      .values({
        userId,
        name: dto.name,
        type: dto.type || 'manual',
        definition: dto.definition || null,
      })
      .returning();

    return watchlist;
  }

  async deleteWatchlist(userId: string, watchlistId: string) {
    const watchlist = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)))
      .limit(1);

    if (watchlist.length === 0) {
      throw new NotFoundException('Watchlist not found');
    }

    await db.delete(watchlists).where(eq(watchlists.id, watchlistId));
  }

  async getItems(watchlistId: string, userId: string) {
    // Verify ownership
    const watchlist = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)))
      .limit(1);

    if (watchlist.length === 0) {
      throw new NotFoundException('Watchlist not found');
    }

    // Get items with joined symbol data
    const items = await db
      .select({
        id: watchlistItems.id,
        watchlistId: watchlistItems.watchlistId,
        symbolId: watchlistItems.symbolId,
        priority: watchlistItems.priority,
        notes: watchlistItems.notes,
        tags: watchlistItems.tags,
        alerts: watchlistItems.alerts,
        sortOrder: watchlistItems.sortOrder,
        createdAt: watchlistItems.createdAt,
        ticker: symbols.ticker,
        exchange: symbols.exchange,
        name: symbols.name,
        symbolKey: symbols.symbolKey,
      })
      .from(watchlistItems)
      .innerJoin(symbols, eq(watchlistItems.symbolId, symbols.id))
      .where(eq(watchlistItems.watchlistId, watchlistId))
      .orderBy(asc(watchlistItems.sortOrder));

    return items;
  }

  async addItem(
    userId: string,
    watchlistId: string,
    dto: CreateWatchlistItemDto,
  ) {
    // Verify ownership
    const watchlist = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)))
      .limit(1);

    if (watchlist.length === 0) {
      throw new NotFoundException('Watchlist not found');
    }

    // Lookup or create symbol
    const { id: symbolId } = await this.symbolsService.lookupOrCreate(
      dto.ticker,
      dto.exchange,
    );

    // Get max sort order
    const existing = await this.getItems(watchlistId, userId);
    const maxOrder = existing.reduce(
      (max, item) => Math.max(max, item.sortOrder),
      -1,
    );

    const [item] = await db
      .insert(watchlistItems)
      .values({
        watchlistId,
        symbolId,
        priority: dto.priority || 0,
        notes: dto.notes || null,
        sortOrder: maxOrder + 1,
      })
      .returning();

    return item;
  }

  async updateItem(
    userId: string,
    watchlistId: string,
    itemId: string,
    dto: UpdateWatchlistItemDto,
  ) {
    // Verify ownership
    const watchlist = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)))
      .limit(1);

    if (watchlist.length === 0) {
      throw new NotFoundException('Watchlist not found');
    }

    const [updated] = await db
      .update(watchlistItems)
      .set({
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.alerts !== undefined && { alerts: dto.alerts }),
      })
      .where(eq(watchlistItems.id, itemId))
      .returning();

    return updated;
  }

  async deleteItem(userId: string, watchlistId: string, itemId: string) {
    // Verify ownership
    const watchlist = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)))
      .limit(1);

    if (watchlist.length === 0) {
      throw new NotFoundException('Watchlist not found');
    }

    await db.delete(watchlistItems).where(eq(watchlistItems.id, itemId));
  }

  async reorder(userId: string, watchlistId: string, dto: ReorderWatchlistDto) {
    // Verify ownership
    const watchlist = await db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.userId, userId)))
      .limit(1);

    if (watchlist.length === 0) {
      throw new NotFoundException('Watchlist not found');
    }

    // Get current items
    const items = await this.getItems(watchlistId, userId);
    const item = items.find((i) => i.id === dto.itemId);
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Compute new sort order
    const newItems = [...items];
    newItems.splice(dto.from, 1);
    newItems.splice(dto.to, 0, item);

    // Update sort orders
    for (let i = 0; i < newItems.length; i++) {
      await db
        .update(watchlistItems)
        .set({ sortOrder: i })
        .where(eq(watchlistItems.id, newItems[i].id));
    }

    return { success: true };
  }
}
