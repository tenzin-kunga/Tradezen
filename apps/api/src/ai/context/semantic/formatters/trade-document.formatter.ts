import type { SemanticDocument, SemanticSourceType } from '../types';
import type { SemanticFormatter } from './types';
import { SemanticSourceType as ST } from '../types';

interface TradeEntity {
  id: string;
  symbol: string;
  direction: string;
  entryPrice: string;
  exitPrice: string;
  pnl: string;
  strategy: string | null;
  notes: string | null;
  lotSize: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  commission: string | null;
  contractSize: string | null;
  tradeDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class TradeDocumentFormatter implements SemanticFormatter<TradeEntity> {
  supports(sourceType: SemanticSourceType): boolean {
    return sourceType === ST.TRADE;
  }

  format(entity: TradeEntity, userId: string): SemanticDocument {
    const content = [
      `${entity.symbol} ${entity.direction}`,
      `Entry: ${entity.entryPrice}`,
      `Exit: ${entity.exitPrice}`,
      `P/L: ${entity.pnl}`,
      entity.strategy ? `Strategy: ${entity.strategy}` : null,
      entity.notes ? `Notes: ${entity.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    return {
      id: entity.id,
      userId,
      sourceType: ST.TRADE,
      title: `${entity.symbol} ${entity.direction}`,
      content,
      metadata: {
        symbol: entity.symbol,
        direction: entity.direction,
        entryPrice: entity.entryPrice,
        exitPrice: entity.exitPrice,
        pnl: entity.pnl,
        strategy: entity.strategy,
        lotSize: entity.lotSize,
        stopLoss: entity.stopLoss,
        takeProfit: entity.takeProfit,
        tradeDate: entity.tradeDate?.toISOString() ?? null,
      },
      provenance: {
        source: 'trades',
        entity: 'trade',
        operation: 'create',
      },
      createdAt: entity.createdAt?.toISOString(),
      updatedAt: entity.updatedAt?.toISOString(),
    };
  }
}
