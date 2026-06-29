export interface TradeImagePreview {
  id: string;
  url: string;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
}

export type Trade = {
  id: string;
  userId: string;
  symbol: string;
  direction: "buy" | "sell";
  entryPrice: number;
  exitPrice: number;
  lotSize: number;
  pnl: number;
  stopLoss: number | null;
  takeProfit: number | null;
  strategy: string | null;
  notes: string | null;
  chartImage: string | null;
  fomoCheck: boolean;
  trendAlignment: boolean;
  vengeanceTrade: boolean;
  commission: number | null;
  tradeDate: string | null;
  contractSize: number | null;
  createdAt: string;
  updatedAt: string;
  previewImage?: TradeImagePreview | null;
  imageCount?: number;
  hasImages?: boolean;
  riskReward?: number | null;
};
