export type Trade = {
  id: string;
  symbol: string;
  direction: "buy" | "sell";
  entry_price: number;
  exit_price: number;
  lot_size: number;
  pnl: number;
  stop_loss: number | null;
  take_profit: number | null;
  strategy: string | null;
  notes: string | null;
  fomo_check: boolean;
  trend_alignment: boolean;
  vengeance_trade: boolean;
  created_at: string;
};
