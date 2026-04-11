export type Trade = {
  id: string;
  user_id: string;
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
  chart_image: string | null;
  fomo_check: boolean;
  trend_alignment: boolean;
  vengeance_trade: boolean;
  created_at: string;
  updated_at: string;
};

export type User = {
  id: string;
  email: string;
  username: string;
  created_at: string;
};

export type JournalMood = "confident" | "neutral" | "anxious" | "frustrated" | "excited";

export type Journal = {
  id: string;
  user_id: string;
  date: string;
  pre_market_notes: string | null;
  post_market_notes: string | null;
  mood: JournalMood | null;
  market_conditions: string | null;
  lessons: string | null;
  created_at: string;
  updated_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  category: "setup" | "mistake" | "emotion" | "custom";
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type AuthResponse = {
  access_token: string;
  user: User;
};

export type Analytics = {
  totalTrades: number;
  totalPnl: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  maxDrawdown: number;
  bestTrade: number;
  worstTrade: number;
  avgRR: number;
  byStrategy: StrategyStats[];
  byDayOfWeek: DayStats[];
  byMonth: MonthStats[];
  behavioralStats: BehavioralStats;
};

export type StrategyStats = {
  name: string;
  trades: number;
  winRate: number;
  pnl: number;
};

export type DayStats = {
  day: string;
  trades: number;
  winRate: number;
  pnl: number;
};

export type MonthStats = {
  month: string;
  trades: number;
  winRate: number;
  pnl: number;
};

export type BehavioralStats = {
  fomoCount: number;
  vengeanceCount: number;
  trendAlignedCount: number;
};
