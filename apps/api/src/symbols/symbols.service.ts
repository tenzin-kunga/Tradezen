import { Injectable } from '@nestjs/common';
import { db } from '../db/drizzle';
import { symbols } from '@tradezen/db';
import { eq, ilike, or } from 'drizzle-orm';
import { SymbolProviderChain } from './providers/provider-chain';
import { ManualProvider } from './providers/manual-provider';

@Injectable()
export class SymbolsService {
  private providerChain: SymbolProviderChain;

  constructor() {
    this.providerChain = new SymbolProviderChain();
    this.providerChain.register(new ManualProvider());
  }

  getSymbolKey(ticker: string, exchange?: string): string {
    return `${exchange || 'UNKNOWN'}:${ticker.toUpperCase()}`;
  }

  async lookupOrCreate(
    ticker: string,
    exchange?: string,
  ): Promise<{ id: string; symbolKey: string }> {
    const symbolKey = this.getSymbolKey(ticker, exchange);

    // Check if symbol exists
    const existing = await db
      .select({ id: symbols.id, symbolKey: symbols.symbolKey })
      .from(symbols)
      .where(eq(symbols.symbolKey, symbolKey))
      .limit(1);

    if (existing.length > 0) {
      return { id: existing[0].id, symbolKey: existing[0].symbolKey };
    }

    // Try provider chain for enrichment
    const providerData = await this.providerChain.lookup(
      ticker.toUpperCase(),
      exchange?.toUpperCase(),
    );

    // Create symbol
    const [created] = await db
      .insert(symbols)
      .values({
        ticker: ticker.toUpperCase(),
        exchange: exchange?.toUpperCase() || null,
        assetType: providerData?.assetType || null,
        currency: providerData?.currency || null,
        name: providerData?.name || null,
        symbolKey,
        providerMetadata: providerData?.providerMetadata || {},
      })
      .returning({ id: symbols.id, symbolKey: symbols.symbolKey });

    return { id: created.id, symbolKey: created.symbolKey };
  }

  async search(query: string): Promise<
    Array<{
      id: string;
      ticker: string;
      exchange: string | null;
      name: string | null;
    }>
  > {
    if (query.length < 1) return [];

    const results = await db
      .select({
        id: symbols.id,
        ticker: symbols.ticker,
        exchange: symbols.exchange,
        name: symbols.name,
      })
      .from(symbols)
      .where(
        or(
          ilike(symbols.ticker, `%${query}%`),
          ilike(symbols.name, `%${query}%`),
        ),
      )
      .limit(10);

    return results;
  }

  async getById(id: string) {
    const result = await db
      .select()
      .from(symbols)
      .where(eq(symbols.id, id))
      .limit(1);

    return result[0] || null;
  }

  async enrich(id: string) {
    const symbol = await this.getById(id);
    if (!symbol) return null;

    const enriched = await this.providerChain.enrich(
      symbol.ticker,
      symbol.exchange || undefined,
    );

    if (enriched) {
      await db
        .update(symbols)
        .set({
          name: enriched.name || symbol.name,
          assetType: enriched.assetType || symbol.assetType,
          currency: enriched.currency || symbol.currency,
          providerMetadata: {
            ...(symbol.providerMetadata as Record<string, unknown>),
            ...(enriched.providerMetadata || {}),
          },
          updatedAt: new Date(),
        })
        .where(eq(symbols.id, id));
    }

    return this.getById(id);
  }

  getProviderChain(): SymbolProviderChain {
    return this.providerChain;
  }
}
